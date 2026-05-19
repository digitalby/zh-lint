import * as fs from 'node:fs';
import * as path from 'node:path';
import picomatch from 'picomatch';
import type { Config, ResolvedFile, Script } from './types.js';

const STRINGS_EXTENSIONS = new Set(['.strings']);

export function walk(root: string, config: Config): ResolvedFile[] {
  const absRoot = path.resolve(root);
  const ignoreMatchers = config.ignore.map((g) => picomatch(g, { dot: true }));
  const localeMatchers: Array<{ match: (p: string) => boolean; script: Script }> = Object.entries(
    config.locales,
  ).map(([glob, script]) => ({ match: picomatch(glob, { dot: true }), script }));
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
      const script = inferScript(localeMatchers, dirRel, dirFull);
      if (script === null) continue;
      out.push({ path: full, expectedScript: script });
    }
  }
  visit(absRoot);
  return out;
}

function inferScript(
  matchers: Array<{ match: (p: string) => boolean; script: Script }>,
  dirRel: string,
  dirFull: string,
): Script | null {
  for (const m of matchers) {
    if (m.match(dirRel) || m.match(dirFull)) return m.script;
  }
  return null;
}
