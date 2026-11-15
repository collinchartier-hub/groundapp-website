/* Explicit review mode, never inferred from a customer hostname. Production keeps its integrations. */
(function () {
  function active() {
    return window.__BRAND_PREVIEW__ === true || window.__BRAND_PREVIEW__ === 1 ||
      !!document.querySelector('script[src="/__preview/guard.js"],meta[name="brand-preview"][content="1"]');
  }
  window.GroundPreview = Object.freeze({ active: active });
})();
