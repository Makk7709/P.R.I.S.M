# 🔍 AUDIT COMPLET - Task Types PRISM V2

**Date**: 2024-12-06  
**Version**: PRISM V2 Incubator  
**Objectif**: Identifier les incohérences et problèmes dans la gestion des Task Types

---

## 📊 RÉSUMÉ EXÉCUTIF

### ⚠️ Problèmes Critiques Identifiés

| Problème | Gravité | Impact |
|----------|---------|--------|
| **Incohérence des noms** | 🔴 CRITIQUE | `finance` vs `financial`, `strategie` vs `strategy` |
| **Mapping incomplet** | 🟠 ÉLEVÉ | Types détectés non gérés par `chooseModel()` |
| **Pas de validation centralisée** | 🟠 ÉLEVÉ | Chaque composant définit ses propres types |
| **Détection vs Sélection** | 🟡 MOYEN | `detectTaskType()` retourne des types différents du `<select>` |
| **Pas de documentation** | 🟡 MOYEN | Types non documentés, usage implicite |

---

## 🗺️ CARTE DES TASK TYPES

### 1. **Frontend - Select HTML** (`ui/prismVoiceChatV2-Corporate.html:1648`)

```html
<select id="taskTypeSelect">
  <option value="general">General</option>
  <option value="finance">Finance</option>
  <option value="recherche">Research</option>
  <option value="strategie">Strategy</option>
  <option value="marketing">Marketing</option>
  <option value="analyse">Analysis</option>
</select>
```

**Types disponibles**: `general`, `finance`, `recherche`, `strategie`, `marketing`, `analyse`

---

### 2. **Frontend - Détection Auto** (`ui/prismVoiceChatV2-Corporate.html:2448`)

```javascript
detectTaskType(message) {
  if (lowerMsg.includes('marketing') || ...) return 'marketing';
  if (lowerMsg.includes('finance') || ...) return 'financial';  // ⚠️ INCOHÉRENT
  if (lowerMsg.includes('email') || ...) return 'communication'; // ⚠️ NON GÉRÉ
  if (lowerMsg.includes('analyse') || ...) return 'analytics';   // ⚠️ INCOHÉRENT
  if (lowerMsg.includes('urgence') || ...) return 'urgent';       // ⚠️ NON GÉRÉ
  return 'general';
}
```

**Types détectés**: `marketing`, `financial`, `communication`, `analytics`, `urgent`, `general`

**🔴 PROBLÈME**: `financial` ≠ `finance`, `analytics` ≠ `analyse`, `communication` et `urgent` non gérés

---

### 3. **Backend - Choix de Modèle** (`backend/orchestrator.js:347`)

```javascript
function chooseModel(taskType) {
  switch (taskType) {
    case "marketing":
    case "finance":
    case "email":
      return "openai";
    case "strategie":
    case "analyse globale":
    case "ethique":
      return "claude";
    case "recherche":
    case "factuel":
    case "actualites":
    case "veille":
      return "perplexity";
    default:
      return "openai";
  }
}
```

**Types gérés**: `marketing`, `finance`, `email`, `strategie`, `analyse globale`, `ethique`, `recherche`, `factuel`, `actualites`, `veille`

**🔴 PROBLÈMES**:
- `analyse globale` n'est jamais sélectionné dans le frontend
- `ethique`, `factuel`, `actualites`, `veille` non disponibles dans le select
- `financial`, `analytics`, `communication`, `urgent` (détectés) → **NON GÉRÉS** → fallback sur OpenAI

---

### 4. **Backend - Voice Enhancer** (`backend/voicePersonalityEnhancer.js:206`)

```javascript
switch (taskType) {
  case 'technical':
  case 'creative':
  case 'analytical':
    // Configuration voix spécifique
}
```

**Types gérés**: `technical`, `creative`, `analytical`

**🔴 PROBLÈME**: Ces types ne sont **jamais** sélectionnés ou détectés ailleurs

---

### 5. **Orchestration - Agent Router** (`orchestration/agentRouter.js:19`)

```javascript
class TaskType {
  static RESEARCH = 'research';
  static ANALYSIS = 'analysis';
  static GENERATION = 'generation';
  static ETHICAL = 'ethical';
  static STRATEGIC = 'strategic';
  static CREATIVE = 'creative';
  static TECHNICAL = 'technical';
  static FACTUAL = 'factual';
}
```

**Types définis**: `research`, `analysis`, `generation`, `ethical`, `strategic`, `creative`, `technical`, `factual`

**🔴 PROBLÈME**: **Aucune correspondance** avec les types du frontend/backend principal

---

### 6. **Python Router** (`src/agent_router.py:56`)

```python
if context.task_type not in ["accuracy", "creativity", "strategy"]:
    raise ValueError(f"Invalid task type: {context.task_type}")
```

