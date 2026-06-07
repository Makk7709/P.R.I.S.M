// Aggregates the SonarJS ESLint harness output into a stable, reproducible
// decomposition (by rule, by category, by tier) used for before/after deltas.
// Reads an ESLint JSON report path (argv[2]); prints a JSON summary to stdout.
import { readFileSync } from 'node:fs';

const reportPath = process.argv[2];
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

// SonarJS rules that map to "Security Hotspot" in SonarQube (not code-quality).
const HOTSPOT_RULES = new Set([
  'sonarjs/pseudo-random',
  'sonarjs/slow-regex',
  'sonarjs/os-command',
  'sonarjs/no-os-command-from-path',
  'sonarjs/code-eval',
  'sonarjs/no-clear-text-protocols',
  'sonarjs/x-powered-by',
  'sonarjs/hashing',
  'sonarjs/insecure-cookie',
  'sonarjs/no-hardcoded-secrets',
  'sonarjs/no-hardcoded-passwords',
  'sonarjs/no-hardcoded-ip',
  'sonarjs/publicly-writable-directories',
  'sonarjs/csrf',
  'sonarjs/cors',
  'sonarjs/encryption',
  'sonarjs/no-weak-cipher',
  'sonarjs/no-weak-keys',
  'sonarjs/disabled-auto-escaping',
  'sonarjs/unverified-certificate',
  'sonarjs/no-unsafe-unzip',
  'sonarjs/sql-queries',
  'sonarjs/no-intrusive-permissions',
  'sonarjs/file-permissions',
  'sonarjs/no-empty-after-reduce',
  'sonarjs/content-length',
  'sonarjs/no-vue-bypass-sanitization',
  'sonarjs/dns-prefetching',
  'sonarjs/no-mixed-content',
  'sonarjs/no-redirect',
  'sonarjs/session-regeneration',
  'sonarjs/standard-input',
  'sonarjs/unverified-hostname',
  'sonarjs/test-check-exception',
  'sonarjs/weak-ssl',
  'sonarjs/xml-parser-xxe',
]);

// Tier classification: Tier 3 = legacy/excluded test trees & dirs excluded
// from CI; everything else is in-scope (T1 prod + T2 active tests).
const TIER3_PATTERNS = [
  /\/legacy_tests\//,
  /\/__tests_legacy__\//,
  /\/__mocks__\//,
];

const repoRoot = '/Users/aminemohamed/Desktop/APP/P.R.I.S.M-1/';
function tierOf(fp) {
  const rel = fp.startsWith(repoRoot) ? fp.slice(repoRoot.length) : fp;
  if (TIER3_PATTERNS.some((re) => re.test(`/${rel}`))) return 'tier3';
  return 'inscope';
}

// PHASE 1 convention filter: the OSS `sonarjs/no-unused-vars` rule cannot be
// parametrized with an ignore pattern (empty schema), so the project's explicit
// "intentionally unused" convention (leading underscore `^_`) is applied here,
// transparently. We ONLY suppress unused-var findings whose reported identifier
// matches `^_`; genuinely-unused, non-prefixed bindings stay counted. This is
// the aggregation-layer equivalent of SonarQube's `sonar.issue.ignore` for the
// `_` convention. Set MEASURE_RAW=1 to disable the filter and see raw counts.
const APPLY_CONVENTION = process.env.MEASURE_RAW !== '1';
function isUnderscoreConventionUnused(m) {
  if (m.ruleId !== 'sonarjs/no-unused-vars') return false;
  const nameMatch = (m.message || '').match(/'([^']+)'/);
  return !!nameMatch && nameMatch[1].startsWith('_');
}

const byRule = {};
const byRuleHotspot = {};
const byRuleCodeQuality = {};
const byCategory = { codeQuality: 0, hotspot: 0 };
const byTier = { inscope: 0, tier3: 0 };
const byFileRule = {}; // `${rule}` -> [{file,line}]
let total = 0;
let fatal = 0;
let conventionSuppressed = 0;

for (const f of report) {
  for (const m of f.messages) {
    if (m.fatal) {
      fatal++;
      continue;
    }
    if (APPLY_CONVENTION && isUnderscoreConventionUnused(m)) {
      conventionSuppressed++;
      continue;
    }
    const rule = m.ruleId || '(no-rule)';
    total++;
    byRule[rule] = (byRule[rule] || 0) + 1;
    const isHotspot = HOTSPOT_RULES.has(rule);
    if (isHotspot) {
      byCategory.hotspot++;
      byRuleHotspot[rule] = (byRuleHotspot[rule] || 0) + 1;
    } else {
      byCategory.codeQuality++;
      byRuleCodeQuality[rule] = (byRuleCodeQuality[rule] || 0) + 1;
    }
    const tier = tierOf(f.filePath);
    byTier[tier]++;
    if (!byFileRule[rule]) byFileRule[rule] = [];
    byFileRule[rule].push({ file: f.filePath.slice(repoRoot.length), line: m.line });
  }
}

const sortDesc = (obj) =>
  Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]));

const out = {
  total,
  fatal,
  conventionSuppressed,
  conventionFilterApplied: APPLY_CONVENTION,
  byCategory,
  byTier,
  byRuleAll: sortDesc(byRule),
  byRuleCodeQuality: sortDesc(byRuleCodeQuality),
  byRuleHotspot: sortDesc(byRuleHotspot),
};

// Optional: dump sites for a specific rule with argv[3]
if (process.argv[3]) {
  out.sites = byFileRule[process.argv[3]] || [];
}

console.log(JSON.stringify(out, null, 2));
