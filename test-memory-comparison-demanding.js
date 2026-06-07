#!/usr/bin/env node

/**
 * TEST EXIGEANT - Comparaison Système Mémoire Original vs Corrigé
 * Validation rigoureuse avec métriques détaillées
 */

import { ASIMemorySystem } from './asi/asiMemorySystem.js';
import { ASIMemorySystemFixed } from './asi/asiMemorySystemFixed.js';
import OpenAI from 'openai';
import fs from 'node:fs';
import 'dotenv/config';

console.log('🔬 TEST EXIGEANT - COMPARAISON SYSTÈMES MÉMOIRE');
console.log('═══════════════════════════════════════════════════════════');

// Configuration OpenAI
let openai = null;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('✅ OpenAI configuré pour test intelligence');
} catch {
  console.warn('⚠️ OpenAI non configuré - Tests limités');
}

class DemandingMemoryTest {
  constructor() {
    this.originalSystem = null;
    this.fixedSystem = null;
    this.testData = [];
    this.results = {
      original: {},
      fixed: {},
      comparison: {}
    };
  }

  /**
   * Génère un dataset de test complexe
   */
  generateTestDataset() {
    const startTime = Date.now();
    console.log('\n📊 GÉNÉRATION DATASET DE TEST COMPLEXE...');
    
    this.testData = [
      // Connaissances techniques
      {
        type: 'general_knowledge',
        content: 'Intelligence artificielle générative transformer architecture attention mécanisme',
        domain: 'ai',
        importance: 0.9,
        tags: ['ai', 'transformer', 'attention', 'nlp'],
        metadata: { complexity: 'high', source: 'research' }
      },
      {
        type: 'general_knowledge', 
        content: 'Machine learning apprentissage automatique algorithmes supervision non-supervisé',
        domain: 'ai',
        importance: 0.8,
        tags: ['ml', 'algorithms', 'learning', 'supervision'],
        metadata: { complexity: 'medium', source: 'educational' }
      },
      {
        type: 'concept',
        content: 'Réseaux neurones artificiels backpropagation gradient descent optimisation',
        domain: 'ai',
        importance: 0.85,
        tags: ['neural', 'backprop', 'optimization', 'gradient'],
        metadata: { complexity: 'high', source: 'technical' }
      },
      
      // Expériences de tâches
      {
        type: 'task_experience',
        content: 'Analyse sentiments Twitter données textuelles classification binaire',
        domain: 'nlp',
        importance: 0.7,
        tags: ['sentiment', 'twitter', 'classification', 'nlp'],
        metadata: { project: 'social_analysis', success: true }
      },
      {
        type: 'task_experience',
        content: 'Détection objets images YOLO convolutional neural networks computer vision',
        domain: 'computer_vision',
        importance: 0.8,
        tags: ['yolo', 'cnn', 'object_detection', 'vision'],
        metadata: { project: 'vision_system', success: true }
      },
      
      // Procédures
      {
        type: 'procedure',
        content: 'Étapes entraînement modèle: préparation données, choix architecture, entraînement, validation, déploiement',
        domain: 'ml_ops',
        importance: 0.9,
        tags: ['training', 'pipeline', 'mlops', 'deployment'],
        metadata: { category: 'workflow', critical: true }
      },
      {
        type: 'procedure',
        content: 'Processus debugging neural network: vérifier gradients, analyser loss, ajuster learning rate',
        domain: 'debugging',
        importance: 0.8,
        tags: ['debugging', 'neural', 'gradients', 'loss'],
        metadata: { category: 'troubleshooting', difficulty: 'advanced' }
      },
      
      // Connaissances métier
      {
        type: 'general_knowledge',
        content: 'Blockchain décentralisation consensus proof-of-work smart contracts cryptographie',
        domain: 'blockchain',
        importance: 0.6,
        tags: ['blockchain', 'consensus', 'crypto', 'smart_contracts'],
        metadata: { industry: 'fintech', trend: 'emerging' }
      },
      {
        type: 'concept',
        content: 'Quantum computing qubits superposition entanglement quantum supremacy',
        domain: 'quantum',
        importance: 0.7,
        tags: ['quantum', 'qubits', 'superposition', 'supremacy'],
        metadata: { field: 'physics', maturity: 'experimental' }
      },
      
      // Connaissances diverses pour tests sémantiques
      {
        type: 'general_knowledge',
        content: 'Photosynthèse plantes lumière solaire glucose oxygène chlorophylle carbone',
        domain: 'biology',
        importance: 0.5,
        tags: ['photosynthesis', 'plants', 'oxygen', 'glucose'],
        metadata: { subject: 'biology', level: 'basic' }
      }
    ];
    
    const generateTime = Date.now() - startTime;
    console.log(`   ✅ ${this.testData.length} entrées générées en ${generateTime}ms`);
    console.log(`   📋 Domaines: ${[...new Set(this.testData.map(d => d.domain))].join(', ')}`);
    console.log(`   🏷️ Tags uniques: ${[...new Set(this.testData.flatMap(d => d.tags))].length}`);
  }

