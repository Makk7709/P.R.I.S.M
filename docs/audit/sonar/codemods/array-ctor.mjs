#!/usr/bin/env node
/**
 * Codemod for SonarQube S7723: prefer `new Array()` over `Array()`.
 *
 * `Array(...)` and `new Array(...)` are specified to behave identically (the
 * Array constructor ignores whether it is called with `new`), so this rewrite is
 * strictly behaviour-preserving. Only bare `Array(` calls (not a property access
 * like `foo.Array(` and not `new Array(`) are rewritten, in files flagged for
 * S7723. Usage: node docs/audit/sonar/codemods/array-ctor.mjs [TIER1,TIER2,TIER3]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RULE = /(javascript|typescript):S7723/;
const tiers = (process.argv[2] || 'TIER1,TIER2,TIER3').split(',');
const JS = /\.(js|mjs|cjs|ts)$/;

const targets = JSON.parse(fs.readFileSync('docs/audit/sonar/codemods/targets.json', 'utf8'));
const files = new Set();
for (const [rule, byTier] of Object.entries(targets)) {
  if (!RULE.test(rule)) continue;
  for (const t of tiers) for (const f of byTier[t] || []) if (JS.test(f)) files.add(f);
}

// Bare `Array(` not preceded by `new `, not a property access (`.Array`), and
// not part of a longer identifier (e.g. `BigArray(`, `isArray(`).
const RE = /(?<!\bnew\s)(?<![.\w$])Array(\s*)\(/g;

let changedFiles = 0;
let changedSites = 0;
for (const rel of [...files]) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  let sites = 0;
  const out = src.replace(RE, (m, ws) => {
    sites++;
    return `new Array${ws}(`;
  });
  if (sites > 0 && out !== src) {
    fs.writeFileSync(abs, out);
    changedFiles++;
    changedSites += sites;
    console.log(`  ${rel}: ${sites} site(s)`);
  }
}
console.log(`S7723: rewrote ${changedSites} call(s) in ${changedFiles} file(s) [tiers=${tiers.join('+')}]`);
