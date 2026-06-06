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

## Lot 2 — Codemod S7772 (protocole `node:`), JS

- Codemod `node-protocol.mjs` sur les fichiers JS signalés S7772 (Tier 1+2).
- 61 issues S7772 résolues (KeyRegistry incluse dans le Lot 1).
- Corrections d'accompagnement requises par le gate lint-staged:
  - `server.js`: `// eslint-disable-next-line no-control-regex` justifié sur le
    nettoyeur de caractères de contrôle C0/C1 (intentionnel).
  - `src/chat/ChatFileProcessor.js`: suppression d'un escape inutile `\/` dans
    une classe de caractères (S6535).
- Tests: 76/76.

Contrainte découverte (importante): le flat config ESLint **n'a aucun parseur
TypeScript**. Tout fichier `.ts` produit `Parsing error: Unexpected token :`
sous `lint-staged`, ce qui empêche de committer un `.ts` touché. Les codemods
sont donc restreints à `.js/.mjs/.cjs`. Le lint TS du dépôt est de facto cassé
(gap d'infra signalé dans l'audit hostile). De plus, `lint-staged` applique
`prettier --write` à chaque fichier committé: les fichiers n'étant pas
formatés, chaque correction entraîne un reformatage intégral du fichier (gros
diff imposé par le gate du dépôt, pas un choix arbitraire).

## Lot 3 — Codemod S7773 (`Number.parseFloat`/`parseInt`) + S6535, JS

- Codemod `number-parse.mjs`: `parseFloat`/`parseInt` → `Number.parseFloat`/
  `Number.parseInt` (objets de fonction identiques, iso-comportement).
  29 issues S7773 résolues. `isNaN`/`isFinite` volontairement non touchés
  (sémantique différente).
- S6535: suppression d'escapes inutiles dans les regex de `src/excel`
  (`[\/\-]`→`[/-]`, `[^\(]`→`[^(]`). 14 issues S6535 résolues.
- Hors lot (dette pré-existante non liée): `backend/middleware/validation.js`
  (sanitizers control-regex) et `tests/voice/setup.js` (globals navigateur)
  laissés inchangés. Tests: 76/76.

## Lot 4 — Manuel Tier 1 CRITICAL: S1186 (méthodes vides)

- `asi/asiMemorySystem.js`: `updateMemoryStatistics` et `updateAccessPatterns`
  étaient des corps vides (S1186, CRITICAL). Corps no-op documenté + params
  préfixés `_`. 2 issues CRITICAL résolues. Iso-comportement. Tests: 76/76.

## Lots différés (documentés, non exécutés)

Non traités dans ce poste, par décision de risque (cf. audit hostile §4):

- **S3776** (complexité cognitive, ~29 Tier 1): refactor manuel à iso-
  comportement, à ne faire que sur fichiers couverts par tests dédiés. Le pire
  fichier (`backend/services/enterpriseSanitizer.js`, 51 issues) n'est pas
  couvert par les 76 tests core → refactor à l'aveugle écarté.
- **S6582** (optional chaining), **S1854/S1481** (variables/affectations
  mortes), **S7781** (`replaceAll`): risque comportemental, nécessitent AST/
  revue cas par cas, non mécanisables en aveugle.
- **S7748** (zéros décimaux): codemod regex jugé trop risqué (faux positifs
  dans chaînes/versions) sans AST; cosmétique pur.
- Issues sur `.ts`: bloquées par l'absence de parseur TS dans ESLint.

---

## Résumé chiffré

| Métrique                                              | Valeur | % du total |
| ----------------------------------------------------- | ------ | ---------- |
| Issues détaillées totales                             | 2930   | 100 %      |
| Corrigées (code, testées 76/76)                       | 108    | 3,7 %      |
| Exclues-justifiées (Tier 3, sonar-project.properties) | 1236   | 42,2 %     |
| Traitées (corrigées + exclues)                        | 1344   | 45,9 %     |
| Restantes (différées/documentées)                     | 1586   | 54,1 %     |

Détail des corrections (108): S7772 = 61, S7773 = 29, S6535 = 14, S1128 = 2,
S1186 = 2. Par tier: Tier 1 = 81, Tier 2 = 27. Par sévérité: 2 CRITICAL,
14 MAJOR, 92 MINOR.

Restantes par tier: Tier 1 = 392, Tier 2 = 581, Tier 3 (analysé, non exclu) =
613 (fichiers `src/`/`backend/` conservés dans le périmètre par prudence).

| Gate                       | État                                    |
| -------------------------- | --------------------------------------- |
| `npm test` (76 core)       | 76/76 PASS après chaque lot et en final |
| Fichiers protégés modifiés | aucun                                   |
| `.env`/secrets committés   | aucun                                   |
| Trailer bot sur commits    | retiré via plumbing (`git commit-tree`) |

Delta lint: non mesurable proprement à l'échelle du dépôt car ESLint ne parse
pas le TypeScript (chaque `.ts` = parse error, dominant le total). Mesure
concrète: les 39 fichiers JS touchés passent désormais `eslint` avec **0 erreur**
(hors warnings préexistants), et le correctif de config globals supprime les
`no-undef` sur les globals standard (timers, AbortController, fetch, globals de
test) dans tout le dépôt. Un delta Sonar exact nécessite un re-scan côté
serveur SonarQube (hors périmètre de ce poste).
