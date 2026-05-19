import { describe, expect, it } from 'vitest';
import { detectInEntry } from '../src/detect.js';
import { parseStrings } from '../src/parsers/strings.js';
import type { Config } from '../src/types.js';

const emptyConfig: Config = {
  locales: {},
  ignore: [],
  allowStrings: new Set(),
  allowChars: new Set(),
};

function parseOne(src: string) {
  const entries = parseStrings(src);
  const entry = entries[0];
  if (!entry) throw new Error('no entry parsed');
  return entry;
}

describe('detectInEntry', () => {
  it('flags Traditional-exclusive char in Hans file', () => {
    const entry = parseOne(`"k" = "身體";\n`);
    const v = detectInEntry('/tmp/zh-Hans.lproj/x.strings', entry, 'simplified', emptyConfig);
    expect(v).toHaveLength(1);
    expect(v[0]?.char).toBe('體');
    expect(v[0]?.expectedScript).toBe('simplified');
    expect(v[0]?.actualScriptHint).toBe('traditional');
  });

  it('flags Simplified-exclusive chars in Hant file', () => {
    const entry = parseOne(`"k" = "视频";\n`);
    const v = detectInEntry('/tmp/zh-Hant.lproj/x.strings', entry, 'traditional', emptyConfig);
    expect(v.map((x) => x.char)).toEqual(['视', '频']);
    for (const x of v) {
      expect(x.expectedScript).toBe('traditional');
      expect(x.actualScriptHint).toBe('simplified');
    }
  });

  it('emits no violations for shared chars', () => {
    const entry = parseOne(`"k" = "繁";\n`);
    expect(detectInEntry('/tmp/x.strings', entry, 'simplified', emptyConfig)).toEqual([]);
    expect(detectInEntry('/tmp/x.strings', entry, 'traditional', emptyConfig)).toEqual([]);
  });

  it('ignores non-CJK characters entirely', () => {
    const entry = parseOne(`"k" = "Hello, 时钟! 123";\n`);
    expect(detectInEntry('/tmp/x.strings', entry, 'simplified', emptyConfig)).toEqual([]);
  });

  it('honors allow_chars', () => {
    const entry = parseOne(`"k" = "髮體";\n`);
    const config: Config = {
      ...emptyConfig,
      allowChars: new Set(['髮', '體']),
    };
    expect(detectInEntry('/tmp/x.strings', entry, 'simplified', config)).toEqual([]);
  });

  it('honors allow_strings (whole-value)', () => {
    const entry = parseOne(`"k" = "身體";\n`);
    const config: Config = { ...emptyConfig, allowStrings: new Set(['身體']) };
    expect(detectInEntry('/tmp/x.strings', entry, 'simplified', config)).toEqual([]);
  });

  it('reports correct line and column for offending CJK char', () => {
    const entry = parseOne(`"k" = "时钟學习";\n`);
    const v = detectInEntry('/tmp/zh-Hans.lproj/x.strings', entry, 'simplified', emptyConfig);
    expect(v).toHaveLength(1);
    expect(v[0]?.char).toBe('學');
    expect(v[0]?.line).toBe(1);
    expect(v[0]?.col).toBe(10);
  });
});
