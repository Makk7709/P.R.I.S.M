#!/usr/bin/env node
/**
 * Codemod for SonarQube S7781: prefer `String#replaceAll()` over
 * `String#replace()`.
 *
 * SAFE SUBSET ONLY: we rewrite `.replace(` to `.replaceAll(` *exclusively* when
 * the first argument is a regular-expression literal carrying the global flag
 * (`/.../g`). For a global regex, `replace` and `replaceAll` produce identical
 * output, so the rewrite is behaviour-preserving. We deliberately do NOT touch:
 *   - `.replace('str', ...)` with a string first arg (replace = first match
 *     only, replaceAll = all matches => NOT equivalent), and
 *   - non-global regex literals (`replaceAll` throws on a non-global regex).
 * Only the method name is swapped; the regex literal text is preserved verbatim.
 *
 * Usage: node docs/audit/sonar/codemods/replace-all.mjs [TIER1,TIER2,TIER3]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RULE = /(javascript|typescript):S7781/;
const tiers = (process.argv[2] || 'TIER1,TIER2,TIER3').split(',');
const JS = /\.(js|mjs|cjs|ts)$/;

const targets = JSON.parse(fs.readFileSync('docs/audit/sonar/codemods/targets.json', 'utf8'));
const files = new Set();
for (const [rule, byTier] of Object.entries(targets)) {
  if (!RULE.test(rule)) continue;
  for (const t of tiers) for (const f of byTier[t] || []) if (JS.test(f)) files.add(f);
}

// Match `.replace(` followed by a regex literal `/body/flags`. The regex body
// allows escaped chars (\\.) and any char except an unescaped `/`, newline, or
// backslash. We only rewrite when the captured flags contain `g`. Only the
// method identifier is replaced; the captured literal is re-emitted unchanged.
const RE = /\.replace\(\s*(\/(?:\\.|[^/\\\n])+\/([a-z]*))/g;

let changedFiles = 0;
let changedSites = 0;
for (const rel of [...files]) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  let sites = 0;
  const out = src.replace(RE, (m, _literal, flags) => {
    if (!flags.includes('g')) return m;
    sites++;
    return m.replace('.replace(', '.replaceAll(');
  });
  if (sites > 0 && out !== src) {
    fs.writeFileSync(abs, out);
    changedFiles++;
    changedSites += sites;
    console.log(`  ${rel}: ${sites} site(s)`);
  }
}
console.log(`S7781: rewrote ${changedSites} call(s) in ${changedFiles} file(s) [tiers=${tiers.join('+')}]`);
