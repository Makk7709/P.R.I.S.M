import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/orchestrator/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 60000, // 60s pour les appels API réels
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/orchestrator/**/*.js'
      ],
      exclude: [
        'node_modules',
        'tests'
      ],
      thresholds: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    }
  }
});

