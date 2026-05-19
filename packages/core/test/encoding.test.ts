import { describe, expect, it } from 'vitest';
import { decodeStringsBuffer, parseStrings } from '../src/parsers/strings.js';

describe('decodeStringsBuffer', () => {
  it('decodes UTF-8 without BOM', () => {
    const buf = Buffer.from('"k" = "时钟";\n', 'utf8');
    expect(decodeStringsBuffer(buf)).toBe('"k" = "时钟";\n');
  });

  it('strips UTF-8 BOM', () => {
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('"k" = "v";\n')]);
    expect(decodeStringsBuffer(buf)).toBe('"k" = "v";\n');
  });

  it('decodes UTF-16 LE with BOM (legacy Xcode default)', () => {
    const content = '"k" = "时钟";\n';
    const u16 = Buffer.alloc(content.length * 2);
    u16.write(content, 0, 'utf16le');
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), u16]);
    const decoded = decodeStringsBuffer(buf);
    expect(decoded).toBe(content);
    const entries = parseStrings(decoded);
    expect(entries[0]?.value).toBe('时钟');
  });

  it('decodes UTF-16 BE with BOM', () => {
    const content = '"k" = "v";\n';
    const u16le = Buffer.alloc(content.length * 2);
    u16le.write(content, 0, 'utf16le');
    const u16be = Buffer.alloc(u16le.length);
    for (let i = 0; i + 1 < u16le.length; i += 2) {
      u16be[i] = u16le[i + 1]!;
      u16be[i + 1] = u16le[i]!;
    }
    const buf = Buffer.concat([Buffer.from([0xfe, 0xff]), u16be]);
    const decoded = decodeStringsBuffer(buf);
    expect(decoded).toBe(content);
  });
});
