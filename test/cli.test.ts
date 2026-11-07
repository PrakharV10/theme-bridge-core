import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, parseArgs } from '../src/cli.js';

describe('parseArgs', () => {
  it('reads token flags in both spellings', () => {
    const args = parseArgs(['--primary', '#7c3aed', '-s', '#0ea5e9']);
    expect(args.tokens.primary).toBe('#7c3aed');
    expect(args.tokens.secondary).toBe('#0ea5e9');
  });

  it('supports --flag=value', () => {
    expect(parseArgs(['--primary=#111111']).tokens.primary).toBe('#111111');
  });

  it('honours --no-dark', () => {
    expect(parseArgs(['--no-dark']).dark).toBe(false);
    expect(parseArgs([]).dark).toBe(true);
  });

  it('rejects unknown flags instead of silently ignoring them', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/Unknown flag/);
  });
});

describe('main', () => {
  it('prints JSON when asked and returns 0 for a clean palette', () => {
    const code = main(['--json', '--primary', '#111111', '--surface', '#ffffff', '--text', '#ffffff']);
    expect(code).toBe(0);
  });

  it('returns 1 under --check when a pair fails AA', () => {
    expect(main(['--json', '--check', '--text', '#f5f5f5', '--surface', '#ffffff'])).toBe(1);
  });

  it('writes the four expected files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'theme-bridge-'));
    try {
      const code = main(['--primary', '#7c3aed', '--out', dir]);
      expect(code).toBe(0);
      const antd = readFileSync(join(dir, 'antd.ts'), 'utf8');
      const tokensJson = JSON.parse(readFileSync(join(dir, 'tokens.json'), 'utf8')) as { light: { primary: string } };
      expect(antd).toContain('#7c3aed');
      expect(tokensJson.light.primary).toBe('#7c3aed');
      expect(readFileSync(join(dir, 'tailwind.css'), 'utf8')).toContain('@theme inline');
      expect(readFileSync(join(dir, 'tokens.css'), 'utf8')).toContain('[data-theme="dark"]');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns 2 on a bad flag', () => {
    expect(main(['--nope'])).toBe(2);
  });
});
