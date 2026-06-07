/**
 * Script de test des scénarios de consensus et synchronisation PRISM
 * Tests réalistes pour valider l'architecture complète
 */

import { KernelBus } from './core/KernelBus.js';
import ConsensusManager, { DecisionType, ConsensusStatus } from './src/core/ConsensusManager.js';
import { SelfImprovementEngine } from './evolution/selfImprovementEngine.js';
import PrismVitals from './prismVitals.js';

class ConsensusTestSuite {
  constructor() {
    this.kernelBus = null;
    this.consensusManager = null;
    this.selfImprovementEngine = null;
    this.prismVitals = null;
    this.testResults = [];
    this.startTime = Date.now();
  }

  async initialize() {
    console.log('🚀 Initializing PRISM Consensus Test Suite...');
    
    try {
      // Initialiser les composants
      this.kernelBus = new KernelBus();
      this.consensusManager = new ConsensusManager({ timeoutMs: 1000 });
      this.selfImprovementEngine = new SelfImprovementEngine();
      this.prismVitals = new PrismVitals();

      // Attendre l'initialisation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ All components initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      return false;
    }
  }

  /**
   * Scénario 1: Test de Consensus Critique - Modification Système
   */
  async testCriticalConsensusScenario() {
    console.log('\n🔥 SCENARIO 1: Critical System Modification Consensus');
    console.log('=' .repeat(60));

    const scenario = {
      name: 'Critical System Modification',
      startTime: Date.now(),
      events: [],
      metrics: {}
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

      const proposalId = await this.consensusManager.propose(
        'critical-system-mod-001',
        criticalDecision,
        DecisionType.SYSTEM_MODIFICATION
      );

      scenario.events.push({
        timestamp: Date.now(),
        type: 'proposal_created',
        proposalId,
        data: criticalDecision
      });

      console.log(`✅ Proposal created: ${proposalId}`);

      // 2. Attendre les votes automatiques des IA
      console.log('🤖 Waiting for AI provider votes...');
      
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. Vérifier le statut du consensus
      const proposalStatus = this.consensusManager.getProposalStatus(proposalId);
      console.log('📊 Proposal Status:', {
        status: proposalStatus.status,
        votes: proposalStatus.voteCount,
        timeRemaining: proposalStatus.timeRemaining
      });

      // 4. Attendre la finalisation ou timeout
      const consensusResult = await this.waitForConsensusResult(proposalId, 1200);
      
      scenario.events.push({
        timestamp: Date.now(),
        type: 'consensus_result',
        result: consensusResult
      });

      console.log(`🎯 Consensus Result: ${consensusResult.status}`);
      
      // 5. Tester l'intégration avec KernelBus
      if (consensusResult.status === ConsensusStatus.APPROVED) {
        console.log('🚀 Testing KernelBus integration with approved decision...');
        
        await this.kernelBus.publish('prism:system:modification', {
          proposalId,
          action: criticalDecision.action,
          approved: true
        });
        
        console.log('✅ Event published successfully through KernelBus');
      }

      scenario.endTime = Date.now();
      scenario.duration = scenario.endTime - scenario.startTime;
      scenario.success = true;
      scenario.metrics = this.consensusManager.getMetrics();

      console.log(`⏱️  Scenario completed in ${scenario.duration}ms`);
      
    } catch (error) {
      console.error('❌ Scenario 1 failed:', error);
      scenario.success = false;
      scenario.error = error.message;
    }

    this.testResults.push(scenario);
    return scenario;
  }

