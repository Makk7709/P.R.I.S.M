# Documentation Technique Standardisée — PRISM

## 1. Identification du projet

| Champ | Valeur |
| --- | --- |
| Nom du projet | PRISM (`prism` v2.0.0, cf. `package.json` ligne 2-3) |
| Type de projet | Système d'orchestration multi-modèles d'agents IA exposé via une API HTTP, accompagné d'un dashboard et d'un module d'auditabilité cryptographique. |
| Domaine d'application | Orchestration LLM applicative (chat, génération PDF, voix, image), avec couches de consensus et de gouvernance dont l'usage cible documenté concerne des contextes Enterprise (référencés sous `backend/routes/enterpriseExport.js` et `backend/services/enterprise*.js`). |
| Statut observé | Phase de pré-industrialisation. La doctrine TRL interne se positionne à « TRL 4 avancé avec démonstration partielle TRL 5 en staging contrôlé interne » (`docs/PRISM_TRL_ASSESSMENT.md`, `docs/reports/TRL5_PROOF_REPORT.md`, mis à jour par `PRISM_02B`). |
| Langage principal | JavaScript (ES Modules, Node.js ≥16), avec un sous-ensemble Python sous `src/prism_salesops/` (`pyproject.toml`). |
| Frameworks principaux | Express 5 (serveur HTTP), Vitest 3 et Jest (tests), fast-check (property-based), Next.js 14 (dashboard), Tailwind, Socket.io, Winston, prom-client, better-sqlite3, OpenAI SDK, Anthropic SDK, Supabase JS, `@google/genai`. |
| Date de génération | 2026-05-20 |
| Périmètre audité | Branche `main` du dépôt `Makk7709/P.R.I.S.M`, HEAD `3142176` (post-`PRISM_03B`). Repo canonique purgé (`PRISM_04`) et tags alignés (`PRISM_04B`). Repo satellite `prism-lite-DICA-ui-ux-design` **hors périmètre**. |

---

## 2. Résumé exécutif

PRISM est un système d'orchestration d'agents IA dont la finalité observable est de combiner les réponses de plusieurs fournisseurs LLM (OpenAI, Anthropic, Perplexity, et — pour des sous-fonctions spécifiques — Gemini, fal.ai, ElevenLabs) selon un protocole de consensus à quorum 2/3, et d'attacher à chaque décision critique un journal d'audit cryptographiquement vérifiable.

Le code applicatif comporte deux couches d'orchestration distinctes : une couche historique « simple » sous `backend/orchestrator.js` (routage `taskType` → provider unique avec cache LRU et fallback OpenAI), et une couche avancée sous `src/core/ConsensusManager.js`, `src/orchestrator/HybridOrchestrator.js`, `src/core/TrustContext.js` et `src/audit/TamperEvidentAuditLog.js`. La cohabitation de ces deux couches, et l'écart d'intégration entre le serveur d'entrée `server.js` et les composants critiques de `/src`, sont les points d'attention principaux.

La maturité technique varie sensiblement par composant. Les modules « cœur » (`ConsensusManager`, `TamperEvidentAuditLog`, `TrustContext`, `KeyRegistry`, `PriorityQueue`) sont accompagnés de tests property-based (`fast-check`) et de schémas Zod (`src/security/contracts/`). L'industrialisation transverse est partielle : `npm test` passe à 76/76 tests sur le périmètre `vitest.config.core-only.js`, mais `npm run typecheck` produit 511 erreurs TypeScript qui sont neutralisées par le hook pre-commit (`.husky/pre-commit` ligne 12). La reproductibilité `npm ci` est obtenue via `.npmrc` (`legacy-peer-deps=true`) en raison d'un conflit de pair `zod` v3/v4.

Le dépôt a fait l'objet d'une purge historique des secrets (`PRISM_04`, `PRISM_04B`) et d'une réapplication d'hygiène (`PRISM_03B`), traçabilité présente sous `docs/valuation/`. Le code est sous licence AGPL v3 (`LICENSE`).

Réserves principales à confirmer :

- contradiction entre le `package.json` (`"description": "PRISM v2 — Advanced AI Orchestration System"`) et les éléments documentaires qui se réfèrent à un positionnement de marché plus large ;
- périmètre réel des routes Express effectivement exposées par `server.js` versus celles importées mais non montées ;
- statut juridique des références à des modules Python labellisés « salesops » qui suggèrent un produit dérivé partiellement intégré.

---

## 3. Périmètre fonctionnel constaté

