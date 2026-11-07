export interface ThemeTokens {
  /** Main brand colour — buttons, links, active states. */
  primary: string;
  /** Complementary colour — tags, highlights, secondary actions. */
  secondary: string;
  /** Call-to-action colour — notifications, badges, emphasis. */
  accent: string;
  /** Background colour — cards, panels, page background. */
  surface: string;
  /** Body text colour. */
  text: string;
}

export type TokenKey = keyof ThemeTokens;

export type Framework = 'antd' | 'tailwind' | 'css-vars';

export interface Palette {
  /** 50 → 900 tint/shade ramp. */
  ramp: Record<number, string>;
  /** The seed colour, normalised. */
  base: string;
  /** Readable text colour to place on this colour. */
  onColor: string;
  /** Contrast ratio between `onColor` and `base`. */
  onColorContrast: number;
}

export interface ContrastReport {
  pair: string;
  ratio: number;
  passesAA: boolean;
  passesAALarge: boolean;
  passesAAA: boolean;
}

export interface ThemeBundle {
  tokens: ThemeTokens;
  dark: ThemeTokens;
  palettes: Record<TokenKey, Palette>;
  contrast: ContrastReport[];
  warnings: string[];
}

export const DEFAULT_THEME: ThemeTokens = {
  primary: '#1677ff',
  secondary: '#722ed1',
  accent: '#13c2c2',
  surface: '#ffffff',
  text: '#1a1a1a',
};

export const TOKEN_LABELS: Record<TokenKey, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  surface: 'Surface',
  text: 'Text',
};

export const TOKEN_DESCRIPTIONS: Record<TokenKey, string> = {
  primary: 'Main brand color — buttons, links, active states',
  secondary: 'Complementary color — tags, highlights, secondary actions',
  accent: 'Call-to-action color — notifications, badges, emphasis',
  surface: 'Background color — cards, panels, page background',
  text: 'Text color — body copy, headings, labels',
};

export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
