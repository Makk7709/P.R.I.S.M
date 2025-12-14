import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['__tests__/integration/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    // Forcer la résolution des modules .js
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
  },
  resolve: {
    // Permettre la résolution de fichiers .js sans extension dans les imports
    extensions: ['.js', '.ts', '.json'],
    // Alias pour faciliter les imports
    alias: {
      '@': path.resolve(__dirname, './'),
      '@core': path.resolve(__dirname, './src/core'),
      '@orchestrator': path.resolve(__dirname, './src/orchestrator'),
      '@excel': path.resolve(__dirname, './src/excel'),
    },
  },
  // Configuration pour ESM
  esbuild: {
    target: 'node18'
  },
});
