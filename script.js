// Sticky nav shadow on scroll
const nav = document.getElementById('nav');
const onScroll = () => {
  if (window.scrollY > 8) nav.classList.add('is-scrolled');
  else nav.classList.remove('is-scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile nav toggle
const toggle = document.getElementById('navToggle');
const links = document.querySelector('.nav__links');
toggle?.addEventListener('click', () => {
  links.classList.toggle('is-open');
});
links?.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => links.classList.remove('is-open'))
);

// Year stamp
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
