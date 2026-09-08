import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  root: 'client',
  publicDir: 'public',
  resolve: {
    alias: {
      '$lib': path.resolve(__dirname, 'client/src/lib')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('/node_modules/mermaid/')) {
            return 'vendor-mermaid';
          }
          if (normalized.includes('/node_modules/marked/') || normalized.includes('/node_modules/dompurify/')) {
            return 'vendor-markdown';
          }
          if (normalized.includes('/node_modules/svelte/') || normalized.includes('/node_modules/@sveltejs/')) {
            return 'vendor-svelte';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});
