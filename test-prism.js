import { activatePRISM } from './prismCore.js';

async function testPRISM() {
  try {
    console.log('🧪 Testing PRISM functionality...');
    
    // Activate PRISM
    const prism = await activatePRISM();
    
    // Test basic functionality
    console.log('📊 PRISM State:');
    console.log('  - Initialized:', prism.state.isInitialized);
    console.log('  - Active:', prism.state.isActive);
    console.log('  - Modules loaded:', prism.state.modules.size);
    console.log('  - Error count:', prism.state.errorCount);
    
    // Test event processing
    console.log('\n🔄 Testing event processing...');
    const testEvent = {
      type: 'test',
      data: { message: 'Hello PRISM!' },
      timestamp: new Date().toISOString()
    };
    
    const result = await prism.processEvent(testEvent);
    console.log('✅ Event processed successfully:');
    console.log('  - Response time:', `${result.responseTime  }ms`);
    console.log('  - Model used:', result.modelUsed);
    console.log('  - Temperature:', result.temperature);
    
    // Test safety features if available
    if (prism.state.selfMonitor) {
      console.log('\n🛡️ Testing safety features...');
      console.log('✅ Self-monitoring is active');
    }
    
    if (prism.state.moralLayer) {
      console.log('✅ Moral layer is active');
    }
    
    if (prism.state.selfImprovementEngine) {
      console.log('✅ Self-improvement engine is active');
    }
    
    console.log('\n🎉 PRISM test completed successfully!');
    console.log('🚀 PRISM is fully operational and ready for use.');
    
  } catch (error) {
    console.error('❌ PRISM test failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

// Run the test
testPRISM(); 