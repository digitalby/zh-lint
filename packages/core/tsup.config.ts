import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    target: 'node20',
    clean: true,
    sourcemap: false,
    dts: true,
    splitting: false,
    minify: false,
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    target: 'node20',
    clean: false,
    sourcemap: false,
    dts: true,
    splitting: false,
    minify: false,
    banner: { js: '#!/usr/bin/env node' },
  },
]);
