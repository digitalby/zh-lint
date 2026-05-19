import { Converter } from 'opencc-js';
import type { DetectInput, LocalePlugin, Violation } from '@digitalby/locale-lint';

const t2s = Converter({ from: 'tw', to: 'cn' });
const s2t = Converter({ from: 'cn', to: 'tw' });

const SIMPLIFIED = 'simplified';
const TRADITIONAL = 'traditional';

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

function scriptLabel(variant: string): string {
  return variant === SIMPLIFIED ? 'zh-Hans' : 'zh-Hant';
}

function detect(input: DetectInput): Violation[] {
  if (input.allowStrings.has(input.entry.value)) return [];
  const violations: Violation[] = [];
  const convert = input.variant === SIMPLIFIED ? t2s : s2t;
  const opposite = input.variant === SIMPLIFIED ? TRADITIONAL : SIMPLIFIED;
  for (let i = 0; i < input.entry.valueChars.length; i++) {
    const ch = input.entry.valueChars[i]!;
    if (!isCJK(ch)) continue;
    if (input.allowChars.has(ch)) continue;
    const converted = convert(ch);
    if (converted === ch) continue;
    violations.push({
      file: input.file,
      line: input.entry.charLines[i] ?? input.entry.valueLine,
      col: input.entry.charCols[i] ?? input.entry.valueCol,
      key: input.entry.key,
      pluginId: 'chinese',
      variantExpected: input.variant,
      variantHint: opposite,
      offending: ch,
      message: `${opposite} character "${ch}" in ${scriptLabel(input.variant)} file (key="${input.entry.key}")`,
    });
  }
  return violations;
}

const plugin: LocalePlugin = {
  id: 'chinese',
  name: 'Chinese (Simplified vs Traditional)',
  locales: [
    ['**/zh-Hans*.lproj', SIMPLIFIED],
    ['**/zh-CN.lproj', SIMPLIFIED],
    ['**/zh-SG.lproj', SIMPLIFIED],
    ['**/zh-Hant*.lproj', TRADITIONAL],
    ['**/zh-HK.lproj', TRADITIONAL],
    ['**/zh-TW.lproj', TRADITIONAL],
    ['**/zh-MO.lproj', TRADITIONAL],
  ],
  detect,
};

export default plugin;
export { plugin };
