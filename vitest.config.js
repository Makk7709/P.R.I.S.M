import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Exclure les anciens répertoires de test pour se concentrer sur les nouveaux.
  exclude: [
    'node_modules',
    'dist',
    '.idea',
    '.git',
    '.cache',
    '__tests_legacy__/**',
    'legacy_tests/**',
  ],
  test: {
    // Utilise le provider V8 pour la couverture, plus rapide et natif.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Cible la couverture uniquement sur nos fichiers sources critiques
      include: ['src/core/**', 'backend/database.js', 'persistence/prismStateStore.js'],
      all: true,
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
    // Environnement par défaut (peut être surchargé avec @vitest-environment)
    environment: 'node',
    globals: true, // Pour ne pas avoir à importer describe, it, etc.
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@core': path.resolve(__dirname, './src/core'),
    },
  },
}); 