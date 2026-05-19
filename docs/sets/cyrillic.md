# Cyrillic family (Russian, Ukrainian, Belarusian, Kazakh)

**Status:** planned.
**Detection:** alphabet exclusivity (strategy A).
**Package:** `@digitalby/locale-lint-cyrillic`.

The four languages share the Cyrillic base but each has language-specific letters. The most common contamination pattern is Russian leaking into the other three (because Russian translators often produce the first draft and it gets copy-pasted into `uk.lproj` / `be.lproj` / `kk.lproj` with imperfect localization).

## Variants and locale globs

| Locale glob | Variant |
|---|---|
| `**/ru.lproj`, `**/ru-RU.lproj` | `russian` |
| `**/uk.lproj`, `**/uk-UA.lproj` | `ukrainian` |
| `**/be.lproj`, `**/be-BY.lproj` | `belarusian` |
| `**/kk.lproj`, `**/kk-Cyrl.lproj`, `**/kk-KZ.lproj` | `kazakh` |

## Alphabets

### Russian (33 letters)
```
а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я
```

### Ukrainian (33 letters)
```
а б в г ґ д е є ж з и і ї й к л м н о п р с т у ф х ц ч ш щ ь ю я
```

### Belarusian (32 letters)
```
а б в г д е ё ж з і й к л м н о п р с т у ў ф х ц ч ш ы ь э ю я
```

### Kazakh (Cyrillic, 42 letters)
```
а ә б в г ғ д е ё ж з и й к қ л м н ң о ө п р с т у ұ ү ф х һ ц ч ш щ ъ ы і ь э ю я
```

## Contamination signals to flag

| Letter | In ru | In uk | In be | In kk | Notes |
|---|---|---|---|---|---|
| `ё` | ✓ | ✗ | ✓ | ✓ | Common Russian leak into Ukrainian |
| `ъ` | ✓ | ✗ | ✗ | ✓ | Hard sign |
| `ы` | ✓ | ✗ | ✓ | ✓ | Common Russian leak into Ukrainian |
| `э` | ✓ | ✗ | ✓ | ✓ | |
| `и` | ✓ | ✓ | ✗ | ✓ | Russian leak into Belarusian (be uses `і`) |
| `і` | ✗ | ✓ | ✓ | ✓ | Ukrainian leak into Russian |
| `ї` | ✗ | ✓ | ✗ | ✗ | Ukrainian-exclusive |
| `є` | ✗ | ✓ | ✗ | ✗ | Ukrainian-exclusive |
| `ґ` | ✗ | ✓ | ✗ | ✗ | Ukrainian-exclusive |
| `щ` | ✓ | ✓ | ✗ | ✓ | Russian leak into Belarusian (be has no `щ`) |
| `ў` | ✗ | ✗ | ✓ | ✗ | Belarusian-exclusive (a clear marker; rarely leaks the other way) |
| `ә` `ғ` `қ` `ң` `ө` `ұ` `ү` `һ` | ✗ | ✗ | ✗ | ✓ | Kazakh-exclusive Turkic letters |

A letter present in another locale's alphabet but absent from the current locale's alphabet is a violation.

## Known false-positive classes

- Proper nouns (names of Russian politicians/cities) intentionally rendered in source language in a non-Russian locale. Suppress with `allow_strings`.
- Loanword fragments that retain the source spelling (rare, suppressable case-by-case).

## Sources / authority

- [Unicode CLDR locale data](https://cldr.unicode.org/) for alphabet definitions.
- Wikipedia letter tables verified against the Ukrainian Language Institute, the Belarusian Spelling Code, and Kazakh state standards.

## Implementation notes

- Plain `Set<string>` per variant. Lowercase the input character, look up membership. O(1) per character.
- Comparable performance to the Chinese plugin (it already handles `Localizable.strings` files of 600+ lines in milliseconds).
- No external dictionary download — alphabets are inlined in the package.
