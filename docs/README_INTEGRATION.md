# �� PRISM v2 – Guide d'intégration Express

Bienvenue ! Ce document vous permet de faire tourner PRISM localement ou sur votre infra en moins de **5 minutes**.

---
## 1. Pré-requis

| Outil | Version recommandée |
|-------|--------------------|
| Node  | ≥ 16.x (LTS 18.x recommandé) |
| npm   | ≥ 8.x |
| Git   | ≥ 2.40 |
| Docker *(optionnel)* | ≥ 24.x |

---
## 2. Variables d'environnement essentielles

Créez un fichier `.env` (ou exportez dans votre CI) :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Clé OpenAI | `sk-***` |
| `ANTHROPIC_API_KEY` | Clé Claude | `claude-***` |
| `PERPLEXITY_API_KEY` | Clé Perplexity | `px-***` |
| `ELEVENLABS_API_KEY` | Clé TTS ElevenLabs | `e11-***` |
| `PRISM_UI_MODE` | UI `standard` \| `corporate` | `corporate` |
| `LOG_LEVEL` | `info` \| `debug` \| `error` | `debug` |
| `PORT` | Port HTTP principal | `3000` |

*(Toutes les variables optionnelles sont listées dans `env.example`)*

---
## 3. Installation & lancement

```bash
# 1. Cloner
$ git clone https://github.com/your-org/prism.git && cd prism

# 2. Dépendances
$ npm install

# 3. Lancer en mode dev
$ npm run dev
# => http://localhost:3000
```

Pour exécuter la batterie de tests :
```bash
npm test           # toutes les suites
npm run lint       # ESLint / format
```

---
## 4. Endpoints HTTP principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST`  | `/api/chat` | Dialogue avec moteur Korev (anciennement PRISM) |
| `GET`   | `/metrics`  | Expose toutes les métriques Prometheus (port 9100 par défaut) |
| `GET`   | `/status`   | Healthcheck JSON |

### Exemple rapide (cURL)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello, Prism!"}'
```

Réponse attendue :
```json
{
  "reply": "Hello! How can I help you today?",
  "model": "gpt-4.1",
  "latencyMs": 1234
}
```

---
## 5. Observabilité

1. **Prometheus** : scrape `http://localhost:9100/metrics`
2. **Grafana** : Importer le dashboard JSON présent dans `grafana/prism_dashboard.json`
3. **Logs** : dossier `logs/` (format winston, rotation quotidienne)

---
## 6. Déploiement production (TL;DR)

```bash
# Build image
docker build -t prism:latest .

# Run
docker run -d -p 3000:3000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  --name prism \
  prism:latest
```

Pour un cluster K8s, voir `k8s/` (chart Helm fourni).

---
## 7. Test de fumée post-déploiement

```bash
npm run validate:all   # unit + coverage ≥ 95 %
```

Vous êtes maintenant prêt à explorer PRISM 🚀

---
*Dernière mise à jour : 2025-06-25* 