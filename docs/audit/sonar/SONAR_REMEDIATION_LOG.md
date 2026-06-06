# PRISM — Journal des corrections SonarQube

Traçabilité par lot. Gate: `npm test` doit rester 76/76 après chaque lot (le
hook husky pre-commit le vérifie). Outils: parseur `parse_sonar.py`, triage
`triage.py`, codemods `docs/audit/sonar/codemods/*`.

Périmètre fixé (cf. PLAN §3-4): TIER 1 corrigé (mécanique + manuel ciblé), TIER 2
mécanique sûr hors fichiers des 76 tests core, TIER 3 exclu via
`sonar-project.properties`.

---

## Baseline

- `npm test`: **76/76 PASS** (~65 s), mesuré avant toute correction.
- Issues détaillées: 2930 (0 UNKNOWN severity/file/category).
- Tier 1 = 473, Tier 2 = 608, Tier 3 = 1849.

---

## Lot 0 — Infrastructure et documentation

- Réécriture du parseur (`parse_sonar.py`): séparation section détaillée /
  annexe, 0 UNKNOWN. Triage par fermeture d'imports (`triage.py`).
- Documents: `SONAR_REMEDIATION_PLAN.md`, `SONAR_HOSTILE_AUDIT.md`, ce journal.
- `sonar-project.properties`: exclusions Tier 3 (1236 issues formellement hors
  périmètre), vérifiées sans capturer aucun fichier Tier 1/Tier 2. Suppression
  `S3516` sur l'arbre de test (faux positif mocks/générateurs).
- Aucun code applicatif modifié. Tests inchangés.

## Lot 1 — Réconciliation des éditions en cours

Fichiers: `src/core/KeyRegistry.js`, `src/core/providers/AdapterGuard.js`.

- `KeyRegistry.js`: suppression de l'`export { KeyRegistry }` dupliqué (la classe
  est déjà `export class`). Édition héritée, conservée.
- `AdapterGuard.js`: ajout de `export { createProviderResultOK,
createProviderResultError }` (corrige un import manquant côté
  `ProviderAdapter.js`). Édition héritée, conservée.
- `AdapterGuard.js` S1128: suppression des imports `validateProviderResult` et
  `ProviderStatusSchema`, confirmés non utilisés (grep dans le fichier: présents
  uniquement aux lignes d'import). 2 issues MINOR résolues.

## Lot 2 — Codemod S7772 (protocole `node:`)

(à compléter après exécution)

## Lot 3 — Codemod S7773 (`Number.parseFloat` / `Number.parseInt`)

(à compléter)

## Lot 4 — Codemod S7748 (zéros décimaux)

(à compléter)

## Lot 5 — Corrections ponctuelles mécaniques

(à compléter)

## Lot 6 — Manuel Tier 1 (CRITICAL couverts par tests)

(à compléter)

---

## Résumé chiffré (mis à jour en fin de mission)

| Métrique                          | Valeur                              |
| --------------------------------- | ----------------------------------- |
| Issues détaillées totales         | 2930                                |
| Corrigées (code)                  | (à compléter)                       |
| Exclues-justifiées (Tier 3)       | 1236 (via sonar-project.properties) |
| Restantes (différées/documentées) | (à compléter)                       |
| `npm test` final                  | (à compléter)                       |
| Delta lint base ESLint            | (à compléter)                       |
