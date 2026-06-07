#!/usr/bin/env node

const { performance } = require('node:perf_hooks');
const fs = require('node:fs');
const path = require('node:path');

// Configuration
const ITERATIONS = 1000;
const WARMUP_ITERATIONS = 100;
const MODULES = [
  'Bus',
  'Planner',
  'Resilience',
  'Metrics',
  'Security',
  'State',
  'Validation',
  'Persistence',
  'Telemetry',
  'Awareness'
];

// Métriques
const metrics = {
  latencies: {},
  errors: {},
  memory: {},
  cpu: {}
};

// Fonctions utilitaires
function calculatePercentile(values, percentile) {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

function formatLatency(ms) {
  return `${ms.toFixed(2)}ms`;
}

// Benchmark d'un module
async function benchmarkModule(moduleName) {
  console.log(`\nBenchmarking ${moduleName}...`);
  
  const latencies = [];
  const errors = [];
  
  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    try {
      const start = performance.now();
      await require(`../src/core/${moduleName.toLowerCase()}`).benchmark();
      const end = performance.now();
      latencies.push(end - start);
    } catch (error) {
      errors.push(error);
    }
  }
  
  // Mesure réelle
  for (let i = 0; i < ITERATIONS; i++) {
    try {
      const start = performance.now();
      await require(`../src/core/${moduleName.toLowerCase()}`).benchmark();
      const end = performance.now();
      latencies.push(end - start);
    } catch (error) {
      errors.push(error);
    }
  }
  
  // Calcul des métriques
  metrics.latencies[moduleName] = {
    p50: calculatePercentile(latencies, 50),
    p95: calculatePercentile(latencies, 95),
    p99: calculatePercentile(latencies, 99),
    mean: latencies.reduce((a, b) => a + b) / latencies.length
  };
  
  metrics.errors[moduleName] = {
    count: errors.length,
    rate: (errors.length / ITERATIONS) * 100
  };
  
  // Vérification des SLOs
  const slos = {
    p95: 150, // ms
    errorRate: 0.1 // %
  };
  
  const violations = [];
  if (metrics.latencies[moduleName].p95 > slos.p95) {
    violations.push(`P95 latency (${formatLatency(metrics.latencies[moduleName].p95)}) exceeds SLO (${slos.p95}ms)`);
  }
  if (metrics.errors[moduleName].rate > slos.errorRate) {
    violations.push(`Error rate (${metrics.errors[moduleName].rate.toFixed(2)}%) exceeds SLO (${slos.errorRate}%)`);
  }
  
  // Affichage des résultats
  console.log(`\nResults for ${moduleName}:`);
  console.log('Latencies:');
  console.log(`  P50: ${formatLatency(metrics.latencies[moduleName].p50)}`);
  console.log(`  P95: ${formatLatency(metrics.latencies[moduleName].p95)}`);
  console.log(`  P99: ${formatLatency(metrics.latencies[moduleName].p99)}`);
  console.log(`  Mean: ${formatLatency(metrics.latencies[moduleName].mean)}`);
  console.log('\nErrors:');
  console.log(`  Count: ${metrics.errors[moduleName].count}`);
  console.log(`  Rate: ${metrics.errors[moduleName].rate.toFixed(2)}%`);
  
  if (violations.length > 0) {
    console.log('\n⚠️ SLO Violations:');
    violations.forEach(v => console.log(`  - ${v}`));
  }
}

// Fonction principale
async function main() {
  console.log('Starting PRISM Core Benchmark...');
  console.log(`Iterations: ${ITERATIONS}`);
  console.log(`Warmup iterations: ${WARMUP_ITERATIONS}`);
  
  const startTime = performance.now();
  
  for (const module of MODULES) {
    await benchmarkModule(module);
  }
  
  const endTime = performance.now();
  const totalTime = (endTime - startTime) / 1000;
  
  console.log(`\nBenchmark completed in ${totalTime.toFixed(2)}s`);
  
  // Sauvegarde des résultats
  const results = {
    timestamp: new Date().toISOString(),
    configuration: {
      iterations: ITERATIONS,
      warmupIterations: WARMUP_ITERATIONS
    },
    metrics
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../reports/benchmark-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('\nResults saved to reports/benchmark-results.json');
}

// Exécution
main().catch(console.error); 