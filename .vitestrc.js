import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration Vitest avec résolution robuste des chemins
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    // Forcer résolution ESM pour éviter problèmes avec espaces
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true
      }
    },
    // Inclure tous les tests
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'coverage', '**/*.d.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@core': path.resolve(__dirname, './src/core'),
      '@orchestrator': path.resolve(__dirname, './src/orchestrator'),
      '@excel': path.resolve(__dirname, './src/excel'),
      '@security': path.resolve(__dirname, './src/security'),
      '@audit': path.resolve(__dirname, './src/audit'),
    },
    // Extension resolution
    extensions: ['.js', '.ts', '.json', '.mjs'],
  },
  // Optimiser pour ESM
  esbuild: {
    target: 'node18',
    format: 'esm'
  },
});
