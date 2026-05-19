# zh-lint

> Compiler-error-grade lint for Chinese localizations. Catches Simplified characters that leaked into a Traditional locale (and vice versa) before they ship.

[![CI](https://github.com/digitalby/zh-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/digitalby/zh-lint/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/zh-lint.svg)](https://www.npmjs.com/package/zh-lint)

## The problem

Chinese localizations get this wrong all the time:

- A translator copy-pastes from a mainland source into `zh-Hant.lproj`.
- The wrong IME is active when a single character is patched.
- A 简 sneaks into 繁 (or the reverse) and the compiler is silent. It looks like Chinese, so it ships.

`zh-lint` catches it. One CJK character at a time, with file/line/column, so you can fail the Xcode build or the GitHub Actions run.

## What it does

For every `.strings` file under a `zh-Hans*.lproj`, `zh-Hant*.lproj`, `zh-HK.lproj`, `zh-TW.lproj`, `zh-MO.lproj`, `zh-SG.lproj` or `zh-CN.lproj` directory:

1. Detect the expected script (Simplified for `zh-Hans*`/`zh-CN`/`zh-SG`, Traditional for the rest). Override per-glob in `.zh-lint.yml`.
2. For every value, run [OpenCC](https://github.com/BYVoid/OpenCC) (via `opencc-js`) to convert the string to the *expected* script.
3. Any CJK character that *changed* during conversion was script-exclusive in the wrong direction. Flag it as an error at its exact line and column.

Shared characters (most of the CJK Unified Ideographs block) don't change during OpenCC conversion and produce zero noise.

## Install / run

```sh
# One-off, no install:
npx --yes zh-lint /path/to/repo

# As a dev dependency:
npm install --save-dev zh-lint
```

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

## Configuration: `.zh-lint.yml`

All keys are optional. The defaults handle standard Apple/Android layouts.

```yaml
# Override or extend the default directory→script mapping.
locales:
  "**/zh-HK.lproj": traditional
  "**/zh-SG.lproj": simplified

# Globs to skip during the walk.
ignore:
  - "**/*.generated.strings"

# Exact whole-string values to permit (proper nouns, brand names).
allow_strings:
  - "App Store"

# Individual characters to permit in any locale.
# Useful for brand names where Traditional 髮 is used even in Simplified copy.
allow_chars:
  - "髮"
  - "體"
```

Run `zh-lint --init` to drop a starter file in the current directory.

## Integrations

- [Xcode (Run Script build phase)](docs/integration-xcode.md)
- [GitHub Actions](docs/integration-github-actions.md)
- [Fastlane](docs/integration-fastlane.md)

### One-liner: GitHub Actions

```yaml
- uses: digitalby/zh-lint@v0.1.0
  with:
    root: '.'
    format: 'github'
```

### One-liner: Xcode build phase

Add a new "Run Script" build phase before "Compile Sources":

```sh
if ! command -v npx >/dev/null 2>&1; then
  echo "warning: zh-lint skipped — install Node (brew install node)"
  exit 0
fi
npx --yes zh-lint@latest "$SRCROOT" --format=xcode
```

The `xcode` format writes errors to stderr in the form Xcode parses, so violations appear directly in the Issue Navigator.

## Scope (v0.1)

- Apple legacy `.strings` files (UTF-8, UTF-8-with-BOM, UTF-16 LE/BE — all handled).
- Hans-vs-Hant character-script detection only. CN-vs-HK-vs-TW vocabulary mismatches are tracked for v0.2.
- `.stringsdict`, `.xcstrings` (String Catalogs), and Android `strings.xml` are also v0.2 — file an issue if you need them sooner.
- No inline-comment overrides; everything goes through `.zh-lint.yml`.

## How it works (one paragraph)

For a Hans file, `zh-lint` converts every character with OpenCC's TW→CN mapping. If the conversion changed a character, the original was Traditional-exclusive — that's the violation. For Hant files, the reverse: CN→TW. Shared characters pass through unchanged in both directions, so they're never flagged.

## License

MIT — see [LICENSE](LICENSE).
