# Arabic-script family (Arabic, Urdu, Persian)

**Status:** planned.
**Detection:** alphabet exclusivity (strategy A), with extra care around the yaa variants.
**Package:** `@digitalby/locale-lint-arabic-script`.

All three languages use the Arabic script as a base but each extends it with language-specific letters. RTL rendering is irrelevant to the lint (we work on code-points, not glyph order).

## Variants and locale globs

| Locale glob | Variant |
|---|---|
| `**/ar.lproj`, `**/ar-SA.lproj`, `**/ar-EG.lproj`, … | `arabic` |
| `**/ur.lproj`, `**/ur-PK.lproj`, `**/ur-IN.lproj` | `urdu` |
| `**/fa.lproj`, `**/fa-IR.lproj` | `persian` |

## Alphabets

### Arabic (28 base + hamza variants)

```
ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي
ء أ إ آ ؤ ئ ة
```

Final yaa is `ي` (U+064A).

### Persian (Farsi) (32)

Arabic base + four extra letters and a different yaa:

```
+ پ چ ژ گ
ك → ک  (U+06A9 keheh, not U+0643 kaf)
ي → ی  (U+06CC farsi yeh, not U+064A arabic yaa)
```

### Urdu (extends Persian)

Persian set + retroflex / aspirated consonants:

```
+ ٹ ڈ ڑ ھ (heh doachashmee)
ے (U+06D2 yeh barree) — final form distinct from ی
```

## Contamination signals to flag

| Letter | In ar | In ur | In fa | Notes |
|---|---|---|---|---|
| `پ` | ✗ | ✓ | ✓ | Persian/Urdu p-sound; common Farsi leak into Arabic |
| `چ` | ✗ | ✓ | ✓ | ch-sound |
| `ژ` | ✗ | ✓ | ✓ | zh-sound |
| `گ` | ✗ | ✓ | ✓ | g-sound |
| `ٹ` `ڈ` `ڑ` | ✗ | ✓ | ✗ | Urdu retroflex; clear Urdu marker |
| `ھ` | ✗ | ✓ | ✗ | heh doachashmee |
| `ے` | ✗ | ✓ | ✗ | yeh barree (Urdu final form) |
| `ي` (U+064A) | ✓ | ✗ | ✗ | Arabic final yaa — leak into fa/ur signals copy-paste from Arabic |
| `ی` (U+06CC) | ✗ | ✓ | ✓ | Farsi yeh — leak into Arabic is a real bug |
| `ك` (U+0643) | ✓ | ✗ | ✗ | Arabic kaf — leak into fa/ur signals copy-paste |
| `ک` (U+06A9) | ✗ | ✓ | ✓ | Keheh — Persian/Urdu kaf form |

The yaa and kaf forms are the most-leaked code-points. A Persian translator who copy-pastes from Arabic source often forgets to change `ي` → `ی` and `ك` → `ک`. This plugin will catch both.

## Known false-positive classes

- Direct Quranic / classical Arabic quotations inside Persian or Urdu strings — typically intentional and should be `allow_strings`'d.
- Proper nouns / names from another language (Arab personalities quoted in a Persian app).
- ZWNJ (U+200C) and ZWJ (U+200D) — non-letters, ignored entirely.

## Sources / authority

- [Unicode CLDR Arabic, Persian, Urdu locale data](https://cldr.unicode.org/).
- The yaa/kaf normalization rule comes from the W3C "Internationalization Best Practices for Specification Developers" guidance and is the default in Iranian government typography style guides.

## Implementation notes

- Same `Set<string>` per variant as Cyrillic. O(1) membership.
- Detection respects code-point identity (yaa U+064A vs U+06CC are different code-points; no normalization step).
- The plugin emits the offending character verbatim in the violation message so reviewers can copy/paste it into a search.
