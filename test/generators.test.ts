import { describe, expect, it } from 'vitest';
import { generateAntdConfig } from '../src/generators/antd.js';
import { generateTailwindConfig } from '../src/generators/tailwind.js';
import { generateCSSVars } from '../src/generators/css-vars.js';
import { buildTheme } from '../src/index.js';
import { DEFAULT_THEME } from '../src/types.js';

const tokens = buildTheme({ primary: '#7c3aed' }).tokens;

describe('antd generator', () => {
  const out = generateAntdConfig(tokens);

  it('is a type-annotated ThemeConfig module', () => {
    expect(out).toContain("import type { ThemeConfig } from 'antd'");
    expect(out).toContain('export default theme');
    expect(out).toContain('colorPrimary:');
  });

  it('carries the seed colour into the token block', () => {
    expect(out).toContain("colorPrimary: '#7c3aed'");
  });

  it('emits a ramp for custom components', () => {
    expect(out).toContain('primaryRamp');
    expect(out).toContain('500:');
  });
});

describe('tailwind generator', () => {
  const out = generateTailwindConfig(tokens);

  it('is a Tailwind v4 theme block', () => {
    expect(out).toContain('@import "tailwindcss"');
    expect(out).toContain('@theme inline');
  });

  it('emits the ramp as theme variables', () => {
    expect(out).toContain('--color-primary-500: #7c3aed');
  });

  it('resolves a foreground colour for brand surfaces', () => {
    expect(out).toMatch(/--color-brand-primary-fg: #[0-9a-f]{6}/);
  });
});

describe('css generator', () => {
  it('writes :root only when no dark palette is supplied', () => {
    const out = generateCSSVars(tokens);
    expect(out).toContain(':root');
    expect(out).not.toContain('[data-theme="dark"]');
  });

  it('writes both blocks when a dark palette is supplied', () => {
    const theme = buildTheme({ primary: '#7c3aed' });
    const out = generateCSSVars(theme.tokens, theme.dark);
    expect(out).toContain(':root');
    expect(out).toContain('[data-theme="dark"]');
  });
});

describe('buildTheme', () => {
  it('normalises input and derives a dark palette', () => {
    const theme = buildTheme({ primary: '#ABC' });
    expect(theme.tokens.primary).toBe('#aabbcc');
    expect(theme.dark.surface).not.toBe(theme.tokens.surface);
  });

  it('audits every readable pair', () => {
    const theme = buildTheme(DEFAULT_THEME);
    expect(theme.contrast).toHaveLength(4);
    expect(theme.contrast.every((r) => typeof r.ratio === 'number')).toBe(true);
  });

  it('warns instead of silently shipping a failing pair', () => {
    const theme = buildTheme({ text: '#f5f5f5', surface: '#ffffff' });
    expect(theme.warnings.length).toBeGreaterThan(0);
    expect(theme.warnings[0]).toContain('body text on surface');
  });

  it('thumbnails every token ramp', () => {
    const theme = buildTheme({ primary: '#7c3aed' });
    expect(Object.keys(theme.palettes)).toEqual(['primary', 'secondary', 'accent', 'surface', 'text']);
    expect(theme.palettes.primary.ramp[500]).toBe('#7c3aed');
  });
});
