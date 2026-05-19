import * as fs from 'node:fs';
import { decodeStringsBuffer, parseStrings, type ParsedStringEntry } from './parsers/strings.js';
import type { LocalePlugin } from './plugin.js';
import type { Config, Violation } from './types.js';
import { walk } from './walker.js';

export interface ScanResult {
  files: number;
  violations: Violation[];
  parseErrors: Array<{ file: string; message: string }>;
}

interface FileCache {
  entries: ParsedStringEntry[] | null;
  error: string | null;
}

export function scan(
  root: string,
  config: Config,
  plugins: readonly LocalePlugin[],
): ScanResult {
  const pluginsById = new Map<string, LocalePlugin>();
  for (const plugin of plugins) pluginsById.set(plugin.id, plugin);
  const files = walk(root, config, plugins);
  const cache = new Map<string, FileCache>();
  const uniqueFiles = new Set<string>();
  const violations: Violation[] = [];
  const parseErrors: ScanResult['parseErrors'] = [];
  for (const file of files) {
    uniqueFiles.add(file.path);
    const plugin = pluginsById.get(file.pluginId);
    if (plugin === undefined) continue;
    const parsed = parseFileCached(file.path, cache);
    if (parsed.error !== null) {
      parseErrors.push({ file: file.path, message: parsed.error });
      continue;
    }
    if (parsed.entries === null) continue;
    for (const entry of parsed.entries) {
      violations.push(
        ...plugin.detect({
          file: file.path,
          entry,
          variant: file.variant,
          allowChars: config.allowChars,
          allowStrings: config.allowStrings,
        }),
      );
    }
  }
  const reportedErrors = new Set<string>();
  const dedupedErrors: ScanResult['parseErrors'] = [];
  for (const e of parseErrors) {
    if (reportedErrors.has(e.file)) continue;
    reportedErrors.add(e.file);
    dedupedErrors.push(e);
  }
  return { files: uniqueFiles.size, violations, parseErrors: dedupedErrors };
}

function parseFileCached(filePath: string, cache: Map<string, FileCache>): FileCache {
  const existing = cache.get(filePath);
  if (existing !== undefined) return existing;
  let source: string;
  try {
    const buf = fs.readFileSync(filePath);
    source = decodeStringsBuffer(buf);
  } catch (e) {
    const result: FileCache = { entries: null, error: (e as Error).message };
    cache.set(filePath, result);
    return result;
  }
  try {
    const entries = parseStrings(source);
    const result: FileCache = { entries, error: null };
    cache.set(filePath, result);
    return result;
  } catch (e) {
    const result: FileCache = { entries: null, error: (e as Error).message };
    cache.set(filePath, result);
    return result;
  }
}
