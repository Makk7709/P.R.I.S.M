#!/usr/bin/env node
/**
 * Codemod for SonarQube S7748: "Don't use a zero fraction in the number."
 *
 * Token-based (NOT regex) so string/template/comment contents are never
 * touched: we tokenize each file with the @typescript-eslint parser (which
 * parses both JS and TS) and rewrite ONLY `Numeric` tokens. Normalisation,
 * value-preserving in every case (the numeric value is identical):
 *   1.0   -> 1        100.00 -> 100      3.50  -> 3.5
 *   1.0e5 -> 1e5      1.230  -> 1.23     5.    -> 5
 * Hex/binary/octal (0x/0b/0o), BigInt (…n) and integers are left untouched.
 * Only files flagged for S7748 (any tier) are processed. Edits are applied from
 * the end of the file backwards so earlier ranges stay valid.
 *
 * Usage: node docs/audit/sonar/codemods/zero-fraction.mjs [TIER1,TIER2,TIER3]
 */
import fs from 'node:fs';
import path from 'node:path';
import parser from '@typescript-eslint/parser';

const ROOT = process.cwd();
const RULE = /(javascript|typescript):S7748/;
const tiers = (process.argv[2] || 'TIER1,TIER2,TIER3').split(',');
const JS = /\.(js|mjs|cjs|ts|tsx)$/;

const targets = JSON.parse(fs.readFileSync('docs/audit/sonar/codemods/targets.json', 'utf8'));
const files = new Set();
for (const [rule, byTier] of Object.entries(targets)) {
  if (!RULE.test(rule)) continue;
  for (const t of tiers) for (const f of byTier[t] || []) if (JS.test(f)) files.add(f);
}

function normalize(raw) {
  // Skip non-decimal radixes, BigInt, and tokens without a fractional part.
  if (/^0[xXbBoO]/.test(raw)) return raw;
  if (raw.endsWith('n')) return raw;
  if (!raw.includes('.')) return raw;
  // Split off an exponent suffix if present.
  const expMatch = raw.match(/[eE][+-]?\d[\d_]*$/);
  const exp = expMatch ? expMatch[0] : '';
  let mantissa = exp ? raw.slice(0, -exp.length) : raw;
  if (!mantissa.includes('.')) return raw;
  const [intPart, fracPartRaw] = mantissa.split('.');
  let fracPart = fracPartRaw;
  // Strip trailing zeros from the fractional part.
  fracPart = fracPart.replace(/0+$/, '');
  mantissa = fracPart.length ? `${intPart}.${fracPart}` : intPart;
  // Avoid producing an empty integer (".5" stays "0.5"-like inputs untouched);
  // here intPart always exists because S7748 fires on X.0 forms.
  if (mantissa === '') return raw;
  const out = mantissa + exp;
  return out;
}

let changedFiles = 0;
let changedSites = 0;
for (const rel of [...files]) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  let ast;
  try {
    ast = parser.parseForESLint(src, {
      ecmaVersion: 2022,
      sourceType: 'module',
      range: true,
      tokens: true,
    }).ast;
  } catch {
    console.log(`  ${rel}: SKIP (parse error)`);
    continue;
  }
  const edits = [];
  for (const tok of ast.tokens) {
    if (tok.type !== 'Numeric') continue;
    const next = normalize(tok.value);
    if (next !== tok.value) edits.push([tok.range[0], tok.range[1], next]);
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
console.log(`S7748: rewrote ${changedSites} literal(s) in ${changedFiles} file(s) [tiers=${tiers.join('+')}]`);
