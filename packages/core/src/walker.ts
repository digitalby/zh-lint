import * as fs from 'node:fs';
import * as path from 'node:path';
import picomatch from 'picomatch';
import type { LocalePlugin } from './plugin.js';
import type { Config, ResolvedFile } from './types.js';

const STRINGS_EXTENSIONS = new Set(['.strings']);

interface LocaleMatcher {
  match: (p: string) => boolean;
  variant: string;
  pluginId: string;
}

export function walk(root: string, config: Config, plugins: readonly LocalePlugin[]): ResolvedFile[] {
  const absRoot = path.resolve(root);
  const ignoreMatchers = config.ignore.map((g) => picomatch(g, { dot: true }));
  const matchers = buildLocaleMatchers(plugins, config);
  const out: ResolvedFile[] = [];

  function visit(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(absRoot, full) || e.name;
      if (ignoreMatchers.some((m) => m(rel) || m(full))) continue;
      if (e.isDirectory()) {
        visit(full);
        continue;
      }
      if (!e.isFile()) continue;
      const ext = path.extname(full);
      if (!STRINGS_EXTENSIONS.has(ext)) continue;
      const parentDir = path.basename(path.dirname(full));
      if (!parentDir.endsWith('.lproj')) continue;
      const dirRel = path.relative(absRoot, path.dirname(full));
      const dirFull = path.dirname(full);
      const match = inferLocale(matchers, dirRel, dirFull);
      if (match === null) continue;
      out.push({ path: full, variant: match.variant, pluginId: match.pluginId });
    }
  }

  visit(absRoot);
  return out;
}

function buildLocaleMatchers(plugins: readonly LocalePlugin[], config: Config): LocaleMatcher[] {
  const variantToPlugin = new Map<string, string>();
  for (const plugin of plugins) {
    for (const [, variant] of plugin.locales) {
      if (!variantToPlugin.has(variant)) variantToPlugin.set(variant, plugin.id);
    }
  }
  const matchers: LocaleMatcher[] = [];
  for (const [glob, variant] of Object.entries(config.locales)) {
    const pluginId = variantToPlugin.get(variant);
    if (pluginId === undefined) continue;
    matchers.push({ match: picomatch(glob, { dot: true }), variant, pluginId });
  }
  for (const plugin of plugins) {
    for (const [glob, variant] of plugin.locales) {
      matchers.push({ match: picomatch(glob, { dot: true }), variant, pluginId: plugin.id });
    }
  }
  return matchers;
}

function inferLocale(
  matchers: LocaleMatcher[],
  dirRel: string,
  dirFull: string,
): { variant: string; pluginId: string } | null {
  for (const m of matchers) {
    if (m.match(dirRel) || m.match(dirFull)) {
      return { variant: m.variant, pluginId: m.pluginId };
    }
  }
  return null;
}
