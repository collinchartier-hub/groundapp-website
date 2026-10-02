// GroundApp welcome email. Sent once when someone joins the list on groundapp.live.
import { APP_STORE_URL, SITE, escapeHtml } from './util.js';

export const WELCOME_SUBJECT = 'Welcome to GroundApp. Two breaths for today';

const C = { bg: '#1A110E', card: '#241915', text: '#E8DDD0', muted: '#A89585', gold: '#C4935A', line: '#3A2B24' };
const SERIF = "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const techniques = [
  {
    label: 'Technique 01 · Centering',
    name: 'Vortex Breath',
    intro: 'Created by breathwork coach Nick Sweeney, the Vortex Breath runs the Fibonacci sequence in reverse. Each round gets shorter, which draws your attention inward and settles you into a centered, steady state.',
    steps: [
      'Sit upright, hands on your knees, eyes closed.',
      'Inhale and exhale for 13 seconds each.',
      'Then 8 seconds each, then 5, then 3, then 2, then 1.',
      'After the last 1 second exhale, hold for 13 seconds and rest in the stillness.',
    ],
    tip: "Let the shorter breaths be shallower. Don't force full lungs. The spiral pulls you in on its own.",
  },
  {
    label: 'Technique 02 · Balancing',
    name: 'Box Breathing',
    intro: 'Navy SEALs use it to stay calm under pressure. Four equal sides: inhale, hold, exhale, hold. Simple, portable, and it works anywhere.',
    steps: [
      'Inhale through your nose for 4 seconds.',
      'Hold at the top for 4 seconds.',
      'Exhale slowly for 4 seconds.',
      'Hold at the bottom for 4 seconds.',
    ],
    tip: 'Repeat 4 to 6 rounds. As it gets easy, stretch each side to 5 or 6 seconds.',
  },
];

function techniqueHtml(t) {
  const steps = t.steps
    .map((s, i) => `<tr><td valign="top" style="padding:0 10px 8px 0;font:600 14px ${SANS};color:${C.gold};">${i + 1}.</td><td style="padding:0 0 8px;font:15px/1.55 ${SANS};color:${C.text};">${s}</td></tr>`)
    .join('');
  return `
  <tr><td style="padding:0 32px 28px;" class="pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.line};border-radius:14px;">
      <tr><td style="padding:24px 24px 8px;">
        <div style="font:600 11px ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.gold};">${t.label}</div>
        <div style="font:400 24px/1.25 ${SERIF};color:${C.text};padding:8px 0 10px;">${t.name}</div>
        <div style="font:15px/1.6 ${SANS};color:${C.muted};padding-bottom:16px;">${t.intro}</div>
        <div style="font:600 11px ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.muted};padding-bottom:10px;">How to do it</div>
        <table role="presentation" cellpadding="0" cellspacing="0">${steps}</table>
        <div style="font:italic 14px/1.55 ${SANS};color:${C.muted};padding:8px 0 20px;">${t.tip}</div>
      </td></tr>
    </table>
  </td></tr>`;
}

function techniqueText(t) {
  return `${t.label.toUpperCase()}\n${t.name}\n${t.intro}\n\n${t.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${t.tip}`;
}

