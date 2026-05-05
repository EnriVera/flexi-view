import { defineConfig } from 'vite';
import { resolve } from 'path';
import { transform } from 'esbuild';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FlexiView',
      formats: ['es', 'umd'],
      fileName: (format) => `flexi-view.${format}.js`,
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