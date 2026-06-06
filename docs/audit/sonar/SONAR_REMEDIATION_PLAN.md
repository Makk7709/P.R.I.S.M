# PRISM — SonarQube Remediation Plan

Statut: plan d'exécution. Source: rapport SonarQube (~392 pages) extrait en
`docs/audit/sonar/sonar_raw.txt`, reparsé par `parse_sonar.py`, trié par
`triage.py`. Données dans `sonar_issues.csv`, `sonar_summary.json`,
`sonar_triage.json`.

Principe directeur: la non-régression prime sur le score Sonar. Les 76 tests
core (`npm test`) doivent rester 76/76 à chaque lot. Aucune suppression de code
fonctionnel pour faire taire une règle.

---

## 1. Méthodologie d'extraction et de comptage

Le PDF contient **deux vues du même backlog**, dans le même ordre:

1. **Section détaillée** (lignes 1–36159 du brut): un bloc par issue, taxonomie
   héritée (BLOCKER/CRITICAL/MAJOR/MINOR/INFO + MAINTAINABILITY/RELIABILITY/
   SECURITY), avec règle, fichier, ligne, message, effort.
2. **Annexe** (lignes 36161–fin): les mêmes issues re-listées en taxonomie Clean
   Code (CODE_SMELL/BUG + LOW/MEDIUM/HIGH), paginées, sans fichier ni ligne.

Le parseur initial confondait les deux sections: il comptait chaque `rule_id`
nu de l'annexe comme une issue, d'où **3112 champs UNKNOWN** et un total gonflé à 6054. Le parseur réécrit traite les deux sections séparément. La frontière est
la première ligne `^\d*(CODE_SMELL|BUG|...) (LOW|MEDIUM|HIGH|...)`.

Résultat parseur (fiable, vérifiable):

| Métrique                           | Valeur        |
| ---------------------------------- | ------------- |
| Issues détaillées (exploitables)   | **2930**      |
| UNKNOWN severity / file / category | **0 / 0 / 0** |
| Lignes annexe (type+impact)        | 2909          |
| Lignes annexe (rule_id)            | 3124          |
| Effort total estimé (Sonar)        | 266,5 h       |

**Avertissement de corrélation.** L'annexe est interne­ment incohérente en
nombre de lignes (2909 impacts vs 3124 règles vs 2930 issues détaillées): la
pagination du PDF a tronqué/dédoublé des colonnes. Une corrélation positionnelle
1:1 entre impact Clean Code et issue détaillée n'est donc **pas** fiable et n'est
pas utilisée. La priorisation repose sur la sévérité héritée (propre, 0 UNKNOWN).
L'écart 3124 vs 2930 indique que l'annexe est un sur-ensemble: ~194 occurrences
de règles n'ont pas de détail localisable dans le PDF. On retient **2930 issues
localisées** comme périmètre actionnable.

---

## 2. Distribution fiable

### Par sévérité (héritée)

| Sévérité  | Nb       |
| --------- | -------- |
| BLOCKER   | 10       |
| CRITICAL  | 192      |
| MAJOR     | 629      |
| MINOR     | 2088     |
| INFO      | 11       |
| **Total** | **2930** |

### Par langage

JavaScript 2324 · TypeScript 482 · CSS 66 · Python 58.

### Par catégorie

MAINTAINABILITY 2918 · RELIABILITY 2 · (SECURITY 0). Le rapport est quasi
exclusivement de la dette de maintenabilité, pas des bugs ni des vulnérabilités.

### Top familles de règles (toutes tiers)

| Règle                                       | Nb                | Nature                 | Auto-fixable       |
| ------------------------------------------- | ----------------- | ---------------------- | ------------------ |
| S7772 (`node:` protocol)                    | 398               | mécanique              | oui (codemod)      |
| S7764 (`globalThis` vs window)              | ~280              | mécanique              | oui (codemod)      |
| S7781 (`replaceAll`)                        | ~230              | mécanique conditionnel | partiel            |
| S7748 (zéros décimaux)                      | ~330              | mécanique              | oui (codemod)      |
| S1128 (imports inutilisés)                  | ~230              | semi-auto              | oui (vérif. usage) |
| S1481/S1854 (variables/affectations mortes) | ~280              | semi-auto              | manuel/AST         |
| S7773 (`Number.parseX`)                     | ~130              | mécanique              | oui (codemod)      |
| S6582 (optional chaining)                   | ~130              | comportemental         | manuel/AST         |
| S125 (code commenté)                        | ~130              | mécanique              | oui                |
| S3776 (complexité cognitive)                | ~95               | structurel             | manuel             |
| S2486 (exceptions non gérées)               | ~100              | comportemental         | manuel             |
| S3516 (retour constant)                     | 10 (tous BLOCKER) | faux positif probable  | non                |

