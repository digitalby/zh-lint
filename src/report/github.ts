import type { Violation } from '../types.js';

function escape(s: string): string {
  return s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

export function formatGithub(violations: Violation[]): string {
  return violations
    .map(
      (v) =>
        `::error file=${escape(v.file)},line=${v.line},col=${v.col}::${escape(`zh-lint: ${v.message}`)}`,
    )
    .join('\n');
}
