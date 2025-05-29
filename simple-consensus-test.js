/**
 * Test de consensus simplifié - évite PrismVitals pour se concentrer sur les composants principaux
 */

import { KernelBus } from './core/KernelBus.js';
import ConsensusManager, { DecisionType, ConsensusStatus } from './src/core/ConsensusManager.js';
import { PriorityQueue, Priority } from './src/core/PriorityQueue.js';
import { SelfImprovementEngine } from './evolution/selfImprovementEngine.js';

// Utilitaire pour timeout
function withTimeout(promise, timeoutMs, description) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout: ${description} took longer than ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

class SimpleConsensusTest {
  constructor() {
    this.kernelBus = null;
    this.consensusManager = null;
    this.selfImprovementEngine = null;
    this.testResults = [];
  }

  async initialize() {
    console.log('🚀 Initializing Simple Consensus Test...');
    
    try {
      // Initialiser les composants principaux (sans PrismVitals)
      this.kernelBus = new KernelBus();
      this.consensusManager = new ConsensusManager({ timeoutMs: 1000 });
      this.selfImprovementEngine = new SelfImprovementEngine();

      // Attendre l'initialisation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('✅ Core components initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      return false;
    }
  }

  /**
   * Test 1: Consensus Critique - Modification Système
   */
  async testCriticalConsensus() {
    console.log('\n🔥 TEST 1: Critical System Consensus');
    console.log('=' .repeat(50));

    const test = {
      name: 'Critical Consensus',
      startTime: Date.now(),
      success: false,
      events: []
    };

    try {
      // 1. Proposer une modification système critique
      console.log('📝 Proposing critical system modification...');
      
      const criticalDecision = {
        type: 'system_modification',
        action: 'update_core_algorithm',
        impact: 'high',
        riskLevel: 0.7,
        evidenceQuality: 0.8,
        ethicalConcerns: false
      };

      const proposalId = await withTimeout(
        this.consensusManager.propose(
          'critical-system-mod-001',
          criticalDecision,
          DecisionType.SYSTEM_MODIFICATION
        ),
        3000,
        'Critical proposal creation'
      );

      console.log(`✅ Proposal created: ${proposalId}`);
      test.events.push({ type: 'proposal_created', proposalId, timestamp: Date.now() });

      // 2. Attendre les votes automatiques des IA
      console.log('🤖 Waiting for AI provider votes...');
      
      await withTimeout(
        new Promise(resolve => setTimeout(resolve, 500)),
        2000,
        'AI provider voting'
      );

      // 3. Vérifier le statut du consensus
      const proposalStatus = this.consensusManager.getProposalStatus(proposalId);
      console.log('📊 Proposal Status:', {
        status: proposalStatus.status,
        votes: proposalStatus.voteCount,
        timeRemaining: proposalStatus.timeRemaining
      });

      test.events.push({ 
        type: 'status_check', 
        status: proposalStatus.status, 
        votes: proposalStatus.voteCount,
        timestamp: Date.now() 
      });

      // 4. Attendre la finalisation si nécessaire
      if (proposalStatus.status === 'PENDING') {
        console.log('⏳ Waiting for consensus finalization...');
        await withTimeout(
          new Promise(resolve => setTimeout(resolve, 800)),
          2000,
          'Consensus finalization'
        );

        const finalStatus = this.consensusManager.getProposalStatus(proposalId);
        console.log(`🎯 Final Consensus Result: ${finalStatus.status}`);
        test.events.push({ 
          type: 'final_result', 
          status: finalStatus.status,
          timestamp: Date.now() 
        });
      }

      // 5. Tester l'intégration avec KernelBus si approuvé
      const finalStatus = this.consensusManager.getProposalStatus(proposalId);
      if (finalStatus.status === ConsensusStatus.APPROVED) {
        console.log('🚀 Testing KernelBus integration with approved decision...');
        
        await withTimeout(
          this.kernelBus.publish('prism:system:modification', {
            proposalId,
            action: criticalDecision.action,
            approved: true
          }),
          1000,
          'KernelBus integration'
        );
        
        console.log('✅ Event published successfully through KernelBus');
        test.events.push({ type: 'kernelbus_integration', timestamp: Date.now() });
      }

      test.endTime = Date.now();
      test.duration = test.endTime - test.startTime;
      test.success = true;

      console.log(`⏱️  Test completed in ${test.duration}ms`);
      
    } catch (error) {
      console.error('❌ Critical consensus test failed:', error);
      test.success = false;
      test.error = error.message;
      test.endTime = Date.now();
      test.duration = test.endTime - test.startTime;
    }

    this.testResults.push(test);
    return test;
  }

