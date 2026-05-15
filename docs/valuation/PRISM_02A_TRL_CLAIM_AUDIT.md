# PRISM_02A — TRL Claim Audit

> Mission : auditer froidement la revendication "TRL 5 validé" de PRISM avant toute mission de nettoyage, valorisation ou transmission commissaire aux apports (CAA).
>
> Posture : auditeur TRL hostile + commissaire aux apports prudent + CTO deeptech + expert validation logiciel critique.
>
> Aucune correction de code, de tests, de README ou de `TRL5_PROOF_REPORT.md` n'a été effectuée. La seule mutation observée a été un effet de bord du script `npm run staging:report` (régénération du rapport TRL5 avec les seules dates modifiées) — restauré immédiatement via `git checkout` (voir §6 ci-dessous).

---

## 1. Verdict exécutif

| Élément                               | Valeur                                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Repo audité                           | `Makk7709/P.R.I.S.M` (canonique)                                                                                  |
| Remote                                | `https://github.com/Makk7709/P.R.I.S.M`                                                                           |
| Branche                               | `main`                                                                                                            |
| HEAD                                  | `618cd8bacb659e791af40e59932ac43bd5c0e5b4`                                                                        |
| Dernier commit                        | `618cd8b docs(readme): add TRL Status section for quick verification`                                             |
| Dirty state code source               | **Aucun** (seuls 2 `.pyc` de `.venv/` sont marqués M)                                                             |
| Claim audité (README §TRL Status)     | "Current TRL : 4 → 5 (staging validated)" + "Core Suite : 76/76 deterministic, reproducible property-based tests" |
| Claim audité (`TRL5_PROOF_REPORT.md`) | "TRL 5 Validé (6/6 E2E PASS)" + "Performance acceptable : Latence verifyApproval < 100ms (p95)"                   |

**Verdict TRL réel (auditeur hostile)** :

> **TRL 4 avancé avec démonstration partielle TRL 5 en environnement staging contrôlé, NON INDÉPENDANT et NON REPRODUCTIBLE en l'état.**

