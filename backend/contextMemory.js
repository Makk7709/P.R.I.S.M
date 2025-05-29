import { fetchLatestSnapshots } from './database.js';

/**
 * Charge les derniers snapshots de contexte
 * @param {number} limit - Nombre maximum de snapshots à charger
 * @returns {Promise<Array>} Liste des snapshots de contexte
 */
export async function loadContextSnapshots(limit = 5) {
  try {
    const snapshots = await fetchLatestSnapshots(limit);
    console.log("[PRISM CONTEXT] 📚 Contexte chargé :", snapshots);
    return snapshots;
  } catch (error) {
    console.error("[PRISM CONTEXT] ❌ Échec chargement contexte :", error.message);
    return [];
  }
}

/**
 * Formate les snapshots de contexte pour l'inclusion dans un prompt
 * @param {Array} snapshots - Liste des snapshots à formater
 * @returns {string} Résumé formaté du contexte
 */
export function formatContextForPrompt(snapshots) {
  if (!snapshots.length) {
    return "Aucun souvenir récent disponible.";
  }
  const contextSummary = snapshots.map((snap, index) => {
    return `#${index + 1} [${snap.type}] ${snap.content}`;
  }).join('\n');
  console.log("[PRISM CONTEXT] 🧠 Contexte formaté pour prompt.");
  return contextSummary;
} 