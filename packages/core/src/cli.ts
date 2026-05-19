import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigError, DEFAULT_INIT_CONFIG, findConfig, loadConfig } from './config.js';
import { scan } from './core.js';
import { cleanupTempDir, extractIpaToTemp, isIpaPath } from './ipa.js';
import { PluginError, loadPlugins } from './plugin.js';
import { format } from './report/index.js';
import type { OutputFormat } from './types.js';

interface ParsedArgs {
  root: string;
  configPath: string | null | undefined;
  format: OutputFormat;
  init: boolean;
  help: boolean;
  version: boolean;
  pluginsOverride: string[] | null;
  keepExtracted: string | null;
}

const USAGE = `locale-lint — compiler-error-grade localization linter

Usage:
  locale-lint <root-or-ipa>           Scan a source tree or a shipped .ipa.
  locale-lint --init                  Write a default .locale-lint.yml here.

Options:
  --config=<path>                     Use a specific config file (default: .locale-lint.yml or .zh-lint.yml searched upward).
  --no-config                         Ignore any config file.
  --format=<xcode|github|plain|json|markdown>
                                      Output format (default: plain). 'markdown' is intended for shareable audit reports.
  --plugin=<pkg>                      Explicit plugin package. Repeatable. Overrides config + auto-discovery.
  --keep-extracted=<dir>              For .ipa input: keep the extracted bundle at <dir> instead of deleting it.
  --help, -h                          Show this message.
  --version, -V                       Print version and exit.

Plugin resolution order:
  1. --plugin flags (highest priority)
  2. \`plugins:\` key in the config file
  3. Auto-discovered @digitalby/locale-lint-* packages in node_modules

Exit codes:
  0  Clean.
  1  One or more violations found.
  2  Configuration, plugin, or IO error.
`;

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    root: '.',
    configPath: undefined,
    format: 'plain',
    init: false,
    help: false,
    version: false,
    pluginsOverride: null,
    keepExtracted: null,
  };
  let positional: string | null = null;
  const pluginsFromCli: string[] = [];
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--version' || arg === '-V') result.version = true;
    else if (arg === '--init') result.init = true;
    else if (arg === '--no-config') result.configPath = null;
    else if (arg.startsWith('--config=')) result.configPath = arg.slice('--config='.length);
    else if (arg.startsWith('--plugin=')) pluginsFromCli.push(arg.slice('--plugin='.length));
    else if (arg.startsWith('--keep-extracted=')) {
      result.keepExtracted = arg.slice('--keep-extracted='.length);
    } else if (arg.startsWith('--format=')) {
      const v = arg.slice('--format='.length);
      if (
        v !== 'xcode' &&
        v !== 'github' &&
        v !== 'plain' &&
        v !== 'json' &&
        v !== 'markdown'
      ) {
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
  if (pluginsFromCli.length > 0) result.pluginsOverride = pluginsFromCli;
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
    /* fall through */
  }
  return 'unknown';
}

export async function main(argv: string[]): Promise<number> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`locale-lint: ${(e as Error).message}\n\n${USAGE}`);
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
    const target = path.resolve('.locale-lint.yml');
    if (fs.existsSync(target)) {
      process.stderr.write(`locale-lint: ${target} already exists; refusing to overwrite\n`);
      return 2;
    }
    fs.writeFileSync(target, DEFAULT_INIT_CONFIG, 'utf8');
    process.stdout.write(`Wrote ${target}\n`);
    return 0;
  }

  let scanRoot = args.root;
  let extracted: ReturnType<typeof extractIpaToTemp> | null = null;
  if (isIpaPath(args.root)) {
    try {
      extracted = extractIpaToTemp(path.resolve(args.root));
    } catch (e) {
      process.stderr.write(`locale-lint: ${(e as Error).message}\n`);
      return 2;
    }
    scanRoot = extracted.appRoot;
  }

  try {
    let configPath: string | null;
    if (args.configPath === undefined) {
      configPath = findConfig(scanRoot);
    } else if (args.configPath === null) {
      configPath = null;
    } else {
      configPath = path.resolve(args.configPath);
      if (!fs.existsSync(configPath)) {
        process.stderr.write(`locale-lint: config file not found: ${configPath}\n`);
        return 2;
      }
    }
    let config;
    try {
      config = loadConfig(configPath);
    } catch (e) {
      if (e instanceof ConfigError) {
        process.stderr.write(`locale-lint: ${e.message}\n`);
        return 2;
      }
      throw e;
    }
    const pluginNames = args.pluginsOverride ?? config.plugins;
    let plugins;
    try {
      plugins = await loadPlugins(pluginNames, path.resolve(scanRoot), import.meta.url);
    } catch (e) {
      if (e instanceof PluginError) {
        process.stderr.write(`locale-lint: ${e.message}\n`);
        return 2;
      }
      throw e;
    }
    const result = scan(scanRoot, config, plugins);
    if (result.parseErrors.length > 0) {
      for (const pe of result.parseErrors) {
        process.stderr.write(`locale-lint: parse error in ${pe.file}: ${pe.message}\n`);
      }
    }
    if (args.format === 'markdown') {
      const md: import('./report/markdown.js').MarkdownContext = {
        rootForDisplay: extracted?.appRoot ?? path.resolve(scanRoot),
        filesScanned: result.files,
        pluginsActive: plugins.map((p) => ({ id: p.id, name: p.name })),
        toolVersion: readVersion(),
        scannedAt: new Date().toISOString().slice(0, 10),
      };
      if (extracted?.bundle) md.bundle = extracted.bundle;
      const out = format(result.violations, 'markdown', { markdown: md });
      process.stdout.write(out + '\n');
      return result.violations.length > 0 ? 1 : 0;
    }
    if (result.violations.length === 0) {
      if (args.format === 'json') process.stdout.write('[]\n');
      return result.parseErrors.length > 0 ? 2 : 0;
    }
    const out = format(result.violations, args.format);
    const stream = args.format === 'xcode' ? process.stderr : process.stdout;
    stream.write(out + '\n');
    return 1;
  } finally {
    if (extracted !== null) {
      if (args.keepExtracted !== null) {
        const dest = path.resolve(args.keepExtracted);
        try {
          fs.renameSync(extracted.tempDir, dest);
          process.stderr.write(`locale-lint: extracted bundle preserved at ${dest}\n`);
        } catch (e) {
          process.stderr.write(
            `locale-lint: failed to move extracted bundle to ${dest}: ${(e as Error).message}; tmp dir left at ${extracted.tempDir}\n`,
          );
        }
      } else {
        cleanupTempDir(extracted.tempDir);
      }
    }
  }
}

const isDirectInvocation =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('cli.js') === true ||
  process.argv[1]?.endsWith('locale-lint') === true ||
  process.argv[1]?.endsWith('zh-lint') === true;
if (isDirectInvocation) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`locale-lint: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
      process.exit(2);
    },
  );
}
