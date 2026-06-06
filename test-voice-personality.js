/**
 * Test de comparaison - Ancienne vs Nouvelle personnalité vocale PRISM
 */

import { VoicePersonalityEnhancer } from './backend/voicePersonalityEnhancer.js';
import { config } from './config.js';

const enhancer = new VoicePersonalityEnhancer();

console.log('🎤 TEST DE PERSONNALITÉ VOCALE PRISM');
console.log('====================================\n');

// Textes de test pour différents contextes
const testTexts = [
  {
    text: "Bonjour ! Je suis PRISM et je suis là pour vous aider aujourd'hui.",
    context: "Salutation",
    taskType: "general"
  },
  {
    text: "Nous avons détecté une erreur critique dans le système qui nécessite votre attention immédiate.",
    context: "Urgence",
    taskType: "technical"
  },
  {
    text: "L'analyse des données révèle des tendances intéressantes. Permettez-moi de vous expliquer en détail les implications.",
    context: "Analyse",
    taskType: "analytical"
  },
  {
    text: "Excellente question ! J'ai une idée fantastique qui pourrait révolutionner votre approche.",
    context: "Créativité",
    taskType: "creative"
  },
  {
    text: "La migration vers GPT-4.1 est maintenant terminée et le système fonctionne parfaitement.",
    context: "Succès",
    taskType: "technical"
  }
];

function displayComparison(original, enhanced, context) {
  console.log(`📝 CONTEXTE: ${context}`);
  console.log('─'.repeat(50));
  
  console.log('🤖 ANCIEN (Robotique):');
  console.log(`   Texte: "${original}"`);
  console.log(`   Voix: ${config.CONFIG.ELEVENLABS.VOICE_ID} (Rachel basique)`);
  console.log(`   Paramètres: Stability=${config.CONFIG.ELEVENLABS.STABILITY}, Style=${config.CONFIG.ELEVENLABS.STYLE}`);
  
  console.log('\n✨ NOUVEAU (Expressif):');
  console.log(`   Texte: "${enhanced.enhancedText}"`);
  console.log(`   Voix: ${enhanced.voiceConfig.metadata.voiceName}`);
  console.log(`   Mode: ${enhanced.voiceConfig.context.mode}`);
  console.log(`   Émotion: ${enhanced.voiceConfig.context.emotion}`);
  console.log(`   Paramètres:`);
  console.log(`     • Stability: ${enhanced.voiceConfig.voice_settings.stability}`);
  console.log(`     • Style: ${enhanced.voiceConfig.voice_settings.style}`);
  console.log(`     • Speaking Rate: ${enhanced.voiceConfig.voice_settings.speaking_rate}`);
  console.log(`     • Pitch: ${enhanced.voiceConfig.voice_settings.pitch}`);
  
  console.log('\n💡 AMÉLIORATIONS:');
  const improvements = [];
  
  if (enhanced.enhancedText !== original) {
    improvements.push('✅ Texte enrichi avec émojis et pauses');
  }
  if (enhanced.voiceConfig.voice_settings.style > 0.1) {
    improvements.push('✅ Style vocal plus expressif');
  }
  if (enhanced.voiceConfig.voice_settings.stability < 0.4) {
    improvements.push('✅ Plus de variabilité vocale');
  }
  if (enhanced.voiceConfig.voice_settings.speaking_rate !== 1.0) {
    improvements.push('✅ Rythme adapté au contexte');
  }
  
  improvements.forEach(improvement => console.log(`   ${improvement}`));
  
  console.log(`\n${  '='.repeat(70)  }\n`);
}

// Tests des prompts système améliorés
console.log('🎯 PROMPTS SYSTÈME AMÉLIORÉS:');
console.log('='.repeat(40));

const enhancedPrompts = enhancer.enhanceSystemPrompts();
const originalPrompts = {
  openai: "Tu es PRISM, une IA avancée. Réponds de manière concise et professionnelle.",
  claude: "Tu es PRISM-Claude, spécialisé en analyse stratégique. Réponds de manière structurée et nuancée.",
  perplexity: "Tu es un assistant de recherche rapide pour PRISM."
};

Object.keys(enhancedPrompts).forEach(model => {
  console.log(`\n🤖 ${model.toUpperCase()} - ANCIEN:`);
  console.log(`   "${originalPrompts[model]}"`);
  
  console.log(`\n✨ ${model.toUpperCase()} - NOUVEAU (extraits):`);
  const lines = enhancedPrompts[model].split('\n').slice(0, 8);
  lines.forEach(line => {
    if (line.trim()) console.log(`   ${line}`);
  });
  console.log('   [... plus de guidelines vocales]');
});

console.log('\n\n🎤 TEST DES TEXTES AVEC AMÉLIORATION:');
console.log('='.repeat(50));

// Test de chaque texte
testTexts.forEach(testCase => {
  const enhanced = enhancer.enhanceForVoice(
    testCase.text, 
    testCase.taskType
  );
  
  displayComparison(testCase.text, enhanced, testCase.context);
});

// Résumé des améliorations
console.log('📊 RÉSUMÉ DES AMÉLIORATIONS:');
console.log('='.repeat(40));
console.log('✅ Voix multiples selon le contexte (4 voix disponibles)');
console.log('✅ Paramètres adaptatifs (stabilité, style, rythme, pitch)');
console.log('✅ Modes émotionnels (urgent, confiant, excité, réfléchi)');
console.log('✅ Texte enrichi (émojis, pauses, emphases)');
console.log('✅ Analyse contextuelle automatique');
console.log('✅ Prompts système améliorés pour l\'expressivité');

console.log('\n🎯 PROCHAINES ÉTAPES RECOMMANDÉES:');
console.log('================================');
console.log('1. 🔧 Intégrer le VoicePersonalityEnhancer dans l\'orchestrator');
console.log('2. 🎤 Mettre à jour la configuration ElevenLabs avec les nouveaux paramètres');
console.log('3. 🧪 Tester avec différentes voix ElevenLabs');
console.log('4. 🎛️ Ajuster les seuils de détection émotionnelle');
console.log('5. 🚀 Déployer en mode test et recueillir les retours');

console.log('\n💡 Pour appliquer ces améliorations:');
console.log('   • Modifier backend/orchestrator.js pour utiliser VoicePersonalityEnhancer');
console.log('   • Mettre à jour config.js avec ENHANCED_VOICE_CONFIG');
console.log('   • Redémarrer PRISM et tester l\'interface vocale');

console.log('\n🎉 Votre PRISM aura une personnalité vocale beaucoup plus engageante !'); 