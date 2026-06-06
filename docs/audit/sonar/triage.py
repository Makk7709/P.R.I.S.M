#!/usr/bin/env python3
"""Classify SonarQube issues into remediation tiers.

Tier 1 = production code reachable from server.js (transitive import closure).
Tier 2 = active test/spec/simulation code not in the closure.
Tier 3 = legacy / excluded-from-CI / demo / orphan code.

The production closure is computed by statically following static/dynamic
`import` and `require` specifiers starting at server.js.
"""
import csv
import json
import os
import re
from collections import Counter, defaultdict

ROOT = os.getcwd()
ENTRY = ["server.js"]
IMPORT_RE = re.compile(
    r"""(?:import\s[^'"]*?from\s*|import\s*|export\s[^'"]*?from\s*|require\s*\(\s*|import\s*\(\s*)['"](\.[^'"]+)['"]"""
)
EXTS = ["", ".js", ".mjs", ".ts", ".cjs", "/index.js", "/index.mjs", "/index.ts"]


def resolve(spec, from_file):
    base = os.path.normpath(os.path.join(os.path.dirname(from_file), spec))
    for e in EXTS:
        cand = base + e
        if os.path.isfile(os.path.join(ROOT, cand)):
            return os.path.normpath(cand)
    return None


def build_closure():
    seen, stack = set(), list(ENTRY)
    while stack:
        f = stack.pop()
        if f in seen or not os.path.isfile(os.path.join(ROOT, f)):
            continue
        seen.add(f)
        try:
            with open(os.path.join(ROOT, f), encoding="utf-8", errors="ignore") as fh:
                src = fh.read()
        except OSError:
            continue
        for m in IMPORT_RE.finditer(src):
            r = resolve(m.group(1), f)
            if r:
                stack.append(r)
    return seen


TEST_RE = re.compile(r"(^|/)(__tests__|tests|simulation|test|staging)/")
LEGACY_RE = re.compile(r"(^|/)(legacy_tests|__tests_legacy__)/")


def tier_of(path, closure):
    norm = path.lstrip("./")
    if norm in closure:
        return "TIER1"
    if LEGACY_RE.search("/" + norm):
        return "TIER3"
    # HTML demos / standalone pages
    if norm.endswith(".html"):
        return "TIER3"
    if TEST_RE.search("/" + norm) or re.search(r"\.(test|spec)\.[tj]s$", norm):
        return "TIER2"
    return "TIER3"


def main():
    closure = build_closure()
    rows = list(csv.DictReader(open("docs/audit/sonar/sonar_issues.csv")))
    for r in rows:
        r["tier"] = tier_of(r["file"], closure)

    with open("docs/audit/sonar/sonar_issues.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    by_tier = Counter(r["tier"] for r in rows)
    tier_sev = defaultdict(Counter)
    tier_rule = defaultdict(Counter)
    tier_file = defaultdict(Counter)
    for r in rows:
        tier_sev[r["tier"]][r["severity"]] += 1
        tier_rule[r["tier"]][r["rule_id"]] += 1
        tier_file[r["tier"]][r["file"]] += 1

    out = {
        "production_closure_size": len(closure),
        "by_tier": dict(by_tier.most_common()),
        "tier_severity": {t: dict(c.most_common()) for t, c in tier_sev.items()},
        "tier1_top_rules": tier_rule["TIER1"].most_common(40),
        "tier1_files": tier_file["TIER1"].most_common(60),
        "tier2_top_rules": tier_rule["TIER2"].most_common(20),
        "tier3_top_rules": tier_rule["TIER3"].most_common(20),
    }
    with open("docs/audit/sonar/sonar_triage.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    print("PRODUCTION CLOSURE SIZE:", len(closure))
    print("\nISSUES BY TIER:")
    for t, n in by_tier.most_common():
        print(f"  {t}: {n}")
    print("\nTIER1 SEVERITY:", dict(tier_sev["TIER1"].most_common()))
    print("TIER2 SEVERITY:", dict(tier_sev["TIER2"].most_common()))
    print("TIER3 SEVERITY:", dict(tier_sev["TIER3"].most_common()))
    print("\nTIER1 TOP RULES:")
    for k, v in tier_rule["TIER1"].most_common(25):
        print(f"  {k:22s} {v}")
    print("\nTIER1 FILES (top 30):")
    for k, v in tier_file["TIER1"].most_common(30):
        print(f"  {v:4d}  {k}")


if __name__ == "__main__":
    main()
