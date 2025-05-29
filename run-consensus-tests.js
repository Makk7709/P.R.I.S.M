#!/usr/bin/env node

/**
 * Script de lancement des tests de consensus PRISM
 * Usage: node run-consensus-tests.js [scenario]
 */

import ConsensusTestSuite from './test-consensus-scenarios.js';

async function main() {
  const args = process.argv.slice(2);
  const scenario = args[0];

  console.log('🎯 PRISM Consensus Test Runner');
  console.log('=' .repeat(50));

  const testSuite = new ConsensusTestSuite();

  try {
    if (scenario) {
      console.log(`🎬 Running specific scenario: ${scenario}`);
      
      switch (scenario.toLowerCase()) {
        case 'consensus':
        case '1':
          await testSuite.initialize();
          await testSuite.testCriticalConsensusScenario();
          break;
          
        case 'priority':
        case '2':
          await testSuite.initialize();
          await testSuite.testPriorityQueueScenario();
          break;
          
        case 'timeout':
        case '3':
          await testSuite.initialize();
          await testSuite.testConsensusTimeoutScenario();
          break;
          
        case 'security':
        case '4':
          await testSuite.initialize();
          await testSuite.testSecurityBlockingScenario();
          break;
          
        case 'performance':
        case '5':
          await testSuite.initialize();
          await testSuite.testPerformanceScenario();
          break;
          
        default:
          console.error(`❌ Unknown scenario: ${scenario}`);
          console.log('Available scenarios: consensus, priority, timeout, security, performance');
          process.exit(1);
      }
      
      testSuite.generateFinalReport();
    } else {
      console.log('🚀 Running all scenarios...');
      await testSuite.runAllScenarios();
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    testSuite.cleanup();
  }
}

// Gestion des signaux pour cleanup propre
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

// Lancer le script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 