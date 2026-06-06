#!/usr/bin/env node
/**
 * Codemod for SonarQube S7773: prefer the static `Number` methods over the
 * legacy global functions.
 *
 * Only `parseFloat` and `parseInt` are rewritten: `Number.parseFloat` and
 * `Number.parseInt` are the exact same function objects as the globals, so the
 * change is strictly behaviour-preserving. `isNaN`/`isFinite` are intentionally
 * NOT rewritten because `Number.isNaN`/`Number.isFinite` differ semantically
 * (no coercion) and would change behaviour.
 *
 * Scoped to .js/.mjs/.cjs files flagged for S7773 (the repo eslint has no TS
 * parser, so .ts is handled separately). Usage:
 *   node docs/audit/sonar/codemods/number-parse.mjs [TIER1,TIER2]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RULE = /(javascript|typescript):S7773/;
const tiers = (process.argv[2] || 'TIER1,TIER2').split(',');
const JS = /\.(js|mjs|cjs)$/;

const targets = JSON.parse(fs.readFileSync('docs/audit/sonar/codemods/targets.json', 'utf8'));
const files = new Set();
for (const [rule, byTier] of Object.entries(targets)) {
  if (!RULE.test(rule)) continue;
  for (const t of tiers) for (const f of byTier[t] || []) if (JS.test(f)) files.add(f);
}

// Bare global call to parseFloat/parseInt: not a property access (no leading
// dot) and not part of a longer identifier (no leading word char).
const RE = /(?<![.\w$])(parseFloat|parseInt)(\s*)\(/g;

let changedFiles = 0;
let changedSites = 0;
for (const rel of [...files]) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  let sites = 0;
  const out = src.replace(RE, (m, fn, ws) => {
    sites++;
    return `Number.${fn}${ws}(`;
  });
  if (sites > 0 && out !== src) {
    fs.writeFileSync(abs, out);
    changedFiles++;
    changedSites += sites;
    console.log(`  ${rel}: ${sites} site(s)`);
  }
}
console.log(
  `S7773: rewrote ${changedSites} call(s) in ${changedFiles} file(s) [tiers=${tiers.join('+')}]`
);