---

## 3. Triage par tier (périmètre)

Tier calculé par **fermeture transitive des imports depuis `server.js`**
(`triage.py`), pas par heuristique de chemin. Fermeture production = 58 fichiers.

| Tier       | Définition                                     | Issues  | BLOCKER | CRITICAL | MAJOR | MINOR           | Effort  |
| ---------- | ---------------------------------------------- | ------- | ------- | -------- | ----- | --------------- | ------- |
| **TIER 1** | Code production atteignable depuis `server.js` | **473** | 0       | 36       | 117   | 320             | 41,4 h  |
| **TIER 2** | Tests/spec/simulation actifs hors fermeture    | 608     | 8       | 43       | 129   | 428             | 66,6 h  |
| **TIER 3** | Legacy / exclu CI / démos / orphelins          | 1849    | 2       | 113      | 383   | 1340 (+11 INFO) | 158,5 h |

Faits marquants:

- **Aucun BLOCKER en production.** Les 10 BLOCKER sont tous `S3516` (« fonction
  retourne toujours la même valeur ») : 7 dans des fichiers de **test core**
  (mocks/générateurs de `__tests__/properties`, `__tests__/fuzz`), 2 en Tier 3,
  1 dans `src/voice/AudioMutex.js` (Tier 3, non importé par `server.js`).
- **Aucune vulnérabilité de sécurité, aucun bug fonctionnel** dans le rapport.
- Tier 1 CRITICAL (36) = S3776 complexité cognitive (29), S7059 async en
  constructeur (4), S1186 méthode vide (2), S4123 await sur non-promesse (1).
- 63 % des issues (1849) sont en Tier 3 (code mort/legacy/démos).

### Top fichiers Tier 1 (production)

`backend/services/enterpriseSanitizer.js` (51), `src/excel/DataTypeDetector.js`
(39), `src/excel/ExcelAnalyzer.js` (38), `src/core/ServerMemoryStore.js` (27),
`src/excel/StatisticalEngine.js` (24), `server.js` (22),
`src/core/ConsensusManager.js` (17), `src/voice/ResponseModeManager.js` (16),
`src/export/PdfExportService.js` (15), `src/core/ConsciousnessLayer.js` (13).

---

## 4. Décision de scope

1. **TIER 1 — corriger.** Mécanique d'abord (codemods sûrs validés par tests),
   puis manuel par priorité CRITICAL > MAJOR > MINOR. Objectif: 0 issue
   mécanique résiduelle, réduction substantielle des CRITICAL structurels.
2. **TIER 2 — corriger le mécanique sûr** qui ne touche pas les fichiers des 76
   tests core. Les BLOCKER `S3516` sur mocks de test sont des **faux positifs**
   (voir audit hostile) et ne sont pas « corrigés »: les modifier romprait des
   tests verts pour satisfaire une règle inadaptée au contexte de test.
3. **TIER 3 — exclure, ne pas investir.** Corriger du code mort/orphelin/legacy
   est du gaspillage et ajoute du bruit de diff sur du code non exécuté. On
   formalise l'exclusion via `sonar-project.properties` (`sonar.exclusions`) +
   justification, plutôt que des codemods risqués sur du code non testé.
   `vitest.config.js` et `eslint.config.js` excluent déjà `legacy_tests/**` et
   `__tests_legacy__/**`; l'exclusion Sonar aligne le périmètre d'analyse sur le
   périmètre réellement maintenu.

---

## 5. Stratégie par famille de règles

Aucun `eslint-plugin-sonarjs` n'est installé; `npm run lint:fix` ne couvre donc
pas les règles S-xxxx. Stratégie: **codemods Node ciblés par règle**, appliqués
uniquement aux fichiers signalés par Sonar (liste dérivée du CSV), validés par
`npm test` après chaque lot.

