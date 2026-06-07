import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fixPathsPlugin from './vite-plugin-fix-paths.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Résoudre le chemin réel (évite problèmes avec espaces)
const projectRoot = path.resolve(__dirname);

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
  plugins: [
    fixPathsPlugin()
  ],
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    // Forcer pool forks pour isoler les tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true
      }
    },
    coverage: {
      provider: 'v8',
      all: false,  // ✅ pas de scan de tout le repo
      reportsDirectory: 'coverage',
      reporter: ['json', 'html', 'text', 'json-summary'],
      include: [
        'src/enterprise/enterpriseDetectionService.ts',
        'src/enterprise/enterpriseSanitizer.ts',
        'src/core/**/*.js',
        'src/voice/**/*.js',
        'src/modules/voice/**/*.js',
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
      '@': projectRoot,
      '@core': path.resolve(projectRoot, 'src/core'),
      '@orchestrator': path.resolve(projectRoot, 'src/orchestrator'),
      '@excel': path.resolve(projectRoot, 'src/excel'),
      '@security': path.resolve(projectRoot, 'src/security'),
      '@audit': path.resolve(projectRoot, 'src/audit'),
    },
    // Extension resolution
    extensions: ['.js', '.ts', '.json', '.mjs'],
  },
  // Optimiser pour ESM avec résolution robuste
  esbuild: {
    target: 'node18',
    format: 'esm'
  },
});
