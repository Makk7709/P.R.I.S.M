#!/usr/bin/env node

/**
 * Test de PERSISTENCE du système mémoire PRISM
 * Vérifie si les données survivent à un redémarrage
 */

import { ASIMemorySystem } from './asi/asiMemorySystem.js';
import fs from 'node:fs';
import 'dotenv/config';

console.log('🔬 TEST PERSISTENCE MÉMOIRE PRISM');
console.log('═══════════════════════════════════');

class PersistenceTest {
  constructor() {
    this.testId = `test_${Date.now()}`;
  }

  async testMemoryPersistence() {
    console.log('\n🧪 TEST 1: Stockage + Arrêt + Redémarrage');
    console.log('─────────────────────────────────────────');
    
    // PHASE 1: Stockage
    console.log('📝 PHASE 1: Stockage de données...');
    
    const memory1 = new ASIMemorySystem({ memoryLimit: 128 });
    await memory1.start();
    
    const testData = {
      type: 'persistence_test',
      content: `Données de test pour persistence - ID: ${this.testId}`,
      timestamp: Date.now(),
      metadata: { test: true, phase: 1 }
    };
    
    const dataId = await memory1.storeKnowledge(testData);
    console.log(`   ✅ Données stockées avec ID: ${dataId}`);
    
    // Vérification stockage
    const retrieved1 = await memory1.retrieveKnowledge(dataId);
    console.log(`   ✅ Vérification immédiate: ${retrieved1 ? 'TROUVÉ' : 'PERDU'}`);
    
    // État avant arrêt
    const healthBefore = await memory1.getHealthStatus();
    console.log(`   📊 Entrées avant arrêt: ${healthBefore.totalEntries}`);
    
    // ARRÊT du système
    await memory1.stop();
    console.log('   🛑 Système arrêté');
    
    // PHASE 2: Redémarrage
    console.log('\n🔄 PHASE 2: Redémarrage et vérification...');
    
    const memory2 = new ASIMemorySystem({ memoryLimit: 128 });
    await memory2.start();
    
    // État après redémarrage
    const healthAfter = await memory2.getHealthStatus();
    console.log(`   📊 Entrées après redémarrage: ${healthAfter.totalEntries}`);
    
    // Test récupération après redémarrage
    const retrieved2 = await memory2.retrieveKnowledge(dataId);
    console.log(`   🔍 Récupération après redémarrage: ${retrieved2 ? 'TROUVÉ' : 'PERDU'}`);
    
    await memory2.stop();
    
    return {
      beforeEntries: healthBefore.totalEntries,
      afterEntries: healthAfter.totalEntries,
      persistenceWorking: !!retrieved2,
      dataLost: !retrieved2
    };
  }

  async testFileSystemPersistence() {
    console.log('\n💾 TEST 2: Vérification système de fichiers');
    console.log('────────────────────────────────────────────');
    
    // Recherche de fichiers de persistence
    const possiblePaths = [
      './data/',
      './persistence/',
      './memory/',
      './asi-data/',
      './logs/',
      './'
    ];
    
    const memoryFiles = [];
    
    for (const path of possiblePaths) {
      try {
        if (fs.existsSync(path)) {
          const files = fs.readdirSync(path);
          const memFiles = files.filter(f => 
            f.includes('memory') || 
            f.includes('persistence') || 
            f.includes('data') ||
            f.includes('.db') ||
            f.includes('.sqlite')
          );
          
          if (memFiles.length > 0) {
            console.log(`   📁 ${path}: ${memFiles.join(', ')}`);
            memoryFiles.push(...memFiles.map(f => `${path}${f}`));
          }
        }
      } catch (_error) {
        // Ignorer les erreurs d'accès
      }
    }
    
    console.log(`   📊 Total fichiers mémoire trouvés: ${memoryFiles.length}`);
    
    if (memoryFiles.length === 0) {
      console.log('   ⚠️ AUCUN fichier de persistence détecté');
      console.log('   🚨 Le système utilise probablement SEULEMENT la RAM');
    }
    
    return {
      memoryFilesFound: memoryFiles.length,
      files: memoryFiles,
      hasFilePersistence: memoryFiles.length > 0
    };
  }