  /**
   * Initialise les deux systèmes
   */
  async initializeSystems() {
    console.log('\n🔧 INITIALISATION DES SYSTÈMES...');
    
    const originalStartTime = Date.now();
    this.originalSystem = new ASIMemorySystem({
      memoryLimit: 256,
      compressionEnabled: true,
      autoCleanup: false // Désactiver pour test contrôlé
    });
    await this.originalSystem.start();
    const originalInitTime = Date.now() - originalStartTime;
    
    const fixedStartTime = Date.now();
    this.fixedSystem = new ASIMemorySystemFixed({
      memoryLimit: 256,
      compressionEnabled: true,
      autoCleanup: false,
      persistenceFile: './data/test-memory-fixed.json',
      enableRealSemantic: true
    });
    await this.fixedSystem.start();
    const fixedInitTime = Date.now() - fixedStartTime;
    
    console.log(`   ✅ Système Original: ${originalInitTime}ms`);
    console.log(`   ✅ Système Corrigé: ${fixedInitTime}ms`);
    
    this.results.original.initTime = originalInitTime;
    this.results.fixed.initTime = fixedInitTime;
  }

  /**
   * Test 1: Performance de stockage en masse
   */
  async testMassStorage() {
    console.log('\n📝 TEST 1: PERFORMANCE STOCKAGE EN MASSE');
    console.log('─────────────────────────────────────────────');
    
    // Test système original
    console.log('🔄 Test système ORIGINAL...');
    const originalStartTime = Date.now();
    const originalIds = [];
    
    for (const data of this.testData) {
      try {
        const id = await this.originalSystem.storeKnowledge(data);
        if (id) originalIds.push(id);
      } catch (error) {
        console.warn(`   ⚠️ Erreur stockage original: ${error.message}`);
      }
    }
    
    const originalStorageTime = Date.now() - originalStartTime;
    const originalHealth = await this.originalSystem.getHealthStatus();
    
    console.log(`   📊 IDs créés: ${originalIds.length}/${this.testData.length}`);
    console.log(`   ⚡ Temps total: ${originalStorageTime}ms`);
    console.log(`   📈 Temps moyen: ${(originalStorageTime / this.testData.length).toFixed(2)}ms/entrée`);
    console.log(`   💾 Entrées comptées: ${originalHealth.totalEntries}`);
    
    // Test système corrigé
    console.log('\n🔄 Test système CORRIGÉ...');
    const fixedStartTime = Date.now();
    const fixedIds = [];
    
    for (const data of this.testData) {
      try {
        const id = await this.fixedSystem.storeKnowledge(data);
        if (id) fixedIds.push(id);
      } catch (error) {
        console.warn(`   ⚠️ Erreur stockage corrigé: ${error.message}`);
      }
    }
    
    const fixedStorageTime = Date.now() - fixedStartTime;
    const fixedHealth = await this.fixedSystem.getHealthStatus();
    
    console.log(`   📊 IDs créés: ${fixedIds.length}/${this.testData.length}`);
    console.log(`   ⚡ Temps total: ${fixedStorageTime}ms`);
    console.log(`   📈 Temps moyen: ${(fixedStorageTime / this.testData.length).toFixed(2)}ms/entrée`);
    console.log(`   💾 Entrées comptées: ${fixedHealth.totalEntries}`);
    
    // Stockage des résultats
    this.results.original.storageTime = originalStorageTime;
    this.results.original.storageIds = originalIds;
    this.results.original.avgStorageTime = originalStorageTime / this.testData.length;
    this.results.original.entriesStored = originalHealth.totalEntries;
    
    this.results.fixed.storageTime = fixedStorageTime;
    this.results.fixed.storageIds = fixedIds;
    this.results.fixed.avgStorageTime = fixedStorageTime / this.testData.length;
    this.results.fixed.entriesStored = fixedHealth.totalEntries;
    
    return {
      originalSuccess: originalIds.length === this.testData.length,
      fixedSuccess: fixedIds.length === this.testData.length,
      originalFaster: originalStorageTime < fixedStorageTime,
      speedDifference: Math.abs(originalStorageTime - fixedStorageTime),
      originalConsistent: originalHealth.totalEntries === originalIds.length,
      fixedConsistent: fixedHealth.totalEntries === fixedIds.length
    };
  }

