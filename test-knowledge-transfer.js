#!/usr/bin/env node

/**
 * Test de démonstration du transfert de savoir PRISM
 * Montre comment PRISM transfère des connaissances entre domaines
 */

import { KnowledgeTransferEngine } from './asi/knowledgeTransferEngine.js';
import 'dotenv/config';

console.log('🧠 TEST DE TRANSFERT DE SAVOIR PRISM');
console.log('═══════════════════════════════════════');

async function demonstrateKnowledgeTransfer() {
  try {
    // Initialisation du moteur de transfert
    console.log('🔧 Initialisation du moteur de transfert de connaissances...');
    const transferEngine = new KnowledgeTransferEngine({
      crossDomainTransfer: true,
      analogicalReasoning: true,
      transferThreshold: 0.6,
      analogyStrength: 0.7
    });

    // Démarrage du moteur
    await transferEngine.start();
    console.log('✅ Moteur de transfert initialisé\n');

    // Test 1: Transfert Biologie → Informatique
    console.log('🧬 TEST 1: Transfert Biologie → Informatique');
    console.log('─────────────────────────────────────────────');
    
    const biologicalTask = {
      description: "Comment optimiser un réseau de neurones en s'inspirant de l'évolution naturelle",
      content: "algorithme génétique pour optimisation réseau neuronal",
      targetDomain: "computer_science",
      problemType: "optimization"
    };

    const result1 = await transferEngine.processTask(biologicalTask);
    
    console.log('📊 Résultat du transfert:');
    console.log(`   🎯 Domaine source: ${result1.transfers.sourceDomain}`);
    console.log(`   🔗 Connaissances transférées: ${result1.transfers.transferredKnowledge}`);
    console.log(`   🎨 Analogies utilisées: ${result1.transfers.analogiesUsed}`);
    console.log(`   📈 Score de validation: ${result1.transfers.validationScore}`);
    console.log(`   ⚡ Temps de traitement: ${result1.processingTime}ms`);
    console.log(`   🎯 Confiance: ${(result1.confidence * 100).toFixed(1)}%\n`);

    // Test 2: Transfert Physique → Économie
    console.log('⚛️ TEST 2: Transfert Physique → Économie');
    console.log('──────────────────────────────────────');
    
    const physicsTask = {
      description: "Appliquer les lois de la thermodynamique aux marchés financiers",
      content: "équilibre thermodynamique conservation énergie marchés financiers",
      targetDomain: "economics",
      problemType: "market_analysis"
    };

    const result2 = await transferEngine.processTask(physicsTask);
    
    console.log('📊 Résultat du transfert:');
    console.log(`   🎯 Domaine source: ${result2.transfers.sourceDomain}`);
    console.log(`   🔗 Connaissances transférées: ${result2.transfers.transferredKnowledge}`);
    console.log(`   🎨 Analogies utilisées: ${result2.transfers.analogiesUsed}`);
    console.log(`   📈 Score de validation: ${result2.transfers.validationScore}`);
    console.log(`   ⚡ Temps de traitement: ${result2.processingTime}ms`);
    console.log(`   🎯 Confiance: ${(result2.confidence * 100).toFixed(1)}%\n`);

    // Test 3: Transfert Mathématiques → Art
    console.log('🎨 TEST 3: Transfert Mathématiques → Art');
    console.log('──────────────────────────────────────────');
    
    const mathTask = {
      description: "Utiliser la géométrie fractale pour créer des œuvres d'art génératif",
      content: "fractales géométrie patterns art génératif récursion",
      targetDomain: "art",
      problemType: "creative_generation"
    };

    const result3 = await transferEngine.processTask(mathTask);
    
    console.log('📊 Résultat du transfert:');
    console.log(`   🎯 Domaine source: ${result3.transfers.sourceDomain}`);
    console.log(`   🔗 Connaissances transférées: ${result3.transfers.transferredKnowledge}`);
    console.log(`   🎨 Analogies utilisées: ${result3.transfers.analogiesUsed}`);
    console.log(`   📈 Score de validation: ${result3.transfers.validationScore}`);
    console.log(`   ⚡ Temps de traitement: ${result3.processingTime}ms`);
    console.log(`   🎯 Confiance: ${(result3.confidence * 100).toFixed(1)}%\n`);

    // Obtenir les métriques globales
    const metrics = transferEngine.getTransferMetrics();
    
    console.log('📈 MÉTRIQUES GLOBALES DE TRANSFERT');
    console.log('══════════════════════════════════');
    console.log(`🎯 Transferts réussis: ${metrics.successfulTransfers}`);
    console.log(`❌ Transferts échoués: ${metrics.failedTransfers}`);
    console.log(`📊 Taux de réussite: ${(metrics.successRate * 100).toFixed(1)}%`);
    console.log(`⚡ Temps moyen: ${metrics.averageProcessingTime.toFixed(0)}ms`);
    console.log(`🧠 Domaines actifs: ${metrics.activeDomains}`);
    console.log(`🔗 Analogies dans la base: ${metrics.totalAnalogies}\n`);

    console.log('🎉 DÉMONSTRATION TERMINÉE AVEC SUCCÈS !');
    console.log('✅ Le système de transfert de savoir PRISM est opérationnel');

  } catch (error) {
    console.error('❌ Erreur lors de la démonstration:', error.message);
    console.error('Détails:', error);
  }
}

// Lancement de la démonstration
demonstrateKnowledgeTransfer();
