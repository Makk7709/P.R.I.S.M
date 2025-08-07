import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/consensus/**/*.spec.js',
      'tests/integration/consensusProviders.integration.test.js'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        100: false,
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95
      }
    }
  }
});

