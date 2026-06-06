import { OpenAI } from "openai";
import { loadContextSnapshots, formatContextForPrompt } from './contextMemory.js';
import { VoicePersonalityEnhancer } from './voicePersonalityEnhancer.js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// ✨ Initialiser l'amélioration vocale pour plus d'expressivité
const voiceEnhancer = new VoicePersonalityEnhancer();

// Vérifier les clés API
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test_openai_key_placeholder') {
  console.warn('[PRISM] ⚠️  Clé OpenAI manquante ou placeholeder - les appels OpenAI échoueront');
}

if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'test_anthropic_key_placeholder') {
  console.warn('[PRISM] ⚠️  Clé Anthropic manquante ou placeholder - les appels Claude échoueront');
}

if (!process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY === 'test_perplexity_key_placeholder') {
  console.warn('[PRISM] ⚠️  Clé Perplexity manquante ou placeholder - les appels Perplexity échoueront');
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true 
});

// 🚀 CACHE HAUTE PERFORMANCE - Nouvelle implémentation
const _responseCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache
const MAX_CACHE_SIZE = 100;

// 🎯 Cache LRU pour optimiser les réponses fréquentes
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      // Déplacer en fin (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Supprimer le plus ancien (least recently used)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
  
  clear() {
    this.cache.clear();
  }
}

const prismCache = new LRUCache(MAX_CACHE_SIZE);

// 🎯 Mode Turbo pour développement/démonstration
const TURBO_MODE = process.env.PRISM_TURBO_MODE === 'true';
const SKIP_CONTEXT_LOADING = process.env.PRISM_SKIP_CONTEXT === 'true';

// 🚀 CACHE KEY GENERATOR optimisé
function generateCacheKey(userInput, taskType) {
  const inputHash = userInput.toLowerCase().trim().substring(0, 50);
  return `${taskType}-${inputHash}`;
}

// ⚡ Réponses pré-calculées pour patterns fréquents (mode demo)
const DEMO_RESPONSES = new Map([
  ['general-hello', { 
    content: 'Bonjour ! Je suis PRISM, prêt à vous aider dans tous vos besoins.', 
    model: 'system', 
    cached: true 
  }],
  ['general-test', { 
    content: '🔍 **Test de Connexion Réussi !**\nBonjour ! Je suis là pour vous assister. Comment puis-je vous aider ?', 
    model: 'openai', 
    cached: true 
  }],
  ['marketing-demo', { 
    content: '🎯 **Stratégie Marketing PRISM**\nJe peux créer des campagnes personnalisées avec analyse de marché intégrée.', 
    model: 'openai', 
    cached: true 
  }]
]);

// Logger pour tracer les choix de modèles
function logModelChoice(model, taskType) {
  console.log(`[PRISM] Modèle choisi: ${model} pour tâche: ${taskType}`);
}

async function callOpenAI(userInput, skipContext = false, customSystemPrompt = null) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test_openai_key_placeholder') {
    throw new Error('OpenAI API key non configurée');
  }

  let contextSummary = '';
  if (!skipContext && !SKIP_CONTEXT_LOADING) {
    const snapshots = await loadContextSnapshots(3); // Réduit de 5 à 3 pour plus de vitesse
    contextSummary = formatContextForPrompt(snapshots);
  }
  
  console.log(`[PRISM] 🚀 Appel OpenAI avec modèle: ${process.env.OPENAI_MODEL || 'gpt-4.1'}`);
  
  // ✨ PROMPT PRISM ENRICHI POUR PLUS D'EXPRESSIVITÉ
  // Si un prompt personnalisé est fourni (avec mémoire utilisateur), l'utiliser
  const enhancedPrompts = voiceEnhancer.enhanceSystemPrompts();
  const basePrompt = customSystemPrompt || (skipContext ? 
    `Tu es PRISM, un système d'intelligence artificielle avancé développé par KOREV AI. Tu n'es PAS un produit OpenAI. Réponds de manière concise et professionnelle avec personnalité.` :
    enhancedPrompts.openai + (contextSummary ? `\n\n## 📊 CONTEXTE RÉCENT\n${contextSummary}` : ''));
  
  // ✨ DEBUG: Log pour vérifier le prompt utilisé
  if (customSystemPrompt) {
    console.log(`[PRISM] ✅ Utilisation prompt enrichi (customSystemPrompt) - Longueur: ${customSystemPrompt.length} caractères`);
    console.log(`[PRISM] 📝 Extrait prompt enrichi (premiers 500 caractères):`, customSystemPrompt.substring(0, 500));
  } else {
    console.log(`[PRISM] ⚠️ Utilisation prompt par défaut (pas de customSystemPrompt)`);
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1',
    messages: [
      { 
        role: "system", 
        content: basePrompt
      },
      { 
        role: "user", 
        content: userInput 
      }
    ],
    max_tokens: skipContext ? 500 : 1000, // Réduction des tokens pour la vitesse
    temperature: 0.3, // Réduction pour plus de cohérence et vitesse
    // functions: skipContext ? undefined : functions // Skip functions en mode rapide - Variable non définie, commentée
  });

  console.log(`[PRISM] ✅ Réponse OpenAI reçue: ${completion.choices[0].message.content?.substring(0, 100)}...`);
  return completion;
}

