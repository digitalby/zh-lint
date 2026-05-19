# Architecture

`zh-lint` started as a Chinese-only Simplified-vs-Traditional script-contamination checker. It is being expanded into a **family of locale linters** — one plugin per language family — under the umbrella `@digitalby/locale-lint`. This document explains the model, the moving parts, and how to contribute a new set.

## The problem class

Localization bugs that the compiler can't see, but a careful native reader spots immediately:

- **Script contamination** — Simplified Chinese characters in a `zh-Hant.lproj` file, Russian `и` in a Belarusian string, Persian `پ` in an Arabic file. Mechanical, high-precision.
- **Vocabulary leakage** — Italian `ciao` in a Spanish file, Iberian Portuguese `autocarro` in `pt-BR`, British `lift` in `en-AU`. Dictionary-based, fuzzier but still useful.

Both shapes ship in production all the time. Neither is caught by the type system, the compiler, or pseudo-localization passes. `locale-lint` makes them compiler-error-grade.

## The plugin model

The core is small. Every language-family check is a plugin.

```
                        ┌──────────────────────────────┐
   .strings file   ─►   │ @digitalby/locale-lint       │   ─►  xcode | github | plain | json
   .stringsdict    ─►   │  (core: walk, parse, route,  │
   .xcstrings      ─►   │   merge, format violations)  │
   strings.xml     ─►   └──────────┬───────────────────┘
                                   │ entries + locale variant
                                   ▼
                         ┌──────────────────────┐
                         │ resolve plugin       │
                         │ from .locale-lint.yml│
                         └─┬────┬────┬────┬─────┘
                           │    │    │    │
                           ▼    ▼    ▼    ▼
                ┌──────────────┐ ┌──────────────┐ ┌────────────────┐ ┌──────────┐
                │ -chinese     │ │ -cyrillic    │ │ -arabic-script │ │ … etc.   │
                │ (opencc-js)  │ │ (alphabets)  │ │ (alphabets)    │ │          │
                └──────────────┘ └──────────────┘ └────────────────┘ └──────────┘
```

### Core responsibilities

- File discovery (`.lproj/*.strings`, `.stringsdict`, `.xcstrings`, Android `strings.xml`).
- Parsing into a uniform `{key, value, line, col, per-char-positions}` record.
- Resolving each file to a `(plugin, variant)` pair via locale-pattern matching.
- Forwarding entries to the right plugin and collecting `Violation[]`.
- Applying the global `allow_chars` / `allow_strings` config.
- Rendering output for Xcode / GitHub Actions / plain CI / JSON.

The core knows nothing about Chinese, Cyrillic, or any specific language.

### Plugin responsibilities

A plugin declares:

1. The set of **locale tags** it owns and the **variant** each maps to (e.g. `zh-Hans` → `simplified`, `ru` → `russian`).
2. A **detector function** that takes `(parsed entry, variant, allowlists)` and returns `Violation[]`.

That's it. No file IO, no parsing, no rendering. The plugin gets clean entries and emits findings.

```ts
// @digitalby/locale-lint exports
export interface LocalePlugin {
  /** Stable identifier — used in config and logs. */
  readonly id: string;
  /** Human-readable name shown in CLI banners and README. */
  readonly name: string;
  /** Locale globs → opaque variant tags. */
  readonly locales: ReadonlyArray<[glob: string, variant: string]>;
  /** Per-entry detection. */
  detect(input: DetectInput): Violation[];
}

export interface DetectInput {
  readonly file: string;
  readonly entry: ParsedStringEntry;
  readonly variant: string;
  readonly allowChars: ReadonlySet<string>;
  readonly allowStrings: ReadonlySet<string>;
}
```

### Plugin discovery

Two paths, in this order:

1. **Explicit** — `.locale-lint.yml > plugins:` lists package names. Deterministic, recommended for production.
2. **Auto** — any `@digitalby/locale-lint-*` package present in `node_modules` is loaded if no explicit list is provided. Convenient for ad-hoc `npx` runs.

