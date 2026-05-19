import type { Violation } from '../types.js';

export function formatPlain(violations: Violation[]): string {
  return violations
    .map((v) => `${v.file}:${v.line}:${v.col}: error: ${v.message}`)
    .join('\n');
}