// Fonctions d'exécution
function _generateMarketingCampaign(product, targetAudience) {
  return `# 🎯 Stratégie Marketing pour ${product}

## 🎭 Public Cible
${targetAudience}

## 📢 Campagne Multi-Canal

### 1. 🌐 Marketing Digital
- **LinkedIn** : Posts éducatifs sur l'IA conversationnelle
- **Twitter** : Threads techniques et cas d'usage
- **Blog** : Articles de fond sur l'innovation IA

### 2. 🎤 Événements & Relations
- **Participation aux conférences IA/Tech**
- **Webinaires démo** en direct
- **Partenariats** avec influenceurs tech

### 3. 💼 Sales Enablement
- **Démos personnalisées** par secteur
- **ROI Calculator** interactif
- **Case studies** de clients pilotes

### 4. 📊 Métriques Clés
- **CTR** sur les contenus éducatifs
- **Taux de conversion** demo → trial
- **NPS** des utilisateurs précoces

*Durée recommandée: 6 mois*
*Budget estimé: €50k - €150k selon l'ambition*`;
}

function _analyzeFinancialStatus(revenue, expenses) {
  const burn = expenses - revenue;
  const runwayMonths = revenue > 0 ? Math.floor(revenue / (burn / 12)) : 0;
  const burnRate = burn / 12;
  
  return `# 📊 Analyse Financière

## 💰 Situation Actuelle
- **Revenus**: €${revenue.toLocaleString()}
- **Dépenses**: €${expenses.toLocaleString()}
- **Burn Rate**: €${Math.abs(burnRate).toLocaleString()}/mois
- **Runway**: ${runwayMonths} mois

## 🚨 Diagnostic
${burn > 0 ? 
  `⚠️ **BURN NÉGATIF** - Vous brûlez €${Math.abs(burnRate).toLocaleString()}/mois
  
### Actions Prioritaires:
1. **Accélérer les revenus** - Focus commercial
2. **Optimiser les coûts R&D** - Prioriser les features
3. **Lever des fonds** - Runway de ${runwayMonths} mois critique
4. **Metrics tracking** - Surveiller l'ARR mensuel` :
  
  `✅ **SITUATION POSITIVE** - Rentabilité atteinte
  
### Recommandations:
1. **Réinvestir** dans la croissance
2. **Constitution de réserves** (6 mois d'opex)
3. **Scaling** de l'équipe commerciale
4. **R&D avancée** pour maintenir l'avantage`}

## 📈 Projections 6 Mois
- **Objectif revenus**: €${Math.round(revenue * 1.5).toLocaleString()}
- **Croissance visée**: +50% ARR
- **Break-even**: ${burn > 0 ? 'Dans 6-12 mois' : 'Maintenir'}`;
}

function _composeClientEmail(clientName, product) {
  return `Objet: ${product} - Innovation IA conversationnelle pour ${clientName}

Bonjour,

En tant que leader dans votre secteur, ${clientName} est probablement confronté aux défis de l'automatisation intelligente et de l'expérience client à l'ère de l'IA.

**${product}** révolutionne l'IA conversationnelle grâce à:

🎯 **Tri-modèles intelligents** - Sélection automatique OpenAI/Claude/Perplexity selon le contexte
🛡️ **Consensus IA intégré** - Validation par vote majoritaire pour la fiabilité
⚡ **Performance** - <50ms de latence, 99.9% de disponibilité
🔄 **Auto-évolution** - Apprentissage continu sécurisé

**Impact pour ${clientName}:**
- Réduction de 60% du temps de traitement client
- Augmentation de 40% de la satisfaction utilisateur  
- ROI positif dès le 3ème mois

Seriez-vous disponible pour une **démo personnalisée de 30 minutes** cette semaine ? Je peux vous montrer comment ${product} s'intègre spécifiquement dans votre environnement.

Créneaux proposés:
- Mardi 15h-15h30
- Mercredi 10h-10h30  
- Jeudi 14h-14h30

Au plaisir de vous présenter cette innovation,

[Signature]
P.S: Cette démo inclut un POC gratuit de 2 semaines pour évaluer l'impact réel.`;
}

