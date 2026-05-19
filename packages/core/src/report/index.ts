import type { OutputFormat, Violation } from '../types.js';
import { formatGithub } from './github.js';
import { formatJson } from './json.js';
import { formatPlain } from './plain.js';
import { formatXcode } from './xcode.js';

export function format(violations: Violation[], outputFormat: OutputFormat): string {
  switch (outputFormat) {
    case 'xcode':
      return formatXcode(violations);
    case 'github':
      return formatGithub(violations);
    case 'plain':
      return formatPlain(violations);
    case 'json':
      return formatJson(violations);
  }
}
