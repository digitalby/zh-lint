import * as fs from 'node:fs';
import { detectInEntry } from './detect.js';
import { decodeStringsBuffer, parseStrings } from './parsers/strings.js';
import type { Config, Violation } from './types.js';
import { walk } from './walker.js';

export interface ScanResult {
  files: number;
  violations: Violation[];
  parseErrors: Array<{ file: string; message: string }>;
}

export function scan(root: string, config: Config): ScanResult {
  const files = walk(root, config);
  const violations: Violation[] = [];
  const parseErrors: ScanResult['parseErrors'] = [];
  for (const file of files) {
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
        violations.push(...detectInEntry(file.path, entry, file.expectedScript, config));
      }
    } catch (e) {
      parseErrors.push({ file: file.path, message: (e as Error).message });
    }
  }
  return { files: files.length, violations, parseErrors };
}
