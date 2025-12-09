import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/core/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/core',
      reporter: ['json', 'html', 'text'],
      include: [
        'src/core/TaskTypeProcessor.js',
        'src/core/PersonaActivator.js',
        'src/core/RealTimeResearchEngine.js'
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

