document.addEventListener('DOMContentLoaded', () => {
  const scrollArea = document.getElementById('scrollArea');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Thin gold progress bar reflecting how far the visitor has scrolled
  // through the current page's .scroll-area.
  const progressBar = document.getElementById('scrollProgress');
  if (progressBar && scrollArea) {
    const updateProgress = () => {
      const max = scrollArea.scrollHeight - scrollArea.clientHeight;
      const pct = max > 0 ? Math.min(100, (scrollArea.scrollTop / max) * 100) : 0;
      progressBar.style.width = `${pct}%`;
    };
    updateProgress();
    scrollArea.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  // Count-up motion graphic for stat numbers (hero stats, rating scores).
  // Falls back gracefully: the HTML already holds the correct final value,
  // so if this never runs the number is still right — it just won't animate.
  const counters = document.querySelectorAll('[data-count-to]');
  if (counters.length) {
    const animateCount = (el) => {
      const target = parseFloat(el.dataset.countTo);
      if (Number.isNaN(target)) return;
      const suffix = el.dataset.countSuffix || '';
      const decimals = el.dataset.countDecimals ? parseInt(el.dataset.countDecimals, 10) : 0;
      if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
      const duration = 1100;
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const countObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      }, { root: scrollArea || null, threshold: 0.6 });
      counters.forEach((el) => countObserver.observe(el));
    } else {
      counters.forEach(animateCount);
    }
  }

  // Hero entrance — a staggered fade-up for the above-the-fold hero content,
  // played once on load rather than gated by scroll (it's already in view).
  const heroEls = document.querySelectorAll('[data-hero-in]');
  if (heroEls.length) {
    if (reduceMotion) {
      heroEls.forEach((el) => el.classList.add('hero-in-visible'));
    } else {
      heroEls.forEach((el, i) => {
        el.style.transitionDelay = `${0.15 + i * 0.11}s`;
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          heroEls.forEach((el) => el.classList.add('hero-in-visible'));
        });
      });
    }
  }

  // Subtle parallax on the hero's background layers, scoped to elements
  // inside .hero (which clips overflow), so drift never leaks into layout.
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && scrollArea && !reduceMotion) {
    let ticking = false;
    const applyParallax = () => {
      const scrollTop = scrollArea.scrollTop;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        el.style.transform = `translate3d(0, ${scrollTop * speed}px, 0)`;
      });
      ticking = false;
    };
    applyParallax();
    scrollArea.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(applyParallax);
        ticking = true;
      }
    }, { passive: true });
  }
});