  /**
   * Test 2: Priority Queue Sous Charge
   */
  async testPriorityQueue() {
    console.log('\n⚡ TEST 2: Priority Queue Under Load');
    console.log('=' .repeat(50));

    const test = {
      name: 'Priority Queue',
      startTime: Date.now(),
      success: false,
      processedOrder: []
    };

    try {
      // 1. Créer des listeners pour capturer l'ordre de traitement
      const processedEvents = [];
      
      ['critical', 'high', 'normal'].forEach(priority => {
        this.kernelBus.subscribe(`test:${priority}`, (data) => {
          processedEvents.push({
            priority,
            id: data.id,
            timestamp: Date.now()
          });
          console.log(`   📨 Processed ${priority} event ID: ${data.id}`);
        });
      });

      // 2. Publier des événements dans un ordre mélangé
      console.log('📤 Publishing mixed priority events...');
      
      const events = [
        { type: 'test:normal', payload: { id: 1, priority: 'normal' } },
        { type: 'test:critical', payload: { id: 2, priority: 'critical' } },
        { type: 'test:high', payload: { id: 3, priority: 'high' } },
        { type: 'test:normal', payload: { id: 4, priority: 'normal' } },
        { type: 'test:critical', payload: { id: 5, priority: 'critical' } }
      ];

      // Publier tous les événements rapidement
      for (const event of events) {
        await this.kernelBus.publish(event.type, event.payload);
      }

      console.log(`✅ Published ${events.length} events`);

      // 3. Attendre le traitement complet
      await withTimeout(
        new Promise(resolve => setTimeout(resolve, 500)),
        2000,
        'Event processing'
      );

      // 4. Analyser l'ordre de traitement
      console.log('📊 Analyzing processing order...');
      
      test.processedOrder = processedEvents;
      
      // Vérifier que les événements critiques ont été traités en premier
      const criticalEvents = processedEvents.filter(e => e.priority === 'critical');
      const highEvents = processedEvents.filter(e => e.priority === 'high');
      const normalEvents = processedEvents.filter(e => e.priority === 'normal');

      console.log('🎯 Processing Results:');
      console.log(`   Critical events: ${criticalEvents.length} (IDs: ${criticalEvents.map(e => e.id).join(', ')})`);
      console.log(`   High events: ${highEvents.length} (IDs: ${highEvents.map(e => e.id).join(', ')})`);
      console.log(`   Normal events: ${normalEvents.length} (IDs: ${normalEvents.map(e => e.id).join(', ')})`);

      // 5. Vérifier l'ordre de priorité (simple check)
      let priorityOrderCorrect = true;
      if (processedEvents.length > 0) {
        // Au moins un événement critique devrait être traité avant les événements normaux
        const firstCriticalIndex = processedEvents.findIndex(e => e.priority === 'critical');
        const firstNormalIndex = processedEvents.findIndex(e => e.priority === 'normal');
        
        if (firstCriticalIndex !== -1 && firstNormalIndex !== -1) {
          priorityOrderCorrect = firstCriticalIndex < firstNormalIndex;
        }
      }

      console.log(`🎯 Priority order correct: ${priorityOrderCorrect ? '✅' : '❌'}`);

      test.endTime = Date.now();
      test.duration = test.endTime - test.startTime;
      test.success = priorityOrderCorrect && processedEvents.length >= events.length;

      console.log(`⏱️  Test completed in ${test.duration}ms`);

    } catch (error) {
      console.error('❌ Priority queue test failed:', error);
      test.success = false;
      test.error = error.message;
      test.endTime = Date.now();
      test.duration = test.endTime - test.startTime;
    }

    this.testResults.push(test);
    return test;
  }

