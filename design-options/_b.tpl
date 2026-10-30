<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GroundApp hero option B: split stage</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="../site/assets/css/home-v2.css">
<script>document.documentElement.classList.add('js');</script>
<style>
/* Option B: the split stage. Collin's real photo holds the left half; the pacer and the words take the right. */
.sb{position:relative;min-height:100svh;display:grid;grid-template-columns:47% 1fr;overflow:hidden}
.sb-photo{position:relative;margin:20px 0 20px 20px;border-radius:var(--r);overflow:hidden}
.sb-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:30% 30%}
.sb-right{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:80px var(--m) clamp(150px,13vw,210px)}
.sb .stage{display:flex;flex-direction:column;align-items:center;gap:18px}
.sb .dial{position:relative;left:auto;top:auto;transform:none;--dial:min(30vw,38svh,380px);width:var(--dial);height:var(--dial)}
.sb-lede{max-width:26ch;text-align:center;font-family:var(--serif);font-size:1.5rem;line-height:1.3;font-weight:300}
.sb-name{position:absolute;right:var(--m);bottom:52px;z-index:3;font-family:var(--serif);font-weight:300;font-size:clamp(5rem,11vw,10.5rem);line-height:.9;letter-spacing:-.045em;color:var(--text);white-space:nowrap}
.sb-act{display:flex;align-items:center;gap:16px}
.sb-act p{font-size:var(--t-small);color:var(--text-2)}
.sb .nav{background:transparent}
@media (prefers-reduced-motion:no-preference){.js .sb-name{animation:rise 1.1s var(--exhale) .2s both}@keyframes rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}}
@media (max-width:820px){
.sb{grid-template-columns:1fr;grid-template-rows:auto auto}
.sb-photo{height:52svh;margin:12px 12px 0}
.sb-name{position:relative;right:auto;bottom:auto;margin:-11vw 16px 0;font-size:21vw}
.sb-right{padding:24px 16px 40px}
.sb-act{flex-direction:column;align-items:flex-start}
.sb .dial{--dial:min(78vw,380px)}
}
</style>
</head>
<body>
<nav class="nav" aria-label="Main"><a href="#" class="brand"><img src="../site/lung-logo.svg" alt="" width="30" height="30"><span>GroundApp</span></a><a href="#" class="btn btn-sm" style="margin-left:auto">Download</a></nav>
<main class="sb">
  <div class="sb-photo"><img src="../site/img/photos/collin-effort-800.webp" alt="Collin Chartier in a headband, bent over a towel and catching his breath after a hard effort" width="800" height="1000"></div>
  <h1 class="sb-name">GroundApp</h1>
  <div class="sb-right">
    <div class="stage" data-pacer data-idle-delay="900">
      @@DIAL@@
      @@CONTROLS@@
    </div>
    <p class="sb-lede">From the mind into the body. Breathwork by Collin Chartier.</p>
    <div class="sb-act"><a href="#" class="btn">@@APPLE@@Download on the App Store</a><p>Free to download.<br>Premium $39.99/year.</p></div>
  </div>
</main>
<script src="../site/js/pacer-v2.js"></script>
</body>
</html>
