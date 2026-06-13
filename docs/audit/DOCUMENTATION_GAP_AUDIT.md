# Audit des écarts documentaires — PRISM

**Date** : 2026-06-13  
**Périmètre** : branche `main`, HEAD `561bbf8`, dépôt `Makk7709/P.R.I.S.M`  
**Objectif** : cartographier la documentation existante vs les besoins produit (utilisateurs, architecture, développeurs) avant rédaction.

---

## 1. Synthèse

| Indicateur | Constat |
| --- | --- |
| Fichiers Markdown sous `docs/` | ~99 fichiers (valorisation, audit, validation, technique dispersée) |
| Documentation utilisateur structurée | **Absente** (`docs/user/` inexistant) |
| Documentation architecture structurée | **Partielle** (`docs/ARCHITECTURE.md` orienté « Jarvis Core », non aligné sur `server.js`) |
| Documentation développeur structurée | **Partielle** (`docs/contributing.md`, `docs/QUALITY.md` existants mais obsolètes sur certains points) |
| Index central `docs/README.md` | **Absent** |
| Référence API HTTP consolidée | **Absente** (routes dispersées dans `server.js`, tests legacy) |

**Verdict** : le dépôt dispose d'une documentation riche pour la valorisation et l'audit cabinet (`docs/audit/`, `docs/valuation/`), mais manque d'une couche produit exploitable par utilisateurs finaux, ops et développeurs. La mission a produit la structure cible documentée en §5.

---

## 2. Inventaire de l'existant réutilisable

### 2.1 Documents à conserver et référencer (ne pas dupliquer)

| Document | Rôle | Réutilisation |
| --- | --- | --- |
| `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md` | Référence technique cabinet (405+ lignes) | Source d'autorité pour statuts modules, TRL, limites |
| `docs/audit/PROJECT_AUDIT_NOTES.md` | Méthode et compléments d'audit | Traçabilité |
| `docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md` | Doctrine TRL (Option B) | Cité dans README et docs utilisateur |
| `docs/QUALITY.md` | Quality gates, stratégie de tests | Base pour `docs/developer/` |
| `docs/moralLayer.md` | MoralLayer détaillé | Référencé depuis `docs/architecture/SECURITY.md` |
| `docs/AUDIT_LOG_TAMPER_EVIDENT.md` | Journal cryptographique | Référencé depuis architecture |
| `docs/TRUSTCONTEXT_KEY_MANAGEMENT.md` | Gestion clés Ed25519 | Référencé depuis sécurité |
| `docs/EXCEL_ANALYSIS_MODULE.md` | Upload Excel / chat | Complément user guide |
| `docs/OBS_Dashboards.md` | Observabilité Grafana | Complément DATA_AND_INTEGRATIONS |
| `README.md` (racine) | Vue investisseur / TRL | Conserver ; pointer vers `docs/README.md` |

### 2.2 Documents existants obsolètes ou hors périmètre produit

| Document | Problème constaté | Action retenue |
| --- | --- | --- |
| `docs/installation.md` | Décrit une app navigateur-only (micro, Three.js) ; ne mentionne pas `server.js`, `.env`, providers | **Non réutilisé** ; remplacé par `docs/user/GETTING_STARTED.md` |
| `docs/usage.md` | Interface particules 3D, commandes vocales « P.R.I.S.M. » ; ne reflète pas l'UI corporate actuelle | **Non réutilisé** ; remplacé par `docs/user/USER_GUIDE.md` |
| `docs/contributing.md` | Référence Three.js, `npm run test:coverage` inexistant | Enrichi dans `docs/developer/CONTRIBUTING.md` |
| `docs/ARCHITECTURE.md` | Vision « Jarvis Core » avec SLAs non démontrés (latence < 200 ms, MTTR < 5 min) | **Non repris tel quel** ; remplacé par `docs/architecture/OVERVIEW.md` factuel |
| `docs/prismCore.md`, `docs/kernel-architecture.md` | Modules kernel historiques | Référencés comme legacy dans CORE_MODULES |

