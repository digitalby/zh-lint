import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Config, Script } from './types.js';

const DEFAULT_CONFIG_NAMES = ['.zh-lint.yml', '.zh-lint.yaml'];

const DEFAULT_LOCALES: Record<string, Script> = {
  '**/zh-Hans*.lproj': 'simplified',
  '**/zh-Hant*.lproj': 'traditional',
  '**/zh-HK.lproj': 'traditional',
  '**/zh-MO.lproj': 'traditional',
  '**/zh-TW.lproj': 'traditional',
  '**/zh-SG.lproj': 'simplified',
  '**/zh-CN.lproj': 'simplified',
};

const DEFAULT_IGNORE: string[] = ['**/node_modules/**', '**/Pods/**', '**/.git/**'];

export class ConfigError extends Error {}

export function findConfig(startDir: string): string | null {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  while (true) {
    for (const name of DEFAULT_CONFIG_NAMES) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
    if (dir === root) return null;
    dir = path.dirname(dir);
  }
}

export function loadConfig(configPath: string | null): Config {
  if (configPath === null) {
    return {
      locales: { ...DEFAULT_LOCALES },
      ignore: [...DEFAULT_IGNORE],
      allowStrings: new Set(),
      allowChars: new Set(),
    };
  }
  const raw = fs.readFileSync(configPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (e) {
    throw new ConfigError(`Failed to parse ${configPath}: ${(e as Error).message}`);
  }
  if (parsed === null || parsed === undefined) {
    return {
      locales: { ...DEFAULT_LOCALES },
      ignore: [...DEFAULT_IGNORE],
      allowStrings: new Set(),
      allowChars: new Set(),
    };
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ConfigError(`${configPath}: top-level must be a mapping`);
  }
  const obj = parsed as Record<string, unknown>;
  const locales: Record<string, Script> = { ...DEFAULT_LOCALES };
  if (obj.locales !== undefined) {
    if (typeof obj.locales !== 'object' || obj.locales === null || Array.isArray(obj.locales)) {
      throw new ConfigError(`${configPath}: 'locales' must be a mapping of glob → script`);
    }
    for (const [glob, script] of Object.entries(obj.locales as Record<string, unknown>)) {
      if (script !== 'simplified' && script !== 'traditional') {
        throw new ConfigError(
          `${configPath}: locale '${glob}' must map to 'simplified' or 'traditional', got '${String(script)}'`,
        );
      }
      locales[glob] = script;
    }
  }
  const ignore: string[] = [...DEFAULT_IGNORE];
  if (obj.ignore !== undefined) {
    if (!Array.isArray(obj.ignore)) {
      throw new ConfigError(`${configPath}: 'ignore' must be an array of globs`);
    }
    for (const g of obj.ignore) {
      if (typeof g !== 'string') {
        throw new ConfigError(`${configPath}: 'ignore' entries must be strings`);
      }
      ignore.push(g);
    }
  }
  const allowStrings = new Set<string>();
  if (obj.allow_strings !== undefined) {
    if (!Array.isArray(obj.allow_strings)) {
      throw new ConfigError(`${configPath}: 'allow_strings' must be an array`);
    }
    for (const s of obj.allow_strings) {
      if (typeof s !== 'string') {
        throw new ConfigError(`${configPath}: 'allow_strings' entries must be strings`);
      }
      allowStrings.add(s);
    }
  }
  const allowChars = new Set<string>();
  if (obj.allow_chars !== undefined) {
    if (!Array.isArray(obj.allow_chars)) {
      throw new ConfigError(`${configPath}: 'allow_chars' must be an array`);
    }
    for (const ch of obj.allow_chars) {
      if (typeof ch !== 'string') {
        throw new ConfigError(`${configPath}: 'allow_chars' entries must be strings`);
      }
      for (const cp of ch) allowChars.add(cp);
    }
  }
  return { locales, ignore, allowStrings, allowChars };
}

export const DEFAULT_INIT_CONFIG = `# zh-lint configuration.
# All keys are optional; defaults already cover standard iOS/Android layouts.

# locales:
#   "**/zh-HK.lproj": traditional
#   "**/zh-SG.lproj": simplified

# ignore:
#   - "**/*.generated.strings"

# allow_strings:
#   - "App Store"

# allow_chars:
#   - "髮"
`;
