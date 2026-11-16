import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: { jsx: 'automatic' },
  server: {
    // Forward API calls to the Express backend during development
    proxy: {
      '/convert': 'http://localhost:3000',
      '/currencies': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
  },
});