---

## 3. Écarts identifiés (gaps)

### 3.1 Utilisateurs / produit

| Besoin | État avant mission | Priorité |
| --- | --- | --- |
| Guide installation + `.env` + démarrage | README partiel ; `env.example` vs `.env.example` | Haute |
| Guide fonctionnalités (chat, voix, export, personas) | Absent (sauf README marketing) | Haute |
| FAQ (clés API, erreurs, limites TRL) | Dispersée dans `docs/valuation/` | Haute |

### 3.2 Architecture / technique

| Besoin | État avant mission | Priorité |
| --- | --- | --- |
| Vue d'ensemble flux requête → réponse | `PROJECT_DOCUMENTATION_STANDARD.md` §4 (audit) | Haute |
| Statut prod vs dormant par module | Audit §3 et §6 ; pas de doc produit | Haute |
| Données, providers, observabilité | Dispersé | Haute |
| Sécurité consolidée | `docs/moralLayer.md`, `THREAT_MODEL_MINI.md` séparés | Moyenne |

### 3.3 Développeurs

| Besoin | État avant mission | Priorité |
| --- | --- | --- |
| Setup dev, scripts npm, tests Vitest | `docs/QUALITY.md` partiel | Haute |
| Contributing + quality gates | `docs/contributing.md` obsolète | Moyenne |
| Référence API HTTP depuis `server.js` | Absente | Haute |

---

## 4. Modules : statut prod vs dormant (constat code)

| Module / zone | Statut runtime | Preuve |
| --- | --- | --- |
| `server.js` + `/api/chat` | **Actif** | Point d'entrée `npm start` |
| `HybridOrchestrator` | **Actif** | Instancié dans `server.js` |
| `TaskTypeProcessor` | **Actif** | Chaîné sur `/api/chat` |
| `ConsensusManager`, `TrustContext`, `TamperEvidentAuditLog` | **Actif** (chemin critique) | Via HybridOrchestrator / TaskTypeProcessor |
| `MoralLayer`, `InterDomainOrchestrator` | **Actif** (pipeline TaskTypeProcessor) | `src/core/TaskTypeProcessor.js` |
| `chatUpload` (Excel) | **Actif** | Monté sur `/api/chat` |
| `PdfExportService` (`/api/export/pdf`) | **Actif** | Routes dans `server.js` |
| `ImageGenerator` | **Actif** | `/api/generate-image` |
| `ElevenLabs` / voix | **Actif** (si clé configurée) | `/api/chat`, `/api/voices`, etc. |
| `enterpriseExportRouter` | **Dormant** (importé, non monté) | `server.js` l.54-60, pas de `app.use()` |
| `asi/` (14 fichiers) | **Dormant** | Non importé par `server.js` |
| `src/prism_salesops/` (Python) | **Parallèle** | Package séparé, non couplé à `server.js` |
| `evolution/`, `selfOptimizer` | **Dormant / expérimental** | Présent dans TaskTypeProcessor, impact runtime limité |
| `launch-prism-full-stack.js` | **Alternatif** | Expose `/health` ; non utilisé par `npm start` |
| Dashboard Next.js (`dashboard/`) | **Séparé** | `npm` indépendant, non démarré par `npm start` |
| Supabase | **Optionnel** | `backend/setup_database.js`, `manualMemoryInjector.js` |

---

## 5. Plan de documents créés

