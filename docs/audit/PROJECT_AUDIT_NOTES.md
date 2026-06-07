# PRISM — Audit Notes (méthode et compléments)

Document compagnon de `PROJECT_DOCUMENTATION_STANDARD.md`. Conserve la traçabilité de la méthode et liste les éléments hors champ ou à confirmer.

---

## 1. Méthode d'exploration

| Étape | Action | Résultat |
|---|---|---|
| 1.1 | Lecture `git ls-files` complet (945 fichiers trackés) | Inventaire de référence figé à HEAD `3142176` post-`PRISM_03B`. |
| 1.2 | Comptage par extension | 480 `.js`, 75 `.ts`, 1 `.tsx`, 13 `.mjs`, 4 `.cjs`, 53 `.py`, 37 `.json`, 209 `.md`, 15 `.yml`. |
| 1.3 | Comptage de lignes par techno | ~123 700 lignes JS, ~32 200 lignes TS, ~7 700 lignes Python, ~53 300 lignes Markdown, ~24 600 lignes JSON. |
| 1.4 | Lecture des points d'entrée | `server.js` (936 lignes), `backend/orchestrator.js` (522), `src/core/ConsensusManager.js` (638), `src/audit/TamperEvidentAuditLog.js` (554), `src/core/TrustContext.js` (1287), `src/orchestrator/HybridOrchestrator.js` (549). |
| 1.5 | Lecture de `package.json` | Frameworks et scripts npm cartographiés. |
| 1.6 | Lecture des workflows GitHub Actions | 5 fichiers `.github/workflows/*.yml`. |
| 1.7 | Lecture du `.husky/pre-commit` | Quality gates locales identifiées (typecheck non-bloquant, test bloquant). |
| 1.8 | Lecture transverse de `docs/valuation/` | Suite PRISM_02A → PRISM_04B comme source documentaire de référence (doctrine TRL, secrets, hygiène). |

Aucune exécution destructive n'a été réalisée pour produire ce document. Les seules exécutions ont été des lectures (`git ls-files`, `grep`, `wc`, `ls`, `cat`).

---

## 2. Choix de présentation

| Choix | Justification |
|---|---|
| Document en français | Cohérence avec la suite documentaire interne (`docs/valuation/PRISM_*.md`) et avec un usage cabinet francophone (commissaire aux apports, INPI). |
| Ton cabinet | Imposé par la mission ; pas de superlatif, pas de promesse, chaque affirmation rattachée à un fichier. |
| Pas de claim de conformité RGPD ou AI Act | Aucune preuve directe observable dans le périmètre ; mention systématique « à confirmer ». |
| Pas de claim TRL spécifique | Reprise stricte de la doctrine `PRISM_02B` (« TRL 4 avancé avec démonstration partielle TRL 5 en staging contrôlé interne »). |
| Pas de référence aux fichiers de communication investisseur racine | `Brochure_Lancement_MVP.md`, `INVESTOR_*.md`, `DASHBOARD_INVESTOR_*.md` ont été observés mais non utilisés comme sources factuelles pour la section technique, par souci de neutralité. |

---

## 3. Sources utilisées

### 3.1 Sources internes citées dans le document principal

- `package.json`, `package-lock.json`
- `server.js`, `backend/orchestrator.js`
- `src/core/ConsensusManager.js`, `src/core/TrustContext.js`, `src/core/KeyRegistry.js`, `src/core/PriorityQueue.js`, `src/core/SecureJournalManager.js`
- `src/audit/TamperEvidentAuditLog.js`
- `src/orchestrator/HybridOrchestrator.js`, `src/consensus/ConsensusManager.ts`
- `src/security/contracts/{consensus,trustcontext,journal}.js`
- `src/voice/`, `src/infographic/`, `src/export/`, `src/prism_salesops/`
- `backend/services/enterprisePDFService.js`, `backend/services/enterpriseSanitizer.js`, `backend/routes/enterpriseExport.js`, `backend/routes/chatUpload.js`, `backend/middleware/{validation,security,fileUpload}.js`
- `dashboard/package.json`, `dashboard/pages/index.tsx`
- `asi/asiCore.js`, `asi/launchASI.js`
- `monitoring/prismMetrics.js`, `telemetry/prismMetrics.js`, `observability/`
- `__tests__/`, `__tests_legacy__/`, `legacy_tests/`, `tests/`, `staging/`, `simulation/tests/`
- `.github/workflows/{ci,quality,property-tests,security,frozen-modules}.yml`
- `.husky/pre-commit`
- `.npmrc`, `.env.example`, `.gitignore`
- `LICENSE`

