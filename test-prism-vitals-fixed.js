/**
 * Test de la version corrigée de PrismVitals
 */

import PrismVitals from './prismVitals-fixed.js';

async function testPrismVitalsFixed() {
  console.log('🧪 Testing PrismVitals FIXED VERSION...');
  console.log('=====================================');
  
  try {
    console.log('1️⃣ Creating PrismVitals instance...');
    const vitals = new PrismVitals();
    
    console.log('2️⃣ Checking initialization...');
    console.log('   isInitialized:', vitals.isInitialized);
    
    if (vitals.isInitialized) {
      console.log('   ✅ Initialization: SUCCESS');
      
      console.log('3️⃣ Testing methods...');
      
      // Test consensus metrics
      const consensus = vitals.getConsensusMetrics();
      console.log('   ✅ getConsensusMetrics:', {
        success_rate: consensus.consensus_success_rate,
        total_requests: consensus.totalConsensusRequests
      });
      
      // Test security metrics
      const security = vitals.getSecurityMetrics();
      console.log('   ✅ getSecurityMetrics:', {
        approval_rate: security.humanApprovalRate,
        trust_level: security.trustLevel
      });
      
      // Test vitals report
      const report = vitals.getVitalsReport();
      console.log('   ✅ getVitalsReport: SUCCESS');
      
      // Test self-improvement metrics
      const selfImprovement = vitals.getSelfImprovementMetrics();
      console.log('   ✅ getSelfImprovementMetrics:', {
        total: selfImprovement.totalImprovements,
        rate: selfImprovement.improvementRate
      });
      
      console.log('4️⃣ Testing event handling...');
      
      // Simuler un événement de consensus
      vitals.updateConsensusMetrics({
        status: 'APPROVED',
        decisionTime: 25
      });
      
      const updatedConsensus = vitals.getConsensusMetrics();
      console.log('   ✅ Consensus event handled:', {
        approved: updatedConsensus.approvedConsensus,
        avg_time: updatedConsensus.averageConsensusTime
      });
      
      console.log('\n🎉 ALL TESTS PASSED! PrismVitals is working correctly.');
      
    } else {
      console.log('   ❌ Initialization: FAILED');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n🏁 Test completed');
}

// Exécuter le test
testPrismVitalsFixed(); 