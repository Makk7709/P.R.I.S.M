/**
 * Vitest Configuration - Voice Module Tests
 * 
 * Configuration dédiée aux tests du module vocal PRISM.
 * Objectif: >= 95% coverage sans mocks.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Setup file pour polyfills Audio
    setupFiles: ['./tests/voice/setup.js'],
    include: [
      'tests/voice/**/*.spec.ts',
      'tests/voice/**/*.test.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      '__tests_legacy__/**',
      'legacy_tests/**'
    ],
    coverage: {
      provider: 'v8',
      all: false,
      reportsDirectory: 'coverage/voice',
      reporter: ['json', 'html', 'text', 'json-summary'],
      include: [
        'src/voice/**/*.js',
        'src/modules/voice/**/*.js'
      ],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/dist/**'
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95
      }
    },
    // Timeout étendu pour tests audio
    testTimeout: 30000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@voice': path.resolve(__dirname, './src/voice'),
      '@modules': path.resolve(__dirname, './src/modules')
    }
  }
});

