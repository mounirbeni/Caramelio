document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('header');
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');

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
    '.reserve-info, .reserve-card, .about-text, .about-visual, .menu-card, .dish-col, .bakery-text, .bakery-visual, .review-card, .location-info, .location-map'
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

  // Active nav link + bottom tab bar highlighting
  const sections = ['reserve', 'about', 'breakfast', 'menu', 'bakery', 'reviews', 'location']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const navLinks = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const tabItems = Array.from(document.querySelectorAll('.tab-item[data-sections]'));

  if ('IntersectionObserver' in window && sections.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const link = navLinks.find(a => a.getAttribute('href') === `#${entry.target.id}`);
        if (link) {
          navLinks.forEach(a => a.classList.remove('active'));
          link.classList.add('active');
        }

        const tab = tabItems.find(t => t.dataset.sections.split(',').includes(entry.target.id));
        if (tab) {
          tabItems.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(section => navObserver.observe(section));
  }

  // Reservation form — sends the request via WhatsApp (no backend available)
  const reserveForm = document.getElementById('reserveForm');
  if (reserveForm) {
    const dateInput = document.getElementById('rsv-date');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

    reserveForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!reserveForm.checkValidity()) {
        reserveForm.reportValidity();
        return;
      }
      const data = new FormData(reserveForm);
      const name = data.get('name').trim();
      const phone = data.get('phone').trim();
      const guests = data.get('guests');
      const date = data.get('date');
      const time = data.get('time');
      const notes = data.get('notes').trim();

      let message = `Hello Caramelio! I'd like to reserve a table.\n`;
      message += `Name: ${name}\nPhone: ${phone}\nGuests: ${guests}\nDate: ${date}\nTime: ${time}`;
      if (notes) message += `\nNotes: ${notes}`;

      const whatsappUrl = `https://wa.me/212665707049?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank', 'noopener');
    });
  }
});
