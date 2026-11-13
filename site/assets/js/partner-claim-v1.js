// Shared partner form: sends a claim to POST /api/partner/claim and shows what happened.
// The code itself only ever arrives by email.
(function () {
  'use strict';
  var form = document.getElementById('claim-form');
  if (!form) return;
  var partner = form.dataset.partner;
  if (!partner) return;
  var name = form.dataset.partnerName || partner;
  var status = document.getElementById('claim-status');
  var button = form.querySelector('button[type="submit"]');
  var started = Date.now();
  var src = (new URLSearchParams(location.search).get('src') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);

  // Bot check: Cloudflare Turnstile, drawn here so local runs can use Cloudflare's always-pass test key.
  var box = form.querySelector('.cf-turnstile');
  var widgetId = null;
  if (box) {
    var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    var key = local ? '1x00000000000000000000AA' : box.getAttribute('data-sitekey');
    window.__axTurnstile = function () {
      widgetId = window.turnstile.render(box, { sitekey: key, theme: 'dark' });
    };
    var api = document.createElement('script');
    api.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__axTurnstile';
    api.async = true;
    api.defer = true;
    document.head.appendChild(api);
  }
  function resetBotCheck() {
    if (window.turnstile && widgetId != null) window.turnstile.reset(widgetId);
  }

  var MESSAGES = {
    assigned: 'Check your inbox. Your code and link are on the way to {email}. Open it on your iPhone.',
    existing: 'You already claimed your year. We just sent your code again to {email}.',
    android: "GroundApp is iPhone only for now. You're on the list, and we'll email you when Android is ready.",
    waitlist: "Codes are being restocked. You're on the list and yours will arrive by email.",
    first_name: 'Add your first name.',
    last_name: 'Add your last name.',
    email: "That email doesn't look right.",
    device: 'Pick iPhone or Android.',
    location: 'Pick your ' + name + ' location.',
    member: 'This one is for ' + name + ' members. Tick the box if that is you.',
    bot_check: 'One more step: tick "Verify you are human" above the button, then tap it again.',
    rate_limited: 'A lot of people on this network just signed up. Try again in an hour.',
    email_failed: 'Something went wrong on our side. Your spot is saved. Try again in a minute.',
    server: 'Something went wrong on our side. Try again in a minute.'
  };
  var FIELD_IDS = { first_name: 'cf-first', last_name: 'cf-last', email: 'cf-email', location: 'cf-location' };

  function show(key, email, isError) {
    status.textContent = (MESSAGES[key] || MESSAGES.server).replace('{email}', email || '');
    status.classList.toggle('is-error', isError);
    status.classList.toggle('is-ok', !isError);
  }
  function hide() {
    status.textContent = '';
    status.classList.remove('is-error', 'is-ok');
  }
  function clearInvalid() {
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid="true"]'), function (n) { n.removeAttribute('aria-invalid'); });
  }
  function markInvalid(field) {
    var node = FIELD_IDS[field] ? document.getElementById(FIELD_IDS[field]) : form.querySelector('[name="' + field + '"]');
    if (node) { node.setAttribute('aria-invalid', 'true'); node.focus(); }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearInvalid();
    var data = new FormData(form);
    var email = String(data.get('email') || '').trim();
    var payload = {
      partner: partner,
      first_name: String(data.get('first_name') || ''),
      last_name: String(data.get('last_name') || ''),
      email: email,
      device: String(data.get('device') || ''),
      location: String(data.get('location') || ''),
      member: data.get('member') === 'on',
      newsletter: data.get('newsletter') === 'on',
      src: src,
      turnstile: String(data.get('cf-turnstile-response') || ''),
      website: String(data.get('website') || ''),
      t: Date.now() - started
    };
    if (!payload.member) { show('member', '', true); markInvalid('member'); return; }

    button.disabled = true;
    hide();
    fetch('/api/partner/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return j; }, function () { return { ok: false, error: 'server' }; }); })
      .then(function (j) {
        if (j.ok) {
          show(j.status, email, false);
          form.classList.add('is-done');
          Array.prototype.forEach.call(form.querySelectorAll('input, select, button'), function (n) { n.disabled = true; });
          return;
        }
        if (j.error === 'invalid') { show(j.field, '', true); markInvalid(j.field); }
        else show(j.error === 'email' ? 'email_failed' : j.error, '', true);
        button.disabled = false;
        resetBotCheck();
      })
      .catch(function () {
        show('server', '', true);
        button.disabled = false;
        resetBotCheck();
      });
  });
})();
