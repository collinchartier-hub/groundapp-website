/* App Store campaign tagging + tap counting.
   Every App Store link is a campaign link tagged ct=site-<placement> in the HTML.
   Visitors from a Meta ad (utm_source=meta/facebook/fb, or Meta's fbclid) get ct=ad-<placement>;
   visitors who arrive from Instagram organically get ct=ig-<placement>. So App Store Connect >
   Analytics > Campaigns shows which button and which channel drove the install.
   Instagram is detected from utm_source (groundapp.live/ig, or the utm_source=ig that
   Instagram adds to bio links), the referrer, or Instagram's igsh share param.
   The source is remembered for the rest of the visit.
   Each tap is also counted at /api/tap (shown on groundapp.live/admin), because Apple
   hides campaign rows with fewer than 5 users, and reported to Meta as "AppStoreClick"
   (browser pixel here + server at /api/tap, same event ID so Meta counts it once).
   Bump the filename (v4, v5) when editing: Cloudflare caches .js at the edge for 7 days. */
(function () {
  'use strict';
  try {
    var KEY = 'ga-src';
    var q = new URLSearchParams(window.location.search);
    var fromAd = /^(meta|facebook|fb)$/i.test(q.get('utm_source') || '') || q.has('fbclid');
    var fromIg = /^(ig|instagram)$/i.test(q.get('utm_source') || '') ||
      /(^|\.)instagram\.com/i.test(document.referrer.split('/')[2] || '') ||
      q.has('igsh') || q.has('igshid');
    var now = fromAd ? 'ad' : (fromIg ? 'ig' : null);
    var src = null;
    try {
      if (now && window.sessionStorage.getItem(KEY) !== 'ad') window.sessionStorage.setItem(KEY, now);
      src = window.sessionStorage.getItem(KEY);
    } catch (e) {
      src = now;
    }

    var links = document.querySelectorAll('a[data-ct]');
    for (var i = 0; i < links.length; i++) {
      if (src === 'ad' || src === 'ig') links[i].href = links[i].href.replace(/([?&]ct=)site-/, '$1' + src + '-');
      links[i].addEventListener('click', countTap);
    }
  } catch (e) { /* tagging is best effort; links still work */ }

  function eventId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function countTap(e) {
    try {
      var m = /[?&]ct=([^&#]+)/.exec(e.currentTarget.href);
      if (!m) return;
      var ct = decodeURIComponent(m[1]);
      var eid = eventId();
      if (typeof window.fbq === 'function') window.fbq('trackCustom', 'AppStoreClick', { ct: ct }, { eventID: eid });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/tap', JSON.stringify({ ct: ct, path: window.location.pathname, eid: eid }));
      }
    } catch (err) { /* never block the tap */ }
  }
})();
