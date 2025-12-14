import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/infographic/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/infographic/**/*.js'],
      exclude: ['node_modules', 'tests'],
      thresholds: {
        statements: 95,
        branches: 85,
        functions: 95,
        lines: 95
      }
    },
    testTimeout: 30000
  }
});



