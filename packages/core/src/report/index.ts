import type { OutputFormat, Violation } from '../types.js';
import { formatGithub } from './github.js';
import { formatJson } from './json.js';
import { formatMarkdown, type MarkdownContext } from './markdown.js';
import { formatPlain } from './plain.js';
import { formatXcode } from './xcode.js';

export interface FormatOptions {
  markdown?: MarkdownContext;
}

export function format(
  violations: Violation[],
  outputFormat: OutputFormat,
  options: FormatOptions = {},
): string {
  switch (outputFormat) {
    case 'xcode':
      return formatXcode(violations);
    case 'github':
      return formatGithub(violations);
    case 'plain':
      return formatPlain(violations);
    case 'json':
      return formatJson(violations);
    case 'markdown':
      if (!options.markdown) {
        throw new Error('markdown format requires a MarkdownContext');
      }
      return formatMarkdown(violations, options.markdown);
  }
}
