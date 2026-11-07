/**
 * theme-bridge CLI.
 *
 *   npx theme-bridge --primary "#7c3aed" --out ./theme
 *   npx theme-bridge --preset brand.json --dark --check
 *
 * Writes antd.ts, tailwind.css, tokens.css and tokens.json. `--check` runs the
 * contrast audit and exits non-zero when a readable pair fails AA, so it can be
 * wired into CI as a design-system guard.
 *
 * Zero CLI dependencies on purpose: this ships as a devDependency in other
 * people's repos, and an argument parser is not worth an install.
 */
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTheme, generateAntdConfig, generateCSSVars, generateTailwindConfig } from './index.js';
import type { ThemeTokens } from './types.js';

interface Args {
  tokens: Partial<ThemeTokens>;
  out: string;
  dark: boolean;
  check: boolean;
  json: boolean;
  help: boolean;
}

const TOKEN_FLAGS: Record<string, keyof ThemeTokens> = {
  '--primary': 'primary',
  '-p': 'primary',
  '--secondary': 'secondary',
  '-s': 'secondary',
  '--accent': 'accent',
  '-a': 'accent',
  '--surface': 'surface',
  '--text': 'text',
  '-t': 'text',
};

export function parseArgs(argv: string[]): Args {
  const out: Args = { tokens: {}, out: './theme', dark: true, check: false, json: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    const [flag, inline] = arg.includes('=') ? arg.split(/=(.*)/s, 2) : [arg, undefined];
    const next = inline ?? argv[i + 1];
    const consume = () => {
      if (inline === undefined) i += 1;
    };

    switch (flag) {
      case '--help':
      case '-h':
        out.help = true;
        break;
      case '--out':
      case '-o':
        out.out = next ?? out.out;
        consume();
        break;
      case '--preset':
        if (next) {
          out.tokens = { ...out.tokens, ...(JSON.parse(readFileSync(resolve(next), 'utf8')) as Partial<ThemeTokens>) };
          consume();
        }
        break;
      case '--dark':
        out.dark = true;
        break;
      case '--no-dark':
        out.dark = false;
        break;
      case '--check':
        out.check = true;
        break;
      case '--json':
        out.json = true;
        break;
      default:
        if (TOKEN_FLAGS[flag] && next) {
          out.tokens[TOKEN_FLAGS[flag] as keyof ThemeTokens] = next;
          consume();
        } else if (flag.startsWith('-')) {
          throw new Error(`Unknown flag: ${flag}`);
        }
    }
  }
  return out;
}

const HELP = `
theme-bridge — one brand palette in, framework themes out

Usage
  theme-bridge [options]

Options
  -p, --primary <hex>     Primary brand colour
  -s, --secondary <hex>   Secondary colour
  -a, --accent <hex>      Accent / CTA colour
      --surface <hex>     Surface / background colour   (default #ffffff)
  -t, --text <hex>        Text colour                   (default #1a1a1a)
  -o, --out <dir>         Output directory               (default ./theme)
      --preset <file>     JSON file of token overrides
      --no-dark           Skip the derived dark palette
      --check             Exit 1 when a readable pair fails WCAG AA
      --json              Print the resolved tokens as JSON instead of writing files
  -h, --help              Show this help

Examples
  theme-bridge --primary "#7c3aed" --out ./src/theme
  theme-bridge --preset brand.json --check
`;

export function main(argv = process.argv.slice(2)): number {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 2;
  }

  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const theme = buildTheme(args.tokens);

  if (args.json) {
    process.stdout.write(
      `${JSON.stringify({ tokens: theme.tokens, dark: theme.dark, contrast: theme.contrast, warnings: theme.warnings }, null, 2)}\n`,
    );
    return args.check && theme.warnings.length > 0 ? 1 : 0;
  }

  const dir = resolve(args.out);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'antd.ts'), generateAntdConfig(theme.tokens));
  writeFileSync(join(dir, 'tailwind.css'), generateTailwindConfig(theme.tokens));
  writeFileSync(join(dir, 'tokens.css'), generateCSSVars(theme.tokens, args.dark ? theme.dark : undefined));
  writeFileSync(
    join(dir, 'tokens.json'),
    `${JSON.stringify({ light: theme.tokens, dark: theme.dark, ramps: theme.palettes, contrast: theme.contrast }, null, 2)}\n`,
  );

  process.stdout.write(`theme-bridge: wrote 4 files to ${dir}\n`);
  for (const report of theme.contrast) {
    process.stdout.write(`  ${report.passesAA ? 'pass' : 'FAIL'}  ${report.pair} — ${report.ratio}:1\n`);
  }

  if (args.check && theme.warnings.length > 0) {
    process.stderr.write(`\n${theme.warnings.length} contrast warning(s). Fix the palette or accept the risk explicitly.\n`);
    return 1;
  }
  return 0;
}

const isMainModule = (() => {
  // Vitest imports this file, so "is this the entry point" must be answered by
  // comparing real paths — a substring check matches the project directory too.
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMainModule) {
  process.exit(main());
}
