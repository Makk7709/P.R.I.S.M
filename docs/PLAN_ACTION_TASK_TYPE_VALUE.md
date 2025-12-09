# 🎯 PLAN D'ACTION - Donner une VRAIE Valeur au Sélecteur Task Type

**Date**: 2024-12-06  
**Objectif**: Transformer le sélecteur Task Type d'un simple filtre en un **outil de productivité réel** qui améliore concrètement l'expérience utilisateur.

---

## 📊 ÉTAT ACTUEL (Valeur Limitée)

### Ce qui existe aujourd'hui :
- ✅ Sélection du modèle (OpenAI/Claude/Perplexity)
- ✅ Adaptation voix (mode/émotion)
- ✅ Cache par type
- ❌ **Pas de prompts spécialisés**
- ❌ **Pas de format de réponse adapté**
- ❌ **Pas de paramètres optimisés (température, tokens)**
- ❌ **Pas de templates de réponse**
- ❌ **Pas de feedback visuel de l'impact**

### Problème :
**L'utilisateur ne voit AUCUNE différence** entre sélectionner "Finance" ou "General" → Le sélecteur semble inutile.

---

## 🚀 VALEUR PROPOSÉE - 5 Axes d'Amélioration

### 1. **PROMPTS SPÉCIALISÉS** (Impact: ⭐⭐⭐⭐⭐)
Chaque Task Type a un **prompt système optimisé** qui guide l'IA vers le bon format et style.

### 2. **FORMAT DE RÉPONSE ADAPTÉ** (Impact: ⭐⭐⭐⭐⭐)
Les réponses sont **formatées différemment** selon le type (tableaux pour finance, bullet points pour stratégie, etc.)

### 3. **PARAMÈTRES OPTIMISÉS** (Impact: ⭐⭐⭐⭐)
Température, max_tokens, et autres paramètres **adaptés au type de tâche**.

### 4. **TEMPLATES & STRUCTURE** (Impact: ⭐⭐⭐⭐)
Chaque type a des **templates de réponse** pour garantir la cohérence.

### 5. **FEEDBACK VISUEL** (Impact: ⭐⭐⭐)
L'interface montre **clairement** l'impact du sélection (modèle choisi, format attendu, etc.)

---

## 📋 PLAN D'ACTION DÉTAILLÉ

### **PHASE 1: Prompts Spécialisés** (Valeur Immédiate)

#### Objectif
Chaque Task Type a un **prompt système** qui guide l'IA vers le bon style et format.

#### Implémentation

**Créer `src/core/TaskTypePrompts.js`** :

```javascript
export const TaskTypePrompts = {
  general: {
    system: `Tu es PRISM, une IA avancée. Réponds de manière concise, professionnelle et utile.`,
    temperature: 0.7,
    maxTokens: 1000
  },
  
  finance: {
    system: `Tu es PRISM, expert en finance et analyse financière. 
    
    RÈGLES STRICTES:
    - Toujours structurer les réponses avec des sections claires
    - Utiliser des tableaux pour les données chiffrées
    - Mentionner les risques et opportunités
    - Citer des sources si données factuelles
    - Format: Résumé → Analyse → Recommandations
    
    Exemple de structure:
    ## 📊 Analyse Financière
    | Métrique | Valeur | Évolution |
    |----------|--------|-----------|
    | ... | ... | ... |
    
    ## ⚠️ Risques Identifiés
    - ...
    
    ## 💡 Recommandations
    1. ...`,
    temperature: 0.3, // Plus précis pour la finance
    maxTokens: 2000,  // Plus long pour analyses détaillées
    format: 'structured' // Force structure
  },
  
  marketing: {
    system: `Tu es PRISM, expert en marketing et communication.
    
    RÈGLES:
    - Ton créatif et engageant
    - Utiliser des emojis pertinents (modérément)
    - Proposer des actions concrètes
    - Format: Hook → Proposition → CTA
    
    Exemple:
    🎯 Objectif: ...
    💡 Stratégie: ...
    📈 Actions: ...`,
    temperature: 0.8, // Plus créatif
    maxTokens: 1500,
    format: 'creative'
  },
  
  strategie: {
    system: `Tu es PRISM, expert en stratégie et planification.
    
    RÈGLES:
    - Analyse multi-niveaux (court/moyen/long terme)
    - Considérer les alternatives
    - Format structuré avec priorités
    
    Exemple:
    ## 🎯 Vision Stratégique
    ### Court terme (0-3 mois)
    - ...
    ### Moyen terme (3-12 mois)
    - ...
    ### Long terme (12+ mois)
    - ...
    
    ## ⚖️ Alternatives
    1. Option A: ...
    2. Option B: ...
    
    ## 🏆 Recommandation
    ...`,
    temperature: 0.5, // Équilibre créativité/précision
    maxTokens: 2500,
    format: 'strategic'
  },
  
  recherche: {
    system: `Tu es PRISM, expert en recherche et veille informationnelle.
    
    RÈGLES:
    - Toujours citer les sources
    - Distinguer faits vs opinions
    - Format chronologique si actualités
    - Indiquer la date des informations
    
    Exemple:
    ## 📚 Sources
    - Source 1 (Date: ...)
    - Source 2 (Date: ...)
    
    ## ✅ Faits Vérifiés
    - ...
    
    ## 💭 Analyses/Opinions
    - ...`,
    temperature: 0.2, // Très factuel
    maxTokens: 2000,
    format: 'factual'
  },
  
  analyse: {
    system: `Tu es PRISM, expert en analyse de données et intelligence décisionnelle.
    
    RÈGLES:
    - Présenter les données visuellement (tableaux, listes)
    - Identifier les tendances et patterns
    - Proposer des insights actionnables
    - Format: Données → Analyse → Insights
    
    Exemple:
    ## 📊 Données
    | ... | ... |
    
    ## 📈 Tendances Identifiées
    - ...
    
    ## 💡 Insights Actionnables
    1. ...`,
    temperature: 0.4,
    maxTokens: 2000,
    format: 'analytical'
  }
};
```

