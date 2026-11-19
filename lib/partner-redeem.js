// A tracked member link: iOS GET opens the code and redirects; desktop GET
// only displays a QR. The same-origin button POST records and reveals the code.
import { html, supabase, escapeHtml as esc } from './util.js';
import { isToken, isIosUA, redeemLink } from './partner.js';
import { partnerConfig } from './partners.js';

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
</main><script src="/assets/js/partner-qr-v1.js" defer></script><script src="/assets/js/partner-reveal-v1.js" defer></script></body></html>`;
  }

  const notFound = () =>
    html(page({ title: 'Link not found', heading: "This link didn't match a code.", body: `<p>Check the link in your email, or ask for your code again.</p>` }), 404);

  function desktopBody(token, code = null, failed = false) {
    const link = redeemLink(slug, token);
    return `<p>Your free year of GroundApp Premium is redeemed in the App Store on your iPhone. Point your iPhone camera at this code, or open the email on your iPhone and tap the button.</p>
<div class="ax-qr" data-qr="${esc(link)}" role="img" aria-label="QR code for your link"></div>
${code ? `<div id="ax-revealed"><p>Your code. It's yours alone and works once.</p><p class="ax-code">${esc(code)}</p><p>App Store &gt; your picture &gt; Redeem Gift Card or Code.</p></div>` : `<p>No iPhone handy? Show your code and enter it by hand.</p>
<form id="ax-reveal-form" method="post" action="/${slug}/r/${esc(token)}"><button type="submit" style="min-height:48px;margin:16px 0;padding:12px 24px;border:0;border-radius:999px;background:#c4935a;color:#1a110e;font:600 16px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;cursor:pointer;">Show my code</button></form>`}
<p id="ax-reveal-error" role="alert"${failed ? '' : ' hidden'}>We couldn't show your code. Try again in a minute.</p>`;
  }

  return {
    async onRequestGet({ params, request, env }) {
      const token = String(params.token || '');
      if (!isToken(token)) return notFound();
      const ios = isIosUA(request.headers.get('user-agent'));
      const rpc = await supabase(env, 'rpc/partner_tap', { method: 'POST', body: { p_token: token, p_ios: ios, p_partner: slug } });
      if (!rpc.ok) {
        console.error('partner_tap failed', rpc.status);
        return html(page({ title: 'Try again', heading: 'Something went wrong on our side.', body: '<p>Give it a minute and tap your link again.</p>' }), 500);
      }
      const t = rpc.data;
      if (!t.found || t.partner !== slug) return notFound();
      if (t.status !== 'assigned' || !t.redeem_url) {
        return html(page({ title: "You're on the list", heading: "You're on the list.", body: '<p>Your code is not ready yet. It will arrive by email as soon as it is.</p>' }));
      }
      if (ios) return new Response(null, { status: 302, headers: { location: t.redeem_url, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
      return html(page({ title: 'Open this on your iPhone', heading: 'Open this on your iPhone', body: desktopBody(token) }));
    },
    async onRequestPost({ params, request, env }) {
      if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, { status: 403, headers: { 'cache-control': 'no-store' } });
      const token = String(params.token || '');
      if (!isToken(token)) return notFound();
      const rpc = await supabase(env, 'rpc/partner_reveal_code', { method: 'POST', body: { p_token: token, p_partner: slug } });
      if (!rpc.ok) {
        console.error('partner reveal failed', rpc.status);
        return html(page({ title: 'Open this on your iPhone', heading: 'Open this on your iPhone', body: desktopBody(token, null, true) }), 500);
      }
      if (!rpc.data?.found || !rpc.data.code) return notFound();
      return html(page({ title: 'Open this on your iPhone', heading: 'Open this on your iPhone', body: desktopBody(token, rpc.data.code) }));
    },
  };
}
