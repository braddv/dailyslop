import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/alchemy/',
  build: { outDir: '../public/alchemy', emptyOutDir: true },
});