#### Intégration dans `backend/orchestrator.js` :

```javascript
import { TaskTypePrompts } from '../src/core/TaskTypePrompts.js';

async function callOpenAI(userInput, taskType = 'general', skipContext = false) {
  const taskConfig = TaskTypePrompts[taskType] || TaskTypePrompts.general;
  
  const systemPrompt = skipContext 
    ? taskConfig.system
    : taskConfig.system + (contextSummary ? `\n\n## 📊 CONTEXTE RÉCENT\n${contextSummary}` : '');
  
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1',
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ],
    max_tokens: taskConfig.maxTokens,
    temperature: taskConfig.temperature,
  });
  
  return completion;
}
```

#### Impact Utilisateur :
- ✅ Réponses **structurées** et **cohérentes** selon le type
- ✅ Format **adapté** (tableaux finance, bullet points stratégie)
- ✅ Style **professionnel** pour chaque domaine

---

### **PHASE 2: Format de Réponse Adapté** (Valeur Immédiate)

#### Objectif
Transformer les réponses brutes en **formats visuellement adaptés** selon le Task Type.

#### Implémentation

**Créer `src/core/ResponseFormatter.js`** :

```javascript
export class ResponseFormatter {
  static format(response, taskType) {
    const taskConfig = TaskTypePrompts[taskType] || TaskTypePrompts.general;
    
    switch (taskConfig.format) {
      case 'structured':
        return this.formatStructured(response);
      case 'creative':
        return this.formatCreative(response);
      case 'strategic':
        return this.formatStrategic(response);
      case 'factual':
        return this.formatFactual(response);
      case 'analytical':
        return this.formatAnalytical(response);
      default:
        return response;
    }
  }
  
  static formatStructured(text) {
    // Détecter les tableaux et les formater en Markdown
    // Détecter les listes et les structurer
    // Ajouter des sections si manquantes
    return text; // Version améliorée
  }
  
  static formatCreative(text) {
    // Ajouter des emojis pertinents
    // Structurer avec hooks et CTAs
    return text;
  }
  