| Fonctionnalité | Statut observé | Fichiers / modules concernés | Commentaire |
| --- | --- | --- | --- |
| API HTTP de chat | Constaté | `server.js` (POST `/api/chat`), `src/orchestrator/HybridOrchestrator.js`, `backend/orchestrator.js`, `src/core/TaskTypeProcessor.js` | Trois orchestrateurs successifs en cascade selon `taskType`. |
| Consensus multi-modèles | Constaté | `src/core/ConsensusManager.js` (638 lignes), `src/consensus/ConsensusManager.ts`, `src/core/providers/{OpenAI,Anthropic,Perplexity}Adapter.js` | Quorum 2/3 hard-codé, timeout 1000 ms, abstention/`unavailable` gérés, fail-closed via Zod (`src/security/contracts/consensus.js`). |
| Journal d'audit tamper-evident | Constaté | `src/audit/TamperEvidentAuditLog.js` (554 lignes), `data/audit/audit-{timestamp}.jsonl` | Format JSONL, chaînage SHA-256 (`prevHash`), signature Ed25519 (PEM pkcs8/spki), méthode `verify()` (ligne 490 et suivantes). |
| Approbation humaine sur décisions critiques | Constaté | `src/core/TrustContext.js` (1287 lignes), `src/core/KeyRegistry.js`, `src/security/contracts/trustcontext.js` | Niveaux `CriticalityLevel` low → critical ; `minApprovalLevel` défaut HIGH ; `governancePolicy` (lead/security/owner) ; timeout d'approbation 30 min. |
| Registre de clés Ed25519 | Constaté | `src/core/KeyRegistry.js`, `data/key-registry.json` | Statuts `active`/`revoked`, méthodes `rotateKey()`, `revokeKey()` ; persistance JSON. |
| File de priorité ordonnancée | Constaté | `src/core/PriorityQueue.js` (305 lignes) | Heap O(log n), référencée dans le dossier brevetabilité (`ANALYSE_BREVETABILITE_PRIORITY_QUEUE_INPI_2025.md`). |
| Export PDF Enterprise | Constaté | `backend/services/enterprisePDFService.js` (711 lignes), `backend/services/enterpriseSanitizer.js`, `backend/routes/enterpriseExport.js` | Pipeline complet (sanitization + rendu PDFKit + CSRF + Joi). |
| Génération d'image | Constaté | `src/infographic/ImageGenerator.js` | Utilise `@google/genai` ; fallback fal.ai (Flux). |
| Voix (lecture / synthèse) | Constaté | `src/voice/ResponseModeManager.js`, `src/voice/ElevenLabsService.js`, `backend/voicePersonalityEnhancer.js` | Intégration ElevenLabs. |
| Upload Excel + contexte chat | Constaté | `backend/routes/chatUpload.js`, `backend/middleware/fileUpload.js` | Routes `/api/chat/upload`, `/message`, `/context/:sessionId`. |
| Export Excel | Constaté | dépendance `exceljs`, `xlsx` ; tests `vitest.config.excel.js` | Pipeline cité dans la configuration de test ; usage applicatif à confirmer. |
| Dashboard métriques | Constaté | `dashboard/pages/index.tsx`, `dashboard/package.json` (Next.js 14.1.0, Pages Router) | Chart.js + Socket.io-client. |
| Interface chat statique | Constaté | `ui/prismVoiceChatV2.html`, `ui/prismUI.js`, `index.html`, `index-corporate.html` (servis par Express) | Distinct du dashboard Next.js. |
| Métriques Prometheus | Constaté | `monitoring/prismMetrics.js`, `telemetry/prismMetrics.js`, dépendance `prom-client` | Port 9100 référencé. |
| Module « ASI » | Constaté en code | `asi/` (14 fichiers JS), `asi/asiCore.js`, `asi/launchASI.js` | Implémentation observée : EventEmitter local + Winston logs. Non importé par `server.js`. À considérer comme module parallèle ; périmètre fonctionnel à confirmer. |
| Module « SalesOps » Python | Constaté | `src/prism_salesops/`, `pyproject.toml`, `tests/salesops/` | Package Python séparé (ETL Excel, QA text2sql, dashboard Streamlit). Couplage avec le cœur Node à confirmer. |
| Évolution / auto-optimisation | Constaté en code | `backend/launchSelfEvolutionCycle.js`, `backend/selfApplicationEngine.js`, `backend/selfOptimizer.js`, `evolution/` | Boucle nommée « cycle d'auto-évolution ». Mesure d'impact et activation runtime non documentées dans le périmètre audité. |
| Endpoint enterprise export | **Importé mais non monté dans `server.js`** | `server.js` (imports dynamiques l.49-55) ; aucun `app.use()` correspondant observé. | Écart à confirmer. Les tests `__tests__/backend/api/enterpriseExport.test.js` montent le router séparément. |
| Endpoint `/health` | Référencé par `staging/docker-compose.yml` healthcheck | Présent dans `launch-prism-full-stack.js`. **Absent de `server.js`** selon l'exploration. | Le compose staging suppose `launch-prism-full-stack.js`. À aligner. |

---

## 4. Architecture technique

### 4.1 Schéma textuel

```text
+--------------------------------------------------------------+
|                    Clients                                    |
|  (chat UI statique /ui, dashboard Next.js, appels API)        |
+----------------------+---------------------------------------+
                       |
                       v
+--------------------------------------------------------------+
|  server.js (Express 5, port 3000)                             |
|    - POST /api/chat -> TaskTypeProcessor                      |
|        |-> HybridOrchestrator (criticality routing)           |
|        |     |-> ConsensusManager (quorum 2/3, fail-closed)   |
|        |     |     |-> OpenAIAdapter                          |
|        |     |     |-> AnthropicAdapter                       |
|        |     |     |-> PerplexityAdapter                      |
|        |     |-> TrustContext (critical decisions, 403 path)  |
|        |     |-> TamperEvidentAuditLog (JSONL + Ed25519)      |
|        |-> backend/orchestrator.js (fallback simple)          |
|    - POST /api/chat/upload (chatUpload router)                |
|    - POST /api/export/pdf (PdfExportService)                  |
|    - POST /api/generate-image (ImageGenerator + Gemini/fal)   |
|    - GET/POST /api/...voice (ElevenLabs)                      |
|    - statiques /ui, /demo, /assets, /, /corporate             |
+--------------------------------------------------------------+
        |                |                  |
        v                v                  v
+----------------+ +-----------+    +----------------------+
|  SQLite        | |  JSONL    |    | KeyRegistry JSON     |
|  (data/prism.  | |  audit    |    | (data/key-registry)  |
|   db, table    | |  log      |    |                      |
|  prism_state)  | |  + Ed25519|    |                      |
+----------------+ +-----------+    +----------------------+

Dashboard Next.js (dashboard/) -- Pages Router 14.1.0
Module ASI (asi/) -- module parallèle, non importé par server.js
Module Python SalesOps (src/prism_salesops/) -- package séparé
Monitoring (monitoring/, observability/, telemetry/) -- exporters Prometheus
```

