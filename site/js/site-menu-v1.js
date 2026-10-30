/* GroundApp site v3: the phone Menu sheet on pages without home-v5.js (support, legal, blog, atlas, 404, play).
   Same markup and behaviour as the landing page: #menuBtn toggles nav#menu, Escape closes, a link tap closes.
   Bump the filename (v2) when editing: /js is cached for 7 days. */
(() => {
  const menu = document.getElementById('menu');
  const btn = document.getElementById('menuBtn');
  if (!menu || !btn) return;
  const desk = matchMedia('(min-width: 861px)');
  function set(open, focusBack) {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    btn.textContent = open ? 'Close' : 'Menu';
    document.documentElement.classList.toggle('menu-open', open);
    if (open) menu.querySelector('a').focus();
    else if (focusBack) btn.focus();
  }
  btn.addEventListener('click', () => set(menu.hidden, false));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false, false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) set(false, true); });
  desk.addEventListener('change', (e) => { if (e.matches && !menu.hidden) set(false, false); });
})();
