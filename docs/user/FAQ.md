# FAQ — PRISM

**Public cible** : tous les utilisateurs et intégrateurs.  
**Objectif** : réponses courtes aux questions fréquentes, avec limites explicites.

---

## 1. Installation et configuration

### Quelle version de Node.js est requise ?

Node.js **16+** (`package.json` `engines`). Node **18+** recommandé (badges README).

### Dois-je utiliser `env.example` ou `.env.example` ?

Utiliser **`.env.example`** — template canonique (53 variables, PRISM_03B). Le fichier `env.example` à la racine est un doublon plus court et legacy.

```bash
cp .env.example .env
```

### `npm ci` ou `npm install` ?

`npm install` fonctionne avec `legacy-peer-deps=true` (`.npmrc`). Le README signale un conflit peer `zod` pouvant bloquer `npm ci` selon l'environnement. En cas d'échec : `npm install --legacy-peer-deps`.

### Le serveur ne démarre pas — port déjà utilisé

Changer `PORT` dans `.env` (défaut `3000`). Vérifier qu'aucun autre service (dashboard Next.js, autre app) n'occupe le port.

---

## 2. Clés API et providers

### Quelles clés sont obligatoires ?

| Clé | Obligatoire pour |
| --- | --- |
| `OPENAI_API_KEY` | Chat et routage simple |
| `ANTHROPIC_API_KEY` | Consensus multi-modèles |
| `PERPLEXITY_API_KEY` | Consensus multi-modèles |
| `ELEVENLABS_API_KEY` | Synthèse vocale premium (optionnel) |
| `GEMINI_API_KEY` / `FAL_API_KEY` | Génération d'images (optionnel) |

Sans les trois premières, le chat avec providers réels échoue ou nécessite `USE_MOCKS=true` (mode test, pas représentatif production).

### Comment forcer les providers réels ?

```env
USE_MOCKS=false
PRISM_USE_REAL_PROVIDERS=true
```

### Erreur « ElevenLabs API key not configured »

Normal si `ELEVENLABS_API_KEY` est absent ou vaut le placeholder `ta_clef_api_ici`. L'interface bascule sur le **TTS navigateur**. Configurer une clé ElevenLabs valide pour la synthèse premium.

### Erreur 401 / 403 des providers

- Vérifier la validité et les quotas des clés API.
- Vérifier que les clés ne sont pas expirées ou révoquées (historique de purge secrets : `docs/valuation/PRISM_04_SECRET_PURGE_HISTORY_REPORT.md`).

---

## 3. Utilisation

### Quelle URL pour l'interface corporate ?

```
http://localhost:3000/ui/prismVoiceChatV2-Corporate.html
```

### Le microphone ne fonctionne pas

- Autoriser l'accès micro dans le navigateur.
- Utiliser HTTPS ou `localhost` (requis par la Web Speech API sur certains navigateurs).
- Vérifier qu'aucune autre application n'utilise le micro.

### La réponse est lente

Comportement attendu si :

- **Consensus activé** (requête critique) — trois appels providers en parallèle, timeout 1–30 s selon chemin.
- **Providers réels** — latence réseau (GPT-4 peut dépasser 10 s selon charge).

Les benchmarks p50 ≈ 507 ms du README sont **historiques** et non garantis sous HEAD courant.

### HTTP 403 sur une requête critique

TrustContext bloque une décision non approuvée. Mots-clés déclencheurs : `DELETE`, `SHUTDOWN`, `RESET`, `DESTROY`, `FORMAT`, ou `taskType: critical`.

Voir [TRUSTCONTEXT_GOVERNANCE.md](../TRUSTCONTEXT_GOVERNANCE.md).

### L'export enterprise PDF ne répond pas

Le router enterprise est **importé mais non monté** dans `server.js`. Les routes `/api/export/enterprise-report` ne sont pas exposées par `npm start` par défaut. L'export PDF **conversation** (`/api/export/pdf`) fonctionne.

---

## 4. Tests et qualité

### Combien de tests passent avec `npm test` ?

**219/219** tests PASS sur le périmètre `vitest.config.core-only.js` (28 fichiers, ~65 s au 2026-06-13). Inclut property-based (`fast-check`), adversarial, audit, fuzz.

> Le README racine mentionne encore « 76/76 » — chiffre obsolète avant extension du périmètre core-only.

