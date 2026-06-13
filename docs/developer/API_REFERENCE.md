# Référence API HTTP — PRISM

**Public cible** : intégrateurs, développeurs frontend, testeurs.  
**Objectif** : documenter les routes exposées par `server.js` (source : code réel, HEAD `561bbf8`).

**Base URL** : `http://localhost:3000` (défaut `PORT=3000`)

---

## 1. Conventions

| Élément | Valeur |
| --- | --- |
| Format requête | JSON (`Content-Type: application/json`) sauf upload multipart |
| Format réponse | JSON sauf binaires (PDF, audio) |
| Authentification | **Aucune** sur `server.js` |
| CORS | Non configuré explicitement |

---

## 2. Chat

### POST `/api/chat`

Point d'entrée principal — orchestration complète (TaskTypeProcessor, HybridOrchestrator, voix).

**Corps (JSON)** :

| Champ | Type | Défaut | Description |
| --- | --- | --- | --- |
| `message` | string | — | Message utilisateur (requis) |
| `taskType` | string | `general` | Type de tâche (`finance`, `strategie`, `critical`, etc.) |
| `model` | string | `auto-select` | Modèle ou auto-sélection |
| `voiceConfig` | object | — | Configuration voix ElevenLabs |
| `inputSource` | string | `keyboard` | `keyboard`, `voice`, `paste` |
| `voiceConfidence` | number | null | Confiance reconnaissance vocale |
| `hasAttachment` | boolean | false | Fichier attaché |

**Réponse 200 (extrait)** :

```json
{
  "success": true,
  "content": "...",
  "model": "gpt-4.1",
  "responseTime": 1234,
  "audioUrl": "data:audio/mpeg;base64,...",
  "inputMode": "text",
  "responseMode": "voice",
  "shouldPlayAudio": true,
  "fallbackToTTS": false,
  "metadata": {}
}
```

**Réponse 403** : décision critique bloquée par TrustContext.

**Handler** : `backend/controllers/voiceChatController.js`.

---

## 3. Upload Excel (chat)

Préfixe monté : `app.use('/api/chat', chatUploadRouter)`.

### POST `/api/chat/upload`

Upload fichier Excel/CSV avec analyse.

**Corps** : `multipart/form-data`

| Champ | Requis | Description |
| --- | --- | --- |
| `file` | Oui | Fichier Excel/CSV |
| `sessionId` | Oui | Identifiant de session |
| `message` | Non | Message d'accompagnement |
| `inputSource` | Non | Source entrée |
| `voiceConfidence` | Non | Confiance vocale |

**Réponse** : `{ success, data: { response, analysis, fileContext, metadata } }`

### POST `/api/chat/message`

Question de suivi sur un fichier déjà uploadé.

**Corps JSON** : `sessionId`, `message`, options voix.

### GET `/api/chat/context/:sessionId`

Récupère le contexte fichier d'une session.

### DELETE `/api/chat/context/:sessionId`

Supprime le contexte fichier.

### GET `/api/chat/stats`

Statistiques du processeur de fichiers.

---

## 4. Voix ElevenLabs

### GET `/api/test-voice`

Teste une voix.

**Query** : `voiceId`, `voiceName`

**Réponse** : `{ success, audioUrl?, error? }`

### GET `/api/voices`

Liste les voix ElevenLabs disponibles.

### POST `/api/set-voice`

Change la voix active.

**Corps JSON** : configuration voix.

---

## 5. Export PDF conversation

### POST `/api/export/pdf`

Génère et télécharge un PDF de conversation.

**Corps JSON** :

```json
{
  "messages": [
    { "role": "user", "content": "...", "timestamp": "2026-06-13T10:00:00Z" }
  ],
  "options": {
    "title": "Conversation PRISM",
    "author": "PRISM User",
    "includeCoverPage": true,
    "includePageNumbers": true
  }
}
```

**Réponse** : binaire `application/pdf` (attachment).