### 4.2 Frontend

- **Chat UI statique** (`ui/`) : HTML/CSS/JS servi par `express.static('ui')` ; pas de framework SPA observé sur cette couche.
- **Dashboard métriques** (`dashboard/`) : Next.js 14.1.0 en Pages Router (`dashboard/pages/index.tsx`), React 18, Tailwind, Chart.js, Socket.io-client. `dashboard/package.json` est indépendant du `package.json` racine.
- **Pages corporate / investor** : HTML statique à la racine (`index-corporate.html`, sous `demo/investor-dashboard/`).

### 4.3 Backend

- **Point d'entrée** : `server.js` (936 lignes). Express 5, `express.json()`, statiques multiples. Pas de Helmet, CORS, Morgan, ni JWT au niveau de ce fichier.
- **Routage simple** : `backend/orchestrator.js` (522 lignes) appelle directement OpenAI (SDK), Anthropic et Perplexity (via `fetch`).
- **Routage avancé** : `src/orchestrator/HybridOrchestrator.js` (549 lignes) sélectionne entre exécution simple et exécution consensus selon la criticité.

### 4.4 Couche de consensus et gouvernance

- `src/core/ConsensusManager.js` (638 lignes) : EventEmitter, quorum 2/3, timeout 1000 ms, gestion `abstain`/`unavailable`, escalade TrustContext sur timeout.
- `src/core/TrustContext.js` (1287 lignes) : approbations humaines signées, niveaux de criticité, timeout d'approbation 30 min, métriques internes.
- `src/core/KeyRegistry.js` (287 lignes) : statuts de clés Ed25519, rotation, révocation, persistance JSON.
- `src/security/contracts/{consensus,trustcontext,journal}.js` : schémas Zod (validation des contrats provider et approbation).

### 4.5 Auditabilité

- `src/audit/TamperEvidentAuditLog.js` (554 lignes) : fichiers JSONL `audit-{timestamp}.jsonl` dans `data/audit/`, chaînage SHA-256 (`prevHash` → `hash`), signature Ed25519 PEM (pkcs8/spki), `pubKeyId`, méthode `verify()` réimporte le journal et reconstruit la chaîne.
- `src/core/SecureJournalManager.js` : journal HMAC complémentaire (distinct du log Ed25519).
- Documentation associée : `docs/AUDIT_LOG_TAMPER_EVIDENT.md`.

### 4.6 Persistance

- **SQLite** via `better-sqlite3` (`backend/database.js`, 45 lignes) → fichier `data/prism.db`, table `prism_state (key, value)` créée inline (`CREATE TABLE IF NOT EXISTS`, **pas de migrations versionnées**).
- État applicatif : `persistence/prismStateStore.js`.
- Échantillons : `data/server-memory.sample.json`, `data/test-quick-coverage.json`.

### 4.7 Dépendances LLM et services externes

- OpenAI (`openai@^4.96.0`).
- Anthropic (`@anthropic-ai/sdk@^0.26.0`).
- Perplexity (via `fetch`, modèle référencé `llama-3.1-sonar-large-128k-online`).
- Google Gemini (`@google/genai@^1.0.0`) — utilisation observée dans `src/infographic/ImageGenerator.js`.
- fal.ai (`@fal-ai/client@^1.7.2`) — fallback image.
- ElevenLabs (via API directe ; pas de SDK officiel npm).
- Supabase (`@supabase/supabase-js@^2.49.4`).

### 4.8 Déploiement

- `Dockerfile` (racine) + `docker-compose.yml` (racine).
- `Dockerfile.stress` + scripts de stress test.
- `docker-compose-monitoring.yml` (référencé par `npm run start:monitoring`).
- `staging/docker-compose.yml` : conteneur `prism-staging`, port 3001→3000, `PRISM_MODE=staging`, healthcheck `GET /health` (cf. réserve §3).

### 4.9 Authentification / autorisations

- `jsonwebtoken` est en dépendance ; aucun middleware JWT n'est branché sur `server.js`.
- Le contrôle d'accès observé est applicatif (TrustContext sur décisions critiques) et non un contrôle d'accès HTTP standard. Statut multi-tenant : non documenté dans le périmètre audité.

---

## 5. Structure du dépôt

