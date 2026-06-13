# P.R.I.S.M - Professional AI Intelligence System

**Architecture d'intelligence artificielle multi-modèles, avec consensus, audit cryptographique, TrustContext et observabilité enterprise — TRL 4 avancé, démonstration partielle TRL 5 sur sous-systèmes critiques (voir [`docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md`](./docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md)).**

[![License](https://img.shields.io/badge/License-AGPL%20v3-red)](./LICENSE)
[![Version](https://img.shields.io/badge/Version-2.4.0-blue)](https://github.com/Makk7709/P.R.I.S.M)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Quality Gate](https://github.com/Makk7709/P.R.I.S.M/workflows/%F0%9F%8E%AF%20Quality%20Gates/badge.svg)](https://github.com/Makk7709/P.R.I.S.M/actions/workflows/quality.yml)
[![Security](https://github.com/Makk7709/P.R.I.S.M/workflows/%F0%9F%9B%A1%EF%B8%8F%20Security%20Scan/badge.svg)](https://github.com/Makk7709/P.R.I.S.M/actions/workflows/security.yml)
[![Tests](https://img.shields.io/badge/Tests-Vitest-success)](./tests/)
[![Coverage](https://img.shields.io/badge/Coverage-target%2085%25-lightgrey)](./coverage/)

---

## 🎯 TRL Status

**Current TRL**: **TRL 4 avancé**, avec démonstration partielle TRL 5 en staging contrôlé interne (sous-systèmes consensus / TrustContext / journal cryptographique).
**TRL Audit (autorité)** : [`docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md`](./docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md) — verdict Option B, HEAD audité `618cd8b`.
**Démonstration interne partielle TRL 5** : [`docs/reports/TRL5_PROOF_REPORT.md`](./docs/reports/TRL5_PROOF_REPORT.md) — rapport de scénarios TrustContext S1–S6, non indépendamment reproductible sous HEAD courant.
**Core Suite** : 76/76 tests déterministes rejoués (`npm test`, environ 65 s), dont **24 property-based** identifiés via `fast-check` et 52 unit / regression / adversarial / fuzz. Reproductible après `npm install --legacy-peer-deps` (`npm ci` actuellement bloqué par un conflit de peer `zod` — voir audit §3).
**Limite explicite** : la validation TRL 5 complète reste conditionnée à une preuve staging reproductible, des métriques performance consolidées (n ≥ 50) et une exécution avec providers IA réels. Aucun pilote utilisateur, aucun KMS/HSM, aucun audit indépendant tiers à ce stade.

---

## 🚀 Introduction

PRISM (Professional AI Intelligence System Matrix) est une architecture d'IA conversationnelle de niveau enterprise qui orchestre intelligemment plusieurs modèles de pointe (OpenAI GPT-4, Anthropic Claude, Perplexity Llama) avec un système de consensus avancé pour des décisions critiques fiables.

### Vision & Objectifs

- **Orchestration multi-modèles** avec moteur de consensus (invariants prouvés par tests property-based)
- **Sécurité Zero-Trust** avec TrustContext, signatures Ed25519 et escalade humaine (démonstration interne S1–S6)
- **Observabilité enterprise** intégrée (Prometheus / Grafana) — pipelines opérationnels à confirmer en environnement réel
- **Stress test** historique (≈ 60k événements/heure) — résultat ancien, à rejouer et resourcer dans `PRISM_04_TRL5_INDEPENDENT_VALIDATION`
- **Mémoire persistante AMCD** via SQLite
- **Interface vocale** avec ElevenLabs et adaptation contextuelle

---

## ⚙️ Caractéristiques Clés

### 🧠 Système de Consensus IA

- **Vote majoritaire 2/3** entre modèles GPT-4, Claude, Perplexity
- **Timeout configurable** (1-2s) avec fallback gracieux
- **TrustContext** pour escalade sécurité critique
- **PriorityQueue** heap binaire avec 3 niveaux (CRITICAL → HIGH → NORMAL)
- **Benchmarks latence** historiques (p50 / p95 / p99) à reconsolider sur n ≥ 50 avec providers réels (cf. audit TRL §6)

### 🗄️ Persistance & Fiabilité

- **SQLite AMCD** transactionnelle (replacement JSON corrompu)
- **Migration complète** vers Vitest (replacement Jest bloqué)
- **Couverture** : objectif 85 %+ branches sur modules critiques ; chiffres détaillés à reproduire via `npm run coverage` (non garantis en CI à ce jour)
- **Tests mutation** : objectif 60 %+ score sur modules critiques ; à rejouer et sourcer

### 🎤 Système Vocal Premium

- **ElevenLabs Premium** intégration complète
- **4 voix adaptatives** (Rachel, Adam, Antoni, Bella)
- **Enrichissement automatique** contexte pour expressivité +300%
- **Fallback TTS** navigateur si API indisponible
- **Interface corporate** premium avec design noir doré

### 📊 Observabilité Enterprise

- **PrismVitals** surveillance signes vitaux 100% opérationnel
- **Prometheus metrics** port 9090 pour temps réel
- **Grafana dashboards** port 3001 visualisation avancée
- **Docker orchestration** pipeline automatisé
- **Alertes intelligentes** avec cooldown anti-boucles

---

## 📦 Installation & Setup

### Prérequis

```bash
Node.js 18+ (avec support ES Modules)
npm ou yarn
Clés API (OpenAI, Anthropic, Perplexity, ElevenLabs optionnel)
Docker (pour monitoring enterprise)
```

### Installation Rapide

```bash
# Cloner le repository
git clone https://github.com/Makk7709/P.R.I.S.M.git
cd P.R.I.S.M

# Installer les dépendances
npm install

# Configuration environment
cp env.example .env
```

### Configuration APIs

```bash
# Variables d'environnement requises (.env)
OPENAI_API_KEY=sk-votre_clé_openai
ANTHROPIC_API_KEY=sk-ant-votre_clé_anthropic
PERPLEXITY_API_KEY=pplx-votre_clé_elevenlabs
ELEVENLABS_API_KEY=sk-votre_clé_elevenlabs  # Optionnel pour voice premium

# Configuration consensus
USE_MOCKS=false                              # Force fournisseurs réels
CONSENSUS_TIMEOUT_MS=1000                   # Timeout consensus
TRUST_CONTEXT_ENABLED=true                  # Escalade sécurité
```

### Démarrage Service

```bash
# Service principal PRISM
npm start
# Ou explicitement:
node server.js

# Interface corporate premium
open http://localhost:3000/ui/prismVoiceChatV2-Corporate.html

# Service monitoring enterprise complet
npm run start:monitoring
```

---

## 📚 Documentation

La documentation produit est structurée par public (utilisateur, architecture, développeur) dans [`docs/README.md`](./docs/README.md) — index des guides, modules cœur, sécurité, API et procédures de contribution.

---

## 👨‍💻 Development

### Quality Standards

PRISM enforces strict quality gates via automated checks. See [Quality Contract](./docs/QUALITY.md) for details.

**Commands**:

```bash
# Format code
npm run format

# Lint code
npm run lint
npm run lint:fix  # Auto-fix issues

# Type check (checkJs)
npm run typecheck

# Run core tests (CI-blocking)
npm test

# Run legacy tests (quarantine, non-blocking)
npm run test:legacy

# Run property-based tests
npm run test:properties
```

**Pre-commit hooks** automatically:

- Format staged files
- Lint staged files
- Run core tests (must pass)

**CI/CD** runs quality gates on every push/PR:

- ✅ Format check (blocking)
- ✅ Lint check (blocking)
- ⚠️ Type check (warnings)
- ✅ Core tests (blocking)
- ⚠️ Legacy tests (quarantine, non-blocking)

### Runtime Files

Runtime state files are **untracked** (auto-initialized from samples):

- `data/server-memory.json` → uses `data/server-memory.sample.json`
- `test_orchestration_journal/checkpoint.json` → auto-initialized

See [Quality Contract](./docs/QUALITY.md) for full policy.

---

## 🔑 Usage

### API Consensus

```javascript
import { ConsensusManager } from './src/core/ConsensusManager.js';

const consensus = new ConsensusManager({
  timeoutMs: 1000,
  useRealProviders: true,
  enableTrustContext: true,
});

// Décision critique avec consensus
const result = await consensus.requestConsensus({
  prompt: 'Validation transfert technologique critique',
  context: 'Contexte technique détaillé',
  isCritical: true,
});

console.log(result.decision); // APPROVED/REJECTED
console.log(result.votes); // { agent1: true, agent2: false, agent3: true }
console.log(result.metrics); // Latence p50/p95/p99
```

### Interface Vocale Premium

```javascript
// Adaptation contextuelle automatique
const voiceConfig = {
  URGENT: { voice: 'Antoni', rate: 1.35, style: 0.9 },
  BUSINESS: { voice: 'Adam', rate: 1.0, style: 0.6 },
  CASUAL: { voice: 'Rachel', rate: 1.15, style: 0.65 },
};
```

### Monitoring Enterprise

```bash
# Métriques Prometheus
curl http://localhost:9090/metrics

# Dashboard Grafana
open http://localhost:3001

# Stress test automatisé
docker-compose -f docker-compose-stress.yml.up
```

---

## 📊 Modules Implémentés

### ✅ Phase 1 - Core Consensus (v2.0-2.1)

- **ConsensusManager** - Vote IA majorité 2/3
- **PriorityQueue** - Heap binaire 3 niveaux
- **TrustContext** - Escalade sécurité
- **ProviderAdapters** - OpenAI, Anthropic, Perplexity
- **PrismVitals** - Surveillance signes vitaux
- **Migration SQLite** - Persistence AMCD transactionnelle

### ✅ Phase 2 - Enterprise Monitoring (v2.2-2.3)

- **Prometheus Integration** - Métriques temps réel (instrumentation présente, runs production non sourcés)
- **Grafana Dashboards** - Visualisation avancée (dashboards définis, déploiement opérationnel à confirmer)
- **Docker Orchestration** - Pipeline défini (cf. `staging/docker-compose.yml`, exécution réelle non tracée)
- **Stress Test Driver** - Cible historique 60k événements/heure ; log de run reproductible à reproduire
- **Mutation Testing** - Cible 60 %+ score modules critiques (à rejouer)

### ✅ Phase 3 - Voice Revolution (v2.4)

- **ElevenLabs Integration** - TTS premium
- **VoicePersonalityEnhancer** - Enrichissement contexte
- **Multi-Voice System** - 4 voix adaptatives
- **Corporate Interface** - Design premium noir doré
- **Fallback TTS** - Robustesse browser

### ⚠️ Phase 4 - Benchmark Enterprise (Sept 2025, à reconsolider)

- **Latency Profiling** historique — runs initiaux à rejouer ; sans benchmark consolidé n ≥ 50 reproductible
- **Statistical Analysis** p50 / p95 / p99 — claims à resourcer dans `PRISM_04_TRL5_INDEPENDENT_VALIDATION`
- **Performance Matrix** - agents / context / timeout (méthodologie présente, valeurs à reproduire)
- **Real-world Testing** fournisseurs API réels — non rejoué depuis l'audit (`staging:e2e` requiert clés externes)
- **Quality Gates** - gates Prettier / ESLint / `npm test` opérationnels ; typecheck volontairement non bloquant (cf. audit §3)

### 🔄 Phase 5 - Roadmap à Venir

- **Multi-tenancy** - Isolation enterprise
- **Advanced Analytics** - ML insights métriques
- **Compliance** - RGPD/SOC2 readiness
- **API Gateway** - Rate limiting + auth
- **Cloud Native** - Kubernetes orchestration

---

## 🛡️ Licence

**GNU General Public License v3 (AGPL-3.0)**

Ce projet est sous licence AGPL v3, garantissant l'open source avec protection copyleft. Voir [LICENSE](./LICENSE) pour détails complets.

**Pour usage commercial** : Contacter l'équipe PRISM pour licensing équitable.

---

## 📧 Contribution & Contact

## 🧪 Tests

### Exécution des Tests

**Commande unique pour exécuter tous les tests:**

```bash
npm test
```

**Note:** Si vous rencontrez des problèmes avec les espaces dans le chemin du projet, voir `docs/VAGUE0_VITEST_FIX.md` pour la solution.

### Tests Spécifiques

```bash
# Tests d'intégration TrustContext
npm test -- __tests__/integration/trustContext-*.spec.ts

# Tests avec coverage
npm run coverage
```

### Guidelines Contribution

- Fork & Pull Request workflow
- Tests requis : `npm test` (100 % green, bloquant via Husky)
- Coverage : **cible** 85 %+ branches sur modules critiques (non bloqué en CI à ce jour)
- Mutation score : **cible** 60 %+ sur modules critiques (à rejouer et sourcer)
- Documentation : README + docs inline + cohérence avec `docs/valuation/PRISM_02A_TRL_CLAIM_AUDIT.md`

### Contact Equipe

- **Product Owner** : Amine Mohamed
- **Technical Lead** : Architecture Consensus & Enterprise
- **Repository** : https://github.com/Makk7709/P.R.I.S.M

### Issues & Support

- **Bug Reports** : GitHub Issues avec reproduction steps
- **Feature Requests** : Discussions avec impact mesure
- **Security Issues** : Responsable disclosure uniquement
- **Enterprise Support** : Contact équipe directe

---

## 📈 Métriques & Performance

> ⚠️ **Statut métriques (révision PRISM_02A)** — les chiffres ci-dessous sont des **valeurs historiques internes** issues de runs antérieurs (Sept 2025). Ils ne sont **pas** rejouables en l'état sous HEAD courant (clés providers externes nécessaires, `staging:e2e` bloqué, n ≥ 50 non atteint). À reconsolider dans la mission `PRISM_04_TRL5_INDEPENDENT_VALIDATION`. Ne pas utiliser comme preuve TRL 5.

### Consensus IA — benchmarks historiques à rejouer

```
🎯 Latence E2E (historique) :     p50≈507ms, p95≈756ms, p99≈787ms — n et seed non sourcés
⚡ Provider Response (historique) : GPT-4≈10.4s, Claude=N/A*, Perplexity≈9.5s
🎭 Vote Success (historique) :      ≈94.7% avec 3 agents parallèles
🛡️ Timeout Rate (cible) :          < 5 %
✨ Orchestration (cible) :          < 25 % overhead E2E
```

### Voice System (qualitatif interne)

```
🎤 Quality Score (interne) :    8/10 vs 2/10 TTS browser — évaluation qualitative
⚡ Generation Time (interne) :   1-3s vs 5-10s legacy
🎭 Context Adaptation (interne): 9/10 précision automatique
💪 User Engagement (interne) :   +100 % temps interaction
```

### Enterprise Stack (cibles + état)

```
📊 Test Coverage :    cible 85 %+ branches, 95 %+ lines (à reproduire via `npm run coverage`)
🧪 Mutation Score :   cible 60 %+ modules critiques (à rejouer)
🚀 Stress Throughput : cible historique ≈ 60k événements/heure (à reproduire, non sourcé en CI)
🔍 Monitoring :       PrismVitals instrumenté (runs production non tracés dans le repo)
✅ Core test suite :   76/76 tests rejoués (cf. §TRL Status et audit PRISM_02A §3)
```

---

_Développé avec ❤️ pour l'excellence en IA conversationnelle enterprise_

**Version actuelle**: v2.4.0 | **Dernière mise à jour**: Septembre 2025
