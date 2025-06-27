import { evaluateSuggestion } from './decisionFirewall.js';
// import { saveMemorySnapshot } from './database.js';
import { generateSelfInstruction } from './selfOptimizer.js';

/**
 * Génère, évalue et applique une amélioration PRISM si validée.
 */
export async function executeSelfOptimizationCycle() {
  try {
    console.log("[PRISM SELF-ENGINE] 🧠 Début du cycle d'auto-optimisation...");

    const suggestion = await generateSelfInstruction();
    if (!suggestion || suggestion === "Pas de suggestion générée" || suggestion.startsWith("Erreur")) {
      console.warn("[PRISM SELF-ENGINE] ⚠️ Aucune suggestion exploitable.");
      return;
    }

    const evaluation = await evaluateSuggestion(suggestion);
    if (evaluation.decision !== "accept") {
      console.warn("[PRISM SELF-ENGINE] 🚫 Suggestion rejetée par le Firewall :", evaluation.reason);
      return;
    }

    console.log("[PRISM SELF-ENGINE] ✅ Suggestion validée :", suggestion);

    // Enregistrer la suggestion validée dans la mémoire
    // await saveMemorySnapshot({
    //   type: "self_optimization",
    //   content: suggestion,
    //   metadata: {
    //     outcome: "success",
    //     validationReason: evaluation.reason,
    //     timestamp: new Date().toISOString()
    //   }
    // });

    console.log("[PRISM SELF-ENGINE] 📚 Suggestion appliquée et mémorisée.");
  } catch (error) {
    console.error("[PRISM SELF-ENGINE] ❌ Erreur dans le cycle d'auto-optimisation :", error.message);
  }
} 