**Niveau de risque pour le CAA (en l'état)** :

- **Risque ÉLEVÉ** si l'on transmet la formulation actuelle "TRL 5 validé" sans précautions, parce que :
  1. Le rapport `TRL5_PROOF_REPORT.md` contient une **contradiction interne factuelle** : §2.1 et §2.2 disent explicitement « Aucune métrique disponible (tests non exécutés) », alors que §7.1 affirme « Latence verifyApproval < 100ms (p95) ». La conclusion contredit les sections de données.
  2. Le rapport est **généré par un script qui hardcode la conclusion** : `npm run staging:report` produit "✅ TRL 5 Validé (6/6 E2E PASS)" **même quand aucun fichier de métriques n'existe** ("No metrics files found, generating empty report" — observé empiriquement sous HEAD courant).
  3. Le test qui produit la preuve TRL 5 (`staging/e2e-workflow.test.js`) **ne peut pas être rejoué** sans `OPENAI_API_KEY` réelle (échec au chargement du module : `backend/orchestrator.js` instancie `new OpenAI({apiKey: process.env.OPENAI_API_KEY})` au top-level → exception). Reproductibilité de la preuve TRL 5 = nulle en l'état.
  4. Un document antérieur dans le **même repo et à la même date** (`docs/PRISM_TRL_ASSESSMENT.md`, 2025-12-14) conclut explicitement **« TRL Global : TRL 4 (Technologie validée en laboratoire) »** avec **61/61 tests**, sur la même base de code. Deux conclusions TRL contradictoires coexistent dans le repo canonique.
  5. Le rapport TRL5 mentionne `DIGEST_MISMATCH` au §5 alors que le code distingue désormais `DIGEST_MISMATCH` et `DECISION_ID_MISMATCH` (commit `888e574` — `fix(core): correct error code for DecisionId mismatch`). Doc-code drift résiduel.
  6. `npm ci` échoue (`ERESOLVE` peer dependency `zod@3 vs zod@4` via `openai@4.104.0` ↔ `@modelcontextprotocol/sdk@1.29.0`). L'environnement de build canonique n'est **pas reproductible** sans `--legacy-peer-deps`.
  7. `npm run typecheck` produit **511 erreurs TypeScript**. Le hook pre-commit les rend volontairement non-bloquantes (`|| echo "⚠️ Typecheck warnings"`), donc elles n'apparaissent jamais dans CI. Pour un système revendiquant TRL 5, c'est une dette de qualité matérielle.

- **Risque MAÎTRISABLE** si l'on reformule explicitement (voir §8) en « TRL 4 avancé / TRL 5 partiellement démontré en staging interne non indépendant », avec une liste de décotes maîtrisées (voir §10).

**Recommandation de formulation CAA** : **Option B — voir §8**.

---

## 2. Claims TRL recensés

Inventaire systématique des assertions TRL / staging / validation / 76/76 / Ed25519 / fail-closed / performance, avec niveau de preuve. Le grep complet a parcouru le repo en excluant `.git`, `node_modules`, `.venv`, `.next`, `dashboard/.next`, `coverage`.

### 2.1 Matrice principale

| #   | Claim                                                                          | Fichier                                  | Ligne             | Preuve associée                                                                                               | Niveau de preuve                                                                                                                                                                                                                                                                                                                                                        | Risque CAA                                                                                                                                            |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | "Current TRL : 4 → 5 (staging validated)"                                      | `README.md`                              | 17                | `docs/reports/TRL5_PROOF_REPORT.md`                                                                           | **CONTRADICTOIRE** (cf. `docs/PRISM_TRL_ASSESSMENT.md` même date : TRL 4)                                                                                                                                                                                                                                                                                               | Élevé                                                                                                                                                 |
| C2  | "Core Suite : 76/76 deterministic, reproducible property-based tests"          | `README.md`                              | 19                | `vitest.config.core-only.js` + `npm test`                                                                     | **PROUVÉ REJOUABLE** — `Tests 76 passed (76)` reproduit 2× sur 2 runs locaux (voir §3 et §4)                                                                                                                                                                                                                                                                            | Faible si on précise le scope                                                                                                                         |
| C3  | "Status: ✅ TRL 5 Validé (6/6 E2E PASS)"                                       | `docs/reports/TRL5_PROOF_REPORT.md`      | 150               | `staging/e2e-workflow.test.js` (S1–S6)                                                                        | **NON REJOUÉ** sous HEAD courant — test crash à l'import sans `OPENAI_API_KEY` (voir §5)                                                                                                                                                                                                                                                                                | Élevé                                                                                                                                                 |
| C4  | "Performance acceptable : Latence verifyApproval < 100ms (p95)"                | `docs/reports/TRL5_PROOF_REPORT.md`      | 109               | aucune métrique dans le rapport (§2.1 dit "Aucune métrique disponible")                                       | **CONTRADICTOIRE** — voir §6                                                                                                                                                                                                                                                                                                                                            | Élevé                                                                                                                                                 |
| C5  | "Aucune métrique disponible (tests non exécutés)"                              | `docs/reports/TRL5_PROOF_REPORT.md`      | 44, 47            | (négation du C4 dans le même document)                                                                        | **PROUVÉ DOCUMENTAIRE** que C4 et C5 sont mutuellement exclusifs                                                                                                                                                                                                                                                                                                        | Élevé                                                                                                                                                 |
| C6  | "Vérification cryptographique Ed25519 (signature base64/hex unifiée)"          | `docs/reports/TRL5_PROOF_REPORT.md`      | 20                | `src/core/TrustContext.js`, `src/core/KeyRegistry.js`, `__tests__/properties/trustContext.properties.test.ts` | **PROUVÉ REJOUABLE** — tests property-based I1/I2/I3 exécutés et passants en local                                                                                                                                                                                                                                                                                      | Faible                                                                                                                                                |
| C7  | "Fail-closed garanti : toutes les dégradations rejettent proprement"           | `docs/reports/TRL5_PROOF_REPORT.md`      | 108               | tests adversarial + property-based + fuzz                                                                     | **PROUVÉ REJOUABLE** (cf. §3) sur les contrats, le journal et les providers. Limité : pas de fail-closed prouvé sur l'orchestrateur complet (HybridOrchestrator non property-tested — cf. `docs/PRISM_TRL_ASSESSMENT.md` §2.6)                                                                                                                                          | Moyen                                                                                                                                                 |
| C8  | "Key management TRL 5 : Registry, révocation, rotation manuelle opérationnels" | `docs/reports/TRL5_PROOF_REPORT.md`      | 110               | `src/core/KeyRegistry.js`                                                                                     | **PROUVÉ DOCUMENTAIRE** — code présent, mais limites §4.2 : "Clés stockées localement, pas HSM/KMS" + "Rotation manuelle uniquement"                                                                                                                                                                                                                                    | Moyen (limite explicite assumée)                                                                                                                      |
| C9  | "DecisionDigest mismatch → rejet (DIGEST_MISMATCH)"                            | `docs/reports/TRL5_PROOF_REPORT.md`      | 82                | `src/core/TrustContext.js` ligne 873 + 882                                                                    | **PROUVÉ PARTIEL** — code distingue `DIGEST_MISMATCH` (digest tampered) et `DECISION_ID_MISMATCH` (decisionId tampered, commit `888e574`). Le rapport TRL5 et `staging/generate-report.mjs:189` ne mentionnent que `DIGEST_MISMATCH`. Doc-code drift à corriger.                                                                                                        | Faible (mineur)                                                                                                                                       |
| C10 | "Environment : Staging" / "PRISM Mode : TEST"                                  | `docs/reports/TRL5_PROOF_REPORT.md`      | 4, 6              | `staging/docker-compose.yml` (présent)                                                                        | **PROUVÉ DOCUMENTAIRE** — l'env staging existe au sens infrastructure-as-code (docker-compose), mais aucun log de déploiement effectif n'est tracé dans le repo. La métrique est récoltée par un test Vitest local **avec mocks de providers** (`e2e-workflow.test.js:96 // Setup Orchestrator (mock providers pour staging)`), **pas** dans un container staging réel. | **CONTRADICTOIRE** : "Staging" dans le rapport ≠ env staging réel (Docker tournant + providers réels). C'est un staging _simulé en local par Vitest_. |
| C11 | "Tests : Vitest" + "Cryptographie : Ed25519 (Node.js crypto)"                  | `docs/reports/TRL5_PROOF_REPORT.md`      | 94–95             | `package.json` + tests                                                                                        | **PROUVÉ REJOUABLE**                                                                                                                                                                                                                                                                                                                                                    | Faible                                                                                                                                                |
| C12 | "TRL Global : TRL 4"                                                           | `docs/PRISM_TRL_ASSESSMENT.md`           | 264, 483          | même corpus que C1                                                                                            | **CONTRADICTION DIRECTE** avec C1 (même repo, même date 2025-12-14).                                                                                                                                                                                                                                                                                                    | Élevé                                                                                                                                                 |
| C13 | "Core tests : 61/61 tests passants (100%)"                                     | `docs/PRISM_TRL_ASSESSMENT.md`           | 186, 196          | (assertion antérieure)                                                                                        | **OBSOLÈTE** — runs locaux donnent désormais 76/76. La progression 61 → 76 n'est documentée nulle part.                                                                                                                                                                                                                                                                 | Faible si reformulé                                                                                                                                   |
| C14 | "TrustContext incomplet (vérification cryptographique TODO)"                   | `docs/PRISM_TRL_ASSESSMENT.md`           | 126–127, 214, 277 | (assertion antérieure)                                                                                        | **OBSOLÈTE PARTIEL** — l'Ed25519 a depuis été implémenté (commits série `e78a177`, `7e6b704`...`888e574`). Le TODO original est résorbé pour `verifyApproval`.                                                                                                                                                                                                          | Faible si reformulé                                                                                                                                   |
| C15 | "Quality gates automatisées" + "Pre-commit hooks"                              | `README.md` 149–159, `.husky/pre-commit` | —                 | `.husky/pre-commit` lit `npm test \|\| exit 1` mais `npm run typecheck \|\| echo "warnings"`                  | **PROUVÉ PARTIEL** — gate test est bloquant ; gate typecheck est explicitement neutralisé. À déclarer honnêtement.                                                                                                                                                                                                                                                      | Moyen                                                                                                                                                 |

### 2.2 Légende des niveaux

- **PROUVÉ REJOUABLE** : claim associé à un test ou commande rejoués empiriquement durant cet audit avec succès reproductible.
- **PROUVÉ DOCUMENTAIRE** : claim sourcé par du code ou un artefact présent, mais non rejoué empiriquement durant cet audit.
- **PLAUSIBLE MAIS NON REJOUÉ** : claim vraisemblable au vu du code, mais nécessite des conditions externes (clés API) pour être rejoué.
- **CONTRADICTOIRE** : claim en conflit factuel avec une autre source dans le même repo.
- **NON PROUVÉ** : aucun lien identifié vers un fichier, test, log ou commit.

---

## 3. Tests et preuves rejouées

Toutes les commandes ont été lancées sur la machine de l'auditeur, sur le HEAD `618cd8b` après `npm install --legacy-peer-deps --ignore-scripts` (cf. §6 pour le détail de l'environnement).

