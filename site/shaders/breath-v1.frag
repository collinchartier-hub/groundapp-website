// breath (GroundApp hero): the web-3d `breath` shader, Ground / GroundApp ONLY.
// Same rings and the same resonance clock (about 5.5 breaths a minute: 4.5 s in, 6.4 s out). Two changes:
//  1. uSpeed between 0 and 1 is the fill set by the page's breath pacer (its idle loop or a pattern the
//     visitor started), so the rings and the count never disagree. uSpeed < 0 uses the built-in clock
//     (reduced motion: the still frame at stillTime 4.5, a full inhale).
//  2. The ground is transparent (alpha), so the hero's own background shows around the rings.
// uColorA = rings, uColorB = ground (unused, transparent), uColorC = core. uScale = size, uIntensity = ring count / 6.

const float CYCLE = 60.0 / 5.5;
const float INHALE = 4.5;

float breath(float t) {
  float c = mod(t, CYCLE);
  if (c < INHALE) { float x = c / INHALE; return x * x * (3.0 - 2.0 * x); }
  float x = (c - INHALE) / (CYCLE - INHALE);
  return 1.0 - x * x * (3.0 - 2.0 * x);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float fill = uSpeed < 0.0 ? breath(uTime) : clamp(uSpeed, 0.0, 1.0);
  float radius = mix(0.18, 0.42, fill) * uScale;
  float rr = length(uv) / radius;
  float rings = floor(6.0 * uIntensity + 0.5);
  float q = rr * rings;
  float d = abs(fract(q + 0.5) - 0.5) / fwidth(q);
  float ring = (1.0 - smoothstep(0.5, 1.5, d)) * (1.0 - step(1.0, rr)) * step(0.5 / rings, rr);
  float aa = fwidth(rr);
  float edge = 1.0 - smoothstep(0.0, 1.5 * aa, abs(rr - 1.0));
  float core = 1.0 - smoothstep(0.16 - aa, 0.16 + aa, rr);
  float glow = (1.0 - smoothstep(0.0, 1.0, rr)) * mix(0.10, 0.22, fill);

  float a = max(max(ring * mix(0.3, 0.85, rr), edge), max(core, glow));
  vec3 col = mix(uColorA, uColorC, core);
  fragColor = vec4(col, a);
}
