import { analyzeMemoryPerformance } from './memoryAnalyzer.js';
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const MAX_SUGGESTION_LENGTH = 150; // Limite la longueur des suggestions générées

/**
 * Génére des suggestions d'amélioration pour PRISM basées sur ses performances mémorielles.
 * @returns {Promise<string>} Suggestion d'amélioration ou stratégie optimisée.
 */
export async function generateSelfInstruction() {
  try {
    const memoryReport = await analyzeMemoryPerformance(50);
    const promptContext = `
Rapport de performance cognitive PRISM :
Succès global : ${memoryReport.successRate ? memoryReport.successRate.toFixed(2) + '%' : 'Indisponible'}
Échecs globaux : ${memoryReport.failureRate ? memoryReport.failureRate.toFixed(2) + '%' : 'Indisponible'}
Détail par type d'action :
${Object.entries(memoryReport.typeStats).map(([type, stats]) => {
      return `- ${type} : ${stats.success}/${stats.total} réussites`;
    }).join('\n')}
    
À partir de ce rapport :
- Propose une amélioration simple, claire et concrète que PRISM pourrait mettre en œuvre pour augmenter sa performance.
- Sois synthétique (maximum 3 lignes).
- Donne une action réaliste, immédiatement applicable.

Réponds uniquement par la suggestion, sans introduction ni justification.
    `.trim();

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [{ role: "user", content: promptContext }],
      temperature: 0.2
    });

    const suggestion = response.choices[0]?.message?.content || "Pas de suggestion générée.";
    console.log("[PRISM SELF-OPTIMIZER] 🧠 Suggestion générée :", suggestion);
    return suggestion;
  } catch (error) {
    console.error("[PRISM SELF-OPTIMIZER] ❌ Échec génération suggestion :", error.message);
    return "Erreur de génération de suggestion.";
  }
} 