// GroundApp welcome email. Sent once when someone joins the list on groundapp.live.
// Brand kit v5, night palette: Source Serif 4 headlines (Georgia fallback), Ground Font Type for everything
// else (system fallbacks). The web fonts load only where the mail app allows them. Copy is held as data so the
// HTML and plain-text parts always say the same thing.
import { APP_STORE_URL, SITE, escapeHtml } from './util.js';

export const WELCOME_SUBJECT = 'Welcome to GroundApp. Two breaths to try today';

// Night tokens from site/assets/css/ground-tokens-v1.css. Borders are the token's 15% muted, flattened to hex for email.
const C = {
  bg: '#1a110e',
  card: '#2d1e17',
  text: '#e8ddd0',
  text2: '#a89585',
  gold: '#c4935a',
  onGold: '#1a110e',
  line: '#3d2e26',
};
const SERIF = "'Source Serif 4',Georgia,'Times New Roman',serif";
const SANS = "'Ground Font Type',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const FONTS = `${SITE}/assets/fonts`;
const BODIE_IMG = `${SITE}/img/email/bodie-welcome-v1.jpg`;

const intro = [
  "Thanks for joining. I'm Collin, the breathwork coach behind GroundApp. Your breath is the one part of your nervous system you can steer on purpose, and you can start right now.",
  'Here are two breaths to try today. No app needed.',
];

const techniques = [
  {
    name: 'Physiological Sigh',
    pattern: '2 in, 1 more in, 6 out',
    intro: 'The quickest reset I know. Two breaths in through your nose, one long breath out.',
    steps: [
      'Breathe in through your nose for 2 seconds.',
      'At the top, sip in a little more air for 1 second.',
      'Let it all go through your mouth for 6 seconds.',
    ],
    tip: 'Do 3 to 5 in a row. It takes under a minute.',
  },
  {
    name: 'Box Breathing',
    pattern: '4 in, 4 hold, 4 out, 4 hold',
    intro: "Four equal sides. It's simple, it's quiet and you can do it anywhere. It's also one of the 4 techniques that stay free in GroundApp.",
    steps: [
      'Breathe in through your nose for 4 seconds.',
      'Hold at the top for 4 seconds.',
      'Breathe out slowly for 4 seconds.',
      'Hold at the bottom for 4 seconds.',
    ],
    tip: 'Repeat for 4 to 6 rounds. When it feels easy, stretch each side to 5 or 6 seconds.',
  },
];

const safety = 'If you have a heart, lung or other medical condition, check with your doctor before you start a new breathing practice. Stop if you feel dizzy or unwell.';

const app = {
  heading: 'Breathe with Bodie',
  body: [
    'When you want a guide, GroundApp is free to download. Bodie sits in the middle of Home and breathes along with your technique. Pick one and tap Start, or press and hold on Bodie and breathe with him.',
    'Not sure what you need? Check in with Bodie. Name how you feel and GroundApp matches a breath to it.',
  ],
  points: [
    'Free: 4 techniques that stay free forever (Box, Deep Slow Breathing, 2-to-1 and Triangle), the session timer, streaks and check-ins with Bodie.',
    'Premium: all 40+ techniques, guided sessions in my voice and the Advanced O2 and CO2 tables. $39.99 a year.',
    'Eligible new subscribers get a 3-day free trial.',
    "There's an Apple Watch app too, so you can practice on your wrist.",
  ],
  button: 'Get GroundApp on the App Store',
  note: 'Free to download. iPhone and Apple Watch.',
};

const reframe = {
  heading: 'Overwhelm is a signal, not a failure.',
  body: [
    "It means you care, and you're carrying more than one moment was built to hold.",
    "When it hits, your brain is trying to process everything at once. The fix isn't to push harder. Narrow your focus to a single breath. You don't need to solve everything right now. You just need this one inhale, this one exhale. The rest can wait. It always does.",
  ],
};

const outro = "Every so often I'll send a short note on breathwork and the nervous system. Reply anytime. It comes straight to me.";

const preheader = 'Two breaths you can do right now, no app needed. Plus how Bodie fits in.';

// Inline style pieces. Classes exist only for the mobile media query and the Outlook font fallback.
const esc = escapeHtml;
const pStyle = (size = 17, color = C.text2, margin = '0 0 16px') => `margin:${margin};font:400 ${size}px/1.65 ${SANS};color:${color};`;
const p = (text, opts = {}) => `<p class="t" style="${pStyle(opts.size, opts.color, opts.margin)}">${esc(text)}</p>`;
const h2 = (text) => `<h2 class="s" style="margin:0 0 16px;font:400 30px/1.15 ${SERIF};color:${C.text};">${esc(text)}</h2>`;
const rule = (gap) => `<div style="border-top:1px solid ${C.line};height:1px;line-height:1px;font-size:1px;margin:0 0 ${gap}px;">&nbsp;</div>`;
const section = (inner, { top = false, pad = '0 32px 16px' } = {}) =>
  `<tr><td class="pad" style="padding:${pad};">${top ? rule(32) : ''}${inner}</td></tr>`;

