import type { Violation } from '../types.js';

export function formatXcode(violations: Violation[]): string {
  return violations
    .map((v) => `${v.file}:${v.line}:${v.col}: error: locale-lint(${v.pluginId}): ${v.message}`)
    .join('\n');
}
