# @digitalby/locale-lint-chinese

Chinese (Simplified vs Traditional) script-contamination plugin for [`@digitalby/locale-lint`](https://www.npmjs.com/package/@digitalby/locale-lint).

OpenCC-backed character-exclusivity detection across `zh-Hans` / `zh-CN` / `zh-SG` (Simplified) and `zh-Hant` / `zh-HK` / `zh-TW` / `zh-MO` (Traditional) `.lproj` directories.

```sh
npm install --save-dev @digitalby/locale-lint @digitalby/locale-lint-chinese
npx locale-lint . --format=xcode
```

`.locale-lint.yml`:

```yaml
plugins:
  - "@digitalby/locale-lint-chinese"

# `准` in 批准 is genuine Traditional Chinese but OpenCC's bidirectional
# mapping flags it as a Simplified-form replacement for 準. Suppress here.
allow_chars:
  - "准"
```

See [docs/sets/chinese.md](https://github.com/digitalby/zh-lint/blob/main/docs/sets/chinese.md) for the full detection model, variants, locale globs, false-positive classes, and sources.

## License

MIT.