| Commande                                          | Résultat                                                                                                                                                              | Durée   | Interprétation                                                                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git remote -v`                                   | `origin https://github.com/Makk7709/P.R.I.S.M`                                                                                                                        | < 1s    | Repo canonique confirmé                                                                                                                                                                     |
| `git rev-parse HEAD`                              | `618cd8bacb659e791af40e59932ac43bd5c0e5b4`                                                                                                                            | < 1s    | Commit gel                                                                                                                                                                                  |
| `git status --short`                              | 2 `.pyc` de `.venv/` modifiés, `test-trustcontext-temp/` untracked (artefact test)                                                                                    | < 1s    | Aucun code source modifié                                                                                                                                                                   |
| `npm ci --ignore-scripts`                         | **ÉCHEC** `ERESOLVE` zod 3 vs zod 4 (peer dep `openai@4.104.0` vs root `zod@^4.1.13`)                                                                                 | ~1s     | Build canonique non reproductible sans `--legacy-peer-deps`. **Drapeau rouge TRL 5**.                                                                                                       |
| `npm install --legacy-peer-deps --ignore-scripts` | OK, 967 packages                                                                                                                                                      | ~4s     | Workaround installé, exploration empirique possible                                                                                                                                         |
| `npm test` (run 1 — `vitest.config.core-only.js`) | **`Tests 76 passed (76)`** / `Test Files 10 passed (10)`                                                                                                              | 65.27 s | C2 vérifié : 76/76 reproductible                                                                                                                                                            |
| `npm test` (run 2 — même config)                  | `Tests 76 passed (76)` / `Test Files 10 passed (10)`                                                                                                                  | 64.86 s | C2 reconfirmé sur 2ᵉ run                                                                                                                                                                    |
| `npm run test:proof` (= properties + fuzz)        | `4 + 1` files, **`24 + 7 = 31 tests passed`**                                                                                                                         | 65.25 s | Sous-ensemble cohérent avec 76/76                                                                                                                                                           |
| `npm run typecheck`                               | **511 erreurs TS**, exit 2                                                                                                                                            | ~2 s    | Gate typecheck neutralisé par le hook (`\|\| echo "warnings"`). Dette dépendamment importante.                                                                                              |
| `npm run staging:e2e`                             | **ÉCHEC à l'import** : `Error: The OPENAI_API_KEY environment variable is missing or empty` (issu de `backend/orchestrator.js:25` → `new OpenAI({...})` au top-level) | 0.8 s   | C3 (6/6 E2E PASS) **non rejouable** sous HEAD courant sans clé OpenAI. Reproductibilité TRL 5 = nulle.                                                                                      |
| `npm run staging:report`                          | `No metrics files found, generating empty report` + `✅ Report generated: docs/reports/TRL5_PROOF_REPORT.md` exit 0                                                   | 0.3 s   | Le générateur **hardcode** la conclusion TRL 5 même sans métriques. Diff vs commit : **uniquement les 2 lignes de date**. Le reste du texte est identique. Confirmation empirique de C4↔C5. |

### 3.1 Détail des 76 tests (par fichier)

| Fichier                                                | Nombre de tests | Type                        |
| ------------------------------------------------------ | --------------- | --------------------------- |
| `__tests__/properties/consensus.properties.test.ts`    | 7               | property-based (fast-check) |
| `__tests__/properties/providers.properties.test.ts`    | 5               | property-based              |
| `__tests__/properties/trustContext.properties.test.ts` | 8               | property-based (I1, I2, I3) |
| `__tests__/properties/journal.properties.test.ts`      | 4               | property-based              |
| `__tests__/audit/tamperEvidentAuditLog.spec.ts`        | 7               | unit / scénarios d'attaque  |
| `__tests__/adversarial/providers.adversarial.test.ts`  | 11              | adversarial                 |
| `__tests__/fuzz/contracts.fuzz.test.ts`                | 7               | fuzzing (Zod)               |
| `__tests__/trustContext.regression.test.ts`            | 6               | régression                  |
| `tests/consensus/consensus.invariants.spec.ts`         | 5               | invariants                  |
| `tests/consensus/consensus.micro-tests.spec.ts`        | 16              | micro-tests                 |
| **TOTAL**                                              | **76**          |                             |

### 3.2 Tests _non_ inclus dans `npm test`

- `staging/e2e-workflow.test.js` (S1–S6, la preuve TRL 5 principale) — **exclu** de `vitest.config.core-only.js`, seulement lancé via `npm run staging:e2e` (qui crash sans clé OpenAI).
- `__tests__/integration/trustContext-*.spec.ts` — non inclus dans la suite "core".
- `__tests_legacy__/` et `legacy_tests/` — 392 tests historiques en quarantine (cf. `docs/PRISM_TRL_ASSESSMENT.md` §2.7).
- Toute la couverture `tests/voice/`, `tests/infographic/`, `tests/ui/`, `tests/pdf/`, `tests/orchestrator/`, `tests/integration/`, `tests/core/` — exclue de la suite bloquante.

