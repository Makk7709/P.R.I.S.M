# Guide utilisateur — PRISM

**Public cible** : utilisateurs corporate, analystes, décideurs exploitant l'interface chat et les exports.  
**Objectif** : décrire les fonctionnalités principales, leurs limites et le comportement attendu.

---

## 1. Vue d'ensemble produit

PRISM est un système de chat intelligent qui :

1. Reçoit une requête utilisateur (texte ou voix).
2. Route la requête selon le type de tâche (`taskType`) et la criticité.
3. Consulte un ou plusieurs fournisseurs LLM (OpenAI GPT-4, Anthropic Claude, Perplexity).
4. Applique un **consensus 2/3** pour les décisions critiques.
5. Peut exiger une **approbation humaine** via TrustContext.
6. Retourne une réponse texte et, si configuré, une synthèse vocale ElevenLabs.

**Positionnement honnête** : TRL 4 avancé — démonstration partielle TRL 5 sur les sous-systèmes consensus / TrustContext / journal cryptographique. Pas de garantie SLA production.

---

## 2. Interface chat vocal corporate

### 2.1 Accès

`http://localhost:3000/ui/prismVoiceChatV2-Corporate.html`

### 2.2 Fonctionnalités

| Fonctionnalité | Description |
| --- | --- |
| Chat texte | Saisie clavier, envoi vers `POST /api/chat` |
| Entrée vocale | Reconnaissance vocale navigateur ; paramètres `inputSource` et `voiceConfidence` transmis à l'API |
| Réponse vocale | ElevenLabs si clé configurée ; sinon TTS navigateur (`fallbackToTTS`) |
| Sélection de voix | Quatre profils documentés (Rachel, Adam, Antoni, Bella) via `voiceConfig` |
| Export PDF | Export de la conversation via `POST /api/export/pdf` |
| Génération d'image | Détection automatique ; appel `POST /api/generate-image` si demande d'image |

### 2.3 Modes d'entrée / réponse

L'API distingue :

- **Mode d'entrée** : `keyboard`, `voice`, `paste`
- **Mode de réponse** : texte seul ou texte + audio (`shouldPlayAudio`, `responseMode`)

Le `ResponseModeManager` adapte la génération audio selon la confiance vocale et la longueur du contenu.

---

## 3. Chat API — comportement

### 3.1 Requête type

```json
{
  "message": "Analysez ce scénario de fusion",
  "taskType": "finance",
  "model": "auto-select",
  "inputSource": "keyboard",
  "voiceConfig": { "voice": "Adam", "rate": 1.0 }
}
```

### 3.2 Types de tâche (`taskType`)

Exemples observés dans le code :

| taskType | Usage |
| --- | --- |
| `general` | Conversation standard (défaut) |
| `finance` | Analyses financières |
| `strategie` | Planification stratégique |
| `technique` | Contenu technique |
| `recherche` | Recherche et synthèse |
| `marketing` | Communication |
| `creative` | Contenu créatif |
| `critical` | Force le chemin critique (TrustContext + consensus) |

### 3.3 Requêtes critiques

Une requête est traitée comme **critique** si :

- `taskType === 'critical'`, ou
- le message contient des mots-clés : `DELETE`, `SHUTDOWN`, `RESET`, `DESTROY`, `FORMAT`.

Dans ce cas, TrustContext peut bloquer la réponse (HTTP 403) tant qu'une approbation humaine signée n'est pas obtenue.

### 3.4 Pipeline interne (résumé)

```text
/api/chat
  → TaskTypeProcessor (personas, mémoire, MoralLayer, InterDomainOrchestrator)
  → HybridOrchestrator (routage simple vs consensus 2/3)
  → Providers (OpenAI, Anthropic, Perplexity)
  → Enrichissement vocal (VoicePersonalityEnhancer)
  → Réponse JSON + audioUrl optionnel
```

---

## 4. Consensus multi-modèles

### 4.1 Principe

Pour les décisions classées critiques, `ConsensusManager` interroge trois adapters en parallèle et applique un **quorum 2/3** :

- 2 votes `approve` ou plus → décision approuvée
- Sinon → rejet ou abstention selon les votes et timeouts

Timeout consensus : **1000 ms** (configurable via `CONSENSUS_TIMEOUT_MS`).

### 4.2 Ce que l'utilisateur observe

- Latence plus élevée sur requêtes critiques
- Métadonnées `orchestrationMode` : `ROUTED` (simple) ou `CONSENSUS`
- En cas de timeout provider : gestion `abstain` / `unavailable`, fail-closed via schémas Zod

### 4.3 Limites

- Quorum 2/3 **hard-codé** — non configurable via l'UI
- Benchmarks latence historiques (README) : **non rejouables** sans clés API et campagne n ≥ 50
- Pas de garantie d'unanimité des modèles sur sujets ambigus

---

## 5. Personas et orchestration inter-domaines

### 5.1 InterDomainOrchestrator