```yaml
# .locale-lint.yml
plugins:
  - "@digitalby/locale-lint-chinese"
  - "@digitalby/locale-lint-cyrillic"
```

### Detection strategies

Two patterns cover every language family in scope. Plugins pick the right one for their domain.

**A) Character-exclusivity** — for scripts where the same string in two locales differs by exact code-points:

- For each CJK / Cyrillic / Arabic character in the value, check membership in the variant's "allowed letter set".
- Hits: Chinese, Cyrillic, Arabic-script, Baltic, partial Romance (`ñ`, `¿`, `¡` for Spanish vs Italian).
- High precision, low recall on vocabulary mistakes.

**B) Phrase blocklist** — for variants that share an alphabet but diverge in words:

- For each value, check against a `Map<phrase, variant>` of known one-way markers.
- Hits: English (`color` vs `colour`), Romance vocab (`ordenador` vs `computadora`), Austronesian, French (`courriel` vs `email`), Portuguese (`autocarro` vs `ônibus`).
- Implementation: word-boundary regex against a curated dictionary maintained by the plugin.
- Lower precision; plugins should ship dictionaries small and conservative, expanding only when contributors verify entries are unambiguous one-way markers.

Plugins may use both: e.g. Portuguese has some character-level signals (pre-1990 `acção` vs `ação`) plus a large vocabulary table.

## Package layout

```
locale-lint/                            # repo root (renamed from zh-lint)
├── packages/
│   ├── core/                           # @digitalby/locale-lint
│   │   ├── src/
│   │   │   ├── cli.ts
│   │   │   ├── core.ts                 # scan orchestration
│   │   │   ├── parsers/
│   │   │   │   ├── strings.ts          # Apple legacy .strings (UTF-8/UTF-16)
│   │   │   │   ├── stringsdict.ts      # Apple plural plist (planned)
│   │   │   │   ├── xcstrings.ts        # Xcode 15+ String Catalog (planned)
│   │   │   │   └── android.ts          # res/values/strings.xml (planned)
│   │   │   ├── plugin.ts               # LocalePlugin interface + loader
│   │   │   ├── config.ts               # .locale-lint.yml schema
│   │   │   ├── walker.ts               # fs walk + locale matching
│   │   │   └── report/                 # xcode|github|plain|json
│   │   └── package.json
│   ├── set-chinese/                    # @digitalby/locale-lint-chinese
│   ├── set-cyrillic/                   # @digitalby/locale-lint-cyrillic
│   ├── set-arabic-script/              # @digitalby/locale-lint-arabic-script
│   ├── set-baltic/                     # @digitalby/locale-lint-baltic
│   ├── set-romance-iberian/            # @digitalby/locale-lint-romance-iberian
│   ├── set-austronesian/               # @digitalby/locale-lint-austronesian
│   ├── set-english/                    # @digitalby/locale-lint-english
│   └── set-french/                     # @digitalby/locale-lint-french
├── docs/
│   ├── ARCHITECTURE.md                 # (this file)
│   ├── sets/                           # one doc per language family
│   │   ├── chinese.md
│   │   ├── cyrillic.md
│   │   ├── arabic-script.md
│   │   ├── baltic.md
│   │   ├── romance-iberian.md
│   │   ├── austronesian.md
│   │   ├── english.md
│   │   └── french.md
│   └── integration-*.md
└── README.md
```

The repo is an npm workspaces monorepo. Each `packages/set-*` has its own `package.json`, its own version, and its own CHANGELOG. They share `core`'s tooling (TypeScript config, vitest config, tsup build).

## Versioning

- **Core** (`@digitalby/locale-lint`) follows semver based on plugin-interface stability. A breaking change to `LocalePlugin` is a major bump and forces a coordinated plugin re-release.
- **Each set** has its own semver. Adding letters / phrases is a minor bump; tightening detection (more violations on previously-clean files) is a major bump.
- Plugins declare a peer dependency on the core version range they support.

