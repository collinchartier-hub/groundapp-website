// GET /arsenal/r/<token>: an Arsenal member's own link from their email.
// iPhone or iPad: count the tap, cancel the reminder, go to Apple's redemption page with their code.
// Anything else: a page that says to open it on the iPhone, with a QR code of this link and the code typed out.
// Only iPhone taps count, so mail scanners that prefetch links don't look like members.
import { html, supabase, escapeHtml as esc } from '../../../lib/util.js';
import { isToken, isIosUA, redeemLink } from '../../../lib/partner.js';
import { cancelEmail } from '../../../lib/partner-email.js';

const PARTNER = 'arsenal';
const PARTNER_NAME = 'Arsenal Health';

function page({ title, heading, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<link rel="stylesheet" href="/assets/css/arsenal-v1.css"></head>
<body class="ax-redeem"><main class="ax-redeem-card">
<p class="ax-lockup">ARSENAL HEALTH × GroundApp</p>
<h1>${esc(heading)}</h1>
${body}
<p><a href="/${PARTNER}">Back to the ${esc(PARTNER_NAME)} page</a></p>
</main><script src="/assets/js/arsenal-qr-v1.js" defer></script></body></html>`;
}

const notFound = () =>
  html(page({ title: 'Link not found', heading: "This link didn't match a code.", body: `<p>Check the link in your email, or ask for your code again.</p>` }), 404);

export async function onRequestGet({ params, request, env, waitUntil }) {
  const token = String(params.token || '');
  if (!isToken(token)) return notFound();

  const ios = isIosUA(request.headers.get('user-agent'));
  const rpc = await supabase(env, 'rpc/partner_tap', { method: 'POST', body: { p_token: token, p_ios: ios } });
  if (!rpc.ok) {
    console.error('partner_tap failed', rpc.status);
    return html(page({ title: 'Try again', heading: 'Something went wrong on our side.', body: '<p>Give it a minute and tap your link again.</p>' }), 500);
  }
  const t = rpc.data;
  if (!t.found || t.partner !== PARTNER) return notFound();

  if (t.status !== 'assigned' || !t.redeem_url) {
    return html(page({
      title: "You're on the list",
      heading: "You're on the list.",
      body: '<p>Your code is not ready yet. It will arrive by email as soon as it is.</p>',
    }));
  }

  if (ios) {
    if (t.first_tap && t.nudge_email_id) waitUntil(cancelEmail(env, t.nudge_email_id));
    return new Response(null, { status: 302, headers: { location: t.redeem_url, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  }

  const link = redeemLink(PARTNER, token);
  return html(page({
    title: 'Open this on your iPhone',
    heading: 'Open this on your iPhone',
    body: `<p>Your free year of GroundApp Premium is redeemed in the App Store on your iPhone. Point your iPhone camera at this code, or open the email on your iPhone and tap the button.</p>
<div class="ax-qr" data-qr="${esc(link)}" role="img" aria-label="QR code for your link"></div>
<p>Or enter it by hand: App Store &gt; your picture &gt; Redeem Gift Card or Code.</p>
<p class="ax-code">${esc(t.code)}</p>`,
  }));
}
