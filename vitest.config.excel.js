/**
 * Vitest Configuration - Excel Module Tests
 * 
 * Configuration pour les tests du module d'analyse Excel
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Fichiers de test
    include: [
      '__tests__/excel/**/*.test.ts',
      '__tests__/chat/**/*.test.ts'
    ],
    
    // Exclusions
    exclude: [
      '**/node_modules/**',
      '**/dist/**'
    ],
    
    // Environnement
    environment: 'node',
    
    // Globals
    globals: true,
    
    // Timeout
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/excel/**/*.js',
        'src/chat/**/*.js'
      ],
      exclude: [
        '**/*.test.ts',
        '**/__tests__/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Reporter
    reporters: ['verbose'],
    
    // Pool
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    },
    
    // Snapshot
    snapshotFormat: {
      printBasicPrototype: false
    }
  },
  
  // Resolve
  resolve: {
    extensions: ['.ts', '.js', '.mjs']
  }
});
