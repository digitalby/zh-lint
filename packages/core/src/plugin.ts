import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { ParsedStringEntry } from './parsers/strings.js';
import type { Violation } from './types.js';

export interface DetectInput {
  readonly file: string;
  readonly entry: ParsedStringEntry;
  readonly variant: string;
  readonly allowChars: ReadonlySet<string>;
  readonly allowStrings: ReadonlySet<string>;
}

export interface LocalePlugin {
  readonly id: string;
  readonly name: string;
  readonly locales: ReadonlyArray<readonly [glob: string, variant: string]>;
  detect(input: DetectInput): Violation[];
}

export class PluginError extends Error {}

const PLUGIN_PREFIX = '@digitalby/locale-lint-';

export async function loadPlugins(
  explicit: readonly string[] | null,
  cwd: string,
  callerUrl: string,
): Promise<LocalePlugin[]> {
  const names = explicit ?? discoverPlugins(cwd, callerUrl);
  if (names.length === 0) {
    throw new PluginError(
      'No plugins configured. Add a `plugins:` block to .locale-lint.yml ' +
        'or install at least one `@digitalby/locale-lint-*` package alongside ' +
        '`@digitalby/locale-lint`.',
    );
  }
  const seen = new Set<string>();
  const variantToPlugin = new Map<string, string>();
  const plugins: LocalePlugin[] = [];
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    const plugin = await importPlugin(name, cwd, callerUrl);
    for (const [, variant] of plugin.locales) {
      const owner = variantToPlugin.get(variant);
      if (owner !== undefined && owner !== plugin.id) {
        throw new PluginError(
          `Variant "${variant}" is claimed by both plugins "${owner}" and "${plugin.id}". ` +
            `Plugin variants must be globally unique.`,
        );
      }
      variantToPlugin.set(variant, plugin.id);
    }
    plugins.push(plugin);
  }
  return plugins;
}

async function importPlugin(
  name: string,
  cwd: string,
  callerUrl: string,
): Promise<LocalePlugin> {
  let resolved: string;
  try {
    resolved = resolveFrom(name, cwd, callerUrl);
  } catch (e) {
    throw new PluginError(
      `Failed to resolve plugin "${name}": ${(e as Error).message}. ` +
        `Make sure it's installed in your project or alongside @digitalby/locale-lint.`,
    );
  }
  let mod: unknown;
  try {
    mod = await import(pathToFileURL(resolved).href);
  } catch (e) {
    throw new PluginError(`Failed to import plugin "${name}": ${(e as Error).message}`);
  }
  const candidate =
    (mod as { default?: unknown }).default ?? (mod as { plugin?: unknown }).plugin ?? mod;
  if (!isLocalePlugin(candidate)) {
    throw new PluginError(
      `Plugin "${name}" does not export a valid LocalePlugin. ` +
        `Expected an object with { id, name, locales, detect }.`,
    );
  }
  return candidate;
}

function isLocalePlugin(v: unknown): v is LocalePlugin {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    Array.isArray(o.locales) &&
    typeof o.detect === 'function'
  );
}

function resolveFrom(name: string, cwd: string, callerUrl: string): string {
  const candidates = [createRequire(path.join(cwd, 'package.json')), createRequire(callerUrl)];
  let lastErr: unknown;
  for (const req of candidates) {
    try {
      return req.resolve(name);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function discoverPlugins(cwd: string, callerUrl: string): string[] {
  const roots = new Set<string>();
  const cwdNodeModules = path.join(cwd, 'node_modules', '@digitalby');
  if (fs.existsSync(cwdNodeModules)) roots.add(cwdNodeModules);
  const callerDir = path.dirname(new URL(callerUrl).pathname);
  let walk = callerDir;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(walk, 'node_modules', '@digitalby');
    if (fs.existsSync(candidate)) roots.add(candidate);
    const parent = path.dirname(walk);
    if (parent === walk) break;
    walk = parent;
  }
  const found = new Set<string>();
  for (const root of roots) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.startsWith('locale-lint-')) continue;
      if (entry.name === 'locale-lint-plugin-types') continue;
      found.add(`${PLUGIN_PREFIX}${entry.name.slice('locale-lint-'.length)}`);
    }
  }
  return [...found].sort();
}