  // ... autres formats
}
```

#### Impact Utilisateur :
- ✅ Réponses **visuellement cohérentes**
- ✅ **Plus faciles à lire** et comprendre
- ✅ **Prêtes à partager** (format professionnel)

---

### **PHASE 3: Paramètres Optimisés** (Valeur Technique)

#### Objectif
Adapter **température, tokens, et autres paramètres** selon le type de tâche.

#### Implémentation

Déjà inclus dans `TaskTypePrompts.js` (voir Phase 1).

**Exemples concrets** :
- **Finance** : `temperature: 0.3` (précision) + `maxTokens: 2000` (détails)
- **Marketing** : `temperature: 0.8` (créativité) + `maxTokens: 1500` (concis)
- **Recherche** : `temperature: 0.2` (factuel) + `maxTokens: 2000` (sources)

#### Impact Utilisateur :
- ✅ Réponses **plus précises** pour finance/recherche
- ✅ Réponses **plus créatives** pour marketing
- ✅ **Coût optimisé** (tokens adaptés)

---

### **PHASE 4: Templates & Structure** (Valeur Long Terme)

#### Objectif
Chaque Task Type a des **templates de réponse** pour garantir la cohérence.

#### Implémentation

**Créer `src/core/TaskTypeTemplates.js`** :

```javascript
export const TaskTypeTemplates = {
  finance: {
    structure: [
      '## 📊 Analyse Financière',
      '| Métrique | Valeur | Évolution |',
      '|----------|--------|-----------|',
      '## ⚠️ Risques Identifiés',
      '## 💡 Recommandations'
    ],
    placeholders: {
      metrics: 'À remplir par l\'IA',
      risks: 'À identifier par l\'IA',
      recommendations: 'À proposer par l\'IA'
    }
  },
  
  marketing: {
    structure: [
      '🎯 Objectif',
      '💡 Stratégie',
      '📈 Actions Concrètes',
      '🎨 Éléments Créatifs',
      '📊 Métriques de Succès'
    ]
  },
  
  // ... autres templates
};
```

#### Impact Utilisateur :
- ✅ Réponses **toujours structurées** de la même manière
- ✅ **Facilite la comparaison** entre sessions
- ✅ **Prêtes pour export** (PDF, etc.)

---

### **PHASE 5: Feedback Visuel** (Valeur UX)

#### Objectif
L'interface montre **clairement** l'impact du sélection.

#### Implémentation

**Modifier `ui/prismVoiceChatV2-Corporate.html`** :

```html
<!-- Badge d'information Task Type -->
<div class="prism-task-info" id="taskTypeInfo" style="display: none;">
  <span class="prism-task-badge" id="taskTypeBadge"></span>
  <span class="prism-task-details" id="taskTypeDetails"></span>
</div>

<script>
  // Mettre à jour lors du changement de sélection
  taskTypeSelect.addEventListener('change', (e) => {
    const taskType = e.target.value;
    const config = TaskTypePrompts[taskType] || TaskTypePrompts.general;
    
    // Afficher le badge
    taskTypeBadge.textContent = `${taskType.toUpperCase()} Mode`;
    taskTypeDetails.textContent = `Modèle: ${chooseModel(taskType)} | Format: ${config.format} | Température: ${config.temperature}`;
    taskTypeInfo.style.display = 'block';
    
    // Animation
    taskTypeInfo.classList.add('prism-fade-in');
  });
