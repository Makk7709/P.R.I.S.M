// Measurement-only ESLint flat config: runs eslint-plugin-sonarjs (the SonarJS
// engine exposed via ESLint) to obtain a GROUND-TRUTH local count of the Sonar
// rules it implements. NOT wired into `npm run lint` (which keeps its own
// 0-error/1-warning gate). Used by docs/audit/sonar measurement scripts only.
//
// Note: the newer S77xx mechanical families (node: protocol, Number.parseX,
// decimal zeros, replaceAll, globalThis, ...) are NOT implemented in the OSS
// plugin and are handled separately via codemods. This config measures the
// structural/maintainability rules that ARE implemented.
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default [
  sonarjs.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '**/.venv/**',
      '**/venv/**',
      '**/__pycache__/**',
      '**/.next/**',
      '.prism-snapshots/**',
      '**/*.min.js',
      'utils/lz-string.js',
      'dashboard/**',
      // measurement noise: generated/vendored
    ],
  },
];
