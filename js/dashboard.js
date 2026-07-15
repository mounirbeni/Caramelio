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
  const refreshBtn = document.getElementById('dashRefresh');

  let reservations = [];

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

  function applyFilter() {
    const q = filterInput.value.trim().toLowerCase();
    if (!q) { renderList(reservations); return; }
    renderList(reservations.filter((r) =>
      r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q)
    ));
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
      applyFilter();
    } catch (err) {
      statusEl.textContent = 'Could not reach the server. Check your connection and try again.';
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

  const savedPassword = sessionStorage.getItem('dashPassword');
  if (savedPassword) {
    loadReservations(savedPassword);
  }
});
