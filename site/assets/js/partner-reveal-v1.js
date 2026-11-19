// Keep the native POST form as a no-JavaScript fallback; enhance it for network errors.
(function () {
  'use strict';
  var form = document.getElementById('ax-reveal-form');
  if (!form) return;
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var button = form.querySelector('button');
    var error = document.getElementById('ax-reveal-error');
    button.disabled = true;
    error.hidden = true;
    fetch(form.action, { method: 'POST', credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('reveal failed');
        return response.text();
      })
      .then(function (markup) {
        var result = new DOMParser().parseFromString(markup, 'text/html').getElementById('ax-revealed');
        if (!result) throw new Error('missing code');
        form.replaceWith(result);
      })
      .catch(function () {
        error.hidden = false;
        button.disabled = false;
      });
  });
})();
