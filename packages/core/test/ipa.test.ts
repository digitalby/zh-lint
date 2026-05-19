import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import AdmZip from 'adm-zip';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { scan } from '../src/core.js';
import { cleanupTempDir, extractIpaToTemp, isIpaPath } from '../src/ipa.js';
import type { LocalePlugin } from '../src/plugin.js';

function makeForbidBangPlugin(): LocalePlugin {
  return {
    id: 'forbid-bang',
    name: 'Forbid !',
    locales: [['**/zh-Hans.lproj', 'zh-Hans-test'], ['**/en.lproj', 'en-test']],
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
          pluginId: 'forbid-bang',
          variantExpected: input.variant,
          offending: ch,
          message: `bang`,
        });
      }
      return out;
    },
  };
}

function makeFakeIpa(tmpDir: string, fixtureFn: (zip: AdmZip) => void): string {
  const ipaPath = path.join(tmpDir, 'Test.ipa');
  const zip = new AdmZip();
  fixtureFn(zip);
  zip.writeZip(ipaPath);
  return ipaPath;
}

describe('isIpaPath', () => {
  it('detects .ipa extension case-insensitively', () => {
    expect(isIpaPath('/tmp/foo.ipa')).toBe(true);
    expect(isIpaPath('/tmp/foo.IPA')).toBe(true);
    expect(isIpaPath('/tmp/foo.zip')).toBe(false);
    expect(isIpaPath('/tmp/foo')).toBe(false);
  });
});

describe('extractIpaToTemp + scan + cleanupTempDir', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-lint-test-'));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('extracts a fake .ipa with text .strings, populates bundle metadata, and the scan finds violations', () => {
    const ipa = makeFakeIpa(tmp, (zip) => {
      zip.addFile(
        'Payload/Test.app/Info.plist',
        Buffer.from(
          `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleDisplayName</key><string>TestApp</string>
<key>CFBundleIdentifier</key><string>me.digitalby.test</string>
<key>CFBundleShortVersionString</key><string>1.2.3</string>
<key>CFBundleVersion</key><string>42</string>
</dict></plist>`,
        ),
      );
      zip.addFile(
        'Payload/Test.app/zh-Hans.lproj/Localizable.strings',
        Buffer.from('"title" = "hello!";\n', 'utf8'),
      );
    });

    const extracted = extractIpaToTemp(ipa);
    try {
      expect(extracted.appRoot.endsWith('Payload/Test.app')).toBe(true);
      expect(extracted.bundle).toBeDefined();
      expect(extracted.bundle?.name).toBe('TestApp');
      expect(extracted.bundle?.bundleId).toBe('me.digitalby.test');
      expect(extracted.bundle?.version).toBe('1.2.3');
      expect(extracted.bundle?.build).toBe('42');

      const result = scan(extracted.appRoot, loadConfig(null), [makeForbidBangPlugin()]);
      expect(result.violations.length).toBe(1);
      expect(result.violations[0]?.offending).toBe('!');
      expect(result.violations[0]?.variantExpected).toBe('zh-Hans-test');
    } finally {
      cleanupTempDir(extracted.tempDir);
      expect(fs.existsSync(extracted.tempDir)).toBe(false);
    }
  });

  it('rejects a zip without Payload/', () => {
    const ipa = makeFakeIpa(tmp, (zip) => {
      zip.addFile('NotPayload/Test.app/Info.plist', Buffer.from('<plist/>'));
    });
    expect(() => extractIpaToTemp(ipa)).toThrow(/does not contain a Payload\//);
  });

  it('rejects Payload/ without a .app dir', () => {
    const ipa = makeFakeIpa(tmp, (zip) => {
      zip.addFile('Payload/whatever.txt', Buffer.from('nothing'));
    });
    expect(() => extractIpaToTemp(ipa)).toThrow(/does not contain a Payload\/\*\.app\/ bundle/);
  });
});
