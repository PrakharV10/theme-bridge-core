import { describe, expect, it } from 'vitest';
import chroma from 'chroma-js';
import {
  contrastRatio,
  deriveDarkTheme,
  ensureContrast,
  isValidColor,
  lighten,
  normalizeColor,
  normalizeTheme,
  ramp,
  readableOn,
  withAlpha,
  buildPalette,
} from '../src/color.js';
import { RAMP_STEPS } from '../src/types.js';

describe('normalizeColor', () => {
  it('expands shorthand hex', () => {
    expect(normalizeColor('#ABC')).toBe('#aabbcc');
  });

  it('converts rgb() to hex', () => {
    expect(normalizeColor('rgb(1, 2, 3)')).toBe('#010203');
  });

  it('accepts named colours', () => {
    expect(normalizeColor('rebeccapurple')).toBe('#663399');
  });

  it('rejects junk loudly', () => {
    expect(() => normalizeColor('not-a-colour')).toThrow(TypeError);
    expect(isValidColor('not-a-colour')).toBe(false);
  });
});

describe('contrast', () => {
  it('scores white on black at the WCAG maximum', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#1677ff', '#ffffff')).toBe(contrastRatio('#ffffff', '#1677ff'));
  });

  it('picks dark text for a light background', () => {
    const { color, ratio } = readableOn('#ffffff');
    expect(color).toBe('#1a1a1a');
    expect(ratio).toBeGreaterThan(15);
  });

  it('picks light text for a dark background', () => {
    expect(readableOn('#101014').color).toBe('#ffffff');
  });

  it('adjusts a failing pair until it passes AA', () => {
    const weak = ensureContrast('#f2f2f2', '#ffffff', 4.5);
    expect(weak.adjusted).toBe(true);
    expect(weak.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves a passing pair untouched', () => {
    const ok = ensureContrast('#1a1a1a', '#ffffff', 4.5);
    expect(ok.adjusted).toBe(false);
    expect(ok.color).toBe('#1a1a1a');
  });
});

describe('alpha and lightness', () => {
  it('appends an 8-bit alpha channel', () => {
    expect(withAlpha('#1677ff', 0.5)).toBe('#1677ff80');
    expect(withAlpha('#1677ff', 1)).toBe('#1677ffff');
  });

  it('works on rgb() input rather than producing garbage hex', () => {
    expect(withAlpha('rgb(22, 119, 255)', 0)).toBe('#1677ff00');
  });

  it('lightens in LCH, not by adding to RGB channels', () => {
    const lighter = lighten('#1677ff', 10);
    expect(contrastRatio(lighter, '#ffffff')).toBeLessThan(contrastRatio('#1677ff', '#ffffff'));
  });
});

describe('ramp', () => {
  const steps = ramp('#1677ff');

  it('emits every step', () => {
    expect(Object.keys(steps).map(Number).sort((a, b) => a - b)).toEqual([...RAMP_STEPS]);
  });

  it('keeps the seed colour at 500', () => {
    expect(steps[500]).toBe('#1677ff');
  });

  it('gets monotonically darker as the step number rises', () => {
    const lightness = RAMP_STEPS.map((step) => chroma(steps[step]!).get('lch.l'));
    for (let i = 1; i < lightness.length; i += 1) {
      expect(lightness[i]!).toBeLessThan(lightness[i - 1]!);
    }
  });

  it('reports the readable foreground and its ratio', () => {
    const palette = buildPalette('#1677ff');
    expect(palette.base).toBe('#1677ff');
    expect(palette.onColorContrast).toBeGreaterThan(1);
  });
});

describe('dark derivation', () => {
  it('produces readable text on the dark surface', () => {
    const dark = deriveDarkTheme(normalizeTheme({ surface: '#ffffff', text: '#1a1a1a' }));
    expect(contrastRatio(dark.text, dark.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps brand colours distinguishable from the dark surface', () => {
    const dark = deriveDarkTheme({ primary: '#7c3aed', surface: '#ffffff' });
    expect(contrastRatio(dark.primary, dark.surface)).toBeGreaterThanOrEqual(3);
  });
});
