import { OpenAI } from "openai";
import { loadContextSnapshots, formatContextForPrompt } from './contextMemory.js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Logger pour tracer les choix de modèles
function logModelChoice(model, taskType) {
  console.log(`[PRISM] Modèle choisi: ${model} pour tâche: ${taskType}`);
}

async function callOpenAI(userInput) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test_openai_key_placeholder') {
    throw new Error('OpenAI API key non configurée');
  }

  const snapshots = await loadContextSnapshots();
  const contextSummary = formatContextForPrompt(snapshots);
  
  console.log(`[PRISM] 🚀 Appel OpenAI avec modèle: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
  
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    messages: [
      { role: "system", content: `Tu es un assistant stratégique pour Korev AI. Utilise uniquement des fonctions prédéfinies si besoin.\n\nContexte récent :\n${contextSummary}` },
      { role: "user", content: userInput }
    ],
    functions: [
      {
        name: "generateMarketingCampaign",
        description: "Crée une campagne marketing basée sur un produit ou service donné.",
        parameters: {
          type: "object",
          properties: {
            product: { type: "string" },
            targetAudience: { type: "string" }
          },
          required: ["product", "targetAudience"]
        }
      },
      {
        name: "analyzeFinancialStatus",
        description: "Analyse la santé financière pour aider à la décision stratégique.",
        parameters: {
          type: "object",
          properties: {
            revenue: { type: "number" },
            expenses: { type: "number" }
          },
          required: ["revenue", "expenses"]
        }
      },
      {
        name: "composeClientEmail",
        description: "Génère un email pour prospecter ou répondre à un client.",
        parameters: {
          type: "object",
          properties: {
            clientName: { type: "string" },
            product: { type: "string" }
          },
          required: ["clientName", "product"]
        }
      }
    ]
  });
  
  // Traitement des function calls
  const choice = response.choices[0];
  if (choice?.message?.function_call) {
    const functionName = choice.message.function_call.name;
    const args = JSON.parse(choice.message.function_call.arguments || '{}');
    
    console.log(`[PRISM] 🎯 Function call détecté: ${functionName}`);
    
    let functionResult;
    switch (functionName) {
      case 'generateMarketingCampaign':
        functionResult = generateMarketingCampaign(args.product, args.targetAudience);
        break;
      case 'analyzeFinancialStatus':
        functionResult = analyzeFinancialStatus(args.revenue, args.expenses);
        break;
      case 'composeClientEmail':
        functionResult = composeClientEmail(args.clientName, args.product);
        break;
      default:
        functionResult = `Fonction ${functionName} non implémentée`;
    }
    
    // Créer une réponse modifiée avec le résultat de la fonction
    const modifiedResponse = {
      ...response,
      choices: [{
        ...choice,
        message: {
          ...choice.message,
          content: functionResult,
          function_call: undefined // Retirer le function_call pour éviter la confusion
        }
      }]
    };
    
    console.log(`[PRISM] ✅ Réponse OpenAI avec fonction exécutée: ${functionResult.substring(0, 100)}...`);
    return modifiedResponse;
  }
  
  console.log(`[PRISM] ✅ Réponse OpenAI reçue: ${response.choices[0]?.message?.content?.substring(0, 100)}...`);
  return response;
}

// Fonctions d'exécution
function generateMarketingCampaign(product, targetAudience) {
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

function analyzeFinancialStatus(revenue, expenses) {
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

function composeClientEmail(clientName, product) {
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

async function callClaude(userInput) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'test_anthropic_key_placeholder') {
    throw new Error('Anthropic API key non configurée');
  }

  const snapshots = await loadContextSnapshots();
  const contextSummary = formatContextForPrompt(snapshots);
  
  console.log(`[PRISM] 🚀 Appel Claude avec modèle: ${process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'}`);
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        { role: "user", content: `Contexte récent :\n${contextSummary}\n\nUtilisateur: ${userInput}` }
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

async function callPerplexity(userInput) {
  if (!process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY === 'test_perplexity_key_placeholder') {
    throw new Error('Perplexity API key non configurée');
  }

  const snapshots = await loadContextSnapshots();
  const contextSummary = formatContextForPrompt(snapshots);
  
  console.log(`[PRISM] 🚀 Appel Perplexity avec modèle: llama-3.1-sonar-large-128k-online`);
  
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
          content: `Tu es un assistant de recherche avancé pour Korev AI. Tu as accès à des informations en temps réel via Internet.\n\nContexte récent :\n${contextSummary}`
        },
        {
          role: "user", 
          content: userInput
        }
      ],
      max_tokens: 1000,
      temperature: 0.2,
      top_p: 0.9,
      search_domain_filter: ["perplexity.ai"],
      return_images: false,
      return_related_questions: false,
      search_recency_filter: "month"
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

export async function handleUserInstruction(userInput, taskType = "general") {
  const modelChoice = chooseModel(taskType);
  logModelChoice(modelChoice, taskType);

  try {
    let response;
    let actualModel = modelChoice;
    
    if (modelChoice === "openai") {
      response = await callOpenAI(userInput);
    } else if (modelChoice === "claude") {
      response = await callClaude(userInput);
    } else if (modelChoice === "perplexity") {
      response = await callPerplexity(userInput);
    } else {
      throw new Error(`[PRISM] Modèle inconnu sélectionné: ${modelChoice}`);
    }
    
    // Retourner la réponse avec métadonnées
    return {
      data: response,
      metadata: {
        model: actualModel,
        taskType: taskType,
        success: true
      }
    };
    
  } catch (error) {
    console.error(`[PRISM] Erreur lors de l'appel au modèle ${modelChoice}:`, error);
    
    // Fallback gracieux vers OpenAI en cas d'erreur
    if (modelChoice !== "openai") {
      console.log(`[PRISM] 🔄 Fallback vers OpenAI...`);
      try {
        const fallbackResponse = await callOpenAI(userInput);
        return {
          data: fallbackResponse,
          metadata: {
            model: "openai",
            taskType: taskType,
            success: true,
            fallback: true,
            originalModel: modelChoice
          }
        };
      } catch (fallbackError) {
        console.error(`[PRISM] Erreur fallback OpenAI:`, fallbackError);
        throw error; // Relancer l'erreur originale
      }
    }
    throw error;
  }
} 