  /**
   * Test 2: Intelligence de récupération sémantique
   */
  async testSemanticIntelligence() {
    console.log('\n🧠 TEST 2: INTELLIGENCE SÉMANTIQUE');
    console.log('───────────────────────────────────────');
    
    const queries = [
      'machine learning algorithmes',
      'intelligence artificielle neural',
      'blockchain cryptographie consensus',
      'quantum computing qubits',
      'computer vision détection objets',
      'natural language processing sentiment',
      'photosynthèse plantes biologie'
    ];
    
    console.log('🔍 Test système ORIGINAL...');
    const originalResults = [];
    
    for (const query of queries) {
      const startTime = Date.now();
      try {
        const result = await this.originalSystem.retrieveKnowledge(query, 'semantic_similarity');
        const retrieveTime = Date.now() - startTime;
        
        originalResults.push({
          query,
          found: !!result,
          retrieveTime,
          relevance: result?.relevance || 0,
          content: result?.content?.substring(0, 50) || 'N/A'
        });
        
        console.log(`   🔎 "${query}": ${result ? 'TROUVÉ' : 'NON TROUVÉ'} (${retrieveTime}ms)`);
        if (result && result.relevance) {
          console.log(`      📊 Pertinence: ${(result.relevance * 100).toFixed(1)}%`);
        }
      } catch (error) {
        console.warn(`   ❌ Erreur: ${error.message}`);
        originalResults.push({ query, found: false, error: error.message });
      }
    }
    
    console.log('\n🔍 Test système CORRIGÉ...');
    const fixedResults = [];
    
    for (const query of queries) {
      const startTime = Date.now();
      try {
        const result = await this.fixedSystem.retrieveKnowledge(query, 'semantic_similarity');
        const retrieveTime = Date.now() - startTime;
        
        fixedResults.push({
          query,
          found: !!result,
          retrieveTime,
          relevance: result?.relevance || 0,
          content: result?.content?.substring(0, 50) || 'N/A'
        });
        
        console.log(`   🔎 "${query}": ${result ? 'TROUVÉ' : 'NON TROUVÉ'} (${retrieveTime}ms)`);
        if (result && result.relevance) {
          console.log(`      📊 Pertinence: ${(result.relevance * 100).toFixed(1)}%`);
        }
      } catch (error) {
        console.warn(`   ❌ Erreur: ${error.message}`);
        fixedResults.push({ query, found: false, error: error.message });
      }
    }
    
    // Analyse comparative
    const originalFound = originalResults.filter(r => r.found).length;
    const fixedFound = fixedResults.filter(r => r.found).length;
    const originalAvgTime = originalResults.reduce((sum, r) => sum + (r.retrieveTime || 0), 0) / queries.length;
    const fixedAvgTime = fixedResults.reduce((sum, r) => sum + (r.retrieveTime || 0), 0) / queries.length;
    const originalAvgRelevance = originalResults.reduce((sum, r) => sum + (r.relevance || 0), 0) / originalFound;
    const fixedAvgRelevance = fixedResults.reduce((sum, r) => sum + (r.relevance || 0), 0) / fixedFound;
    
    this.results.original.semanticFound = originalFound;
    this.results.original.semanticAvgTime = originalAvgTime;
    this.results.original.semanticAvgRelevance = originalAvgRelevance;
    this.results.original.semanticResults = originalResults;
    
    this.results.fixed.semanticFound = fixedFound;
    this.results.fixed.semanticAvgTime = fixedAvgTime;
    this.results.fixed.semanticAvgRelevance = fixedAvgRelevance;
    this.results.fixed.semanticResults = fixedResults;
    
    return {
      originalFound,
      fixedFound,
      originalAvgTime,
      fixedAvgTime,
      originalAvgRelevance,
      fixedAvgRelevance,
      fixedBetter: fixedFound > originalFound || fixedAvgRelevance > originalAvgRelevance
    };
  }