### Les tests legacy passent-ils ?

`npm run test:legacy` exécute les suites historiques en **quarantaine** (non bloquant CI). Des centaines d'échecs pré-existants sont documentés dans `docs/QUALITY.md`.

### Le typecheck bloque-t-il les commits ?

Non. `.husky/pre-commit` exécute `npm run typecheck` en **non-bloquant** (~511 erreurs TypeScript sur utilitaires JS). Seuls format, lint et `npm test` bloquent.

---

## 5. TRL et maturité

### Quel est le TRL réel de PRISM ?

**TRL 4 avancé**, avec démonstration partielle TRL 5 en staging contrôlé interne (consensus, TrustContext, journal cryptographique).

Autorité : [PRISM_02A_TRL_CLAIM_AUDIT.md](../valuation/PRISM_02A_TRL_CLAIM_AUDIT.md).

### PRISM est-il prêt pour la production enterprise ?

**Non en l'état documenté** :

- Pas d'authentification HTTP standard (JWT non branché sur `server.js`)
- Pas de multi-tenant
- Pas de KMS/HSM pour les clés Ed25519
- Pas de pilote utilisateur ni audit tiers
- Scalabilité multi-instance non démontrée (SQLite local, audit JSONL local)

### Les métriques du README (60k événements/h, 99.97 % uptime) sont-elles garanties ?

**Non.** Ce sont des valeurs historiques internes (sept. 2025) à rejouer. `/api/metrics` sert des **données démo statiques**, pas la production.

---

## 6. Sécurité

### Où sont stockés les secrets ?

Dans `.env` local (ignoré par git). Ne jamais committer de clés. Historique de purge : `docs/valuation/PRISM_04_*`.

### Les conversations sont-elles persistées ?

La table SQLite `prism_state (key, value)` est générique. La persistance conversationnelle complète n'est pas documentée comme garantie. Supabase est utilisé par des scripts optionnels (`manualMemoryInjector.js`), pas par le flux principal `server.js`.

### PRISM est-il conforme RGPD ?

**Non documenté** dans le périmètre audité. Toute affirmation de conformité serait prématurée.

### Que fait MoralLayer ?

Filtre éthique du contenu (blocage violence explicite, haine, etc.). Voir [moralLayer.md](../moralLayer.md).

---

## 7. Observabilité

### Comment accéder à Prometheus et Grafana ?

```bash
npm run start:monitoring
```

| Service | URL |
| --- | --- |
| Prometheus | `http://localhost:9091` |
| Grafana | `http://localhost:3002` |

> Le README racine indique Grafana sur le port 3001 — le compose actuel mappe **3002**.

### Où sont les métriques applicatives Node ?

Exporter interne : port **9100** (`monitoring/prismMetrics.js`). Endpoint applicatif démo : `GET /api/metrics` (données statiques).

---

## 8. Développement et contribution

### Où est la doc développeur ?

- [DEVELOPMENT.md](../developer/DEVELOPMENT.md)
- [CONTRIBUTING.md](../developer/CONTRIBUTING.md)
- [API_REFERENCE.md](../developer/API_REFERENCE.md)

### Quelle licence ?

**AGPL v3** — usage commercial nécessite une stratégie de licence dédiée. Voir [LICENSE](../../LICENSE).

---

## 9. Modules spéciaux

### Qu'est-ce que le module ASI ?

Code sous `asi/` (14 fichiers) — EventEmitter local, logs Winston. **Non importé** par `server.js`. Prototype parallèle, pas une fonctionnalité produit active.

### Qu'est-ce que prism_salesops ?

Package Python (ETL Excel, text2sql, dashboard Streamlit) sous `src/prism_salesops/`. **Découplé** du serveur Node principal.

### Comment lancer le healthcheck staging ?

`staging/docker-compose.yml` attend `GET /health`, présent dans `launch-prism-full-stack.js` mais **absent** de `server.js` seul. Utiliser `npm run start:full` ou aligner le compose.

---

## 10. Obtenir de l'aide

| Canal | Usage |
| --- | --- |
| GitHub Issues | Bugs avec étapes de reproduction |
| `docs/audit/PROJECT_DOCUMENTATION_STANDARD.md` | Référence technique cabinet |
| Security | Responsable disclosure uniquement — pas de clés dans les issues publiques |
