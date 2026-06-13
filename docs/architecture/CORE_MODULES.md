# Architecture — Modules cœur

**Public cible** : développeurs, auditeurs, valorisation technique.  
**Objectif** : inventorier les modules propriétaires clés avec statut production vs dormant.

---

## 1. Légende des statuts

| Statut | Signification |
| --- | --- |
| **Actif** | Importé et exécuté dans le chemin `npm start` / `server.js` |
| **Actif (pipeline)** | Exécuté via un module actif (ex. TaskTypeProcessor) |
| **Dormant** | Code présent, non branché au runtime principal |
| **Parallèle** | Processus ou package séparé |
| **Legacy** | Conservé pour historique / tests, remplacé ou partiel |

---

## 2. Orchestration et routage

| Module | Fichier | Statut | Rôle |
| --- | --- | --- | --- |
| TaskTypeProcessor | `src/core/TaskTypeProcessor.js` | **Actif** | Orchestrateur central : mémoire, personas, MoralLayer, consensus, enrichissement |
| HybridOrchestrator | `src/orchestrator/HybridOrchestrator.js` | **Actif** | Aiguillage ROUTED vs CONSENSUS selon criticité |
| CriticalityClassifier | `src/orchestrator/CriticalityClassifier.js` | **Actif (pipeline)** | Classification criticité requête |
| backend/orchestrator | `backend/orchestrator.js` | **Actif** | Routage simple taskType → provider, cache LRU |
| InterDomainOrchestrator | `src/core/InterDomainOrchestrator.js` | **Actif (pipeline)** | Collaboration multi-personas inter-domaines |
| PersonaActivator | `src/core/PersonaActivator.js` | **Actif (pipeline)** | Activation personas par domaine |
| JarvisPersonality | `src/core/JarvisPersonality.js` | **Actif (pipeline)** | Couche personnalité conversationnelle |
| ConsciousnessLayer | `src/core/ConsciousnessLayer.js` | **Actif (pipeline)** | Couche conscience (pipeline task-type) |
| ProjectComplexityManager | `src/core/ProjectComplexityManager.js` | **Actif (pipeline)** | Détection projets complexes |

---

## 3. Consensus et gouvernance

| Module | Fichier | Statut | Rôle |
| --- | --- | --- | --- |
| ConsensusManager | `src/core/ConsensusManager.js` | **Actif** | Quorum 2/3, timeout 1 s, EventEmitter, fail-closed Zod |
| ConsensusManager (TS) | `src/consensus/ConsensusManager.ts` | **Legacy / parallèle** | Variante TypeScript — coexistence avec version JS |
| TrustContext | `src/core/TrustContext.js` | **Actif** | Approbations humaines signées, niveaux criticité, timeout 30 min |
| KeyRegistry | `src/core/KeyRegistry.js` | **Actif** | Registre clés Ed25519 (active/revoked, rotation) |
| PriorityQueue | `src/core/PriorityQueue.js` | **Actif (pipeline)** | File de priorité heap O(log n) |
| Contrats Zod | `src/security/contracts/*.js` | **Actif** | Schémas consensus, trustcontext, journal |

---

## 4. Audit et journalisation

| Module | Fichier | Statut | Rôle |
| --- | --- | --- | --- |
| TamperEvidentAuditLog | `src/audit/TamperEvidentAuditLog.js` | **Actif** | JSONL chaîné SHA-256 + signature Ed25519 |
| SecureJournalManager | `src/core/SecureJournalManager.js` | **Actif (pipeline)** | Journal HMAC complémentaire |
| voiceChatController | `backend/controllers/voiceChatController.js` | **Actif** | Handler `/api/chat` testable |

---

## 5. Éthique et sécurité applicative

| Module | Fichier | Statut | Rôle |
| --- | --- | --- | --- |
| MoralLayer | `infrastructure/moralLayer.js` | **Actif (pipeline)** | Filtrage éthique contenu — voir [moralLayer.md](../moralLayer.md) |
| EnterpriseSanitizer | `backend/services/enterpriseSanitizer.js` | **Dormant (API)** | Sanitization export enterprise — router non monté |
| middleware/security | `backend/middleware/security.js` | **Dormant (API)** | CSRF, rate-limit — utilisé si enterprise export monté |

---

## 6. Providers LLM

| Adapter | Fichier | Provider | Statut |
| --- | --- | --- | --- |
| OpenAIAdapter | `src/core/providers/OpenAIAdapter.js` | OpenAI GPT-4 | **Actif** |
| AnthropicAdapter | `src/core/providers/AnthropicAdapter.js` | Anthropic Claude | **Actif** |
| PerplexityAdapter | `src/core/providers/PerplexityAdapter.js` | Perplexity Sonar | **Actif** |

