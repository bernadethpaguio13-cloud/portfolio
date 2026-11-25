const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

if (menuButton && navigation) {
  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('is-open');
  };

  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    navigation.classList.toggle('is-open', !isOpen);
  });

  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}
/* Scroll reveal (progressive enhancement) */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !reducedMotion) {
  document.documentElement.classList.add('js');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.intro, .services, .work-heading, .toolkit, .background, .contact, .service-card, .work-card, .tool-group, .detail-block').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.setProperty('--d', `${(i % 3) * 0.08}s`);
    revealObserver.observe(el);
  });
}

/* Highlight the nav link of the section in view */
if ('IntersectionObserver' in window) {
  const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => link.removeAttribute('aria-current'));
      const active = navLinks.find((link) => link.getAttribute('href') === `#${entry.target.id}`);
      if (active) active.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  navLinks.forEach((link) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) spy.observe(target);
  });
}

document.querySelectorAll('.project-video').forEach((projectVideo) => {
  const videoFallback = projectVideo.parentElement.querySelector('.video-fallback');
  if (!videoFallback) return;
  projectVideo.addEventListener('error', () => {
    projectVideo.hidden = true;
    videoFallback.hidden = false;
  });
  projectVideo.addEventListener('loadedmetadata', () => {
    videoFallback.hidden = true;
  });
});