# Romance Iberian + Italian (Spanish, es-419, Italian, Portuguese pt-PT, Portuguese pt-BR)

**Status:** planned.
**Detection:** mixed — character exclusivity for a few high-signal letters, plus phrase blocklist for vocabulary divergence.
**Package:** `@digitalby/locale-lint-romance-iberian`.

This is the first "mixed-strategy" set. Spanish-vs-Italian-vs-Portuguese is partly distinguishable by character (`ñ`, `¿`, `¡`), but the meatier bugs are vocabulary leakage between the closely-related variants (es-ES vs es-419, pt-PT vs pt-BR).

## Variants and locale globs

| Locale glob | Variant |
|---|---|
| `**/es.lproj`, `**/es-ES.lproj` | `spanish-iberian` |
| `**/es-419.lproj`, `**/es-MX.lproj`, `**/es-AR.lproj`, … | `spanish-latam` |
| `**/it.lproj`, `**/it-IT.lproj` | `italian` |
| `**/pt-PT.lproj`, `**/pt.lproj` (with locale-resolution caveat) | `portuguese-iberian` |
| `**/pt-BR.lproj` | `portuguese-brazilian` |

(`**/pt.lproj` is ambiguous in iOS; the plugin defaults it to `portuguese-iberian` but `.locale-lint.yml` can override.)

## Character-level signals (strategy A)

| Character | Spanish | Italian | Portuguese | Notes |
|---|---|---|---|---|
| `ñ` | ✓ | ✗ | ✓ | Italian uses `gn`. ñ in `it.lproj` = violation. |
| `¿` `¡` | ✓ | ✗ | ✗ | Inverted punctuation is Spanish-exclusive among these. |
| `ç` | rare loanword | rare | ✓ (pt-PT mostly) | Cedilla — Portuguese marker. |
| `ã` `õ` | ✗ | ✗ | ✓ | Portuguese nasal vowels. ã/õ in es or it = violation. |
| `ê` `â` `ô` | ✗ | rare | ✓ | Portuguese circumflexes. |
| `è` `ò` `ù` | ✗ | ✓ | rare | Italian grave accents. è/ò/ù in es = violation. |
| `à` `á` `é` `í` `ó` `ú` | ✓ | ✓ | ✓ | Shared across all three — never a violation. |
| `ü` | ✓ (rare; `pingüino`) | ✗ | ✗ | Diaeresis — Spanish-only here. |

## Vocabulary blocklists (strategy B)

The plugin ships small, curated phrase dictionaries. Each entry is a word with a clear "in variant X = wrong" reading. Entries are case-insensitive word-boundary matches.

### es-ES vs es-419 (sample, non-exhaustive)

| Phrase | Wrong in | Right alternative |
|---|---|---|
| `ordenador` | es-419 | `computadora` |
| `móvil` (as "mobile phone") | es-419 | `celular` |
| `coche` (as "car") | es-419 (some countries) | `auto` / `carro` |
| `vosotros` (conjugation) | es-419 | second-person plural uses `ustedes` |
| `computadora` | es-ES | `ordenador` |
| `celular` (as "mobile phone") | es-ES | `móvil` |
| `carro` (as "car") | es-ES | `coche` |

### pt-PT vs pt-BR (sample, non-exhaustive)

| Phrase | Wrong in | Right alternative |
|---|---|---|
| `autocarro` | pt-BR | `ônibus` |
| `comboio` | pt-BR | `trem` |
| `frigorífico` | pt-BR | `geladeira` |
| `pequeno-almoço` | pt-BR | `café da manhã` |
| `telemóvel` | pt-BR | `celular` |
| `casa de banho` | pt-BR | `banheiro` |
| `ônibus` | pt-PT | `autocarro` |
| `trem` | pt-PT | `comboio` |
| `geladeira` | pt-PT | `frigorífico` |
| `celular` | pt-PT | `telemóvel` |

Pre-1990-spelling-reform forms (e.g. `acção`, `direcção`) are pt-PT-only signals when the file is supposed to be modernized; the plugin will not flag them by default — too noisy. Optional `--strict-orthography` flag tracked as future work.

### Italian-into-Spanish / Spanish-into-Italian (sample)

| Phrase | Wrong in | Right alternative |
|---|---|---|
| `ciao` (greeting) | es | `hola` |
| `prego` | es | `de nada` |
| `grazie` | es | `gracias` |
| `gracias` | it | `grazie` |
| `hola` (greeting) | it | `ciao` / `salve` |

## Known false-positive classes

- Brand names (`Mercado Livre`, `Banco Itaú`) and proper nouns that legitimately appear across all variants. Suppress with `allow_strings`.
- Direct quotations from other-variant speakers.
- Code-switching in casual app copy (intentional `ciao` in a Spanish-language travel app). Suppress.

## Sources / authority

- [Unicode CLDR locale data](https://cldr.unicode.org/) for character lists.
- Real Academia Española corpus (RAE) and Asociación de Academias de la Lengua Española (ASALE) Pan-Hispanic dictionary for es-ES vs es-419 markers.
- Acordo Ortográfico da Língua Portuguesa de 1990 for pt-PT/pt-BR spelling rules.
- Vocabolario Treccani for Italian markers.

## Implementation notes

- Character checks: `Set<string>` per variant, same shape as Cyrillic plugin.
- Phrase checks: compiled regex per variant — `/\b(word1|word2|…)\b/iu` with Unicode word boundaries. Cost is `O(length of value)` per regex per entry.
- Dictionaries kept short and conservative on first ship. PRs welcome to expand — each new entry must include a citation in the PR description.
