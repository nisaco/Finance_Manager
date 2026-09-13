import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

/** Builds the design preview harness only. Never part of the app build. */
export default defineConfig({
  root: path.resolve(__dirname, 'tools/overview-preview'),
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(__dirname, 'preview-dist'),
    emptyOutDir: true,
  },
});
