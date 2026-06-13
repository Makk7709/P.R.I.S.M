# Architecture — Données et intégrations

**Public cible** : développeurs, ops, intégrateurs.  
**Objectif** : documenter la persistance, les services externes et l'observabilité.

---

## 1. Persistance locale

### 1.1 SQLite (AMCD)

| Élément | Valeur |
| --- | --- |
| Module | `better-sqlite3` via `backend/database.js` |
| Fichier défaut | `data/prism.db` |
| Variable override | `DATABASE_PATH` |
| Schéma | Table `prism_state (key TEXT PRIMARY KEY, value TEXT)` |
| Migrations | **Aucune** — `CREATE TABLE IF NOT EXISTS` inline |

**Usage** : stockage clé-valeur générique pour l'état applicatif. Pas de schéma conversationnel relationnel documenté.

**Limite** : scalabilité multi-instance non démontrée — fichier local unique.

### 1.2 État applicatif

| Fichier / module | Rôle |
| --- | --- |
| `persistence/prismStateStore.js` | Couche état applicatif |
| `data/server-memory.sample.json` | Échantillon état (non tracké en runtime) |
| `data/server-memory.json` | Runtime (gitignored) |

### 1.3 Journal d'audit

| Élément | Détail |
| --- | --- |
| Module | `src/audit/TamperEvidentAuditLog.js` |
| Format | JSONL `data/audit/audit-{timestamp}.jsonl` |
| Intégrité | Chaînage SHA-256 (`prevHash`), signature Ed25519 |
| Vérification | Méthode `verify()` |

Documentation : [AUDIT_LOG_TAMPER_EVIDENT.md](../AUDIT_LOG_TAMPER_EVIDENT.md).

### 1.4 Registre de clés

| Élément | Détail |
| --- | --- |
| Module | `src/core/KeyRegistry.js` |
| Fichier | `data/key-registry.json` |
| Variable | `TRUSTCONTEXT_KEYREGISTRY_PATH` |
| Opérations | `rotateKey()`, `revokeKey()`, statuts `active` / `revoked` |

Documentation : [TRUSTCONTEXT_KEY_MANAGEMENT.md](../TRUSTCONTEXT_KEY_MANAGEMENT.md).

---

## 2. Fournisseurs LLM

### 2.1 OpenAI

| Élément | Valeur |
| --- | --- |
| SDK | `openai@^4.96.0` |
| Variable | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Usage | `backend/orchestrator.js`, `OpenAIAdapter` |
| Modèle config | `gpt-4.1` (`config.js`) |

### 2.2 Anthropic

| Élément | Valeur |
| --- | --- |
| SDK | `@anthropic-ai/sdk@^0.26.0` |
| Variable | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| Usage | `AnthropicAdapter` |
| Modèle config | `claude-3-sonnet-20240229` |

### 2.3 Perplexity

| Élément | Valeur |
| --- | --- |
| Accès | `fetch` HTTP |
| Variables | `PERPLEXITY_API_KEY`, `PERPLEXITY_BASE_URL`, `PERPLEXITY_MODEL` |
| Usage | `PerplexityAdapter`, `backend/orchestrator.js` |
| Modèle référencé | `llama-3.1-sonar-large-128k-online` (audit) / `mixtral-8x7b-instruct` (`config.js`) |

### 2.4 Mode mocks

| Variable | Effet |
| --- | --- |
| `USE_MOCKS` | Force comportement mock si `true` |
| `PRISM_USE_REAL_PROVIDERS` | Active adapters réels côté consensus |

Sans clés valides et avec mocks désactivés, les appels providers échouent.

---

## 3. Voix et médias

### 3.1 ElevenLabs

| Élément | Valeur |
| --- | --- |
| Variable | `ELEVENLABS_API_KEY` |
| Accès | API HTTP directe (pas de SDK npm officiel) |
| Modules | `ElevenLabsService`, `backend/voice/elevenLabsAudio.js` |
| Fallback | TTS navigateur si clé absente |

### 3.2 Génération d'images

| Provider | Variable | Module |
| --- | --- | --- |
| Google Gemini | `GEMINI_API_KEY` | `src/infographic/ImageGenerator.js` |
| fal.ai (Flux) | `FAL_API_KEY`, `FAL_KEY` | Fallback image |
| Nano Banana | `NANOBANANA_API_KEY` | Référencé dans ImageGenerator |

---

## 4. Supabase

| Élément | Détail |
| --- | --- |
| SDK | `@supabase/supabase-js@^2.49.4` |
| Variables | `SUPABASE_URL`, `SUPABASE_API_KEY` |
| Scripts | `backend/setup_database.js`, `backend/manualMemoryInjector.js` |