function techniqueHtml(t) {
  const steps = t.steps
    .map((s, i) => `<tr><td class="t" width="24" valign="top" style="padding:0 0 8px;font:500 15px/1.6 ${SANS};color:${C.gold};font-variant-numeric:tabular-nums;">${i + 1}</td><td class="t" style="padding:0 0 8px;font:400 15px/1.6 ${SANS};color:${C.text};">${esc(s)}</td></tr>`)
    .join('');
  return section(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:12px;">
      <tr><td class="card" style="padding:24px 24px 20px;">
        <h3 class="t" style="margin:0 0 4px;font:500 22px/1.25 ${SANS};color:${C.text};">${esc(t.name)}</h3>
        <p class="t" style="margin:0 0 14px;font:500 14px/1.4 ${SANS};color:${C.gold};font-variant-numeric:tabular-nums;">${esc(t.pattern)}</p>
        ${p(t.intro, { size: 15, margin: '0 0 14px' })}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps}</table>
        ${p(t.tip, { size: 15, margin: '6px 0 0' })}
      </td></tr>
    </table>`);
}

function pointsHtml(points) {
  const rows = points
    .map((s) => `<tr><td width="19" valign="top" style="padding:10px 0 0;"><div style="width:7px;height:7px;border-radius:50%;background:${C.gold};font-size:1px;line-height:1px;">&nbsp;</div></td><td class="t" style="padding:0 0 10px;font:400 16px/1.6 ${SANS};color:${C.text2};">${esc(s).replace(/2-to-1/g, '<span style="white-space:nowrap;">2-to-1</span>')}</td></tr>`)
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">${rows}</table>`;
}

function buttonHtml(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="btn-td" align="center" bgcolor="${C.gold}" style="border-radius:14px;background:${C.gold};">
        <a class="btn-a t" href="${esc(href)}" style="display:inline-block;padding:16px 32px;font:600 16px/1.2 ${SANS};color:${C.onGold};text-decoration:none;border-radius:14px;">${esc(label)}</a>
      </td></tr></table>`;
}

export function renderWelcome({ firstName, unsubUrl, mailingAddress }) {
  const greeting = firstName ? `Hey ${firstName},` : 'Hey there,';
  const footerLine = 'GroundApp by Collin Chartier Coaching';

  const htmlBody = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>Welcome to GroundApp</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  @media screen {
    @font-face { font-family:'Source Serif 4'; src:url('${FONTS}/source-serif-4-latin-v1.woff2') format('woff2'); font-weight:200 900; font-style:normal; }
    @font-face { font-family:'Ground Font Type'; src:url('${FONTS}/ground-font-type-v1.woff2') format('woff2'); font-weight:100 900; font-style:normal; }
  }
  body{margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;}
  a{color:${C.gold};}
  @media only screen and (max-width:600px){
    .container{width:100%!important;}
    .pad{padding-left:20px!important;padding-right:20px!important;}
    .card{padding:20px 18px 16px!important;}
    .outer{padding-left:0!important;padding-right:0!important;}
    .h1{font-size:32px!important;}
  }
</style>
<!--[if mso]><style>.t{font-family:Arial,Helvetica,sans-serif!important;} .s{font-family:Georgia,serif!important;} .btn-a{padding:0!important;} .btn-td{padding:16px 32px!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg};">
<tr><td class="outer" align="center" style="padding:24px 12px 32px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

  <tr><td class="pad" align="center" style="padding:8px 32px 0;">
    <img src="${BODIE_IMG}" width="320" height="240" alt="Bodie, the GroundApp breathing companion, sitting on his mat" style="display:block;width:320px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;color:${C.text2};font:400 14px ${SANS};">
  </td></tr>
  <tr><td class="pad" align="center" style="padding:12px 32px 32px;">
    <h1 class="s h1" style="margin:0;font:400 38px/1.1 ${SERIF};color:${C.text};">Welcome to GroundApp.</h1>
  </td></tr>

  ${section(`<p class="t" style="margin:0 0 16px;font:500 17px/1.65 ${SANS};color:${C.text};">${esc(greeting)}</p>${intro.map((t) => p(t)).join('')}`, { pad: '0 32px 8px' })}

  ${techniques.map(techniqueHtml).join('')}

  ${section(p(safety, { size: 14, margin: '4px 0 0' }), { pad: '0 32px 40px' })}

  ${section(`${h2(app.heading)}${app.body.map((t) => p(t)).join('')}${pointsHtml(app.points)}${buttonHtml(APP_STORE_URL, app.button)}${p(app.note, { size: 14, margin: '12px 0 0' })}`, { top: true, pad: '0 32px 40px' })}

  ${section(`${h2(reframe.heading)}${reframe.body.map((t) => p(t)).join('')}`, { top: true, pad: '0 32px 24px' })}

  ${section(`${p(outro)}<p class="t" style="${pStyle(17, C.text, '0')}">Breathe easy,<br>Collin</p>`, { pad: '0 32px 40px' })}

  <tr><td class="pad" style="padding:0 32px 8px;">
    ${rule(20)}
    <p class="t" style="margin:0;font:400 13px/1.6 ${SANS};color:${C.text2};">You're getting this because you signed up at <a href="${SITE}" style="color:${C.text2};">groundapp.live</a>. Not for you? <a href="${esc(unsubUrl)}" style="color:${C.text2};">Unsubscribe</a>.<br>${footerLine}${mailingAddress ? `<br>${esc(mailingAddress)}` : ''}</p>
  </td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body></html>`;

  const techniqueText = (t) => `${t.name}\n${t.pattern}\n${t.intro}\n\n${t.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${t.tip}`;
  const text = `Welcome to GroundApp.

${greeting}

${intro.join('\n\n')}

${techniques.map(techniqueText).join('\n\n\n')}

${safety}


${app.heading}

${app.body.join('\n\n')}

${app.points.map((s) => `- ${s}`).join('\n')}

${app.button}: ${APP_STORE_URL}
${app.note}


${reframe.heading}

${reframe.body.join('\n\n')}

${outro}

Breathe easy,
Collin

---
You're getting this because you signed up at groundapp.live.
Unsubscribe: ${unsubUrl}
${footerLine}${mailingAddress ? `\n${mailingAddress}` : ''}
`;

  return { subject: WELCOME_SUBJECT, html: htmlBody, text };
}
