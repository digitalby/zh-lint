import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfig, scan } from '@digitalby/locale-lint';
import chinesePlugin from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, 'fixtures');

describe('scan (end-to-end with chinese plugin)', () => {
  it('clean fixture has zero violations', () => {
    const config = loadConfig(null);
    const result = scan(path.join(fixturesRoot, 'clean'), config, [chinesePlugin]);
    expect(result.violations).toEqual([]);
    expect(result.files).toBe(2);
  });

  it('hans-contaminated fixture flags Traditional chars in Hans file', () => {
    const config = loadConfig(null);
    const result = scan(path.join(fixturesRoot, 'hans-contaminated'), config, [chinesePlugin]);
    expect(result.violations.length).toBeGreaterThan(0);
    const chars = new Set(result.violations.map((v) => v.offending));
    expect(chars.has('體')).toBe(true);
    expect(chars.has('國')).toBe(true);
    expect(chars.has('學')).toBe(true);
    for (const v of result.violations) {
      expect(v.variantExpected).toBe('simplified');
      expect(v.pluginId).toBe('chinese');
      expect(v.file.endsWith('Localizable.strings')).toBe(true);
    }
  });

  it('hant-contaminated fixture flags Simplified chars in Hant file', () => {
    const config = loadConfig(null);
    const result = scan(path.join(fixturesRoot, 'hant-contaminated'), config, [chinesePlugin]);
    expect(result.violations.length).toBeGreaterThan(0);
    const chars = new Set(result.violations.map((v) => v.offending));
    expect(chars.has('视')).toBe(true);
    expect(chars.has('开')).toBe(true);
    expect(chars.has('国')).toBe(true);
    for (const v of result.violations) {
      expect(v.variantExpected).toBe('traditional');
    }
  });

  it('allowlisted fixture passes when allow_chars permits Traditional in Hans', () => {
    const allowDir = path.join(fixturesRoot, 'allowlisted');
    const config = loadConfig(path.join(allowDir, '.zh-lint.yml'));
    const result = scan(allowDir, config, [chinesePlugin]);
    expect(result.violations).toEqual([]);
  });
});
