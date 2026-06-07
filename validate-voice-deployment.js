#!/usr/bin/env node

/**
 * Script de validation finale du déploiement vocal PRISM
 * Vérifie que toutes les améliorations sont correctement configurées
 */

import { config } from './config.js';
import { VoicePersonalityEnhancer } from './backend/voicePersonalityEnhancer.js';
import { PRISMVoiceEnhancer } from './config-voice-enhanced.js';
import fs from 'node:fs';

console.log('🔍 VALIDATION DÉPLOIEMENT VOCAL PRISM');
console.log('=====================================\n');

let validationScore = 0;
const maxScore = 10;

// Test 1: Configuration ElevenLabs
console.log('1️⃣ Configuration ElevenLabs');
console.log('──────────────────────────');

const elevenlabs = config.CONFIG.ELEVENLABS;

if (elevenlabs.MODEL_ID === 'eleven_multilingual_v2') {
  console.log('✅ Modèle vocal optimisé (eleven_multilingual_v2)');
  validationScore++;
} else {
  console.log('❌ Modèle vocal non optimisé:', elevenlabs.MODEL_ID);
}

if (elevenlabs.STYLE >= 0.6) {
  console.log('✅ Style expressif configuré:', elevenlabs.STYLE);
  validationScore++;
} else {
  console.log('⚠️ Style peu expressif:', elevenlabs.STYLE);
}

if (elevenlabs.STABILITY <= 0.4) {
  console.log('✅ Stabilité optimisée pour variabilité:', elevenlabs.STABILITY);
  validationScore++;
} else {
  console.log('⚠️ Stabilité trop élevée (peu de variabilité):', elevenlabs.STABILITY);
}

if (elevenlabs.VOICES && Object.keys(elevenlabs.VOICES).length >= 4) {
  console.log('✅ Voix multiples configurées:', Object.keys(elevenlabs.VOICES).length);
  validationScore++;
} else {
  console.log('❌ Voix multiples manquantes');
}

console.log();

// Test 2: Modules d'amélioration vocale
console.log('2️⃣ Modules d\'amélioration vocale');
console.log('─────────────────────────────────');

try {
  const voiceEnhancer = new VoicePersonalityEnhancer();
  const _prismEnhancer = new PRISMVoiceEnhancer();
  
  console.log('✅ VoicePersonalityEnhancer chargé');
  console.log('✅ PRISMVoiceEnhancer chargé');
  
  const prompts = voiceEnhancer.enhanceSystemPrompts();
  if (prompts.openai.length > 500 && prompts.claude.length > 500) {
    console.log('✅ Prompts enrichis générés');
    validationScore++;
  } else {
    console.log('❌ Prompts enrichis insuffisants');
  }
  
  validationScore++;
} catch (error) {
  console.log('❌ Erreur chargement modules:', error.message);
}

console.log();

// Test 3: Intégration orchestrator
console.log('3️⃣ Intégration orchestrator');
console.log('───────────────────────────');

try {
  const orchestratorContent = fs.readFileSync('./backend/orchestrator.js', 'utf8');
  
  if (orchestratorContent.includes('VoicePersonalityEnhancer')) {
    console.log('✅ VoicePersonalityEnhancer importé dans orchestrator');
    validationScore++;
  } else {
    console.log('❌ VoicePersonalityEnhancer non importé');
  }
  
  if (orchestratorContent.includes('enhancedPrompts')) {
    console.log('✅ Prompts enrichis utilisés');
    validationScore++;
  } else {
    console.log('❌ Prompts enrichis non utilisés');
  }
  
  if (orchestratorContent.includes('voiceEnrichment')) {
    console.log('✅ Enrichissement vocal intégré');
    validationScore++;
  } else {
    console.log('❌ Enrichissement vocal non intégré');
  }
  
} catch (error) {
  console.log('❌ Erreur lecture orchestrator:', error.message);
}

console.log();

// Test 4: Fichiers de test
console.log('4️⃣ Fichiers de test');
console.log('──────────────────');

const testFiles = [
  'test-voice-personality.js',
  'test-enhanced-voice-integration.js',
  'config-voice-enhanced.js',
  'backend/voicePersonalityEnhancer.js'
];

let testFilesCount = 0;
testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
    testFilesCount++;
  } else {
    console.log(`❌ ${file} manquant`);
  }
});

if (testFilesCount === testFiles.length) {
  validationScore++;
}

console.log();

// Test 5: Configuration API
console.log('5️⃣ Configuration API');
console.log('────────────────────');

if (elevenlabs.API_KEY && elevenlabs.API_KEY !== 'ta_clef_api_ici') {
  console.log('✅ Clé ElevenLabs configurée');
  validationScore++;
} else {
  console.log('⚠️ Clé ElevenLabs non configurée (mode test)');
  console.log('   → Configurez process.env.ELEVENLABS_API_KEY pour la production');
}

console.log();

// Résumé final
console.log('📊 RÉSUMÉ DE VALIDATION');
console.log('═══════════════════════');

const percentage = Math.round((validationScore / maxScore) * 100);
console.log(`Score: ${validationScore}/${maxScore} (${percentage}%)`);

if (percentage >= 90) {
  console.log('🎉 EXCELLENT ! Déploiement vocal parfaitement configuré');
  console.log('✅ Toutes les améliorations sont opérationnelles');
  console.log('🚀 PRISM est prêt avec sa voix expressive !');
} else if (percentage >= 70) {
  console.log('✅ BON ! Déploiement vocal bien configuré');
  console.log('⚠️ Quelques ajustements mineurs recommandés');
  console.log('🎯 PRISM fonctionne avec améliorations vocales');
} else if (percentage >= 50) {
  console.log('⚠️ MOYEN ! Déploiement vocal partiellement configuré');
  console.log('🔧 Corrections nécessaires avant production');
  console.log('📋 Consultez les erreurs ci-dessus');
} else {
  console.log('❌ INSUFFISANT ! Déploiement vocal incomplet');
  console.log('🚨 Configuration requise avant utilisation');
  console.log('📖 Suivez le guide de déploiement');
}

console.log();

// Recommandations
console.log('🎯 PROCHAINES ACTIONS RECOMMANDÉES');
console.log('═══════════════════════════════════');

if (elevenlabs.API_KEY === 'ta_clef_api_ici') {
  console.log('1. 🔑 Configurer votre vraie clé ElevenLabs');
  console.log('   export ELEVENLABS_API_KEY=sk_votre_clé');
}

if (percentage < 100) {
  console.log('2. 🔧 Corriger les erreurs identifiées ci-dessus');
}

console.log('3. 🧪 Tester l\'interface vocale :');
console.log('   node test-enhanced-voice-integration.js');

console.log('4. 🚀 Redémarrer PRISM pour appliquer les changements');

console.log('5. 📊 Monitorer les logs d\'enrichissement vocal :');
console.log('   grep "enrichie vocalement" logs/prism.log');

console.log();
console.log('📖 Guide complet : GUIDE_DÉPLOIEMENT_VOIX_AMÉLIORÉE.md');
console.log('🎤 Votre PRISM n\'a jamais été aussi expressif !'); 