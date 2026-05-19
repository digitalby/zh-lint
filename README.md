# locale-lint (hosted at `digitalby/zh-lint`)

> Compiler-error-grade localization linting. Catches the kind of bugs the type system can't see: a Simplified character in a Traditional file, a Russian letter in a Belarusian string, "elevator" in an `en-GB` resource. One CLI, one config, one plugin per language family.

[![CI](https://github.com/digitalby/zh-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/digitalby/zh-lint/actions/workflows/ci.yml)
[![npm core](https://img.shields.io/npm/v/@digitalby/locale-lint.svg?label=%40digitalby%2Flocale-lint)](https://www.npmjs.com/package/@digitalby/locale-lint)
[![npm chinese](https://img.shields.io/npm/v/@digitalby/locale-lint-chinese.svg?label=chinese)](https://www.npmjs.com/package/@digitalby/locale-lint-chinese)

> The repo is named `zh-lint` for historical reasons — it started as a Chinese-only Simplified-vs-Traditional checker. It is now the home of the **multi-package `@digitalby/locale-lint` family**, with one plugin per language family. The legacy `@digitalby/zh-lint@0.1.x` keeps working; new projects should adopt `@digitalby/locale-lint` + one or more plugin packages.

## Why

Localization bugs that the compiler doesn't catch but a native reader spots immediately:

- **Script contamination.** Simplified Chinese characters in a `zh-Hant.lproj` file. Russian `и` in a Belarusian string. Persian `پ` in an Arabic file.
- **Vocabulary leakage.** Italian `ciao` in a Spanish file. Iberian Portuguese `autocarro` in `pt-BR`. British `lift` in `en-AU`.

Both classes ship in production all the time. Neither is caught by tests or pseudo-localization. `locale-lint` makes them fail the build with file/line/column precision.

## Architecture in one paragraph

A small core (`@digitalby/locale-lint`) does the boring parts: file discovery, parsing, locale-glob routing, formatting violations for Xcode / GitHub Actions / plain CI / JSON. All language-specific detection lives in plugins (`@digitalby/locale-lint-*`), each shipped as a separate npm package with its own semver. Plugins declare the locale globs they own and the variants they detect (e.g. `simplified` / `traditional` for Chinese, `russian` / `ukrainian` / `belarusian` / `kazakh` for Cyrillic). The core auto-discovers any `@digitalby/locale-lint-*` package installed alongside it, or accepts an explicit `plugins:` list in `.locale-lint.yml`.

Full design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Contributor guide for new sets: same doc, "How to add a new set".

## Currently published

| Package | npm | What it does |
|---|---|---|
| [`@digitalby/locale-lint`](https://www.npmjs.com/package/@digitalby/locale-lint) | core CLI + plugin loader |
| [`@digitalby/locale-lint-chinese`](https://www.npmjs.com/package/@digitalby/locale-lint-chinese) | Simplified vs Traditional Chinese detection (OpenCC) |
| [`@digitalby/zh-lint`](https://www.npmjs.com/package/@digitalby/zh-lint) | **legacy**, Chinese-only, kept installable; use the two packages above instead |

## Roadmap (planned plugins)

| Set | Languages | Package | Status | Detection |
|---|---|---|---|---|
| [Cyrillic](docs/sets/cyrillic.md) | ru, uk, be, kk | `@digitalby/locale-lint-cyrillic` | planned | Alphabet exclusivity |
| [Arabic-script](docs/sets/arabic-script.md) | ar, ur, fa | `@digitalby/locale-lint-arabic-script` | planned | Alphabet exclusivity |
| [Baltic + Estonian](docs/sets/baltic.md) | lt, lv, et | `@digitalby/locale-lint-baltic` | planned | Diacritic exclusivity |
| [Romance Iberian + Italian](docs/sets/romance-iberian.md) | es-ES, es-419, it, pt-PT, pt-BR | `@digitalby/locale-lint-romance-iberian` | planned | Character + vocabulary |
| [Austronesian](docs/sets/austronesian.md) | ms, id, tl | `@digitalby/locale-lint-austronesian` | planned | Vocabulary |
| [English variants](docs/sets/english.md) | en-GB, en-US, en-AU | `@digitalby/locale-lint-english` | planned | Vocabulary |
| [French variants](docs/sets/french.md) | fr-FR, fr-CA | `@digitalby/locale-lint-french` | planned | Vocabulary |

Each set ships as its own npm package with its own semver. Install only the ones your project needs.

## Install / run

```sh
# One-off, no install:
npx -p @digitalby/locale-lint -p @digitalby/locale-lint-chinese locale-lint /path/to/repo

# As dev dependencies:
npm install --save-dev @digitalby/locale-lint @digitalby/locale-lint-chinese
```

`.locale-lint.yml`:

```yaml
plugins:
  - "@digitalby/locale-lint-chinese"
# allow_chars:
#   - "准"
```

`npx --yes -p @digitalby/locale-lint locale-lint --init` writes a starter config.

## CLI usage

```
locale-lint <root>                       Scan <root> for locale contamination.
locale-lint --init                       Write a default .locale-lint.yml.
locale-lint --config=<path>              Use a specific config file.
locale-lint --no-config                  Ignore any config file.
locale-lint --plugin=<pkg>               Explicit plugin package. Repeatable. Overrides config + auto-discovery.
locale-lint --format=xcode|github|plain|json
locale-lint --help
locale-lint --version
```

Exit codes:

| code | meaning |
|---|---|
| `0` | No violations. |
| `1` | One or more violations. |
| `2` | Configuration, plugin, or I/O error. |

### Output formats

- **`xcode`** — `file:line:col: error: locale-lint(<plugin>): ...`, written to stderr. Xcode picks these up automatically when emitted from a Run Script build phase.
- **`github`** — `::error file=...,line=...,col=...::...` workflow commands for GitHub Actions annotations.
- **`plain`** — `file:line:col: error: ...` for any CI. The default.
- **`json`** — A JSON array of `{file, line, col, severity, key, pluginId, variantExpected, variantHint, offending, message}`.

## Integrations

- [Xcode (Run Script build phase)](docs/integration-xcode.md)
- [GitHub Actions](docs/integration-github-actions.md)
- [Fastlane](docs/integration-fastlane.md)

### One-liner: GitHub Actions

```yaml
- uses: digitalby/zh-lint@v0.2.0
  with:
    root: '.'
    format: 'github'
    plugins: '@digitalby/locale-lint-chinese'
```

### One-liner: Xcode build phase

```sh
if ! command -v npx >/dev/null 2>&1; then
  echo "warning: locale-lint skipped — install Node (brew install node)"
  exit 0
fi
npx --yes \
  -p @digitalby/locale-lint@latest \
  -p @digitalby/locale-lint-chinese@latest \
  locale-lint "$SRCROOT" --format=xcode
```

## Migrating from `@digitalby/zh-lint@0.1.x`

- The legacy package keeps working. No urgent migration needed.
- When ready, switch to `@digitalby/locale-lint` + `@digitalby/locale-lint-chinese`. Behavior is identical for Chinese files.
- Rename `.zh-lint.yml` → `.locale-lint.yml` (both names are read by the new CLI; the new name is preferred for new projects).
- The new CLI emits `locale-lint(<plugin>):` instead of `zh-lint:` in error prefixes. Any CI greps need a one-line update.

## Contributing

See [docs/ARCHITECTURE.md > How to add a new set](docs/ARCHITECTURE.md#how-to-add-a-new-set-contributor-guide). Per-set docs in [docs/sets/](docs/sets/) include alphabet tables, sample phrase dictionaries, and the authority citations each plugin's content must be grounded in.

## License

MIT — see [LICENSE](LICENSE).
