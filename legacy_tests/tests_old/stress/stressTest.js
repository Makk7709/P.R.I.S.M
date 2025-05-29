import { EventGenerator } from './eventGenerator.js';
import { MetricsCollector } from './metricsCollector.js';

class StressTest {
  constructor(options = {}) {
    this.generator = new EventGenerator(options.generator);
    this.metrics = new MetricsCollector();
    
    this.generator.on('event', (event) => this.handleEvent(event));
    this.generator.on('complete', () => this.handleComplete());
  }

  async handleEvent(event) {
    const startTime = Date.now();
    
    try {
      // Simulate processing time based on payload size
      const processingTime = event.payload.metadata.size === 'large' ? 100 :
                           event.payload.metadata.size === 'medium' ? 50 : 10;
      
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Simulate random failures and overloads
      if (Math.random() < 0.05) { // 5% failure rate
        throw new Error('Random failure');
      }
      
      if (Math.random() < 0.02) { // 2% overload rate
        this.metrics.recordOverload();
      }
      
      const latency = Date.now() - startTime;
      this.metrics.recordEvent(latency);
      
    } catch (error) {
      this.metrics.recordFailure();
    }
  }

  handleComplete() {
    const results = this.metrics.getResults();
    console.log('Stress Test Results:', JSON.stringify(results, null, 2));
  }

  async run(eventCount = 1000) {
    console.log(`Starting stress test with ${eventCount} events...`);
    this.metrics.startTest();
    await this.generator.startGenerating(eventCount);
    this.metrics.endTest();
  }
}

// Example usage
async function runStressTest() {
  const test = new StressTest({
    generator: {
      distribution: 'burst',
      burstConfig: {
        minEvents: 20,
        maxEvents: 50,
        minDelay: 200,
        maxDelay: 500
      }
    }
  });

  await test.run(1000);
}

// Uncomment to run the test
// runStressTest().catch(console.error);

export { StressTest }; 