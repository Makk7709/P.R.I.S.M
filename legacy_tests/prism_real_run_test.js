/**
 * @fileoverview Test d'intégration de PRISM avec Perplexity
 * @module prism_real_run_test
 */

import dotenv from 'dotenv';
import fs from 'node:fs';
import { CONFIG } from '../config.js';
import { handleUserInstruction } from '../prismModelRouter.js';
// import prismLogger from '../monitoring/prismLogger.js';

// Chargement des variables d'environnement
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
  console.log('[PRISM TEST] ℹ️ Chargement des variables depuis .env.local');
} else {
  dotenv.config();
  console.log('[PRISM TEST] ℹ️ Chargement des variables depuis .env');
}

// Affichage debug des variables d'environnement utilisées
console.log('[PRISM TEST] ℹ️ OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'OK' : '❌ manquant');
console.log('[PRISM TEST] ℹ️ ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'OK' : '❌ manquant');
console.log('[PRISM TEST] ℹ️ PERPLEXITY_API_KEY:', process.env.PERPLEXITY_API_KEY ? 'OK (' + process.env.PERPLEXITY_API_KEY.slice(0,8) + '...'+ ')' : '❌ manquant');

// Vérification des variables d'environnement requises
const requiredEnvVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`[PRISM TEST] ❌ Variables d'environnement manquantes: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Configuration du test
const TEST_CONFIG = {
  prompt: "Quels sont les avantages de l'intelligence artificielle dans le secteur médical ?",
  expectedKeywords: ["intelligence", "médical", "avantages"],
  taskType: "recherche" // Utilise Claude par défaut pour la recherche
};

/**
 * Valide la structure de la réponse
 * @param {Object} response - Réponse du modèle
 * @returns {boolean} - True si la structure est valide
 */
function validateResponseStructure(response) {
  try {
    if (!response || typeof response !== 'object') {
      console.warn('[PRISM CYCLE] ⚠️ Structure de réponse invalide');
      return false;
    }

    // Vérification spécifique pour Claude
    if (response.content) {
      return true;
    }

    // Vérification spécifique pour OpenAI
    if (response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
      return true;
    }

    // Vérification spécifique pour Perplexity
    if (response.choices && Array.isArray(response.choices) && response.choices[0]?.message?.content) {
      return true;
    }

    console.warn('[PRISM CYCLE] ⚠️ Structure de réponse inattendue');
    return false;
  } catch (error) {
    console.error('[PRISM CYCLE] ❌ Erreur de validation structurelle:', error);
    return false;
  }
}

/**
 * Valide la qualité de la réponse
 * @param {Object} response - Réponse du modèle
 * @param {string[]} expectedKeywords - Mots-clés attendus
 * @returns {boolean} - True si la qualité est acceptable
 */
function validateResponseQuality(response, expectedKeywords) {
  try {
    // Extraction du contenu selon le modèle utilisé
    let content = '';
    if (response.content) {
      // Format Claude
      content = response.content;
    } else if (response.choices?.[0]?.message?.content) {
      // Format OpenAI/Perplexity
      content = response.choices[0].message.content;
    }

    if (!content) {
      console.warn('[PRISM CYCLE] ⚠️ Contenu de réponse vide');
      return false;
    }

    const missingKeywords = expectedKeywords.filter(keyword => 
      !content.toLowerCase().includes(keyword.toLowerCase())
    );

    if (missingKeywords.length > 0) {
      console.warn(`[PRISM CYCLE] ⚠️ Mots-clés manquants: ${missingKeywords.join(', ')}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[PRISM CYCLE] ❌ Erreur de validation qualité:', error);
    return false;
  }
}

/**
 * Lance le cycle d'auto-évolution de PRISM
 */
async function launchSelfEvolutionCycle() {
  console.log('[PRISM CYCLE] 🔵 Début requête Perplexity');
  console.log(`[PRISM CYCLE] 📝 Prompt: "${TEST_CONFIG.prompt}"`);

  try {
    // Appel à Perplexity via le routeur de modèles
    const response = await handleUserInstruction(
      TEST_CONFIG.prompt,
      TEST_CONFIG.taskType
    );

    // Log de la réponse brute
    console.log('[PRISM CYCLE] 📦 Réponse brute:');
    console.log(JSON.stringify(response, null, 2));

    // Validation structurelle
    const isStructureValid = validateResponseStructure(response);
    if (!isStructureValid) {
      console.warn('[PRISM CYCLE] ⚠️ Validation structurelle échouée');
    }

    // Validation qualité
    const isQualityValid = validateResponseQuality(response, TEST_CONFIG.expectedKeywords);
    if (!isQualityValid) {
      console.warn('[PRISM CYCLE] ⚠️ Validation qualité échouée');
    }

    console.log('[PRISM CYCLE] ✨ Fin du premier run, état global stable.');
  } catch (error) {
    console.error('[PRISM CYCLE] ❌ Erreur lors du cycle:', error);
    throw error;
  }
}

// Exécution du test
console.log('[PRISM TEST] 🚀 Démarrage du test d\'intégration...');

// Forçage du provider pour les tests
process.env.PRISM_FORCED_PROVIDER = "perplexity";
console.log('[PRISM TEST] ℹ️ Provider forcé:', process.env.PRISM_FORCED_PROVIDER);

launchSelfEvolutionCycle()
  .then(() => console.log('[PRISM TEST] ✅ Test terminé avec succès'))
  .catch(error => {
    console.error('[PRISM TEST] ❌ Test échoué:', error);
    process.exit(1);
  }); 