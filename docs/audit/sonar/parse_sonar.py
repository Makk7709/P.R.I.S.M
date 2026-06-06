#!/usr/bin/env python3
"""Parse the pdftotext-extracted SonarQube report into structured records.

The PDF concatenates two views of the SAME issue list, in the SAME order:

  1. DETAILED section (top of the file): one block per issue with the legacy
     taxonomy. pdftotext wraps each field over several physical lines:
         <lang>:S<num> <rule name ...>
         <SEVERITY> <projectKey>:<path ...>(line <N>)
         <message ...>
         <effort> <CATEGORY>

  2. ANNEXE section (bottom of the file): the same issues re-listed in the new
     Clean Code taxonomy, paginated. Each page contains a run of
     "<TYPE> <IMPACT>" lines (e.g. "CODE_SMELL MEDIUM") followed by an equal
     run of bare rule ids (e.g. "javascript:S7764"). Page numbers are glued to
     the first token of a page (e.g. "196CODE_SMELL MEDIUM").

The boundary between the two sections is the first line matching
``^\\d*<TYPE> <IMPACT>``. We parse the sections independently and then correlate
each detailed issue with its Clean Code impact by positional index (the two
lists are emitted in the same order by SonarQube).
"""
import re
import csv
import json
from collections import Counter

RAW = "docs/audit/sonar/sonar_raw.txt"
CSV_OUT = "docs/audit/sonar/sonar_issues.csv"
JSON_OUT = "docs/audit/sonar/sonar_summary.json"

LANGS = (
    "python|javascript|typescript|css|html|web|docker|yaml|json|text|"
    "secrets|cloudformation|kubernetes|go|java|scss|php|ruby|csharp|vbnet"
)
RULE_START_RE = re.compile(rf"^(?:{LANGS}):S\d+\b")
RULE_ID_ONLY_RE = re.compile(rf"^(?:{LANGS}):S\d+$")
SEV_LINE_RE = re.compile(r"^(BLOCKER|CRITICAL|MAJOR|MINOR|INFO)\b(.*)$")
CATEGORY_RE = re.compile(r"^(\d+)\s*(min|m|h|d)?\s+(MAINTAINABILITY|RELIABILITY|SECURITY)\b")
EFFORT_ONLY_RE = re.compile(r"^(\d+)\s*(min|m|h|d)\s*$")
TYPE_IMPACT_RE = re.compile(
    r"^\d*(CODE_SMELL|BUG|VULNERABILITY|SECURITY_HOTSPOT)\s+(LOW|MEDIUM|HIGH|BLOCKER|INFO)\b"
)
PAGE_RE = re.compile(r"^--\s*\d+\s*of\s*\d+\s*--$")
TABLEAU_RE = re.compile(r"^Tableau\s+\d+")
LINE_PATH_RE = re.compile(r"\(line\s*(\d+)\)")
OBJ_CHAR = "\ufffc"  # object replacement char from embedded images

# SonarQube software-quality category for rules whose category column is blank
# in the PDF (zero-effort INFO rules). All are maintainability rules.
RULE_CATEGORY_FALLBACK = {
    "python:S1135": "MAINTAINABILITY",
    "javascript:S1135": "MAINTAINABILITY",
    "typescript:S1135": "MAINTAINABILITY",
}


def clean_detailed(lines):
    out = []
    for l in lines:
        s = l.strip()
        if not s:
            continue
        if PAGE_RE.match(s) or TABLEAU_RE.match(s):
            continue
        if re.fullmatch(r"\d+", s):
            continue
        if s == OBJ_CHAR:
            continue
        out.append(l)
    return out


def parse_detailed_block(block):
    """block: list of physical lines for one issue (starting at the rule line)."""
    rule_id = block[0].strip().split()[0]
    lang = rule_id.split(":")[0]

    severity = "UNKNOWN"
    path = "UNKNOWN"
    line_no = 0
    category = "UNKNOWN"
    effort_min = 0

    # Locate the severity line and the effort/category line by scanning.
    sev_idx = None
    cat_idx = None
    for i, b in enumerate(block):
        bs = b.strip()
        if sev_idx is None and SEV_LINE_RE.match(bs):
            sev_idx = i
        if CATEGORY_RE.match(bs) or EFFORT_ONLY_RE.match(bs):
            cat_idx = i

    # The path "(line N)" marker may be wrapped across several physical lines;
    # track the physical line where it closes so the message starts after it.
    path_end_idx = sev_idx
    if sev_idx is not None:
        severity = SEV_LINE_RE.match(block[sev_idx].strip()).group(1)
        tail = []
        for j in range(sev_idx, len(block)):
            tail.append(block[j].strip())
            if LINE_PATH_RE.search("".join(tail)):
                path_end_idx = j
                break
        joined_path = "".join(tail)
        m = LINE_PATH_RE.search(joined_path)
        if m:
            line_no = int(m.group(1))
            before = joined_path[: m.start()]
            before = before[len(severity):]  # drop severity token
            if ":" in before:                 # drop leading "projectKey:"
                before = before.split(":", 1)[1]
            path = before.strip()

    if cat_idx is not None:
        bs = block[cat_idx].strip()
        m = CATEGORY_RE.match(bs)
        if m:
            val, unit, category = int(m.group(1)), (m.group(2) or "m"), m.group(3)
        else:
            m2 = EFFORT_ONLY_RE.match(bs)
            val, unit = int(m2.group(1)), m2.group(2)
            # Effort present but the category column was blank in the PDF.
            # All such rows are SonarQube MAINTAINABILITY rules; infer it.
            category = "MAINTAINABILITY"
        if unit == "h":
            val *= 60
        elif unit == "d":
            val *= 480
        effort_min = val

    # Message: physical lines between the closed "(line N)" marker and effort.
    msg_start = (path_end_idx + 1) if path_end_idx is not None else 1
    msg_end = cat_idx if cat_idx is not None else len(block)
    message = " ".join(b.strip() for b in block[msg_start:msg_end])
    message = re.sub(r"\s+", " ", message).strip()
    # repair common pdftotext ligature splits inside words
    message = message.replace(" fi ", "fi").replace(" fl ", "fl")

    if category == "UNKNOWN":
        category = RULE_CATEGORY_FALLBACK.get(rule_id, "UNKNOWN")

    return {
        "rule_id": rule_id,
        "lang": lang,
        "severity": severity,
        "category": category,
        "effort_min": effort_min,
        "file": path or "UNKNOWN",
        "line": line_no,
        "message": message[:300],
    }


