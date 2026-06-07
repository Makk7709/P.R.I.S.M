#!/usr/bin/env node
/**
 * Codemod for unused ESM imports (S1128) on .js sources.
 *
 * Fully isolated: `overrideConfigFile: true` prevents inheriting the project
 * ESLint config, so the ONLY fixer that can run is
 * `unused-imports/no-unused-imports`. Removal is scope-driven (genuinely-unused
 * bindings), so it is behaviour-preserving. `reportUnusedDisableDirectives` is
 * off so no intentional eslint-disable comments are touched.
 *
 * Usage: node docs/audit/sonar/codemods/fix-unused-imports-js.mjs
 */
import { ESLint } from 'eslint';
import unusedImports from 'eslint-plugin-unused-imports';

const eslint = new ESLint({
  fix: true,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ['**/*.js', '**/*.mjs'],
      languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
      linterOptions: { reportUnusedDisableDirectives: 'off' },
      plugins: { 'unused-imports': unusedImports },
      rules: { 'unused-imports/no-unused-imports': 'error' },
    },
    {
      ignores: [
        'node_modules/**', 'dist/**', 'build/**', 'coverage/**',
        '**/.venv/**', '**/venv/**', '**/__pycache__/**', '**/.next/**',
        '.prism-snapshots/**', '**/*.min.js', 'utils/lz-string.js',
        'dashboard/**',
      ],
    },
  ],
});

const results = await eslint.lintFiles(['**/*.js', '**/*.mjs']);
await ESLint.outputFixes(results);

let fixedFiles = 0;
let removed = 0;
for (const r of results) {
  if (r.output !== undefined) {
    fixedFiles++;
    console.log(`  ${r.filePath.replace(`${process.cwd()}/`, '')}`);
  }
  removed += r.messages.filter(
    (m) => m.ruleId === 'unused-imports/no-unused-imports'
  ).length;
}
console.log(`S1128(.js): removed unused imports in ${fixedFiles} file(s); residual reports: ${removed}`);
