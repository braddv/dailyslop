import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({ root: fileURLToPath(new URL('.', import.meta.url)), base: '/magus/', build: { outDir: '../public/magus', emptyOutDir: true, chunkSizeWarningLimit: 1600 }, server: { port: 5173 } });
