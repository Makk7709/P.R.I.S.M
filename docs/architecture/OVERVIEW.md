# Architecture — Vue d'ensemble

**Public cible** : développeurs, architectes, auditeurs techniques.  
**Objectif** : décrire les couches applicatives et le flux d'une requête chat jusqu'à la réponse.

---

## 1. Positionnement

PRISM combine :

- une **couche d'intégration HTTP** (`server.js`, Express 5),
- une **couche d'orchestration** (simple + hybride + task-type),
- une **couche de gouvernance** (consensus, TrustContext, MoralLayer),
- une **couche d'auditabilité** (journal JSONL Ed25519),
- des **interfaces statiques** (`ui/`) et un **dashboard Next.js** séparé (`dashboard/`).

**Réserve** : la maturité d'intégration varie — certains modules sont présents en code mais non branchés au point d'entrée (cf. [CORE_MODULES.md](./CORE_MODULES.md)).

---

## 2. Schéma des couches

```text
┌─────────────────────────────────────────────────────────────┐
│  Clients                                                     │
│  • UI statique /ui (chat corporate)                           │
│  • Dashboard Next.js (dashboard/) — processus séparé          │
│  • Appels API HTTP directs                                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  server.js — Express 5 (PORT défaut 3000)                    │
│  • POST /api/chat                                            │
│  • Upload Excel, PDF, images, voix                           │
│  • Fichiers statiques /, /ui, /corporate, /demo              │
└───────────────────────────┬─────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌─────────────────┐ ┌───────────────┐ ┌─────────────────────┐
│ TaskTypeProcessor│ │HybridOrchestr.│ │ backend/orchestrator │
│ (pipeline AGI)   │ │(criticité)    │ │ (routage simple)     │
└────────┬─────────┘ └───────┬───────┘ └──────────┬──────────┘
         │                   │                     │
         └───────────────────┼─────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  ConsensusManager (quorum 2/3) — si chemin critique          │
│  • OpenAIAdapter • AnthropicAdapter • PerplexityAdapter      │
└───────────────────────────┬─────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌─────────────────┐ ┌───────────────┐ ┌─────────────────────┐
│ TrustContext    │ │ MoralLayer    │ │ TamperEvidentAuditLog│
│ (approbations)  │ │ (éthique)     │ │ (JSONL + Ed25519)    │
└─────────────────┘ └───────────────┘ └─────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Persistance                                                  │
│  • SQLite data/prism.db (prism_state)                        │
│  • data/audit/*.jsonl                                        │
│  • data/key-registry.json                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Flux requête chat (chemin nominal)

### 3.1 Entrée HTTP

`POST /api/chat` → `voiceChatController.handleChat` (`backend/controllers/voiceChatController.js`).

Corps parsé : `message`, `taskType`, `model`, `voiceConfig`, `inputSource`, `voiceConfidence`, `hasAttachment`.

### 3.2 Détection criticité

`isCriticalRequest()` : mots-clés destructeurs ou `taskType === 'critical'`.

Si critique → validation **TrustContext** avant orchestration (peut retourner HTTP 403).

### 3.3 Orchestration

Deux chemins complémentaires :

| Couche | Fichier | Rôle |
| --- | --- | --- |
| TaskTypeProcessor | `src/core/TaskTypeProcessor.js` | Pipeline complet : mémoire, personas, MoralLayer, recherche, consensus interne |
| HybridOrchestrator | `src/orchestrator/HybridOrchestrator.js` | Aiguillage ROUTED (simple) vs CONSENSUS selon `CriticalityClassifier` |
| Orchestrateur simple | `backend/orchestrator.js` | Routage `taskType` → provider unique, cache LRU, fallback OpenAI |

`server.js` chaîne TaskTypeProcessor puis HybridOrchestrator selon le contexte de la requête.

### 3.4 Consensus (si activé)

`ConsensusManager` (`src/core/ConsensusManager.js`) :

1. Propose une décision aux trois adapters.
2. Collecte votes (`approve`, `reject`, `abstain`, `unavailable`).
3. Applique quorum **2/3** avec timeout **1000 ms**.
4. Valide les contrats Zod (`src/security/contracts/consensus.js`) — fail-closed.

### 3.5 Post-traitement

1. **MoralLayer** — filtrage éthique de la réponse.
2. **VoicePersonalityEnhancer** — adaptation ton vocal.
3. **ResponseModeManager** — décision texte vs audio.
4. **ElevenLabs** — génération audio si clé présente.

### 3.6 Sortie

JSON : `content`, `model`, `responseTime`, `audioUrl`, `inputMode`, `responseMode`, `metadata` (mode orchestration, consensus, etc.).

---

## 4. Double couche d'orchestration

Point d'attention documenté dans l'audit cabinet :

| Orchestrateur | Emplacement | Statut |
| --- | --- | --- |
| Historique simple | `backend/orchestrator.js` | Actif — fallback rapide |
| Hybride | `src/orchestrator/HybridOrchestrator.js` | Actif — criticité |
| Task-type complet | `src/core/TaskTypeProcessor.js` | Actif — pipeline riche |

La coexistence crée une complexité d'intégration : les trois peuvent intervenir sur une même requête selon le chemin code. Les tests property-based couvrent les invariants consensus ; l'intégration E2E complète requiert clés API (`staging:e2e`).

---

## 5. Interfaces et points d'entrée alternatifs

| Composant | Point d'entrée | Notes |
| --- | --- | --- |
| Serveur principal | `npm start` → `server.js` | Chemin production documenté |
| Stack complète | `npm run start:full` → `launch-prism-full-stack.js` | Expose `/health`, `/api/health` |
| Dashboard Next.js | `cd dashboard && npm run dev` | Indépendant, Socket.io-client |
| Module ASI | `asi/launchASI.js` | Non branché à `server.js` |
| Staging Docker | `npm run staging:up` | Port 3001→3000, healthcheck `/health` |

---

## 6. Déploiement

| Artefact | Rôle |
| --- | --- |
| `Dockerfile` | Image applicative racine |
| `docker-compose.yml` | Orchestration racine |
| `staging/docker-compose.yml` | Environnement staging (`PRISM_MODE=staging`) |
| `docker-compose-monitoring.yml` | Prometheus + Grafana |

TLS et reverse-proxy : **non configurés** dans `server.js` — suppose un proxy en amont en production.

---

## 7. Observabilité

| Composant | Emplacement |
| --- | --- |
| Exporter Prometheus | `monitoring/prismMetrics.js`, `telemetry/prismMetrics.js` |
| Port exporter | 9100 (défaut) |
| Dashboards Grafana | `grafana/`, provisioning `monitoring/grafana/` |
| Métriques HTTP démo | `GET /api/metrics` (données statiques) |

Branchement runtime de l'exporter au démarrage `server.js` : **à confirmer** selon configuration — l'instrumentation est présente, l'activation systématique en production n'est pas tracée dans le repo.

---

## 8. Limites architecturales documentées

- Pas de file de messages externe (Redis, RabbitMQ).
- SQLite local — scalabilité multi-instance non démontrée.
- Pas de schéma multi-tenant.
- Helmet, CORS, JWT : dépendances présentes, **non branchées** sur `server.js`.
- Enterprise export router : importé, **non monté**.

---

## 9. Documents liés

- [Modules cœur](./CORE_MODULES.md)
- [Données et intégrations](./DATA_AND_INTEGRATIONS.md)
- [Sécurité](./SECURITY.md)
- [Référence API](../developer/API_REFERENCE.md)
- [PROJECT_DOCUMENTATION_STANDARD.md](../audit/PROJECT_DOCUMENTATION_STANDARD.md)
