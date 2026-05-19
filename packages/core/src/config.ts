import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Config } from './types.js';

const DEFAULT_CONFIG_NAMES = [
  '.locale-lint.yml',
  '.locale-lint.yaml',
  '.zh-lint.yml',
  '.zh-lint.yaml',
];

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
  if (configPath === null) return defaultConfig();
  const raw = fs.readFileSync(configPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (e) {
    throw new ConfigError(`Failed to parse ${configPath}: ${(e as Error).message}`);
  }
  if (parsed === null || parsed === undefined) return defaultConfig();
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ConfigError(`${configPath}: top-level must be a mapping`);
  }
  const obj = parsed as Record<string, unknown>;
  const config = defaultConfig();
  if (obj.locales !== undefined) {
    if (typeof obj.locales !== 'object' || obj.locales === null || Array.isArray(obj.locales)) {
      throw new ConfigError(`${configPath}: 'locales' must be a mapping of glob → variant`);
    }
    for (const [glob, variant] of Object.entries(obj.locales as Record<string, unknown>)) {
      if (typeof variant !== 'string') {
        throw new ConfigError(
          `${configPath}: locale '${glob}' must map to a variant string, got '${String(variant)}'`,
        );
      }
      config.locales[glob] = variant;
    }
  }
  if (obj.ignore !== undefined) {
    if (!Array.isArray(obj.ignore)) {
      throw new ConfigError(`${configPath}: 'ignore' must be an array of globs`);
    }
    for (const g of obj.ignore) {
      if (typeof g !== 'string') {
        throw new ConfigError(`${configPath}: 'ignore' entries must be strings`);
      }
      config.ignore.push(g);
    }
  }
  if (obj.allow_strings !== undefined) {
    if (!Array.isArray(obj.allow_strings)) {
      throw new ConfigError(`${configPath}: 'allow_strings' must be an array`);
    }
    for (const s of obj.allow_strings) {
      if (typeof s !== 'string') {
        throw new ConfigError(`${configPath}: 'allow_strings' entries must be strings`);
      }
      config.allowStrings.add(s);
    }
  }
  if (obj.allow_chars !== undefined) {
    if (!Array.isArray(obj.allow_chars)) {
      throw new ConfigError(`${configPath}: 'allow_chars' must be an array`);
    }
    for (const ch of obj.allow_chars) {
      if (typeof ch !== 'string') {
        throw new ConfigError(`${configPath}: 'allow_chars' entries must be strings`);
      }
      for (const cp of ch) config.allowChars.add(cp);
    }
  }
  if (obj.plugins !== undefined) {
    if (!Array.isArray(obj.plugins)) {
      throw new ConfigError(`${configPath}: 'plugins' must be an array of package names`);
    }
    const plugins: string[] = [];
    for (const p of obj.plugins) {
      if (typeof p !== 'string') {
        throw new ConfigError(`${configPath}: 'plugins' entries must be strings`);
      }
      plugins.push(p);
    }
    config.plugins = plugins;
  }
  return config;
}

function defaultConfig(): Config {
  return {
    locales: {},
    ignore: [...DEFAULT_IGNORE],
    allowStrings: new Set(),
    allowChars: new Set(),
    plugins: null,
  };
}

export const DEFAULT_INIT_CONFIG = `# locale-lint configuration.
# All keys are optional; sensible defaults come from each installed plugin.

# Explicit plugin list. If omitted, locale-lint auto-discovers
# any @digitalby/locale-lint-* package installed in node_modules.
# plugins:
#   - "@digitalby/locale-lint-chinese"

# Override or extend the default directory-glob → variant mapping that
# each plugin ships with. Variants are plugin-specific strings (e.g.
# "simplified", "traditional", "russian", "ukrainian").
# locales:
#   "**/zh-HK.lproj": traditional

# ignore:
#   - "**/*.generated.strings"

# Whole-string allowlist (proper nouns, brand names).
# allow_strings:
#   - "App Store"

# Individual characters allowed in any locale (e.g. a Traditional brand
# character that legitimately appears in Simplified copy).
# allow_chars:
#   - "髮"
`;