| Chemin | Rôle identifié | Importance |
| --- | --- | --- |
| `server.js` | Point d'entrée Express. | Critique |
| `backend/orchestrator.js` | Orchestrateur LLM simple (taskType → provider unique). | Critique |
| `backend/routes/` | Routers Express (`enterpriseExport.js`, `chatUpload.js`). | Élevée |
| `backend/services/` | Services métier (enterprise PDF, sanitizer, détection enterprise). | Élevée |
| `backend/middleware/` | `validation.js` (Joi), `security.js` (rate-limit, CSRF), `fileUpload.js`. | Élevée |
| `backend/analysis/` | `prismDataAnalysis.cjs` (analyse données, CommonJS). | Moyenne |
| `backend/schemas/` | `enterpriseExportSchema.json` (schéma JSON). | Moyenne |
| `backend/types/` | Types TypeScript `enterpriseExport.ts`. | Faible |
| `src/core/` | Composants critiques : `ConsensusManager`, `TrustContext`, `KeyRegistry`, `PriorityQueue`, `TaskTypeProcessor`, `SecureJournalManager`, adapters providers. | Critique |
| `src/audit/` | `TamperEvidentAuditLog.js`. | Critique |
| `src/orchestrator/` | `HybridOrchestrator.js`. | Critique |
| `src/consensus/` | Variante TS `ConsensusManager.ts`. | Élevée |
| `src/security/contracts/` | Schémas Zod (consensus, trustcontext, journal). | Élevée |
| `src/voice/` | Services voix (ResponseModeManager, ElevenLabsService). | Moyenne |
| `src/infographic/` | `ImageGenerator.js` (Gemini + fal.ai fallback). | Moyenne |
| `src/export/` | `PdfExportService.js`. | Moyenne |
| `src/prism_salesops/` | Package Python (ETL Excel, text2sql, dashboard Streamlit). | Moyenne — périmètre à confirmer |
| `asi/` | Module « ASI » (14 fichiers JS). Non importé par `server.js`. | Faible côté production audit |
| `dashboard/` | Application Next.js 14.1.0 (Pages Router). | Élevée |
| `ui/` | Interface chat statique. | Moyenne |
| `staging/` | E2E + docker-compose staging (port 3001). | Élevée |
| `monitoring/`, `observability/`, `telemetry/` | Exporters Prometheus + dashboards Grafana JSON. | Élevée |
| `scripts/` | 41 scripts : validation, contrôles dits « military », benchmarks brevet, deploy, etc. | Moyenne |
| `__tests__/` | Tests Vitest récents (`properties/`, `fuzz/`, `audit/`, `backend/`, etc.). | Critique |
| `__tests_legacy__/` | Tests historiques (Jest/Vitest mix). | Faible (legacy) |
| `legacy_tests/` | Tests historiques mixtes JS/Python. | Faible (legacy) |
| `tests/` | Tests Vitest et pytest (SalesOps). | Élevée |
| `simulation/` | Simulations comparatives baseline vs consensus. | Moyenne |
| `data/` | `prism.db` (SQLite), `audit/` (JSONL), `key-registry.json`, échantillons. | Critique |
| `docs/` | Documentation interne (67 fichiers) : `valuation/`, `reports/`, `validation/`, `use_cases/`, `persistence/`. | Élevée |
| `.github/workflows/` | 5 workflows : `ci.yml`, `quality.yml`, `property-tests.yml`, `security.yml`, `frozen-modules.yml`. | Élevée |
| `.husky/pre-commit` | Quality gate Git côté local. | Élevée |
| `LICENSE` | AGPL v3 complet. | Critique |
| Fichiers `ANALYSE_*.md`, `DOSSIER_*.md` (racine) | Documentation propriété intellectuelle (brevets, INPI). | Élevée pour valorisation |
| `.env.example`, `.npmrc` | Hygiène repo (créés en PRISM_03 / réappliqués en PRISM_03B). | Élevée |

---

## 6. Modules propriétaires identifiés

| Module | Rôle | Niveau de spécificité | Éléments valorisables | Réserve |
| --- | --- | --- | --- | --- |
| `src/core/ConsensusManager.js` | Consensus 2/3 entre adapters LLM, EventEmitter, timeouts, fail-closed. | Spécifique au projet (quorum, gestion des votes `abstain`/`unavailable`, escalade TrustContext). | 638 lignes, contrats Zod associés, tests `__tests__/properties/consensus.properties.test.ts`. | Quorum hard-codé 2/3 ; portabilité multi-fournisseurs n+1 non démontrée dans le périmètre. |
| `src/audit/TamperEvidentAuditLog.js` | Journal JSONL chaîné SHA-256 + signature Ed25519. | Spécifique au projet, implémentation propre (pas de dépendance externe au-delà de `crypto` Node). | 554 lignes, `verify()` complet, schémas Zod, tests dédiés. | Format propriétaire JSONL ; interopérabilité avec standards SIEM non documentée. |
| `src/core/TrustContext.js` | Approbations humaines signées, gouvernance par criticité. | Spécifique. | 1287 lignes, schémas Zod, `KeyRegistry` associé, documenté côté brevet (`SCHEMAS_TECHNIQUES_TRUSTCONTEXT_BREVET.md`). | Le module est la principale source de la complexité (33 % du code de `/src/core` en lignes). |
| `src/core/PriorityQueue.js` | File de priorité heap O(log n) pour KernelBus. | Optimisation algorithmique référencée dans le dossier INPI (`ANALYSE_BREVETABILITE_PRIORITY_QUEUE_INPI_2025.md`). | 305 lignes, benchmarks (`scripts/patent-performance-benchmark.js`). | Caractère brevetable non tranché par un cabinet PI dans le périmètre audité. |
| `src/orchestrator/HybridOrchestrator.js` | Aiguillage criticité → consensus ou exécution simple. | Spécifique. | 549 lignes, lié à TrustContext. | Couplage fort avec `ConsensusManager` et `TrustContext`. |
| `src/core/KeyRegistry.js` | Registre clés Ed25519 (statuts, rotation, révocation). | Implémentation propre. | 287 lignes, persistance JSON, doc `docs/TRUSTCONTEXT_KEY_MANAGEMENT.md`. | Stockage JSON local ; pas de HSM observé. |
| `src/security/contracts/` | Schémas Zod « fail-closed ». | Spécifique au projet. | Contrats consensus/trustcontext/journal, utilisés par fuzz tests. | — |
| `backend/services/enterprisePDFService.js` + `enterpriseSanitizer.js` | Pipeline PDF Enterprise (rendu + sanitization). | Métier spécifique. | 711 + 708 lignes. | Tests legacy uniquement dans `__tests_legacy__/`. |
| `simulation/` (baseline vs consensus) | Simulations comparatives. | Spécifique. | Output `simulation/out/` (ignoré par `.gitignore` PRISM_03B). | — |
| `scripts/` dits « military » | Contrôles `control_audit_log_military.mjs`, `control_proof_suite_military.mjs`, etc. | Spécifique. | Scripts d'auto-contrôle. | Le label « military » est purement nominal côté repo ; aucune certification militaire n'est démontrée. |
| `src/core/SecureJournalManager.js` | Journal HMAC complémentaire. | Spécifique. | — | Coexistence avec `TamperEvidentAuditLog.js` (Ed25519) à clarifier dans une documentation interne. |
| Module ASI (`asi/`) | EventEmitter d'agents locaux (mémoire, raisonnement, éthique, etc.). | Nominalement spécifique. | 14 fichiers JS, Winston logs. | Non importé par `server.js`. À considérer comme prototype tant que l'intégration runtime n'est pas démontrée. |

