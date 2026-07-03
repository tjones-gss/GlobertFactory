import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'compiled',
    emptyOutDir: false,
    lib: {
      entry: 'src/pixi-floor.js',
      name: 'GlobertPixi',
      formats: ['iife'],
      fileName: () => 'pixi-floor.js'
    }
  }
});

