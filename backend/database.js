import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_API_KEY) {
  console.error('[PRISM MEMORY] ❌ Configuration manquante : SUPABASE_URL et SUPABASE_API_KEY sont requis');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Valide les paramètres de mémoire
 * @param {Object} params - Paramètres à valider
 * @throws {Error} Si les paramètres sont invalides
 */
function validateMemoryParams({ type, content, metadata }) {
  if (typeof type !== 'string' || !type) {
    throw new Error('Le type de mémoire doit être une chaîne non vide');
  }
  if (typeof content !== 'string' || !content) {
    throw new Error('Le contenu de la mémoire doit être une chaîne non vide');
  }
  if (metadata && typeof metadata !== 'object') {
    throw new Error('Les métadonnées doivent être un objet');
  }
}

/**
 * Sauvegarde un snapshot de mémoire dans la base de données
 * @param {Object} params - Paramètres de sauvegarde
 * @param {string} params.type - Type de mémoire (ex: 'interaction', 'state', 'strategy')
 * @param {string} params.content - Contenu de la mémoire
 * @param {Object} params.metadata - Métadonnées supplémentaires
 * @returns {Promise<Object>} Données sauvegardées
 * @throws {Error} En cas d'erreur de validation ou de sauvegarde
 */
export async function saveMemorySnapshot({ type, content, metadata }) {
  try {
    validateMemoryParams({ type, content, metadata });

    const { data, error } = await supabase
      .from('prism_memories')
      .insert([{ type, content, metadata }]);

    if (error) {
      console.error("[PRISM MEMORY] ❌ Échec de sauvegarde :", error.message);
      throw error;
    }

    console.log("[PRISM MEMORY] ✅ Sauvegarde réussie :", data);
    return data;
  } catch (error) {
    console.error("[PRISM MEMORY] ⚠️ Erreur :", error.message);
    throw error; // Propager l'erreur pour gestion par l'appelant
  }
}

/**
 * Récupère les derniers snapshots de mémoire
 * @param {number} limit - Nombre maximum de snapshots à récupérer
 * @returns {Promise<Array>} Liste des snapshots
 * @throws {Error} En cas d'erreur de récupération
 */
export async function fetchLatestSnapshots(limit = 5) {
  try {
    if (typeof limit !== 'number' || limit < 1) {
      throw new Error('La limite doit être un nombre positif');
    }

    const { data, error } = await supabase
      .from('prism_memories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[PRISM MEMORY] ❌ Échec de récupération :", error.message);
      throw error;
    }

    console.log("[PRISM MEMORY] 📚 Derniers souvenirs récupérés :", data);
    return data;
  } catch (error) {
    console.error("[PRISM MEMORY] ⚠️ Erreur :", error.message);
    throw error; // Propager l'erreur pour gestion par l'appelant
  }
} 