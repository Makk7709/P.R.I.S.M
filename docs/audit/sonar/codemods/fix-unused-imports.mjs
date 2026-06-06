#!/usr/bin/env node
/**
 * Codemod for SonarQube S1128 (unused imports) on TypeScript.
 *
 * Uses the ESLint Node API with `eslint-plugin-unused-imports`. Only the
 * `unused-imports/no-unused-imports` fixer is allowed to run: every other
 * auto-fixable rule (prefer-const, no-var, prefer-template, ...) is disabled
 * for this pass so the diff contains import removals ONLY. Removal is driven
 * by scope analysis (genuinely-unused bindings, type-aware of TS usage), so it
 * is behaviour-preserving.
 *
 * Usage: node docs/audit/sonar/codemods/fix-unused-imports.mjs
 */
import { ESLint } from 'eslint';
import unusedImports from 'eslint-plugin-unused-imports';

// Disable every other fixable rule so --fix touches imports only.
const OFF = Object.fromEntries(
  [
    'prefer-const',
    'no-var',
    'prefer-template',
    'prefer-arrow-callback',
    'no-useless-return',
    'no-useless-escape',
    'eqeqeq',
    'no-unused-vars',
    '@typescript-eslint/no-unused-vars',
    'no-fallthrough',
    'no-cond-assign',
  ].map((r) => [r, 'off'])
);

const eslint = new ESLint({
  fix: true,
  overrideConfig: [
    { rules: OFF },
    {
      files: ['**/*.ts'],
      plugins: { 'unused-imports': unusedImports },
      rules: { 'unused-imports/no-unused-imports': 'error' },
    },
  ],
});

const results = await eslint.lintFiles(['**/*.ts']);
await ESLint.outputFixes(results);

let fixedFiles = 0;
let removed = 0;
for (const r of results) {
  if (r.output !== undefined) {
    fixedFiles++;
    console.log(`  ${r.filePath.replace(process.cwd() + '/', '')}`);
  }
  removed += r.messages.filter(
    (m) => m.ruleId === 'unused-imports/no-unused-imports'
  ).length;
}
console.log(`S1128: removed unused imports in ${fixedFiles} file(s); residual reports: ${removed}`);
