/**
 * Vitest configuration for Memoriaali v2.0 frontend
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__specs__/setup.ts'],
    // Only include test files in src directory
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Properly exclude node_modules, build outputs, and E2E directory
    exclude: [
      '**/node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'e2e/**', // E2E has its own Playwright tests
      '**/*.config.*',
      '**/dist/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.spec.{ts,tsx}',
        'src/__specs__/**',
        'src/app/layout.tsx',
        'src/app/page.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
});
