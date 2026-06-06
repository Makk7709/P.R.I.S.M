import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Standard Node globals (timers, Buffer, process, URL, TextEncoder...).
        ...globals.node,
        // Modern Web/Node-18 globals not covered by the older `globals.node`
        // set but available under Node 18 (used across PRISM).
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        structuredClone: 'readonly',
        performance: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // Console allowed for PRISM logging
      'no-undef': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-throw-literal': 'error',
      'no-useless-return': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
    },
  },
  {
    // Test runner globals (vitest/jest) — provided at runtime by `globals: true`.
    files: [
      '**/*.{test,spec}.{js,ts,mjs,cjs}',
      '**/__tests__/**',
      '**/tests/**',
      '**/simulation/**',
      '**/staging/**',
    ],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        suite: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        vitest: 'readonly',
        jest: 'readonly',
      },
    },
  },
  prettier, // Must be last to override other configs
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.prism-snapshots/**',
      '**/*.min.js',
      '**/legacy_tests/**',
      '__tests_legacy__/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },
];