| Fichier | Public | Statut mission |
| --- | --- | --- |
| `docs/README.md` | Tous | Créé |
| `docs/user/GETTING_STARTED.md` | Utilisateurs, ops | Créé |
| `docs/user/USER_GUIDE.md` | Utilisateurs corporate | Créé |
| `docs/user/FAQ.md` | Tous | Créé |
| `docs/architecture/OVERVIEW.md` | Dev, architectes | Créé |
| `docs/architecture/CORE_MODULES.md` | Dev, audit | Créé |
| `docs/architecture/DATA_AND_INTEGRATIONS.md` | Dev, ops | Créé |
| `docs/architecture/SECURITY.md` | Dev, sécurité | Créé |
| `docs/developer/DEVELOPMENT.md` | Développeurs | Créé |
| `docs/developer/CONTRIBUTING.md` | Contributeurs | Créé |
| `docs/developer/API_REFERENCE.md` | Intégrateurs | Créé |
| `docs/audit/DOCUMENTATION_GAP_AUDIT.md` | Cabinet / audit | Ce document |

---

## 6. Conventions retenues

| Convention | Décision |
| --- | --- |
| Langue | **Français** pour la nouvelle doc produit ; termes techniques EN conservés (Express, Vitest, TRL) |
| Ton | Professionnel cabinet / enterprise ; pas de sur-promesse |
| TRL | Reprise stricte : TRL 4 avancé, démo partielle TRL 5 — cf. `docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md` |
| Tests cœur | **219/219** PASS (`npm test`, `vitest.config.core-only.js`, exécuté 2026-06-13) |
| Fichier env canonique | **`.env.example`** (PRISM_03B) ; `env.example` racine = doublon legacy |
| Port application | `3000` (défaut `process.env.PORT`) |
| UI corporate | `http://localhost:3000/ui/prismVoiceChatV2-Corporate.html` |
| Fichiers valuation protégés | `docs/valuation/PRISM_0*.md` — **non modifiés** ; référencés depuis l'index |

---

## 7. Incohérences README / réalité (recommandations)

| # | Incohérence | Réalité observée | Recommandation |
| --- | --- | --- | --- |
| 1 | `cp env.example .env` | `.env.example` est le template canonique (53 variables) | Mettre à jour README : `cp .env.example .env` |
| 2 | Core tests « 76/76 » | 219/219 sous HEAD courant | Mettre à jour README §TRL Status |
| 3 | Grafana port `3001` | `docker-compose-monitoring.yml` mappe `3002:3000` | Aligner README ou compose |
| 4 | Prometheus port `9090` | Compose mappe `9091:9090` ; exporter interne `9100` | Documenter les trois ports distincts |
| 5 | `npm ci` « bloqué » | README mentionne conflit zod ; `.npmrc` a `legacy-peer-deps=true` | Vérifier si `npm ci` passe ; sinon conserver mention |
| 6 | Enterprise export annoncé implicitement | Router importé mais **non monté** | Documenter statut dormant ; monter si produit requis |
| 7 | `/health` pour staging | Absent de `server.js` ; présent dans `launch-prism-full-stack.js` | Aligner healthcheck staging ou documenter launcher |
| 8 | `docs/ARCHITECTURE.md` | Claims performance non sourcés | Conserver comme vision ; pointer vers `docs/architecture/` |

---

## 8. Vérifications chemins (existence fichiers cités)

Fichiers critiques vérifiés présents :

- `server.js`, `config.js`, `.env.example`, `env.example`
- `ui/prismVoiceChatV2-Corporate.html`, `ui/prismVoiceChatV2.html`
- `src/core/ConsensusManager.js`, `src/core/TrustContext.js`, `src/orchestrator/HybridOrchestrator.js`
- `infrastructure/moralLayer.js`, `src/core/InterDomainOrchestrator.js`
- `backend/routes/chatUpload.js`, `backend/routes/enterpriseExport.js`
- `vitest.config.core-only.js`, `.husky/pre-commit`
- `docker-compose-monitoring.yml`, `monitoring/prismMetrics.js`

---

## 9. Message de commit suggéré (non exécuté)

```
docs: structurer documentation produit (user, architecture, developer)

Ajoute l'index docs/, les guides utilisateur, l'architecture factuelle
et la référence API. Inclut l'audit des écarts documentaires.
```
