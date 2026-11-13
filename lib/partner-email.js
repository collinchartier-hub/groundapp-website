// Emails for partner code claims: the member's code, one reminder, the two waitlist notes, and alerts to Collin.
// Copy is held as data so the HTML and plain-text parts always say the same thing.
// Frame: the partner page's black, with the letter on GroundApp's warm card (brand kit v5 night tokens).
import { SITE, escapeHtml as esc } from './util.js';

const FROM = 'Collin Chartier <collin@groundapp.live>';
const REPLY_TO = 'collin@groundapp.live';

const C = { page: '#000000', card: '#2d1e17', text: '#e8ddd0', text2: '#a89585', gold: '#c4935a', onGold: '#1a110e', line: '#3d2e26', frameText: '#9ca3af', lockup: '#fafafa', cyan: '#1fcaf4' };
const SERIF = "'Source Serif 4',Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const RENEWAL = 'Free for 12 months, then $39.99 a year unless you cancel. Cancel any time in Settings > your name > Subscriptions. iPhone only.';

// partnerName sets the lockup above the card ("ARSENAL HEALTH × GroundApp"), as text so it shows with images off.
function shell({ title, preheader, inner, footer, partnerName }) {
  const lockup = partnerName
    ? `<tr><td align="center" style="padding:0 8px 20px;font:700 13px/1.4 ${SANS};letter-spacing:2px;color:${C.lockup};"><span style="text-transform:uppercase;">${esc(partnerName)}</span> <span style="color:${C.cyan};">&times;</span> GroundApp</td></tr>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
${lockup}<tr><td style="background:${C.card};border-radius:16px;padding:32px 28px;">${inner}</td></tr>
<tr><td style="padding:20px 8px 0;font:400 12px/1.6 ${SANS};color:${C.frameText};">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (s) => `<p style="margin:0 0 16px;font:400 17px/1.6 ${SANS};color:${C.text};">${s}</p>`;
const small = (s) => `<p style="margin:0 0 12px;font:400 14px/1.6 ${SANS};color:${C.text2};">${s}</p>`;
const h1 = (s) => `<h1 style="margin:0 0 20px;font:400 28px/1.15 ${SERIF};color:${C.text};">${s}</h1>`;
const button = (label, href) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="background:${C.gold};border-radius:14px;"><a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font:600 17px/1 ${SANS};color:${C.onGold};text-decoration:none;">${esc(label)}</a></td></tr></table>`;
const footerFor = (reason, mailingAddress, unsubUrl) =>
  `${esc(reason)}${unsubUrl ? ` <a href="${esc(unsubUrl)}" style="color:${C.frameText};">Unsubscribe</a>.` : ''}<br>GroundApp, by Collin Chartier${mailingAddress ? `<br>${esc(mailingAddress)}` : ''}`;
const footerText = (reason, mailingAddress, unsubUrl) =>
  `---\n${reason}${unsubUrl ? `\nUnsubscribe: ${unsubUrl}` : ''}\nGroundApp, by Collin Chartier${mailingAddress ? `\n${mailingAddress}` : ''}\n`;

export function renderClaimEmail({ partnerName, firstName, code, link, mailingAddress }) {
  const subject = `Your free year of GroundApp, from ${partnerName.split(' ')[0]} and Collin`;
  const body = [
    "I'm Collin. I coach breathwork for performance. I'm an IRONMAN champion, I won the PTO US Open and I raced for Team USA.",
    'I built GroundApp because your breath is the one part of your nervous system you can steer on purpose. It helps you perform under pressure and come back down after.',
    `${partnerName} already gives you the cold plunge and the sauna. Breathwork is the tool you carry out the door. Your first year of GroundApp Premium is on me.`,
  ];
  const steps = [
    'Tap the button on your iPhone.',
    "Confirm in the App Store. If you don't have GroundApp yet, it installs first.",
    'Open GroundApp and check in with Bodie.',
  ];
  const cta = 'Get my free year';
  const reason = `You're getting this because you asked for your ${partnerName} member code at groundapp.live.`;
  const inner = [
    h1(`Hey ${esc(firstName)}, your year is ready.`),
    ...body.map((s) => p(esc(s))),
    button(cta, link),
    small('Tap it on your iPhone. The App Store opens with your code filled in.'),
    `<p style="margin:16px 0 4px;font:400 14px/1.4 ${SANS};color:${C.text2};">Your code, yours alone, works once</p>`,
    `<p style="margin:0 0 20px;font:600 20px/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:1px;color:${C.text};">${esc(code)}</p>`,
    `<ol style="margin:0 0 20px;padding-left:22px;font:400 16px/1.6 ${SANS};color:${C.text};">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`,
    small(esc(RENEWAL)),
    p('Breathe easy,<br>Collin'),
  ].join('\n');
  const html = shell({ partnerName, title: subject, preheader: 'Your own code and link are inside. Tap it on your iPhone.', inner, footer: footerFor(reason, mailingAddress) });
  const text = `Hey ${firstName}, your year is ready.

${body.join('\n\n')}

${cta}: ${link}
Tap it on your iPhone. The App Store opens with your code filled in.

Your code (yours alone, works once): ${code}

${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${RENEWAL}

Breathe easy,
Collin

${footerText(reason, mailingAddress)}`;
  return { subject, html, text };
}

export function renderNudgeEmail({ partnerName, firstName, link, unsubUrl, mailingAddress }) {
  const subject = 'Your free year of GroundApp is still waiting';
  const body = [
    `Your ${partnerName} member code hasn't been used yet.`,
    'Tap the button on your iPhone and your year of GroundApp Premium starts. It takes about a minute.',
  ];
  const cta = 'Get my free year';
  const reason = `You're getting this one reminder because you asked for your ${partnerName} member code at groundapp.live.`;
  const inner = [h1(`Hey ${esc(firstName)}, one tap left.`), ...body.map((s) => p(esc(s))), button(cta, link), small(esc(RENEWAL)), p('Collin')].join('\n');
  const html = shell({ partnerName, title: subject, preheader: 'One tap on your iPhone starts it.', inner, footer: footerFor(reason, mailingAddress, unsubUrl) });
  const text = `Hey ${firstName}, one tap left.\n\n${body.join('\n\n')}\n\n${cta}: ${link}\n\n${RENEWAL}\n\nCollin\n\n${footerText(reason, mailingAddress, unsubUrl)}`;
  return { subject, html, text };
}

export function renderAndroidEmail({ partnerName, firstName, mailingAddress }) {
  const subject = "GroundApp on Android: you're on the list";
  const body = [
    'GroundApp is iPhone only right now, so I can\'t send you a code yet.',
    `You're on the list as a ${partnerName} member. I'll email you when the Android app is ready.`,
  ];
  const reason = `You're getting this because you signed up as a ${partnerName} member at groundapp.live.`;
  const inner = [h1(`Hey ${esc(firstName)}, thanks for raising your hand.`), ...body.map((s) => p(esc(s))), p('Collin')].join('\n');
  const html = shell({ partnerName, title: subject, preheader: "I'll email you when Android is ready.", inner, footer: footerFor(reason, mailingAddress) });
  const text = `Hey ${firstName}, thanks for raising your hand.\n\n${body.join('\n\n')}\n\nCollin\n\n${footerText(reason, mailingAddress)}`;
  return { subject, html, text };
}

export function renderWaitlistEmail({ partnerName, firstName, mailingAddress }) {
  const subject = "You're on the list for your GroundApp code";
  const body = [
    `The ${partnerName} member codes are being restocked.`,
    'Your spot is saved. Your own code and link will land in this inbox as soon as the next batch is in.',
  ];
  const reason = `You're getting this because you asked for your ${partnerName} member code at groundapp.live.`;
  const inner = [h1(`Hey ${esc(firstName)}, your spot is saved.`), ...body.map((s) => p(esc(s))), p('Collin')].join('\n');
  const html = shell({ partnerName, title: subject, preheader: 'Your code is coming as soon as the next batch is in.', inner, footer: footerFor(reason, mailingAddress) });
  const text = `Hey ${firstName}, your spot is saved.\n\n${body.join('\n\n')}\n\nCollin\n\n${footerText(reason, mailingAddress)}`;
  return { subject, html, text };
}

// To Collin. event: 'low_stock' | 'email_failed'.
export function renderAlertEmail({ partner, event, detail }) {
  const subject = `[GroundApp partners] ${partner}: ${event === 'low_stock' ? detail : 'an email failed to send'}`;
  const text = `Partner: ${partner}\nEvent: ${event}\n${detail}\n\nAdmin: ${SITE}/admin\n`;
  return { subject, html: `<pre style="font:14px/1.5 ui-monospace,Menlo,monospace;">${esc(text)}</pre>`, text };
}

// Returns { ok, id, error }. Never throws for a refused send, so callers can record the failure.
export async function sendEmail(env, { to, subject, html, text, idempotencyKey, tag, scheduledAt, headers }) {
  const reqHeaders = { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' };
  if (idempotencyKey) reqHeaders['idempotency-key'] = idempotencyKey;
  const payload = { from: env.WELCOME_FROM || FROM, to: [to], reply_to: REPLY_TO, subject, html, text, tags: [{ name: 'type', value: tag }] };
  if (scheduledAt) payload.scheduled_at = scheduledAt;
  if (headers) payload.headers = headers;
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload) });
  if (!res.ok) {
    const error = `${res.status} ${(await res.text()).slice(0, 200)}`;
    console.error('partner email failed', tag, error);
    return { ok: false, id: null, error };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, id: data.id || null, error: null };
}

// Cancels a scheduled reminder. Best effort.
export async function cancelEmail(env, id) {
  const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}` },
  });
  if (!res.ok) console.error('partner nudge cancel failed', res.status);
  return res.ok;
}
