import { describe, expect, it } from 'vitest';
import { parseStrings } from '../src/parsers/strings.js';

describe('parseStrings', () => {
  it('parses key/value pairs with positions', () => {
    const src = `"hello" = "world";\n"foo" = "bar";\n`;
    const entries = parseStrings(src);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.key).toBe('hello');
    expect(entries[0]?.value).toBe('world');
    expect(entries[0]?.valueLine).toBe(1);
    expect(entries[0]?.valueCol).toBe(12);
    expect(entries[1]?.valueLine).toBe(2);
  });

  it('skips C-style and line comments', () => {
    const src = `/* greeting */\n// hi\n"hello" = "world";\n`;
    const entries = parseStrings(src);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.valueLine).toBe(3);
  });

  it('decodes \\n and \\" escapes and tracks code-point columns', () => {
    const src = `"k" = "a\\nb";\n`;
    const entries = parseStrings(src);
    expect(entries[0]?.value).toBe('a\nb');
    expect(entries[0]?.valueChars).toEqual(['a', '\n', 'b']);
  });

  it('tracks per-character columns for CJK content', () => {
    const src = `"k" = "时钟小组件";\n`;
    const entries = parseStrings(src);
    expect(entries[0]?.valueChars).toEqual(['时', '钟', '小', '组', '件']);
    expect(entries[0]?.charCols).toEqual([8, 9, 10, 11, 12]);
    expect(entries[0]?.charLines.every((l) => l === 1)).toBe(true);
  });

  it('handles BOM at start', () => {
    const src = `﻿"k" = "v";\n`;
    const entries = parseStrings(src);
    expect(entries[0]?.key).toBe('k');
    expect(entries[0]?.value).toBe('v');
  });

  it('throws on unterminated string', () => {
    expect(() => parseStrings(`"k" = "v`)).toThrow();
  });
});
