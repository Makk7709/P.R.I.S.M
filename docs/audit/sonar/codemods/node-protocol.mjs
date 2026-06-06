#!/usr/bin/env node
/**
 * Codemod for SonarQube S7772: Node.js built-in modules should be imported
 * using the "node:" protocol.
 *
 * Behaviour-preserving: under Node 18 `import 'fs'` and `import 'node:fs'`
 * resolve to the same built-in. Only known core modules are rewritten, only
 * when not already prefixed, and only in files that Sonar flagged for S7772 in
 * the requested tiers (derived from sonar_issues.csv).
 *
 * Usage: node docs/audit/sonar/codemods/node-protocol.mjs [TIER1,TIER2]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RULE = /(javascript|typescript):S7772/;
const tiers = (process.argv[2] || 'TIER1,TIER2').split(',');

const BUILTINS = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
  'fs/promises',
  'stream/promises',
  'dns/promises',
  'timers/promises',
  'stream/consumers',
  'stream/web',
  'util/types',
  'assert/strict',
]);

function isBuiltin(spec) {
  return BUILTINS.has(spec);
}

function targetFiles() {
  const targets = JSON.parse(fs.readFileSync('docs/audit/sonar/codemods/targets.json', 'utf8'));
  const files = new Set();
  for (const [rule, byTier] of Object.entries(targets)) {
    if (!RULE.test(rule)) continue;
    for (const t of tiers) for (const f of byTier[t] || []) files.add(f);
  }
  return [...files];
}

// Rewrite the module specifier inside import/export/require/dynamic-import.
const SPEC_RE = /(\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)(['"])([^'"]+)\2/gm;

let changedFiles = 0;
let changedSites = 0;
for (const rel of targetFiles()) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  let sites = 0;
  const out = src.replace(SPEC_RE, (m, kw, q, spec) => {
    if (spec.startsWith('node:')) return m;
    if (!isBuiltin(spec)) return m;
    sites++;
    return `${kw}${q}node:${spec}${q}`;
  });
  if (sites > 0 && out !== src) {
    fs.writeFileSync(abs, out);
    changedFiles++;
    changedSites += sites;
    console.log(`  ${rel}: ${sites} site(s)`);
  }
}
console.log(
  `S7772: rewrote ${changedSites} specifier(s) in ${changedFiles} file(s) [tiers=${tiers.join('+')}]`
);