  async testMemoryImplementation() {
    console.log('\n🔍 TEST 3: Analyse de l\'implémentation');
    console.log('─────────────────────────────────────────');
    
    const memory = new ASIMemorySystem({ memoryLimit: 64 });
    await memory.start();
    
    // Analyse des propriétés internes
    console.log('🔬 Analyse des structures de stockage:');
    console.log(`   📋 Types de stockage: ${Object.keys(memory.storage)}`);
    
    Object.keys(memory.storage).forEach(type => {
      const storageType = memory.storage[type].constructor.name;
      console.log(`   🗂️ ${type}: ${storageType}`);
    });
    
    // Test de vitesse détaillé
    console.log('\n⚡ Test de vitesse détaillé:');
    
    const speedTests = [];
    
    for (let i = 0; i < 10; i++) {
      const startTime = process.hrtime.bigint();
      
      const knowledge = {
        type: 'speed_test',
        content: `Test vitesse ${i}`,
        index: i
      };
      
      await memory.storeKnowledge(knowledge);
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      speedTests.push(duration);
      console.log(`   📊 Test ${i + 1}: ${duration.toFixed(3)}ms`);
    }
    
    const avgSpeed = speedTests.reduce((sum, time) => sum + time, 0) / speedTests.length;
    console.log(`   📈 Vitesse moyenne: ${avgSpeed.toFixed(3)}ms`);
    
    // Analyse si c'est réaliste
    const isRealistic = avgSpeed > 0.1; // Au moins 0.1ms pour une vraie opération
    console.log(`   🎯 Vitesse réaliste: ${isRealistic ? 'OUI' : 'NON - Trop rapide!'}`);
    
    await memory.stop();
    
    return {
      storageTypes: Object.keys(memory.storage).map(type => ({
        type,
        implementation: memory.storage[type].constructor.name
      })),
      averageSpeed: avgSpeed,
      isRealisticSpeed: isRealistic,
      allSpeedTests: speedTests
    };
  }

  async runCompleteTest() {
    console.log('🚀 DÉBUT TEST PERSISTENCE MÉMOIRE\n');
    
    const test1 = await this.testMemoryPersistence();
    const test2 = await this.testFileSystemPersistence();
    const test3 = await this.testMemoryImplementation();
    
    console.log('\n📊 ANALYSE FINALE');
    console.log('════════════════════════════════════════');
    
    console.log('🔍 PERSISTENCE:');
    console.log(`   📊 Entrées avant arrêt: ${test1.beforeEntries}`);
    console.log(`   📊 Entrées après redémarrage: ${test1.afterEntries}`);
    console.log(`   💾 Persistence fonctionne: ${test1.persistenceWorking ? 'OUI' : 'NON'}`);
    console.log(`   🚨 Données perdues: ${test1.dataLost ? 'OUI' : 'NON'}`);
    
    console.log('\n💾 FICHIERS:');
    console.log(`   📁 Fichiers de persistence: ${test2.memoryFilesFound}`);
    console.log(`   💿 Persistence sur disque: ${test2.hasFilePersistence ? 'OUI' : 'NON'}`);
    
    console.log('\n⚡ IMPLÉMENTATION:');
    console.log(`   🗂️ Type de stockage: ${test3.storageTypes.map(s => s.implementation).join(', ')}`);
    console.log(`   📈 Vitesse moyenne: ${test3.averageSpeed.toFixed(3)}ms`);
    console.log(`   🎯 Vitesse réaliste: ${test3.isRealisticSpeed ? 'OUI' : 'NON'}`);
    
    console.log('\n🎯 DIAGNOSTIC FINAL:');
    
    if (test1.dataLost && !test2.hasFilePersistence && test3.storageTypes.every(s => s.implementation === 'Map')) {
      console.log('   🚨 SYSTÈME MÉMOIRE = RAM VOLATILE UNIQUEMENT');
      console.log('   ⚠️ AUCUNE PERSISTENCE RÉELLE');
      console.log('   💡 Explication vitesses 0-1ms: stockage Map() JavaScript');
      console.log('   🔧 BESOIN: Implémentation base de données réelle');
    } else if (test1.persistenceWorking && test2.hasFilePersistence) {
      console.log('   ✅ SYSTÈME MÉMOIRE AVEC PERSISTENCE RÉELLE');
      console.log('   💾 Données survivent aux redémarrages');
    } else {
      console.log('   🤔 SYSTÈME MÉMOIRE HYBRIDE OU EN TRANSITION');
    }
    
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('   1. Implémenter persistence SQLite/base de données');
    console.log('   2. Ajouter mécanisme de sauvegarde automatique');
    console.log('   3. Créer backup/restore des connaissances');
    console.log('   4. Monitorer vitesses réalistes (10-100ms)');
  }
}

// Lancement du test
const tester = new PersistenceTest();
tester.runCompleteTest().catch(console.error);
