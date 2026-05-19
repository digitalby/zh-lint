# Austronesian (Malay, Indonesian, Tagalog)

**Status:** planned.
**Detection:** primarily phrase blocklist (strategy B); a few character signals.
**Package:** `@digitalby/locale-lint-austronesian`.

Malay (Bahasa Melayu) and Indonesian (Bahasa Indonesia) share most of their Latin alphabet and post-1972 spelling reforms. The most common contamination is vocabulary leak in either direction (apps written for ms get copy-pasted into id and vice versa). Tagalog joins the family because Philippine localization workflows often share resources with Indonesian/Malay teams.

## Variants and locale globs

| Locale glob | Variant |
|---|---|
| `**/ms.lproj`, `**/ms-MY.lproj`, `**/ms-Latn.lproj` | `malay` |
| `**/id.lproj`, `**/id-ID.lproj` | `indonesian` |
| `**/tl.lproj`, `**/fil.lproj`, `**/fil-PH.lproj` | `tagalog` |

(`fil` is the Apple/CLDR canonical code for Filipino; `tl` is the older form. Both map to `tagalog` here.)

## Character-level signals (strategy A — limited)

| Character | Malay | Indonesian | Tagalog | Notes |
|---|---|---|---|---|
| `ñ` | ✗ | ✗ | ✓ | Tagalog Spanish-loanword marker (`Niño`, `Doña`); leak into ms/id is rare but possible |
| `é` `á` `í` `ó` `ú` | ✗ | ✗ | rare | Tagalog Spanish loanwords; could be loanword in ms/id too, low signal |

Character checks alone are weak for this set.

## Vocabulary blocklists (strategy B)

The plugin ships dictionaries of high-signal one-way markers.

### Malay vs Indonesian (sample, non-exhaustive)

| Phrase | Wrong in | Right alternative |
|---|---|---|
| `sahaja` | id | `saja` |
| `cuma` (as "only") | ms (formal) | `hanya` / `sahaja` |
| `kereta` (as "car") | id | `mobil` |
| `wang` (as "money") | id | `uang` |
| `pejabat` (as "office") | id | `kantor` |
| `bilik` (as "room") | id | `kamar` |
| `mobil` | ms (means "mobile" in ms, "car" in id) | high-risk one-way marker — only flag in ms with vocabulary context |
| `uang` | ms | `wang` |
| `kantor` | ms | `pejabat` |
| `kamar` | ms | `bilik` |

### Tagalog markers (vs ms/id)

| Phrase | Wrong in | Right alternative |
|---|---|---|
| `mga` (plural marker) | ms / id | (no equivalent — Tagalog-specific) |
| `ang` (definite topic marker) | ms / id | (Tagalog-specific) |
| `po` `opo` (politeness markers) | ms / id | (Tagalog-specific) |
| `selamat` | tl | Tagalog uses `kumusta` / `mabuhay` |
| `terima kasih` | tl | `salamat` |
| `selamat pagi` | tl | `magandang umaga` |

`selamat` is a high-signal ms/id marker — appears in both ms and id ("selamat pagi" / "selamat datang"). Its presence in a Tagalog file is a strong contamination signal.

## Known false-positive classes

- Brand / proper noun overlap is common (Asian commerce apps reuse names across markets). Suppress with `allow_strings`.
- Loanwords from English are *very* common in id/ms and rarely flag-worthy.
- Casual code-switching in informal copy. Suppress per-string.

## Sources / authority

- [Unicode CLDR ms / id / fil locale data](https://cldr.unicode.org/).
- Dewan Bahasa dan Pustaka (Malaysia) for ms vocabulary.
- Kamus Besar Bahasa Indonesia (KBBI) for id.
- UP Diksiyonaryong Filipino for tl.
- Apple's own iOS Localization Guidelines (id/ms/fil pages).

## Implementation notes

- Character checks fire on `ñ` only.
- Phrase checks: same regex strategy as the Romance plugin. Dictionaries are intentionally small — `ms vs id` is a minefield because many words exist in both languages with different meanings (a "false friend" minefield). Each entry must be a one-way marker, not a polysemous trap.
- Plugins are encouraged to ship a `--strict` flag opt-in that enables a wider, noisier dictionary. Off by default to keep base signal:noise high.
