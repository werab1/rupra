import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Build ukázky do jednoho souboru (artefakt): jeden JS, jeden CSS, bez dynamických chunků. */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: 'demo.html',
      output: { inlineDynamicImports: true },
    },
  },
});
