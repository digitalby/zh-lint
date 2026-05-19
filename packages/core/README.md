# @digitalby/locale-lint

Compiler-error-grade localization linter. Plugin-based: each language family ships as its own `@digitalby/locale-lint-*` plugin package.

```sh
npx -p @digitalby/locale-lint -p @digitalby/locale-lint-chinese locale-lint .
```

See the main repo for the architecture model, plugin contract, and per-set roadmap: https://github.com/digitalby/zh-lint

## What this package provides

- The `locale-lint` CLI.
- File parsers (Apple legacy `.strings`, UTF-8 / UTF-8-BOM / UTF-16 LE / UTF-16 BE).
- The walker and locale-glob router.
- The `LocalePlugin` interface and the plugin loader.
- Output formatters: `xcode`, `github`, `plain`, `json`.
- Config loader for `.locale-lint.yml` (with `.zh-lint.yml` as legacy fallback).

It contains zero language-specific logic. Detection lives entirely in plugins.

## Quick start

```sh
# As a dev dependency in a project:
npm install --save-dev @digitalby/locale-lint @digitalby/locale-lint-chinese

# One-off via npx (plugins must be co-installed):
npx -p @digitalby/locale-lint -p @digitalby/locale-lint-chinese locale-lint . --format=xcode
```

```yaml
# .locale-lint.yml
plugins:
  - "@digitalby/locale-lint-chinese"

# allow_chars:
#   - "准"
```

Run `locale-lint --init` to drop a starter `.locale-lint.yml`.

## Exit codes

| code | meaning |
|---|---|
| `0` | No violations. |
| `1` | One or more violations. |
| `2` | Configuration, plugin resolution, or I/O error. |

## Plugin contract

If you're building a plugin for a new language family, see [docs/ARCHITECTURE.md](https://github.com/digitalby/zh-lint/blob/main/docs/ARCHITECTURE.md) for the `LocalePlugin` interface and the contributor walkthrough.

## License

MIT.
