document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('dashLogin');
  const contentSection = document.getElementById('dashContent');
  const loginForm = document.getElementById('dashLoginForm');
  const passwordInput = document.getElementById('dashPassword');
  const loginError = document.getElementById('dashLoginError');
  const logoutBtn = document.getElementById('dashLogout');
  const listEl = document.getElementById('dashList');
  const statusEl = document.getElementById('dashStatus');
  const filterInput = document.getElementById('dashFilter');
  const todayOnlyInput = document.getElementById('dashTodayOnly');
  const refreshBtn = document.getElementById('dashRefresh');
  const todayCountEl = document.getElementById('dashTodayCount');
  const todayGuestsEl = document.getElementById('dashTodayGuests');
  const availabilityCard = document.getElementById('dashAvailability');
  const bookingToggle = document.getElementById('dashBookingToggle');
  const availabilityLabel = document.getElementById('dashAvailabilityLabel');
  const availabilityHint = document.getElementById('dashAvailabilityHint');
  const reasonRow = document.getElementById('dashReasonRow');
  const reasonInput = document.getElementById('dashReasonInput');
  const reasonSaveBtn = document.getElementById('dashReasonSave');
  const availabilitySavedEl = document.getElementById('dashAvailabilitySaved');

  let reservations = [];

  const SEATING_LABELS = {
    any: 'No preference',
    floor1: 'First floor',
    floor2: 'Second floor',
    terrace: 'Terrace',
  };

  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function showDashboard() {
    loginSection.hidden = true;
    contentSection.hidden = false;
    logoutBtn.hidden = false;
  }

  function showLogin(message) {
    loginSection.hidden = false;
    contentSection.hidden = true;
    logoutBtn.hidden = true;
    loginError.textContent = message || '';
  }

  function formatRelativeTime(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }

  function renderList(items) {
    listEl.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'dash-empty';
      empty.textContent = 'No reservations yet.';
      listEl.appendChild(empty);
      return;
    }
    items.forEach((r) => {
      const card = document.createElement('article');
      card.className = 'dash-card';

      const head = document.createElement('div');
      head.className = 'dash-card-head';
      const name = document.createElement('strong');
      name.textContent = r.name;
      const guests = document.createElement('span');
      guests.className = 'dash-card-guests';
      guests.textContent = `${r.guests} guest${r.guests === 1 ? '' : 's'}`;
      head.appendChild(name);
      head.appendChild(guests);

      const meta = document.createElement('div');
      meta.className = 'dash-card-meta';
      const dateTime = document.createElement('span');
      dateTime.textContent = `${r.date} · ${r.time}`;
      const phone = document.createElement('a');
      phone.href = `tel:${r.phone}`;
      phone.textContent = r.phone;
      meta.appendChild(dateTime);
      meta.appendChild(phone);
      if (r.seating && SEATING_LABELS[r.seating]) {
        const seating = document.createElement('span');
        seating.textContent = SEATING_LABELS[r.seating];
        meta.appendChild(seating);
      }

      card.appendChild(head);
      card.appendChild(meta);

      if (r.notes) {
        const notes = document.createElement('p');
        notes.className = 'dash-card-notes';
        notes.textContent = r.notes;
        card.appendChild(notes);
      }

      const submitted = document.createElement('span');
      submitted.className = 'dash-card-submitted';
      submitted.textContent = `Submitted ${formatRelativeTime(r.submittedAt)}`;
      card.appendChild(submitted);

      listEl.appendChild(card);
    });
  }

  function updateTodayStats() {
    const today = todayStr();
    const todays = reservations.filter((r) => r.date === today);
    const guestTotal = todays.reduce((sum, r) => sum + (Number(r.guests) || 0), 0);
    todayCountEl.textContent = todays.length;
    todayGuestsEl.textContent = guestTotal;
  }

  function applyFilter() {
    const q = filterInput.value.trim().toLowerCase();
    let items = reservations;
    if (todayOnlyInput.checked) {
      const today = todayStr();
      items = items.filter((r) => r.date === today);
    }
    if (q) {
      items = items.filter((r) => r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q));
    }
    renderList(items);
  }

  async function loadReservations(password) {
    statusEl.textContent = 'Loading…';
    try {
      const res = await fetch('/api/reservations', {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem('dashPassword');
        showLogin('Incorrect password.');
        statusEl.textContent = '';
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        statusEl.textContent = body.error || 'Something went wrong loading reservations.';
        return;
      }
      const data = await res.json();
      reservations = data.reservations || [];
      showDashboard();
      statusEl.textContent = `${reservations.length} reservation${reservations.length === 1 ? '' : 's'}`;
      updateTodayStats();
      applyFilter();
      loadBookingStatus(password);
    } catch (err) {
      statusEl.textContent = 'Could not reach the server. Check your connection and try again.';
    }
  }

  function renderAvailability(disabled, reason) {
    bookingToggle.checked = !disabled;
    availabilityCard.classList.toggle('is-closed', disabled);
    reasonRow.hidden = !disabled;
    if (disabled) {
      availabilityLabel.textContent = 'Not Available for Booking';
      availabilityHint.textContent = 'Customers see a "reservations closed" message and cannot submit requests.';
      reasonInput.value = reason || '';
    } else {
      availabilityLabel.textContent = 'Accepting Reservations';
      availabilityHint.textContent = 'Customers can submit new reservation requests.';
    }
  }

  async function loadBookingStatus(password) {
    try {
      const res = await fetch('/api/booking-status');
      if (!res.ok) return;
      const data = await res.json();
      renderAvailability(!!data.disabled, data.reason || '');
    } catch (err) {
      // Leave the toggle in its last known state if this fails.
    }
  }

  async function saveBookingStatus(disabled, reason) {
    const password = sessionStorage.getItem('dashPassword') || '';
    availabilitySavedEl.textContent = 'Saving…';
    try {
      const res = await fetch('/api/booking-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ disabled, reason: reason || '' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        availabilitySavedEl.textContent = body.error || 'Could not save. Please try again.';
        renderAvailability(!disabled, reason || '');
        return;
      }
      const data = await res.json();
      renderAvailability(data.disabled, data.reason || '');
      availabilitySavedEl.textContent = 'Saved ✓';
      setTimeout(() => { availabilitySavedEl.textContent = ''; }, 3000);
    } catch (err) {
      availabilitySavedEl.textContent = 'Could not reach the server.';
      renderAvailability(!disabled, reason || '');
    }
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = passwordInput.value;
    sessionStorage.setItem('dashPassword', password);
    loadReservations(password);
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('dashPassword');
    passwordInput.value = '';
    showLogin('');
  });

  refreshBtn.addEventListener('click', () => loadReservations(sessionStorage.getItem('dashPassword') || ''));
  filterInput.addEventListener('input', applyFilter);
  todayOnlyInput.addEventListener('change', applyFilter);

  bookingToggle.addEventListener('change', () => {
    const disabled = !bookingToggle.checked;
    saveBookingStatus(disabled, reasonInput.value);
  });
  reasonSaveBtn.addEventListener('click', () => {
    saveBookingStatus(true, reasonInput.value);
  });

  const savedPassword = sessionStorage.getItem('dashPassword');
  if (savedPassword) {
    loadReservations(savedPassword);
  }
});