export function renderWelcome({ firstName, unsubUrl, mailingAddress }) {
  const greeting = firstName ? `Hey ${escapeHtml(firstName)},` : 'Hey there,';
  const address = mailingAddress ? `<br>${escapeHtml(mailingAddress)}` : '';
  const preheader = 'Two techniques you can use right now. No app needed.';

  const htmlBody = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>Welcome to GroundApp</title>
<style>
  body{margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;}
  a{color:${C.gold};}
  @media only screen and (max-width:600px){ .container{width:100%!important;} .pad{padding-left:20px!important;padding-right:20px!important;} }
</style></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">

  <tr><td align="center" style="padding:8px 32px 28px;" class="pad">
    <div style="font:400 26px ${SERIF};color:${C.gold};letter-spacing:.02em;">GroundApp</div>
    <div style="font:600 11px ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.muted};padding-top:6px;">Breathe with intention</div>
  </td></tr>

  <tr><td style="padding:0 32px 24px;" class="pad">
    <div style="font:400 30px/1.25 ${SERIF};color:${C.text};padding-bottom:16px;">${greeting}</div>
    <div style="font:16px/1.65 ${SANS};color:${C.text};">Thanks for joining. I'm Collin, the breathwork coach behind GroundApp. Your breath is the one part of your nervous system you can steer on purpose, and you can start today.</div>
    <div style="font:16px/1.65 ${SANS};color:${C.text};padding-top:14px;">Here are two techniques to try. No app needed.</div>
  </td></tr>

  ${techniques.map(techniqueHtml).join('')}

  <tr><td style="padding:4px 32px 28px;" class="pad">
    <div style="font:400 22px/1.3 ${SERIF};color:${C.text};padding-bottom:10px;">Want me in your ear?</div>
    <div style="font:16px/1.65 ${SANS};color:${C.text};padding-bottom:20px;">GroundApp has 35 breathing techniques and guided sessions narrated in my voice, plus a quick check-in that matches a breath to how you feel. Four techniques are free forever. Premium is $29.99 a year.</div>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${C.gold};">
      <a href="${APP_STORE_URL}" style="display:inline-block;padding:14px 28px;font:600 15px ${SANS};color:${C.bg};text-decoration:none;border-radius:999px;">Get GroundApp on the App Store</a>
    </td></tr></table>
  </td></tr>

  <tr><td style="padding:0 32px 28px;" class="pad">
    <div style="border-top:1px solid ${C.line};padding-top:24px;font:400 20px/1.3 ${SERIF};color:${C.text};padding-bottom:10px;">A reframe for overwhelm</div>
    <div style="font:16px/1.65 ${SANS};color:${C.text};">Overwhelm isn't a sign you're failing. It's a signal that you care and you're carrying more than one moment was built to hold.</div>
    <div style="font:16px/1.65 ${SANS};color:${C.text};padding-top:14px;">When it hits, your brain is trying to process everything at once. The fix isn't to push harder. It's to narrow your focus to a single breath. You don't need to solve everything right now. You just need this one inhale, this one exhale. The rest can wait. It always does.</div>
  </td></tr>

  <tr><td style="padding:0 32px 32px;" class="pad">
    <div style="font:16px/1.65 ${SANS};color:${C.text};">Every so often I'll send a short note on breathwork and the nervous system. Reply anytime. It comes straight to me.</div>
    <div style="font:16px/1.65 ${SANS};color:${C.text};padding-top:14px;">Breathe easy,<br>Collin</div>
  </td></tr>

  <tr><td style="padding:20px 32px 8px;border-top:1px solid ${C.line};" class="pad">
    <div style="font:12px/1.6 ${SANS};color:${C.muted};">You're getting this because you signed up at <a href="${SITE}" style="color:${C.muted};">groundapp.live</a>. Not for you? <a href="${unsubUrl}" style="color:${C.muted};">Unsubscribe</a>.<br>GroundApp by Collin Chartier${address}</div>
  </td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body></html>`;

  const text = `${firstName ? `Hey ${firstName},` : 'Hey there,'}

Thanks for joining. I'm Collin, the breathwork coach behind GroundApp. Your breath is the one part of your nervous system you can steer on purpose, and you can start today.

Here are two techniques to try. No app needed.

${techniques.map(techniqueText).join('\n\n')}

WANT ME IN YOUR EAR?
GroundApp has 35 breathing techniques and guided sessions narrated in my voice, plus a quick check-in that matches a breath to how you feel. Four techniques are free forever. Premium is $29.99 a year.
${APP_STORE_URL}

A REFRAME FOR OVERWHELM
Overwhelm isn't a sign you're failing. It's a signal that you care and you're carrying more than one moment was built to hold.

When it hits, your brain is trying to process everything at once. The fix isn't to push harder. It's to narrow your focus to a single breath. You don't need to solve everything right now. You just need this one inhale, this one exhale. The rest can wait. It always does.

Every so often I'll send a short note on breathwork and the nervous system. Reply anytime. It comes straight to me.

Breathe easy,
Collin

---
You're getting this because you signed up at groundapp.live.
Unsubscribe: ${unsubUrl}
GroundApp by Collin Chartier${mailingAddress ? `\n${mailingAddress}` : ''}
`;

  return { subject: WELCOME_SUBJECT, html: htmlBody, text };
}
