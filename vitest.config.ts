import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: { plugins: [] },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup/setupTests.ts'],
    globals: true,
    include: [
      'tests/unit/**/*.{test,spec}.ts?(x)',
      'tests/components/**/*.{test,spec}.ts?(x)',
      'tests/integration/**/*.{test,spec}.ts?(x)'
    ],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', 'app/**', 'migrations/**'],
    },
  },
});