**Conclusion §3** : les 76/76 sont reproductibles et solides sur le périmètre **invariants / fuzz / adversarial / régression TrustContext / audit log**. Mais ils **ne testent pas le workflow E2E TRL 5**. Ce sont deux périmètres différents que le README amalgame.

---

## 4. Claim 76/76 — analyse spécifique

| Sous-claim                      | Réalité                                                                                                                                                                                                                                                                              | Défendable ?                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **Source du chiffre 76**        | La chaîne "76/76" n'apparaît **que dans `README.md` ligne 19**. Aucun script de génération, aucun log de CI tracé. Le chiffre vient directement du résultat de `npm test` sous `vitest.config.core-only.js`.                                                                         | ✅ Oui — c'est un comptage Vitest réel                                |
| **Commande rejouée**            | `npm test` → `vitest run --config vitest.config.core-only.js`                                                                                                                                                                                                                        | ✅                                                                    |
| **Résultat empirique (run 1)**  | `Test Files 10 passed (10) / Tests 76 passed (76)` en 65.27 s                                                                                                                                                                                                                        | ✅                                                                    |
| **Résultat empirique (run 2)**  | `Test Files 10 passed (10) / Tests 76 passed (76)` en 64.86 s                                                                                                                                                                                                                        | ✅ Reproductible                                                      |
| **Couverture réelle**           | Property-based (consensus, providers, trustContext invariants I1-I3, journal), audit log tamper-evident, fuzz contrats Zod, adversarial providers, regression TrustContext, invariants/micro-tests consensus. **Pas** le workflow E2E TRL 5, pas l'orchestrateur, pas l'intégration. | ⚠️ Périmètre étroit                                                   |
| **« Deterministic »**           | Property-based avec fast-check : seed fixe par défaut → déterministe pour un même run. Acceptable.                                                                                                                                                                                   | ✅                                                                    |
| **« Reproducible »**            | Reproduit 2× en local sur même HEAD. Toutefois, la reproductibilité dépend d'un workaround (`--legacy-peer-deps`) → pas reproductible _strictement_ à partir de `npm ci`.                                                                                                            | ⚠️ Avec asterisque                                                    |
| **« property-based »**          | 24 tests sont effectivement property-based via `fast-check` (cf. `npm run test:proof`). Les 52 autres sont unitaires/régression/fuzz/adversarial. La formulation « 76/76 property-based tests » est **techniquement inexacte**.                                                      | ❌ À reformuler : "76/76 deterministic tests, dont 24 property-based" |
| **Légitime comme preuve TRL ?** | Comme preuve TRL 4 d'invariants critiques : **oui**. Comme preuve TRL 5 staging : **non**, le claim 76/76 ne touche pas le workflow E2E staging.                                                                                                                                     | ⚠️ Confusion de périmètre dans le README                              |

**Tests exacts comptés** : voir §3.1.

**Verdict §4** : Le chiffre 76/76 est **honnête, reproductible et défendable**, mais sa qualification « property-based » est **techniquement imprécise** (~32 % des 76 le sont réellement) et son **utilisation comme preuve TRL 5 est trompeuse** : ces 76 tests prouvent la solidité des invariants critiques (un argument fort de TRL 4), mais pas la validation en environnement pertinent (TRL 5). Le README mélange les deux.

---

## 5. Claim TRL 5 staging — analyse spécifique

### 5.1 Environnement « staging »

| Élément                                                           | Réalité observée                                                                                                                                                                                                                              | Commentaire                                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Infrastructure                                                    | `staging/docker-compose.yml` existe (service `prism-staging` sur port 3001)                                                                                                                                                                   | ✅ IaC présente                                                                        |
| Image utilisée                                                    | Build depuis `../Dockerfile` (root)                                                                                                                                                                                                           | ✅                                                                                     |
| Variables d'env                                                   | Lit `${OPENAI_API_KEY:-}` etc. depuis `.env`                                                                                                                                                                                                  | ⚠️ Sans clés réelles, fail silencieux puis crash                                       |
| **Le test `staging:e2e` tourne-t-il dans le container staging ?** | **NON.** `e2e-workflow.test.js` est lancé par **Vitest sur la machine hôte**, via `NODE_ENV=staging PRISM_MODE=staging vitest run staging/e2e-workflow.test.js`. Il **ne dépend pas** du `docker-compose up`.                                 | ❌ « Staging » ici = simple variable d'environnement Node, **pas** un déploiement réel |
| Providers réels ?                                                 | Le fichier précise ligne 96 : `// Setup Orchestrator (mock providers pour staging)`. ConsensusManager est instancié avec `timeoutMs: 5000` mais **sans configuration de providers** → providers réels ne sont jamais sollicités effectivement | ❌ Pas de validation avec providers IA réels                                           |
| Pourquoi alors le crash sans `OPENAI_API_KEY` ?                   | Parce que `HybridOrchestrator.js:22` importe `backend/orchestrator.js` qui à la ligne 25 fait `new OpenAI({apiKey: process.env.OPENAI_API_KEY})` au top-level                                                                                 | ❌ Import side-effect — fragilité structurelle                                         |

### 5.2 Workflow testé (S1–S6)

D'après `staging/e2e-workflow.test.js` :

| Scénario                    | Ce qu'il prouve                                                 | Limite                                                                                                                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 — Nominal HIGH approved  | TrustContext + KeyRegistry + Ed25519 fonctionnent en happy path | n=1                                                                                                                                                                                                                                                      |
| S2 — CRITICAL sans approval | Fail-closed sur absence d'approval                              | n=1                                                                                                                                                                                                                                                      |
| S3 — Signature invalide     | Fail-closed sur signature hex bidon                             | n=1                                                                                                                                                                                                                                                      |
| S4 — Digest mismatch        | Fail-closed sur fakeDigest 'a'\*64                              | n=1, et le test du _vrai_ mismatch (modification post-création de `decision.data`) est désamorcé par un commentaire (« decision.decisionDigest ne change pas car calculé à la création »). Le test fini avec un fake digest, pas un mismatch authentique |
| S5 — Provider timeout/down  | TrustContext escalade malgré timeout                            | n=1, mock                                                                                                                                                                                                                                                |
| S6 — Approver non autorisé  | Fail-closed sur role 'security' pour CRITICAL                   | n=1                                                                                                                                                                                                                                                      |