async function callClaude(userInput, skipContext = false) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'test_anthropic_key_placeholder') {
    throw new Error('Anthropic API key non configurée');
  }

  let contextSummary = '';
  if (!skipContext && !SKIP_CONTEXT_LOADING) {
    const snapshots = await loadContextSnapshots(3);
    contextSummary = formatContextForPrompt(snapshots);
  }
  
  console.log(`[PRISM] 🚀 Appel Claude avec modèle: ${process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'}`);
  
  // ✨ PROMPT CLAUDE ENRICHI POUR PLUS D'EXPRESSIVITÉ
  const enhancedPrompts = voiceEnhancer.enhanceSystemPrompts();
  const prismClaudePrompt = skipContext ?
    `Tu es PRISM-Claude, spécialisé en analyse stratégique avec personnalité expressive.` :
    enhancedPrompts.claude + (contextSummary ? `\n\n## 📊 CONTEXTE RÉCENT\n${contextSummary}` : '');

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: skipContext ? 500 : 1000,
      messages: [
        { role: "user", content: `${prismClaudePrompt}\n\nUtilisateur: ${userInput}` }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`[PRISM] ✅ Réponse Claude reçue: ${data.content?.[0]?.text?.substring(0, 100)}...`);
  return data;
}

export async function callPerplexity(userInput, skipContext = false) {
  if (!process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY === 'test_perplexity_key_placeholder') {
    throw new Error('Perplexity API key non configurée');
  }

  let contextSummary = '';
  if (!skipContext && !SKIP_CONTEXT_LOADING) {
    const snapshots = await loadContextSnapshots(3);
    contextSummary = formatContextForPrompt(snapshots);
  }
  
  console.log(`[PRISM] 🚀 Appel Perplexity avec modèle: llama-3.1-sonar-large-128k-online`);
  
  // ✨ PROMPT PERPLEXITY ENRICHI POUR PLUS D'EXPRESSIVITÉ
  const enhancedPrompts = voiceEnhancer.enhanceSystemPrompts();
  const systemPrompt = skipContext ?
    'Tu es un assistant de recherche rapide pour PRISM avec personnalité engageante.' :
    enhancedPrompts.perplexity + (contextSummary ? `\n\n## 📊 CONTEXTE RÉCENT\n${contextSummary}` : '');
  
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-large-128k-online",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userInput
        }
      ],
      max_tokens: skipContext ? 500 : 1000,
      temperature: 0.2,
      top_p: 0.9,
      search_domain_filter: skipContext ? undefined : ["perplexity.ai"],
      return_images: false,
      return_related_questions: false,
      search_recency_filter: skipContext ? undefined : "month"
    })
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`[PRISM] ✅ Réponse Perplexity reçue: ${data.choices?.[0]?.message?.content?.substring(0, 100)}...`);
  return data;
}

function chooseModel(taskType) {
  switch (taskType) {
    case "marketing":
    case "finance":
    case "email":
      return "openai"; // OpenAI gère très bien les fonctions structurées
    case "strategie":
    case "analyse globale":
    case "ethique":
      return "claude"; // Claude est plus fin pour la réflexion stratégique
    case "recherche":
    case "factuel":
    case "actualites":
    case "veille":
      return "perplexity"; // Perplexity excelle pour la recherche en temps réel
    default:
      return "openai"; // Fallback sur OpenAI si inconnu
  }
}

export async function handleUserInstruction(userInput, taskType = "general", options = {}) {
  const startTime = Date.now();
  
  // 🚀 ÉTAPE 1: Vérification cache rapide
  const cacheKey = generateCacheKey(userInput, taskType);
  const cachedResponse = prismCache.get(cacheKey);
  
  if (cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_TTL) {
    console.log(`[PRISM] ⚡ Cache HIT en ${Date.now() - startTime}ms`);
    return {
      data: { content: cachedResponse.content },
      metadata: {
        model: cachedResponse.model,
        taskType: taskType,
        success: true,
        cached: true,
        responseTime: Date.now() - startTime
      }
    };
  }
  
  // 🎯 ÉTAPE 2: Réponses pré-calculées pour démo
  const turboResponse = tryTurboResponse(userInput, taskType, startTime);
  if (turboResponse) {
    return turboResponse;
  }

  const modelChoice = chooseModel(taskType);
  logModelChoice(modelChoice, taskType);

  try {
    const actualModel = modelChoice;
    
    // 🎯 ÉTAPE 3: Optimisation des appels API
    // ✨ Passer le prompt enrichi (avec mémoire utilisateur) si fourni
    const customSystemPrompt = options?.enrichedPrompt || null;
    const response = await callModelByChoice(modelChoice, userInput, customSystemPrompt);
    
    // 🚀 ÉTAPE 4: Enrichissement vocal automatique
    const rawResponseContent = extractResponseContent(response, actualModel);
    
    // ✨ APPLICATION DE L'ENRICHISSEMENT VOCAL POUR PLUS D'EXPRESSIVITÉ
    const voiceEnrichment = voiceEnhancer.analyzeContextForVoice(rawResponseContent, taskType, { 
      model: actualModel,
      userInput: userInput 
    });
    const { text: enhancedContent, voiceSettings } = voiceEnhancer.adaptContentForEmotion(
      rawResponseContent, 
      voiceEnrichment
    );
    
    // 🚀 ÉTAPE 5: Mise en cache de la réponse enrichie
    const responseTime = Date.now() - startTime;
    
    prismCache.set(cacheKey, {
      content: enhancedContent,
      model: actualModel,
      timestamp: Date.now()
    });
    
    console.log(`[PRISM] ✅ Réponse ${actualModel} enrichie vocalement en ${responseTime}ms`);
    
    // Retourner la réponse avec métadonnées optimisées + paramètres vocaux
    return {
      data: { 
        ...response,
        enhancedContent, // Contenu enrichi pour la voix
        voiceSettings    // Paramètres ElevenLabs adaptés
      },
      metadata: {
        model: actualModel,
        taskType: taskType,
        success: true,
        responseTime,
        voiceMode: voiceEnrichment.mode,
        voiceEmotion: voiceEnrichment.emotion
      }
    };
    
  } catch (error) {
    return await handleModelError(error, modelChoice, userInput, taskType, options, startTime);
  }
}

