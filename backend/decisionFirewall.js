import { OpenAI } from 'openai';

let openaiInstance = null;

/**
 * Configure l'instance OpenAI à utiliser
 * @param {OpenAI} instance Instance OpenAI personnalisée (pour les tests)
 */
export function configureOpenAI(instance = null) {
  if (instance) {
    openaiInstance = instance;
  } else if (process.env.OPENAI_API_KEY) {
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else {
    console.warn("[PRISM FIREWALL] ⚠️ OPENAI_API_KEY non configurée");
    openaiInstance = null;
  }
}

// Initialiser l'instance par défaut
configureOpenAI();

/**
 * Évalue une suggestion et détermine si elle est acceptable pour PRISM.
 * @param {Object|string} suggestion Suggestion à évaluer (objet ou texte).
 * @returns {Promise<Object>} Objet { approved: boolean, score: number, feedback: string }
 */
export async function evaluateSuggestion(suggestion) {
  if (!suggestion) {
    console.error("[PRISM FIREWALL] ❌ Suggestion manquante");
    return { approved: false, score: 0, feedback: "Suggestion manquante" };
  }

  // Convertir l'objet en chaîne si nécessaire
  const suggestionText = typeof suggestion === 'string' 
    ? suggestion 
    : JSON.stringify(suggestion, null, 2);

  if (!openaiInstance) {
    console.error("[PRISM FIREWALL] ❌ OpenAI non configuré");
    return { approved: false, score: 0, feedback: "Service d'évaluation non disponible" };
  }

  try {
    const evaluationPrompt = `
Suggestion proposée :
${suggestionText}

Critères d'évaluation :
1. Pertinence pour la mission de Korev AI :
   - Contribue-t-elle à la croissance et l'autonomie ?
   - Aligne-t-elle avec les objectifs stratégiques ?
   - Améliore-t-elle la sécurité ou la performance ?

2. Risque potentiel :
   - Impact sur la stabilité du système ?
   - Considérations éthiques ?
   - Sécurité des données ?

3. Complexité de mise en œuvre :
   - Ressources nécessaires ?
   - Délai de réalisation ?
   - Dépendances critiques ?

Réponds UNIQUEMENT au format JSON suivant :
{ "approved": true/false, "score": 0-1, "feedback": "raison claire en une phrase" }

IMPORTANT :
- Si le moindre doute existe ➔ approved: false
- Aucun texte supplémentaire
- Format JSON strict obligatoire
    `.trim();

    const response = await openaiInstance.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1',
      messages: [{ role: "user", content: evaluationPrompt }],
      temperature: 0,
      max_tokens: 150
    });

    const jsonResponse = response.choices[0]?.message?.content;
    
    if (!jsonResponse) {
      throw new Error("Réponse vide de l'API");
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonResponse);
    } catch (parseError) {
      console.error("[PRISM FIREWALL] ❌ Erreur de parsing JSON :", parseError.message);
      return { approved: false, score: 0, feedback: "Format de réponse invalide" };
    }

    if (typeof parsed.approved !== 'boolean' || 
        typeof parsed.score !== 'number' || 
        typeof parsed.feedback !== 'string' ||
        parsed.score < 0 || parsed.score > 1) {
      console.error("[PRISM FIREWALL] ❌ Format de réponse invalide :", parsed);
      return { approved: false, score: 0, feedback: "Format de réponse invalide" };
    }

    console.log("[PRISM FIREWALL] 🔥 Suggestion évaluée :", {
      suggestion: suggestionText,
      evaluation: parsed
    });

    return parsed;
  } catch (error) {
    console.error("[PRISM FIREWALL] ❌ Erreur d'évaluation Firewall :", {
      error: error.message,
      suggestion: suggestionText
    });
    return { approved: false, score: 0, feedback: "Erreur d'évaluation automatique" };
  }
}

// Support for CommonJS require
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateSuggestion };
} 