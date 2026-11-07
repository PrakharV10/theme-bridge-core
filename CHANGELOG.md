# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Colour engine built on chroma-js: `normalizeColor`, `lighten`, `darken`, `mix`,
  `withAlpha`, `luminance`, `contrastRatio`, `meetsAA`, `readableOn`,
  `ensureContrast`, `ramp`, `buildPalette`, `deriveDarkTheme`.
- WCAG contrast audit across the four pairs that ship, surfaced as
  `ThemeBundle.contrast` / `ThemeBundle.warnings`.
- 50–900 tint/shade ramp per token, generated in LCH.
- Dark palette derived from the light tokens, with contrast enforced.
- Emitters for Ant Design 5 (`ThemeConfig`), Tailwind v4 (`@theme inline`) and
  framework-agnostic CSS custom properties (`:root` + `[data-theme="dark"]`).
- CLI with zero dependencies: token flags, `--preset`, `--out`, `--json`,
  `--no-dark`, `--check` (exit 1 on a failing contrast pair).
- 39 tests covering colour maths, generators and the CLI contract.

### Changed
- Lightening/darkening moved from RGB channel arithmetic to LCH, so saturation
  survives.
- Contrast now uses WCAG relative luminance instead of the luma approximation.
- `withAlpha` normalises its input first; the previous version appended an alpha
  byte to whatever string it was given, producing invalid CSS for `rgb()` input.
- The three emitters no longer each carry their own copy of the colour helpers.

## [0.1.0] - 2026-11-07

First working version of the standalone package, extracted from the
theme-bridge visual configurator.
