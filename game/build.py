#!/usr/bin/env python3
"""Build Bodie's Breath Run two ways from one source (run: python3 game/build.py):
   1. bodie-breath-run.html: the Claude artifact (one file, lung logo inlined, Google Fonts).
   2. groundapp.live/play: site/play.html + site/js/bodie-run-v1.js + site/assets/css/bodie-run-v1.css
      (self-hosted fonts, /lung-logo.svg, site head, bar and footer)."""
import base64, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
OUT = os.path.join(HERE, "out")  # artifact build and syntax-check files, gitignored
os.makedirs(OUT, exist_ok=True)
VER = "v1"
src = lambda n: open(os.path.join(HERE, "src", n)).read()
page = src("1-page.html")
js = "".join(src(n) for n in ["2-core.js", "3-models.js", "4-race.js", "5-modes.js", "6-app.js"])
lung = "data:image/png;base64," + base64.b64encode(open(os.path.join(HERE, "lung.png"), "rb").read()).decode()

# ---- artifact
art = page + js
art = art.replace("%%LUNG%%", lung)
open(os.path.join(OUT, "bodie-breath-run.html"), "w").write(art)
short = (art.replace("Math.min(.05, (now - last) / 1000)", "Math.min(.1, (now - last) / 1000)")
         .replace("len: 420,", "len: 90,").replace("len: 500,", "len: 90,").replace("len: 540,", "len: 110,")
         .replace("len: 600,", "len: 150,").replace("len: 640,", "len: 150,").replace("len: 480,", "len: 100,"))
open(os.path.join(OUT, "test-short.html"), "w").write(short)

# ---- website
style_open, style_close = page.index("<style>"), page.index("</style>")
css = page[style_open + len("<style>"):style_close].strip("\n")
body = page[style_close + len("</style>"):].lstrip("\n")
FONTS = """@font-face { font-family: "Source Serif 4"; src: url("../fonts/source-serif-4-v1.woff2") format("woff2"); font-weight: 200 900; font-style: normal; font-display: swap; }
@font-face { font-family: "Source Code Pro"; src: url("../fonts/source-code-pro-v1.woff2") format("woff2"); font-weight: 200 900; font-style: normal; font-display: swap; }
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; }
img { max-width: 100%; }
"""
SITE_CSS = """
/* groundapp.live only: the site bar above the game and the footer under it. */
.site-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.site-bar .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--bone); text-decoration: none; font: 600 17px/1 var(--serif); }
.site-cta { font: 600 15px/1 var(--serif); color: var(--amber); text-decoration: none; border: 1px solid rgba(196,147,90,.55); border-radius: 999px; padding: 9px 15px; }
.site-cta:hover { border-color: var(--amber); }
.site-foot { display: grid; gap: 10px; padding-top: 24px; border-top: 1px solid rgba(168,149,133,.2); color: var(--driftwood); font-size: 15px; }
.site-foot p { margin: 0; }
.site-foot nav { display: flex; flex-wrap: wrap; gap: 8px 18px; }
.site-foot a { color: var(--bone); text-decoration: none; }
.site-foot a:hover { color: var(--amber); }
.site-foot .copy { font-size: 13px; }
a:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
"""
web_css = ("/* Bodie's Breath Run (groundapp.live/play). Built from one source with the Claude artifact version.\n"
           "   Bump the filename (v2, v3) when editing: /assets is cached for 7 days. */\n") + FONTS + css + SITE_CSS