**Tous ces tests sont in-process, n=1, sur des mocks de providers**, dans un répertoire temporaire `test-trustcontext-staging/`, sans réseau, sans charge, sans pilote utilisateur, sans déploiement Docker effectif.

### 5.3 Évaluation TRL 5 pour ce qui est _réellement_ prouvé

| Critère TRL 5 (« validé en environnement pertinent ») | État                                                                                                                              | Note       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Environnement représentatif de production             | **NON** — Vitest hôte avec mocks, pas le container staging                                                                        | ❌         |
| Charge représentative                                 | **NON** — n=1 par scénario                                                                                                        | ❌         |
| Providers IA réels validés                            | **NON** — mocks                                                                                                                   | ❌         |
| Intégration end-to-end testée                         | **OUI** sur le périmètre TrustContext + KeyRegistry + Ed25519 + journal                                                           | ✅ partiel |
| Reproductibilité indépendante                         | **NON** — crash sans `OPENAI_API_KEY`, peer-dep ERESOLVE, métriques jamais agrégées                                               | ❌         |
| Preuves d'absence de défaillance critique             | **OUI partiel** — 6 scénarios fail-closed couverts                                                                                | ✅ partiel |
| Traçabilité (logs, métriques persistées)              | **NON** — métriques n=1 par fichier dans `staging/metrics/`, jamais agrégées (bug `push(...objet)` dans `generate-report.mjs:41`) | ❌         |

**Verdict §5** : Le claim « TRL 5 staging validated » repose sur une **interprétation très généreuse du mot "staging"**. Ce qui est réellement démontré est **« validation TRL 4 avancée du sous-système TrustContext + KeyRegistry + signature Ed25519 + journal tamper-evident, en intra-process, avec mocks providers, n=1 par scénario »**.

Ce n'est pas honteux — c'est un travail solide de TRL 4 — mais ce **n'est pas TRL 5** au sens DGA/NASA/ISO 16290.

---

## 6. Contradiction performance — analyse précise

### 6.1 Faits

