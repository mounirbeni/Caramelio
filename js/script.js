document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('header');
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');

  navToggle.addEventListener('click', () => {
    header.classList.toggle('nav-open');
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => header.classList.remove('nav-open'));
  });

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
