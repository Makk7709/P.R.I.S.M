/**
 * @fileoverview PRISM Model Router - Gère la sélection et le routage des modèles IA
 * @module prismModelRouter
 */

import { CONFIG } from './config.js';
import prismLogger from './monitoring/prismLogger.js';

// Types de tâches et leurs modèles associés
const TASK_MODEL_MAPPING = {
  marketing: 'openai',
  strategie: 'claude',
  analyse: 'claude',
  creation: 'openai',
  recherche: 'claude',
  perplexity: 'perplexity'
};

/**
 * Choisit le modèle approprié en fonction du type de tâche
 * @param {string} taskType - Type de tâche à exécuter
 * @returns {string} - Nom du modèle à utiliser ('openai' ou 'claude')
 * @throws {Error} Si le type de tâche est inconnu
 */
export function chooseModel(taskType) {
  // Vérification du provider forcé
  if (process.env.PRISM_FORCED_PROVIDER) {
    console.log(`[PRISM INFO] MODEL_ROUTER [TEST MODE] Forçage du provider : ${process.env.PRISM_FORCED_PROVIDER}`);
    return process.env.PRISM_FORCED_PROVIDER;
  }

  if (!taskType || !TASK_MODEL_MAPPING[taskType]) {
    const error = new Error(`[PRISM] Modèle inconnu sélectionné: ${taskType}`);
    prismLogger.error('MODEL_ROUTER', error.message);
    throw error;
  }

  const model = TASK_MODEL_MAPPING[taskType];
  prismLogger.info('MODEL_ROUTER', `[PRISM] Modèle choisi: ${model}`);
  return model;
}

/**
 * Appelle l'API Claude avec les paramètres appropriés
 * @param {Object} params - Paramètres de la requête
 * @returns {Promise<Object>} - Réponse de l'API Claude
 */
export async function callClaude(params) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.MODELS.ANTHROPIC.TIMEOUT);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.MODELS.ANTHROPIC.API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CONFIG.MODELS.ANTHROPIC.MODEL,
        ...params
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`[PRISM] Erreur API Claude: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError' || error.message === 'AbortError') {
      throw new Error('[PRISM] Timeout API Claude');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Appelle l'API OpenAI avec les paramètres appropriés
 * @param {Object} params - Paramètres de la requête
 * @returns {Promise<Object>} - Réponse de l'API OpenAI
 */
export async function callOpenAI(params) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.MODELS.OPENAI.TIMEOUT);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.MODELS.OPENAI.API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.MODELS.OPENAI.MODEL,
        ...params
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`[PRISM] Erreur API OpenAI: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError' || error.message === 'AbortError') {
      throw new Error('[PRISM] Timeout API OpenAI');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Appelle l'API Perplexity avec les paramètres appropriés
 * @param {Object} params - Paramètres de la requête
 * @returns {Promise<Object>} - Réponse de l'API Perplexity
 */
export async function callPerplexity(params) {
  const controller = new AbortController();
  const model = CONFIG.MODELS.PERPLEXITY.MODEL;
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.MODELS.PERPLEXITY.TIMEOUT);

  console.log('[PRISM DEBUG] Appel Perplexity avec le modèle :', model);

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.MODELS.PERPLEXITY.API_KEY}`
      },
      body: JSON.stringify({
        model,
        ...params
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`[PRISM] Erreur API Perplexity: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError' || error.message === 'AbortError') {
      throw new Error('[PRISM] Timeout API Perplexity');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Gère l'instruction utilisateur en routant vers le modèle approprié
 * @param {string} instruction - Instruction de l'utilisateur
 * @param {string} taskType - Type de tâche à exécuter
 * @returns {Promise<Object>} - Réponse du modèle
 */
export async function handleUserInstruction(instruction, taskType) {
  const model = chooseModel(taskType);
  
  try {
    const params = {
      messages: [{ role: 'user', content: instruction }],
      max_tokens: 1000,
      temperature: 0.7
    };

    let response;
    switch (model) {
      case 'openai':
        response = await callOpenAI(params);
        break;
      case 'claude':
        response = await callClaude(params);
        break;
      case 'perplexity':
        response = await callPerplexity(params);
        break;
      default:
        throw new Error(`[PRISM] Modèle non supporté: ${model}`);
    }

    return response;
  } catch (error) {
    prismLogger.error('MODEL_ROUTER', `[PRISM] Erreur lors de l'appel au modèle ${model}: ${error.message}`);
    throw error;
  }
} 