---

## 7. Dépendances et composants externes

| Dépendance | Usage observé | Criticité | Risque associé |
| --- | --- | --- | --- |
| `openai@^4.96.0` | Provider LLM principal, fallback (`backend/orchestrator.js`, adapters). | Critique | Verrouillage SDK + conflit de pair `zod` (résolu par `legacy-peer-deps=true`). |
| `@anthropic-ai/sdk@^0.26.0` | Provider Anthropic dans `src/core/providers/AnthropicAdapter.js`. | Critique | Version 0.26 — historique d'API breaking changes. |
| `@google/genai@^1.0.0` | Génération d'image dans `src/infographic/ImageGenerator.js`. | Élevée | Dépendance jeune (1.0.0). |
| `@fal-ai/client@^1.7.2` | Fallback génération image (Flux). | Moyenne | Fournisseur unique pour ce fallback. |
| `@supabase/supabase-js@^2.49.4` | Accès Supabase (référencé dans `backend/setupEnv.js`). | Moyenne | Couplage cloud à un seul fournisseur. |
| `express@^5.1.0` | Serveur HTTP. | Critique | Express 5 (récent, breaking changes vs 4). |
| `helmet@^8.1.0` | Présent en dépendance, **non utilisé dans `server.js`**. | Élevée | Dette de configuration sécurité HTTP. |
| `cors@^2.8.5` | Présent en dépendance, **non configuré dans `server.js`**. | Élevée | Politique cross-origin non explicite. |
| `express-rate-limit@^7.5.0` | Utilisé uniquement sur l'export enterprise (`backend/middleware/security.js`). | Moyenne | Rate-limit non global. |
| `express-slow-down@^2.1.0` | En dépendance. | Faible | Usage à confirmer. |
| `jsonwebtoken@^9.0.2` | En dépendance, **pas de middleware JWT branché sur `server.js`**. | Élevée | Authentification HTTP applicative absente. |
| `better-sqlite3@^11.10.0` | Persistance état (`backend/database.js`). | Critique | Fichier SQLite local ; scalabilité multi-instance non démontrée. |
| `winston@^3.11.0` | Logs ASI et modules `/src`. | Moyenne | Pas de centralisation de logs configurée. |
| `prom-client@^14.2.0` | Exporters Prometheus (`monitoring/`, `telemetry/`). | Moyenne | Branchement runtime à confirmer. |
| `pdfkit@^0.17.1` | Génération PDF. | Élevée | — |
| `socket.io@^4.8.1` | Dashboard temps réel. | Moyenne | — |
| `joi@^17.13.3` | Validation Express (enterprise export). | Moyenne | — |
| `zod@^4.1.13` | Contrats `src/security/contracts/`. | Élevée | Conflit de pair avec `openai@4.x` (peerOptional `zod@^3.23.8`) — masqué par `.npmrc`. |
| `husky@^9.1.7`, `lint-staged@^15.5.2` | Quality gates locales. | Moyenne | `typecheck` désactivé dans le hook. |
| `fast-check@^4.4.0` | Property-based testing. | Moyenne | Utilisé sur 5 fichiers cibles. |
| `nyc@^15.1.0`, `@vitest/coverage-v8` | Mesure de couverture. | Moyenne | Seuil 95 % référencé en script (`test:coverage:check`) ; non vérifié dans le hook par défaut. |
| `natural@^8.1.0`, `mathjs@^15.1.0`, `simple-statistics@^7.8.8` | NLP + stats. | Faible | Usage applicatif à confirmer. |
| `three@^0.176.0` | 3D côté UI. | Faible | Usage spécifique à confirmer. |
| `redis-mock@^0.56.3` | Tests. | Faible | — |

---

## 8. Données, sécurité et conformité

### 8.1 Gestion des secrets

- `.env.example` (78 lignes, 53 variables placeholder ; généré à partir de `grep -RnoE 'process.env.X' src/`). Source : `PRISM_03_SECRET_AND_ENV_REGISTER.md`.
- `.gitignore` durci à 147 lignes (refus `.env`, `.env.*`, `*.env`, whitelist `!.env.example`, `!.env.template`). Source : `PRISM_03B`.
- `.npmrc` : `legacy-peer-deps=true`, documenté.
- Historique : 6 secrets historiques ont été présents dans le repo entre `63fdb50` (2025-09-02) et la purge `PRISM_04` (2026-05-15). Les 5 clés exposées ont été rotées côté fournisseurs et l'historique a été réécrit (`git filter-repo`) avec force-push contrôlé. Tags GitHub alignés par `PRISM_04B`. Traçabilité complète sous `docs/valuation/PRISM_04_SECRET_PURGE_HISTORY_REPORT.md` et `docs/valuation/PRISM_04B_REMOTE_TAGS_SANITY_REPORT.md`.

### 8.2 Authentification et autorisations

- Aucun middleware d'authentification HTTP standard (JWT, OAuth, session) n'est branché sur `server.js`.
- Le contrôle d'accès observé est applicatif : `TrustContext.validateCriticalDecision()` retourne HTTP 403 si une décision critique n'est pas approuvée par un porteur de rôle adéquat.
- L'export enterprise (`backend/routes/enterpriseExport.js`) est protégé par CSRF token + Joi + rate-limit, mais **non monté dans `server.js`** dans la version observée.

