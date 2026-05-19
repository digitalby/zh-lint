# Baltic + Estonian (Lithuanian, Latvian, Estonian)

**Status:** planned.
**Detection:** alphabet exclusivity (strategy A), diacritic-driven.
**Package:** `@digitalby/locale-lint-baltic`.

Estonian is Finnic, not Baltic — it's grouped here because the three are commonly bundled in Baltic-region localization workflows and contaminate each other for the same workflow reasons. The plugin name is a known mild inaccuracy; we'll keep it for marketability.

## Variants and locale globs

| Locale glob | Variant |
|---|---|
| `**/lt.lproj`, `**/lt-LT.lproj` | `lithuanian` |
| `**/lv.lproj`, `**/lv-LV.lproj` | `latvian` |
| `**/et.lproj`, `**/et-EE.lproj` | `estonian` |

## Alphabets

### Lithuanian (32 letters)
```
a ą b c č d e ę ė f g h i į y j k l m n o p r s š t u ų ū v z ž
```

### Latvian (33 letters)
```
a ā b c č d e ē f g ģ h i ī j k ķ l ļ m n ņ o p r s š t u ū v z ž
```

### Estonian (27, plus foreign-loan letters)
```
a b d e f g h i j k l m n o p r s š z ž t u v w õ ä ö ü
```
(c, f, q, w, x, y appear only in foreign words.)

## Contamination signals to flag

| Letter | In lt | In lv | In et | Notes |
|---|---|---|---|---|
| `ą` `ę` `į` `ų` | ✓ | ✗ | ✗ | LT nasal vowels — clear LT markers |
| `ė` | ✓ | ✗ | ✗ | LT-only |
| `ā` `ē` `ī` `ū` | ✗ | ✓ | ✗ | LV macrons — clear LV markers |
| `ģ` `ķ` `ļ` `ņ` | ✗ | ✓ | ✗ | LV cedilla letters |
| `õ` | ✗ | ✗ | ✓ | ET-only (also Võro and Estonian Swedish, rare) |
| `ä` `ö` `ü` | ✗ | ✗ | ✓ | ET (also German loanwords — see false positives) |
| `š` `ž` | ✓ | ✓ | ✓ | shared; not a violation in any locale |
| `č` | ✓ | ✓ | ✗ | LT/LV; appearing in et is a violation |

The macrons (`ā ē ī ū`) and Latvian cedilla letters (`ģ ķ ļ ņ`) are the highest-signal Latvian markers. Lithuanian's nasal-vowel ogoneks (`ą ę į ų`) and `ė` are the highest-signal Lithuanian markers. `õ` is the most distinctive Estonian marker.

## Known false-positive classes

- `ä` `ö` `ü` in foreign-loanword brand names ("Müller", "Häagen-Dazs") in lt/lv files. Suppress with `allow_strings`.
- Latvian uses `ū` in non-Baltic contexts (rarely). Suppress with `allow_chars` only if the project has frequent loanword content.
- Estonian uses `š` `ž` in foreign words (already shared, no violation).

## Sources / authority

- [Unicode CLDR Lithuanian, Latvian, Estonian locale data](https://cldr.unicode.org/).
- Vasaras stilistikas vadlīnijas (Latvian); the Lithuanian Language Commission orthography rules; Eesti Keele Instituut style guides.

## Implementation notes

- `Set<string>` per variant. Trivial.
- The plugin should not flag uppercase versions of the same letters — normalize via lowercase before the lookup.
