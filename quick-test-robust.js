/**
 * Test rapide robuste pour vérifier le fonctionnement des composants de base
 * Version avec timeouts explicites et gestion d'erreurs améliorée
 */

import { KernelBus } from './core/KernelBus.js';
import ConsensusManager, { DecisionType } from './src/core/ConsensusManager.js';
import { PriorityQueue, Priority } from './src/core/PriorityQueue.js';

// Utilitaire pour timeout
function withTimeout(promise, timeoutMs, description) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout: ${description} took longer than ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

async function quickTestRobust() {
  console.log('🔬 PRISM Quick Test - Version Robuste');
  console.log('=' .repeat(60));

  let allTestsPassed = true;
  const testResults = [];

  // Test 1: PriorityQueue (rapide, pas de timeout nécessaire)
  console.log('\n1️⃣ Testing PriorityQueue...');
  try {
    const queue = new PriorityQueue();
    
    // Ajouter des éléments avec différentes priorités
    queue.enqueue('normal1', Priority.NORMAL);
    queue.enqueue('critical1', Priority.CRITICAL);
    queue.enqueue('high1', Priority.HIGH);
    queue.enqueue('normal2', Priority.NORMAL);
    
    // Vérifier l'ordre de sortie
    const first = queue.dequeue();
    const second = queue.dequeue();
    
    if (first === 'critical1' && second === 'high1') {
      console.log('   ✅ PriorityQueue works correctly');
      testResults.push({ test: 'PriorityQueue', status: 'PASS' });
    } else {
      console.log('   ❌ PriorityQueue order incorrect');
      allTestsPassed = false;
      testResults.push({ test: 'PriorityQueue', status: 'FAIL', error: 'Order incorrect' });
    }
    
    console.log(`   📊 Queue metrics: ${JSON.stringify(queue.getMetrics())}`);
    
  } catch (error) {
    console.log(`   ❌ PriorityQueue test failed: ${error.message}`);
    allTestsPassed = false;
    testResults.push({ test: 'PriorityQueue', status: 'ERROR', error: error.message });
  }

  // Test 2: ConsensusManager (avec timeout de 3 secondes)
  console.log('\n2️⃣ Testing ConsensusManager...');
  let consensus = null;
  try {
    consensus = new ConsensusManager({ timeoutMs: 1000 });
    
    // Attendre l'initialisation avec timeout
    await withTimeout(
      new Promise(resolve => setTimeout(resolve, 100)),
      500,
      'ConsensusManager initialization'
    );
    
    // Proposer une décision avec timeout
    const proposalId = await withTimeout(
      consensus.propose(
        'quick-test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      ),
      2000,
      'Consensus proposal creation'
    );
    
    console.log(`   ✅ Proposal created: ${proposalId}`);
    
    // Attendre un peu pour les votes automatiques avec timeout
    await withTimeout(
      new Promise(resolve => setTimeout(resolve, 300)),
      1000,
      'AI provider votes'
    );
    
    const status = consensus.getProposalStatus(proposalId);
    console.log(`   📊 Proposal status: ${status.status}, votes: ${JSON.stringify(status.voteCount)}`);
    
    const metrics = consensus.getMetrics();
    console.log(`   📈 Consensus metrics: ${JSON.stringify(metrics)}`);
    
    testResults.push({ test: 'ConsensusManager', status: 'PASS' });
    
  } catch (error) {
    console.log(`   ❌ ConsensusManager test failed: ${error.message}`);
    allTestsPassed = false;
    testResults.push({ test: 'ConsensusManager', status: 'ERROR', error: error.message });
  } finally {
    if (consensus) {
      try {
        consensus.cleanup();
      } catch (e) {
        console.log(`   ⚠️ Cleanup warning: ${e.message}`);
      }
    }
  }

  // Test 3: KernelBus (avec timeout de 2 secondes)
  console.log('\n3️⃣ Testing KernelBus...');
  let kernelBus = null;
  try {
    kernelBus = new KernelBus();
    
    // Attendre l'initialisation avec timeout
    await withTimeout(
      new Promise(resolve => setTimeout(resolve, 100)),
      500,
      'KernelBus initialization'
    );
    
    let eventReceived = false;
    
    // S'abonner à un événement
    kernelBus.subscribe('test:event', (data) => {
      eventReceived = true;
      console.log(`   📨 Event received: ${JSON.stringify(data)}`);
    });
    
    // Publier un événement avec timeout
    await withTimeout(
      kernelBus.publish('test:event', { message: 'Hello PRISM!' }),
      1000,
      'Event publishing'
    );
    
    // Attendre le traitement avec timeout
    await withTimeout(
      new Promise(resolve => setTimeout(resolve, 100)),
      500,
      'Event processing'
    );
    
    if (eventReceived) {
      console.log('   ✅ KernelBus event system works');
      testResults.push({ test: 'KernelBus', status: 'PASS' });
    } else {
      console.log('   ❌ KernelBus event not received');
      allTestsPassed = false;
      testResults.push({ test: 'KernelBus', status: 'FAIL', error: 'Event not received' });
    }
    
    const metrics = kernelBus.getMetrics();
    console.log(`   📊 KernelBus metrics: published=${metrics.publishedEvents}, failed=${metrics.failedEvents}`);
    
  } catch (error) {
    console.log(`   ❌ KernelBus test failed: ${error.message}`);
    allTestsPassed = false;
    testResults.push({ test: 'KernelBus', status: 'ERROR', error: error.message });
  } finally {
    if (kernelBus) {
      try {
        kernelBus.cleanup();
      } catch (e) {
        console.log(`   ⚠️ Cleanup warning: ${e.message}`);
      }
    }
  }

  // Test 4: Intégration basique (avec timeout de 3 secondes)
  console.log('\n4️⃣ Testing Basic Integration...');
  let integrationKernelBus = null;
  try {
    integrationKernelBus = new KernelBus();
    
    await withTimeout(
      new Promise(resolve => setTimeout(resolve, 100)),
      500,
      'Integration KernelBus initialization'
    );
    
    let normalEventProcessed = false;
    
    // S'abonner aux événements
    integrationKernelBus.subscribe('integration:normal', () => {
      normalEventProcessed = true;
      console.log('   📝 Normal event processed');
    });
    
    // Publier seulement l'événement normal (pas de consensus requis)
    await withTimeout(
      integrationKernelBus.publish('integration:normal', { priority: 'normal' }),
      1000,
      'Normal event publishing'
    );
    
    // Attendre le traitement
    await withTimeout(
      new Promise(resolve => setTimeout(resolve, 200)),
      1000,
      'Normal event processing'
    );
    
    if (normalEventProcessed) {
      console.log('   ✅ Basic integration works');
      testResults.push({ test: 'BasicIntegration', status: 'PASS' });
    } else {
      console.log('   ❌ Basic integration failed');
      allTestsPassed = false;
      testResults.push({ test: 'BasicIntegration', status: 'FAIL', error: 'Normal event not processed' });
    }
    
  } catch (error) {
    console.log(`   ❌ Integration test failed: ${error.message}`);
    allTestsPassed = false;
    testResults.push({ test: 'BasicIntegration', status: 'ERROR', error: error.message });
  } finally {
    if (integrationKernelBus) {
      try {
        integrationKernelBus.cleanup();
      } catch (e) {
        console.log(`   ⚠️ Cleanup warning: ${e.message}`);
      }
    }
  }

  // Résultat final
  console.log('\n🎯 QUICK TEST RESULTS');
  console.log('=' .repeat(60));
  
  console.log('\n📊 Test Summary:');
  testResults.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' : 
                      result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`   ${index + 1}. ${statusIcon} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });
  
  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const totalTests = testResults.length;
  
  console.log(`\n📈 Success Rate: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  
  if (allTestsPassed) {
    console.log('\n✅ All basic components are working correctly!');
    console.log('🚀 Ready to run full test scenarios');
    console.log('\nNext steps:');
    console.log('  • Run: node run-consensus-tests.js (all scenarios)');
    console.log('  • Run: node run-consensus-tests.js consensus (specific scenario)');
    console.log('  • Run: node run-consensus-tests.js performance (performance test)');
  } else {
    console.log('\n❌ Some components have issues - check the logs above');
    console.log('🔧 Please fix the issues before running full scenarios');
    
    if (passedTests > 0) {
      console.log(`\n✅ ${passedTests} test(s) passed - partial functionality available`);
    }
  }
  
  return { success: allTestsPassed, results: testResults, passedTests, totalTests };
}

// Exécuter le test rapide robuste
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎬 Starting robust quick test...');
  
  quickTestRobust()
    .then(result => {
      console.log('\n🏁 Test completed');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Quick test failed with fatal error:', error);
      process.exit(1);
    });
}

export default quickTestRobust; 