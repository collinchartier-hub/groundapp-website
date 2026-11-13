# Arsenal Health look, measured

Read from the rendered https://www.arsenalhealth.com/ with `getComputedStyle` on 2026-11-13, at 1440 and 390 wide. These are the values `site/assets/css/arsenal-v1.css` uses for everything on Arsenal's ground.

| Token | 1440 | 390 | Read from |
|---|---|---|---|
| `--ax-bg` | `#000000` | same | `body` background |
| `--ax-text` | `#FAFAFA` (h1 is `#FFFFFF`) | same | `body` color, hero `h1` |
| `--ax-text-2` | `#B8B8B8` | same | section paragraph |
| `--ax-cyan` | `#1FCAF4` | same | accent word in the hero `h1`, primary button fill, eyebrow |
| `--ax-on-cyan` | `#FFFFFA` | same | primary button text |
| `--ax-border` | `#262626` | same | photo card border, section top rule |
| `--ax-surface` | `#141414` | same | raised card fill |
| `--ax-font` | `Manrope, -apple-system, system-ui, 'Segoe UI', sans-serif` | same | `body` |
| `--ax-h1-size` | `72px` | `48px` | hero `h1` |
| `--ax-h1-weight` | `800` | `800` | hero `h1` |
| `--ax-h1-leading` | `1.0` (72px) | `1.16` (55.68px) | hero `h1` |
| `--ax-h1-tracking` | `-0.03em` (-2.16px) | `-0.03em` (-1.44px) | hero `h1` |
| `--ax-h2-size` | `72px`, leading `0.95` | `36px`, leading `0.95` | first section `h2` |
| `--ax-body-size` | `18px`, leading `1.625` | `16px`, leading `1.625` | section paragraph |
| `--ax-btn-radius` | `9999px` (pill) | same | all buttons |
| `--ax-btn-height` | `56px` hero, `40px` nav | `48px` hero, `36px` nav | buttons |
| `--ax-btn-pad` | `0 40px` hero, `0 20px` nav | `0 24px` hero, `0 16px` nav | buttons |
| `--ax-btn-type` | `600 18px` hero, `600 14px` nav | `600 16px` hero, `600 14px` nav | buttons |
| `--ax-eyebrow-size` | `12px`, weight `600` | same | "MORE THAN JUST A GYM" |
| `--ax-eyebrow-tracking` | `0.18em` (2.16px), uppercase | same | same |
| `--ax-card-radius` | `24px` | `24px` | photo card, content card |
| `--ax-container` | `1280px`, side padding `32px` | full width, `16px` | section container |
| `--ax-nav-height` | `81px`, transparent with `blur(4px)` | `65px` | header |
| `--ax-footer-rule` | `1px solid rgba(20, 199, 242, 0.2)` | same | footer top border |

Notes:

- The secondary button is the outline of the primary: transparent fill, `1px solid` cyan, cyan text.
- Sections are separated by a `1px solid #262626` top rule, not by a change of background.
- One raised card on the phone layout carries a cyan border and a soft cyan glow (`0 0 20px rgba(31,202,244,0.4), 0 0 40px rgba(31,202,244,0.2)`). GroundApp's rules ban glows on its own parts; if used at all it stays on Arsenal's ground.
- The eyebrow face on their site is a custom "Eyebrow" font falling back to Neue Haas Grotesk, Helvetica Neue, Arial. We use the fallback stack; their font file is not ours to ship.
- Their logo mark SVG uses `#16B8EA`, a slightly deeper cyan than the UI's `#1FCAF4`. The page uses the UI value.
- Wordmark on their site: white PNG, 400x45, shown 246px wide in the header.