### 8.3 Logs et auditabilité

- Logs applicatifs : Winston (modules ASI, `/src` divers), Morgan en dépendance mais non branché.
- Audit cryptographique : `TamperEvidentAuditLog` (Ed25519 + chaînage SHA-256), `SecureJournalManager` (HMAC) — voir §4.5.
- Pas de centralisation logs (ELK / Loki / CloudWatch) observée.

### 8.4 Données personnelles

- Pas de schéma d'entité personnelle directement observable dans `data/prism.db` (table `prism_state (key, value)` générique).
- Les conversations chat ne sont pas explicitement persistées dans la table observée. Source applicative à confirmer.
- Conformité RGPD / AI Act : **non documentée dans le périmètre audité**. À confirmer avec le porteur du projet ; toute affirmation de conformité serait prématurée.

### 8.5 Chiffrement

- Ed25519 pour signatures audit et approbations.
- HMAC dans `SecureJournalManager`.
- Pas de chiffrement at-rest documenté pour `data/prism.db` ni `data/audit/*.jsonl`.
- TLS : configuration au niveau Express **non observée** ; suppose un reverse-proxy en amont.

### 8.6 Hygiène repo (post-PRISM_03B)

- Aucun secret réel tracké à HEAD `3142176`.
- Aucun secret accessible via `refs/heads/main` (84 MB scannés, 0 hit) ni `refs/tags/*` (≈740 MB scannés, 0 hit) — source : `PRISM_04` §3, `PRISM_04B` §3.
- Aucun fichier `.env` réel tracké ; `keys/secret/` ignoré ; `keys/*.pub` toléré (clé publique de test `test-audit-manual/keys/test-key.pub`).

---

## 9. Tests, qualité et maintenabilité

### 9.1 Tests présents

- **~243 fichiers de tests** au total, dont :
  - `__tests__/` (29 fichiers, Vitest moderne), incluant `__tests__/properties/` (4 fichiers fast-check : `consensus`, `trustContext`, `journal`, `providers`) et `__tests__/fuzz/` (1 fichier `contracts.fuzz.test.ts`).
  - `__tests_legacy__/` (44 fichiers, Jest/Vitest mix, historiques).
  - `legacy_tests/` (46 fichiers, JS + Python).
  - `tests/` (55 fichiers, Vitest + pytest `tests/salesops/`).
  - `staging/e2e-workflow.test.js` (1 fichier E2E Vitest).
  - `simulation/tests/` (5 fichiers).
- **Configurations Vitest distinctes** : 11 fichiers `vitest.config*.{js,mjs,ts}` à la racine (`core-only`, `core`, `consensus`, `enterprise`, `voice`, `pdf`, `excel`, `orchestrator`, `infographic`, etc.).
- **Jest** : référencé par `package.json` (`test:phase1`, `test:security`, etc.). Le fichier `jest.config.simple.js` est référencé par `npm run test:security` mais **non trouvé** dans le périmètre exploré.

### 9.2 Résultats observés (PRISM_03B)

- `npm test -- --run` (vitest core-only) : **76/76 PASS**, 10 fichiers, 65,5 s.
- `npm ci` : PASS en 6,7 s (967 packages).
- `npm run typecheck` : **511 erreurs TypeScript** sur des fichiers `*.js` utilitaires (`validate-corporate-dashboard.js`, scripts `test-voice-*`, etc.). Le hook pre-commit neutralise intentionnellement ces erreurs (`.husky/pre-commit` ligne 12 : `npm run typecheck || echo "warnings"`).

### 9.3 Couverture

- Seuil de 95 % référencé dans `package.json` (`test:coverage:check`, `coverage:check` via `nyc`).
- **Couverture mesurée non publiée dans le périmètre audité.** Les fichiers `FINAL_COVERAGE_REPORT.md` à la racine et `docs/reports/TRL5_PROOF_REPORT.md` mentionnent des résultats mais la doctrine TRL post-`PRISM_02B` précise que ces métriques restent à valider sur un échantillon statistiquement significatif (les runs précédents ont `n=1`).

### 9.4 Qualité structurelle

- Séparation des responsabilités partiellement assurée :
  - `/src` regroupe les modules « cœur » critiques.
  - `/backend` regroupe les services historiques + enterprise.
  - Les deux couches d'orchestration (`backend/orchestrator.js` et `src/orchestrator/HybridOrchestrator.js`) coexistent et sont chaînées via `server.js`.
- Mélange d'ESM (default), CommonJS (`.cjs` dans `backend/analysis/`, `backend/middleware/security.js`) et TypeScript (`src/consensus/`, `dashboard/`, `src/security/`).
- ESLint configuré (`eslint.config.js`, `.eslintrc.json`). Prettier configuré (`.prettierrc`, `.prettierignore`).

### 9.5 Dette technique visible

- 511 erreurs TypeScript neutralisées par le hook.
- Documentation `.md` extrêmement abondante à la racine (>50 fichiers `.md` dont des AUDIT_*, ANALYSE_*, GUIDE_*, RAPPORT_*) qui mélange documentation interne, communication investisseur, brevets et changelogs. La structuration sous `docs/` est partielle.
- Présence de trois arbres de tests historiques distincts (`__tests_legacy__/`, `legacy_tests/`, `tests/`) qui devraient être consolidés.
- Endpoint enterprise export importé mais non monté dans `server.js`.
- Module ASI non importé par `server.js` malgré 14 fichiers JS.

### 9.6 Scripts CI/CD

