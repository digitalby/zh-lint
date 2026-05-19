# zh-lint → `@digitalby/locale-lint`

> Compiler-error-grade localization linting. Catches the kind of bugs the type system can't see: a Simplified character in a Traditional file, a Russian letter in a Belarusian string, "elevator" in an `en-GB` resource. One CLI, one config, one plugin per language family.

[![CI](https://github.com/digitalby/zh-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/digitalby/zh-lint/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@digitalby/zh-lint.svg)](https://www.npmjs.com/package/@digitalby/zh-lint)

> **Heads up:** this repo is being expanded from a Chinese-only linter (`@digitalby/zh-lint`, currently shipping at `0.1.x`) into a family of language-family plugins under the umbrella `@digitalby/locale-lint`. The Chinese detector keeps working unchanged; new language sets land as separate plugin packages, each with its own version. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the model and [docs/sets/](docs/sets/) for per-set scope.

## Why

Localization bugs that the compiler doesn't catch but a native reader spots immediately:

- **Script contamination.** Simplified Chinese characters in a `zh-Hant.lproj` file. Russian `и` in a Belarusian string. Persian `پ` in an Arabic file.
- **Vocabulary leakage.** Italian `ciao` in a Spanish file. Iberian Portuguese `autocarro` in `pt-BR`. British `lift` in `en-AU`.

Both classes ship in production all the time. Neither is caught by tests or pseudo-localization. `locale-lint` makes them fail the build with file/line/column precision.

## Currently shipping

### Chinese (Simplified vs Traditional)

[`@digitalby/zh-lint@0.1.x`](https://www.npmjs.com/package/@digitalby/zh-lint). OpenCC-backed bidirectional check. v0.2 will rename this to `@digitalby/locale-lint-chinese` and pull it under the umbrella; the legacy package keeps working.

See [docs/sets/chinese.md](docs/sets/chinese.md).

## Planned sets

| Set | Languages | Package | Detection |
|---|---|---|---|
| [Cyrillic](docs/sets/cyrillic.md) | Russian, Ukrainian, Belarusian, Kazakh | `@digitalby/locale-lint-cyrillic` | Alphabet exclusivity |
| [Arabic-script](docs/sets/arabic-script.md) | Arabic, Urdu, Persian | `@digitalby/locale-lint-arabic-script` | Alphabet exclusivity |
| [Baltic + Estonian](docs/sets/baltic.md) | Lithuanian, Latvian, Estonian | `@digitalby/locale-lint-baltic` | Diacritic exclusivity |
| [Romance Iberian + Italian](docs/sets/romance-iberian.md) | Spanish (ES + LatAm), Italian, Portuguese (PT + BR) | `@digitalby/locale-lint-romance-iberian` | Character + vocabulary |
| [Austronesian](docs/sets/austronesian.md) | Malay, Indonesian, Tagalog | `@digitalby/locale-lint-austronesian` | Vocabulary (mostly) |
| [English variants](docs/sets/english.md) | en-GB, en-US, en-AU | `@digitalby/locale-lint-english` | Vocabulary |
| [French variants](docs/sets/french.md) | fr-FR, fr-CA | `@digitalby/locale-lint-french` | Vocabulary |

Each set ships as its own npm package with its own semver. Install only the ones your project needs. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the plugin model and a contributor walkthrough.

## Install / run (Chinese, today)

```sh
# One-off, no install:
npx --yes @digitalby/zh-lint /path/to/repo

# As a dev dependency:
npm install --save-dev @digitalby/zh-lint
```

> Package ships as `@digitalby/zh-lint` on npm; the CLI binary is `zh-lint`. After install / `npx`, run as `zh-lint <root>`.

## Usage

```
zh-lint <root>                              Scan <root> for Hans/Hant contamination.
zh-lint --init                              Write a default .zh-lint.yml.
zh-lint --config=<path>                     Use a specific config file.
zh-lint --no-config                         Ignore .zh-lint.yml entirely.
zh-lint --format=xcode|github|plain|json    Output format.
zh-lint --help
zh-lint --version
```

Exit codes:

| code | meaning |
|---|---|
| `0` | No violations. |
| `1` | One or more violations. |
| `2` | Configuration or I/O error. |

### Output formats

- **`xcode`** — `file:line:col: error: zh-lint: ...`, written to stderr. Xcode picks these up automatically when emitted from a Run Script build phase.
- **`github`** — `::error file=...,line=...,col=...::...` workflow commands for GitHub Actions annotations.
- **`plain`** — `file:line:col: error: ...` for any CI. The default.
- **`json`** — A JSON array of `{file, line, col, severity, key, char, expectedScript, actualScriptHint, message}` for programmatic consumers.

## Configuration

`.zh-lint.yml` (today, Chinese-specific) → `.locale-lint.yml` (v0.2 onwards, multi-plugin). Both forms are accepted in v0.2.

```yaml
# locales: override directory-glob → variant mapping.
locales:
  "**/zh-HK.lproj": traditional
  "**/zh-SG.lproj": simplified

# Globs to skip during the walk.
ignore:
  - "**/*.generated.strings"

# Exact whole-string values to permit.
allow_strings:
  - "App Store"

# Individual characters to permit in any locale.
allow_chars:
  - "髮"   # brand name uses Traditional 髮 in Hans copy
  - "准"   # genuine Traditional usage in 批准; OpenCC false positive
```

Run `zh-lint --init` to drop a starter file.

## Integrations

- [Xcode (Run Script build phase)](docs/integration-xcode.md)
- [GitHub Actions](docs/integration-github-actions.md)
- [Fastlane](docs/integration-fastlane.md)

### One-liner: GitHub Actions

```yaml
- uses: digitalby/zh-lint@v0.1.1
  with:
    root: '.'
    format: 'github'
```

### One-liner: Xcode build phase

```sh
if ! command -v npx >/dev/null 2>&1; then
  echo "warning: zh-lint skipped — install Node (brew install node)"
  exit 0
fi
npx --yes @digitalby/zh-lint@latest "$SRCROOT" --format=xcode
```

## How the Chinese detector works (one paragraph)

For a Hans file, every character is run through OpenCC's TW→CN mapping. Anything that changes is Traditional-exclusive and is flagged at its exact line/column. Hant files use the reverse direction. Shared characters pass through unchanged in both directions, producing zero noise. The same pattern (per-character check against a per-variant "allowed set") generalizes cleanly to Cyrillic / Arabic / Baltic / Romance / Austronesian / English / French; see the per-set docs.

## Roadmap

- **v0.2.0** — Repo + monorepo refactor. Core moves to `@digitalby/locale-lint`. Chinese moves to `@digitalby/locale-lint-chinese`. `@digitalby/zh-lint` is deprecated with a redirect notice (legacy install keeps working through the deprecation window).
- **v0.2.x** — First non-Chinese plugin ships (likely Cyrillic — clear letter tables, real-world canary candidates).
- **v0.3+** — Remaining sets in priority order, one per release.

## Contributing

See [docs/ARCHITECTURE.md > How to add a new set](docs/ARCHITECTURE.md#how-to-add-a-new-set-contributor-guide). Per-set docs in [docs/sets/](docs/sets/) include letter tables, sample phrase dictionaries, and the authority citations each plugin's content must be grounded in.

## License

MIT — see [LICENSE](LICENSE).
