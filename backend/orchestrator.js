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
  
  console.log(`[PRISM] ✅ Réponse OpenAI reçue: ${response.choices[0]?.message?.content?.substring(0, 100)}...`);
  return response;
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
    if (modelChoice === "openai") {
      return await callOpenAI(userInput);
    } else if (modelChoice === "claude") {
      return await callClaude(userInput);
    } else if (modelChoice === "perplexity") {
      return await callPerplexity(userInput);
    } else {
      throw new Error(`[PRISM] Modèle inconnu sélectionné: ${modelChoice}`);
    }
  } catch (error) {
    console.error(`[PRISM] Erreur lors de l'appel au modèle ${modelChoice}:`, error);
    
    // Fallback gracieux vers OpenAI en cas d'erreur
    if (modelChoice !== "openai") {
      console.log(`[PRISM] 🔄 Fallback vers OpenAI...`);
      try {
        return await callOpenAI(userInput);
      } catch (fallbackError) {
        console.error(`[PRISM] Erreur fallback OpenAI:`, fallbackError);
        throw error; // Relancer l'erreur originale
      }
    }
    throw error;
  }
} 