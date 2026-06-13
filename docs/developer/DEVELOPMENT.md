# Guide de développement — PRISM

**Public cible** : développeurs contribuant au dépôt.  
**Objectif** : environnement local, scripts npm, tests, lint et hooks.

---

## 1. Prérequis

| Outil | Version |
| --- | --- |
| Node.js | ≥ 16 (18+ recommandé) |
| npm | Inclus avec Node.js |
| Git | Pour hooks Husky |
| Docker | Optionnel (monitoring, staging) |

---

## 2. Setup initial

```bash
git clone https://github.com/Makk7709/P.R.I.S.M.git
cd P.R.I.S.M
npm install
cp .env.example .env
# Renseigner OPENAI_API_KEY, ANTHROPIC_API_KEY, PERPLEXITY_API_KEY
```

### 2.1 Fichiers runtime (gitignored)

Initialisés automatiquement ou depuis échantillons :

| Fichier | Source |
| --- | --- |
| `data/server-memory.json` | `data/server-memory.sample.json` |
| `data/prism.db` | Créé au premier accès SQLite |
| `data/audit/*.jsonl` | Créé par TamperEvidentAuditLog |
| `data/key-registry.json` | Créé par KeyRegistry |

Politique : [QUALITY.md](../QUALITY.md).

---

## 3. Scripts npm principaux

### 3.1 Serveur

| Script | Commande | Description |
| --- | --- | --- |
| `start` | `node server.js` | Serveur principal |
| `dev` | `nodemon server.js` | Rechargement auto |
| `start:full` | `node launch-prism-full-stack.js` | Stack avec `/health` |
| `start:monitoring` | `docker-compose -f docker-compose-monitoring.yml up -d` | Prometheus + Grafana |
| `stop:monitoring` | `docker-compose ... down` | Arrêt monitoring |

### 3.2 Qualité code

