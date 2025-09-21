/**
 * PRISM Voice Modules - Point d'entrée principal
 * Exporte tous les modules d'analyse vocale et d'intégration
 */

export { VoiceAnalyzer } from './VoiceAnalyzer.js';
export { VoiceSentimentDetector } from './VoiceSentimentDetector.js';
export { VoiceIntegration } from './VoiceIntegration.js';

// Re-export par défaut
export { VoiceAnalyzer as default } from './VoiceAnalyzer.js';

// Export des classes principales pour utilisation directe
export {
  VoiceAnalyzer as PrismVoiceAnalyzer,
  VoiceSentimentDetector as PrismSentimentDetector,
  VoiceIntegration as PrismVoiceIntegration
};
