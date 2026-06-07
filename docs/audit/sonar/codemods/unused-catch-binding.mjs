#!/usr/bin/env node
/**
 * Codemod for SonarQube S2486 ("Handle this exception or don't catch it at
 * all"). SonarJS raises this whenever a catch clause declares a binding that is
 * never used in the catch body (regardless of whether the body does other
 * work). The behaviour-preserving fix is to drop the unused binding using the
 * ES2019 optional catch binding: `catch (e) { ... }` -> `catch { ... }`.
 *
 * AST-driven (@typescript-eslint parser, parses JS+TS): for each CatchClause we
 * (1) require an Identifier param, and (2) verify the identifier does NOT appear
 * as a token anywhere inside the catch block. If it is referenced we skip the
 * clause (conservative — never changes behaviour). The edit removes only the
 * ` (param)` portion between `catch` and the block `{`.
 *
 * Only files flagged for S2486 (any tier) are processed.
 * Usage: node docs/audit/sonar/codemods/unused-catch-binding.mjs [TIER1,TIER2,TIER3]
 */
import fs from 'node:fs';
import path from 'node:path';
import parser from '@typescript-eslint/parser';

const ROOT = process.cwd();
const RULE = /(javascript|typescript):S2486/;
const tiers = (process.argv[2] || 'TIER1,TIER2,TIER3').split(',');
const JS = /\.(js|mjs|cjs|ts|tsx)$/;

const targets = JSON.parse(fs.readFileSync('docs/audit/sonar/codemods/targets.json', 'utf8'));
const files = new Set();
for (const [rule, byTier] of Object.entries(targets)) {
  if (!RULE.test(rule)) continue;
  for (const t of tiers) for (const f of byTier[t] || []) if (JS.test(f)) files.add(f);
}

function collectCatches(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) collectCatches(n, out);
    return;
  }
  if (node.type === 'CatchClause') out.push(node);
  for (const k of Object.keys(node)) {
    if (k === 'parent' || k === 'loc' || k === 'range') continue;
    collectCatches(node[k], out);
  }
}

let changedFiles = 0;
let changedSites = 0;
for (const rel of [...files]) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  let parsed;
  try {
    parsed = parser.parseForESLint(src, {
      ecmaVersion: 2022,
      sourceType: 'module',
      range: true,
      tokens: true,
    });
  } catch {
    console.log(`  ${rel}: SKIP (parse error)`);
    continue;
  }
  const ast = parsed.ast;
  const catches = [];
  collectCatches(ast.body, catches);
  const edits = [];
  for (const clause of catches) {
    if (!clause.param || clause.param.type !== 'Identifier') continue;
    const name = clause.param.name;
    const body = clause.body; // BlockStatement
    // Is the identifier referenced as a token inside the catch block body?
    const used = ast.tokens.some(
      (t) =>
        t.type === 'Identifier' &&
        t.value === name &&
        t.range[0] >= body.range[0] &&
        t.range[1] <= body.range[1]
    );
    if (used) continue;
    // Remove `(param)` between `catch` and the block. Replace the span from the
    // end of `catch` keyword to the start of the block with a single space.
    const catchStart = clause.range[0]; // at 'catch'
    const blockStart = body.range[0]; // at '{'
    // find end of the word 'catch'
    const afterCatch = catchStart + 'catch'.length;
    edits.push([afterCatch, blockStart, ' ']);
  }
  if (edits.length === 0) continue;
  edits.sort((a, b) => b[0] - a[0]);
  let out = src;
  for (const [start, end, text] of edits) out = out.slice(0, start) + text + out.slice(end);
  if (out !== src) {
    fs.writeFileSync(abs, out);
    changedFiles++;
    changedSites += edits.length;
    console.log(`  ${rel}: ${edits.length} site(s)`);
  }
}
console.log(`S2486: removed ${changedSites} unused catch binding(s) in ${changedFiles} file(s) [tiers=${tiers.join('+')}]`);