  /**
   * Test 3: Timeout de Consensus
   */
  async testConsensusTimeout() {
    console.log('\n⏰ TEST 3: Consensus Timeout');
    console.log('=' .repeat(50));

    const test = {
      name: 'Consensus Timeout',
      startTime: Date.now(),
      success: false,
      events: []
    };

    try {
      // 1. Créer un ConsensusManager avec timeout très court
      const shortTimeoutManager = new ConsensusManager({ timeoutMs: 100 });
      await new Promise(resolve => setTimeout(resolve, 50));

      // 2. Écouter les événements de timeout
      let timeoutTriggered = false;

      shortTimeoutManager.on('consensusTimeout', (result) => {
        timeoutTriggered = true;
        test.events.push({
          timestamp: Date.now(),
          type: 'consensus_timeout',
          proposalId: result.proposalId
        });
        console.log(`⏰ Consensus timeout triggered for proposal: ${result.proposalId}`);
      });

      // 3. Proposer une décision qui va timeout (décision complexe)
      console.log('📝 Proposing decision that will timeout...');
      
      const timeoutDecision = {
        type: 'security_critical',
        action: 'emergency_shutdown',
        riskLevel: 0.9,
        evidenceQuality: 0.3,
        ethicalConcerns: true
      };

      const proposalId = await shortTimeoutManager.propose(
        'timeout-test-001',
        timeoutDecision,
        DecisionType.SECURITY
      );

      console.log(`✅ Proposal created: ${proposalId}`);

      // 4. Attendre le timeout (plus long que le timeout configuré)
      await withTimeout(
        new Promise(resolve => setTimeout(resolve, 300)),
        1000,
        'Timeout waiting'
      );

      // 5. Vérifier que le timeout a eu lieu
      console.log('🔍 Checking timeout results...');
      console.log(`   Timeout triggered: ${timeoutTriggered ? '✅' : '❌'}`);

      test.endTime = Date.now();
      test.duration = test.endTime - test.startTime;
      test.success = timeoutTriggered;

      // Cleanup
      shortTimeoutManager.cleanup();

      console.log(`⏱️  Test completed in ${test.duration}ms`);

    } catch (error) {
      console.error('❌ Timeout test failed:', error);
      test.success = false;
      test.error = error.message;
      test.endTime = Date.now();
      test.duration = test.endTime - test.startTime;
    }

    this.testResults.push(test);
    return test;
  }

  /**
   * Exécute tous les tests
   */
  async runAllTests() {
    console.log('\n🎬 STARTING SIMPLE CONSENSUS TESTS');
    console.log('=' .repeat(60));

    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize test suite');
      return false;
    }

    try {
      // Exécuter tous les tests
      await this.testCriticalConsensus();
      await this.testPriorityQueue();
      await this.testConsensusTimeout();

      // Générer le rapport final
      this.generateReport();

    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Génère le rapport final
   */
  generateReport() {
    console.log('\n📋 SIMPLE TEST REPORT');
    console.log('=' .repeat(60));

    const successfulTests = this.testResults.filter(r => r.success).length;
    const totalTests = this.testResults.length;

    console.log(`🎯 Tests passed: ${successfulTests}/${totalTests}`);
    console.log(`📊 Success rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

    console.log('\n📈 TEST DETAILS:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.name} (${result.duration}ms)`);
      if (!result.success && result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });

    // Métriques des composants
    if (this.consensusManager) {
      const consensusMetrics = this.consensusManager.getMetrics();
      console.log('\n🔒 CONSENSUS METRICS:');
      console.log(`   Total proposals: ${consensusMetrics.totalProposals}`);
      console.log(`   Success rate: ${(consensusMetrics.consensusSuccessRate * 100).toFixed(1)}%`);
      console.log(`   Average decision time: ${consensusMetrics.averageDecisionTime.toFixed(2)}ms`);
    }

    if (this.kernelBus) {
      const kernelMetrics = this.kernelBus.getMetrics();
      console.log('\n⚡ KERNELBUS METRICS:');
      console.log(`   Published events: ${kernelMetrics.publishedEvents}`);
      console.log(`   Failed events: ${kernelMetrics.failedEvents}`);
      console.log(`   Average latency: ${kernelMetrics.averageLatency.toFixed(2)}ms`);
    }

    console.log('\n🎉 Simple test suite completed!');
  }

  /**
   * Nettoie les ressources
   */
  cleanup() {
    console.log('\n🧹 Cleaning up resources...');
    
    if (this.consensusManager) {
      this.consensusManager.cleanup();
    }
    
    if (this.kernelBus) {
      this.kernelBus.cleanup();
    }
    
    if (this.selfImprovementEngine) {
      this.selfImprovementEngine.cleanup();
    }
    
    console.log('✅ Cleanup completed');
  }
}

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new SimpleConsensusTest();
  testSuite.runAllTests().catch(console.error);
}

export default SimpleConsensusTest; 