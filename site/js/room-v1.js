/* The room (DESIGN.md, Motion budget): writes --p on [data-room], 0 when the pin reaches the top of the screen and
   1 when it lets go, so home-v3.css can open the class film from a framed window to full bleed and settle the
   title and notes. One rAF-throttled scroll listener, active only while the room is near the screen. Reduced
   motion: nothing runs and the CSS shows the room open. Bump the filename (v2, v3) when editing. */
(function () {
  'use strict';
  var room = document.querySelector('[data-room]');
  if (!room || !('IntersectionObserver' in window)) return;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var raf = 0, near = false;
  function set() {
    raf = 0;
    var r = room.getBoundingClientRect(), span = Math.max(1, r.height - innerHeight);
    room.style.setProperty('--p', Math.min(1, Math.max(0, -r.top / span)).toFixed(4));
  }
  function request() { if (near && !mq.matches && !raf) raf = requestAnimationFrame(set); }
  new IntersectionObserver(function (es) { near = es[0].isIntersecting; request(); }, { rootMargin: '200px 0px' }).observe(room);
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
})();