Active des **personas** selon le domaine détecté (technique, stratégique, financier, recherche, marketing, créatif). La détection repose sur des mots-clés dans la requête et le `taskType`.

**Statut** : actif dans le pipeline `TaskTypeProcessor` ; effet visible sur le ton et l'orientation de la réponse, pas sur l'UI directement.

### 5.2 JarvisPersonality

Couche de personnalité conversationnelle intégrée au processeur. Comportement qualitatif — pas de réglage utilisateur documenté dans l'UI.

---

## 6. Upload et analyse Excel

### 6.1 Endpoints

| Méthode | Route | Action |
| --- | --- | --- |
| POST | `/api/chat/upload` | Upload fichier Excel/CSV + message |
| POST | `/api/chat/message` | Question de suivi sur fichier |
| GET | `/api/chat/context/:sessionId` | Contexte fichier de session |
| DELETE | `/api/chat/context/:sessionId` | Suppression contexte |
| GET | `/api/chat/stats` | Statistiques du processeur |

### 6.2 Usage

1. Fournir un `sessionId` unique.
2. Envoyer un fichier via `multipart/form-data` (champ `file`).
3. Optionnel : message d'accompagnement (« Analyse ce fichier »).

Formats supportés : Excel et CSV (validation via `backend/middleware/fileUpload.js`).

Voir aussi [EXCEL_ANALYSIS_MODULE.md](../EXCEL_ANALYSIS_MODULE.md).

---

## 7. Exports

### 7.1 Export PDF conversation (actif)

`POST /api/export/pdf` — génère un PDF à partir d'une liste de messages.

Options : titre, auteur, pages de garde, numéros de page, thèmes (`prism-corporate`, `prism-light`, `prism-executive`).

Prévisualisation : `POST /api/export/pdf/preview` (stats et estimation de pages).

### 7.2 Export Excel

Dépendances `exceljs` et `xlsx` présentes ; pipeline testé via `npm run test:excel`. Usage applicatif principal : module upload/analyse plutôt qu'export conversationnel générique.

### 7.3 Export Enterprise PDF (dormant côté API publique)

Le module `backend/routes/enterpriseExport.js` implémente :

- `POST /api/export/enterprise-report` (avec CSRF, rate-limit, sanitization)
- `GET /api/export/csrf-token`
- `GET /api/export/download/:fileId`
- `GET /api/export/status`

**Limitation** : ce router est importé dans `server.js` mais **non monté** (`app.use`). Disponible uniquement via tests ou montage manuel. Ne pas promettre cette fonctionnalité en production sans correction.

---

## 8. Génération d'images

| Endpoint | Rôle |
| --- | --- |
| `POST /api/generate-image` | Génère une image (Gemini + fallback fal.ai) |
| `POST /api/check-image-request` | Détecte si un message est une demande d'image |

Nécessite `GEMINI_API_KEY` et/ou `FAL_API_KEY` selon le provider utilisé.

---

## 9. Voix ElevenLabs

### 9.1 Configuration

Définir `ELEVENLABS_API_KEY` dans `.env`. Sans clé valide, l'interface utilise le TTS navigateur.

### 9.2 Endpoints voix

| Route | Description |
| --- | --- |
| `GET /api/voices` | Liste des voix disponibles |
| `GET /api/test-voice` | Test d'une voix (`voiceId`, `voiceName`) |
| `POST /api/set-voice` | Change la voix active |

### 9.3 Enrichissement contextuel

`VoicePersonalityEnhancer` adapte le texte avant synthèse (ton URGENT, BUSINESS, CASUAL). Bénéfice qualitatif interne — pas de métrique garantie en production.

---

## 10. MoralLayer — filtrage éthique

Contenus analysés avant réponse finale. Catégories : violence, haine, politique, santé mentale, etc.

| Statut | Comportement |
| --- | --- |
| Bloqué | Rejet immédiat |
| Surveillé | Marquage + log |
| Accepté | Traitement normal |

Détail : [moralLayer.md](../moralLayer.md).

---

## 11. Limites connues (honnêteté produit)

| Limite | Détail |
| --- | --- |
| TRL | 4 avancé — pas TRL 5 complet ni pilote client |
| Authentification HTTP | Pas de login utilisateur sur `server.js` |
| Multi-tenant | Non implémenté |
| Métriques `/api/metrics` | Données **démo statiques**, pas métriques temps réel |
| Module ASI (`asi/`) | Code présent, non branché au serveur principal |
| SalesOps Python | Package séparé sous `src/prism_salesops/` |
| Conformité RGPD / AI Act | Non documentée — à formaliser avec le porteur du projet |
| Performance | Objectifs README (p50, stress 60k/h) : historiques, à rejouer |

---

## 12. Documents liés

- [Premiers pas](./GETTING_STARTED.md)
- [FAQ](./FAQ.md)
- [Vue d'ensemble architecture](../architecture/OVERVIEW.md)
- [Référence API](../developer/API_REFERENCE.md)
- [Audit TRL](../valuation/PRISM_02A_TRL_CLAIM_AUDIT.md)
