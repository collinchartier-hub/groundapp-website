/* App Store campaign tagging + tap counting.
   Every App Store link is a campaign link tagged ct=site-<placement> in the HTML.
   Visitors who arrive from Instagram get ct=ig-<placement> instead, so App Store
   Connect > Analytics > Campaigns shows which button and which channel drove the install.
   Instagram is detected from utm_source (groundapp.live/ig, or the utm_source=ig that
   Instagram adds to bio links), the referrer, or Instagram's igsh share param, and
   remembered for the rest of the visit.
   Each tap is also counted at /api/tap (shown on groundapp.live/admin), because Apple
   hides campaign rows with fewer than 5 users.
   Bump the filename (v3, v4) when editing: Cloudflare caches .js at the edge for 7 days. */
(function () {
  'use strict';
  try {
    var KEY = 'ga-src';
    var q = new URLSearchParams(window.location.search);
    var fromIg = /^(ig|instagram)$/i.test(q.get('utm_source') || '') ||
      /(^|\.)instagram\.com/i.test(document.referrer.split('/')[2] || '') ||
      q.has('igsh') || q.has('igshid');
    var src = null;
    try {
      if (fromIg) window.sessionStorage.setItem(KEY, 'ig');
      src = window.sessionStorage.getItem(KEY);
    } catch (e) {
      src = fromIg ? 'ig' : null;
    }

    var links = document.querySelectorAll('a[data-ct]');
    for (var i = 0; i < links.length; i++) {
      if (src === 'ig') links[i].href = links[i].href.replace(/([?&]ct=)site-/, '$1ig-');
      links[i].addEventListener('click', countTap);
    }
  } catch (e) { /* tagging is best effort; links still work */ }

  function countTap(e) {
    try {
      var m = /[?&]ct=([^&#]+)/.exec(e.currentTarget.href);
      if (!m || !navigator.sendBeacon) return;
      navigator.sendBeacon('/api/tap', JSON.stringify({ ct: decodeURIComponent(m[1]), path: window.location.pathname }));
    } catch (err) { /* never block the tap */ }
  }
})();
