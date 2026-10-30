/* GroundApp site v3: the phone Menu sheet, on every page (the landing page too).
   #menuBtn toggles nav#menu. While it is open the page behind it is inert, Tab stays between the Close button and
   the menu's links, Escape closes it, and focus goes back to the Menu button. Fires `menu:toggle` (detail: open) on
   document so a page can react (the landing page's dock steps aside).
   Bump the filename (v2) when editing after a deploy: /js is cached for 7 days. */
(() => {
  const menu = document.getElementById('menu');
  const btn = document.getElementById('menuBtn');
  if (!menu || !btn) return;
  const head = btn.closest('header') || btn.parentElement;
  const desk = matchMedia('(min-width: 861px)');
  let walled = [];
  // Everything the sheet covers: the body's other children, and the header's controls except the Close button.
  function wall(on) {
    walled.forEach((el) => { el.inert = false; });
    walled = [];
    if (!on) return;
    for (const el of document.body.children) {
      if (el === menu || el === head || el.contains(menu) || el.tagName === 'SCRIPT' || el.inert) continue;
      walled.push(el);
    }
    for (const el of head.children) if (el !== btn && !el.contains(btn) && !el.inert) walled.push(el);
    walled.forEach((el) => { el.inert = true; });
  }
  function set(open, focusBack) {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    btn.textContent = open ? 'Close' : 'Menu';
    document.documentElement.classList.toggle('menu-open', open);
    wall(open);
    document.dispatchEvent(new CustomEvent('menu:toggle', { detail: open }));
    if (open) menu.querySelector('a').focus();
    else if (focusBack) btn.focus();
  }
  btn.addEventListener('click', () => set(menu.hidden, !menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false, false); });
  document.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); set(false, true); return; }
    if (e.key !== 'Tab') return;
    const stops = [btn, ...menu.querySelectorAll('a[href], button:not([disabled])')];
    const i = stops.indexOf(document.activeElement);
    const next = e.shiftKey ? (i <= 0 ? stops.length - 1 : i - 1) : (i === -1 || i === stops.length - 1 ? 0 : i + 1);
    e.preventDefault();
    stops[next].focus();
  });
  desk.addEventListener('change', (e) => { if (e.matches && !menu.hidden) set(false, false); });
})();
