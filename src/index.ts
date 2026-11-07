/**
 * theme-bridge — one brand palette in, framework themes out.
 *
 * @example
 * ```ts
 * import { buildTheme, generateAntdConfig, generateTailwindConfig } from 'theme-bridge';
 *
 * const plan = buildTheme({ primary: '#7c3aed', secondary: '#0ea5e9', accent: '#f59e0b' });
 * console.log(plan.dark);        // derived dark palette
 * console.log(plan.contrast);    // WCAG audit of every readable pair
 * console.log(generateTailwindConfig(plan.tokens));
 * ```
 */
export type { ThemeTokens, TokenKey, Framework, Palette, ContrastReport, ThemeBundle } from './types.js';
export { DEFAULT_THEME, TOKEN_LABELS, TOKEN_DESCRIPTIONS, RAMP_STEPS } from './types.js';

export {
  isValidColor,
  normalizeColor,
  normalizeTheme,
  lighten,
  darken,
  mix,
  withAlpha,
  luminance,
  contrastRatio,
  meetsAA,
  readableOn,
  ensureContrast,
  ramp,
  buildPalette,
  deriveDarkTheme,
  clamp,
  CONTRAST_PAIRS,
} from './color.js';

export { generateAntdConfig } from './generators/antd.js';
export { generateTailwindConfig } from './generators/tailwind.js';
export { generateCSSVars } from './generators/css-vars.js';

import type { ContrastReport, ThemeBundle, ThemeTokens, TokenKey } from './types.js';
import { buildPalette, contrastRatio, deriveDarkTheme, normalizeTheme, CONTRAST_PAIRS } from './color.js';

/**
 * Normalise a palette, derive its dark counterpart, build ramps and audit every
 * pair that has to be readable. This is the one call a build step needs.
 */
export function buildTheme(input: Partial<ThemeTokens> = {}): ThemeBundle {
  const tokens = normalizeTheme(input);
  const dark = deriveDarkTheme(tokens);
  const keys: TokenKey[] = ['primary', 'secondary', 'accent', 'surface', 'text'];

  const palettes = Object.fromEntries(
    keys.map((key) => [key, buildPalette(tokens[key])]),
  ) as ThemeBundle['palettes'];

  const contrast: ContrastReport[] = CONTRAST_PAIRS.map(([fg, bg, label]) => {
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    return {
      pair: label,
      ratio,
      passesAA: ratio >= 4.5,
      passesAALarge: ratio >= 3,
      passesAAA: ratio >= 7,
    };
  });

  const warnings = contrast
    .filter((report) => !report.passesAA)
    .map((report) => `${report.pair} is ${report.ratio}:1 — below AA (4.5:1)`);

  return { tokens, dark, palettes, contrast, warnings };
}
