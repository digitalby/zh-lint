# Chinese (Simplified vs Traditional)

**Status:** shipped (currently `@digitalby/zh-lint@0.1.1`; moving to `@digitalby/locale-lint-chinese` in v0.2.0).
**Detection:** character-exclusivity via OpenCC bidirectional conversion.
**Package:** `@digitalby/locale-lint-chinese`.

## Variants and locale globs

| Locale glob | Variant |
|---|---|
| `**/zh-Hans*.lproj` | `simplified` |
| `**/zh-CN.lproj` | `simplified` |
| `**/zh-SG.lproj` | `simplified` |
| `**/zh-Hant*.lproj` | `traditional` |
| `**/zh-HK.lproj` | `traditional` |
| `**/zh-TW.lproj` | `traditional` |
| `**/zh-MO.lproj` | `traditional` |

Configurable in `.locale-lint.yml > locales:`.

## How detection works

For each CJK character in a value, convert with OpenCC in the direction "expected → other". If the conversion produced a different character, the original was script-exclusive in the wrong direction.

```
Hans file: t2s(char). If t2s(char) ≠ char, char is Traditional-exclusive. Violation.
Hant file: s2t(char). If s2t(char) ≠ char, char is Simplified-exclusive. Violation.
```

Shared characters (the majority of CJK Unified Ideographs) pass through unchanged in both directions, so they never fire.

## Known false-positive classes

- **`准` in 批准** ("to approve/ratify"). `准` is genuine Traditional Chinese. OpenCC's `cn→tw` mapping rewrites `准` → `準` (which means "accurate / standard"). Suppress with `allow_chars: ["准"]`.
- Brand names that intentionally use the "wrong-script" character for stylistic reasons (`髮型沙龍` in Simplified copy). Suppress with `allow_chars: ["髮"]` or `allow_strings: ["髮型沙龍"]`.
- Quoted personal/place names from the other variant.

## Out of scope (v1)

- **CN vs HK vs TW vocabulary** (`软件` / `軟體` / `軟件`). Tracked as a future "phrase-blocklist" extension of this plugin or as a separate `@digitalby/locale-lint-chinese-regional` add-on. No commitment yet.
- **`.stringsdict`, `.xcstrings`, Android `strings.xml`** — parser support comes from core, will land alongside the v0.2 refactor.

## Source / authority

[OpenCC](https://github.com/BYVoid/OpenCC) — the de-facto reference for Simplified-Traditional conversion. Bundled dictionaries; no network access at runtime.