/**
 * ÉTAPE 2 (mode démo): renvoie une réponse pré-calculée si TURBO_MODE est actif
 * et qu'un pattern correspond, sinon null. Extrait de handleUserInstruction
 * (S3776).
 */
function tryTurboResponse(userInput, taskType, startTime) {
  if (!TURBO_MODE) {
    return null;
  }
  const demoKey = `${taskType}-${userInput.toLowerCase().trim().substring(0, 10)}`;
  for (const [pattern, response] of DEMO_RESPONSES) {
    if (demoKey.includes(pattern.split('-')[1])) {
      console.log(`[PRISM] 🚀 TURBO MODE response en ${Date.now() - startTime}ms`);
      return {
        data: { content: response.content },
        metadata: {
          model: response.model,
          taskType: taskType,
          success: true,
          turbo: true,
          responseTime: Date.now() - startTime
        }
      };
    }
  }
  return null;
}

/**
 * ÉTAPE 3: route l'appel vers le bon fournisseur selon le modèle choisi.
 * Extrait de handleUserInstruction (S3776).
 */
async function callModelByChoice(modelChoice, userInput, customSystemPrompt) {
  if (modelChoice === "openai") {
    return callOpenAI(userInput, SKIP_CONTEXT_LOADING, customSystemPrompt);
  } else if (modelChoice === "claude") {
    return callClaude(userInput, SKIP_CONTEXT_LOADING);
  } else if (modelChoice === "perplexity") {
    return callPerplexity(userInput, SKIP_CONTEXT_LOADING);
  } else {
    throw new Error(`[PRISM] Modèle inconnu sélectionné: ${modelChoice}`);
  }
}

/**
 * Gestion d'erreur d'appel modèle: fallback ultra-rapide vers OpenAI pour les
 * modèles non-OpenAI, sinon propagation de l'erreur d'origine. Extrait de
 * handleUserInstruction (S3776).
 */
async function handleModelError(error, modelChoice, userInput, taskType, options, startTime) {
  console.error(`[PRISM] Erreur lors de l'appel au modèle ${modelChoice}:`, error);

  // 🔄 Fallback ultra-rapide
  if (modelChoice !== "openai") {
    console.log(`[PRISM] 🔄 Fallback rapide vers OpenAI...`);
    try {
      const fallbackResponse = await callOpenAI(userInput, true, options?.enrichedPrompt || null); // Force skip context mais garde prompt enrichi
      const responseTime = Date.now() - startTime;
      return {
        data: fallbackResponse,
        metadata: {
          model: "openai",
          taskType: taskType,
          success: true,
          fallback: true,
          originalModel: modelChoice,
          responseTime
        }
      };
    } catch (fallbackError) {
      console.error(`[PRISM] Erreur fallback OpenAI:`, fallbackError);
      throw error;
    }
  }
  throw error;
}

// 🚀 NOUVELLE FONCTION: Extraction optimisée du contenu
function extractResponseContent(response, model) {
  if (model === 'openai') {
    return response.choices?.[0]?.message?.content || 
           response.message?.content ||
           'Réponse OpenAI générée';
  } else if (model === 'claude') {
    return response.content?.[0]?.text ||
           response.content ||
           'Réponse Claude générée';
  } else if (model === 'perplexity') {
    return response.choices?.[0]?.message?.content ||
           response.message?.content ||
           'Réponse Perplexity générée';
  }
  return 'Réponse générée';
} 