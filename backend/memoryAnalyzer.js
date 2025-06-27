// import { fetchLatestSnapshots } from './database.js';

/**
 * Analyse les souvenirs récents de PRISM et calcule des métriques de performance.
 * @param {number} limit Nombre de souvenirs à analyser (par défaut 50).
 * @returns {Promise<Object>} Rapport d'audit des performances.
 */
export async function analyzeMemoryPerformance(limit = 50) {
  try {
    // Validation de l'entrée
    if (typeof limit !== 'number' || limit < 1) {
      console.warn("[PRISM ANALYZER] ⚠️ Limite invalide, utilisation de la valeur par défaut (50)");
      limit = 50;
    }

    const snapshots = []; // Remplacé par un tableau vide pour l'instant
    if (!snapshots || snapshots.length === 0) {
      console.warn("[PRISM ANALYZER] ⚠️ Aucun souvenir à analyser.");
      return { 
        successRate: null, 
        failureRate: null, 
        insights: [],
        totalSnapshots: 0,
        typeStats: {}
      };
    }

    let successCount = 0;
    let failureCount = 0;
    const typeStats = {};
    const insights = [];

    snapshots.forEach((snap) => {
      const { type, metadata } = snap;
      if (!typeStats[type]) {
        typeStats[type] = { total: 0, success: 0, failure: 0 };
      }
      typeStats[type].total += 1;

      if (metadata?.outcome === "success") {
        successCount += 1;
        typeStats[type].success += 1;
      } else {
        failureCount += 1;
        typeStats[type].failure += 1;
      }
    });

    const total = successCount + failureCount;
    const successRate = total > 0 ? (successCount / total) * 100 : null;
    const failureRate = total > 0 ? (failureCount / total) * 100 : null;

    // Génération d'insights
    Object.entries(typeStats).forEach(([type, stats]) => {
      const typeSuccessRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
      insights.push({
        type,
        successRate: typeSuccessRate,
        total: stats.total,
        trend: typeSuccessRate > successRate ? "positive" : "negative"
      });
    });

    console.log("[PRISM ANALYZER] 📈 Analyse mémoire réalisée avec succès.");

    return {
      totalSnapshots: total,
      successRate,
      failureRate,
      typeStats,
      insights
    };
  } catch (error) {
    console.error("[PRISM ANALYZER] ❌ Échec de l'analyse mémoire :", error.message);
    return { 
      successRate: null, 
      failureRate: null, 
      insights: [],
      totalSnapshots: 0,
      typeStats: {}
    };
  }
} 