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
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      all: false,  // ✅ pas de scan de tout le repo
      reportsDirectory: 'coverage',
      reporter: ['json', 'html', 'text', 'json-summary'],
      include: [
        'src/enterprise/enterpriseDetectionService.ts',
        'src/enterprise/enterpriseSanitizer.ts',
        'src/core/**/*.js',
        'prismCore.js'
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.spec.ts', 
        '**/*.test.ts',
        '**/dist/**',
        '**/*.d.ts',
        '**/legacy/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@core': path.resolve(__dirname, './src/core'),
    },
  },
}); 