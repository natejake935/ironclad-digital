/* ================================================================
   Ironclad Digital — shared site script.
   Serves both the v2 homepage (hamburger drawer) and the legacy
   pages (book / privacy / terms — #navToggle menu + year stamp).
   Every lookup is null-guarded so one file works on every page.
================================================================ */

/* Nav scroll state — supports both the v2 box-shadow and the
   legacy `.is-scrolled` class. */
const nav = document.getElementById('nav');
if (nav) {
  const onScroll = () => {
    const scrolled = window.scrollY > 8;
    nav.classList.toggle('is-scrolled', scrolled);
    nav.style.boxShadow = scrolled ? '0 2px 24px rgba(0,0,0,0.5)' : '';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* v2 homepage — hamburger + slide-down drawer. */
const hamburger = document.getElementById('hamburger');
const navDrawer = document.getElementById('navDrawer');
if (hamburger && navDrawer) {
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    navDrawer.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
    navDrawer.setAttribute('aria-hidden', !open);
  });
  navDrawer.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navDrawer.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      navDrawer.setAttribute('aria-hidden', 'true');
    });
  });
}

/* Legacy pages — #navToggle toggles `.nav__links.is-open`. */
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav__links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('is-open'));
  navLinks.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => navLinks.classList.remove('is-open'))
  );
}

/* Footer year stamp (legacy pages). */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
