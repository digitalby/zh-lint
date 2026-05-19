import * as fs from 'node:fs';
import { decodeStringsBuffer, parseStrings } from './parsers/strings.js';
import type { LocalePlugin } from './plugin.js';
import type { Config, Violation } from './types.js';
import { walk } from './walker.js';

export interface ScanResult {
  files: number;
  violations: Violation[];
  parseErrors: Array<{ file: string; message: string }>;
}

export function scan(
  root: string,
  config: Config,
  plugins: readonly LocalePlugin[],
): ScanResult {
  const pluginsById = new Map<string, LocalePlugin>();
  for (const plugin of plugins) pluginsById.set(plugin.id, plugin);
  const files = walk(root, config, plugins);
  const violations: Violation[] = [];
  const parseErrors: ScanResult['parseErrors'] = [];
  for (const file of files) {
    const plugin = pluginsById.get(file.pluginId);
    if (plugin === undefined) continue;
    let source: string;
    try {
      const buf = fs.readFileSync(file.path);
      source = decodeStringsBuffer(buf);
    } catch (e) {
      parseErrors.push({ file: file.path, message: (e as Error).message });
      continue;
    }
    try {
      const entries = parseStrings(source);
      for (const entry of entries) {
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
    } catch (e) {
      parseErrors.push({ file: file.path, message: (e as Error).message });
    }
  }
  return { files: files.length, violations, parseErrors };
}