store = lambda ct: f"https://apps.apple.com/app/apple-store/id6760352779?pt=128638571&amp;ct=site-{ct}&amp;mt=8"
# Site v3 header (copied from site/index.html). It is position: fixed, so it sits at the top of .wrap in the markup.
BAR = f"""  <a class="skip" href="#stage">Skip to the game</a>
  <svg width="0" height="0" class="vh" aria-hidden="true" focusable="false">
    <symbol id="i-apple" viewBox="0 0 24 24"><path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></symbol>
    <symbol id="i-bodie" viewBox="0 0 24 24"><circle cx="12" cy="6.6" r="3.3" fill="currentColor"/><ellipse cx="12" cy="13.8" rx="4.8" ry="4.2" fill="currentColor"/><ellipse cx="12" cy="19.6" rx="8" ry="2" fill="currentColor" opacity=".5"/></symbol>
  </svg>
  <header class="site-head">
    <a href="/" class="brand" aria-label="GroundApp home"><img src="/lung-logo.svg" alt="" width="28" height="28"><span>GroundApp</span></a>
    <nav class="head-nav" aria-label="Main">
      <a href="/#check-in">App</a>
      <a href="/#story">Story</a>
      <a href="/#pricing">Pricing</a>
    </nav>
    <a class="play-link" href="/play" aria-current="page"><svg aria-hidden="true"><use href="#i-bodie"/></svg>Play</a>
    <a class="btn btn-gold btn-sm" href="{store('play-bar')}" data-ct="play-bar"><svg aria-hidden="true"><use href="#i-apple"/></svg>Get the app</a>
    <button type="button" class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="menu" aria-label="Open menu">Menu</button>
  </header>
  <nav class="menu" id="menu" aria-label="Menu" hidden>
    <a href="/#check-in">App</a>
    <a href="/#story">Story</a>
    <a href="/#pricing">Pricing</a>
    <a href="/play" aria-current="page">Play</a>
    <a class="btn btn-gold" href="{store('play-menu')}" data-ct="play-menu"><svg aria-hidden="true"><use href="#i-apple"/></svg>Download on the App Store</a>
  </nav>
"""
# Site v3 footer (copied from site/index.html), full width under the game's .wrap.
FOOT = f"""<footer class="site-foot" id="foot">
  <div class="wrap foot-grid">
    <p class="foot-tag">From the mind into the body. Breathwork by Collin Chartier.</p>
    <nav class="foot-nav" aria-label="Footer">
      <a href="/blog/">Blog</a><a href="/play">Play</a><a href="/support">Support</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="https://instagram.com/collinchartier" rel="noopener">Instagram</a><a href="mailto:collin@groundapp.live">Contact</a><a href="{store('play-footer')}" data-ct="play-footer">App Store</a>
    </nav>
    <div class="foot-fine">
      <p>GroundApp is coaching and education, not medical or mental health treatment.</p>
      <p>&copy; 2026 GroundApp. Made by Collin Chartier.</p>
    </div>
  </div>
</footer>
"""
assert body.count('<div class="wrap">') == 1 and body.count("</section>\n</div>\n\n<script>") == 1
web_body = body.replace('<div class="wrap">\n', '<div class="wrap">\n' + BAR, 1).replace("</section>\n</div>\n\n<script>", "</section>\n</div>\n\n" + FOOT + "\n<script>", 1)
TITLE = "Bodie's Breath Run | A breathwork game by GroundApp"
DESC = ("A free breathwork game from GroundApp. Race Kip the Caffeine Crow with one button, hold your breath through "
        "Worry Clouds, and try The Big Hold to beat your own breath-hold record. Plays in your browser.")
OG_IMG = f"https://groundapp.live/img/play/bodie-run-og-{VER}.jpg"
head = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#1A110E">
<meta name="author" content="Collin Chartier">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="apple-itunes-app" content="app-id=6760352779, affiliate-data=pt=128638571&amp;ct=site-banner">
<meta property="og:title" content="Bodie's Breath Run">
<meta property="og:description" content="Race Kip the Caffeine Crow, push your longest breath hold, and learn real breathing techniques. A free game from GroundApp.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://groundapp.live/play">
<meta property="og:image" content="{OG_IMG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Bodie, GroundApp's breathing figure, sitting on his cushion next to Kip the Caffeine Crow">
<meta property="og:site_name" content="GroundApp">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Bodie's Breath Run">
<meta name="twitter:description" content="Race Kip, push your longest breath hold, and learn real breathing techniques. A free game from GroundApp.">
<meta name="twitter:image" content="{OG_IMG}">
<meta name="twitter:image:alt" content="Bodie, GroundApp's breathing figure, sitting on his cushion next to Kip the Caffeine Crow">
<link rel="canonical" href="https://groundapp.live/play">
<link rel="icon" type="image/svg+xml" href="/lung-logo.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/source-serif-4-latin-v1.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/ground-font-type-v1.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/ground-tokens-v1.css">
<link rel="stylesheet" href="/assets/css/site-v3.css">
<link rel="stylesheet" href="/assets/css/bodie-run-{VER}.css">
<style>
/* Site v3 header and footer on /play. site-v3.css loads before the game stylesheet, so the game's rules win where both
   style the same thing; these lines undo the few site rules the game does not set itself, override the old bar and
   footer rules still inside bodie-run-{VER}.css (SITE_CSS, kept until the next filename bump), and set the page around
   the game (title, cast, courses) in kit v5 type. The game screen keeps its own type. */