**Types gérés**: `accuracy`, `creativity`, `strategy`

**🔴 PROBLÈME**: **Aucune correspondance** avec le reste du système

---

## 🔴 INCOHÉRENCES DÉTAILLÉES

### Tableau de Correspondance

| Frontend Select | Détection Auto | Backend chooseModel | Agent Router | Python Router | Status |
|----------------|----------------|-------------------|--------------|---------------|--------|
| `general` | ✅ `general` | ✅ default | ❌ | ❌ | ✅ OK |
| `finance` | ❌ `financial` | ✅ `finance` | ❌ | ❌ | 🔴 **INCOHÉRENT** |
| `recherche` | ❌ | ✅ `recherche` | ✅ `research` | ❌ | 🟡 Partiel |
| `strategie` | ❌ | ✅ `strategie` | ✅ `strategic` | ✅ `strategy` | 🟡 Partiel |
| `marketing` | ✅ `marketing` | ✅ `marketing` | ❌ | ❌ | ✅ OK |
| `analyse` | ❌ `analytics` | ❌ `analyse globale` | ✅ `analysis` | ❌ | 🔴 **INCOHÉRENT** |
| - | ❌ `communication` | ✅ `email` | ❌ | ❌ | 🔴 **NON GÉRÉ** |
| - | ❌ `urgent` | ❌ | ❌ | ❌ | 🔴 **NON GÉRÉ** |
| - | ❌ | ✅ `ethique` | ✅ `ethical` | ❌ | 🟡 Partiel |
| - | ❌ | ✅ `factuel` | ✅ `factual` | ❌ | 🟡 Partiel |
| - | ❌ | ✅ `actualites` | ❌ | ❌ | 🟡 Partiel |
| - | ❌ | ✅ `veille` | ❌ | ❌ | 🟡 Partiel |
| - | ❌ | ❌ | ✅ `generation` | ❌ | 🔴 **NON GÉRÉ** |
| - | ❌ | ❌ | ✅ `creative` | ✅ `creativity` | 🔴 **NON GÉRÉ** |
| - | ❌ | ❌ | ✅ `technical` | ❌ | 🔴 **NON GÉRÉ** |

---

## 🐛 CAS D'USAGE PROBLÉMATIQUES

### Scénario 1: Utilisateur sélectionne "Finance"
```
1. Frontend envoie: taskType = "finance"
2. Backend chooseModel("finance") → ✅ "openai" (OK)
3. MAIS si détection auto active → retourne "financial" → ❌ fallback OpenAI
```

### Scénario 2: Utilisateur écrit "analyse des données"
```
1. Détection auto → "analytics"
2. Backend chooseModel("analytics") → ❌ NON GÉRÉ → fallback "openai"
3. Devrait être → "analyse" → Claude (meilleur pour analyse)
```

### Scénario 3: Utilisateur écrit "email urgent"
```
1. Détection auto → "urgent" (première détection) OU "communication" (si email détecté)
2. Backend chooseModel("urgent") → ❌ NON GÉRÉ → fallback "openai"
3. Backend chooseModel("communication") → ❌ NON GÉRÉ → fallback "openai"
4. Devrait être → "email" → OpenAI (correct)
```

---

## 📋 FLUX ACTUEL (avec bugs)

```
┌─────────────────┐
│  Frontend UI    │
│  <select>       │
│  "finance"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  detectTaskType │
│  → "financial"  │ ⚠️ INCOHÉRENT
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  sendMessage     │
│  taskType:      │
│  "financial"    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  server.js      │
│  taskType:      │
│  "financial"    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  chooseModel    │
│  ("financial")  │
│  → default      │ ⚠️ NON GÉRÉ
│  → "openai"     │
└─────────────────┘
```

---

## ✅ RECOMMANDATIONS

### 1. **Créer un fichier centralisé de définition** (`src/core/TaskTypes.js`)

```javascript
export const TaskType = {
  // Types principaux (UI)
  GENERAL: 'general',
  FINANCE: 'finance',
  MARKETING: 'marketing',
  STRATEGY: 'strategie',
  RESEARCH: 'recherche',
  ANALYSIS: 'analyse',
  
  // Types secondaires (backend)
  EMAIL: 'email',
  ETHICS: 'ethique',
  FACTUAL: 'factuel',
  NEWS: 'actualites',
  MONITORING: 'veille',
  
  // Types spéciaux
  CRITICAL: 'critical',
  URGENT: 'urgent',
  
  // Types techniques
  TECHNICAL: 'technical',
  CREATIVE: 'creative',
  ANALYTICAL: 'analytical',
};

// Mapping pour compatibilité
export const TaskTypeAliases = {
  'financial': TaskType.FINANCE,
  'analytics': TaskType.ANALYSIS,
  'communication': TaskType.EMAIL,
  'strategy': TaskType.STRATEGY,
  'research': TaskType.RESEARCH,
  'analysis': TaskType.ANALYSIS,
};
```