### 3.2 Sources documentaires citées
- `docs/PRISM_TRL_ASSESSMENT.md`
- `docs/reports/TRL5_PROOF_REPORT.md`
- `docs/TRUSTCONTEXT_KEY_MANAGEMENT.md`
- `docs/AUDIT_LOG_TAMPER_EVIDENT.md`
- `docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md`
- `docs/valuation/PRISM_02B_TRL_DOCUMENTATION_FIX_REPORT.md`
- `docs/valuation/PRISM_03_REPO_HYGIENE_CLEANUP_REPORT.md`
- `docs/valuation/PRISM_03_SECRET_AND_ENV_REGISTER.md`
- `docs/valuation/PRISM_04_SECRET_PURGE_HISTORY_REPORT.md`
- `docs/valuation/PRISM_04B_REMOTE_TAGS_SANITY_REPORT.md`

### 3.3 Sources brevet / propriété intellectuelle citées (mention uniquement)
- `ANALYSE_BREVETABILITE_PRIORITY_QUEUE_INPI_2025.md`
- `ANALYSE_CRITIQUE_BREVETS_PRISM_02_SEPTEMBRE_2025.md`
- `DOSSIER_PREPARATION_EXAMINATEURS_BREVETS_PRISM.md`
- `RAPPORT_OPTIMISATION_BREVET_PRIORITY_QUEUE_2025.md`
- `SCHEMAS_TECHNIQUES_TRUSTCONTEXT_BREVET.md`

Le statut juridique de chaque référence INPI (dépôt, examen, délivrance, périmètre des revendications, payeur, cession) **n'est pas vérifié** dans le périmètre audité. Cette validation requiert l'avis d'un conseil en propriété industrielle.

---

## 4. Informations non documentées dans le périmètre audité

- Architecture multi-tenant.
- Politique de rétention des logs et des données conversationnelles.
- Conformité RGPD effective (registre des traitements, DPIA, droits utilisateurs).
- Conformité AI Act (classification des systèmes IA, obligations de transparence).
- Stratégie de double licence (AGPL vs licence propriétaire pour valorisation B2B).
- Cession de droits patrimoniaux entre l'auteur et une éventuelle structure porteuse.
- Cycle de vie des clés Ed25519 en production (génération, rotation, révocation, archivage).
- Procédure de réponse incident sécurité formalisée.
- Métriques de production effectives (latence p50/p95/p99 à charge réelle, SLI/SLO).
- Profil utilisateur cible documenté (persona, workflows métier précis).
- Plan d'industrialisation (build, déploiement, supervision en production).

---

## 5. Écarts observés entre déclaratif et constatable

| Élément déclaré (source) | Constat exploration | Statut |
|---|---|---|
| `package.json` "Advanced AI Orchestration System" | Conforme au périmètre `src/core/` + `src/orchestrator/`. | OK |
| `staging/docker-compose.yml` `healthcheck: GET /health` | Endpoint absent de `server.js`. | À aligner |
| Importation de `enterpriseExportRouter` dans `server.js` | Pas de `app.use()` correspondant. | À aligner |
| README et docs de communication mentionnant un module ASI fonctionnel | `asi/` présent mais non importé par `server.js`. | À clarifier |
| `package.json` script `test:security` → `jest --config=jest.config.simple.js` | Fichier `jest.config.simple.js` non trouvé dans le périmètre. | À corriger |
| Doctrine TRL 5 historique (`docs/reports/TRL5_PROOF_REPORT.md` avant `PRISM_02B`) | Requalifiée par `PRISM_02B` en « démonstration partielle interne ». | Aligné post-`PRISM_02B` |
| `FINAL_COVERAGE_REPORT.md` à la racine (couverture annoncée) | Non reproduit dans le périmètre par `npm run coverage` |. À reproduire. |

---

## 6. Risques techniques identifiés

