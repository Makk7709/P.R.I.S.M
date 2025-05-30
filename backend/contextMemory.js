import { fetchLatestSnapshots } from './database.js';

/**
 * Charge les derniers snapshots de contexte
 * @param {number} limit - Nombre maximum de snapshots à charger
 * @returns {Promise<Array>} Liste des snapshots de contexte
 */
export async function loadContextSnapshots(limit = 5) {
  try {
    const snapshots = await fetchLatestSnapshots(limit);
    console.log("[PRISM CONTEXT] 📚 Contexte chargé :", snapshots?.length || 0, "éléments");
    return snapshots || [];
  } catch (error) {
    console.warn("[PRISM CONTEXT] ⚠️ Échec chargement contexte (mode fallback):", error.message);
    // Retourner un contexte par défaut en cas d'erreur
    return [
      {
        type: "system",
        content: "Mode de démarrage sans historique persistant",
        timestamp: new Date().toISOString()
      }
    ];
  }
}

/**
 * Formate les snapshots de contexte pour l'inclusion dans un prompt
 * @param {Array} snapshots - Liste des snapshots à formater
 * @returns {string} Résumé formaté du contexte
 */
export function formatContextForPrompt(snapshots) {
  if (!snapshots || !snapshots.length) {
    return "Mode de démarrage - Aucun souvenir récent disponible.";
  }
  
  const contextSummary = snapshots.map((snap, index) => {
    const content = snap.content || 'Contenu indisponible';
    const type = snap.type || 'unknown';
    return `#${index + 1} [${type}] ${content}`;
  }).join('\n');
  
  console.log("[PRISM CONTEXT] 🧠 Contexte formaté pour prompt:", snapshots.length, "éléments");
  return contextSummary;
} 