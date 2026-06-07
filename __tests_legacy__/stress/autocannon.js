import autocannon from 'autocannon';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DURATION = 300; // 5 minutes
const CONNECTIONS = [100, 1000, 10000, 50000, 100000];
const BASE_URL = 'http://localhost:3000';

const scenarios = [
  {
    title: 'Process Single Request',
    method: 'POST',
    path: '/api/prism/process',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      input: 'Test input for load testing'
    })
  },
  {
    title: 'Process Batch Requests',
    method: 'POST',
    path: '/api/prism/process-batch',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      inputs: [
        'Batch test input 1',
        'Batch test input 2',
        'Batch test input 3'
      ],
      options: {
        parallel: true
      }
    })
  },
  {
    title: 'Complex Analysis',
    method: 'POST',
    path: '/api/prism/analyze',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      data: 'Complex analysis data',
      options: {
        depth: 3,
        timeout: 5000
      }
    })
  }
];

async function runLoadTest(scenario, connections) {
  const instance = autocannon({
    url: BASE_URL + scenario.path,
    connections,
    duration: DURATION,
    title: `${scenario.title} (${connections} connections)`,
    method: scenario.method,
    headers: scenario.headers,
    body: scenario.body,
    timeout: 10,
    requests: [
      {
        method: scenario.method,
        path: scenario.path,
        headers: scenario.headers,
        body: scenario.body
      }
    ]
  });

  return new Promise((resolve) => {
    instance.on('done', (results) => {
      resolve(results);
    });

    // Track progress
    autocannon.track(instance, {
      renderProgressBar: true,
      renderLatencyTable: true,
      renderResultsTable: true
    });
  });
}

async function runAllTests() {
  const results = {
    timestamp: new Date().toISOString(),
    scenarios: []
  };

  console.log('Starting PRISM Core Load Tests with Autocannon\n');

  for (const scenario of scenarios) {
    console.log(`\nRunning tests for: ${scenario.title}`);
    const scenarioResults = [];

    for (const connections of CONNECTIONS) {
      console.log(`\nTesting with ${connections} connections...`);
      const result = await runLoadTest(scenario, connections);
      
      scenarioResults.push({
        connections,
        result: {
          requests: {
            average: result.requests.average,
            mean: result.requests.mean,
            stddev: result.requests.stddev,
            min: result.requests.min,
            max: result.requests.max,
            total: result.requests.total,
            p99: result.requests.p99,
            p95: result.requests.p95,
            p90: result.requests.p90
          },
          latency: {
            average: result.latency.average,
            mean: result.latency.mean,
            stddev: result.latency.stddev,
            min: result.latency.min,
            max: result.latency.max,
            p99: result.latency.p99,
            p95: result.latency.p95,
            p90: result.latency.p90
          },
          throughput: {
            average: result.throughput.average,
            mean: result.throughput.mean,
            stddev: result.throughput.stddev,
            min: result.throughput.min,
            max: result.throughput.max,
            total: result.throughput.total
          },
          errors: result.errors,
          timeouts: result.timeouts,
          duration: result.duration,
          start: result.start,
          finish: result.finish
        }
      });

      // Validate results against SLOs
      const sloValidation = validateSLOs(result);
      console.log('\nSLO Validation Results:');
      console.log(JSON.stringify(sloValidation, null, 2));
    }

    results.scenarios.push({
      title: scenario.title,
      results: scenarioResults
    });
  }

  // Save results
  const resultsPath = join(process.cwd(), '__tests__/stress/results');
  const filename = `autocannon-results-${Date.now()}.json`;
  writeFileSync(join(resultsPath, filename), JSON.stringify(results, null, 2));

  console.log(`\nResults saved to: ${filename}`);
  return results;
}

function validateSLOs(result) {
  return {
    latency: {
      p95: {
        target: 75,
        actual: result.latency.p95,
        passed: result.latency.p95 < 75
      },
      p99: {
        target: 100,
        actual: result.latency.p99,
        passed: result.latency.p99 < 100
      }
    },
    errorRate: {
      target: 0.001,
      actual: result.errors / result.requests.total,
      passed: (result.errors / result.requests.total) < 0.001
    },
    throughput: {
      target: 10000,
      actual: result.requests.average,
      passed: result.requests.average > 10000
    }
  };
}

// Run tests
runAllTests()
  .then((results) => {
    console.log('\nAll load tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running load tests:', error);
    process.exit(1);
  }); 