Routage simple additionnel dans `backend/orchestrator.js` (appels SDK directs).

---

## 7. Voix, export, médias

| Module | Fichier | Statut | Rôle |
| --- | --- | --- | --- |
| ResponseModeManager | `src/voice/ResponseModeManager.js` | **Actif** | Logique texte vs vocal |
| ElevenLabsService | `src/voice/ElevenLabsService.js` | **Actif** | Synthèse vocale |
| VoicePersonalityEnhancer | `backend/voicePersonalityEnhancer.js` | **Actif** | Enrichissement contextuel voix |
| PdfExportService | `src/export/PdfExportService.js` | **Actif** | Export PDF conversations |
| ImageGenerator | `src/infographic/ImageGenerator.js` | **Actif** | Gemini + fallback fal.ai |
| ChatFileProcessor | `src/chat/ChatFileProcessor.js` | **Actif** | Analyse fichiers Excel uploadés |
| EnterprisePDFService | `backend/services/enterprisePDFService.js` | **Dormant (API)** | PDF enterprise — router non monté |

---

## 8. Mémoire et persistance

| Module | Fichier | Statut | Rôle |
| --- | --- | --- | --- |
| MemoryRetrievalEngine | `src/core/MemoryRetrievalEngine.js` | **Actif (pipeline)** | Récupération mémoire contextuelle |
| database (SQLite) | `backend/database.js` | **Actif** | Table `prism_state` |
| prismStateStore | `persistence/prismStateStore.js` | **Actif (pipeline)** | État applicatif |
| RealTimeResearchEngine | `src/core/RealTimeResearchEngine.js` | **Actif (pipeline)** | Recherche temps réel |

---

## 9. Modules dormants ou parallèles

| Module | Emplacement | Statut | Commentaire |
| --- | --- | --- | --- |
| ASI Core | `asi/` (14 fichiers) | **Dormant** | EventEmitter local, Winston — non importé par `server.js` |
| prism_salesops | `src/prism_salesops/` (Python) | **Parallèle** | ETL Excel, text2sql, Streamlit — `pyproject.toml` séparé |
| SelfImprovementEngine | `evolution/selfImprovementEngine.js` | **Dormant / expérimental** | Instancié dans TaskTypeProcessor, impact mesurable limité |
| selfOptimizer | `backend/selfOptimizer.js` | **Dormant** | Boucle auto-optimisation non documentée runtime |
| launchSelfEvolutionCycle | `backend/launchSelfEvolutionCycle.js` | **Dormant** | Cycle auto-évolution |
| enterpriseExportRouter | `backend/routes/enterpriseExport.js` | **Dormant (API)** | Importé `server.js`, jamais `app.use()` |
| Kernel historique | `docs/kernel-architecture.md` | **Legacy** | Modules KernelBus, Planner — vision antérieure |

---

## 10. Dashboard et UI

| Composant | Emplacement | Statut |
| --- | --- | --- |
| Chat corporate | `ui/prismVoiceChatV2-Corporate.html` | **Actif** (statique servi par Express) |
| Chat V2 | `ui/prismVoiceChatV2.html` | **Actif** |
| prismUI.js | `ui/prismUI.js` | **Actif** |
| Dashboard Next.js | `dashboard/pages/index.tsx` | **Parallèle** — npm indépendant |
| Métriques démo API | `GET /api/metrics` dans `server.js` | **Actif** — données statiques |

---

## 11. Tests et preuves par module

| Module | Tests associés |
| --- | --- |
| ConsensusManager | `__tests__/properties/consensus.properties.test.ts` |
| TrustContext | `__tests__/properties/trustContext.properties.test.ts`, `__tests__/trustContext.regression.test.ts` |
| TamperEvidentAuditLog | `__tests__/audit/`, `__tests__/properties/journal.properties.test.ts` |
| Contrats Zod | `__tests__/fuzz/contracts.fuzz.test.ts` |
| Providers | `__tests__/properties/providers.properties.test.ts` |
| Enterprise export | `__tests_legacy__/backend/api/enterpriseExport.test.js` (montage manuel) |
| TaskTypeProcessor | `tests/core/task-type-processor.spec.ts` (hors core-only) |

Suite bloquante CI : **219 tests** (`vitest.config.core-only.js`).

---

## 12. Documents liés

- [Vue d'ensemble](./OVERVIEW.md)
- [Données et intégrations](./DATA_AND_INTEGRATIONS.md)
- [Sécurité](./SECURITY.md)
- [PROJECT_DOCUMENTATION_STANDARD.md](../audit/PROJECT_DOCUMENTATION_STANDARD.md) §6
