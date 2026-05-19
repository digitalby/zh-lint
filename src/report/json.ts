import type { Violation } from '../types.js';

export function formatJson(violations: Violation[]): string {
  return JSON.stringify(
    violations.map((v) => ({
      file: v.file,
      line: v.line,
      col: v.col,
      severity: 'error',
      key: v.key,
      char: v.char,
      expectedScript: v.expectedScript,
      actualScriptHint: v.actualScriptHint,
      message: v.message,
    })),
    null,
    2,
  );
}