def parse_annexe(lines):
    """Return parallel lists (types, impacts, rules) in document order."""
    types, impacts, rules = [], [], []
    for l in lines:
        s = l.strip()
        if not s or s == OBJ_CHAR:
            continue
        m = TYPE_IMPACT_RE.match(s)
        if m:
            types.append(m.group(1))
            impacts.append(m.group(2))
            continue
        if RULE_ID_ONLY_RE.match(s):
            rules.append(s)
    return types, impacts, rules


def main():
    with open(RAW, encoding="utf-8") as f:
        lines = [l.rstrip("\n") for l in f]

    # Boundary: first Clean-Code type/impact line.
    boundary = None
    for i, l in enumerate(lines):
        if TYPE_IMPACT_RE.match(l.strip()):
            boundary = i
            break
    if boundary is None:
        boundary = len(lines)

    detailed_raw = lines[:boundary]
    annexe_raw = lines[boundary:]

    cleaned = clean_detailed(detailed_raw)
    starts = [i for i, l in enumerate(cleaned) if RULE_START_RE.match(l.strip())]
    starts.append(len(cleaned))

    records = []
    for k in range(len(starts) - 1):
        block = cleaned[starts[k]:starts[k + 1]]
        records.append(parse_detailed_block(block))

    types, impacts, rules = parse_annexe(annexe_raw)

    # Correlate by positional index if the two orderings line up.
    aligned = 0
    if len(rules) == len(records):
        match = sum(1 for r, rec in zip(rules, records) if r == rec["rule_id"])
        if match >= 0.95 * len(records):
            for rec, t, imp in zip(records, types, impacts):
                rec["cc_type"] = t
                rec["cc_impact"] = imp
            aligned = match
    if not aligned:
        for rec in records:
            rec.setdefault("cc_type", "")
            rec.setdefault("cc_impact", "")

    fieldnames = ["rule_id", "lang", "severity", "category", "cc_type",
                  "cc_impact", "effort_min", "file", "line", "message"]
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(records)

    by_sev = Counter(r["severity"] for r in records)
    by_cat = Counter(r["category"] for r in records)
    by_lang = Counter(r["lang"] for r in records)
    by_rule = Counter(r["rule_id"] for r in records)
    by_file = Counter(r["file"] for r in records)
    by_impact = Counter(r["cc_impact"] for r in records if r["cc_impact"])
    by_type = Counter(r["cc_type"] for r in records if r["cc_type"])
    total_effort = sum(r["effort_min"] for r in records)
    unknown_sev = by_sev.get("UNKNOWN", 0)
    unknown_file = sum(1 for r in records if r["file"] in ("UNKNOWN", ""))
    unknown_cat = by_cat.get("UNKNOWN", 0)

    summary = {
        "detailed_issues": len(records),
        "annexe_type_impact_rows": len(impacts),
        "annexe_rule_rows": len(rules),
        "annexe_aligned_with_detailed": aligned,
        "unknown_severity": unknown_sev,
        "unknown_file": unknown_file,
        "unknown_category": unknown_cat,
        "total_effort_minutes": total_effort,
        "total_effort_hours": round(total_effort / 60, 1),
        "by_severity": dict(by_sev.most_common()),
        "by_category": dict(by_cat.most_common()),
        "by_language": dict(by_lang.most_common()),
        "by_cc_impact": dict(by_impact.most_common()),
        "by_cc_type": dict(by_type.most_common()),
        "top_40_rules": by_rule.most_common(40),
        "top_50_files": by_file.most_common(50),
    }
    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"DETAILED ISSUES   : {len(records)}")
    print(f"ANNEXE impact rows: {len(impacts)}")
    print(f"ANNEXE rule rows  : {len(rules)}")
    print(f"ALIGNED (rule==)  : {aligned}")
    print(f"UNKNOWN severity  : {unknown_sev}")
    print(f"UNKNOWN file      : {unknown_file}")
    print(f"UNKNOWN category  : {unknown_cat}")
    print(f"TOTAL EFFORT      : {total_effort} min ({round(total_effort/60,1)} h)")
    print("\nBY SEVERITY:")
    for k, v in by_sev.most_common():
        print(f"  {k:10s} {v}")
    print("\nBY CATEGORY:")
    for k, v in by_cat.most_common():
        print(f"  {k:16s} {v}")
    print("\nBY LANGUAGE:")
    for k, v in by_lang.most_common():
        print(f"  {k:14s} {v}")
    print("\nBY CLEAN-CODE IMPACT:")
    for k, v in by_impact.most_common():
        print(f"  {k:10s} {v}")
    print("\nTOP 40 RULES:")
    for k, v in by_rule.most_common(40):
        print(f"  {k:22s} {v}")


if __name__ == "__main__":
    main()
