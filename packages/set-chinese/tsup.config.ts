import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node20',
  clean: true,
  sourcemap: false,
  dts: true,
  splitting: false,
  minify: false,
});