| # | Risque | Sévérité | Origine du constat |
|---|---|---|---|
| RT1 | Couche HTTP de `server.js` non durcie (Helmet, CORS, JWT) | Élevée | Lecture `server.js`. |
| RT2 | 511 erreurs TypeScript neutralisées par le hook pre-commit | Élevée | `.husky/pre-commit` ligne 12 + `npm run typecheck`. |
| RT3 | SQLite + JSONL + JSON local — pas de scalabilité multi-instance observée | Élevée | `backend/database.js`, `data/audit/`, `data/key-registry.json`. |
| RT4 | Endpoint enterprise export non monté dans `server.js` | Moyenne | `server.js` (imports sans `app.use`). |
| RT5 | Healthcheck staging cible un endpoint absent de `server.js` | Moyenne | `staging/docker-compose.yml`. |
| RT6 | Coexistence de deux orchestrateurs (simple + hybrid) | Moyenne | `backend/orchestrator.js` + `src/orchestrator/HybridOrchestrator.js`. |
| RT7 | Trois arbres de tests historiques (`__tests_legacy__/`, `legacy_tests/`, `tests/`) | Moyenne | Inventaire. |
| RT8 | Module ASI non importé par `server.js` | Moyenne | Constat exploration. |
| RT9 | `.npmrc` `legacy-peer-deps=true` masque les conflits peer futurs | Faible | `.npmrc` + `PRISM_03B` §5. |
| RT10 | 29 vulnérabilités `npm audit` (dont 18 high) mesurées en `PRISM_03` | Faible à moyenne | À reproduire à HEAD `3142176`. |
| RT11 | Pas de chiffrement at-rest sur `data/prism.db` ni `data/audit/*.jsonl` | Moyenne | Aucun indice de chiffrement observé. |
| RT12 | Repo satellite `prism-lite-DICA-ui-ux-design` toujours contaminé | Hors périmètre | `PRISM_01` + rappels `PRISM_03B`. |

---

## 7. Points à confirmer avec le fondateur

1. **Périmètre fonctionnel réellement exposé en production via `server.js`** (enterprise export, ASI, salesops).
2. **Statut juridique du brevet FR2507056** : dépôt, examen, périmètre des revendications, payeur, cession éventuelle.
3. **Cession de droits patrimoniaux** entre l'auteur et toute structure porteuse, et clauses associées.
4. **Stratégie de licence** : maintenir AGPL v3 strict, ou prévoir un schéma de double licence (CLA contributeurs, licence commerciale).
5. **Politique de logs et de rétention** des conversations, des audits JSONL et des données SQLite.
6. **Conformité RGPD effective** : DPIA, registre des traitements, mentions légales, mise en œuvre des droits utilisateurs.
7. **Classification AI Act** (catégorie à risque visée) et obligations associées.
8. **Plan d'industrialisation** : passage de la couche locale (SQLite, JSON) à des dépôts multi-instance, KMS / HSM pour les clés Ed25519, durcissement HTTP (Helmet, CORS, JWT/OAuth).
9. **Statut de fonctionnement du staging** (`launch-prism-full-stack.js` versus `server.js`).
10. **Plan de réduction de la dette typecheck** (511 erreurs) et des trois arbres de tests historiques.
11. **Plan de purge du repo satellite** `prism-lite-DICA-ui-ux-design`.
12. **Statut du module ASI** : prototype, fonctionnalité optionnelle, ou composant runtime planifié.
13. **Statut du module SalesOps Python** : sous-produit indépendant, ou composant du périmètre PRISM.
14. **Identité et statut salarial éventuel de l'auteur** au moment du développement des modules critiques (cession implicite vs explicite).
15. **Existence éventuelle de licences ou contrats d'usage déjà signés** avec des tiers (clients pilotes, partenaires).

---

## 8. Reproductibilité du diagnostic

Pour qu'un auditeur tiers reproduise les chiffres :

```bash
# Inventaire général
git ls-files | wc -l               # = 945 attendu à HEAD 3142176
git ls-files | awk -F. '{print $NF}' | sort | uniq -c | sort -rn | head

# Lignes par techno
for ext in js ts tsx mjs cjs py md json yml; do
  files=$(git ls-files "*.${ext}" | wc -l)
  lines=$(git ls-files "*.${ext}" | xargs cat 2>/dev/null | wc -l)
  printf "%-6s %5s files %8s lines\n" "$ext" "$files" "$lines"
done

# Vérifier qu'aucun secret n'est tracké (doit retourner 0 hits)
git ls-files | xargs grep -lE 'sk-proj-[A-Za-z0-9_-]{30,}|sk-ant-api[0-9]+-[A-Za-z0-9_-]{30,}|pplx-[A-Za-z0-9]{20,}|eyJhbGci[A-Za-z0-9._=+/-]{50,}|sk_[a-fA-F0-9]{40,}' 2>/dev/null | wc -l

# Lancer la suite de tests cœur
npm ci
npm test -- --run                  # attendu 76/76 PASS

# Typecheck (attendu 511 erreurs)
npm run typecheck 2>&1 | grep -cE ': error TS'
```

Si ces commandes diffèrent, l'audit doit être recalibré sur le nouveau HEAD.