## How to add a new set (contributor guide)

1. Pick a stable `id` — kebab-case, no language tags (e.g. `nordic`, `slavic-south`).
2. Create `packages/set-<id>/` with the standard layout. Copy from `set-chinese` as a template.
3. Define the locale globs the set owns:
   ```ts
   locales: [
     ['**/sv.lproj', 'swedish'],
     ['**/no.lproj', 'norwegian'],
     ['**/da.lproj', 'danish'],
   ]
   ```
4. Pick a detection strategy (A, B, or both).
   - For strategy A, define an `alphabet` for each variant. Source: a primary reference like Unicode CLDR. Cite it in the doc.
   - For strategy B, ship a curated phrase dictionary. Each entry must be a one-way marker (i.e. the phrase appearing in the wrong variant is unambiguously wrong, not just stylistic).
5. Write `docs/sets/<id>.md`: variants table, alphabets / phrases, sources, known false-positive categories, how to suppress them with `allow_chars` / `allow_strings`.
6. Write unit tests with clean and contaminated fixtures (mirror `set-chinese/test/fixtures/`).
7. Submit a PR. The maintainer will publish the package once tests pass on CI.

## Migration from `@digitalby/zh-lint@0.1.x`

- The Chinese detector moves verbatim into `@digitalby/locale-lint-chinese`. Behavior identical.
- `@digitalby/zh-lint` will be `npm deprecate`'d with a redirect pointing at `@digitalby/locale-lint` + `@digitalby/locale-lint-chinese`.
- Existing `.zh-lint.yml` files in consumer repos will be read by both:
  - `@digitalby/zh-lint` (legacy) keeps reading `.zh-lint.yml`.
  - `@digitalby/locale-lint` reads `.locale-lint.yml` *or* `.zh-lint.yml` as a fallback.
- Run Script build phases that call `npx @digitalby/zh-lint` keep working until the deprecation TTL ends; we'll publish a swap snippet at the same time as the migration release.

## Roadmap

| Set | Status | Package | Primary detection |
|---|---|---|---|
| [Chinese](sets/chinese.md) | shipped (in `zh-lint@0.1.1`, moving to `set-chinese`) | `@digitalby/locale-lint-chinese` | OpenCC bidirectional |
| [Cyrillic](sets/cyrillic.md) | planned | `@digitalby/locale-lint-cyrillic` | Alphabet exclusivity |
| [Arabic-script](sets/arabic-script.md) | planned | `@digitalby/locale-lint-arabic-script` | Alphabet exclusivity |
| [Baltic](sets/baltic.md) | planned | `@digitalby/locale-lint-baltic` | Alphabet exclusivity |
| [Romance Iberian](sets/romance-iberian.md) | planned | `@digitalby/locale-lint-romance-iberian` | Character (ñ, ¿, ¡) + vocabulary |
| [Austronesian](sets/austronesian.md) | planned | `@digitalby/locale-lint-austronesian` | Vocabulary (mostly) |
| [English](sets/english.md) | planned | `@digitalby/locale-lint-english` | Vocabulary |
| [French](sets/french.md) | planned | `@digitalby/locale-lint-french` | Vocabulary |

Future sets that have been suggested or noted as natural candidates:

- **Indic** (hi, bn, gu, mr, ta, te) — Devanagari + related scripts, alphabet exclusivity.
- **Nordic** (sv, no, da, is) — diacritic exclusivity + some vocabulary.
- **South-Slavic** (sr-Cyrl, sr-Latn, hr, bs, mk, bg) — script *and* alphabet contamination.
- **German variants** (de-DE, de-AT, de-CH) — vocabulary + ß-vs-ss for de-CH.

These remain unspecified until a real-world canary exists for them.
