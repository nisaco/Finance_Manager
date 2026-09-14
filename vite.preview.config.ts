import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

/** Builds the design preview harness only. Never part of the app build. */
export default defineConfig({
  root: path.resolve(__dirname, 'tools/overview-preview'),
  base: './',
  plugins: [react(), tailwindcss()],
  /**
   * The preview is reviewed inside a sandboxed iframe where the browser storage
   * APIs are unavailable. Rather than change how the app stores anything, the
   * preview build swaps the two identifiers for an in-memory store installed by
   * index.html. The shipped app is compiled by vite.config.ts and is untouched.
   */
  define: {
    localStorage: '__lgMemStore',
    sessionStorage: '__lgMemStore',
  },
  build: {
    outDir: path.resolve(__dirname, 'preview-dist'),
    emptyOutDir: true,
  },
});
