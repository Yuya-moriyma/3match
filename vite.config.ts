import { defineConfig } from 'vite';

export default defineConfig({
  base: '/3match/', // GitHub Pages用
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
