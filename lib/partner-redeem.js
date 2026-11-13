// The emailed redemption link for any configured partner.
// iPhone or iPad: count the tap, cancel the reminder, then redirect to Apple's redemption page.
// Other devices: show the member's code and a QR link to open on their iPhone.
import { html, supabase, escapeHtml as esc } from './util.js';
import { isToken, isIosUA, redeemLink } from './partner.js';
import { partnerConfig } from './partners.js';
import { cancelEmail } from './partner-email.js';

export function redeemHandler(slug) {
  const partner = partnerConfig(slug);
  if (!partner) throw new Error(`Unknown partner: ${slug}`);

  function page({ title, heading, body }) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<link rel="stylesheet" href="${esc(partner.css)}"></head>
<body class="ax-redeem"><main class="ax-redeem-card">
<p class="ax-lockup">${esc(partner.lockup)} × GroundApp</p>
<h1>${esc(heading)}</h1>
${body}
<p><a href="/${slug}">Back to the ${esc(partner.name)} page</a></p>
</main><script src="/assets/js/partner-qr-v1.js" defer></script></body></html>`;
  }

  const notFound = () =>
    html(page({ title: 'Link not found', heading: "This link didn't match a code.", body: `<p>Check the link in your email, or ask for your code again.</p>` }), 404);

  return async function onRequestGet({ params, request, env, waitUntil }) {
    const token = String(params.token || '');
    if (!isToken(token)) return notFound();

    const ios = isIosUA(request.headers.get('user-agent'));
    const rpc = await supabase(env, 'rpc/partner_tap', { method: 'POST', body: { p_token: token, p_ios: ios } });
    if (!rpc.ok) {
      console.error('partner_tap failed', rpc.status);
      return html(page({ title: 'Try again', heading: 'Something went wrong on our side.', body: '<p>Give it a minute and tap your link again.</p>' }), 500);
    }
    const t = rpc.data;
    if (!t.found || t.partner !== slug) return notFound();

    if (t.status !== 'assigned' || !t.redeem_url) {
      return html(page({
        title: "You're on the list",
        heading: "You're on the list.",
        body: '<p>Your code is not ready yet. It will arrive by email as soon as it is.</p>',
      }));
    }

    if (ios) {
      if (t.nudge_email_id) waitUntil((async () => {
        if (await cancelEmail(env, t.nudge_email_id)) {
          const cleared = await supabase(env, `partner_claims?id=eq.${t.claim_id}`, {
            method: 'PATCH', prefer: 'return=minimal', body: { nudge_email_id: null },
          });
          if (!cleared.ok) console.error('partner reminder clear failed', t.claim_id, cleared.status);
        }
      })());
      return new Response(null, { status: 302, headers: { location: t.redeem_url, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
    }

    const link = redeemLink(slug, token);
    return html(page({
      title: 'Open this on your iPhone',
      heading: 'Open this on your iPhone',
      body: `<p>Your free year of GroundApp Premium is redeemed in the App Store on your iPhone. Point your iPhone camera at this code, or open the email on your iPhone and tap the button.</p>
<div class="ax-qr" data-qr="${esc(link)}" role="img" aria-label="QR code for your link"></div>
<p>Or enter it by hand: App Store &gt; your picture &gt; Redeem Gift Card or Code.</p>
<p class="ax-code">${esc(t.code)}</p>`,
    }));
  };
}