**Statut** : intégration **optionnelle** — utilisée par des scripts de setup et injection mémoire, **pas** par le flux principal `POST /api/chat` dans `server.js`.

---

## 5. Export et traitement fichiers

### 5.1 Excel / CSV

| Composant | Rôle |
| --- | --- |
| `exceljs`, `xlsx` | Parsing et génération |
| `backend/routes/chatUpload.js` | Upload chat |
| `src/chat/ChatFileProcessor.js` | Analyse IA des fichiers |
| `backend/middleware/fileUpload.js` | Multer, validation, rate-limit |

### 5.2 PDF

| Service | Route | Statut |
| --- | --- | --- |
| PdfExportService | `/api/export/pdf` | **Actif** |
| EnterprisePDFService | `/api/export/enterprise-report` | **Dormant** (router non monté) |

---

## 6. Observabilité

### 6.1 Prometheus

| Élément | Valeur |
| --- | --- |
| Client | `prom-client@^14.2.0` |
| Modules | `monitoring/prismMetrics.js`, `telemetry/prismMetrics.js` |
| Port exporter | **9100** (défaut `startMetricsServer`) |
| Variables | `METRICS_PORT`, `PROMETHEUS_PORT`, `METRICS_OUTPUT_DIR` |

### 6.2 Stack Docker monitoring

Commande : `npm run start:monitoring` → `docker-compose-monitoring.yml`

| Service | Port hôte | Port conteneur |
| --- | --- | --- |
| Prometheus | 9091 | 9090 |
| Grafana | 3002 | 3000 |

Configuration Prometheus : `monitoring/prometheus.yml`, règles `monitoring/prometheus-rules.yml`.

Dashboards : `grafana/prism_dashboard.json`, provisioning `monitoring/grafana/`.

Complément : [OBS_Dashboards.md](../OBS_Dashboards.md).

### 6.3 Socket.io

| Usage | Détail |
| --- | --- |
| Dépendance | `socket.io@^4.8.1` |
| Client | `socket.io-client` dans `dashboard/` |
| Serveur | Branchement sur `server.js` : **non observé** — dashboard peut fonctionner en mode dégradé |

### 6.4 Métriques HTTP applicatives

`GET /api/metrics` retourne des métriques **statiques de démonstration** (revenue, users, uptime, etc.) — ne pas confondre avec l'exporter Prometheus.

---

## 7. Logs

| Outil | Usage |
| --- | --- |
| Winston | Modules `/src`, ASI |
| Morgan | Dépendance présente, **non branchée** sur `server.js` |
| MoralLayer | `logs/moralLayerAudit/blocked.log`, `monitored.log` |
| Console pipeline | `[PIPELINE]` logs dans `server.js` (DEBUG temporaire) |

Pas de centralisation ELK / Loki / CloudWatch configurée dans le repo.

---

## 8. Dépendances notables (non-LLM)

| Package | Usage |
| --- | --- |
| `express@^5.1.0` | Serveur HTTP |
| `better-sqlite3` | SQLite |
| `pdfkit` | Génération PDF |
| `joi` | Validation enterprise export |
| `zod@^4.1.13` | Contrats sécurité (`src/security/contracts/`) |
| `helmet`, `cors`, `jsonwebtoken` | Présents, **non configurés** sur `server.js` |

Conflit peer `zod` v3/v4 masqué par `.npmrc` (`legacy-peer-deps=true`).

---

## 9. Environnements

| Mode | Configuration |
| --- | --- |
| Développement | `NODE_ENV=development`, `npm start` |
| Staging | `PRISM_MODE=staging`, `staging/docker-compose.yml`, port 3001 |
| Tests | `NODE_ENV=test`, configs Vitest multiples |
| Monitoring | `docker-compose-monitoring.yml` |

---

## 10. Limites et réserves

- Chiffrement at-rest : **non documenté** pour SQLite et JSONL audit.
- Rétention logs : **non configurée** explicitement.
- Couplage cloud : Supabase optionnel ; providers LLM obligatoires pour usage réel.
- Reproductibilité E2E : `staging:e2e` requiert `OPENAI_API_KEY` (instanciation top-level).

---

## 11. Documents liés

- [Vue d'ensemble](./OVERVIEW.md)
- [Sécurité](./SECURITY.md)
- [EXCEL_ANALYSIS_MODULE.md](../EXCEL_ANALYSIS_MODULE.md)
- [persistence/state_management.md](../persistence/state_management.md)