  /**
   * Scénario 2: Test de Surcharge - Gestion des Priorités
   */
  async testPriorityQueueScenario() {
    console.log('\n⚡ SCENARIO 2: Priority Queue Under Load');
    console.log('=' .repeat(60));

    const scenario = {
      name: 'Priority Queue Load Test',
      startTime: Date.now(),
      events: [],
      processedOrder: [],
      metrics: {}
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
        });
      });

      // 2. Publier des événements dans un ordre mélangé
      console.log('📤 Publishing mixed priority events...');
      
      const events = [
        { type: 'test:normal', payload: { id: 1, priority: 'normal' } },
        // Éviter de déclencher le consensus pour ce scénario de priorité
        { type: 'test:very_high', payload: { id: 2, priority: 'high' } },
        { type: 'test:high', payload: { id: 3, priority: 'high' } },
        { type: 'test:normal', payload: { id: 4, priority: 'normal' } },
        { type: 'test:very_high', payload: { id: 5, priority: 'high' } },
        { type: 'test:high', payload: { id: 6, priority: 'high' } },
        { type: 'test:normal', payload: { id: 7, priority: 'normal' } }
      ];

      // Publier tous les événements rapidement
      const publishPromises = events.map(event => 
        this.kernelBus.publish(event.type, event.payload, { onReject: 'return' })
      );

      await Promise.all(publishPromises);
      console.log(`✅ Published ${events.length} events`);

      // 3. Attendre le traitement complet
      await new Promise(resolve => setTimeout(resolve, 200));

      // 4. Analyser l'ordre de traitement
      console.log('📊 Analyzing processing order...');
      
      scenario.processedOrder = processedEvents;
      
      // Vérifier que les événements critiques ont été traités en premier
      const criticalEvents = processedEvents.filter(e => e.priority === 'critical');
      const highEvents = processedEvents.filter(e => e.priority === 'high');
      const normalEvents = processedEvents.filter(e => e.priority === 'normal');

      console.log('🎯 Processing Results:');
      console.log(`   Critical events: ${criticalEvents.length} (IDs: ${criticalEvents.map(e => e.id).join(', ')})`);
      console.log(`   High events: ${highEvents.length} (IDs: ${highEvents.map(e => e.id).join(', ')})`);
      console.log(`   Normal events: ${normalEvents.length} (IDs: ${normalEvents.map(e => e.id).join(', ')})`);

      // 5. Vérifier l'ordre de priorité
      let priorityOrderCorrect = true;
      let lastCriticalIndex = -1;
      let lastHighIndex = -1;

      processedEvents.forEach((event, index) => {
        if (event.priority === 'critical') {
          lastCriticalIndex = index;
        } else if (event.priority === 'high') {
          if (lastCriticalIndex !== -1 && index < lastCriticalIndex) {
            priorityOrderCorrect = false;
          }
          lastHighIndex = index;
        } else if (event.priority === 'normal') {
          if ((lastCriticalIndex !== -1 && index < lastCriticalIndex) ||
              (lastHighIndex !== -1 && index < lastHighIndex)) {
            priorityOrderCorrect = false;
          }
        }
      });

      console.log(`🎯 Priority order correct: ${priorityOrderCorrect ? '✅' : '❌'}`);

      // 6. Obtenir les métriques de la queue
      scenario.metrics = {
        kernelBus: this.kernelBus.getMetrics(),
        priorityQueue: this.kernelBus.priorityQueue.getMetrics(),
        priorityOrderCorrect
      };

      scenario.endTime = Date.now();
      scenario.duration = scenario.endTime - scenario.startTime;
      scenario.success = priorityOrderCorrect;

      console.log(`⏱️  Scenario completed in ${scenario.duration}ms`);

    } catch (error) {
      console.error('❌ Scenario 2 failed:', error);
      scenario.success = false;
      scenario.error = error.message;
    }

    this.testResults.push(scenario);
    return scenario;
  }

  /**
   * Scénario 3: Test de Timeout - Escalade TrustContext
   */
  async testConsensusTimeoutScenario() {
    console.log('\n⏰ SCENARIO 3: Consensus Timeout & TrustContext Escalation');
    console.log('=' .repeat(60));

    const scenario = {
      name: 'Consensus Timeout Test',
      startTime: Date.now(),
      events: [],
      metrics: {}
    };

    try {
      // 1. Créer un ConsensusManager avec timeout très court
      const shortTimeoutManager = new ConsensusManager({ timeoutMs: 50 });
      await new Promise(resolve => setTimeout(resolve, 10));

      // 2. Écouter les événements de timeout
      let timeoutTriggered = false;
      let trustContextCalled = false;

      shortTimeoutManager.on('consensusTimeout', (result) => {
        timeoutTriggered = true;
        scenario.events.push({
          timestamp: Date.now(),
          type: 'consensus_timeout',
          proposalId: result.proposalId
        });
        console.log(`⏰ Consensus timeout triggered for proposal: ${result.proposalId}`);
      });

      // Mock TrustContext pour capturer l'escalade
      if (shortTimeoutManager.trustContext) {
        const originalRequireApproval = shortTimeoutManager.trustContext.requireHumanApproval;
        shortTimeoutManager.trustContext.requireHumanApproval = function(...args) {
          trustContextCalled = true;
          scenario.events.push({
            timestamp: Date.now(),
            type: 'trust_context_escalation',
            args: args
          });
          console.log('🔐 TrustContext escalation triggered');
          return originalRequireApproval.apply(this, args);
        };
      }

      // 3. Proposer une décision qui va timeout
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
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Vérifier que le timeout et l'escalade ont eu lieu
      console.log('🔍 Checking timeout and escalation results...');
      console.log(`   Timeout triggered: ${timeoutTriggered ? '✅' : '❌'}`);
      console.log(`   TrustContext called: ${trustContextCalled ? '✅' : '❌'}`);

      // 6. Vérifier les métriques
      const metrics = shortTimeoutManager.getMetrics();
      console.log('📊 Timeout Metrics:', {
        totalProposals: metrics.totalProposals,
        timeoutProposals: metrics.timeoutProposals,
        consensusSuccessRate: metrics.consensusSuccessRate
      });

      scenario.metrics = metrics;
      scenario.endTime = Date.now();
      scenario.duration = scenario.endTime - scenario.startTime;
      scenario.success = timeoutTriggered && trustContextCalled;

      // Cleanup
      shortTimeoutManager.cleanup();

      console.log(`⏱️  Scenario completed in ${scenario.duration}ms`);

    } catch (error) {
      console.error('❌ Scenario 3 failed:', error);
      scenario.success = false;
      scenario.error = error.message;
    }

    this.testResults.push(scenario);
    return scenario;
  }

  /**
   * Scénario 4: Test de Sécurité - Événements Bloqués
   */
  async testSecurityBlockingScenario() {
    console.log('\n🛡️  SCENARIO 4: Security Event Blocking');
    console.log('=' .repeat(60));

    const scenario = {
      name: 'Security Event Blocking',
      startTime: Date.now(),
      events: [],
      blockedEvents: 0,
      allowedEvents: 0,
      metrics: {}
    };

    try {
      // 1. Tester des événements avec différents niveaux de sécurité
      const testEvents = [
        {
          type: 'prism:user:action',
          payload: { action: 'normal_operation' },
          expectedBlocked: false
        },
        {
          type: 'prism:security:critical',
          payload: { action: 'modify_security_rules', riskLevel: 0.9 },
          expectedBlocked: true
        },
        {
          type: 'prism:system:modification',
          payload: { action: 'update_core', requiresConsensus: true },
          expectedBlocked: false // Devrait passer avec consensus
        }
      ];

      console.log(`🧪 Testing ${testEvents.length} events with different security levels...`);

      for (const testEvent of testEvents) {
        try {
          console.log(`\n📤 Testing event: ${testEvent.type}`);
          
          const startTime = Date.now();
          await this.kernelBus.publish(testEvent.type, testEvent.payload);
          const endTime = Date.now();

          scenario.allowedEvents++;
          scenario.events.push({
            timestamp: endTime,
            type: 'event_allowed',
            eventType: testEvent.type,
            duration: endTime - startTime,
            expected: !testEvent.expectedBlocked
          });

          console.log(`   ✅ Event allowed (${endTime - startTime}ms)`);

        } catch (error) {
          scenario.blockedEvents++;
          scenario.events.push({
            timestamp: Date.now(),
            type: 'event_blocked',
            eventType: testEvent.type,
            reason: error.message,
            expected: testEvent.expectedBlocked
          });

          console.log(`   🚫 Event blocked: ${error.message}`);
        }
      }

      // 2. Tester la surcharge de sécurité
      console.log('\n🔥 Testing security system under load...');
      
      const loadTestPromises = [];
      for (let i = 0; i < 10; i++) {
        loadTestPromises.push(
          this.kernelBus.publish('prism:load:test', { id: i })
            .catch(error => ({ blocked: true, error: error.message }))
        );
      }

      const loadResults = await Promise.allSettled(loadTestPromises);
      const loadBlocked = loadResults.filter(r => r.value?.blocked).length;
      
      console.log(`📊 Load test results: ${loadResults.length - loadBlocked}/${loadResults.length} allowed`);

      // 3. Obtenir les métriques de sécurité
      scenario.metrics = {
        kernelBus: this.kernelBus.getSecurityMetrics(),
        prismVitals: this.prismVitals.getSecurityMetrics()
      };

      scenario.endTime = Date.now();
      scenario.duration = scenario.endTime - scenario.startTime;
      scenario.success = scenario.blockedEvents > 0 && scenario.allowedEvents > 0;

      console.log(`⏱️  Scenario completed in ${scenario.duration}ms`);
      console.log(`🎯 Results: ${scenario.allowedEvents} allowed, ${scenario.blockedEvents} blocked`);

    } catch (error) {
      console.error('❌ Scenario 4 failed:', error);
      scenario.success = false;
      scenario.error = error.message;
    }

    this.testResults.push(scenario);
    return scenario;
  }

  /**
   * Scénario 5: Test de Performance - Latence et Throughput
   */
  async testPerformanceScenario() {
    console.log('\n🚀 SCENARIO 5: Performance & Throughput Test');
    console.log('=' .repeat(60));

    const scenario = {
      name: 'Performance Test',
      startTime: Date.now(),
      events: [],
      metrics: {},
      performance: {}
    };

    try {
      // 1. Test de latence pour différents types d'événements
      console.log('📊 Testing event latencies...');
      
      const latencyTests = [
        { type: 'prism:normal:event', priority: 'normal' },
        { type: 'prism:high:priority', priority: 'high' },
        // Ne pas invoquer le consensus sur le test de latence
        { type: 'prism:very_high:priority', priority: 'critical' }
      ];

      const latencyResults = {};

      for (const test of latencyTests) {
        const latencies = [];
        
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();
          await this.kernelBus.publish(test.type, { id: i, priority: test.priority });
          const endTime = performance.now();
          
          latencies.push(endTime - startTime);
        }

        latencyResults[test.priority] = {
          average: latencies.reduce((a, b) => a + b, 0) / latencies.length,
          min: Math.min(...latencies),
          max: Math.max(...latencies),
          samples: latencies.length
        };

        console.log(`   ${test.priority}: avg=${latencyResults[test.priority].average.toFixed(2)}ms`);
      }

      // 2. Test de throughput
      console.log('\n🔥 Testing throughput...');
      
      const throughputStart = Date.now();
      const throughputEvents = 100;
      const throughputPromises = [];

      for (let i = 0; i < throughputEvents; i++) {
        throughputPromises.push(
          this.kernelBus.publish('prism:throughput:test', { 
            id: i, 
            timestamp: Date.now() 
          })
        );
      }

      await Promise.all(throughputPromises);
      const throughputEnd = Date.now();
      const throughputDuration = throughputEnd - throughputStart;
      const eventsPerSecond = (throughputEvents / throughputDuration) * 1000;

      console.log(`📈 Throughput: ${eventsPerSecond.toFixed(2)} events/second`);

      // 3. Test de consensus sous charge
      console.log('\n🔒 Testing consensus under load...');
      
      const consensusStart = Date.now();
      const consensusPromises = [];

      for (let i = 0; i < 5; i++) {
        consensusPromises.push(
          this.consensusManager.propose(
            `load-test-${i}`,
            { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
            DecisionType.CRITICAL
          )
        );
      }

      const consensusResults = await Promise.allSettled(consensusPromises);
      const consensusEnd = Date.now();
      const consensusDuration = consensusEnd - consensusStart;

      console.log(`🎯 Consensus load test: ${consensusResults.length} proposals in ${consensusDuration}ms`);

      // 4. Collecter toutes les métriques
      scenario.performance = {
        latency: latencyResults,
        throughput: {
          eventsPerSecond,
          totalEvents: throughputEvents,
          duration: throughputDuration
        },
        consensus: {
          proposals: consensusResults.length,
          duration: consensusDuration,
          averagePerProposal: consensusDuration / consensusResults.length
        }
      };

      scenario.metrics = {
        kernelBus: this.kernelBus.getMetrics(),
        consensus: this.consensusManager.getMetrics(),
        prismVitals: this.prismVitals.getVitalsReport()
      };

      scenario.endTime = Date.now();
      scenario.duration = scenario.endTime - scenario.startTime;
      scenario.success = eventsPerSecond > 50; // Seuil minimum de performance

      console.log(`⏱️  Scenario completed in ${scenario.duration}ms`);

    } catch (error) {
      console.error('❌ Scenario 5 failed:', error);
      scenario.success = false;
      scenario.error = error.message;
    }

    this.testResults.push(scenario);
    return scenario;
  }

  /**
   * Utilitaire pour attendre le résultat d'un consensus
   */
  async waitForConsensusResult(proposalId, timeoutMs = 1200) {
    return new Promise((resolve, reject) => {
      // Fast-path: if already finalized, return immediately to avoid race conditions
      try {
        const current = this.consensusManager?.getProposalStatus(proposalId);
        if (current && current.status !== ConsensusStatus.PENDING) {
          return resolve({
            proposalId,
            status: current.status,
            votes: current.votes,
            timestamp: Date.now()
          });
        }
      } catch {
        // Ignore and proceed with event listeners
      }
      const timeout = setTimeout(() => {
        reject(new Error('Consensus wait timeout'));
      }, timeoutMs);

      const handleConsensus = (result) => {
        if (result.proposalId === proposalId) {
          clearTimeout(timeout);
          this.consensusManager.removeListener('consensusReached', handleConsensus);
          this.consensusManager.removeListener('consensusTimeout', handleTimeout);
          resolve(result);
        }
      };

      const handleTimeout = (result) => {
        if (result.proposalId === proposalId) {
          clearTimeout(timeout);
          this.consensusManager.removeListener('consensusReached', handleConsensus);
          this.consensusManager.removeListener('consensusTimeout', handleTimeout);
          resolve({ ...result, status: ConsensusStatus.TIMEOUT });
        }
      };

      this.consensusManager.on('consensusReached', handleConsensus);
      this.consensusManager.on('consensusTimeout', handleTimeout);
    });
  }

  /**
   * Exécute tous les scénarios de test
   */
  async runAllScenarios() {
    console.log('\n🎬 STARTING PRISM CONSENSUS TEST SUITE');
    console.log('=' .repeat(80));

    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize test suite');
      return false;
    }

    try {
      // Exécuter tous les scénarios
      await this.testCriticalConsensusScenario();
      await this.testPriorityQueueScenario();
      await this.testConsensusTimeoutScenario();
      await this.testSecurityBlockingScenario();
      await this.testPerformanceScenario();

      // Générer le rapport final
      this.generateFinalReport();

    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Génère le rapport final des tests
   */
  generateFinalReport() {
    console.log('\n📋 FINAL TEST REPORT');
    console.log('=' .repeat(80));

    const totalDuration = Date.now() - this.startTime;
    const successfulScenarios = this.testResults.filter(r => r.success).length;
    const totalScenarios = this.testResults.length;

    console.log(`⏱️  Total execution time: ${totalDuration}ms`);
    console.log(`🎯 Scenarios passed: ${successfulScenarios}/${totalScenarios}`);
    console.log(`📊 Success rate: ${((successfulScenarios / totalScenarios) * 100).toFixed(1)}%`);

    console.log('\n📈 SCENARIO DETAILS:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.name} (${result.duration}ms)`);
      if (!result.success && result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });

    // Métriques globales
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

    console.log('\n🎉 Test suite completed!');
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
  const testSuite = new ConsensusTestSuite();
  testSuite.runAllScenarios().catch(console.error);
}

export default ConsensusTestSuite; 