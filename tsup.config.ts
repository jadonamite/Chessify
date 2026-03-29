import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/lib/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  tsconfig: './tsconfig.lib.json', 
});