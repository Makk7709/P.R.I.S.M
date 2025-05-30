/**
 * Test de vérification de la migration GPT-4.1
 * Ce test vérifie que PRISM utilise maintenant le modèle gpt-4.1
 */

import dotenv from 'dotenv';
import { config } from './config.js';

// Charger les variables d'environnement
dotenv.config();

console.log('🔍 VÉRIFICATION DE LA MIGRATION GPT-4.1');
console.log('=========================================');

// Test 1: Variable d'environnement
console.log('\n1. Variable d\'environnement OPENAI_MODEL:');
console.log(`   Valeur actuelle: ${process.env.OPENAI_MODEL}`);
console.log(`   ✅ Résultat: ${process.env.OPENAI_MODEL === 'gpt-4.1' ? 'SUCCÈS' : 'ÉCHEC'}`);

// Test 2: Configuration par défaut
console.log('\n2. Configuration par défaut dans config.js:');
console.log(`   Valeur configurée: ${config.CONFIG.MODELS.OPENAI.MODEL}`);
console.log(`   ✅ Résultat: ${config.CONFIG.MODELS.OPENAI.MODEL === 'gpt-4.1' ? 'SUCCÈS' : 'ÉCHEC'}`);

// Test 3: Modèle effectif utilisé par l'orchestrator
const effectiveModel = process.env.OPENAI_MODEL || 'gpt-4.1';
console.log('\n3. Modèle effectif utilisé par l\'orchestrator:');
console.log(`   Modèle sélectionné: ${effectiveModel}`);
console.log(`   ✅ Résultat: ${effectiveModel === 'gpt-4.1' ? 'SUCCÈS' : 'ÉCHEC'}`);

// Test 4: Vérification que gpt-4-turbo n'est plus utilisé
const isOldModel = effectiveModel.includes('gpt-4-turbo');
console.log('\n4. Absence de l\'ancien modèle gpt-4-turbo:');
console.log(`   Utilise encore gpt-4-turbo: ${isOldModel ? 'OUI' : 'NON'}`);
console.log(`   ✅ Résultat: ${!isOldModel ? 'SUCCÈS' : 'ÉCHEC'}`);

// Résumé final
const allTestsPassed = 
  process.env.OPENAI_MODEL === 'gpt-4.1' &&
  config.CONFIG.MODELS.OPENAI.MODEL === 'gpt-4.1' &&
  effectiveModel === 'gpt-4.1' &&
  !isOldModel;

console.log('\n📊 RÉSUMÉ DE LA MIGRATION:');
console.log('==========================');
console.log(`🎯 Migration vers GPT-4.1: ${allTestsPassed ? '✅ RÉUSSIE' : '❌ ÉCHOUÉE'}`);
console.log(`📝 Modèle actif: ${effectiveModel}`);
console.log(`⚡ Prêt pour la production: ${allTestsPassed ? 'OUI' : 'NON'}`);

if (!allTestsPassed) {
  console.log('\n🚨 Actions requises:');
  if (process.env.OPENAI_MODEL !== 'gpt-4.1') {
    console.log('   - Mettre à jour OPENAI_MODEL=gpt-4.1 dans .env');
  }
  if (config.CONFIG.MODELS.OPENAI.MODEL !== 'gpt-4.1') {
    console.log('   - Mettre à jour la configuration dans config.js');
  }
  process.exit(1);
} else {
  console.log('\n🎉 La migration GPT-4.1 est maintenant active !');
  process.exit(0);
} 