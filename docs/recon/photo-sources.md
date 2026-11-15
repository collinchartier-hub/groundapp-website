# RECON Wellness photos and logo on groundapp.live/recon

RECON's own published photos and logo, downloaded from reconwellness.com (Shopify CDN) on 2026-11-14, then cropped, resized and exported as WebP. Nothing is hotlinked and nothing is upscaled. Collin has RECON's permission to use photos and branding from their website.

RECON Wellness is a recovery equipment brand (compression, PEMF, red light), not a gym. The page shows these photos as RECON's world: no RECON facility, location or membership is claimed.

| File in `site/img/recon/` | Where on the page | Source (page, then file URL) | What it shows |
|---|---|---|---|
| `recon-hero-boots-1600.webp`, `-800.webp` | Hero, behind the headline and Bodie; also the share image | Home page `https://reconwellness.com/`: `https://reconwellness.com/cdn/shop/files/recon-hero-s1-boots-desktop-2800.jpg?v=1790561151&width=2800` (2800 × 1556) | A woman settling into RECON compression boots in a blue-lit recovery lounge. Full frame, resized only |
| `recon-trail-800.webp`, `-480.webp` | With RECON, "After the trail" | About page `https://reconwellness.com/pages/about`: `https://cdn.shopify.com/s/files/1/0754/6555/6195/files/Andy_Down_Hill.jpg?v=1776467518&width=1600` (1600 × 1066) | Founder Andy Gobel airborne on a mountain bike in a forest. 4:5 crop |
| `recon-sled-720.webp`, `-480.webp` | With RECON, "After a hard push" | About page: `https://cdn.shopify.com/s/files/1/0754/6555/6195/files/Andy_SLed_Push-opt.jpg?v=1791846450&width=1600` (728 × 1096, the largest the CDN serves) | Andy Gobel pushing a loaded sled. 4:5 crop; 720 wide is the largest made, so no upscale |
| `recon-recovery-row-800.webp`, `-480.webp` | With RECON, "In recovery" | B2B page `https://reconwellness.com/pages/b2b`: `https://cdn.shopify.com/s/files/1/0754/6555/6195/files/recon-recovery-row-denver-gym-opt.jpg?v=1791846450&width=1600` (1594 × 1064) | A woman in compression boots on a PEMF mat under a red light panel, below a "Powered by RECON" wall sign. 4:5 crop on her. The venue is not named on the page |
| `recon-logo-white-504.webp` | Header, footer | Site header: `https://cdn.shopify.com/s/files/1/0754/6555/6195/files/Recon_WhiteHorizontalLogo.png` (600 × 200) | RECON's white horizontal logo: the blue slashed R mark, RECON and the RECOVERY CONCIERGE descriptor. Transparent margins trimmed to 504 × 115; nothing redrawn, recoloured or cropped out |
| `og.jpg` | Share image (1200 × 630) | Composed from the hero photo and the logo above, with Bodie (`/img/arsenal/bodie-awake-750.webp`) and the GroundApp lung | The hero as the page draws it |

Notes:

- Fonts: Rajdhani and Montserrat from Google Fonts (SIL Open Font License), as reconwellness.com uses them. GroundApp's Source Serif 4 and Ground Font Type stay self-hosted.
- Downloaded but not used: the wide Recovery Row shot with Andy (`Andy_Recovery_Row_Wide_shot-opt.jpg`), the commercial red light bed (`Recon_commercial_red_light_bed_hero_v2_jpeg.jpg`) and the PEMF mat and panel photo (`Arsenal_Sam_Redlight_PEMF_MAT-opt.jpg`, taken at another business, so kept off the page).
- The tiles show identifiable people from RECON's own website: Andy Gobel (founder) and two people in RECON's own product photos.

## Implementation and preview evidence

- Adapted the already-selected partner-page layout, not the main website or the three existing partners. RECON's blue/charcoal, Rajdhani and Montserrat come from its official site; the warm app sections and Bodie retain GroundApp's identity.
- Phone and desktop browser proof: 375/390px phones and 1366/1440px desktop, no horizontal overflow. Real iOS Safari checked on iPhone 17 Pro with Reduce Motion.
- Shared partner-flow and tracking tests: 106 passed. Static publish-safety check passed. Independent cross-family server and frontend reviews found no blockers.
- The design detector reported stylistic warnings, not functional errors: Montserrat is the partner's actual font; the small blue rules, segmented controls and repeated labels preserve the selected partner template; Bodie's existing cushion halo grounds the app character. Rendered screenshots, rather than these stylistic heuristics, were reviewed for spacing and readability.
- The program is staged paused until the page's launch is approved. No real claim/email delivery is implied by a local preview.