| Source                                       | Contenu textuel                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRL5_PROOF_REPORT.md` §2.1 (ligne 43–44)    | « **Aucune métrique disponible** (tests non exécutés) » pour latence `verifyApproval()`                                                                                                                                                                                                                                                                                                                                                                   |
| `TRL5_PROOF_REPORT.md` §2.2 (ligne 46–47)    | « **Aucune métrique disponible** (tests non exécutés) » pour latence pipeline complet                                                                                                                                                                                                                                                                                                                                                                     |
| `TRL5_PROOF_REPORT.md` §7.1 (ligne 109)      | « ✅ **Performance acceptable** : Latence verifyApproval < 100ms (p95) »                                                                                                                                                                                                                                                                                                                                                                                  |
| `staging/generate-report.mjs` lignes 125–135 | Template conditionnel : si `stats.verifyApproval` non null → affiche p50/p95/p99 ; sinon → affiche « Aucune métrique disponible »                                                                                                                                                                                                                                                                                                                         |
| `staging/generate-report.mjs` ligne 217      | « ✅ **Performance acceptable : Latence verifyApproval < 100ms (p95)** » — **hardcodé en clair**, indépendamment de l'état des métriques                                                                                                                                                                                                                                                                                                                  |
| `staging/generate-report.mjs` ligne 41       | `allMetrics.verifyApproval.push(...data.metrics.verifyApproval)` — bug : `data.metrics.verifyApproval` est un objet (`{count, p50, p95, ...}`), pas itérable → `TypeError` runtime, ou alors push silencieux selon l'env ; quoi qu'il en soit **aucune sample n'est jamais agrégée** entre fichiers                                                                                                                                                       |
| `staging/metrics/*.json`                     | 7 fichiers, chacun `count: 1` (1 sample par run de tests S1). Aucun agrégat. Valeurs observées entre `1.79 ms` et `1.92 ms`                                                                                                                                                                                                                                                                                                                               |
| Reproduction empirique                       | Exécution de `npm run staging:report` avec les métriques présentes : sortie console = « **No metrics files found, generating empty report** » (le test `files.startsWith('e2e-metrics-')` réussit pourtant — mais l'erreur runtime du `push(...obj)` n'est pas capturée propre, ou le test ne trouve rien selon la version Node) ; le fichier rapport est néanmoins régénéré avec le **même texte** que la version commitée (seules les dates diffèrent). |

### 6.2 Classification de la contradiction

> **Contradiction BLOQUANTE structurelle**, et **non simple imprécision rédactionnelle**.

Justification :

1. La contradiction n'est pas un oubli, elle est **gravée dans le code du générateur** : §2 du rapport est conditionnel sur l'agrégation effective de métriques, mais §7.1 hardcode la conclusion « < 100ms p95 » **indépendamment de toute donnée**.
2. Sous HEAD courant, **aucune métrique n'est jamais agrégée** par le générateur (bug d'itération objet), donc §2 affiche systématiquement « Aucune métrique disponible » tandis que §7.1 affiche systématiquement « < 100ms p95 ». Les versions futures du rapport répéteront mécaniquement la contradiction.
3. Au niveau _substantif_ : les seules métriques existantes (`staging/metrics/*.json`) sont **n=1 par fichier**, soit 7 samples au total, soit pas de p95 défendable statistiquement.
4. Les valeurs brutes (~1.8 ms à 1.9 ms) sont **plausibles pour Ed25519 in-process sur Node** et **sont effectivement < 100 ms**, mais ne constituent pas une **preuve p95** : un p95 nécessite ≥ 20 samples (et idéalement > 100). Le claim est vrai _en ordre de grandeur_ mais faux en _forme statistique_.

### 6.3 Verdict

- **Verdict 1 (interne)** : Contradiction bloquante interne au rapport (§2.1 ↔ §7.1).
- **Verdict 2 (claim p95)** : Claim « verifyApproval < 100ms p95 » **non prouvé en l'état** (n=1 par run, jamais agrégé). Plausible mais à reformuler en « latence verifyApproval observée < 5 ms sur n=7 mesures isolées ».
- **Verdict 3 (claim § Aucune métrique)** : Faux aussi — des métriques _existent_ dans `staging/metrics/` mais le générateur ne sait pas les agréger.
- **Verdict 4** : Le rapport doit être régénéré **après correction du bug d'itération** ET **après ré-exécution de S1 en boucle** (n ≥ 50) pour produire un vrai p95. Aujourd'hui, ni l'un ni l'autre.

À reformuler plus tard dans la mission `PRISM_02B_TRL_DOCUMENTATION_FIX` (cf. §11).

---

## 7. Grille TRL prudente (multi-critères)

Notation : **0** = absent / **1** = présent partiel non prouvé / **2** = présent et prouvé documentaire / **3** = présent et rejouable empiriquement.

| #   | Critère TRL 5                                            | Preuve                                                                                          | Score | Commentaire                                                              |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| G1  | Environnement de test représentatif (staging)            | `staging/docker-compose.yml` + Vitest hôte avec mocks                                           | **1** | IaC existe mais jamais réellement utilisée pour produire la preuve TRL 5 |
| G2  | Staging réel ou simulé                                   | Simulé en local par Vitest avec providers mockés                                                | **1** | Pas un staging déployé                                                   |
| G3  | Reproductibilité (`npm ci` + commande unique)            | `npm ci` échoue (ERESOLVE), `staging:e2e` crash sans clé                                        | **0** | **Bloquant**                                                             |
| G4  | Couverture fonctionnelle critique                        | 76 tests passants (invariants + audit + fuzz + regression)                                      | **3** | Solide sur TrustContext / journal / providers                            |
| G5  | Couverture sécurité                                      | Ed25519 testé, fail-closed testé sur 5+ scénarios, fuzz Zod                                     | **3** | Bon                                                                      |
| G6  | Tests adversariaux                                       | `__tests__/adversarial/providers.adversarial.test.ts` 11 tests                                  | **3** | Bon mais focalisé providers                                              |
| G7  | Tests de charge                                          | Aucun (60k events/h mentionné dans README §Métriques mais zéro lien de preuve)                  | **0** | Claim README sans support                                                |
| G8  | Logs et métriques persistés                              | 7 fichiers `e2e-metrics-*.json` n=1 chacun, non agrégés                                         | **1** | Présence symbolique                                                      |
| G9  | Validation utilisateur réelle                            | Aucun pilote utilisateur, aucun client documenté                                                | **0** | Honnêtement reconnu dans §7.2 du rapport                                 |
| G10 | Déploiement opérationnel                                 | Aucun                                                                                           | **0** | Honnêtement reconnu dans `PRISM_TRL_ASSESSMENT.md` §4.1                  |
| G11 | Indépendance des preuves (tiers, audit externe, pentest) | Aucun audit tiers cité                                                                          | **0** | À assumer comme limite                                                   |
| G12 | Absence de contradiction documentaire                    | C1 ↔ C12 (TRL 5 vs TRL 4 même date), C4 ↔ C5 (perf), C13 (61 vs 76)                             | **0** | **Bloquant pour CAA**                                                    |
| G13 | Cohérence code ↔ documentation                           | DIGEST_MISMATCH dans le rapport ≠ DIGEST + DECISION_ID_MISMATCH dans le code (commit `888e574`) | **1** | Drift mineur mais documenté ici                                          |
| G14 | Quality gates effectives                                 | `npm test` bloquant : OK / `npm run typecheck` neutralisé (511 erreurs ignorées) : KO           | **2** | Gate tests OK, gate types KO                                             |
| G15 | Gestion de clés                                          | KeyRegistry local JSON, fingerprints SHA-256, rotation manuelle                                 | **2** | Limite explicite (pas HSM/KMS)                                           |

**Total / 45** : **17 / 45** = **38 %**

**Lecture prudente** :

- Strict TRL 5 attendrait > 70 %.
- 35–55 % correspond à un profil **TRL 4 avancé**.
- < 30 % serait TRL 3.

**Verdict §7** : **TRL 4 avancé avec démonstration partielle TRL 5 en staging simulé interne.**

---

## 8. Verdict recommandé pour commissaire aux apports

### 8.1 Options

- **Option A** : « TRL 5 interne défendable, sous réserve de clarifier les métriques performance et de préciser l'absence de pilote utilisateur réel. » → **Non recommandée**. Trop de contradictions documentaires (G12), reproductibilité bloquée (G3), staging simulé (G2), métriques insuffisantes (G8) pour que cette formulation tienne en cas de contre-audit hostile.

- **Option B** : « TRL 4 avancé avec démonstration partielle TRL 5 en staging contrôlé. » → **RECOMMANDÉE**. Reflète fidèlement : (a) la solidité réelle des invariants TRL 4 prouvés rejouables (G4, G5, G6), (b) l'existence d'une infrastructure staging (G1) sans validation indépendante (G11), (c) le caractère interne, in-process et n=1 des preuves TRL 5 actuelles. Décotes nettes au §10.

- **Option C** : « TRL 5 non défendable en l'état. » → **Non recommandée**. Sous-estime la solidité réelle du noyau invariants. Inéquitable pour la valorisation.

### 8.2 Justification du choix Option B

1. **Ce qui résiste à un auditeur hostile (Option B couvre)** :
   - 76 tests passants reproductibles (C2)
   - Invariants critiques de fail-closed prouvés par fast-check sur TrustContext / consensus / journal / providers
   - Audit log tamper-evident solide (7 scénarios d'attaque couverts)
   - Ed25519 + KeyRegistry + canonicalization fonctionnels
   - Conformité avec la propre auto-évaluation interne `docs/PRISM_TRL_ASSESSMENT.md` (TRL 4)

2. **Ce qui ne résiste pas à un auditeur hostile (Option A serait fragilisée par)** :
   - Contradiction §2 / §7.1 du rapport TRL5
   - Test E2E TRL 5 non rejouable sans clé OpenAI
   - Aucune métrique p95 statistiquement valide
   - Aucune validation tiers / utilisateur / charge
   - `npm ci` ne fonctionne pas
   - 511 erreurs typecheck silencieusement ignorées
   - Deux conclusions TRL contradictoires dans le repo

3. **Formulation CAA proposée** (à reprendre verbatim dans un éventuel rapport d'audit présenté au commissaire) :

   > « PRISM atteint un niveau **TRL 4 avancé** sur ses composants critiques (TrustContext, KeyRegistry, journal tamper-evident, contrats Zod, adapters providers), avec invariants prouvés par tests property-based reproductibles (76 tests en 65 s sur `vitest.config.core-only.js`, run du JJ/MM/AAAA, HEAD `618cd8b`, SHA loggée).
   > Un démonstrateur TRL 5 partiel existe sous forme d'un test E2E in-process (`staging/e2e-workflow.test.js`, scénarios S1–S6) exécuté en environnement Vitest local avec mocks de providers, n=1 par scénario. Ce démonstrateur n'a pas été rejoué en environnement opérationnel indépendant et requiert des clés API externes pour être exécuté en l'état.
   > Aucun pilote utilisateur réel, aucun déploiement production, aucun audit indépendant, aucun KMS/HSM, aucun monitoring opérationnel ne sont engagés à ce stade. »

Cette formulation est **défendable**, **vérifiable**, et **évite tout reclassement TRL hostile** par le CAA.

---

## 9. Corrections documentaires recommandées (mission ultérieure, hors scope ici)

À **NE PAS** appliquer dans la présente mission. À traiter dans `PRISM_02B_TRL_DOCUMENTATION_FIX`.

| ID  | Cible                                                                      | Action recommandée                                                                                                                                                                                                                   | Justification                    |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| F1  | `README.md` §TRL Status                                                    | Remplacer « Current TRL : 4 → 5 (staging validated) » par formulation Option B §8.2                                                                                                                                                  | Aligner avec preuves réelles     |
| F2  | `README.md` ligne 19                                                       | Remplacer « 76/76 deterministic, reproducible property-based tests » par « 76/76 deterministic tests (24 property-based via fast-check + 52 unit/regression/adversarial/fuzz), reproducible after `npm install --legacy-peer-deps` » | Précision technique              |
| F3  | `docs/reports/TRL5_PROOF_REPORT.md` §2.1 / §2.2                            | Régénérer après correction du générateur ; documenter explicitement n=7, p50/p95/p99 ou retirer le claim p95                                                                                                                         | Cohérence interne                |
| F4  | `docs/reports/TRL5_PROOF_REPORT.md` §7.1                                   | Soit retirer le claim « < 100ms p95 », soit le sourcer sur un benchmark n ≥ 50 reproductible                                                                                                                                         | Honnêteté statistique            |
| F5  | `docs/reports/TRL5_PROOF_REPORT.md` §5 + `staging/generate-report.mjs:189` | Ajouter `DECISION_ID_MISMATCH` à côté de `DIGEST_MISMATCH`                                                                                                                                                                           | Doc-code drift résorbé           |
| F6  | `staging/generate-report.mjs:41-50`                                        | Corriger l'itération : remplacer `push(...data.metrics.verifyApproval)` par lecture des samples bruts. Idéalement, refondre pour persister les samples individuels dans `e2e-metrics-*.json` (non plus les agrégats).                | Permettre un vrai p95            |
| F7  | `docs/reports/TRL5_PROOF_REPORT.md`                                        | Préciser « Environment : Staging » → « Environment : Vitest local with mocked providers, in-process, container staging IaC defined but not exercised »                                                                               | Vérité matérielle                |
| F8  | `docs/PRISM_TRL_ASSESSMENT.md` §2.7                                        | Mettre à jour « 61/61 tests » → « 76/76 tests, scope ... »                                                                                                                                                                           | Cohérence chronologique          |
| F9  | `docs/PRISM_TRL_ASSESSMENT.md` §2.4                                        | Mettre à jour le TODO sur vérification cryptographique TrustContext (résolu par série de commits Ed25519)                                                                                                                            | Refléter l'état réel             |
| F10 | `.husky/pre-commit`                                                        | Décider explicitement : ou rendre typecheck bloquant, ou exclure les 511 fichiers historiques d'un `tsconfig.legacy.json` distinct. Documenter le choix.                                                                             | Quality gate sincère             |
| F11 | `package.json` / `package-lock.json`                                       | Résoudre `ERESOLVE` (downgrade openai ou pinning zod) pour permettre `npm ci` sans flag                                                                                                                                              | Reproductibilité TRL 5           |
| F12 | `backend/orchestrator.js:25`                                               | Lazy-init du client OpenAI (factory function) pour éviter crash à l'import sans `OPENAI_API_KEY`                                                                                                                                     | Permettre `staging:e2e` sans clé |

**Toutes ces corrections sont en dehors du périmètre de la présente mission.**

---

## 10. Impact valorisation (qualitatif, aucun chiffre)

| Si revendication retenue                 | Impact valorisation                                                                                                                                                                                                                                            | Précautions à annexer                                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Option B (recommandée)**               | Impact positif **maîtrisé** : TRL 4 avancé est cohérent avec une valorisation de prototype industriel solide, soutenue par 76 tests reproductibles et un invariant fail-closed prouvé. Décote raisonnable sur les promesses TRL 5+.                            | Annexer : (a) log `npm test` reproductible avec hash de tests, (b) `docs/PRISM_TRL_ASSESSMENT.md` v2 mise à jour, (c) plan documenté de progression vers TRL 5 indépendant. |
| **Option A**                             | Impact positif **fragile** : TRL 5 défendable seulement si les corrections F3, F4, F6, F11, F12 sont effectuées **avant** transmission. Sinon, risque de contre-audit hostile qui rabaisse à TRL 3-4 et entraîne perte de crédibilité.                         | Annexer impérativement : (a) métriques p95 sur n ≥ 50, (b) déploiement staging réel + replay log, (c) attestation tiers (auditeur indépendant).                             |
| **Option C**                             | Impact négatif **non justifié** par les preuves disponibles : sous-évalue le travail invariants.                                                                                                                                                               | À éviter.                                                                                                                                                                   |
| **Statu quo (claim actuel non corrigé)** | **Risque élevé** : la contradiction §2/§7.1 du rapport est visible en lecture rapide. Un CAA prudent demanderait reformulation immédiate ou refuserait l'attestation TRL. Risque de décote disproportionnée par effet d'incrédulité sur l'ensemble du dossier. | À éviter absolument.                                                                                                                                                        |

**Pièces à annexer au dossier CAA (option B)** :

1. `docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md` (le présent document)
2. `docs/PRISM_TRL_ASSESSMENT.md` (auto-évaluation interne TRL 4 conforme)
3. Log brut `npm test` sur HEAD `618cd8b` (à capturer dans un fichier daté lors de la mission `PRISM_02B`)
4. Hash SHA-256 du `package-lock.json` et de `vitest.config.core-only.js`
5. Liste explicite des 76 tests avec leur fichier (cf. §3.1 du présent document)
6. Statement clair sur les limites (cf. §7.2 du rapport TRL5 actuel — qui est honnête)

---

## 11. Prochaine mission recommandée

Ordre prudent :

1. **`PRISM_02B_TRL_DOCUMENTATION_FIX`** — corrections F1, F2, F3, F4, F5, F7, F8, F9 (purement documentaires, à coût quasi nul, à très fort effet anti-contradiction). Doit être faite **avant toute transmission CAA**.
2. **`PRISM_03_REPO_HYGIENE_CLEANUP`** — résoudre `npm ci` (F11), traiter `test-trustcontext-temp/` untracked, statuer sur les centaines de `.md` à la racine, retirer les `.pyc` de `.venv/` du suivi.
3. **`PRISM_03_TYPECHECK_AND_TEST_STABILIZATION`** — adresser F10 (gate typecheck), optionnellement F12 (lazy-init OpenAI client pour permettre staging:e2e sans clé), réduire les 511 erreurs TS de manière chiffrée et trackée.
4. **`PRISM_04_TRL5_INDEPENDENT_VALIDATION`** (mission longue, optionnelle pour CAA mais souhaitable pour valorisation) — déploiement staging réel (docker-compose effectivement exécuté), benchmark n ≥ 50, replay sur infra tiers, génération p50/p95/p99 sourcés.

**Mission immédiate recommandée** : **`PRISM_02B_TRL_DOCUMENTATION_FIX`**.

---

## Annexes

### Annexe A — Commandes rejouées avec sorties brutes (extraits)

```text
$ git rev-parse HEAD
618cd8bacb659e791af40e59932ac43bd5c0e5b4

$ npm test
...
 Test Files  10 passed (10)
      Tests  76 passed (76)
   Duration  65.27s

$ npm run typecheck 2>&1 | grep -c "error TS"
511

$ npm run staging:e2e
...
Error: The OPENAI_API_KEY environment variable is missing or empty;
either provide it, or instantiate the OpenAI client with an apiKey
option, like new OpenAI({ apiKey: 'My API Key' }).
 ❯ new OpenAI node_modules/openai/src/index.ts:272:13
 ❯ backend/orchestrator.js:25:16
 ❯ src/orchestrator/HybridOrchestrator.js:22:1
 Test Files  1 failed (1)
      Tests  no tests

$ npm run staging:report
No metrics files found, generating empty report
✅ Report generated: /Users/.../docs/reports/TRL5_PROOF_REPORT.md
```

### Annexe B — État Git post-audit

- Aucun fichier source du repo modifié.
- `docs/reports/TRL5_PROOF_REPORT.md` a été régénéré accidentellement par `npm run staging:report` (effet de bord du test du générateur). Diff observé : **uniquement les 2 lignes de date**. Restauré immédiatement via `git checkout -- docs/reports/TRL5_PROOF_REPORT.md`. Cette régénération elle-même constitue une **preuve empirique majeure** que le générateur produit la même conclusion TRL5 indépendamment des données — cf. §6.
- `test-trustcontext-temp/` reste untracked (artefact connu des property tests TrustContext qui ne nettoie pas toujours).
- `.venv/lib/python3.11/site-packages/.../*.pyc` restent marqués M (état pré-existant, hors périmètre).
- `node_modules/` créé localement par `npm install --legacy-peer-deps --ignore-scripts` (gitignored).
- Seul fichier nouveau effectivement créé par cette mission : **`docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md`** (le présent document).

### Annexe C — Liens et références

- `README.md` (claim TRL principal)
- `docs/reports/TRL5_PROOF_REPORT.md` (preuve TRL 5 affirmée)
- `docs/PRISM_TRL_ASSESSMENT.md` (auto-évaluation interne contradictoire TRL 4)
- `staging/e2e-workflow.test.js` (test E2E TRL 5)
- `staging/generate-report.mjs` (générateur du rapport)
- `staging/docker-compose.yml` (IaC staging non exercée)
- `staging/metrics/e2e-metrics-*.json` (7 fichiers n=1)
- `vitest.config.core-only.js` (config produisant 76/76)
- `backend/orchestrator.js` (import side-effect bloquant)
- `.husky/pre-commit` (gate typecheck neutralisé)

---

**Document généré le** : 2026-05-15
**Auditeur** : posture hostile + commissaire aux apports prudent + CTO deeptech
**Base** : HEAD `618cd8bacb659e791af40e59932ac43bd5c0e5b4`, branche `main`, repo `Makk7709/P.R.I.S.M`
**Status** : Audit terminé. Verdict TRL : **Option B — TRL 4 avancé avec démonstration partielle TRL 5 en staging contrôlé**.
**Aucune modification de code, README, tests, ou rapport TRL5 n'a été conservée.**
