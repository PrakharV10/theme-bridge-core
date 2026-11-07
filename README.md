# theme-bridge

**One brand palette in. Ant Design, Tailwind v4 and CSS custom properties out — WCAG-checked, with tints, shades and a dark palette derived from the same five tokens.**

Design tokens are the part of a design system everyone agrees on and nobody wants to maintain. Ant Design has 200+ token keys, Tailwind v4 moved theming into `@theme`, and CSS variables need naming discipline. Mapping a brand palette into all three is a day of work that gets thrown away on the next redesign.

theme-bridge does it in one command, and refuses to hand you an unreadable palette.

```bash
npx theme-bridge --primary "#7c3aed" --secondary "#0ea5e9" --accent "#f59e0b" --out ./src/theme

theme-bridge: wrote 4 files to /src/theme
  pass  body text on surface — 17.4:1
  pass  primary on surface — 5.7:1
  FAIL  secondary on surface — 2.77:1
  FAIL  accent on surface — 2.15:1
```

That audit is the point. The generator tells you which of your brand colours cannot legally sit on your surface colour, at the moment you generate the theme — not three weeks later in an accessibility review.

---

## Install

```bash
npm install --save-dev theme-bridge
```

Node 18+. One runtime dependency (`chroma-js`) for colour maths.

## CLI

```bash
# minimum: one colour
npx theme-bridge -p "#7c3aed"

# full palette, into a specific folder
npx theme-bridge -p "#7c3aed" -s "#0ea5e9" -a "#f59e0b" --surface "#ffffff" -t "#1a1a1a" -o ./src/theme

# tokens from a JSON preset, audited, failing CI if a pair is unreadable
npx theme-bridge --preset brand.json --check

# print resolved tokens instead of writing files
npx theme-bridge -p "#7c3aed" --json
```

| Flag | Meaning |
|---|---|
| `-p, --primary <hex>` | Primary brand colour |
| `-s, --secondary <hex>` | Secondary colour |
| `-a, --accent <hex>` | Accent / CTA colour |
| `--surface <hex>` | Background colour (default `#ffffff`) |
| `-t, --text <hex>` | Text colour (default `#1a1a1a`) |
| `-o, --out <dir>` | Output directory (default `./theme`) |
| `--preset <file>` | JSON file of token overrides |
| `--no-dark` | Skip the derived dark palette |
| `--check` | Exit 1 when a readable pair fails WCAG AA |
| `--json` | Print tokens as JSON; write nothing |

**Exit codes:** `0` clean · `1` `--check` found a failing contrast pair · `2` bad flag or unreadable preset.

## What it writes

| File | Contents |
|---|---|
| `antd.ts` | Ant Design 5 `ThemeConfig` with token overrides, per-component styles, and a typed 50–900 ramp |
| `tailwind.css` | Tailwind v4 `@theme inline` block — brand, neutrals, ramps, accent states |
| `tokens.css` | `:root` **and** `[data-theme="dark"]` CSS custom properties |
| `tokens.json` | Resolved light tokens, dark tokens, every ramp, and the contrast report |

Generated files carry a header saying so. They are build artefacts — commit them or generate at build time, but never hand-edit them.

## Library

```ts
import { buildTheme, generateTailwindConfig } from 'theme-bridge';

const theme = buildTheme({
  primary: '#7c3aed',
  secondary: '#0ea5e9',
  accent: '#f59e0b',
});

theme.tokens;    // normalised #rrggbb
theme.dark;      // dark palette derived from the same five tokens
theme.palettes;  // 50–900 ramp + readable foreground per token
theme.contrast;  // WCAG ratio for every pair that must be readable
theme.warnings;  // human-readable list of pairs that fail AA

const css = generateTailwindConfig(theme.tokens);
```

### Colour engine

Everything routes through one module, and three decisions matter:

- **Lightness moves in LCH, not RGB.** Adding 8 to each channel is how a saturated blue turns grey. `lighten`/`darken` walk perceptual lightness and preserve hue.
- **Contrast is real WCAG relative luminance.** `readableOn` picks the readable foreground from candidates and reports the ratio it achieved, so you can warn instead of hope.
- **Alpha and input formats are normalised.** `#abc`, `rgb(1,2,3)` and named colours all become `#rrggbb` before anything else touches them, and `withAlpha` emits a correct 8-digit hex instead of concatenating onto whatever string it was handed.

```ts
import { contrastRatio, readableOn, ensureContrast, ramp, deriveDarkTheme } from 'theme-bridge';

contrastRatio('#ffffff', '#000000');           // 21
readableOn('#7c3aed');                         // { color: '#ffffff', ratio: 5.7 }
ensureContrast('#f2f2f2', '#ffffff', 4.5);     // adjusts until it clears AA
ramp('#7c3aed')[500];                          // the seed colour on a 50–900 ramp
deriveDarkTheme({ primary: '#7c3aed' });       // dark tokens, contrast enforced
```

### As a CI guard

`--check` is designed to be wired into a pipeline. A palette that fails AA fails the build:

```yaml
- run: npx theme-bridge --preset brand.json --check
```

The audit covers body text on surface, plus primary, secondary and accent on surface — the four pairs that actually ship.

## Development

```bash
npm install
npm test          # 39 tests: colour maths, generators, CLI
npm run typecheck
npm run build     # tsup → ESM + CJS + .d.ts
```

## Roadmap

- [ ] `--format json|yaml|js` for the token dump
- [ ] MUI and Chakra emitters
- [ ] OKLCH output alongside hex
- [ ] `--figma` export (W3C design-token JSON)

## License

MIT
