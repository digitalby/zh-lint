import { Converter } from 'opencc-js';
import type { ParsedStringEntry } from './parsers/strings.js';
import type { Config, Script, Violation } from './types.js';

const t2s = Converter({ from: 'tw', to: 'cn' });
const s2t = Converter({ from: 'cn', to: 'tw' });

function isCJK(cp: string): boolean {
  const code = cp.codePointAt(0);
  if (code === undefined) return false;
  return (
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x20000 && code <= 0x2a6df) ||
    (code >= 0x2a700 && code <= 0x2ebef) ||
    (code >= 0x30000 && code <= 0x3134f) ||
    (code >= 0xf900 && code <= 0xfaff)
  );
}

export function detectInEntry(
  filePath: string,
  entry: ParsedStringEntry,
  expectedScript: Script,
  config: Config,
): Violation[] {
  if (config.allowStrings.has(entry.value)) return [];
  const violations: Violation[] = [];
  const convert = expectedScript === 'simplified' ? t2s : s2t;
  const oppositeScript: Script = expectedScript === 'simplified' ? 'traditional' : 'simplified';
  for (let i = 0; i < entry.valueChars.length; i++) {
    const ch = entry.valueChars[i]!;
    if (!isCJK(ch)) continue;
    if (config.allowChars.has(ch)) continue;
    const converted = convert(ch);
    if (converted === ch) continue;
    violations.push({
      file: filePath,
      line: entry.charLines[i] ?? entry.valueLine,
      col: entry.charCols[i] ?? entry.valueCol,
      key: entry.key,
      char: ch,
      expectedScript,
      actualScriptHint: oppositeScript,
      message: `${oppositeScript} character "${ch}" in ${scriptLabel(expectedScript)} file (key="${entry.key}")`,
    });
  }
  return violations;
}

function scriptLabel(s: Script): string {
  return s === 'simplified' ? 'zh-Hans' : 'zh-Hant';
}
