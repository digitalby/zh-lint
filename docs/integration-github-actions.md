# GitHub Actions integration

## Composite action (one step)

```yaml
name: zh-lint
on:
  pull_request:
    paths:
      - '**/zh-Hans*.lproj/**'
      - '**/zh-Hant*.lproj/**'
      - '**/zh-HK.lproj/**'
      - '**/zh-TW.lproj/**'
      - '.zh-lint.yml'
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: digitalby/zh-lint@v0.1.1
        with:
          root: '.'
          format: 'github'
```

Inputs:

| name | required | default | description |
|---|---|---|---|
| `root` | no | `.` | Directory to scan |
| `config` | no | (auto) | Path to `.zh-lint.yml` |
| `format` | no | `github` | `xcode \| github \| plain \| json` |
| `version` | no | `latest` | npm dist-tag or semver |

Violations appear as inline annotations on the PR diff thanks to `format: github`.

## Without the composite (raw npm)

If you'd rather pin Node yourself:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
- run: npx --yes @digitalby/zh-lint@0.1.1 . --format=github
```

## Pre-commit hook

```yaml
# .pre-commit-config.yaml
- repo: local
  hooks:
    - id: zh-lint
      name: zh-lint
      entry: npx --yes @digitalby/zh-lint@latest . --format=plain
      language: system
      pass_filenames: false
      files: '\.(strings)$'
```
