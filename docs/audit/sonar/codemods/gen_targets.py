#!/usr/bin/env python3
"""Emit per-rule target file lists (by tier) for the codemods to consume.

Output: docs/audit/sonar/codemods/targets.json
  { "<rule_id>": { "TIER1": [...files], "TIER2": [...], "TIER3": [...] }, ... }
"""
import csv
import json
from collections import defaultdict

rows = list(csv.DictReader(open("docs/audit/sonar/sonar_issues.csv")))
out = defaultdict(lambda: defaultdict(set))
for r in rows:
    out[r["rule_id"]][r["tier"]].add(r["file"])

serial = {rule: {t: sorted(fs) for t, fs in tiers.items()} for rule, tiers in out.items()}
with open("docs/audit/sonar/codemods/targets.json", "w", encoding="utf-8") as f:
    json.dump(serial, f, indent=0, ensure_ascii=False)
print("wrote targets.json for", len(serial), "rules")
