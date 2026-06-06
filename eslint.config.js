import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

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
  {
    // Browser-context files that legitimately use Web platform globals
    // (window, CustomEvent, EventTarget, Event, Audio, ...). prismReflex.js is
    // runtime code that dispatches DOM CustomEvents; tests/voice/setup.js is a
    // jsdom test harness that polyfills the Audio/Event DOM API. Declaring the
    // browser globals here resolves the no-undef reports without altering any
    // runtime behaviour.
    files: ['prismReflex.js', 'tests/voice/setup.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        CustomEvent: 'readonly',
        EventTarget: 'readonly',
        Event: 'readonly',
        Audio: 'readonly',
      },
    },
  },
  {
    // TypeScript files. We register the typescript-eslint parser so `.ts`
    // stops failing with "Parsing error: Unexpected token". This is a
    // SYNTACTIC setup only: we deliberately do NOT enable type-aware linting
    // (`projectService`/`project`) to avoid surfacing the ~511 pre-existing
    // `tsc` type errors and to keep linting fast. Mechanical `--fix` rules
    // (prefer-const, node: protocol, etc.) work without type information.
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImports,
    },
    rules: {
      // The core `no-undef` rule misfires on TypeScript type references and
      // ambient globals; the compiler already enforces this. Disable it for
      // `.ts` to avoid drowning real findings in false positives.
      'no-undef': 'off',
      // Defer unused-variable reporting to the TS-aware rule, which understands
      // type-only usage, enums and interfaces (the core rule misfires on them).
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Auto-removable on --fix; addresses Sonar S1128 (unused imports). Only
      // genuinely-unused imports are removed (scope analysis, type-aware of
      // TS usage), so this is behaviour-preserving.
      'unused-imports/no-unused-imports': 'warn',
    },
  },
  prettier, // Must be last to override other configs
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      // Generated build artifacts — NEVER lint generated code (e.g. the
      // Next.js compiler output under dashboard/.next). Linting it produces
      // thousands of meaningless errors against minified/transpiled output.
      '**/.next/**',
      '.prism-snapshots/**',
      '**/*.min.js',
      '**/legacy_tests/**',
      '__tests_legacy__/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },
];