### 2. **Normaliser `detectTaskType()`**

```javascript
detectTaskType(message) {
  const lowerMsg = message.toLowerCase();
  
  // Mapping cohérent avec TaskType
  if (lowerMsg.includes('marketing') || ...) return TaskType.MARKETING;
  if (lowerMsg.includes('finance') || lowerMsg.includes('budget') || ...) return TaskType.FINANCE;
  if (lowerMsg.includes('email') || lowerMsg.includes('mail') || ...) return TaskType.EMAIL;
  if (lowerMsg.includes('analyse') || lowerMsg.includes('données') || ...) return TaskType.ANALYSIS;
  if (lowerMsg.includes('recherche') || lowerMsg.includes('search') || ...) return TaskType.RESEARCH;
  if (lowerMsg.includes('strategie') || lowerMsg.includes('strategy') || ...) return TaskType.STRATEGY;
  if (lowerMsg.includes('urgence') || lowerMsg.includes('urgent') || ...) return TaskType.URGENT;
  
  return TaskType.GENERAL;
}
```

### 3. **Normaliser `chooseModel()`**

```javascript
function chooseModel(taskType) {
  // Normaliser les alias
  const normalizedType = TaskTypeAliases[taskType] || taskType;
  
  switch (normalizedType) {
    case TaskType.MARKETING:
    case TaskType.FINANCE:
    case TaskType.EMAIL:
      return "openai";
    case TaskType.STRATEGY:
    case TaskType.ANALYSIS:
    case TaskType.ETHICS:
      return "claude";
    case TaskType.RESEARCH:
    case TaskType.FACTUAL:
    case TaskType.NEWS:
    case TaskType.MONITORING:
      return "perplexity";
    case TaskType.URGENT:
    case TaskType.CRITICAL:
      // Urgent → consensus (déjà géré par HybridOrchestrator)
      return "openai"; // Fallback rapide
    default:
      return "openai";
  }
}
```

### 4. **Mettre à jour le Select HTML**

```html
<select id="taskTypeSelect">
  <option value="general">General</option>
  <option value="finance">Finance</option>
  <option value="marketing">Marketing</option>
  <option value="strategie">Strategy</option>
  <option value="recherche">Research</option>
  <option value="analyse">Analysis</option>
  <option value="email">Email/Communication</option>
  <option value="ethique">Ethics</option>
  <option value="factuel">Factual</option>
  <option value="actualites">News</option>
  <option value="veille">Monitoring</option>
</select>
```

### 5. **Ajouter validation dans `server.js`**

```javascript
import { TaskType, TaskTypeAliases, validateTaskType } from './src/core/TaskTypes.js';

// Dans /api/chat
const { message, taskType = TaskType.GENERAL, ... } = req.body;

// Normaliser et valider
const normalizedTaskType = TaskTypeAliases[taskType] || taskType;
if (!validateTaskType(normalizedTaskType)) {
  console.warn(`[PRISM] Task type invalide: ${taskType}, utilisation de 'general'`);
  taskType = TaskType.GENERAL;
}
```

---

## 🎯 PLAN D'ACTION PRIORISÉ

### Phase 1: Quick Fix (1h)
1. ✅ Créer `src/core/TaskTypes.js` avec définitions centralisées
2. ✅ Normaliser `detectTaskType()` dans le frontend
3. ✅ Normaliser `chooseModel()` avec alias mapping

### Phase 2: Intégration (2h)
4. ✅ Mettre à jour le Select HTML avec tous les types
5. ✅ Ajouter validation dans `server.js`
6. ✅ Tester tous les scénarios

### Phase 3: Tests TDD (2h)
7. ✅ Créer tests unitaires pour `TaskTypes.js`
8. ✅ Tests d'intégration pour le flux complet
9. ✅ Tests de régression pour compatibilité

---

## 📊 MÉTRIQUES DE SUCCÈS

- ✅ **0 incohérence** entre frontend/backend
- ✅ **100% des types détectés** gérés par `chooseModel()`
- ✅ **Documentation complète** des types disponibles
- ✅ **Tests couvrant** tous les scénarios

---

## 🔗 FICHIERS À MODIFIER

1. `src/core/TaskTypes.js` (NOUVEAU)
2. `ui/prismVoiceChatV2-Corporate.html` (detectTaskType, select)
3. `backend/orchestrator.js` (chooseModel)
4. `server.js` (validation)
5. `tests/core/task-types.spec.ts` (NOUVEAU)

---

**Fin de l'audit**

