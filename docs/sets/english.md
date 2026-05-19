# English variants (en-GB, en-US, en-AU)

**Status:** planned.
**Detection:** pure phrase blocklist (strategy B).
**Package:** `@digitalby/locale-lint-english`.

All three variants share the 26-letter Latin alphabet. Bugs here are vocabulary divergence — "color" in `en-GB.lproj`, "lift" in `en-US.lproj`, "pavement" in `en-AU.lproj` with American meaning.

## Variants and locale globs

| Locale glob | Variant |
|---|---|
| `**/en-GB.lproj`, `**/en-IE.lproj` | `english-british` |
| `**/en.lproj`, `**/en-US.lproj` | `english-american` |
| `**/en-AU.lproj`, `**/en-NZ.lproj` | `english-australian` |

(`**/en.lproj` defaults to en-US per Apple's convention.)

## Vocabulary blocklists (sample, non-exhaustive)

### en-US vs en-GB

| Spelling | Wrong in | Right form |
|---|---|---|
| `color` | en-GB | `colour` |
| `colour` | en-US | `color` |
| `center` | en-GB | `centre` |
| `centre` | en-US | `center` |
| `organize` | en-GB (formal) | `organise` |
| `organise` | en-US | `organize` |
| `analyze` | en-GB | `analyse` |
| `analyse` | en-US | `analyze` |
| `traveling` | en-GB | `travelling` |
| `travelling` | en-US | `traveling` |
| `aluminum` | en-GB | `aluminium` |
| `aluminium` | en-US | `aluminum` |

### Word choice (en-US vs en-GB)

| Phrase | Wrong in | Right form |
|---|---|---|
| `elevator` | en-GB | `lift` |
| `lift` (as elevator) | en-US | `elevator` |
| `apartment` | en-GB | `flat` |
| `gasoline` | en-GB | `petrol` |
| `truck` | en-GB | `lorry` |
| `cookie` | en-GB | `biscuit` |
| `garbage` / `trash` | en-GB | `rubbish` |
| `vacation` | en-GB | `holiday` |
| `mailbox` | en-GB | `postbox` / `letterbox` |
| `pants` (as trousers) | en-GB | `trousers` |
| `subway` (transit) | en-GB | `underground` / `tube` |

### en-AU markers

en-AU largely follows en-GB spelling but has its own vocabulary. The plugin will flag:

| Phrase | Wrong in | Right form |
|---|---|---|
| `arvo` (afternoon) | en-US, en-GB (informal) | en-AU-specific |
| `mate` (as friend) | en-US (rare) | en-GB/AU OK |
| `petrol station` | en-US | `gas station` |
| `thongs` (as flip-flops) | en-US | en-AU/casual en-GB only |

Note: en-AU vs en-GB overlaps so heavily that en-AU plugin checks mostly piggyback on en-GB. The plugin should default to flagging en-US markers in en-AU and only flag en-GB-vs-en-AU divergences when explicitly enabled (`--variant-strictness=high`).

## Known false-positive classes

- Brand names that are spelled regionally (`Realize Inc.` in a `en-GB.lproj`). Suppress with `allow_strings`.
- Technical jargon where the spelling is fixed by external standards (e.g. ISO uses "kilometre" globally, but code identifiers may keep `meter`). Suppress per-string.
- Proper nouns and addresses (a "Center" inside an Atlanta address is fine in en-GB copy).

## Sources / authority

- [Oxford English Dictionary](https://www.oed.com/) entries with regional labels.
- [Merriam-Webster](https://www.merriam-webster.com/) for en-US authority.
- [Macquarie Dictionary](https://www.macquariedictionary.com.au/) for en-AU.
- Apple HIG and Microsoft Style Guide regional sections.

## Implementation notes

- Pure regex-based detection. No character checks.
- Word-boundary matching with case-insensitive Unicode regex.
- Dictionaries are kept small and curated. PRs to expand must include OED/Webster/Macquarie citation per entry.
- The plugin emits the offending phrase plus the suggested replacement, so the user sees `error: en-US "elevator" in en-GB file; consider "lift" (key="action.go_up")`.