### POST `/api/export/pdf/preview`

Prévisualisation stats avant export.

**Corps** : `{ "messages": [...] }`

**Réponse** :

```json
{
  "success": true,
  "stats": {},
  "estimatedPages": 5,
  "themes": ["prism-corporate", "prism-light", "prism-executive"]
}
```

---

## 6. Génération d'images

### POST `/api/generate-image`

**Corps JSON** :

```json
{
  "prompt": "Description de l'image",
  "taskType": "general",
  "options": { "previousMessages": [] }
}
```

**Réponse 200** :

```json
{
  "success": true,
  "imageUrl": "...",
  "downloadUrl": "...",
  "metadata": {}
}
```

### POST `/api/check-image-request`

**Corps** : `{ "message": "..." }`

**Réponse** : `{ "success": true, "isImageRequest": boolean }`

---

## 7. Métriques démo

### GET `/api/metrics`

Retourne des métriques **statiques de démonstration** (revenue, users, uptime, latency, etc.).

**Note** : ne pas utiliser comme source de vérité production. Pour Prometheus, voir exporter port 9100.

---

## 8. Pages statiques (GET)

| Route | Fichier servi |
| --- | --- |
| `/` | `index.html` (racine) |
| `/corporate` | `index-corporate.html` |
| `/investor` | `demo/investor-dashboard/index.html` |
| `/ui/*` | Fichiers statiques `ui/` |

Interface chat corporate : `/ui/prismVoiceChatV2-Corporate.html`

---

## 9. Export Enterprise — NON MONTÉ par défaut

Le router `enterpriseExportRouter` est **importé** dans `server.js` (l.54-60) mais **jamais monté** via `app.use()`.

Les routes suivantes existent dans `backend/routes/enterpriseExport.js` et sont testées via `__tests_legacy__/backend/api/enterpriseExport.test.js` avec montage manuel sur `/api/export` :

| Méthode | Route attendue | Description |
| --- | --- | --- |
| GET | `/api/export/csrf-token` | Token CSRF |
| POST | `/api/export/enterprise-report` | Génération rapport enterprise PDF |
| GET | `/api/export/download/:fileId` | Téléchargement fichier généré |
| GET | `/api/export/status` | Statut service |

**Pour activer** (exemple développement) :

```javascript
if (enterpriseExportRouter) {
  app.use('/api/export', enterpriseExportRouter);
}
```

POST `/api/export/enterprise-report` requiert : CSRF token, rate-limit, validation Joi, payload ≤ 10 Mo.

---

## 10. Routes alternatives (`launch-prism-full-stack.js`)

Non exposées par `npm start` seul :

| Route | Description |
| --- | --- |
| `GET /health` | Healthcheck |
| `GET /api/health` | Healthcheck API |

Utiliser `npm run start:full` pour ces endpoints.

---

## 11. Codes d'erreur courants

| Code | Cause typique |
| --- | --- |
| 400 | Corps JSON invalide, champ requis manquant |
| 403 | TrustContext — décision critique non approuvée |
| 422 | Export enterprise — contenu non adapté (si router monté) |
| 500 | Erreur provider, génération PDF/image, exception interne |

---

## 12. Exemples curl

```bash
# Chat simple
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Bonjour","taskType":"general"}'

# Preview PDF
curl -X POST http://localhost:3000/api/export/pdf/preview \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Test","timestamp":"2026-06-13T10:00:00Z"}]}'

# Métriques démo
curl http://localhost:3000/api/metrics
```

---

## 13. Documents liés

- [Guide utilisateur](../user/USER_GUIDE.md)
- [Vue d'ensemble architecture](../architecture/OVERVIEW.md)
- [TDD_EnterpriseExportAPI.md](../TDD_EnterpriseExportAPI.md)
- [EXCEL_ANALYSIS_MODULE.md](../EXCEL_ANALYSIS_MODULE.md)