| Famille                              | Méthode                                            | Sûreté                  |
| ------------------------------------ | -------------------------------------------------- | ----------------------- |
| S7772 `node:` protocol               | codemod regex sur specifiers de builtins connus    | iso-comportement        |
| S7773 `Number.parseFloat`/`parseInt` | codemod regex (identité fonctionnelle)             | iso-comportement        |
| S7748 zéros décimaux (`1.0`→`1`)     | codemod regex sur littéraux numériques             | iso-valeur              |
| S7770 arrow `=> String(x)`           | codemod ciblé                                      | iso-comportement        |
| S7786 `new Error` pour TypeError     | codemod ciblé                                      | iso-comportement        |
| S1128 imports inutilisés             | suppression après vérification d'usage par fichier | iso-comportement        |
| S3776 complexité cognitive           | refactor manuel (extraction de sous-fonctions)     | iso-comportement, tests |
| S1186 méthode vide                   | corps explicite/commentaire d'intention            | iso-comportement        |
| S7059 async en constructeur          | extraction d'un `init()` async                     | manuel, prudence        |
| S6582 optional chaining              | manuel (différence falsy vs nullish)               | revue cas par cas       |
| S3516 retour constant (BLOCKER)      | non corrigé sur tests (faux positif)               | exclusion/justif.       |

Règles **non** mécanisées en aveugle: S7781 (`replace`→`replaceAll`) n'est sûr
que sur la forme `/regex/g`; S1854/S1481 (variables mortes) peuvent masquer des
effets de bord dans l'initialiseur; S6582 change la sémantique falsy→nullish.
Ces familles sont traitées manuellement, par fichier, sur Tier 1 uniquement.

---

## 6. Ordre d'exécution (lots atomiques)

Chaque lot: appliquer → `npm test` (76/76) → `git commit` si vert → consigner
dans `SONAR_REMEDIATION_LOG.md`. Rollback du lot si régression.

1. **Lot 0 — infra**: `sonar-project.properties` (exclusions Tier 3), parseur +
   triage versionnés, documents.
2. **Lot 1 — réconciliation parent**: `KeyRegistry.js`, `AdapterGuard.js`
   (export manquant + imports S1128 réellement inutilisés vérifiés par grep).
3. **Lot 2 — codemod S7772** (`node:`) Tier 1+2.
4. **Lot 3 — codemod S7773** (`Number.parseX`) Tier 1+2.
5. **Lot 4 — codemod S7748** (zéros décimaux) Tier 1+2.
6. **Lot 5 — codemods ponctuels** S7770, S7786, S7780.
7. **Lot 6 — manuel Tier 1 CRITICAL** sur fichiers couverts par tests
   (`ConsensusManager` S3776, S1186, S7059) — un fichier par commit.
8. **Lot 7 — finalisation**: lint delta, recomptage, mise à jour du résumé.

---

## 7. Critères de done

- `npm test` = 76/76 à chaque commit (gate husky pre-commit le vérifie).
- Aucun fichier protégé modifié (`docs/valuation/PRISM_0*`, `PRE_VALUATION_*`).
- Aucun `.env`/secret/`node_modules`/artefact régénérable commité.
- Chaque lot tracé dans le journal (règle, occurrences, fichiers, méthode,
  résultat tests, avant/après).
- Push `origin main` normal uniquement, en toute fin, si tout est vert.

## 8. Gestion du risque

| Risque                                     | Mitigation                                                     |
| ------------------------------------------ | -------------------------------------------------------------- |
| Codemod casse un test                      | lot atomique + `npm test` après chaque lot + rollback          |
| Suppression d'un import réellement utilisé | grep d'usage par fichier avant suppression                     |
| Refactor complexité change le comportement | uniquement sur fichiers couverts par les 76 tests              |
| Exclusion Sonar masque de la vraie dette   | exclusion limitée au code hors fermeture production, justifiée |
| Trailer bot injecté au commit              | vérifier `git log -1 --format=%B`, plumbing si besoin          |
| Test flaky `trustContext.properties`       | nettoyer `test-trustcontext-temp*/` puis recommettre           |
