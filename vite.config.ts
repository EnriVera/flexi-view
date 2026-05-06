import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FlexiView',
      formats: ['es', 'umd'],
      fileName: (format) => `flexi-view.${format}.js`,
    },
    rollupOptions: {
      // Do NOT externalize lit - bundle it to avoid version conflicts
      // Previously externalized, but that caused "directive not a function" errors
      // when used with bundlers like Vite that have their own lit version
    },
    outDir: 'dist',
    // Prevent side effects from being tree-shaken
    sideEffects: ['lit'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});