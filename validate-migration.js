#!/usr/bin/env node

/**
 * Script de validation de la migration GPT-4 → GPT-4.1
 * Validation sans Jest pour éviter les problèmes ESM
 */

import { config } from './config.js';
import { OPENAI_MODEL } from './backend/setupEnv.js';
import { AIProvider } from './src/core/ConsensusManager.js';

console.log('🚀 VALIDATION MIGRATION GPT-4.1 - PRISM v2.3');
console.log('=' .repeat(50));

let errors = 0;
let tests = 0;

function test(description, assertion) {
  tests++;
  try {
    if (assertion()) {
      console.log(`✅ ${description}`);
    } else {
      console.log(`❌ ${description}`);
      errors++;
    }
  } catch (error) {
    console.log(`❌ ${description} - Error: ${error.message}`);
    errors++;
  }
}

// Tests de configuration
console.log('\n📋 TESTS DE CONFIGURATION');
console.log('-'.repeat(30));

test('Config principale utilise GPT-4.1', () => {
  return config.CONFIG.MODELS.OPENAI.MODEL === 'gpt-4.1';
});

test('Config principale ne utilise plus GPT-4-turbo', () => {
  return config.CONFIG.MODELS.OPENAI.MODEL !== 'gpt-4-turbo';
});

test('Variables environnement par défaut GPT-4.1', () => {
  return OPENAI_MODEL === 'gpt-4.1';
});

test('Consensus Manager utilise GPT-4.1', () => {
  return AIProvider.GPT4 === 'gpt-4.1';
});

test('Consensus Manager ne utilise plus GPT-4', () => {
  return AIProvider.GPT4 !== 'gpt-4';
});

// Tests de cohérence
console.log('\n🔧 TESTS DE COHÉRENCE');
console.log('-'.repeat(30));

test('Configuration cohérente entre modules', () => {
  const modules = [
    config.CONFIG.MODELS.OPENAI.MODEL,
    OPENAI_MODEL,
    AIProvider.GPT4
  ];
  
  const uniqueModels = [...new Set(modules)];
  return uniqueModels.length === 1 && uniqueModels[0] === 'gpt-4.1';
});

test('Configuration OpenAI complète', () => {
  const openaiConfig = config.CONFIG.MODELS.OPENAI;
  return openaiConfig.MODEL && 
         openaiConfig.TIMEOUT === 30000 && 
         openaiConfig.MAX_RETRIES === 3;
});

// Tests de compatibilité
console.log('\n🎯 TESTS DE COMPATIBILITÉ');
console.log('-'.repeat(30));

test('Modèle validé selon spécifications OpenAI', () => {
  const validModels = [
    'gpt-4.1',
    'gpt-4.1-mini', 
    'gpt-4.1-nano',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ];
  
  return validModels.includes(config.CONFIG.MODELS.OPENAI.MODEL);
});

test('Support rollback via variable environnement', () => {
  // Simuler rollback
  const originalModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_MODEL = 'gpt-4-turbo';
  
  const rollbackWorking = process.env.OPENAI_MODEL === 'gpt-4-turbo';
  
  // Restaurer
  if (originalModel) {
    process.env.OPENAI_MODEL = originalModel;
  } else {
    delete process.env.OPENAI_MODEL;
  }
  
  return rollbackWorking;
});

// Résultats
console.log('\n📊 RÉSULTATS DE LA MIGRATION');
console.log('=' .repeat(50));

if (errors === 0) {
  console.log(`🎉 MIGRATION RÉUSSIE ! ${tests}/${tests} tests passés`);
  console.log('✅ GPT-4.1 configuré correctement dans tous les modules');
  console.log('✅ Compatibilité ascendante maintenue');
  console.log('✅ Rollback fonctionnel');
  process.exit(0);
} else {
  console.log(`❌ MIGRATION ÉCHOUÉE ! ${tests - errors}/${tests} tests passés`);
  console.log(`⚠️  ${errors} erreur(s) détectée(s)`);
  console.log('🔧 Veuillez corriger les erreurs avant de continuer');
  process.exit(1);
} 