/**
 * Vitest Configuration - Voice Module Tests
 * 
 * Configuration pour les tests du module vocal (ElevenLabs, ResponseMode)
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Fichiers de test
    include: [
      '__tests__/voice/**/*.test.ts'
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
        'src/voice/**/*.js'
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
