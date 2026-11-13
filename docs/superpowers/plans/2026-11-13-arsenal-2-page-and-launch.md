# Arsenal Partner Codes, Part 2: Page, Copy, Admin Panel and Launch Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The public page at `groundapp.live/arsenal`, the final email look and words, the Partners panel on `/admin`, the kit Arsenal promotes it with, and the checks that take it live.

**Architecture:** A static page in `site/arsenal/` posts the form to `POST /api/partner/claim` (Part 1). The design is layout A with the letter card (`docs/arsenal/layout-options-2026-11-13.html`), Arsenal's look below the hero. Design and copy are produced from briefs into files in `docs/arsenal/`, then built from those files.

**Tech Stack:** Hand-written HTML, CSS and ES5-style JS as in the rest of `site/` (no build step, no framework), Cloudflare Turnstile widget, `qrcode-generator` 1.4.4 (MIT) vendored for the QR code.

**Spec:** `docs/superpowers/specs/2026-11-13-arsenal-partner-page-design.md`. **Depends on:** `docs/superpowers/plans/2026-11-13-arsenal-1-server.md` Tasks 1 to 8 merged into this branch (Task 9 before Task 10 here).

**A note on this plan's shape.** Tasks 3, 4 and 5 are design and writing. Their output cannot be written in advance, so those tasks are briefs with acceptance criteria and fixed file formats. Every task that is code (6 to 9) carries its code in full.

**Status, 2026-11-13.** Collin asked for a preview before the build, so parts of Tasks 2, 4 and 5 already exist on this branch: the measured tokens (`docs/arsenal/arsenal-tokens.md`), and a static first build of `site/arsenal/index.html` and `site/assets/css/arsenal-v1.css` with draft copy, Arsenal's photos in `site/img/arsenal/` (sources in `docs/arsenal/photo-sources.md`) and a preview-only inline script in place of `arsenal-v1.js`. His feedback on it is in the spec's Decisions table (the fade, Arsenal's photos, GroundApp's own site design on its side). Tasks 4 and 5 now mean: finish that build against the approved copy, write `docs/arsenal/DESIGN.md` from it, and make `og.jpg`. Task 6 replaces the preview-only script.

**Rules for every task (from `AGENTS.md`):** worktree `~/dev/groundapp-website-arsenal`, branch `arsenal`; no push and no deploy by subagents; nothing private in `site/`; copy has no em dashes, is casual and direct, spells it GroundApp, makes no free-trial claim, and says Premium is $39.99 a year. `DESIGN-BANS.md` applies to GroundApp-styled parts.

