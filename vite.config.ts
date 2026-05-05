import { defineConfig } from 'vite';
import { resolve } from 'path';
import { transform } from 'esbuild';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ViewTools',
      formats: ['es', 'umd'],
      fileName: (format) => `view-tools.${format}.js`,
    },
    rollupOptions: {
      external: ['lit'],
      output: {
        globals: { lit: 'Lit' },
      },
    },
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});