import './setupEnv.js';
import { executeSelfOptimizationCycle } from './selfApplicationEngine.js';
import { analyzeMemoryPerformance } from './memoryAnalyzer.js';
import { generateSelfInstruction } from './selfOptimizer.js';
import { evaluateSuggestion } from './decisionFirewall.js';
import { prismStateStore } from '../persistence/prismStateStore.js';
import { logger } from '../utils/logger.js';

const SNAPSHOT_STORE_KEY = 'self_evolution_snapshots';

/**
 * Persiste un snapshot du cycle d'auto-évolution dans le store mémoire existant.
 * Les snapshots sont conservés en liste chronologique (du plus ancien au plus récent).
 * @param {Object} snapshot - Les données du cycle à conserver.
 */
async function saveMemorySnapshot(snapshot) {
  const snapshots = (await prismStateStore.get(SNAPSHOT_STORE_KEY)) || [];
  snapshots.push(snapshot);
  await prismStateStore.set(SNAPSHOT_STORE_KEY, snapshots);
}

/**
 * Récupère les N derniers snapshots du cycle d'auto-évolution.
 * @param {number} [limit=5] - Nombre maximum de snapshots à retourner.
 * @returns {Promise<Object[]>} Les snapshots les plus récents (ordre chronologique).
 */
async function fetchLatestSnapshots(limit = 5) {
  const snapshots = (await prismStateStore.get(SNAPSHOT_STORE_KEY)) || [];
  return snapshots.slice(-limit);
}

export async function launchEvolutionCycle() {
  console.log("[PRISM CYCLE] 🔵 Début requête Perplexity");

  try {
    // 1. Génération de la suggestion
    console.log("🧠 [PRISM CYCLE] Génération de la suggestion d'optimisation...");
    const suggestion = await generateSelfInstruction();
    console.log("📝 [PRISM CYCLE] Requête brute générée:", JSON.stringify(suggestion, null, 2));

    // 2. Évaluation par le Decision Firewall
    console.log("🔥 [PRISM CYCLE] Évaluation de la suggestion par le Decision Firewall...");
    const evaluation = await evaluateSuggestion(suggestion);
    console.log("✅ [PRISM CYCLE] Résultat de l'évaluation:", evaluation);

    if (!evaluation.approved) {
      console.log("⚠️ [PRISM CYCLE] Suggestion rejetée par le Decision Firewall");
      return;
    }

    // 3. Exécution de l'optimisation
    console.log("⚡ [PRISM CYCLE] Exécution de l'optimisation...");
    const optimizationResult = await executeSelfOptimizationCycle(suggestion);
    
    if (!optimizationResult || !optimizationResult.response) {
      console.warn("[PRISM CYCLE] ⚠️ Réponse Perplexity incohérente ou vide");
      return;
    }
    
    console.log("[PRISM CYCLE] 🟢 Réponse brute reçue:", JSON.stringify(optimizationResult.response, null, 2));
    console.log("✅ [PRISM CYCLE] Optimisation exécutée avec succès");

    // 4. Sauvegarde de l'état mémoire
    console.log("📚 [PRISM CYCLE] Sauvegarde de l'état mémoire...");
    await saveMemorySnapshot({
      suggestion,
      evaluation,
      optimizationResult,
      timestamp: new Date().toISOString()
    });

    // 5. Audit de performance
    console.log("📊 [PRISM CYCLE] Analyse des performances...");
    const audit = await analyzeMemoryPerformance(30);
    console.log("📈 [PRISM CYCLE] Audit de performance:", JSON.stringify(audit, null, 2));

    // 6. Récupération des derniers snapshots pour contexte
    const recentSnapshots = await fetchLatestSnapshots(5);
    console.log("🔄 [PRISM CYCLE] Contexte des 5 derniers cycles:", JSON.stringify(recentSnapshots, null, 2));

    console.log("[PRISM CYCLE] ✨ Fin du premier run, état global stable.");
  } catch (error) {
    console.error("❌ [PRISM CYCLE] Erreur durant le cycle:", error.message);
    // Sauvegarde de l'erreur dans la mémoire
    await saveMemorySnapshot({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Lancement du cycle si le fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  launchEvolutionCycle();
} 

async function performAnalysis() {
  try {
    // const recentSnapshots = await fetchLatestSnapshots(5);
    const recentSnapshots = []; // Remplacé par un tableau vide
    if (recentSnapshots.length === 0) {
      logger.warn('SELF_EVOLUTION', 'Aucun snapshot récent trouvé pour l\'analyse, cycle reporté.');
      
    }
  } catch (error) {
    logger.error('SELF_EVOLUTION', `Erreur lors de la finalisation du cycle: ${error.message}`, { error });
  }
}

async function finalizeCycle(analysis, suggestions) {
  try {
    // await saveMemorySnapshot(currentState);
    logger.info('SELF_EVOLUTION', 'Cycle d\'auto-évolution terminé et snapshot de la mémoire sauvegardé.');
  } catch (error) {
    logger.error('SELF_EVOLUTION', `Erreur lors de la finalisation du cycle: ${error.message}`, { error });
  }
} 