</script>
```

#### Impact Utilisateur :
- ✅ **Compréhension immédiate** de l'impact
- ✅ **Confiance** dans le système
- ✅ **Apprentissage** des différences entre types

---

## 📊 MATRICE DE VALEUR

| Amélioration | Effort | Impact Utilisateur | Priorité |
|--------------|--------|-------------------|----------|
| **Prompts Spécialisés** | 3h | ⭐⭐⭐⭐⭐ | 🔴 **HAUTE** |
| **Format de Réponse** | 4h | ⭐⭐⭐⭐⭐ | 🔴 **HAUTE** |
| **Paramètres Optimisés** | 1h | ⭐⭐⭐⭐ | 🟠 **MOYENNE** |
| **Templates** | 5h | ⭐⭐⭐⭐ | 🟡 **BASSE** |
| **Feedback Visuel** | 2h | ⭐⭐⭐ | 🟠 **MOYENNE** |

---

## 🎯 PLAN D'IMPLÉMENTATION RECOMMANDÉ

### **Itération 1: Quick Win** (1 journée)
1. ✅ Créer `TaskTypePrompts.js` avec 3 types principaux (finance, marketing, strategie)
2. ✅ Intégrer dans `callOpenAI()` et `callClaude()`
3. ✅ Ajouter feedback visuel basique
4. ✅ Tests TDD

**Résultat** : L'utilisateur voit **immédiatement** la différence entre les types.

### **Itération 2: Format & Structure** (1 journée)
1. ✅ Créer `ResponseFormatter.js`
2. ✅ Implémenter formatage pour finance (tableaux) et marketing (créatif)
3. ✅ Améliorer feedback visuel
4. ✅ Tests TDD

**Résultat** : Réponses **visuellement adaptées** et **professionnelles**.

### **Itération 3: Complétude** (1 journée)
1. ✅ Ajouter tous les types manquants
2. ✅ Implémenter templates
3. ✅ Optimiser paramètres pour tous les types
4. ✅ Documentation utilisateur

**Résultat** : Système **complet** et **production-ready**.

---

## 📈 MÉTRIQUES DE SUCCÈS

### Avant (État Actuel)
- ❌ Utilisateur ne voit **aucune différence** entre types
- ❌ Sélecteur perçu comme **inutile**
- ❌ Réponses **génériques** pour tous les types

### Après (Objectif)
- ✅ Utilisateur voit **immédiatement** la différence
- ✅ Sélecteur perçu comme **essentiel**
- ✅ Réponses **spécialisées** et **adaptées**
- ✅ **+30% satisfaction** utilisateur (mesure à définir)

---

## 🔗 FICHIERS À CRÉER/MODIFIER

### Nouveaux Fichiers
1. `src/core/TaskTypePrompts.js` (NOUVEAU)
2. `src/core/ResponseFormatter.js` (NOUVEAU)
3. `src/core/TaskTypeTemplates.js` (NOUVEAU - Phase 3)
4. `tests/core/task-type-prompts.spec.ts` (NOUVEAU)
5. `tests/core/response-formatter.spec.ts` (NOUVEAU)

### Fichiers à Modifier
1. `backend/orchestrator.js` (intégrer TaskTypePrompts)
2. `ui/prismVoiceChatV2-Corporate.html` (feedback visuel)
3. `server.js` (passer taskType aux fonctions)

---

## 💡 EXEMPLES CONCRETS

### Exemple 1: Finance
**Avant** :
```
"Le budget est de 100k. Tu peux analyser les coûts."
```

**Après** (avec Task Type "Finance") :
```
## 📊 Analyse Financière

| Métrique | Valeur | Évolution |
|----------|--------|-----------|
| Budget Total | 100,000 € | - |
| Coûts Opérationnels | 60,000 € | +5% vs mois précédent |
| Marge | 40,000 € | -5% vs mois précédent |

## ⚠️ Risques Identifiés
- Augmentation des coûts opérationnels (+5%)
- Réduction de la marge (-5%)

## 💡 Recommandations
1. Réduire les coûts opérationnels de 10% pour rétablir la marge
2. Optimiser les processus pour améliorer l'efficacité
3. Surveiller les tendances sur les 3 prochains mois
```

### Exemple 2: Marketing
**Avant** :
```
"Crée une campagne pour notre produit."
```

**Après** (avec Task Type "Marketing") :
```
🎯 Objectif
Lancer une campagne engageante pour [Produit] visant à augmenter la notoriété de 30% en 3 mois.

💡 Stratégie
- Cibler les 25-45 ans, actifs, intéressés par [domaine]
- Utiliser les réseaux sociaux (Instagram, LinkedIn)
- Partenariats avec influenceurs micro-niches

📈 Actions Concrètes
1. Créer 10 posts Instagram avec visuels cohérents
2. Lancer 3 vidéos courtes (Reels/TikTok)
3. Partenariat avec 5 influenceurs (10k-100k followers)
4. Landing page dédiée avec CTA clair

🎨 Éléments Créatifs
- Palette: [couleurs]
- Ton: [ton]
- Messages clés: [messages]

📊 Métriques de Succès
- Engagement: +50%
- Conversions: +20%
- ROI: 3:1 minimum
```

---

## ✅ CONCLUSION

Ce plan transforme le sélecteur Task Type d'un **simple filtre** en un **outil de productivité réel** qui :

1. ✅ **Améliore la qualité** des réponses (prompts spécialisés)
2. ✅ **Adapte le format** (visuellement cohérent)
3. ✅ **Optimise les paramètres** (précision vs créativité)
4. ✅ **Garantit la cohérence** (templates)
5. ✅ **Montre l'impact** (feedback visuel)

**L'utilisateur verra IMMÉDIATEMENT la valeur** du sélecteur.

---

**Fin du Plan d'Action**

