# Premiers pas — PRISM

**Public cible** : utilisateurs finaux, intégrateurs, équipes ops.  
**Objectif** : installer PRISM, configurer l'environnement et accéder aux interfaces.

---

## 1. Prérequis

| Élément | Version / détail |
| --- | --- |
| Node.js | ≥ 16 (recommandé 18+) |
| npm | Fourni avec Node.js |
| Clés API | OpenAI, Anthropic, Perplexity (obligatoires pour le chat réel) |
| Clé ElevenLabs | Optionnelle — synthèse vocale premium |
| Docker | Optionnel — stack monitoring Prometheus / Grafana |

---

## 2. Installation

### 2.1 Cloner le dépôt

```bash
git clone https://github.com/Makk7709/P.R.I.S.M.git
cd P.R.I.S.M
```

### 2.2 Installer les dépendances

```bash
npm install
```

Le fichier `.npmrc` active `legacy-peer-deps=true` pour résoudre un conflit de peer dependency `zod` entre OpenAI SDK et les contrats internes.

---

## 3. Configuration de l'environnement

### 3.1 Fichier `.env`

Copier le template canonique :

```bash
cp .env.example .env
```

> **Attention** : un fichier `env.example` (racine) existe également ; il est plus court et legacy. Utiliser **`.env.example`** comme référence complète (53 variables documentées dans `docs/valuation/PRISM_03_SECRET_AND_ENV_REGISTER.md`).

### 3.2 Variables essentielles

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Oui (chat réel) | Clé API OpenAI |
| `ANTHROPIC_API_KEY` | Oui (consensus) | Clé API Anthropic |
| `PERPLEXITY_API_KEY` | Oui (consensus) | Clé API Perplexity |
| `ELEVENLABS_API_KEY` | Non | Synthèse vocale premium ; sans clé → TTS navigateur |
| `PORT` | Non | Port HTTP (défaut `3000`) |
| `NODE_ENV` | Non | `development` ou `production` |
| `USE_MOCKS` | Non | `false` pour forcer les providers réels |
| `PRISM_USE_REAL_PROVIDERS` | Non | Active les adapters réels côté consensus |

Exemple minimal :

```env
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
ELEVENLABS_API_KEY=sk-...          # optionnel
USE_MOCKS=false
```

### 3.3 Variables avancées (optionnelles)

| Variable | Usage |
| --- | --- |
| `DATABASE_PATH` | Chemin SQLite (défaut `data/prism.db`) |
| `TRUSTCONTEXT_KEYREGISTRY_PATH` | Registre clés Ed25519 |
| `GEMINI_API_KEY`, `FAL_API_KEY` | Génération d'images |
| `SUPABASE_URL`, `SUPABASE_API_KEY` | Scripts mémoire / setup DB (hors flux principal `server.js`) |
| `METRICS_PORT` / `PROMETHEUS_PORT` | Exporter métriques (défaut interne `9100`) |

Ne jamais committer de secrets : `.env` est ignoré par `.gitignore`.

---

## 4. Démarrage du service

### 4.1 Serveur principal

```bash
npm start
# équivalent : node server.js
```

Sortie attendue (extrait) :

```text
🚀 Serveur PRISM avec ElevenLabs démarré
✨ Interface disponible sur: http://localhost:3000
🎤 API Chat: http://localhost:3000/api/chat
```

### 4.2 Mode développement (rechargement auto)

```bash
npm run dev
```

### 4.3 Stack complète (alternative)

```bash
npm run start:full
```

Lance `launch-prism-full-stack.js`, qui expose notamment `GET /health` (absent de `server.js` seul). Utile pour les healthchecks staging.

---

## 5. Interfaces utilisateur

### 5.1 Chat vocal corporate (recommandé)

```
http://localhost:3000/ui/prismVoiceChatV2-Corporate.html
```

Interface premium (design corporate noir/doré) avec chat texte/vocal, export PDF et intégration ElevenLabs.

### 5.2 Chat vocal standard

```
http://localhost:3000/ui/prismVoiceChatV2.html
```

### 5.3 Pages statiques

| URL | Contenu |
| --- | --- |
| `http://localhost:3000/` | Page d'accueil |
| `http://localhost:3000/corporate` | Dashboard corporate (`index-corporate.html`) |
| `http://localhost:3000/investor` | Dashboard investisseur (`demo/investor-dashboard/`) |

### 5.4 Dashboard Next.js (séparé)

Le dashboard métriques (`dashboard/`) est une application Next.js 14 indépendante :

```bash
cd dashboard
npm install
npm run dev    # port Next.js par défaut 3000 — ajuster si conflit avec server.js
```

Non démarré automatiquement par `npm start`.

---

## 6. Monitoring (optionnel)

```bash
npm run start:monitoring
```

Démarre via `docker-compose-monitoring.yml` :

| Service | URL locale |
| --- | --- |
| Prometheus | `http://localhost:9091` |
| Grafana | `http://localhost:3002` (admin / mot de passe défaut dans le compose) |

L'exporter métriques Node écoute par défaut sur le port **9100** (`monitoring/prismMetrics.js`).

---

## 7. Vérification rapide

```bash
# Santé applicative (métriques démo — données statiques)
curl http://localhost:3000/api/metrics

# Test chat (nécessite clés API)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Bonjour PRISM","taskType":"general"}'
```

---

## 8. Prochaines étapes

- [Guide utilisateur](./USER_GUIDE.md) — fonctionnalités détaillées
- [FAQ](./FAQ.md) — dépannage et limites
- [Référence API](../developer/API_REFERENCE.md) — endpoints HTTP

---

## 9. Limites connues à l'installation

- **TRL 4 avancé** : pas de pilote utilisateur ni déploiement production certifié.
- **Providers réels** : sans clés API valides, le consensus et le chat échouent ou basculent sur des mocks selon la configuration.
- **Export enterprise PDF** : le router `enterpriseExport` est présent dans le code mais **non monté** dans `server.js` par défaut.
- **Healthcheck** : `GET /health` n'est pas exposé par `server.js` seul ; utiliser `launch-prism-full-stack.js` ou `npm run start:full`.

Voir [DOCUMENTATION_GAP_AUDIT.md](../audit/DOCUMENTATION_GAP_AUDIT.md) pour l'inventaire complet.
