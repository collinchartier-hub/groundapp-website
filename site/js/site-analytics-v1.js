/* A private review never loads the production beacon. */
(function () {
  if (window.GroundPreview && window.GroundPreview.active()) return;
  var script = document.createElement('script');
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.defer = true;
  script.setAttribute('data-cf-beacon', JSON.stringify({ token: '03e507bb97d74e78bc8de83dc6b261ec' }));
  document.head.appendChild(script);
})();