| Script | Description |
| --- | --- |
| `npm run format` | Prettier — formatage |
| `npm run format:check` | Vérification format (CI bloquant) |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run typecheck` | `tsc --noEmit` (checkJs) — **non bloquant** pre-commit |

### 3.3 Tests — périmètre core (CI bloquant)

| Script | Config | Description |
| --- | --- | --- |
| `npm test` | `vitest.config.core-only.js` | **219 tests** — property, adversarial, audit, fuzz |
| `npm run test:watch` | idem | Mode watch |
| `npm run test:properties` | `__tests__/properties` | Property-based fast-check |
| `npm run test:fuzz` | `__tests__/fuzz` | Fuzz contrats Zod |
| `npm run test:proof` | properties + fuzz | Suite preuve |
| `npm run test:proof:full` | + providers | Suite étendue |

### 3.4 Tests — périmètres spécialisés

| Script | Config | Notes |
| --- | --- | --- |
| `npm run test:core` | `vitest.config.core.js` | Périmètre core élargi |
| `npm run test:consensus` | `vitest.config.consensus.mjs` | Consensus dédié |
| `npm run test:enterprise` | `vitest.config.enterprise.ts` | Export enterprise |
| `npm run test:voice` | `vitest.config.voice.js` | Voix (browser) |
| `npm run test:pdf` | `vitest.config.pdf.js` | Export PDF |
| `npm run test:excel` | `vitest.config.excel.js` | Excel |
| `npm run test:orchestrator` | `vitest.config.orchestrator.js` | Orchestrateur |
| `npm run test:infographic` | `vitest.config.infographic.js` | Images |
| `npm run test:legacy` | multiple dirs | **Quarantaine** — non bloquant |

### 3.5 Staging et E2E

| Script | Description |
| --- | --- |
| `npm run staging:up` | Docker staging (port 3001) |
| `npm run staging:down` | Arrêt staging |
| `npm run staging:e2e` | E2E Vitest — **requiert clés API** |
| `npm run staging:setup` | Génération clés staging |
| `npm run staging:report` | Rapport métriques staging |

### 3.6 Couverture

| Script | Description |
| --- | --- |
| `npm run coverage` | Vitest coverage global |
| `npm run test:core:coverage` | Coverage modules core |
| `npm run test:coverage:check` | Seuil Jest 95 % (legacy) |

Seuil documenté : 85 %+ branches modules critiques (README) ; 95 % dans certains scripts Jest legacy.

---

## 4. Configuration Vitest

Fichiers à la racine :

| Fichier | Usage |
| --- | --- |
| `vitest.config.core-only.js` | **CI bloquant** — 28 fichiers, 219 tests |
| `vitest.config.core.js` | Core élargi |
| `vitest.config.consensus.mjs` | Consensus |
| `vitest.config.enterprise.ts` | Enterprise |
| `vitest.config.voice.js` | Voix |
| `vitest.config.pdf.js` | PDF |
| `vitest.config.excel.js` | Excel |
| `vitest.config.orchestrator.js` | Orchestrateur |
| `vitest.config.infographic.js` | Infographie |

Le périmètre `core-only` **exclut** : `__tests_legacy__/`, `legacy_tests/`, `tests/integration/`, `tests/core/` (temporaire), UI/voice browser.

---

## 5. ESLint et Prettier

| Outil | Fichier config |
| --- | --- |
| ESLint | `eslint.config.js`, `.eslintrc.json` |
| Prettier | `.prettierrc`, `.prettierignore` |
| lint-staged | Configuré via Husky |

---

## 6. Husky pre-commit

Fichier : `.husky/pre-commit`

Ordre d'exécution :

1. `npx lint-staged` — format + lint fichiers stagés
2. `npm run typecheck` — **non bloquant** (warnings)
3. `npm test` — **bloquant** (219 tests)

Un commit échoue si les tests core échouent.

---

## 7. CI/CD GitHub Actions

| Workflow | Rôle |
| --- | --- |
| `.github/workflows/ci.yml` | Matrix unit / consensus / enterprise / security / adapters / voice |
| `.github/workflows/quality.yml` | format, lint, typecheck, test, test:properties |
| `.github/workflows/property-tests.yml` | Proof suite sur changements consensus/audit |
| `.github/workflows/security.yml` | Scan sécurité |
| `.github/workflows/frozen-modules.yml` | Modules gelés |

Détail quality gates : [QUALITY.md](../QUALITY.md).

---

## 8. Structure code utile

| Répertoire | Contenu |
| --- | --- |
| `server.js` | Point d'entrée HTTP |
| `src/core/` | ConsensusManager, TrustContext, TaskTypeProcessor, etc. |
| `src/orchestrator/` | HybridOrchestrator |
| `src/audit/` | TamperEvidentAuditLog |
| `src/security/contracts/` | Schémas Zod |
| `backend/` | Orchestrateur simple, routes, services enterprise |
| `ui/` | Interface chat statique |
| `dashboard/` | Next.js 14 (séparé) |
| `__tests__/` | Tests Vitest modernes |
| `tests/` | Tests Vitest + pytest SalesOps |

---

## 9. Dashboard Next.js (développement séparé)

```bash
cd dashboard
npm install
npm run dev     # port 3000 par défaut — conflit possible avec server.js
npm run build
npm run start
```

Stack : Next.js 14.1.0, React 18, Tailwind, Chart.js, Socket.io-client.

---

## 10. Python SalesOps (optionnel)

```bash
cd src/prism_salesops
# Voir pyproject.toml pour installation
pytest tests/salesops/
```

Package **découplé** du serveur Node.

---

## 11. Débogage

### Logs pipeline

`server.js` active `DEBUG_LOG_PIPELINE = true` — logs `[PIPELINE][timestamp]`.

### Tests d'un fichier spécifique

```bash
npm test -- __tests__/properties/consensus.properties.test.ts
```

### Problème espaces dans le chemin projet

Voir [VAGUE0_VITEST_FIX.md](../VAGUE0_VITEST_FIX.md).

---

## 12. Limites développeur

| Sujet | Détail |
| --- | --- |
| Typecheck | ~511 erreurs neutralisées en pre-commit |
| Tests legacy | 392+ échecs en quarantaine |
| E2E staging | Bloqué sans `OPENAI_API_KEY` |
| Enterprise export | Tests montent le router manuellement — pas dans `server.js` |

---

## 13. Documents liés

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [API_REFERENCE.md](./API_REFERENCE.md)
- [QUALITY.md](../QUALITY.md)
- [Vue d'ensemble architecture](../architecture/OVERVIEW.md)
