import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { scan } from '../src/core.js';
import type { LocalePlugin } from '../src/plugin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, '_fixtures');

function makeBangPlugin(): LocalePlugin {
  return {
    id: 'mock-bang',
    name: 'Forbid !',
    locales: [['**/mock.lproj', 'mock-bang-variant']],
    detect(input) {
      const out = [];
      for (let i = 0; i < input.entry.valueChars.length; i++) {
        const ch = input.entry.valueChars[i]!;
        if (ch !== '!') continue;
        out.push({
          file: input.file,
          line: input.entry.charLines[i] ?? input.entry.valueLine,
          col: input.entry.charCols[i] ?? input.entry.valueCol,
          key: input.entry.key,
          pluginId: 'mock-bang',
          variantExpected: input.variant,
          offending: ch,
          message: `bang in ${input.variant}`,
        });
      }
      return out;
    },
  };
}

function makeDotPlugin(): LocalePlugin {
  return {
    id: 'mock-dot',
    name: 'Forbid .',
    locales: [['**/mock.lproj', 'mock-dot-variant']],
    detect(input) {
      const out = [];
      for (let i = 0; i < input.entry.valueChars.length; i++) {
        const ch = input.entry.valueChars[i]!;
        if (ch !== '.') continue;
        out.push({
          file: input.file,
          line: input.entry.charLines[i] ?? input.entry.valueLine,
          col: input.entry.charCols[i] ?? input.entry.valueCol,
          key: input.entry.key,
          pluginId: 'mock-dot',
          variantExpected: input.variant,
          offending: ch,
          message: `dot in ${input.variant}`,
        });
      }
      return out;
    },
  };
}

describe('multi-plugin per file', () => {
  it('both plugins fire when their globs overlap on the same file', () => {
    const config = loadConfig(null);
    const result = scan(fixturesRoot, config, [makeBangPlugin(), makeDotPlugin()]);
    expect(result.files).toBe(1);
    const ids = new Set(result.violations.map((v) => v.pluginId));
    expect(ids.has('mock-bang')).toBe(true);
    expect(ids.has('mock-dot')).toBe(true);
    const bang = result.violations.filter((v) => v.pluginId === 'mock-bang');
    expect(bang.length).toBeGreaterThan(0);
    expect(bang[0]?.offending).toBe('!');
    const dot = result.violations.filter((v) => v.pluginId === 'mock-dot');
    expect(dot.length).toBeGreaterThan(0);
    expect(dot[0]?.offending).toBe('.');
  });

  it('counts each underlying file once in the files total even with multiple plugins', () => {
    const config = loadConfig(null);
    const result = scan(fixturesRoot, config, [makeBangPlugin(), makeDotPlugin()]);
    expect(result.files).toBe(1);
  });
});
