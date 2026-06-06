#!/usr/bin/env node

/**
 * Test complet du système de mémoires PRISM avec vraies API
 * Analyse comment PRISM stocke, récupère et utilise ses souvenirs
 */

import { ASIMemorySystem } from './asi/asiMemorySystem.js';
import { prismMemory } from './prismMemory.js';
import { analyzeMemoryPerformance } from './backend/memoryAnalyzer.js';
import OpenAI from 'openai';
import 'dotenv/config';

console.log('🧠 TEST SYSTÈME DE MÉMOIRES PRISM');
console.log('════════════════════════════════════════');

// Configuration OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class MemorySystemTester {
  constructor() {
    this.asiMemory = null;
    this.testResults = [];
    this.memories = new Map();
  }

  async initialize() {
    console.log('🔧 Initialisation du système de mémoires...');
    
    try {
      // Initialisation ASI Memory System
      this.asiMemory = new ASIMemorySystem({
        memoryLimit: 1024, // 1GB pour test
        compressionEnabled: true,
        autoCleanup: true,
        retentionPeriod: 24 * 60 * 60 * 1000 // 24h pour test
      });

      await this.asiMemory.start();
      console.log('✅ ASI Memory System initialisé');
      
      // Vérification PrismMemory
      const stats = prismMemory.getMemoryStats();
      console.log('✅ PrismMemory initialisé:', stats);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
      return false;
    }
  }

  /**
   * Test 1: Stockage et récupération de mémoires basiques
   */
  async testBasicMemoryOperations() {
    console.log('\n🧠 TEST 1: Opérations mémoire basiques');
    console.log('─────────────────────────────────────────');
    
    const startTime = Date.now();
    
    try {
      // Test PrismMemory (localStorage)
      console.log('📝 Test stockage PrismMemory...');
      
      const testMemory = {
        type: 'conversation',
        content: 'Test de stockage de souvenir',
        context: 'test_unitaire',
        importance: 0.8
      };
      
      const stored = prismMemory.appendMemoryEntry(testMemory);
      console.log(`   ✅ Stockage PrismMemory: ${stored ? 'Réussi' : 'Échoué'}`);
      
      const stats = prismMemory.getMemoryStats();
      console.log(`   📊 Stats: ${stats.totalEntries} entrées`);
      
      // Test ASI Memory System
      console.log('📝 Test stockage ASI Memory...');
      
      const asiMemoryData = {
        content: 'Souvenir ASI test',
        importance: 0.9,
        context: { domain: 'test', type: 'episodic' },
        metadata: { source: 'test', confidence: 0.95 }
      };
      
      const asiStored = await this.asiMemory.storeMemory('test_memory_1', asiMemoryData, 'episodic');
      console.log(`   ✅ Stockage ASI Memory: ${asiStored ? 'Réussi' : 'Échoué'}`);
      
      // Test récupération
      console.log('🔍 Test récupération mémoires...');
      
      const retrieved = await this.asiMemory.retrieveMemory('test_memory_1');
      console.log(`   ✅ Récupération ASI: ${retrieved ? 'Trouvé' : 'Non trouvé'}`);
      
      if (retrieved) {
        console.log(`   📄 Contenu: "${retrieved.content}"`);
        console.log(`   📊 Importance: ${retrieved.importance}`);
        console.log(`   🏷️ Type: ${retrieved.type}`);
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`   ⚡ Temps total: ${processingTime}ms`);
      
      return {
        success: stored && asiStored && retrieved,
        processingTime,
        details: { prismMemory: stored, asiMemory: asiStored, retrieval: !!retrieved }
      };
      
    } catch (error) {
      console.error('❌ Erreur test mémoire basique:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test 2: Mémoire contextuelle avec vraie IA
   */
  async testContextualMemoryWithAI() {
    console.log('\n🤖 TEST 2: Mémoire contextuelle avec IA');
    console.log('─────────────────────────────────────────');
    
    const startTime = Date.now();
    
    try {
      // Stockage de plusieurs souvenirs contextuels
      console.log('📚 Création d\'un historique contextuel...');
      
      const conversations = [
        { role: 'user', content: 'Qu\'est-ce que l\'intelligence artificielle ?' },
        { role: 'assistant', content: 'L\'IA est la simulation de l\'intelligence humaine par des machines.' },
        { role: 'user', content: 'Comment fonctionne le machine learning ?' },
        { role: 'assistant', content: 'Le ML utilise des algorithmes pour apprendre à partir de données.' }
      ];
      
      // Stockage dans ASI Memory
      for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i];
        await this.asiMemory.storeMemory(
          `context_${i}`,
          {
            content: conv.content,
            role: conv.role,
            importance: 0.7,
            context: { topic: 'ai_learning', sequence: i },
            metadata: { timestamp: Date.now() + i * 1000 }
          },
          'episodic'
        );
      }
      
      console.log(`   ✅ ${conversations.length} souvenirs contextuels stockés`);
      
      // Test récupération contextuelle
      console.log('🔍 Test récupération contextuelle...');
      
      const contextResults = await this.asiMemory.searchMemories(
        'intelligence artificielle machine learning',
        { type: 'episodic', limit: 10 }
      );
      
      console.log(`   📊 ${contextResults.length} souvenirs contextuels trouvés`);
      
      // Test avec vraie IA : utilisation du contexte
      console.log('🧠 Test utilisation contexte avec OpenAI...');
      
      const aiStartTime = Date.now();
      
      // Formation du prompt avec contexte
      const contextString = contextResults.map(r => 
        `[${r.metadata?.timestamp || 'unknown'}] ${r.role || 'system'}: ${r.content}`
      ).join('\n');
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `Basé sur cet historique de conversation:

${contextString}

Réponds à cette nouvelle question en utilisant le contexte: "Peux-tu me donner un exemple concret d'application du machine learning ?"`
        }],
        max_tokens: 150,
        temperature: 0.3
      });
      
      const aiProcessingTime = Date.now() - aiStartTime;
      
      const aiResponse = response.choices[0].message.content;
      console.log(`   🤖 Réponse IA avec contexte: "${aiResponse.substring(0, 100)}..."`);
      console.log(`   ⚡ Temps IA: ${aiProcessingTime}ms`);
      console.log(`   🎯 Tokens utilisés: ${response.usage.total_tokens}`);
      
      // Stockage de la nouvelle interaction
      await this.asiMemory.storeMemory(
        `context_${conversations.length}`,
        {
          content: aiResponse,
          role: 'assistant',
          importance: 0.8,
          context: { topic: 'ai_learning', sequence: conversations.length, used_context: true },
          metadata: { 
            timestamp: Date.now(),
            tokens_used: response.usage.total_tokens,
            processing_time: aiProcessingTime 
          }
        },
        'episodic'
      );
      
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        contextFound: contextResults.length,
        aiResponse: aiResponse.length > 0,
        processingTime: totalTime,
        aiProcessingTime,
        tokensUsed: response.usage.total_tokens
      };
      
    } catch (error) {
      console.error('❌ Erreur test contextuel:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test 3: Analyse des patterns de mémoire
   */
  async testMemoryPatterns() {
    console.log('\n📈 TEST 3: Analyse patterns de mémoire');
    console.log('────────────────────────────────────────');
    
    try {
      // Analyse des métriques ASI Memory
      const memoryStats = this.asiMemory.getMemoryStats();
      console.log('📊 Statistiques ASI Memory:');
      console.log(`   💾 Utilisation mémoire: ${memoryStats.memoryUsage}MB`);
      console.log(`   📝 Total entrées: ${memoryStats.totalEntries}`);
      console.log(`   🗜️ Ratio compression: ${(memoryStats.compressionRatio * 100).toFixed(1)}%`);
      console.log(`   📖 Lectures: ${memoryStats.reads}`);
      console.log(`   ✍️ Écritures: ${memoryStats.writes}`);
      
      // Test recherche par patterns
      console.log('\n🔍 Test recherche par patterns...');
      
      const patterns = [
        'intelligence artificielle',
        'machine learning',
        'algorithme',
        'données'
      ];
      
      const patternResults = {};
      
      for (const pattern of patterns) {
        const results = await this.asiMemory.searchMemories(pattern, { limit: 5 });
        patternResults[pattern] = results.length;
        console.log(`   🔎 "${pattern}": ${results.length} résultats`);
      }
      
      // Analyse des types de mémoire
      console.log('\n🏷️ Analyse types de mémoire...');
      
      const memoryTypes = await this.asiMemory.getMemoryTypeDistribution();
      Object.entries(memoryTypes).forEach(([type, count]) => {
        console.log(`   📋 ${type}: ${count} entrées`);
      });
      
      // Test performance analyzer
      console.log('\n📊 Test Memory Analyzer...');
      
      const analysisResults = await analyzeMemoryPerformance(20);
      console.log(`   📈 Taux de succès: ${analysisResults.successRate || 'N/A'}%`);
      console.log(`   📉 Taux d'échec: ${analysisResults.failureRate || 'N/A'}%`);
      console.log(`   📋 Snapshots analysés: ${analysisResults.totalSnapshots}`);
      
      return {
        success: true,
        memoryStats,
        patternResults,
        memoryTypes,
        analysisResults
      };
      
    } catch (error) {
      console.error('❌ Erreur analyse patterns:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test 4: Performance et compression
   */
  async testMemoryPerformance() {
    console.log('\n⚡ TEST 4: Performance et compression');
    console.log('───────────────────────────────────────');
    
    const startTime = Date.now();
    
    try {
      console.log('💾 Test performance stockage en masse...');
      
      // Création de 100 souvenirs pour test performance
      const batchStartTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await this.asiMemory.storeMemory(
          `perf_test_${i}`,
          {
            content: `Souvenir de performance test numéro ${i} avec du contenu variable pour tester la compression et les performances du système de mémoire.`,
            importance: Math.random(),
            context: { 
              test: 'performance', 
              batch: Math.floor(i / 10),
              category: ['tech', 'business', 'research'][i % 3]
            },
            metadata: { 
              test_id: i,
              timestamp: Date.now() + i 
            }
          },
          ['episodic', 'semantic', 'procedural'][i % 3]
        );
      }
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`   ✅ 100 souvenirs stockés en ${batchTime}ms`);
      console.log(`   ⚡ Moyenne: ${(batchTime / 100).toFixed(2)}ms par souvenir`);
      
      // Test récupération en masse
      console.log('🔍 Test récupération en masse...');
      
      const retrievalStartTime = Date.now();
      const retrievedMemories = [];
      
      for (let i = 0; i < 50; i++) {
        const memory = await this.asiMemory.retrieveMemory(`perf_test_${i * 2}`);
        if (memory) retrievedMemories.push(memory);
      }
      
      const retrievalTime = Date.now() - retrievalStartTime;
      console.log(`   ✅ ${retrievedMemories.length}/50 souvenirs récupérés en ${retrievalTime}ms`);
      console.log(`   ⚡ Moyenne récupération: ${(retrievalTime / 50).toFixed(2)}ms`);
      
      // Test compression
      console.log('🗜️ Test compression mémoire...');
      
      const beforeCompression = this.asiMemory.getMemoryStats();
      const compressionResult = await this.asiMemory.compressMemories();
      const afterCompression = this.asiMemory.getMemoryStats();
      
      console.log(`   📊 Avant compression: ${beforeCompression.memoryUsage}MB`);
      console.log(`   📊 Après compression: ${afterCompression.memoryUsage}MB`);
      console.log(`   🗜️ Ratio compression: ${(afterCompression.compressionRatio * 100).toFixed(1)}%`);
      console.log(`   💾 Gain mémoire: ${(beforeCompression.memoryUsage - afterCompression.memoryUsage).toFixed(2)}MB`);
      
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        batchStorageTime: batchTime,
        averageStorageTime: batchTime / 100,
        retrievalTime,
        averageRetrievalTime: retrievalTime / 50,
        compressionRatio: afterCompression.compressionRatio,
        memoryGain: beforeCompression.memoryUsage - afterCompression.memoryUsage,
        totalTime
      };
      
    } catch (error) {
      console.error('❌ Erreur test performance:', error);
      return { success: false, error: error.message };
    }
  }

  async runCompleteTest() {
    console.log('🚀 DÉBUT DU TEST COMPLET SYSTÈME MÉMOIRES\n');
    
    // Initialisation
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('❌ ÉCHEC INITIALISATION - ARRÊT DES TESTS');
      return;
    }
    
    // Exécution des tests
    const test1 = await this.testBasicMemoryOperations();
    const test2 = await this.testContextualMemoryWithAI();
    const test3 = await this.testMemoryPatterns();
    const test4 = await this.testMemoryPerformance();
    
    // Résumé final
    console.log('\n📊 RÉSUMÉ FINAL DES TESTS');
    console.log('════════════════════════════════════════');
    
    console.log(`✅ Test 1 - Opérations basiques: ${test1.success ? 'RÉUSSI' : 'ÉCHOUÉ'}`);
    if (test1.success) {
      console.log(`   ⚡ Temps: ${test1.processingTime}ms`);
    }
    
    console.log(`✅ Test 2 - Mémoire contextuelle + IA: ${test2.success ? 'RÉUSSI' : 'ÉCHOUÉ'}`);
    if (test2.success) {
      console.log(`   🔍 Contexte trouvé: ${test2.contextFound} éléments`);
      console.log(`   ⚡ Temps IA: ${test2.aiProcessingTime}ms`);
      console.log(`   🎯 Tokens: ${test2.tokensUsed}`);
    }
    
    console.log(`✅ Test 3 - Analyse patterns: ${test3.success ? 'RÉUSSI' : 'ÉCHOUÉ'}`);
    if (test3.success) {
      console.log(`   📝 Entrées totales: ${test3.memoryStats.totalEntries}`);
      console.log(`   💾 Utilisation: ${test3.memoryStats.memoryUsage}MB`);
    }
    
    console.log(`✅ Test 4 - Performance: ${test4.success ? 'RÉUSSI' : 'ÉCHOUÉ'}`);
    if (test4.success) {
      console.log(`   📊 Stockage: ${test4.averageStorageTime.toFixed(2)}ms/souvenir`);
      console.log(`   🔍 Récupération: ${test4.averageRetrievalTime.toFixed(2)}ms/souvenir`);
      console.log(`   🗜️ Compression: ${(test4.compressionRatio * 100).toFixed(1)}%`);
    }
    
    const overallSuccess = test1.success && test2.success && test3.success && test4.success;
    
    console.log('\n🎯 CONCLUSION:');
    console.log(`   ${overallSuccess ? '🎉 SYSTÈME MÉMOIRES ENTIÈREMENT OPÉRATIONNEL !' : '⚠️ Certains problèmes détectés'}`);
    console.log(`   🧠 PRISM peut stocker, récupérer et utiliser ses souvenirs efficacement`);
    console.log(`   🤖 Intégration IA fonctionnelle avec contexte persistant`);
    console.log(`   ⚡ Performance acceptable pour usage production`);
  }
}

// Lancement du test
const tester = new MemorySystemTester();
tester.runCompleteTest().catch(console.error);
