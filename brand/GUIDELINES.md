# DuckWake — Logo guidelines

## 1. The logo
- **Idea**: a duck whose own wake is carved through its body and runs on behind it as streaks. The duck is the data passing over the lake; the wake is the ordered trace each epoch leaves.
- **Versions**: horizontal lockup (primary) · stacked lockup · symbol · wordmark · app icon (symbol on an Ink tile).
- **Files**:
  - `svg/` — masters: `duckwake-horizontal.svg`, `duckwake-stacked.svg`, `duckwake-symbol.svg`, `duckwake-wordmark.svg`, each with a `-reversed` version for dark backgrounds; `duckwake-symbol-small.svg` for small sizes; app icons.
  - `variants/` — one-colour black, white and Lake versions, as SVG and PNG.
  - `web/` — `favicon.ico`, `favicon.svg`, PNG icons, `site.webmanifest`, `head-snippet.html`.
  - All files are RGB for screens. There are no print (CMYK/PDF) masters yet.

## 2. Clear space
Keep a clear zone of **1 × B** on every side of the logo, where **B** is the height of the duck's bill. The zone scales with the logo. In the horizontal lockup, the gap between duck and wordmark is fixed (about 1.7 × B); do not change it.

## 3. Minimum size
| Version | Screen | Print |
|---|---|---|
| Horizontal lockup | 120 px wide | 30 mm wide |
| Stacked lockup | 64 px wide | 18 mm wide |
| Symbol, full drawing | 40 px wide | 10 mm wide |
| Symbol, small cut (`-small`) | 16 px | 5 mm |

Below 40 px always use the small cut: one wide wake slit and a larger eye. The full drawing's thin slits close up at small sizes.

## 4. Colour
| Name | HEX | RGB | CMYK (approx.) | Use in the logo |
|---|---|---|---|---|
| Ink | #0E1A24 | 14 26 36 | 61 28 0 86 | duck and wordmark on light backgrounds; app-icon tile |
| Paper | #F7F8F5 | 247 248 245 | 0 0 1 3 | duck and wordmark on dark backgrounds |
| Amber | #F4B728 | 244 183 40 | 0 25 84 4 | the bill only |
| Lake | #1D5A7A | 29 90 122 | 76 26 0 52 | one-colour version on light backgrounds |

CMYK values are converted from RGB and are approximate: ask the printer for a proofed conversion. No Pantone references have been chosen yet.

**Approved pairs**:
- full colour (Ink + Amber) on white or Paper;
- reversed (Paper + Amber) on Ink;
- one-colour black on white;
- one-colour white on any dark colour or photo;
- one-colour Lake on white.

The Amber bill appears only in the full-colour versions. In one-colour versions the bill takes the same colour as the duck.

## 5. Typography
- **Wordmark**: Space Grotesk Bold, outlined to paths. It does not need the font installed. Do not retype it.
- **Headlines**: Space Grotesk 500/700. **Body**: Inter 400/500/600. **Code**: JetBrains Mono.
- **Licences**: all three are under the SIL Open Font License (Google Fonts). OFL allows use in logos.

## 6. Don'ts
- Don't stretch, squash, rotate or mirror the duck. It always swims to the right.
- Don't colour the duck yellow, or the bill any colour other than Amber. A yellow duck reads as DuckDB.
- Don't fill or close the wake slits, and don't add more streaks.
- Don't add shadows, outlines, gradients or glows.
- Don't change the gap between duck and wordmark, or set the wordmark in another typeface.
- Don't place the full-colour logo on a busy photo. Use the white version, or the app icon tile.
- Don't use the full drawing below 40 px. Use the small cut.

## 7. Notes
- **Not done**: trademark search (trademark databases and a reverse image search) before public launch, and print masters (PDF/CMYK).
- **Reversed versions**: these use the same geometry as the dark-on-light ones. White on dark looks slightly heavier (irradiation). If the logo will be printed large in white, thin it by about 1 % in a vector editor.