body > .wrap {{ padding-top: calc(var(--head-h) + 24px); }}
.btn:where(:not(.btn-gold)) {{ display: inline-block; min-height: 0; }}
.site-head .btn-gold, .menu .btn-gold {{ padding: 10px 18px; border: 0; border-radius: var(--radius-button); font: 600 15px/1.2 var(--font-text); letter-spacing: 0; }}
.menu .btn-gold {{ padding: 14px 26px; font-size: 16px; }}
.wrap .lede {{ font-size: inherit; line-height: inherit; color: inherit; }}
.wrap .quote {{ font: inherit; color: inherit; }}
.stage img, .stage svg, body > .wrap > section img {{ display: revert; }}
body > .wrap > header.top h1 {{ font: 400 clamp(30px, 1.4rem + 1.6vw, 44px)/1.1 var(--font-display); font-variation-settings: "opsz" 60; letter-spacing: -.01em; text-transform: none; }}
body > .wrap > header.top p {{ font: 400 16px/1.5 var(--font-text); }}
body > .wrap > section {{ font-family: var(--font-text); }}
body > .wrap > section h3 {{ font: 400 clamp(26px, 1.2rem + .8vw, 32px)/1.2 var(--font-display); font-variation-settings: "opsz" 60; letter-spacing: 0; text-transform: none; }}
body > .wrap > section h4, body > .wrap > section .nm, body > .wrap > section .rl, body > .wrap > section .btn {{ font-family: var(--font-text); }}
body > .site-foot {{ display: block; padding: 72px 0 calc(env(safe-area-inset-bottom) + 96px); border-top: 0; color: var(--text-2); font: 400 16px/1.6 var(--font-text); }}
body > .site-foot .foot-nav {{ gap: 0 4px; }}
body > .site-foot a {{ color: var(--text-2); }}
@media (hover: hover) and (pointer: fine) {{ body > .site-foot .foot-nav a:hover {{ color: var(--text); }} }}
</style>
<script type="application/ld+json">
{{"@context": "https://schema.org", "@type": "VideoGame", "name": "Bodie's Breath Run", "url": "https://groundapp.live/play",
  "description": "{DESC}", "genre": ["Casual", "Health and fitness"], "gamePlatform": "Web browser", "applicationCategory": "Game",
  "offers": {{"@type": "Offer", "price": "0", "priceCurrency": "USD"}},
  "publisher": {{"@type": "Organization", "name": "GroundApp", "url": "https://groundapp.live"}}, "image": "{OG_IMG}"}}
</script>
</head>
<body>
"""
tail = f"""<script type="module" src="/js/bodie-run-{VER}.js"></script>
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{{"token": "03e507bb97d74e78bc8de83dc6b261ec"}}'></script>
<script src="/js/app-links-v3.js" defer></script>
<script src="/js/site-menu-v1.js" defer></script>
</body>
</html>
"""
web_html = head + web_body + tail
web_js = js.strip()
assert web_js.startswith('<script type="module">') and web_js.endswith("</script>")
web_js = web_js[len('<script type="module">'):-len("</script>")].strip("\n") + "\n"
web_js = ("/* Bodie's Breath Run (groundapp.live/play). Built from one source with the Claude artifact version.\n"
          "   three.js 0.186.1 from jsDelivr, like the home page figure. Bump the filename (v2, v3) when editing. */\n") + web_js
assert web_js.count('const LUNG = "%%LUNG%%";') == 1
web_js = web_js.replace('const LUNG = "%%LUNG%%";', 'const LUNG = "/lung-logo.svg";')
if "--artifact-only" not in sys.argv:
    open(os.path.join(SITE, "play.html"), "w").write(web_html)
    open(os.path.join(SITE, "js", f"bodie-run-{VER}.js"), "w").write(web_js)
    open(os.path.join(SITE, "assets", "css", f"bodie-run-{VER}.css"), "w").write(web_css)
    print("site/play.html, site/js/bodie-run-%s.js, site/assets/css/bodie-run-%s.css written" % (VER, VER))
# syntax check both module scripts
for name, code in [("artifact", art[art.index('<script type="module">') + 22:art.rindex("</script>")]), ("web", web_js)]:
    p = os.path.join(OUT, f"check-{name}.mjs"); open(p, "w").write(code)
    r = subprocess.run(["node", "--check", p], capture_output=True, text=True)
    print(name, "SYNTAX_OK" if r.returncode == 0 else r.stderr[:800])
