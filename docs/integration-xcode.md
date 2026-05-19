# Xcode integration

## Goal

Fail the Xcode build whenever a Simplified character appears in a `zh-Hant*.lproj` file (or vice versa), with the error displayed in the Issue Navigator at the offending line and column.

## Step 1: Add a Run Script build phase

In your `.xcodeproj`:

1. Select the project in the navigator.
2. Select the target you want to lint (typically the main app target).
3. Open the **Build Phases** tab.
4. Click **+** → **New Run Script Phase**.
5. Drag the new phase so it runs **before** "Compile Sources".
6. Rename it to `zh-lint` for clarity.

Paste this script body:

```sh
set -e
if ! command -v npx >/dev/null 2>&1; then
  echo "warning: zh-lint skipped — install Node (brew install node) to enable Chinese localization linting"
  exit 0
fi
npx --yes zh-lint@latest "$SRCROOT" --format=xcode
```

## Step 2: Pin the version (recommended)

Bump `latest` to a specific version when you cut a release branch, so a wild npm publish can't change your build:

```sh
npx --yes zh-lint@0.1.0 "$SRCROOT" --format=xcode
```

## Step 3: (Optional) Cache between clean builds

Add an output file so Xcode caches the phase between incremental builds:

- **Output Files** → `$(DERIVED_FILE_DIR)/zh-lint.stamp`
- Append to the script: `touch "$DERIVED_FILE_DIR/zh-lint.stamp"`

## Step 4: Add a `.zh-lint.yml` (optional)

If you have legitimate Traditional characters in Hans copy (brand names, proper nouns), drop a `.zh-lint.yml` at the repo root:

```yaml
allow_chars:
  - "髮"
allow_strings:
  - "App Store"
```

`zh-lint` will find the config by searching upward from `$SRCROOT`.

## Troubleshooting

- **`npx: command not found` in CI:** install Node on the runner (`brew install node` on macOS GitHub runners; pre-installed on `macos-14`).
- **Errors don't appear in Issue Navigator:** confirm `--format=xcode` is set. The Xcode format writes to stderr in `file:line:col: error: ...` form, which Xcode parses automatically.
- **A legitimate Traditional character is being flagged in a Hans file:** add it to `allow_chars` in `.zh-lint.yml`. Use `allow_strings` if it's an entire phrase you want to whitelist.