  /**
   * Test 3: Persistence après redémarrage
   */
  async testPersistenceReliability() {
    console.log('\n💾 TEST 3: FIABILITÉ PERSISTENCE');
    console.log('─────────────────────────────────');
    
    // Test système original
    console.log('🔄 Test persistence ORIGINAL...');
    
    const originalHealthBefore = await this.originalSystem.getHealthStatus();
    console.log(`   📊 Entrées avant arrêt: ${originalHealthBefore.totalEntries}`);
    
    await this.originalSystem.stop();
    console.log('   🛑 Système original arrêté');
    
    const originalRestart = new ASIMemorySystem({ memoryLimit: 256 });
    await originalRestart.start();
    
    const originalHealthAfter = await originalRestart.getHealthStatus();
    console.log(`   📊 Entrées après redémarrage: ${originalHealthAfter.totalEntries}`);
    
    // Test récupération d'un ID spécifique
    const testOriginalId = this.results.original.storageIds[0];
    const originalRecovered = testOriginalId ? await originalRestart.retrieveKnowledge(testOriginalId) : null;
    console.log(`   🔍 Test récupération ID: ${originalRecovered ? 'SUCCÈS' : 'ÉCHEC'}`);
    
    await originalRestart.stop();
    
    // Test système corrigé
    console.log('\n🔄 Test persistence CORRIGÉ...');
    
    const fixedHealthBefore = await this.fixedSystem.getHealthStatus();
    console.log(`   📊 Entrées avant arrêt: ${fixedHealthBefore.totalEntries}`);
    
    await this.fixedSystem.stop();
    console.log('   🛑 Système corrigé arrêté');
    
    const fixedRestart = new ASIMemorySystemFixed({
      memoryLimit: 256,
      persistenceFile: './data/test-memory-fixed.json'
    });
    await fixedRestart.start();
    
    const fixedHealthAfter = await fixedRestart.getHealthStatus();
    console.log(`   📊 Entrées après redémarrage: ${fixedHealthAfter.totalEntries}`);
    
    // Test récupération d'un ID spécifique
    const testFixedId = this.results.fixed.storageIds[0];
    const fixedRecovered = testFixedId ? await fixedRestart.retrieveKnowledge(testFixedId) : null;
    console.log(`   🔍 Test récupération ID: ${fixedRecovered ? 'SUCCÈS' : 'ÉCHEC'}`);
    
    await fixedRestart.stop();
    
    this.results.original.persistenceSuccess = originalHealthAfter.totalEntries > 0 && !!originalRecovered;
    this.results.fixed.persistenceSuccess = fixedHealthAfter.totalEntries > 0 && !!fixedRecovered;
    this.results.original.entriesAfterRestart = originalHealthAfter.totalEntries;
    this.results.fixed.entriesAfterRestart = fixedHealthAfter.totalEntries;
    
    return {
      originalPersistence: this.results.original.persistenceSuccess,
      fixedPersistence: this.results.fixed.persistenceSuccess,
      originalDataLoss: originalHealthBefore.totalEntries - originalHealthAfter.totalEntries,
      fixedDataLoss: fixedHealthBefore.totalEntries - fixedHealthAfter.totalEntries,
      fixedBetter: this.results.fixed.persistenceSuccess && !this.results.original.persistenceSuccess
    };
  }

