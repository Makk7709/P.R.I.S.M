/**
 * Vitest Configuration - PDF Export Tests
 * 
 * Configuration dédiée aux tests du module d'export PDF PRISM.
 * Objectif: >= 95% coverage sans mocks.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'tests/pdf/**/*.spec.ts',
      'tests/pdf/**/*.test.ts'
    ],
    exclude: [
      'node_modules',
      'dist'
    ],
    coverage: {
      provider: 'v8',
      all: false,
      reportsDirectory: 'coverage/pdf',
      reporter: ['json', 'html', 'text', 'json-summary'],
      include: [
        'src/export/**/*.js'
      ],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts'
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95
      }
    },
    testTimeout: 30000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});

