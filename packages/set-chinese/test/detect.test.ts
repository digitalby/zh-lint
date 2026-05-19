import { describe, expect, it } from 'vitest';
import { parseStrings } from '@digitalby/locale-lint';
import chinesePlugin from '../src/index.js';

function parseOne(src: string) {
  const entries = parseStrings(src);
  const entry = entries[0];
  if (!entry) throw new Error('no entry parsed');
  return entry;
}

const empty = {
  allowChars: new Set<string>(),
  allowStrings: new Set<string>(),
};

describe('chinese plugin detect()', () => {
  it('flags Traditional-exclusive char in Hans file', () => {
    const entry = parseOne(`"k" = "身體";\n`);
    const v = chinesePlugin.detect({
      file: '/tmp/zh-Hans.lproj/x.strings',
      entry,
      variant: 'simplified',
      ...empty,
    });
    expect(v).toHaveLength(1);
    expect(v[0]?.offending).toBe('體');
    expect(v[0]?.variantExpected).toBe('simplified');
    expect(v[0]?.variantHint).toBe('traditional');
    expect(v[0]?.pluginId).toBe('chinese');
  });

  it('flags Simplified-exclusive chars in Hant file', () => {
    const entry = parseOne(`"k" = "视频";\n`);
    const v = chinesePlugin.detect({
      file: '/tmp/zh-Hant.lproj/x.strings',
      entry,
      variant: 'traditional',
      ...empty,
    });
    expect(v.map((x) => x.offending)).toEqual(['视', '频']);
  });

  it('emits no violations for shared chars', () => {
    const entry = parseOne(`"k" = "繁";\n`);
    expect(
      chinesePlugin.detect({ file: '/tmp/x.strings', entry, variant: 'simplified', ...empty }),
    ).toEqual([]);
    expect(
      chinesePlugin.detect({ file: '/tmp/x.strings', entry, variant: 'traditional', ...empty }),
    ).toEqual([]);
  });

  it('ignores non-CJK characters entirely', () => {
    const entry = parseOne(`"k" = "Hello, 时钟! 123";\n`);
    expect(
      chinesePlugin.detect({ file: '/tmp/x.strings', entry, variant: 'simplified', ...empty }),
    ).toEqual([]);
  });

  it('honors allow_chars', () => {
    const entry = parseOne(`"k" = "髮體";\n`);
    const v = chinesePlugin.detect({
      file: '/tmp/x.strings',
      entry,
      variant: 'simplified',
      allowChars: new Set(['髮', '體']),
      allowStrings: new Set(),
    });
    expect(v).toEqual([]);
  });

  it('honors allow_strings (whole-value)', () => {
    const entry = parseOne(`"k" = "身體";\n`);
    const v = chinesePlugin.detect({
      file: '/tmp/x.strings',
      entry,
      variant: 'simplified',
      allowChars: new Set(),
      allowStrings: new Set(['身體']),
    });
    expect(v).toEqual([]);
  });

  it('reports correct line and column for offending CJK char', () => {
    const entry = parseOne(`"k" = "时钟學习";\n`);
    const v = chinesePlugin.detect({
      file: '/tmp/zh-Hans.lproj/x.strings',
      entry,
      variant: 'simplified',
      ...empty,
    });
    expect(v).toHaveLength(1);
    expect(v[0]?.offending).toBe('學');
    expect(v[0]?.line).toBe(1);
    expect(v[0]?.col).toBe(10);
  });
});
