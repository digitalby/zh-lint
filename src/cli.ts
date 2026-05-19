import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigError, DEFAULT_INIT_CONFIG, findConfig, loadConfig } from './config.js';
import { scan } from './core.js';
import { format } from './report/index.js';
import type { OutputFormat } from './types.js';

interface ParsedArgs {
  root: string;
  configPath: string | null | undefined;
  format: OutputFormat;
  init: boolean;
  help: boolean;
  version: boolean;
}

const USAGE = `zh-lint — Chinese script-contamination linter

Usage:
  zh-lint <root>                     Scan <root> for Hans/Hant contamination.
  zh-lint --init                     Write a default .zh-lint.yml in the current directory.

Options:
  --config=<path>                    Use a specific config file (default: .zh-lint.yml searched upward).
  --no-config                        Ignore any .zh-lint.yml and use built-in defaults.
  --format=<xcode|github|plain|json> Output format (default: plain).
  --help, -h                         Show this message.
  --version, -V                      Print version and exit.

Exit codes:
  0  Clean.
  1  One or more violations found.
  2  Configuration or IO error.
`;

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    root: '.',
    configPath: undefined,
    format: 'plain',
    init: false,
    help: false,
    version: false,
  };
  let positional: string | null = null;
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--version' || arg === '-V') result.version = true;
    else if (arg === '--init') result.init = true;
    else if (arg === '--no-config') result.configPath = null;
    else if (arg.startsWith('--config=')) result.configPath = arg.slice('--config='.length);
    else if (arg.startsWith('--format=')) {
      const v = arg.slice('--format='.length);
      if (v !== 'xcode' && v !== 'github' && v !== 'plain' && v !== 'json') {
        throw new Error(`Unknown --format value: ${v}`);
      }
      result.format = v;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (positional === null) {
      positional = arg;
    } else {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
  }
  if (positional !== null) result.root = positional;
  return result;
}

function readVersion(): string {
  try {
    const here = path.dirname(new URL(import.meta.url).pathname);
    const candidates = [path.join(here, '..', 'package.json'), path.join(here, 'package.json')];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        const pkg = JSON.parse(fs.readFileSync(c, 'utf8')) as { version?: string };
        if (pkg.version) return pkg.version;
      }
    }
  } catch {
    // fall through
  }
  return 'unknown';
}

export function main(argv: string[]): number {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`zh-lint: ${(e as Error).message}\n\n${USAGE}`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (args.version) {
    process.stdout.write(`${readVersion()}\n`);
    return 0;
  }
  if (args.init) {
    const target = path.resolve('.zh-lint.yml');
    if (fs.existsSync(target)) {
      process.stderr.write(`zh-lint: ${target} already exists; refusing to overwrite\n`);
      return 2;
    }
    fs.writeFileSync(target, DEFAULT_INIT_CONFIG, 'utf8');
    process.stdout.write(`Wrote ${target}\n`);
    return 0;
  }
  let configPath: string | null;
  if (args.configPath === undefined) {
    configPath = findConfig(args.root);
  } else if (args.configPath === null) {
    configPath = null;
  } else {
    configPath = path.resolve(args.configPath);
    if (!fs.existsSync(configPath)) {
      process.stderr.write(`zh-lint: config file not found: ${configPath}\n`);
      return 2;
    }
  }
  let config;
  try {
    config = loadConfig(configPath);
  } catch (e) {
    if (e instanceof ConfigError) {
      process.stderr.write(`zh-lint: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
  const result = scan(args.root, config);
  if (result.parseErrors.length > 0) {
    for (const pe of result.parseErrors) {
      process.stderr.write(`zh-lint: parse error in ${pe.file}: ${pe.message}\n`);
    }
  }
  if (result.violations.length === 0) {
    if (args.format === 'json') process.stdout.write('[]\n');
    return result.parseErrors.length > 0 ? 2 : 0;
  }
  const out = format(result.violations, args.format);
  const stream = args.format === 'xcode' ? process.stderr : process.stdout;
  stream.write(out + '\n');
  return 1;
}

const isDirectInvocation =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('cli.js') === true ||
  process.argv[1]?.endsWith('zh-lint') === true;
if (isDirectInvocation) {
  process.exit(main(process.argv.slice(2)));
}
