/* Atlas access is a local browser gate, not an account or a paid entitlement. */
(function () {
  var form = document.getElementById('gateForm');
  if (!form) return;
  var locked = document.getElementById('lockedCard'), player = document.getElementById('player');
  var email = document.getElementById('gateEmail'), name = document.getElementById('gateName');
  var consent = document.getElementById('gateConsent'), err = document.getElementById('gateErr');
  var btn = document.getElementById('gateBtn'), status = document.getElementById('unlockOk');
  var started = Date.now(), label = btn.textContent, key = 'atlas-unlocked';
  function preview() { return !!(window.GroundPreview && window.GroundPreview.active()); }
  function open(message, persist) {
    locked.hidden = true; player.hidden = false;
    if (persist) try { localStorage.setItem(key, 'true'); } catch (_) {}
    status.textContent = message; status.hidden = false; status.focus();
  }
  if (preview()) {
    var review = document.createElement('button');
    review.type = 'button'; review.className = 'btn';
    review.textContent = 'Review the existing recording';
    review.addEventListener('click', function () { open('Private preview playback. Nothing was sent, and no mailing-list permission or account was created.', false); });
    locked.appendChild(review);
  } else {
    try { if (localStorage.getItem(key) === 'true') open('Practice opened on this browser.', false); } catch (_) {}
  }
  email.addEventListener('input', function () { email.removeAttribute('aria-invalid'); err.textContent = ''; });
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!email.checkValidity() || !email.value.trim()) {
      email.setAttribute('aria-invalid', 'true'); err.textContent = 'Please enter a valid email address.'; email.focus(); return;
    }
    err.textContent = '';
    if (preview()) { err.textContent = 'Private preview. Nothing was sent. Use Review the existing recording to inspect playback.'; return; }
    if (!consent.checked) { open('Practice opened. You have not joined the email list. Your email was not sent.', true); return; }
    btn.disabled = true; btn.textContent = 'Joining the optional notes...';
    try {
      var payload = { email: email.value.trim(), name: name.value.trim(), source: 'atlas-' + location.pathname.split('/').filter(Boolean).pop(), website: document.getElementById('gateWebsite').value, t: Date.now() - started };
      var response = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      var result = await response.json();
      if (!response.ok || !result || result.ok !== true) throw new Error('subscription');
      open(result.status === 'already' ? 'Practice opened. This email is already on the notes list.' : 'Practice opened. You joined the optional notes; a welcome email is on its way.', true);
    } catch (_) {
      err.textContent = 'We could not confirm the email subscription. Try again, or uncheck optional notes to open the practice without joining.';
    } finally { btn.disabled = false; btn.textContent = label; }
  });
})();
