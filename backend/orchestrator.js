import { OpenAI } from "openai";
import { loadContextSnapshots, formatContextForPrompt } from './contextMemory.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Logger pour tracer les choix de modèles
function logModelChoice(model, taskType) {
  console.log(`[PRISM] Modèle choisi: ${model} pour tâche: ${taskType}`);
}

async function callOpenAI(userInput) {
  const snapshots = await loadContextSnapshots();
  const contextSummary = formatContextForPrompt(snapshots);
  
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
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
  return response;
}

async function callClaude(userInput) {
  const snapshots = await loadContextSnapshots();
  const contextSummary = formatContextForPrompt(snapshots);
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: 1000,
      messages: [
        { role: "system", content: `Contexte récent :\n${contextSummary}` },
        { role: "user", content: userInput }
      ]
    })
  });

  const data = await response.json();
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
      return "claude"; // Claude est plus fin pour la réflexion
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
    } else {
      throw new Error(`[PRISM] Modèle inconnu sélectionné: ${modelChoice}`);
    }
  } catch (error) {
    console.error(`[PRISM] Erreur lors de l'appel au modèle ${modelChoice}:`, error);
    throw error;
  }
} 