- 5 workflows GitHub Actions :
  - `ci.yml` (matrix unit / consensus / enterprise / security / adapters / voice).
  - `quality.yml` (format:check, lint, typecheck non-bloquant, test, test:properties).
  - `property-tests.yml` (proof suite sur changements sur consensus/audit/contracts).
  - `security.yml`.
  - `frozen-modules.yml`.
- Pre-commit local (`.husky/pre-commit`) : lint-staged, typecheck non-bloquant, **`npm test` bloquant**.

### 9.7 Documentation existante

- `/docs/` : 67 fichiers structurés en sous-dossiers (`valuation/`, `reports/`, `validation/`, `use_cases/`, `persistence/`).
- Documentation valorisation : `docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md`, `PRISM_02B_TRL_DOCUMENTATION_FIX_REPORT.md`, `PRISM_03_*.md`, `PRISM_04_*.md`, `PRISM_04B_*.md`, `PRISM_03_SECRET_AND_ENV_REGISTER.md`.
- Documentation TRL : `docs/PRISM_TRL_ASSESSMENT.md`, `docs/reports/TRL5_PROOF_REPORT.md`.
- Documentation propriété intellectuelle (racine) : `ANALYSE_BREVETABILITE_PRIORITY_QUEUE_INPI_2025.md`, `DOSSIER_PREPARATION_EXAMINATEURS_BREVETS_PRISM.md`, `SCHEMAS_TECHNIQUES_TRUSTCONTEXT_BREVET.md`, `RAPPORT_OPTIMISATION_BREVET_PRIORITY_QUEUE_2025.md`.

---

## 10. Niveau de maturité estimé

| Axe | Niveau observé | Commentaire |
| --- | --- | --- |
| Fonctionnel | Avancé partiel | Le flux principal `/api/chat` → orchestrateur → consensus → audit est implémenté. Plusieurs sous-fonctions secondaires (export Excel, ASI, modules `selfOptimizer`) sont présentes en code mais leur intégration runtime ou leur impact n'est pas démontré dans le périmètre audité. |
| Technique | Intermédiaire à avancé | Modules critiques (`ConsensusManager`, `TamperEvidentAuditLog`, `TrustContext`, `KeyRegistry`, `PriorityQueue`) sont structurés avec contrats Zod et property-based tests. Coexistence de plusieurs styles de modules (ESM, CJS, TS). |
| Sécurité | Intermédiaire | Audit cryptographique solide (Ed25519, hash-chain) ; gestion des secrets durcie après `PRISM_03B` ; mais Helmet/CORS/JWT non branchés sur `server.js`, et 511 erreurs typecheck neutralisées par le hook. Couche HTTP donc à durcir. |
| Maintenabilité | Intermédiaire | Linting/format configurés ; pre-commit hook actif ; mais trois arbres de tests historiques, documentation racine pléthorique non structurée, et dette de duplication (`backend/orchestrator.js` vs `src/orchestrator/HybridOrchestrator.js`). |
| Scalabilité | Faible documenté | SQLite local non sharded, KeyRegistry JSON local, pas de file de messages externe, audit log JSONL local. Pas de schéma multi-tenant observé. Aucune charge réelle reproductible documentée. |
| Documentation | Volumineuse mais hétérogène | Plus de 200 fichiers Markdown ; structuration partielle ; nombreux doublons entre racine et `docs/`. Documentation valorisation/audit récente (`PRISM_02` à `PRISM_04B`) bien structurée. |
| Industrialisation | Partielle | `npm ci` reproductible, CI GitHub Actions présent, Docker images présentes, pre-commit hook actif. Mais : staging healthcheck mal aligné (`/health` absent de `server.js`), tests fonctionnels E2E `staging:e2e` actuellement non rejouables sans `OPENAI_API_KEY` (cf. F12 dans `PRISM_02A`), typecheck désactivé. |

---

## 11. Éléments utiles pour valorisation

| Catégorie | Élément observable | Référence |
| --- | --- | --- |
| Volume de code utile | ~123 700 lignes JS, ~32 200 lignes TS, ~7 700 lignes Python, ~53 300 lignes Markdown. Total tracké : 945 fichiers. | Mesuré directement sur le repo. |
| Complexité fonctionnelle | Trois orchestrateurs distincts (HybridOrchestrator, ConsensusManager, backend/orchestrator), un module d'audit cryptographique de 554 lignes, un TrustContext de 1287 lignes. | `src/orchestrator/`, `src/core/`, `src/audit/`. |
| Différenciation | Combinaison « consensus multi-modèles + audit Ed25519 chaîné + approbations humaines signées + criticité ». Cette combinaison spécifique n'est pas un pattern public courant. | À confirmer par un cabinet PI. |
| Réutilisabilité | Les modules `TamperEvidentAuditLog`, `KeyRegistry`, `PriorityQueue` peuvent être extraits sans dépendre du reste de l'application. | Tests dédiés présents. |
| Profondeur métier | Pipeline enterprise PDF (`backend/services/enterprisePDFService.js`, 711 lignes) + sanitization (`enterpriseSanitizer.js`, 708 lignes) ; module SalesOps Python avec ETL Excel + QA text2sql + dashboard Streamlit. | Niveau d'intégration au cœur Node à confirmer. |
| Propriété intellectuelle potentielle | Référencement INPI sur PriorityQueue (`ANALYSE_BREVETABILITE_PRIORITY_QUEUE_INPI_2025.md`) et schémas TrustContext (`SCHEMAS_TECHNIQUES_TRUSTCONTEXT_BREVET.md`). Brevet FR2507056 mentionné dans `docs/valuation/`. | Statut juridique à confirmer (dépôt, examen, délivrance, périmètre des revendications). |
| Niveau d'intégration | Couplage cœur Node + dashboard Next.js + monitoring Prometheus + audit log fichier. | Module ASI et package Python SalesOps non couplés à `server.js` (à confirmer). |
| Actifs documentaires | 209 fichiers `.md`, dont une suite valorisation `PRISM_02A → PRISM_04B` cohérente et auditée. | `docs/valuation/`, racine. |
| Tests | 76/76 PASS sur le périmètre cœur, 5 fichiers property-based fast-check sur les invariants critiques. | `__tests__/properties/`, `__tests__/fuzz/`. |
| Preuves d'usage | `simulation/` (baseline vs consensus) ; `staging/metrics/*.json` (résultats E2E horodatés). | Données présentes mais avec `n=1` selon `PRISM_02A` ; échantillonnage statistique à reproduire. |
| Licence | AGPL v3 complet (`LICENSE`, 33 KB). | Implique une stratégie de double licence si valorisation B2B propriétaire envisagée. |

