document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('header');
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');

  // The topbar and header are fixed (not sticky — see css/style.css) so the page
  // content needs real padding-top to match their combined height, since fixed
  // elements no longer reserve their own space in the document flow.
  const topbarEl = document.querySelector('.topbar');
  const updateFixedOffsets = () => {
    const topbarH = topbarEl ? topbarEl.offsetHeight : 0;
    const headerH = header ? header.offsetHeight : 0;
    document.documentElement.style.setProperty('--topbar-h', `${topbarH}px`);
    document.documentElement.style.setProperty('--header-h', `${headerH}px`);
  };
  updateFixedOffsets();
  window.addEventListener('resize', updateFixedOffsets);
  window.addEventListener('orientationchange', updateFixedOffsets);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateFixedOffsets).catch(() => {});
  }

  navToggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      header.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Register the service worker so the site is installable and opens app-like (no browser chrome)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // Keep the fixed bottom tab bar pinned to the true visible screen on iOS Safari,
  // where `position: fixed; bottom: 0` is anchored to the layout viewport and can
  // drift mid-page while the address bar shows/hides during scroll.
  const tabbar = document.getElementById('appTabbar');
  if (tabbar && window.visualViewport) {
    const pinTabbar = () => {
      const vv = window.visualViewport;
      const gap = window.innerHeight - (vv.height + vv.offsetTop);
      tabbar.style.transform = gap > 0.5 ? `translate3d(0, -${gap}px, 0)` : '';
    };
    window.visualViewport.addEventListener('resize', pinTabbar);
    window.visualViewport.addEventListener('scroll', pinTabbar);
    window.addEventListener('scroll', pinTabbar, { passive: true });
    window.addEventListener('orientationchange', pinTabbar);
    pinTabbar();
  }

  // Header shadow state on scroll
  const whatsapp = document.querySelector('.whatsapp-float');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
    if (whatsapp) whatsapp.classList.toggle('visible', window.scrollY > window.innerHeight * 0.6);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Scroll-reveal animations
  const revealTargets = document.querySelectorAll(
    '.reserve-info, .reserve-card, .about-text, .about-visual, .hub-card, .dish-list, .dish-col, .gallery-item, .bakery-text, .bakery-visual, .rating-card, .review-card, .location-info, .location-map'
  );
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${(i % 4) * 0.08}s`;
      revealObserver.observe(el);
    });
  } else {
    revealTargets.forEach(el => el.classList.add('is-visible'));
  }

  // Active nav link + bottom tab bar highlighting, based on the current page
  const currentPage = location.pathname.split('/').pop() || 'index.html';

  nav.querySelectorAll('a[href]').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });

  document.querySelectorAll('.tab-item[data-page]').forEach(tab => {
    if (tab.dataset.page === currentPage) tab.classList.add('active');
  });

  // Menu category cover photos — show how many dishes are in each category
  document.querySelectorAll('.menu-category-count').forEach(countEl => {
    const scope = countEl.closest('.dish-col') || countEl.closest('section');
    if (!scope) return;
    const count = scope.querySelectorAll('.dish-list li').length;
    countEl.textContent = count > 0 ? `${count} ${count === 1 ? 'Option' : 'Options'}` : 'Coming Soon';
  });

  // Menu category filter chips
  const menuFilters = document.getElementById('menuFilters');
  if (menuFilters) {
    const chips = menuFilters.querySelectorAll('.filter-chip');
    const categorized = document.querySelectorAll('[data-category]');
    const filterGroups = document.querySelectorAll('[data-filter-group]');
    const filterSections = document.querySelectorAll('[data-filter-section]');
    const emptyState = document.getElementById('menuEmptyState');

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const category = chip.dataset.filter;

        chips.forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');

        let visibleCount = 0;
        categorized.forEach(item => {
          const itemCategories = (item.dataset.category || '').split(/\s+/);
          const matches = category === 'all' || itemCategories.includes(category);
          item.classList.toggle('is-hidden', !matches);
          if (matches) visibleCount += 1;
        });

        filterGroups.forEach(group => {
          const hasVisibleItem = group.querySelectorAll('[data-category]:not(.is-hidden)').length > 0;
          group.classList.toggle('is-hidden', !hasVisibleItem);
        });

        filterSections.forEach(section => {
          const hasVisibleItem = section.querySelectorAll('[data-category]:not(.is-hidden)').length > 0;
          section.classList.toggle('is-hidden', !hasVisibleItem);
        });

        if (emptyState) emptyState.hidden = visibleCount > 0;
      });
    });
  }

  // Reservation form — submits straight to the reservations database
  const reserveForm = document.getElementById('reserveForm');
  if (reserveForm) {
    const dateInput = document.getElementById('rsv-date');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

    const submitBtn = reserveForm.querySelector('.reserve-submit');
    const hintEl = reserveForm.querySelector('.reserve-hint');
    const defaultHint = hintEl ? hintEl.textContent : '';
    const defaultBtnLabel = submitBtn ? submitBtn.textContent : '';

    reserveForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!reserveForm.checkValidity()) {
        reserveForm.reportValidity();
        return;
      }
      const data = new FormData(reserveForm);
      const payload = {
        name: data.get('name').trim(),
        phone: data.get('phone').trim(),
        guests: data.get('guests'),
        date: data.get('date'),
        time: data.get('time'),
        notes: data.get('notes').trim(),
      };

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
      if (hintEl) { hintEl.textContent = ''; hintEl.classList.remove('reserve-hint-error', 'reserve-hint-success'); }

      try {
        const res = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Something went wrong. Please try again or call us.');
        }

        reserveForm.reset();
        if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
        if (submitBtn) submitBtn.textContent = 'Request Sent ✓';
        if (hintEl) {
          hintEl.textContent = "Thank you! We've received your request and will confirm shortly.";
          hintEl.classList.add('reserve-hint-success');
        }
        setTimeout(() => {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = defaultBtnLabel; }
          if (hintEl) { hintEl.textContent = defaultHint; hintEl.classList.remove('reserve-hint-success'); }
        }, 4000);
      } catch (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = defaultBtnLabel; }
        if (hintEl) {
          hintEl.textContent = err.message || 'Something went wrong. Please try again or call us.';
          hintEl.classList.add('reserve-hint-error');
        }
      }
    });
  }
});
