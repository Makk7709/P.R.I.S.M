import { PrismCoreStressTest } from './prismCoreStressTest.js';

const scenarios = [
  {
    name: 'Light Load',
    totalEvents: 1000,
    batchSize: 50,
    description: '1000 events in batches of 50'
  },
  {
    name: 'Medium Load',
    totalEvents: 5000,
    batchSize: 100,
    description: '5000 events in batches of 100'
  },
  {
    name: 'Heavy Load',
    totalEvents: 10000,
    batchSize: 200,
    description: '10000 events in batches of 200'
  }
];

const thresholds = {
  minEventsPerSecond: 100,
  maxAverageLatency: 100, // ms
  maxFailureRate: 5, // percentage
  maxOverloadIncidents: 3
};

async function runStressTestSuite() {
  console.log('🚀 Starting PRISM Core Stress Test Suite\n');

  for (const scenario of scenarios) {
    console.log(`\n📊 Running Scenario: ${scenario.name}`);
    console.log(`   ${scenario.description}\n`);

    const test = new PrismCoreStressTest({
      totalEvents: scenario.totalEvents,
      batchSize: scenario.batchSize
    });

    try {
      const results = await test.run();
      analyzeResults(scenario.name, results);
    } catch (error) {
      console.error(`❌ Error in ${scenario.name}:`, error.message);
    }
  }
}

function analyzeResults(scenarioName, results) {
  const issues = [];

  // Check events per second
  if (results.eventsPerSecond < thresholds.minEventsPerSecond) {
    issues.push(`Low throughput: ${results.eventsPerSecond.toFixed(2)} events/sec (min: ${thresholds.minEventsPerSecond})`);
  }

  // Check average latency
  if (results.averageLatency > thresholds.maxAverageLatency) {
    issues.push(`High latency: ${results.averageLatency.toFixed(2)}ms (max: ${thresholds.maxAverageLatency}ms)`);
  }

  // Check failure rate
  const failureRate = (results.failedEvents / results.totalEvents) * 100;
  if (failureRate > thresholds.maxFailureRate) {
    issues.push(`High failure rate: ${failureRate.toFixed(2)}% (max: ${thresholds.maxFailureRate}%)`);
  }

  // Check overload incidents
  if (results.overloadIncidents > thresholds.maxOverloadIncidents) {
    issues.push(`Too many overload incidents: ${results.overloadIncidents} (max: ${thresholds.maxOverloadIncidents})`);
  }

  // Print results
  console.log(`Results for ${scenarioName}:`);
  console.log(`   Events/sec: ${results.eventsPerSecond.toFixed(2)}`);
  console.log(`   Avg Latency: ${results.averageLatency.toFixed(2)}ms`);
  console.log(`   Failure Rate: ${failureRate.toFixed(2)}%`);
  console.log(`   Overload Incidents: ${results.overloadIncidents}`);

  if (issues.length > 0) {
    console.log('\n⚠️  Issues detected:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('\n✅ All metrics within acceptable ranges');
  }
}

// Run the test suite
runStressTestSuite().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 