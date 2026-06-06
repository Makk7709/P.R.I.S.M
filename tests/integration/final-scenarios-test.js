/**
 * Script de test final - Scénarios réels pour vérifier le fonctionnement complet de PRISM
 * Exécute plusieurs scénarios pour valider l'intégration complète
 */

import { TaskTypeProcessor } from '../../src/core/TaskTypeProcessor.js';

const scenarios = [
  {
    name: 'Scénario 1: Stratégie avec Recherche Temps Réel',
    input: 'Stratégie d\'expansion en UAE pour PRISM',
    taskType: 'strategie',
    expected: {
      persona: 'Strategic Advisor',
      researchUsed: true,
      consensusUsed: false
    }
  },
  {
    name: 'Scénario 2: Finance avec Format Structuré',
    input: 'Analyse financière du budget Q4 2024',
    taskType: 'finance',
    expected: {
      persona: 'Financial Advisor',
      researchUsed: false,
      consensusUsed: false
    }
  },
  {
    name: 'Scénario 3: Marketing Créatif',
    input: 'Créer une campagne marketing pour PRISM',
    taskType: 'marketing',
    expected: {
      persona: 'Marketing Strategist',
      researchUsed: false,
      consensusUsed: false
    }
  },
  {
    name: 'Scénario 4: Recherche avec Sources',
    input: 'Actualités IA décembre 2024',
    taskType: 'recherche',
    expected: {
      persona: 'Research Analyst',
      researchUsed: true,
      consensusUsed: false
    }
  },
  {
    name: 'Scénario 5: Requête Générale',
    input: 'Bonjour, comment allez-vous ?',
    taskType: 'general',
    expected: {
      persona: 'General',
      researchUsed: false,
      consensusUsed: false
    }
  }
];

async function runScenarios() {
  console.log('🚀 Démarrage des scénarios de test finaux...\n');
  
  const processor = new TaskTypeProcessor();
  let passed = 0;
  let failed = 0;
  
  for (const scenario of scenarios) {
    console.log(`\n📋 ${scenario.name}`);
    console.log(`   Input: "${scenario.input}"`);
    console.log(`   Task Type: ${scenario.taskType}`);
    
    try {
      const result = await processor.process(scenario.input, scenario.taskType);
      
      // Vérifications
      const checks = {
        persona: result.metadata.persona === scenario.expected.persona,
        researchUsed: result.metadata.researchUsed === scenario.expected.researchUsed,
        consensusUsed: result.metadata.consensusUsed === scenario.expected.consensusUsed,
        hasContent: !!result.content,
        hasMetadata: !!result.metadata
      };
      
      const allPassed = Object.values(checks).every(v => v === true);
      
      if (allPassed) {
        console.log('   ✅ PASSÉ');
        passed++;
      } else {
        console.log('   ❌ ÉCHOUÉ');
        console.log('   Vérifications:', checks);
        failed++;
      }
      
      console.log(`   Persona: ${result.metadata.persona}`);
      console.log(`   Recherche: ${result.metadata.researchUsed ? 'Oui' : 'Non'}`);
      console.log(`   Consensus: ${result.metadata.consensusUsed ? 'Oui' : 'Non'}`);
      console.log(`   Contenu: ${result.content.substring(0, 50)}...`);
      
    } catch (error) {
      console.log('   ❌ ERREUR:', error.message);
      failed++;
    }
  }
  
  console.log(`\n${  '='.repeat(60)}`);
  console.log(`📊 Résultats: ${passed} passés, ${failed} échoués sur ${scenarios.length} scénarios`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('✅ Tous les scénarios sont passés avec succès !');
    process.exit(0);
  } else {
    console.log('❌ Certains scénarios ont échoué.');
    process.exit(1);
  }
}

// Exécuter les scénarios
runScenarios().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

