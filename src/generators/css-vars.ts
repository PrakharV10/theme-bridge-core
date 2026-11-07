import type { ThemeTokens } from '../types.js';
import { buildPalette, darken, lighten, mix, readableOn, withAlpha, ensureContrast } from '../color.js';

/**
 * Framework-agnostic CSS custom properties.
 *
 * Emits `:root` for the light theme and `[data-theme="dark"]` for the derived
 * dark palette, so a single stylesheet supports both without a second build.
 */
export function generateCSSVars(tokens: ThemeTokens, dark?: ThemeTokens): string {
  const light = block(tokens, ':root');
  if (!dark) return light;
  return `${light}\n${block(dark, '[data-theme="dark"]')}`;
}

function block(tokens: ThemeTokens, selector: string): string {
  const { primary, secondary, accent, surface, text } = tokens;
  const onPrimary = readableOn(primary).color;
  const body = ensureContrast(withAlpha(text, 0.75), surface, 4.5);
  const muted = ensureContrast(withAlpha(text, 0.5), surface, 3);
  const ramp = buildPalette(primary).ramp;

  return `${selector} {
  /* ── Brand ── */
  --tb-primary: ${primary};
  --tb-primary-hover: ${lighten(primary, 6)};
  --tb-primary-active: ${darken(primary, 6)};
  --tb-primary-fg: ${onPrimary};
  --tb-primary-bg: ${withAlpha(primary, 0.1)};

  --tb-secondary: ${secondary};
  --tb-secondary-bg: ${withAlpha(secondary, 0.1)};

  --tb-accent: ${accent};
  --tb-accent-bg: ${withAlpha(accent, 0.12)};

  /* ── Surface & text ── */
  --tb-surface: ${surface};
  --tb-surface-raised: ${mix(surface, text, 0.04)};
  --tb-text: ${text};
  --tb-text-secondary: ${body.color};
  --tb-text-muted: ${muted.color};

  /* ── Borders ── */
  --tb-border: ${withAlpha(text, 0.15)};
  --tb-border-light: ${withAlpha(text, 0.08)};

  /* ── Shadows ── */
  --tb-shadow-sm: 0 1px 2px ${withAlpha(text, 0.06)};
  --tb-shadow-md: 0 4px 12px ${withAlpha(text, 0.1)};

  /* ── Primary ramp (50-900) ── */
${Object.entries(ramp)
  .map(([step, value]) => `  --tb-primary-${step}: ${value};`)
  .join('\n')}

  /* ── Status colours (contrast-checked against surface) ── */
  --tb-success: ${ensureContrast('#16a34a', surface, 3).color};
  --tb-warning: ${ensureContrast('#d97706', surface, 3).color};
  --tb-danger: ${ensureContrast('#dc2626', surface, 3).color};
}`;
}
