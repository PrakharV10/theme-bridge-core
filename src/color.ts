/**
 * Colour engine.
 *
 * Everything that touches a colour goes through chroma-js, so:
 *   - `#abc`, `#aabbcc`, `rgb(1,2,3)` and named colours all normalise to #rrggbb
 *   - mixing, lightening and darkening happen in a perceptual space (LCH),
 *     not by adding integers to RGB channels (which is how the first version of
 *     this tool turned a saturated blue grey)
 *   - contrast uses WCAG relative luminance, not the 0.299/0.587/0.114 luma
 *     approximation, so "passes AA" means what an auditor thinks it means
 */
import chroma from 'chroma-js';
import type { Palette, ThemeTokens, TokenKey } from './types.js';
import { RAMP_STEPS } from './types.js';

export function isValidColor(input: string): boolean {
  return typeof input === 'string' && chroma.valid(input.trim());
}

/** Normalise any CSS colour chroma understands to lowercase `#rrggbb`. */
export function normalizeColor(input: string): string {
  const value = String(input ?? '').trim();
  if (!chroma.valid(value)) {
    throw new TypeError(`Invalid colour: ${JSON.stringify(input)}`);
  }
  return chroma(value).hex('rgb').toLowerCase();
}

export function normalizeTheme(tokens: Partial<ThemeTokens>): ThemeTokens {
  return {
    primary: normalizeColor(tokens.primary ?? '#1677ff'),
    secondary: normalizeColor(tokens.secondary ?? '#722ed1'),
    accent: normalizeColor(tokens.accent ?? '#13c2c2'),
    surface: normalizeColor(tokens.surface ?? '#ffffff'),
    text: normalizeColor(tokens.text ?? '#1a1a1a'),
  };
}

/** Lighten in LCH: `amount` is lightness points (0–100), not RGB steps. */
export function lighten(color: string, amount: number): string {
  const [l, c, h] = chroma(normalizeColor(color)).lch();
  return chroma.lch(clamp(l + amount, 0, 100), c, h || 0).hex('rgb').toLowerCase();
}

/** Darken in LCH. Negative `amount` would lighten; both directions are clamped. */
export function darken(color: string, amount: number): string {
  const [l, c, h] = chroma(normalizeColor(color)).lch();
  return chroma.lch(clamp(l - amount, 0, 100), c, h || 0).hex('rgb').toLowerCase();
}

export function mix(a: string, b: string, ratio = 0.5): string {
  return chroma.mix(normalizeColor(a), normalizeColor(b), ratio, 'lch').hex('rgb').toLowerCase();
}

/** `#rrggbbaa` from any input colour. Alpha is 0–1 and rounds to 8-bit. */
export function withAlpha(color: string, alpha: number): string {
  const rgb = chroma(normalizeColor(color)).rgb();
  const a = clamp(Math.round(alpha * 255), 0, 255)
    .toString(16)
    .padStart(2, '0');
  return `${chroma.rgb(...(rgb as [number, number, number])).hex('rgb').toLowerCase()}${a}`;
}

export function luminance(color: string): number {
  return chroma(normalizeColor(color)).luminance();
}

export function contrastRatio(a: string, b: string): number {
  return round(chroma.contrast(normalizeColor(a), normalizeColor(b)), 2);
}

export function meetsAA(a: string, b: string, large = false): boolean {
  return contrastRatio(a, b) >= (large ? 3 : 4.5);
}

/**
 * Pick the readable foreground for a background: whichever candidate scores
 * higher, with the actual ratio reported so callers can warn instead of guess.
 */
export function readableOn(
  background: string,
  candidates: string[] = ['#ffffff', '#1a1a1a'],
): { color: string; ratio: number } {
  const bg = normalizeColor(background);
  let best = { color: candidates[0] ?? '#ffffff', ratio: 0 };
  for (const candidate of candidates) {
    const ratio = contrastRatio(bg, candidate);
    if (ratio > best.ratio) best = { color: normalizeColor(candidate), ratio };
  }
  return best;
}

/**
 * Nudge a colour until it clears `min` contrast against `against`.
 * Returns the adjusted colour plus the ratio achieved, so a caller can fail
 * loudly when the target is unreachable instead of shipping something unreadable.
 */
export function ensureContrast(
  color: string,
  against: string,
  min = 4.5,
): { color: string; ratio: number; adjusted: boolean } {
  const target = normalizeColor(against);
  let current = normalizeColor(color);
  const initial = contrastRatio(current, target);
  if (initial >= min) return { color: current, ratio: initial, adjusted: false };

  const backgroundIsDark = luminance(target) < 0.5;
  for (let step = 1; step <= 50; step += 1) {
    current = backgroundIsDark ? lighten(current, 2) : darken(current, 2);
    const ratio = contrastRatio(current, target);
    if (ratio >= min) return { color: current, ratio, adjusted: true };
  }
  return { color: current, ratio: contrastRatio(current, target), adjusted: true };
}

/** 50 → 900 ramp, hue-preserving, built by walking LCH lightness. */
export function ramp(color: string, steps: readonly number[] = RAMP_STEPS): Record<number, string> {
  const [seedL, seedC, seedH] = chroma(normalizeColor(color)).lch();
  const out: Record<number, string> = {};
  const max = steps.length - 1;

  steps.forEach((step, index) => {
    const t = max === 0 ? 0 : index / max;
    // 97 → 12 lightness, with chroma tapering at both ends so the extremes
    // read as a tint/shade of the seed rather than a different colour.
    const l = 97 - t * 85;
    const c = Math.max(0, seedC * (1 - Math.abs(t - (seedL > 60 ? 0.35 : 0.75)) * 0.5));
    const h = seedH || 0;
    out[step] = chroma.lch(l, c, h).hex('rgb').toLowerCase();
  });

  // Keep the exact seed colour in the ramp when it lines up with a step.
  const nearest = steps.reduce(
    (closest, step) => (Math.abs(Number(step) - 500) < Math.abs(Number(closest) - 500) ? step : closest),
    steps[0] ?? 500,
  );
  out[Number(nearest)] = normalizeColor(color);
  return out;
}

export function buildPalette(color: string): Palette {
  const base = normalizeColor(color);
  const on = readableOn(base);
  return {
    ramp: ramp(base),
    base,
    onColor: on.color,
    onColorContrast: on.ratio,
  };
}

/**
 * Derive a dark palette from the same five tokens: surfaces go dark, brand
 * colours are lifted so they keep their identity against a dark background,
 * and text is flipped. Contrast is then enforced, not hoped for.
 */
export function deriveDarkTheme(tokens: Partial<ThemeTokens>): ThemeTokens {
  const light = normalizeTheme(tokens);
  const surface = luminance(light.surface) > 0.5 ? '#101014' : mix(light.surface, '#000000', 0.72);

  const lift = (color: string) => {
    const assured = ensureContrast(color, surface, 4.5);
    return assured.adjusted ? assured.color : lighten(color, 6);
  };

  return {
    primary: lift(light.primary),
    secondary: lift(light.secondary),
    accent: lift(light.accent),
    surface,
    text: readableOn(surface, ['#f5f5f7', light.text]).color,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Every token pair that has to be readable, for audit output. */
export const CONTRAST_PAIRS: Array<[TokenKey, TokenKey, string]> = [
  ['text', 'surface', 'body text on surface'],
  ['primary', 'surface', 'primary on surface'],
  ['secondary', 'surface', 'secondary on surface'],
  ['accent', 'surface', 'accent on surface'],
];
