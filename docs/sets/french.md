# French variants (fr-FR, fr-CA)

**Status:** planned.
**Detection:** phrase blocklist (strategy B); minor character signals.
**Package:** `@digitalby/locale-lint-french`.

Metropolitan French (fr-FR) and Canadian / Québécois French (fr-CA) share the same Latin alphabet + diacritics. Bugs are almost entirely vocabulary, with strong Office québécois de la langue française (OQLF) terminology divergence in tech contexts (`courriel` vs `e-mail`, `fin de semaine` vs `week-end`).

## Variants and locale globs

| Locale glob | Variant |
|---|---|
| `**/fr.lproj`, `**/fr-FR.lproj`, `**/fr-BE.lproj`, `**/fr-CH.lproj` | `french-metropolitan` |
| `**/fr-CA.lproj`, `**/fr-QC.lproj` | `french-canadian` |

(`**/fr.lproj` defaults to fr-FR per Apple's locale resolution.)

## Character-level signals

Both variants share `à â æ ç é è ê ë î ï ô œ ù û ü ÿ`. There are no character-exclusive markers, so strategy A does not fire for this set.

## Vocabulary blocklists (sample, non-exhaustive)

### fr-FR vs fr-CA (OQLF-driven)

| Phrase | Wrong in | Right alternative |
|---|---|---|
| `e-mail` / `email` | fr-CA | `courriel` |
| `week-end` | fr-CA | `fin de semaine` |
| `parking` | fr-CA | `stationnement` |
| `shopping` | fr-CA | `magasinage` |
| `chat` (online chat) | fr-CA | `clavardage` |
| `spam` | fr-CA | `pourriel` |
| `mot de passe` | both | shared — not flagged |
| `téléphone portable` | fr-CA | `téléphone cellulaire` / `cellulaire` |
| `ordinateur portable` | both | shared |

### fr-CA-exclusive markers (sometimes leak into fr-FR)

| Phrase | Wrong in | Right alternative |
|---|---|---|
| `courriel` | fr-FR (informal/most app copy) | `e-mail` / `email` (or leave fr-CA-only) |
| `clavardage` | fr-FR | `chat` |
| `pourriel` | fr-FR | `spam` |
| `magasinage` | fr-FR | `shopping` / `achats en ligne` |
| `dépanneur` (as convenience store) | fr-FR | `supérette` / `épicerie de quartier` |

Numerical formatting also differs (decimal comma vs space-as-thousands-separator) but the plugin does not check numbers — that's a job for ICU MessageFormat validation, not this lint.

## Known false-positive classes

- Tech brand names that include `Email` or `Chat` as part of an English-language product name appearing in a fr-CA copy. Suppress with `allow_strings`.
- Anglicisms that are accepted in informal fr-CA (most Quebec startups still use `email` in app copy despite OQLF guidance). The plugin defaults to OQLF strictness; toggle off with `--variant-strictness=low`.
- Direct quotations from English-language sources retained verbatim.

## Sources / authority

- [OQLF Grand dictionnaire terminologique (GDT)](https://gdt.oqlf.gouv.qc.ca/) — the canonical fr-CA terminology authority.
- [Académie française dictionary](https://www.dictionnaire-academie.fr/) for fr-FR.
- Microsoft Style Guide French (Canada) and (France) sections.

## Implementation notes

- Same regex-based phrase detection as the English plugin.
- Two strictness levels:
  - `--variant-strictness=high` (default): flags every OQLF-canonical replacement.
  - `--variant-strictness=low`: only flags reverse-direction errors (fr-CA markers in fr-FR), which are unambiguous bugs.
- Dictionary citations: every entry includes a GDT entry URL in the source.
