import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import AdmZip from 'adm-zip';
import { isBinaryPlist, parseBinaryPlistStrings } from './parsers/strings.js';

export interface BundleMetadata {
  name: string;
  bundleId: string;
  version: string;
  build: string;
}

export interface ExtractedIpa {
  /** Absolute path to `<tmp>/Payload/<App>.app/`. Pass to scan() as the root. */
  appRoot: string;
  /** Absolute path to the temp dir created by extraction. Pass to cleanupTempDir. */
  tempDir: string;
  /** Parsed Info.plist when available; undefined if not present. */
  bundle?: BundleMetadata;
}

export function isIpaPath(p: string): boolean {
  return p.toLowerCase().endsWith('.ipa');
}

export function extractIpaToTemp(ipaPath: string): ExtractedIpa {
  if (!fs.existsSync(ipaPath) || !fs.statSync(ipaPath).isFile()) {
    throw new Error(`Not a file: ${ipaPath}`);
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-lint-ipa-'));
  let zip: AdmZip;
  try {
    zip = new AdmZip(ipaPath);
  } catch (e) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to open ${ipaPath} as a zip archive: ${(e as Error).message}`);
  }
  try {
    zip.extractAllTo(tempDir, true);
  } catch (e) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to extract ${ipaPath}: ${(e as Error).message}`);
  }
  const payloadDir = path.join(tempDir, 'Payload');
  if (!fs.existsSync(payloadDir) || !fs.statSync(payloadDir).isDirectory()) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`${ipaPath} does not contain a Payload/ directory (not a valid iOS .ipa?)`);
  }
  const payloadEntries = fs.readdirSync(payloadDir, { withFileTypes: true });
  const appDirEntry = payloadEntries.find((e) => e.isDirectory() && e.name.endsWith('.app'));
  if (!appDirEntry) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`${ipaPath} does not contain a Payload/*.app/ bundle`);
  }
  const appRoot = path.join(payloadDir, appDirEntry.name);
  const bundle = readBundleMetadata(appRoot);
  return bundle === undefined ? { appRoot, tempDir } : { appRoot, tempDir, bundle };
}

export function cleanupTempDir(tempDir: string): void {
  if (!tempDir.includes('locale-lint-ipa-')) return;
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function readBundleMetadata(appRoot: string): BundleMetadata | undefined {
  const infoPlistPath = path.join(appRoot, 'Info.plist');
  if (!fs.existsSync(infoPlistPath)) return undefined;
  let buf: Buffer;
  try {
    buf = fs.readFileSync(infoPlistPath);
  } catch {
    return undefined;
  }
  if (isBinaryPlist(buf)) {
    return readBundleFromBinaryPlist(buf, appRoot);
  }
  return readBundleFromXmlPlist(buf.toString('utf8'), appRoot);
}

function readBundleFromBinaryPlist(buf: Buffer, appRoot: string): BundleMetadata {
  const fallbackName = path.basename(appRoot, '.app');
  try {
    const entries = parseBinaryPlistStrings(buf);
    const lookup = new Map<string, string>();
    for (const entry of entries) lookup.set(entry.key, entry.value);
    return {
      name:
        lookup.get('CFBundleDisplayName') ??
        lookup.get('CFBundleName') ??
        fallbackName,
      bundleId: lookup.get('CFBundleIdentifier') ?? 'unknown',
      version: lookup.get('CFBundleShortVersionString') ?? 'unknown',
      build: lookup.get('CFBundleVersion') ?? 'unknown',
    };
  } catch {
    return {
      name: fallbackName,
      bundleId: 'unknown',
      version: 'unknown',
      build: 'unknown',
    };
  }
}

function readBundleFromXmlPlist(xml: string, appRoot: string): BundleMetadata {
  const fallbackName = path.basename(appRoot, '.app');
  return {
    name: extractPlistString(xml, 'CFBundleDisplayName') ??
      extractPlistString(xml, 'CFBundleName') ??
      fallbackName,
    bundleId: extractPlistString(xml, 'CFBundleIdentifier') ?? 'unknown',
    version: extractPlistString(xml, 'CFBundleShortVersionString') ?? 'unknown',
    build: extractPlistString(xml, 'CFBundleVersion') ?? 'unknown',
  };
}

function extractPlistString(xml: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<key>${escaped}</key>\\s*<string>([^<]*)</string>`,
    'm',
  );
  const m = re.exec(xml);
  return m ? m[1] : undefined;
}