**Who does what** (per Collin's routing rules; `jev_choice` confirms each before dispatch):

| Task | Agent |
|---|---|
| 1, 2, 10, 11 | orchestrator (needs Collin, the browser, the laptop) |
| 3 | `writer` |
| 4 | `designer` |
| 5, 6, 8, 9 | `task` (web front end; no specialist row covers it), reviewed by `cross-reviewer` |
| 7 | `task`, with copy from Task 3 and the frame from Task 4 |

## File map

| File | Responsibility |
|---|---|
| `docs/arsenal/arsenal-tokens.md` (create) | Arsenal's colours, type, radii and spacing as measured from arsenalhealth.com |
| `docs/arsenal/copy.md` (create) | Every word on the page, in the emails and in the kit, approved by Collin |
| `docs/arsenal/DESIGN.md` (create) | The page and email design at full detail |
| `docs/arsenal/kit.md` (create) | What Collin sends Arsenal: member email, two captions, links |
| `site/arsenal/index.html` (create) | The page |
| `site/assets/css/arsenal-v1.css` (create) | Its styles, plus the `ax-redeem` styles for the member-link page |
| `site/assets/js/arsenal-v1.js` (create) | Form behaviour |
| `site/assets/js/arsenal-qr-v1.js` (create) | QR code on the member-link page |
| `site/img/arsenal/` (create) | Wordmark, training still, app screen, `og.jpg` |
| `lib/partner-email.js` (modify) | Final words and frame |
| `site/admin/index.html` (modify) | Partners panel |
| `site/privacy.html` (modify) | One paragraph on partner claims |

---

### Task 1: Inputs only Collin and Arsenal can give (orchestrator)

Nothing below can go live without these. Start them first; Tasks 3 to 9 do not wait for them except where noted.

- [ ] **Step 1: Ask Collin which clips show him**

The candidate clips: `~/Desktop/Desktop-Archive/Arsenal 10:24/IMG_7453.MOV` to `IMG_7456.MOV` (6 files) and `~/Desktop/David Riggs Coaching/David Riggs Video Arsenal /IMG_7740.MOV` to `IMG_7748.MOV`, `IMG_9470.MOV`, `IMG_9472.MOV`, `IMG_9484.MOV`, `IMG_9487.MOV`. Send him a contact sheet:

```bash
mkdir -p /tmp/arsenal-stills && cd /tmp/arsenal-stills && i=0
for f in ~/Desktop/Desktop-Archive/"Arsenal 10:24"/*.MOV ~/Desktop/"David Riggs Coaching/David Riggs Video Arsenal "/IMG_77*.MOV ~/Desktop/"David Riggs Coaching/David Riggs Video Arsenal "/IMG_94*.MOV; do
  i=$((i+1)); d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  ffmpeg -v error -ss "$(echo "$d*0.5" | bc -l)" -i "$f" -frames:v 1 -vf "scale=-2:480" -y "$(printf '%02d' $i)-$(basename "$f" .MOV | tr ' ' '_').jpg"
done
magick montage *.jpg -tile 6x -geometry +4+4 -label '%f' sheet.jpg
```

Expected: `/tmp/arsenal-stills/sheet.jpg` with one labelled frame per clip. Record his answer (file names) in `docs/arsenal/DESIGN.md` under "Photo" in Task 4.

- [ ] **Step 2: Ask Collin to get Arsenal's sign-off and logo**

He needs from Arsenal, in writing: agreement that groundapp.live/arsenal uses Arsenal Health's name, wordmark and visual style; the white wordmark as SVG or a PNG at least 1200px wide; whether "DTC" or "DTC (Englewood)" is the label members know. Save the logo as `site/img/arsenal/arsenal-health-wordmark-white.svg` (or `.png`). Until it arrives, build with the lockup set as text; do not hotlink or copy the file from arsenalhealth.com.

- [ ] **Step 3: Ask Collin to read the offer's eligibility**

App Store Connect > GroundApp > Subscriptions > GroundApp Premium > Offer Codes > the free-year offer > Customer Eligibility. Record the answer in the spec's "Facts" section. If it is new subscribers only, add this line to `docs/arsenal/copy.md` under `fine_print`: "The code works for people who haven't had GroundApp Premium before." and tell Collin that returning subscribers will be refused by Apple.

---

### Task 2: Measure Arsenal's look (orchestrator). Done 2026-11-13: `docs/arsenal/arsenal-tokens.md`, cyan is `#1FCAF4`

**Files:**
- Create: `docs/arsenal/arsenal-tokens.md`

- [x] **Step 1: Read computed styles from the live site**

Open `https://www.arsenalhealth.com/` in the built-in browser at 1440 wide and at 390 wide and read `getComputedStyle` for: `body` (background, color, font-family), the hero `h1` (font-size, weight, line-height, letter-spacing), the accent word inside it (color), the primary button (background, color, border-radius, padding, font-weight, font-size), the outlined button (border), a section eyebrow (font-size, letter-spacing, color, text-transform), a photo card (border-radius), the stat numbers (font-size, weight, color), the container width and the vertical padding of two sections.

- [x] **Step 2: Write them down**

Create `docs/arsenal/arsenal-tokens.md` with one table: token name, value at 1440, value at 390, where it was read. Use these names so the CSS can adopt them directly: `--ax-bg`, `--ax-text`, `--ax-text-2`, `--ax-cyan`, `--ax-border`, `--ax-font`, `--ax-h1-size`, `--ax-h1-weight`, `--ax-h1-leading`, `--ax-h1-tracking`, `--ax-btn-radius`, `--ax-btn-pad`, `--ax-eyebrow-size`, `--ax-eyebrow-tracking`, `--ax-card-radius`, `--ax-container`, `--ax-section-pad`. Confirm or correct `--ax-cyan` against `#16B8EA` (taken from Arsenal's logo mark).

- [x] **Step 3: Commit**

```bash
git add docs/arsenal/arsenal-tokens.md
git commit -m "Arsenal page: measured tokens from arsenalhealth.com"
```

---

### Task 3: The words (`writer`)

**Files:**
- Create: `docs/arsenal/copy.md`, `docs/arsenal/kit.md`

- [ ] **Step 1: Read the voice**

Read, in this order: `~/Desktop/Desktop-Archive/Ground Brand Kit/` (voice and tone files), `docs/site-v3/copy.md` (the live site's words, including Collin's story), `lib/welcome.js` (how Collin writes an email), the "Copy" and "The page" sections of the spec, and the working drafts in `lib/partner-email.js`.

- [ ] **Step 2: Write `docs/arsenal/copy.md`**

Use exactly these second-level headings and keys, each followed by the text, so the build tasks can lift them without interpretation:

```markdown
## hero
arsenal_half: (the words on Arsenal's half; default "Arsenal members get")
ground_half: (default "a free year of GroundApp Premium.")
button: (default "Claim your free year")
under_button: (one line, includes "iPhone only")

## letter
eyebrow:
heading:
body: (3 to 5 short paragraphs, first person: who Collin is, what he stands for, why he built GroundApp for performance and nervous system regulation, why Arsenal)
signoff:
photo_alt:

## what_you_get
heading:
points: (exactly 5, one line each, each true of the shipped app)
screen_alt:

## how_it_works
heading:
steps: (exactly 3)

## form
heading:
labels: first_name, last_name, email, device (iPhone / Android), location, member, newsletter
button:
under_button:
messages: assigned, existing, android, waitlist, invalid_first_name, invalid_last_name, invalid_email, invalid_device, invalid_location, invalid_member, bot_check, rate_limited, email, server

## fine_print
(one paragraph; must contain "Free for 12 months, then $39.99 a year unless you cancel.")

## redeem_page
open_on_iphone_heading, open_on_iphone_body, manual_path, waitlist_heading, waitlist_body, not_found_heading, not_found_body

## email_claim
subject, preheader, heading, body (3 paragraphs), button, under_button, code_label, steps (3), signoff

## email_nudge
subject, preheader, heading, body (2 paragraphs), button

## email_android
subject, preheader, heading, body (2 paragraphs)

## email_waitlist
subject, preheader, heading, body (2 paragraphs)

## privacy_paragraph
(for site/privacy.html: what a partner claim collects, why, and that it is not shared with the partner)
```

Facts allowed about Collin: performance breathwork coach; IRONMAN champion; PTO US Open winner; Team USA athlete; ran 2,000 miles from Boulder to the Lincoln Memorial for the Herren Project; created and developed GroundApp. Facts allowed about the app are those in `site/llms.txt`. Facts allowed about Arsenal are those on arsenalhealth.com (clinic, gym and recovery under one roof in Arvada and DTC; cold plunge, sauna, red light). Invent nothing else.

- [ ] **Step 3: Write `docs/arsenal/kit.md`**

Contents: an email for Arsenal to send its members (subject, preheader, about 120 words, one link `https://groundapp.live/arsenal?src=email`, written in Arsenal's voice as on their site, with a short quote from Collin); two Instagram captions (one for Arsenal's account, one for Collin's), link `https://groundapp.live/arsenal?src=ig`; a one-line text for the front desk; and a list of the files Arsenal receives (`og.jpg`).

- [ ] **Step 4: Check the rules mechanically**

Run: `rg -n '\x{2014}|free trial|Ground App\b' docs/arsenal/copy.md docs/arsenal/kit.md; echo "exit $?"`
Expected: `exit 1` (no matches). Then: `rg -c '39\.99 a year unless you cancel' docs/arsenal/copy.md` prints at least `1`.

- [ ] **Step 5: Commit, then Collin reads it**

```bash
git add docs/arsenal/copy.md docs/arsenal/kit.md
git commit -m "Arsenal page: copy and partner kit drafts"
```

The orchestrator sends both files to Collin. His edits are applied and committed before Task 7 and Task 10.

---

### Task 4: The design (`designer`)

**Files:**
- Create: `docs/arsenal/DESIGN.md`, `site/img/arsenal/og.jpg`, `site/img/arsenal/collin-training.jpg` (plus `-390.webp`, `-1440.webp`), `site/img/arsenal/app-screen.webp`

- [ ] **Step 1: Read**

`docs/arsenal/layout-options-2026-11-13.html` (option A, with option C's letter card), `docs/arsenal/arsenal-tokens.md`, `docs/arsenal/copy.md`, `DESIGN.md` and `DESIGN-BANS.md` at the repo root, `site/assets/css/ground-tokens-v1.css`, the spec's "The page" section. Open arsenalhealth.com and groundapp.live side by side.

- [ ] **Step 2: Cut and grade the still**

From the clips Collin named in Task 1, pull candidate frames at full resolution (`ffmpeg -ss <t> -i <clip> -frames:v 1 -q:v 1 frame.jpg`), choose one where his face is sharp and the Arsenal floor is recognisable, crop to 4:5, and grade it to sit on a black page beside a warm card. Export `collin-training.jpg` (1600px long edge, quality 82) and WebP at 780 and 1440 wide. Take `app-screen.webp` from the existing site media listed in `docs/site-v3/media.md` (a real GroundApp v2 screen); do not mock one up.

- [ ] **Step 3: Write `docs/arsenal/DESIGN.md`**

It must settle, with values: the grid and container at 390, 768 and 1440; the hero split (ratio, seam, where the × and the two marks sit, how the sentence breaks across the seam, the phone stack order and band heights); type scale for both families at the three widths; every colour by token; the letter card (size, padding, overlap with the photo if any); the "what you get" block; the three steps; the form (field layout, focus, error and success states, the Turnstile widget's place); the fine print; the footer; the member-link page (`.ax-redeem`, the QR block, the code); the email frame (how the black frame, the warm card and the gold button translate to email-safe HTML at 560px); motion, if any, with `prefers-reduced-motion` behaviour; and contrast ratios for every text and background pair (4.5:1 or better for body text). One button colour per brand half: gold on GroundApp's half of the hero, cyan everywhere on Arsenal's ground.

- [ ] **Step 4: Make the share image**

`site/img/arsenal/og.jpg`, 1200x630, under 300KB: the split hero with both marks and the offer sentence, readable at 600px wide.

- [ ] **Step 5: Commit**

```bash
git add docs/arsenal/DESIGN.md site/img/arsenal
git commit -m "Arsenal page: design, still, share image"
```

---

### Task 5: Build the page

**Files:**
- Create: `site/arsenal/index.html`, `site/assets/css/arsenal-v1.css`

- [ ] **Step 1: Write the HTML from `DESIGN.md` and `copy.md`**

Fixed parts the form script and the server depend on (class names beyond these are the builder's):

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Arsenal Health × GroundApp: a free year of Premium for members</title>
<meta name="description" content="Arsenal Health members get a free year of GroundApp Premium. Claim your own code.">
<meta property="og:title" content="Arsenal Health × GroundApp">
<meta property="og:description" content="Arsenal members get a free year of GroundApp Premium.">
<meta property="og:image" content="https://groundapp.live/img/arsenal/og.jpg">
<meta property="og:url" content="https://groundapp.live/arsenal">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/assets/css/ground-tokens-v1.css">
<link rel="stylesheet" href="/assets/css/arsenal-v1.css">
</head>
<body class="ax">
<!-- header lockup, split hero, letter, what you get, how it works: from DESIGN.md and copy.md -->

<section id="claim" aria-labelledby="claim-h">
  <h2 id="claim-h"><!-- copy.md form.heading --></h2>
  <form id="claim-form" novalidate>
    <label for="cf-first">First name</label>
    <input id="cf-first" name="first_name" type="text" autocomplete="given-name" maxlength="60" required>
    <label for="cf-last">Last name</label>
    <input id="cf-last" name="last_name" type="text" autocomplete="family-name" maxlength="60" required>
    <label for="cf-email">Email</label>
    <input id="cf-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required>
    <fieldset>
      <legend>Your phone</legend>
      <label><input type="radio" name="device" value="iphone" checked> iPhone</label>
      <label><input type="radio" name="device" value="android"> Android</label>
    </fieldset>
    <label for="cf-location">Your Arsenal location</label>
    <select id="cf-location" name="location" required>
      <option value="Arvada">Arvada</option>
      <option value="DTC">DTC (Englewood)</option>
    </select>
    <label><input type="checkbox" name="member" required> I'm an Arsenal member</label>
    <label><input type="checkbox" name="newsletter"> Send me Collin's breathwork emails</label>
    <!-- Hidden from people, tempting to bots. -->
    <div aria-hidden="true" style="position:absolute;left:-9999px"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="cf-turnstile" data-sitekey="TURNSTILE_SITE_KEY_FROM_PART_1_TASK_9" data-theme="dark"></div>
    <button type="submit"><!-- copy.md form.button --></button>
    <p class="ax-under"><!-- copy.md form.under_button --></p>
    <p id="claim-status" role="status" aria-live="polite"></p>
  </form>
</section>

<!-- fine print (copy.md fine_print, link to /privacy), footer -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script src="/assets/js/arsenal-v1.js" defer></script>
</body>
</html>
```

The option values `Arvada` and `DTC` must match `partner_programs.locations`. Replace `TURNSTILE_SITE_KEY_FROM_PART_1_TASK_9` with the real site key (it is public by design). The hero button is `<a href="#claim">`. Images carry `width`, `height`, `alt` from `copy.md`, and `loading="lazy"` below the first screen. The page works with JavaScript off up to the form, which then shows `<noscript>` text: "Turn on JavaScript to claim your code, or email collin@groundapp.live."

- [ ] **Step 2: Write `site/assets/css/arsenal-v1.css`**

Start with the measured tokens, then the layout from `DESIGN.md`:

```css
/* groundapp.live/arsenal. Arsenal's look below the hero; GroundApp tokens (ground-tokens-v1.css) on its half and the letter card.
   Values in :root come from docs/arsenal/arsenal-tokens.md. */
.ax {
  --ax-bg: #000;
  --ax-text: #fff;
  --ax-cyan: #1FCAF4;
  --ax-font: 'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif;
  margin: 0;
  background: var(--ax-bg);
  color: var(--ax-text);
  font-family: var(--ax-font);
}
```

Add the remaining `--ax-*` tokens from `arsenal-tokens.md` with their measured values, then every rule `DESIGN.md` specifies, including `.ax-redeem`, `.ax-redeem-card`, `.ax-lockup`, `.ax-qr` and `.ax-code` for the member-link page, a visible `:focus-visible` ring on every control, and `@media (prefers-reduced-motion: reduce)` turning off any motion.

- [ ] **Step 3: Check it renders and passes the site check**

Run: `./scripts/check-site.sh && npx wrangler pages dev site --port 8788` and open `http://localhost:8788/arsenal/` at 390, 768 and 1440 wide.
Expected: `site/ looks clean.`; the hero splits at 1440 and stacks at 390 with Arsenal on top; no horizontal scroll at any width; every control reachable and visible with the keyboard.

- [ ] **Step 4: Commit**

```bash
git add site/arsenal/index.html site/assets/css/arsenal-v1.css
git commit -m "Arsenal page: markup and styles"
```

---

### Task 6: Form behaviour and the QR code

**Files:**
- Create: `site/assets/js/arsenal-v1.js`, `site/assets/js/arsenal-qr-v1.js`, `site/assets/js/LICENSE-qrcode-generator.txt`

- [ ] **Step 1: Write `site/assets/js/arsenal-v1.js`**

Replace each message string with the matching `form.messages` line from `docs/arsenal/copy.md` once Collin has approved it; the strings below are the working drafts.

```js
// groundapp.live/arsenal: sends the claim form to POST /api/partner/claim and shows what happened.
// The code itself only ever arrives by email.
(function () {
  'use strict';
  var form = document.getElementById('claim-form');
  if (!form) return;
  var status = document.getElementById('claim-status');
  var button = form.querySelector('button[type="submit"]');
  var started = Date.now();
  var src = (new URLSearchParams(location.search).get('src') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);

  var MESSAGES = {
    assigned: 'Check your inbox. Your code and link are on the way to {email}. Open it on your iPhone.',
    existing: 'You already claimed your year. We just sent your code again to {email}.',
    android: "GroundApp is iPhone only for now. You're on the list, and we'll email you when Android is ready.",
    waitlist: "Codes are being restocked. You're on the list and yours will arrive by email.",
    first_name: 'Add your first name.',
    last_name: 'Add your last name.',
    email: "That email doesn't look right.",
    device: 'Pick iPhone or Android.',
    location: 'Pick your Arsenal location.',
    member: 'This one is for Arsenal members. Tick the box if that is you.',
    bot_check: "We couldn't confirm you're a person. Wait for the check above the button, then try again.",
    rate_limited: 'A lot of people on this network just signed up. Try again in an hour.',
    email_failed: 'Something went wrong on our side. Your spot is saved. Try again in a minute.',
    server: 'Something went wrong on our side. Try again in a minute.'
  };
  var FIELD_IDS = { first_name: 'cf-first', last_name: 'cf-last', email: 'cf-email', location: 'cf-location' };

  function show(key, email, isError) {
    status.textContent = (MESSAGES[key] || MESSAGES.server).replace('{email}', email || '');
    status.className = isError ? 'is-error' : 'is-ok';
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
      partner: 'arsenal',
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
    status.textContent = '';
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
        if (window.turnstile) window.turnstile.reset();
      })
      .catch(function () {
        show('server', '', true);
        button.disabled = false;
        if (window.turnstile) window.turnstile.reset();
      });
  });
})();
```

- [ ] **Step 2: Vendor the QR library and write the QR script**

```bash
cd /tmp && rm -rf qrgen && mkdir qrgen && cd qrgen && npm pack qrcode-generator@1.4.4 --silent && tar xzf qrcode-generator-1.4.4.tgz
ls package/LICENSE* >/dev/null 2>&1 && cp package/LICENSE* ~/dev/groundapp-website-arsenal/site/assets/js/LICENSE-qrcode-generator.txt \
  || curl -fsSL https://raw.githubusercontent.com/kazuhikoarase/qrcode-generator/master/LICENSE -o ~/dev/groundapp-website-arsenal/site/assets/js/LICENSE-qrcode-generator.txt
{ printf '/* qrcode-generator 1.4.4, Kazuhiko Arase, MIT. See LICENSE-qrcode-generator.txt. */\n'; cat package/qrcode.js; cat <<'EOF'

/* groundapp.live member-link page: draw the QR code for the element with data-qr. */
(function () {
  'use strict';
  var box = document.querySelector('[data-qr]');
  if (!box || typeof qrcode !== 'function') return;
  var qr = qrcode(0, 'M');
  qr.addData(box.getAttribute('data-qr'));
  qr.make();
  box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
})();
EOF
} > ~/dev/groundapp-website-arsenal/site/assets/js/arsenal-qr-v1.js
```

Expected: `site/assets/js/arsenal-qr-v1.js` exists, begins with the license comment and ends with the drawing code. `box.innerHTML` receives only the library's own SVG output.

- [ ] **Step 3: See both work locally**

Needs Part 1 Task 9 done (database, Turnstile). Run `npx wrangler pages dev site --port 8788`, open `http://localhost:8788/arsenal/?src=test`, and submit with the member box unticked.
Expected: the member message appears, the box is focused, no request is sent (Network tab).

Then open `http://localhost:8788/arsenal/r/aaaaaaaaaaaaaaaaaaaaaa` in a desktop browser.
Expected: the 404 page with a link back to `/arsenal`, styled by `arsenal-v1.css`.

- [ ] **Step 4: Commit**

```bash
git add site/assets/js/arsenal-v1.js site/assets/js/arsenal-qr-v1.js site/assets/js/LICENSE-qrcode-generator.txt
git commit -m "Arsenal page: form behaviour and QR code for the member link"
```

---

### Task 7: Final email words and frame

**Files:**
- Modify: `lib/partner-email.js`
- Test: `test/partner-email.test.mjs` (existing; extend, do not weaken)

- [ ] **Step 1: Add a test that pins the approved subject lines**

Append to `test/partner-email.test.mjs`, filling the four strings from `docs/arsenal/copy.md` (`email_claim.subject`, `email_nudge.subject`, `email_android.subject`, `email_waitlist.subject`) exactly as Collin approved them:

```js
test('subjects match the approved copy (docs/arsenal/copy.md)', () => {
  const unsubUrl = 'https://groundapp.live/api/unsubscribe?e=x&t=y';
  assert.equal(renderClaimEmail({ ...base, code: 'ABC', link }).subject, APPROVED.claim);
  assert.equal(renderNudgeEmail({ ...base, link, unsubUrl }).subject, APPROVED.nudge);
  assert.equal(renderAndroidEmail(base).subject, APPROVED.android);
  assert.equal(renderWaitlistEmail(base).subject, APPROVED.waitlist);
});
```

and near the top of the file, with the four approved strings in place of the working drafts shown here:

```js
const APPROVED = {
  claim: 'Your free year of GroundApp, from Arsenal and Collin',
  nudge: 'Your free year of GroundApp is still waiting',
  android: "GroundApp on Android: you're on the list",
  waitlist: "You're on the list for your GroundApp code",
};
```

- [ ] **Step 2: Run it**

Run: `node --test test/partner-email.test.mjs 2>&1 | tail -8`
Expected: passes if Collin kept the draft subjects, fails on each subject he changed.

- [ ] **Step 3: Put the approved words and the designed frame into `lib/partner-email.js`**

Replace the `body`, `steps`, `cta`, heading and preheader strings in the four `render*Email` functions with the matching keys from `docs/arsenal/copy.md`. Replace `shell()` and the `C` colour table with the email frame from `docs/arsenal/DESIGN.md` (table layout, inline styles, 560px, dark colour scheme meta). Keep every exported function's name, arguments and `{ subject, html, text }` return shape, keep `RENEWAL` in the claim and reminder emails, keep the plain-text parts saying the same as the HTML, and host any image at `https://groundapp.live/img/arsenal/` with `width`, `height` and `alt`.

- [ ] **Step 4: Run the whole suite**

Run: `npm test 2>&1 | tail -8`
Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/partner-email.js test/partner-email.test.mjs
git commit -m "Partner emails: approved copy and designed frame"
```

---

### Task 8: Partners panel on `/admin`

**Files:**
- Modify: `site/admin/index.html`

- [ ] **Step 1: Add the section**

Insert directly after the closing `</section>` of `<section id="apple">` and before `<footer>`:

```html
    <section id="partners">
      <h2>Partners: Arsenal Health</h2>
      <p class="note">Free-year codes for Arsenal members from groundapp.live/arsenal. "Tapped" means they opened their link on an iPhone. Apple reports redemptions per offer, not per person.</p>
      <div class="kpis" data-slot="partner-kpis"></div>
      <div data-slot="partner-actions" style="margin:12px 0;display:flex;gap:8px;flex-wrap:wrap"></div>
      <div class="grid two">
        <div class="card"><h3>Claims by location</h3><p class="cap">All statuses</p><div data-slot="partner-location"></div></div>
        <div class="card"><h3>Claims by link</h3><p class="cap">The ?src= on the link they came from</p><div data-slot="partner-src"></div></div>
      </div>
      <div class="grid" style="margin-top:12px">
        <div class="card"><h3>People</h3><p class="cap">Newest first</p><div data-slot="partner-rows"></div></div>
      </div>
    </section>
```

- [ ] **Step 2: Add the script**

Inside the existing `<script>`, directly before the line `var last = null, ctrl = null;`, insert:

```js
  // Partners panel (GET/POST /api/admin/partner). Not tied to the date range.
  var PARTNER = 'arsenal';
  var partnerData = null;
  var STATUS_NAMES = { assigned: 'Code sent', waitlist: 'Waiting for a code', android_waitlist: 'Android list' };
  function when(iso) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; }
  function objRows(o) { return Object.keys(o || {}).map(function (k) { return { label: k, value: o[k] }; }).sort(function (a, b) { return b.value - a.value; }); }
  function actionButton(label, fn) {
    var b = el('button', { type: 'button' }, label);
    b.addEventListener('click', fn);
    return b;
  }
  function partnerPost(body, done) {
    body.slug = PARTNER;
    fetch('/api/admin/partner', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) { done(j); loadPartner(); })
      .catch(function () { done({ ok: false }); });
  }
  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function downloadCsv(rows) {
    var head = ['first_name', 'last_name', 'email', 'device', 'location', 'src', 'status', 'newsletter_opt_in', 'created_at', 'emailed_at', 'redeem_tapped_at', 'tap_count', 'code_seq'];
    var text = [head.join(',')].concat(rows.map(function (r) { return head.map(function (h) { return csvCell(r[h]); }).join(','); })).join('\n');
    var a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/csv' })), download: PARTNER + '-claims-' + new Date().toISOString().slice(0, 10) + '.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function renderPartner(d) {
    partnerData = d;
    var c = d.claims || {}, codes = d.codes || {}, paused = d.program && d.program.status === 'paused';
    var k = clear(slot('partner-kpis'));
    k.appendChild(tile('Codes left', fmt(codes.left), 'of ' + fmt(codes.total) + (codes.expires_on ? ', expire ' + shortDate(codes.expires_on) : '')));
    k.appendChild(tile('Codes sent', fmt(c.assigned), fmt(c.email_failed) + ' emails failed'));
    k.appendChild(tile('Tapped on iPhone', fmt(c.tapped), c.assigned ? Math.round(c.tapped / c.assigned * 100) + '% of codes sent' : ''));
    k.appendChild(tile('Waiting for a code', fmt(c.waitlist), fmt(c.android_waitlist) + ' on the Android list'));
    k.appendChild(tile('Joined your list', fmt(c.newsletter), 'Ticked the newsletter box'));

    var acts = clear(slot('partner-actions'));
    acts.appendChild(el('span', { class: 'cap' }, paused ? 'Paused: the form is taking a waitlist.' : 'Live: the form is handing out codes.'));
    acts.appendChild(actionButton(paused ? 'Resume' : 'Pause', function () {
      if (!paused && !confirm('Pause Arsenal? New claims go on a waitlist until you resume.')) return;
      partnerPost({ action: paused ? 'resume' : 'pause' }, function () {});
    }));
    if (c.waitlist > 0 && codes.left > 0) {
      acts.appendChild(actionButton('Send codes to the next 10 waiting', function () {
        partnerPost({ action: 'release_waitlist' }, function (j) { alert(j.ok ? j.sent + ' sent, ' + j.failed + ' failed.' : 'That didn\'t work. Try again in a minute.'); });
      }));
    }
    acts.appendChild(actionButton('Download CSV', function () { downloadCsv(d.rows || []); }));

    barList(slot('partner-location'), objRows(d.by_location), { empty: 'No claims yet.' });
    barList(slot('partner-src'), objRows(d.by_src), { empty: 'No claims yet.' });

    var rows = d.rows || [];
    if (!rows.length) { empty(slot('partner-rows'), 'No claims yet.'); return; }
    var box = clear(slot('partner-rows'));
    var tv = tableView(['Name', 'Email', 'Location', 'Phone', 'Status', 'Claimed', 'Tapped', ''], rows.map(function (r) {
      return [r.first_name + ' ' + r.last_name, r.email, r.location, r.device === 'iphone' ? 'iPhone' : 'Android',
        r.email_error ? 'Email failed' : (STATUS_NAMES[r.status] || r.status), when(r.created_at), when(r.redeem_tapped_at), ''];
    }), true);
    tv.querySelector('summary').textContent = 'Everyone who claimed (' + rows.length + ')';
    Array.prototype.forEach.call(tv.querySelectorAll('tbody tr'), function (tr, i) {
      var b = actionButton('Resend', function () {
        b.disabled = true;
        partnerPost({ action: 'resend', claim_id: rows[i].id }, function (j) { b.textContent = j.ok ? 'Sent' : 'Failed'; });
      });
      tr.lastChild.appendChild(b);
    });
    box.appendChild(tv);
  }
  function loadPartner() {
    fetch('/api/admin/partner?slug=' + PARTNER, { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok) renderPartner(j);
        else ['partner-location', 'partner-src', 'partner-rows'].forEach(function (s) { empty(slot(s), 'Couldn\'t load partner claims. Try again in a minute.'); });
      })
      .catch(function () {});
  }
```

and directly after the existing last line `load();` add:

```js
  loadPartner();
```

- [ ] **Step 3: See it work locally**

With `DEV_ADMIN_BYPASS=1` in `.dev.vars`, run `npx wrangler pages dev site --port 8788` and open `http://localhost:8788/admin/`.
Expected: the Partners section shows "Codes left 450 of 450", empty-state text in the three cards, and Pause and Download CSV buttons. Press Pause, confirm, and see the line change to "Paused"; press Resume and see it return to "Live". Check in Supabase that `partner_programs.status` is `live` afterwards.

- [ ] **Step 4: Commit**

```bash
git add site/admin/index.html
git commit -m "Admin: Partners panel for Arsenal claims"
```

---

### Task 9: Privacy paragraph

**Files:**
- Modify: `site/privacy.html`

- [ ] **Step 1: Add the paragraph**

Find the section of `site/privacy.html` that describes the email list (search for `newsletter` or `email list`). Directly after that section's last paragraph, add a heading in the page's existing heading style reading "Partner offers" and one paragraph with the `privacy_paragraph` text from `docs/arsenal/copy.md`. Update the page's "last updated" date to the day it goes live.

- [ ] **Step 2: Check and commit**

Run: `rg -n 'Partner offers' site/privacy.html && ./scripts/check-site.sh`
Expected: one match and `site/ looks clean.`

```bash
git add site/privacy.html
git commit -m "Privacy: what a partner claim collects"
```

---

### Task 10: Verify on the real surface, review, preview (orchestrator)

- [ ] **Step 1: Tests and site check**

Run: `npm test 2>&1 | tail -6 && ./scripts/check-site.sh && python3 scripts/build_blog.py && git status --porcelain`
Expected: `# fail 0`, `site/ looks clean.`, and no changed files after the blog build.

- [ ] **Step 2: One real Arsenal claim, locally, by Collin**

Run `npx wrangler pages dev site --port 8788`. Collin opens `http://localhost:8788/arsenal/?src=test` and claims with an address of his that has never claimed.
Expected: the "check your inbox" message with no code on screen; the code email arrives within a minute with his code and a link `https://groundapp.live/arsenal/r/<token>`; `/admin` shows 449 codes left and his row; a reminder is scheduled in Resend. This uses one real code (number 51). He keeps it or gives it to a member.

- [ ] **Step 3: Screenshots**

Capture `http://localhost:8788/arsenal/` at 390, 768 and 1440 wide (full page), the form in its success, error and Android states, the member-link page on desktop, and the code email in Apple Mail and Gmail on an iPhone. Compare each against `docs/arsenal/DESIGN.md` and fix differences before review.

- [ ] **Step 4: Cross-family review**

Send the branch diff against `origin/main` to `cross-reviewer` (the page, CSS and JS were written by a Claude model). Ask for: anything that could put a code or token in a URL, log or response; XSS through names or `src`; keyboard and screen-reader problems in the form; claims in the copy that the shipped app doesn't meet. Fix what it finds; re-run Step 1.

- [ ] **Step 5: Preview for Collin**

Only with Collin's go: `git push -u origin arsenal`, open a pull request titled "Arsenal Health partner page", and send him the preview link from the Deploy run (per `AGENTS.md`, the form does not work on previews; he reviews look and words there). Include the plain list of what changed and the screenshots.

---

### Task 11: Go live (orchestrator, each step on Collin's word)

- [ ] **Step 1: The launch checklist from the spec is complete**

Clips named and still in place; Arsenal's written agreement and logo in place; offer eligibility read and recorded; Turnstile live; 450 codes loaded (449 after Task 10); Collin approved the letter, emails and kit; preview approved.

- [ ] **Step 2: Merge**

Collin says go. Merge the pull request into `main`. Confirm the Deploy run on `main` is green.

- [ ] **Step 3: Check the live page**

Open `https://groundapp.live/arsenal` on an iPhone. `curl -sI https://groundapp.live/arsenal | rg -i 'x-robots-tag'` prints `noindex`. `/admin` shows the Partners panel.

- [ ] **Step 4: First real redemption**

Someone at Arsenal who has never had GroundApp Premium claims on their iPhone, opens the email, taps the button and completes the redemption in the App Store. Expected: GroundApp shows Premium; `/admin` shows them as tapped; App Store Connect shows one more redemption on the offer within a day.

- [ ] **Step 5: Hand the kit to Arsenal**

Collin sends `docs/arsenal/kit.md` and `site/img/arsenal/og.jpg` to Arsenal. Record the go-live date in the spec.
