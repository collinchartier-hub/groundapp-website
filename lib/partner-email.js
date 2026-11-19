// Partner claim, follow-up, waitlist, and admin alert emails.
// Copy is held as data so the HTML and plain-text parts always say the same thing.
// Frame: the partner page's black, with the letter on GroundApp's warm card (brand kit v5 night tokens).
import { SITE, escapeHtml as esc } from './util.js';

const FROM = 'Collin Chartier <collin@groundapp.live>';
const REPLY_TO = 'collin@groundapp.live';

const C = { page: '#000000', card: '#2d1e17', text: '#e8ddd0', text2: '#a89585', gold: '#c4935a', onGold: '#1a110e', line: '#3d2e26', frameText: '#9ca3af', lockup: '#fafafa', cyan: '#1fcaf4' };
const SERIF = "'Source Serif 4',Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const RENEWAL = 'Free for 12 months, then $39.99 a year unless you cancel. Cancel any time in Settings > your name > Subscriptions. iPhone only.';

// The lockup is text so it shows with images off; uppercase styling keeps Arsenal's HTML unchanged.
function shell({ title, preheader, inner, footer, partner }) {
  const lockupText = partner.lockup === partner.name.toUpperCase() ? partner.name : partner.lockup;
  const lockup = partner
    ? `<tr><td align="center" style="padding:0 8px 20px;font:700 13px/1.4 ${SANS};letter-spacing:2px;color:${C.lockup};"><span style="text-transform:uppercase;">${esc(lockupText)}</span> <span style="color:${C.cyan};">&times;</span> GroundApp</td></tr>`
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

export function renderClaimEmail({ partner, firstName, link, mailingAddress }) {
  const subject = `Your free year of GroundApp, from ${partner.short} and Collin`;
  const body = [
    "I'm Collin. I coach breathwork for performance. I'm an IRONMAN champion, I won the PTO US Open and I raced for Team USA.",
    'I built GroundApp because your breath is the one part of your nervous system you can steer on purpose. You check in with Bodie, name how you feel, and GroundApp matches breathwork to it.',
    partner.emailLine,
  ];
  const steps = [
    'Tap the button on your iPhone.',
    "Confirm in the App Store. If you don't have GroundApp yet, it installs first.",
    'Open GroundApp and check in with Bodie.',
  ];
  const cta = 'Get my free year';
  const reason = `You're getting this because you asked for your ${partner.name} member code at groundapp.live.`;
  const inner = [
    h1(`Hey ${esc(firstName)}, your year is ready.`),
    ...body.map((s) => p(esc(s))),
    button(cta, link),
    small("Tap it on your iPhone. The App Store opens with your code filled in. It's yours alone and works once."),
    small('On a computer? The button opens a page with a QR code for your iPhone.'),
    `<ol style="margin:0 0 20px;padding-left:22px;font:400 16px/1.6 ${SANS};color:${C.text};">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`,
    small(esc(RENEWAL)),
    p('Breathe easy,<br>Collin'),
  ].join('\n');
  const html = shell({ partner, title: subject, preheader: 'Your own link is inside. Tap it on your iPhone.', inner, footer: footerFor(reason, mailingAddress) });
  const text = `Hey ${firstName}, your year is ready.

${body.join('\n\n')}

${cta}: ${link}
Tap it on your iPhone. The App Store opens with your code filled in. It's yours alone and works once.
On a computer? The button opens a page with a QR code for your iPhone.

${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${RENEWAL}

Breathe easy,
Collin

${footerText(reason, mailingAddress)}`;
  return { subject, html, text };
}

const FOLLOWUP_REASON = (partner) => `You're getting this one note because you asked for your ${partner.name} member code at groundapp.live.`;

export function renderReminderEmail({ partner, firstName, link, unsubUrl, mailingAddress }) {
  const subject = 'Your free year of GroundApp is ready';
  const heading = `Hey ${firstName}, one tap on your iPhone.`;
  const body = [
    `Your free year of GroundApp Premium from ${partner.name} is ready. Tap the button on your iPhone and the App Store opens with your code filled in.`,
    'Already in? Open GroundApp, tap Check in on Home and tell Bodie how you feel.',
  ];
  const cta = 'Get my free year';
  const inner = [h1(esc(heading)), ...body.map((s) => p(esc(s))), button(cta, link), small(esc(RENEWAL)), p('Collin')].join('\n');
  const html = shell({ partner, title: subject, preheader: `Your free year from ${partner.name} is ready. One tap on your iPhone.`, inner, footer: footerFor(FOLLOWUP_REASON(partner), mailingAddress, unsubUrl) });
  const text = `${heading}\n\n${body.join('\n\n')}\n\n${cta}: ${link}\n\n${RENEWAL}\n\nCollin\n\n${footerText(FOLLOWUP_REASON(partner), mailingAddress, unsubUrl)}`;
  return { subject, html, text };
}

export function renderWelcomeEmail({ partner, firstName, unsubUrl, mailingAddress }) {
  const subject = 'One breath-hold table to try in GroundApp';
  const heading = `Hey ${firstName}, here's one to try.`;
  const intro = `Your year of GroundApp Premium from ${partner.name} includes the Advanced tables. O2 and CO2 tables are the classic breath-hold training tables from freediving. Here's a simple O2 table to try.`;
  const title = 'Your first O2 table';
  const pattern = '6 rounds. Longer holds, same rest.';
  const steps = [
    'In the Library, open Advanced, then O2 tables.',
    "Pick Full lungs, then Enter a recent time: a comfortable hold you already know, timed after normal breathing. Don't push to your limit.",
    'Choose 50%, 6 holds and a 2:00 rest. Tap Preview to see every hold.',
    "Tap Begin. GroundApp asks a few readiness questions first. Start each hold when you're ready and breathe normally in every rest. The hold gets a little longer each round and the rest stays the same. Stop any time.",
  ];
  const safety = 'Dry land only. Never in or near water.';
  const caution = "Seated or lying down, with an attentive person nearby who knows what you're doing, can see you and will act if something looks wrong. Breathe normally to get ready: no fast, deep or forced breathing, no extra gulps. Stop if you feel dizzy or unwell.";
  const clinician = "Talk with a clinician who knows breath-hold activity first if you have a history of seizures or epilepsy, fainting or blackouts, a heart or lung condition, or are pregnant or take medication. If you're unwell, tired, stressed or unsure, skip it today.";
  const sectionTitle = 'Apple Health and live heart rate';
  const health = [
    'Turn on Apple Health (Profile > Health and devices) and GroundApp reads your heart rate, HRV, sleep, steps and active energy to suggest the right breathwork for today.',
    'For live numbers, tap the heart button in the player and connect a Bluetooth heart rate monitor, or a Whoop or Garmin with heart rate broadcast on. HRV needs beat-to-beat data.',
  ];
  const disclaimer = 'Readings inform suggestions. They are not a medical assessment.';
  const url = 'https://apps.apple.com/app/apple-store/id6760352779?pt=128638571&ct=partner-welcome&mt=8';
  const outro = 'Questions? Reply to this email. It comes straight to me.';
  const rows = steps.map((s, i) => `<tr><td valign="top" width="24" style="padding:0 0 8px;font:500 15px/1.6 ${SANS};color:${C.gold};">${i + 1}</td><td style="padding:0 0 8px;font:400 15px/1.6 ${SANS};color:${C.text};">${esc(s)}</td></tr>`).join('');
  const card = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${C.page};border:1px solid ${C.line};border-radius:12px;"><tr><td style="padding:24px 24px 20px;"><h2 style="margin:0 0 4px;font:500 22px/1.25 ${SANS};color:${C.text};">${esc(title)}</h2><p style="margin:0 0 14px;font:500 14px/1.4 ${SANS};color:${C.gold};">${esc(pattern)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${small(esc(safety))}${small(esc(caution))}${small(esc(clinician))}</td></tr></table>`;
  const inner = [h1(esc(heading)), p(esc(intro)), card, `<h2 style="margin:0 0 16px;font:400 24px/1.25 ${SERIF};color:${C.text};">${esc(sectionTitle)}</h2>`, ...health.map((s) => p(esc(s))), small(esc(disclaimer)), button('Open GroundApp', url), p(esc(outro)), p('Breathe easy,<br>Collin')].join('\n');
  const html = shell({ partner, title: subject, preheader: 'A classic O2 table to try, plus Apple Health and live heart rate.', inner, footer: footerFor(FOLLOWUP_REASON(partner), mailingAddress, unsubUrl) });
  const text = `${heading}\n\n${intro}\n\nYOUR FIRST O2 TABLE\n${pattern}\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${safety}\n${caution}\n${clinician}\n\nAPPLE HEALTH AND LIVE HEART RATE\n\n${health.join('\n\n')}\n\n${disclaimer}\n\nOpen GroundApp: ${url}\n\n${outro}\n\nBreathe easy,\nCollin\n\n${footerText(FOLLOWUP_REASON(partner), mailingAddress, unsubUrl)}`;
  return { subject, html, text };
}

export function renderAndroidEmail({ partner, firstName, mailingAddress }) {
  const subject = "GroundApp on Android: you're on the list";
  const body = [
    'GroundApp is iPhone only right now, so I can\'t send you a code yet.',
    `You're on the list as a ${partner.name} member. I'll email you when the Android app is ready.`,
  ];
  const reason = `You're getting this because you signed up as a ${partner.name} member at groundapp.live.`;
  const inner = [h1(`Hey ${esc(firstName)}, thanks for raising your hand.`), ...body.map((s) => p(esc(s))), p('Collin')].join('\n');
  const html = shell({ partner, title: subject, preheader: "I'll email you when Android is ready.", inner, footer: footerFor(reason, mailingAddress) });
  const text = `Hey ${firstName}, thanks for raising your hand.\n\n${body.join('\n\n')}\n\nCollin\n\n${footerText(reason, mailingAddress)}`;
  return { subject, html, text };
}

export function renderWaitlistEmail({ partner, firstName, mailingAddress }) {
  const subject = "You're on the list for your GroundApp code";
  const body = [
    `The ${partner.name} member codes are being restocked.`,
    'Your spot is saved. Your own link will land in this inbox as soon as the next batch is in.',
  ];
  const reason = `You're getting this because you asked for your ${partner.name} member code at groundapp.live.`;
  const inner = [h1(`Hey ${esc(firstName)}, your spot is saved.`), ...body.map((s) => p(esc(s))), p('Collin')].join('\n');
  const html = shell({ partner, title: subject, preheader: 'Your link is coming as soon as the next batch is in.', inner, footer: footerFor(reason, mailingAddress) });
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
export async function sendEmail(env, { to, subject, html, text, idempotencyKey, tag, headers }) {
  const reqHeaders = { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' };
  if (idempotencyKey) reqHeaders['idempotency-key'] = idempotencyKey;
  const payload = { from: env.WELCOME_FROM || FROM, to: [to], reply_to: REPLY_TO, subject, html, text, tags: [{ name: 'type', value: tag }] };
  if (headers) payload.headers = headers;
  try {
    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload) });
    if (!res.ok) {
      const error = `${res.status} ${(await res.text()).slice(0, 200)}`;
      console.error('partner email failed', tag, error);
      return { ok: false, id: null, error };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, id: data.id || null, error: null };
  } catch (err) {
    const error = `network ${err?.message || err}`;
    console.error('partner email failed', tag, error);
    return { ok: false, id: null, error };
  }
}