---

## 12. Limites et points à confirmer

| Point | Pourquoi c'est à confirmer | Impact potentiel |
| --- | --- | --- |
| Endpoint `enterpriseExportRouter` importé dans `server.js` mais sans `app.use()` correspondant | Constaté par exploration ; les tests legacy le montent à part. | Si non monté en production, fonctionnalité indisponible côté API publique. |
| Healthcheck `staging/docker-compose.yml` appelle `GET /health`, absent de `server.js` | Le compose suppose `launch-prism-full-stack.js`. | Compose staging potentiellement non lancé via `server.js`. |
| Module ASI (`asi/`, 14 fichiers JS) non importé par `server.js` | Module parallèle observé. | Si ASI est annoncé comme fonctionnel en runtime, il faut clarifier le point d'activation. |
| Package Python `prism_salesops` | Couplage avec le cœur Node non observé dans le périmètre. | Statut produit dérivé / module séparé à clarifier. |
| 511 erreurs TypeScript neutralisées par le pre-commit hook | Volonté délibérée selon `.husky/pre-commit` ligne 12. | Dette qualité importante ; conformité aux engagements de typecheck à expliciter. |
| `staging:e2e` non rejouable sans `OPENAI_API_KEY` (F12 PRISM_02A) | `backend/orchestrator.js` instancie `new OpenAI()` au top-level. | Re-jouabilité indépendante de la preuve TRL 5 partielle compromise. |
| Couverture de tests revendiquée vs mesurée | `package.json` cible 95 % ; `vitest run --coverage` non publié sur le périmètre par défaut. | Affirmations de couverture à reproduire sur un job CI dédié. |
| Statut juridique du brevet FR2507056 | Référencé dans `docs/valuation/` ; aucune copie du certificat n'a été observée dans `LICENSE` ou `docs/`. | Centrale pour valorisation. |
| Identité auteur, cession de droits, statut salarial éventuel | Non documentés dans le périmètre audité. | Centrale pour valorisation commissaire aux apports. |
| Politique de logs et durée de rétention | Pas de configuration observable côté Winston / audit JSONL. | Conformité RGPD à formaliser. |
| Stratégie multi-tenant | Aucun schéma multi-tenant observé. | Si vente B2B envisagée, à formaliser. |
| Repo satellite `prism-lite-DICA-ui-ux-design` | Fuite OpenAI + ElevenLabs documentée dans `PRISM_01`, non traitée dans le périmètre. | Risque sécurité résiduel hors repo canonique. |
| Configurations Helmet, CORS, JWT non branchées sur `server.js` | Dépendances présentes, intégration absente. | Dette de sécurité HTTP. |
| 29 vulnérabilités `npm audit` (dont 18 high) selon `PRISM_03` | Mesurées avant `PRISM_03B` ; à reproduire à HEAD courant. | Mise à jour des dépendances à planifier. |
| Doublon `env.example` (racine) vs `.env.example` (PRISM_03B) | Deux templates env coexistent. | Consolidation à planifier. |

---

## 13. Conclusion technique

PRISM est un projet d'orchestration LLM avec une **couche cœur structurée** (consensus 2/3, audit cryptographique chaîné, gouvernance par approbations humaines) qui constitue son principal apport technique observable, et une **couche d'intégration applicative encore partielle** (serveur d'entrée, dashboard, modules satellites Python et ASI).

La valeur technique propre, défendable face à un audit contradictoire, se concentre sur :

- la combinaison spécifique consensus + audit Ed25519 + TrustContext (modules cumulant environ 3 000 lignes ciblées sous `src/core/` et `src/audit/`, accompagnés de schémas Zod et de property-based tests),
- la `PriorityQueue` référencée dans le dossier INPI,
- la documentation valorisation/audit récente (`PRISM_02A → PRISM_04B`) cohérente et auditée pas-à-pas,
- l'hygiène repo aboutie (purge historique réalisée, tags alignés, 0 secret tracké, `npm ci` reproductible, 76/76 tests cœur PASS).

Les **réserves** principales sont :

- l'écart entre les composants présents dans `/src` et leur intégration au point d'entrée `server.js` (enterprise export non monté, `/health` absent, ASI non importé),
- la **dette typecheck** (511 erreurs neutralisées par le hook),
- la **scalabilité non démontrée** (SQLite local, KeyRegistry JSON local, audit JSONL local, pas de schéma multi-tenant),
- la **conformité** RGPD/AI Act non documentée et la couche **sécurité HTTP** non durcie (Helmet/CORS/JWT non branchés),
- le **statut juridique** des éléments de propriété intellectuelle et de la cession de droits à formaliser.

En l'état du périmètre audité, le projet présente une **base technique propriétaire identifiable**, mais demande, avant valorisation par un cabinet, la confirmation par le porteur du projet des points listés en §12, en particulier les points juridiques et le périmètre réel d'intégration des modules secondaires.