  /**
   * Test 4: Performance avec IA réelle (si disponible)
   */
  async testRealAIIntegration() {
    console.log('\n🤖 TEST 4: INTÉGRATION IA RÉELLE');
    console.log('────────────────────────────────');
    
    if (!openai) {
      console.log('⚠️ OpenAI non configuré - Test ignoré');
      return { skipped: true };
    }
    
    // Re-initialisation pour test IA
    this.originalSystem = new ASIMemorySystem({ memoryLimit: 128 });
    this.fixedSystem = new ASIMemorySystemFixed({ 
      memoryLimit: 128,
      persistenceFile: './data/test-ai-integration.json'
    });
    
    await this.originalSystem.start();
    await this.fixedSystem.start();
    
    console.log('🧠 Génération de connaissances avec OpenAI...');
    
    const aiPrompts = [
      'Explique brièvement le machine learning',
      'Qu\'est-ce que la blockchain?',
      'Comment fonctionne un réseau de neurones?'
    ];
    
    const originalAIResults = [];
    const fixedAIResults = [];
    
    for (const prompt of aiPrompts) {
      console.log(`\n   🤖 Prompt: "${prompt}"`);
      
      try {
        const aiStartTime = Date.now();
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100,
          temperature: 0.3
        });
        const aiTime = Date.now() - aiStartTime;
        const content = response.choices[0].message.content;
        
        console.log(`      ⚡ Généré en ${aiTime}ms (${response.usage.total_tokens} tokens)`);
        
        // Test stockage système original
        const originalStoreStart = Date.now();
        const originalId = await this.originalSystem.storeKnowledge({
          type: 'ai_generated',
          content,
          domain: 'ai_education',
          importance: 0.8,
          metadata: { source: 'openai', tokens: response.usage.total_tokens }
        });
        const originalStoreTime = Date.now() - originalStoreStart;
        
        // Test stockage système corrigé
        const fixedStoreStart = Date.now();
        const fixedId = await this.fixedSystem.storeKnowledge({
          type: 'ai_generated',
          content,
          domain: 'ai_education',
          importance: 0.8,
          metadata: { source: 'openai', tokens: response.usage.total_tokens }
        });
        const fixedStoreTime = Date.now() - fixedStoreStart;
        
        console.log(`      💾 Stockage Original: ${originalStoreTime}ms`);
        console.log(`      💾 Stockage Corrigé: ${fixedStoreTime}ms`);
        
        originalAIResults.push({
          prompt,
          aiTime,
          storeTime: originalStoreTime,
          tokens: response.usage.total_tokens,
          stored: !!originalId
        });
        
        fixedAIResults.push({
          prompt,
          aiTime,
          storeTime: fixedStoreTime,
          tokens: response.usage.total_tokens,
          stored: !!fixedId
        });
        
      } catch (error) {
        console.warn(`      ❌ Erreur IA: ${error.message}`);
      }
    }
    
    await this.originalSystem.stop();
    await this.fixedSystem.stop();
    
    const originalAvgStoreTime = originalAIResults.reduce((sum, r) => sum + r.storeTime, 0) / originalAIResults.length;
    const fixedAvgStoreTime = fixedAIResults.reduce((sum, r) => sum + r.storeTime, 0) / fixedAIResults.length;
    
    this.results.original.aiIntegration = originalAIResults;
    this.results.original.aiAvgStoreTime = originalAvgStoreTime;
    this.results.fixed.aiIntegration = fixedAIResults;
    this.results.fixed.aiAvgStoreTime = fixedAvgStoreTime;
    
    return {
      originalSuccess: originalAIResults.every(r => r.stored),
      fixedSuccess: fixedAIResults.every(r => r.stored),
      originalAvgStoreTime,
      fixedAvgStoreTime,
      performanceDifference: Math.abs(originalAvgStoreTime - fixedAvgStoreTime)
    };
  }

  /**
   * Analyse comparative finale
   */
  analyzeComparison() {
    console.log('\n📊 ANALYSE COMPARATIVE FINALE');
    console.log('════════════════════════════════════════════════════════════');
    
    // Calcul des scores
    const originalScore = this.calculateSystemScore('original');
    const fixedScore = this.calculateSystemScore('fixed');
    
    console.log('\n🏆 SCORES FINAUX:');
    console.log(`   📊 Système ORIGINAL: ${originalScore.toFixed(1)}/100`);
    console.log(`   📊 Système CORRIGÉ: ${fixedScore.toFixed(1)}/100`);
    console.log(`   📈 Amélioration: +${(fixedScore - originalScore).toFixed(1)} points`);
    
    // Détail par catégorie
    console.log('\n📋 DÉTAIL PAR CATÉGORIE:');
    
    console.log('💾 STOCKAGE:');
    console.log(`   Original: ${this.results.original.avgStorageTime.toFixed(2)}ms/entrée (${this.results.original.entriesStored} entrées)`);
    console.log(`   Corrigé:  ${this.results.fixed.avgStorageTime.toFixed(2)}ms/entrée (${this.results.fixed.entriesStored} entrées)`);
    console.log(`   Cohérence compteur Original: ${this.results.original.entriesStored === this.results.original.storageIds.length ? 'OUI' : 'NON'}`);
    console.log(`   Cohérence compteur Corrigé:  ${this.results.fixed.entriesStored === this.results.fixed.storageIds.length ? 'OUI' : 'NON'}`);
    
    console.log('\n🧠 INTELLIGENCE SÉMANTIQUE:');
    console.log(`   Original: ${this.results.original.semanticFound}/7 trouvés (pertinence: ${(this.results.original.semanticAvgRelevance * 100).toFixed(1)}%)`);
    console.log(`   Corrigé:  ${this.results.fixed.semanticFound}/7 trouvés (pertinence: ${(this.results.fixed.semanticAvgRelevance * 100).toFixed(1)}%)`);
    
    console.log('\n💾 PERSISTENCE:');
    console.log(`   Original: ${this.results.original.persistenceSuccess ? 'SUCCÈS' : 'ÉCHEC'} (${this.results.original.entriesAfterRestart} entrées récupérées)`);
    console.log(`   Corrigé:  ${this.results.fixed.persistenceSuccess ? 'SUCCÈS' : 'ÉCHEC'} (${this.results.fixed.entriesAfterRestart} entrées récupérées)`);
    
    if (this.results.original.aiIntegration) {
      console.log('\n🤖 INTÉGRATION IA:');
      console.log(`   Original: ${this.results.original.aiAvgStoreTime.toFixed(2)}ms stockage IA`);
      console.log(`   Corrigé:  ${this.results.fixed.aiAvgStoreTime.toFixed(2)}ms stockage IA`);
    }
    
    // Problèmes détectés
    console.log('\n🚨 PROBLÈMES DÉTECTÉS:');
    
    if (this.results.original.avgStorageTime < 1) {
      console.log('   ⚠️ ORIGINAL: Vitesses de stockage irréalistes (<1ms)');
    }
    
    if (this.results.original.entriesStored !== this.results.original.storageIds.length) {
      console.log('   ⚠️ ORIGINAL: Incohérence compteur d\'entrées');
    }
    
    if (this.results.original.semanticAvgRelevance > 0.8 && this.results.original.semanticAvgTime < 5) {
      console.log('   ⚠️ ORIGINAL: Pertinence sémantique suspecte (trop haute + trop rapide)');
    }
    
    if (!this.results.original.persistenceSuccess) {
      console.log('   ⚠️ ORIGINAL: Échec de persistence des données');
    }
    
    // Améliorations validées
    console.log('\n✅ AMÉLIORATIONS VALIDÉES:');
    
    if (this.results.fixed.avgStorageTime > this.results.original.avgStorageTime) {
      console.log('   ✅ CORRIGÉ: Latences réalistes de stockage');
    }
    
    if (this.results.fixed.entriesStored === this.results.fixed.storageIds.length) {
      console.log('   ✅ CORRIGÉ: Cohérence du compteur d\'entrées');
    }
    
    if (this.results.fixed.semanticFound >= this.results.original.semanticFound) {
      console.log('   ✅ CORRIGÉ: Intelligence sémantique maintenue ou améliorée');
    }
    
    if (this.results.fixed.persistenceSuccess && !this.results.original.persistenceSuccess) {
      console.log('   ✅ CORRIGÉ: Persistence fonctionnelle');
    }
    
    // Verdict final
    console.log('\n🎯 VERDICT FINAL:');
    
    if (fixedScore > originalScore + 10) {
      console.log('   🎉 AMÉLIORATION MAJEURE: Le système corrigé est significativement meilleur');
    } else if (fixedScore > originalScore) {
      console.log('   ✅ AMÉLIORATION: Le système corrigé est meilleur');
    } else {
      console.log('   ⚠️ RÉGRESSION: Le système original était meilleur');
    }
    
    const realismScore = this.calculateRealismScore();
    console.log(`   🎭 Score de réalisme: ${realismScore.toFixed(1)}/100`);
    
    if (realismScore > 70) {
      console.log('   ✅ SYSTÈME PRODUCTION-READY');
    } else {
      console.log('   ⚠️ SYSTÈME NÉCESSITE ENCORE DES AMÉLIORATIONS');
    }
    
    this.results.comparison = {
      originalScore,
      fixedScore,
      improvement: fixedScore - originalScore,
      realismScore,
      productionReady: realismScore > 70
    };
  }

  /**
   * Calcule le score d'un système
   */
  calculateSystemScore(system) {
    const results = this.results[system];
    let score = 0;
    
    // Performance de stockage (20 points)
    if (results.avgStorageTime > 0.5 && results.avgStorageTime < 50) {
      score += 20; // Latences réalistes
    } else if (results.avgStorageTime <= 0.5) {
      score += 5; // Trop rapide = suspect
    } else {
      score += 10; // Trop lent
    }
    
    // Cohérence des données (25 points)
    if (results.entriesStored === results.storageIds.length) {
      score += 25;
    } else {
      score += 5; // Incohérence majeure
    }
    
    // Intelligence sémantique (25 points)
    if (results.semanticFound > 5) {
      score += 15;
    } else if (results.semanticFound > 3) {
      score += 10;
    } else {
      score += 5;
    }
    
    if (results.semanticAvgRelevance > 0.3 && results.semanticAvgRelevance < 0.95) {
      score += 10; // Pertinence réaliste
    } else if (results.semanticAvgRelevance >= 0.95) {
      score += 3; // Trop parfait = suspect
    }
    
    // Persistence (20 points)
    if (results.persistenceSuccess) {
      score += 20;
    }
    
    // Intégration IA (10 points)
    if (results.aiIntegration && results.aiIntegration.length > 0) {
      score += 10;
    }
    
    return score;
  }

  /**
   * Calcule le score de réalisme
   */
  calculateRealismScore() {
    let score = 0;
    
    // Latences réalistes
    if (this.results.fixed.avgStorageTime > 1 && this.results.fixed.avgStorageTime < 100) {
      score += 30;
    }
    
    // Cohérence des données
    if (this.results.fixed.entriesStored === this.results.fixed.storageIds.length) {
      score += 25;
    }
    
    // Persistence fonctionnelle
    if (this.results.fixed.persistenceSuccess) {
      score += 25;
    }
    
    // Intelligence sémantique plausible
    if (this.results.fixed.semanticAvgRelevance > 0.2 && this.results.fixed.semanticAvgRelevance < 0.9) {
      score += 20;
    }
    
    return score;
  }

  /**
   * Lance le test complet
   */
  async runDemandingTest() {
    console.log('🚀 DÉBUT TEST EXIGEANT COMPARATIF\n');
    
    // Préparation
    this.generateTestDataset();
    await this.initializeSystems();
    
    // Tests
    const _test1 = await this.testMassStorage();
    const _test2 = await this.testSemanticIntelligence();
    const _test3 = await this.testPersistenceReliability();
    const _test4 = await this.testRealAIIntegration();
    
    // Analyse finale
    this.analyzeComparison();
    
    // Nettoyage
    try {
      if (fs.existsSync('./data/test-memory-fixed.json')) {
        fs.unlinkSync('./data/test-memory-fixed.json');
      }
      if (fs.existsSync('./data/test-ai-integration.json')) {
        fs.unlinkSync('./data/test-ai-integration.json');
      }
    } catch {
      // Ignorer erreurs nettoyage
    }
    
    console.log('\n🎯 TEST EXIGEANT TERMINÉ');
    
    return this.results.comparison;
  }
}

// Lancement du test
const tester = new DemandingMemoryTest();
tester.runDemandingTest()
  .then(results => {
    console.log('\n📊 RÉSULTATS FINAUX EXPORTÉS');
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(console.error);
