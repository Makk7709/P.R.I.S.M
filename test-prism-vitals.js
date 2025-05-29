/**
 * Test simple pour PrismVitals
 */

import PrismVitals from './prismVitals.js';

async function testPrismVitals() {
  console.log('🧪 Testing PrismVitals...');
  
  try {
    // Créer une instance de PrismVitals
    const vitals = new PrismVitals();
    
    // Attendre l'initialisation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (vitals.isInitialized) {
      console.log('✅ PrismVitals initialized successfully');
      
      // Tester les métriques de base
      const consensusMetrics = vitals.getConsensusMetrics();
      console.log('📊 Consensus metrics:', consensusMetrics);
      
      const securityMetrics = vitals.getSecurityMetrics();
      console.log('🔒 Security metrics:', securityMetrics);
      
      const vitalsReport = vitals.getVitalsReport();
      console.log('📈 Vitals report:', vitalsReport);
      
      console.log('✅ All PrismVitals tests passed!');
      
    } else {
      console.log('❌ PrismVitals failed to initialize');
    }
    
  } catch (error) {
    console.error('❌ PrismVitals test failed:', error);
  }
}

// Exécuter le test
testPrismVitals(); 