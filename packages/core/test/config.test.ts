import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigError, findConfig, loadConfig } from '../src/config.js';

describe('config', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-lint-cfg-'));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns built-in defaults when no config file is given', () => {
    const cfg = loadConfig(null);
    expect(cfg.locales).toEqual({});
    expect(cfg.plugins).toBeNull();
    expect(cfg.allowChars.size).toBe(0);
    expect(cfg.allowStrings.size).toBe(0);
    expect(cfg.ignore.length).toBeGreaterThan(0);
  });

  it('parses the new schema with plugins, locales, allowlists', () => {
    const p = path.join(tmp, '.locale-lint.yml');
    fs.writeFileSync(
      p,
      [
        'plugins:',
        '  - "@digitalby/locale-lint-chinese"',
        'locales:',
        '  "**/zh-HK.lproj": traditional',
        'allow_strings:',
        '  - "Acme Corp"',
        'allow_chars:',
        '  - "髮"',
        'ignore:',
        '  - "**/*.generated.strings"',
      ].join('\n'),
    );
    const cfg = loadConfig(p);
    expect(cfg.plugins).toEqual(['@digitalby/locale-lint-chinese']);
    expect(cfg.locales).toEqual({ '**/zh-HK.lproj': 'traditional' });
    expect(cfg.allowStrings.has('Acme Corp')).toBe(true);
    expect(cfg.allowChars.has('髮')).toBe(true);
    expect(cfg.ignore).toContain('**/*.generated.strings');
  });

  it('rejects non-string variant values', () => {
    const p = path.join(tmp, '.locale-lint.yml');
    fs.writeFileSync(p, 'locales:\n  "**/x.lproj": 42\n');
    expect(() => loadConfig(p)).toThrow(ConfigError);
  });

  it('rejects non-mapping top-level', () => {
    const p = path.join(tmp, '.locale-lint.yml');
    fs.writeFileSync(p, '- one\n- two\n');
    expect(() => loadConfig(p)).toThrow(ConfigError);
  });

  it('findConfig prefers .locale-lint.yml over .zh-lint.yml', () => {
    fs.writeFileSync(path.join(tmp, '.locale-lint.yml'), '');
    fs.writeFileSync(path.join(tmp, '.zh-lint.yml'), '');
    expect(findConfig(tmp)).toBe(path.join(tmp, '.locale-lint.yml'));
  });

  it('findConfig falls back to .zh-lint.yml for legacy projects', () => {
    fs.writeFileSync(path.join(tmp, '.zh-lint.yml'), '');
    expect(findConfig(tmp)).toBe(path.join(tmp, '.zh-lint.yml'));
  });

  it('findConfig walks up parent directories', () => {
    const sub = path.join(tmp, 'a', 'b', 'c');
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(tmp, '.locale-lint.yml'), '');
    expect(findConfig(sub)).toBe(path.join(tmp, '.locale-lint.yml'));
  });
});
