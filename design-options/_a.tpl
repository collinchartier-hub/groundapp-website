<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GroundApp hero option A: quiet instrument</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="../site/assets/css/home-v1.css">
<script>document.documentElement.classList.add('js');</script>
<style>
/* Option A: the quiet instrument. One narrow column left of center, the pacer as a small exact tool. */
.qa{min-height:100svh;padding:clamp(120px,22vh,220px) var(--m) 48px clamp(16px,22vw,320px);display:flex;flex-direction:column;gap:36px}
.qa h1{font-size:clamp(2.4rem,5.4vw,5.2rem);line-height:1.02;letter-spacing:-.035em;font-weight:300;max-width:11ch}
.qa-col{max-width:520px;display:flex;flex-direction:column;gap:22px}
.qa-tool{display:flex;align-items:center;gap:28px}
.qa .stage{display:block}
.qa .dial{position:relative;left:auto;top:auto;transform:none;--dial:220px;width:220px;height:220px;flex:none}
.qa .pc-word{font-size:1rem}
.qa .pc-count{font-size:2rem}
.qa .controls{flex-direction:column;align-items:flex-start}
.qa .pc-desc{text-align:left}
.qa .snd{min-height:44px}
.qa-act{display:flex;flex-wrap:wrap;align-items:center;gap:16px}
.qa-act p{font-size:var(--t-small);color:var(--text-2)}
.qa .hero::before{display:none}
@media (prefers-reduced-motion:no-preference){.js .qa h1,.js .qa-col{animation:fade 1s ease both}.js .qa-col{animation-delay:.3s}@keyframes fade{from{opacity:0}to{opacity:1}}}
@media (max-width:640px){.qa{padding:96px 16px 32px;gap:28px}.qa-tool{flex-direction:column;align-items:flex-start;gap:18px}.qa .dial{width:200px;height:200px}}
</style>
</head>
<body>
<nav class="nav" aria-label="Main"><a href="#" class="brand"><img src="../site/lung-logo.svg" alt="" width="30" height="30"><span>GroundApp</span></a><a href="#" class="btn btn-sm" style="margin-left:auto">Download</a></nav>
<main class="qa" data-pacer data-idle-delay="900">
  <h1>From the mind into the body</h1>
  <div class="qa-col">
    <p class="lede">35 breathing techniques and guided sessions in Collin's voice, matched to how you feel. Try one breath here first.</p>
    <div class="qa-tool">
      @@DIAL@@
      <div>@@CONTROLS@@</div>
    </div>
    <div class="qa-act"><a href="#" class="btn">@@APPLE@@Download on the App Store</a><p>Free to download. Premium $29.99/year.</p></div>
  </div>
</main>
<script src="../site/js/pacer-v1.js"></script>
</body>
</html>
