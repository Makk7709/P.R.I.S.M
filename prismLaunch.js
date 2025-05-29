import { activatePRISM } from './prismCore.js';

const launchPRISM = async () => {
  try {
    console.log('🚀 Starting PRISM v2.1 launch sequence...');
    console.log('🔧 Environment: Node.js Server Mode');
    console.log('📍 Working Directory:', process.cwd());
    console.log('🌍 Node Version:', process.version);
    
    // Initialize PRISM
    console.log('⚡ Activating PRISM Core...');
    const prismInstance = await activatePRISM();
    
    console.log('✨ PRISM launch sequence completed successfully.');
    console.log('🎯 PRISM is now ready to process requests.');
    console.log('📊 System Status: OPERATIONAL');
    
    // Keep the process alive
    console.log('🔄 PRISM is running. Press Ctrl+C to stop.');
    
    // Simple heartbeat to show PRISM is alive
    setInterval(() => {
      console.log(`💓 PRISM Heartbeat - ${new Date().toISOString()}`);
    }, 30000); // Every 30 seconds
    
    return prismInstance;
  } catch (error) {
    console.error('❌ PRISM launch sequence failed:', error.message);
    console.error('🔍 Error details:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Shutting down PRISM gracefully...');
  console.log('👋 PRISM shutdown complete. Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Shutting down PRISM gracefully...');
  console.log('👋 PRISM shutdown complete. Goodbye!');
  process.exit(0);
});

// Launch PRISM
launchPRISM().catch(error => {
  console.error('💥 Fatal error during PRISM launch:', error);
  process.exit(1);
});

export default launchPRISM; 