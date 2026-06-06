#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { _execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const TEST_DIR = path.join(__dirname, '../tests/performance');
const PERFORMANCE_CONFIG = {
  thresholds: {
    latency: {
      p50: 100, // ms
      p95: 150, // ms
      p99: 200  // ms
    },
    memory: {
      max: 100 * 1024 * 1024 // 100MB
    },
    cpu: {
      max: 80 // %
    }
  }
};

// Fonctions utilitaires
function findFiles(dir, pattern) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, pattern));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function generatePerformanceTest(modulePath) {
  const moduleName = path.basename(modulePath, '.js');
  const testPath = path.join(TEST_DIR, `${moduleName}.performance.test.js`);
  
  // Template de test de performance
  const testTemplate = `const { expect } = require('chai');
const { performance } = require('perf_hooks');
const module = require('../../src/core/${moduleName}');

describe('${moduleName} Performance Tests', () => {
  // Configuration
  const ITERATIONS = 1000;
  const WARMUP_ITERATIONS = 100;
  
  // Fonctions utilitaires
  function calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
  
  function formatLatency(ms) {
    return \`\${ms.toFixed(2)}ms\`;
  }
  
  // Tests de latence
  describe('Latency Tests', () => {
    it('should meet latency SLOs', async () => {
      const latencies = [];
      
      // Warmup
      for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        await module.performanceTest();
      }
      
      // Mesure
      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        await module.performanceTest();
        const end = performance.now();
        latencies.push(end - start);
      }
      
      // Calcul des percentiles
      const p50 = calculatePercentile(latencies, 50);
      const p95 = calculatePercentile(latencies, 95);
      const p99 = calculatePercentile(latencies, 99);
      
      // Vérification des SLOs
      expect(p50).to.be.below(100, \`P50 latency (\${formatLatency(p50)}) exceeds SLO (100ms)\`);
      expect(p95).to.be.below(150, \`P95 latency (\${formatLatency(p95)}) exceeds SLO (150ms)\`);
      expect(p99).to.be.below(200, \`P99 latency (\${formatLatency(p99)}) exceeds SLO (200ms)\`);
    });
  });
  
  // Tests de mémoire
  describe('Memory Tests', () => {
    it('should meet memory SLOs', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Exécution du test
      await module.performanceTest();
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsed = finalMemory - initialMemory;
      
      // Vérification du SLO
      expect(memoryUsed).to.be.below(100 * 1024 * 1024, \`Memory usage (\${(memoryUsed / 1024 / 1024).toFixed(2)}MB) exceeds SLO (100MB)\`);
    });
  });
  
  // Tests de CPU
  describe('CPU Tests', () => {
    it('should meet CPU SLOs', async () => {
      const startCpu = process.cpuUsage();
      
      // Exécution du test
      await module.performanceTest();
      
      const endCpu = process.cpuUsage(startCpu);
      const cpuUsage = (endCpu.user + endCpu.system) / 1000; // ms
      
      // Vérification du SLO
      expect(cpuUsage).to.be.below(80, \`CPU usage (\${cpuUsage.toFixed(2)}%) exceeds SLO (80%)\`);
    });
  });
  
  // Tests de charge
  describe('Load Tests', () => {
    it('should handle concurrent load', async () => {
      const startTime = performance.now();
      
      // Exécution concurrente
      const promises = Array(100).fill().map(() => module.performanceTest());
      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Vérification du temps total
      expect(totalTime).to.be.below(5000, \`Total time (\${formatLatency(totalTime)}) exceeds limit (5000ms)\`);
    });
  });
  
  // Tests de scalabilité
  describe('Scalability Tests', () => {
    it('should scale linearly', async () => {
      const results = [];
      
      // Test avec différentes charges
      for (const load of [1, 10, 100]) {
        const startTime = performance.now();
        
        const promises = Array(load).fill().map(() => module.performanceTest());
        await Promise.all(promises);
        
        const endTime = performance.now();
        const timePerOperation = (endTime - startTime) / load;
        
        results.push(timePerOperation);
      }
      
      // Vérification de la scalabilité
      const maxDeviation = Math.max(...results) / Math.min(...results);
      expect(maxDeviation).to.be.below(2, \`Scalability deviation (\${maxDeviation.toFixed(2)}x) exceeds limit (2x)\`);
    });
  });
});
`;

  // Créer le fichier de test
  fs.writeFileSync(testPath, testTemplate);
  console.log(`Generated performance test for ${moduleName}`);
}

function generatePerformanceConfig() {
  const configPath = path.join(__dirname, '../performance.config.json');
  const config = {
    ...PERFORMANCE_CONFIG,
    files: findFiles(SRC_DIR, /\.js$/).map(file => path.relative(SRC_DIR, file))
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Generated performance configuration');
}

function main() {
  console.log('Generating performance tests...');
  
  // Créer le dossier de tests si nécessaire
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  
  // Générer les tests pour chaque module
  const modules = findFiles(SRC_DIR, /\.js$/);
  for (const module of modules) {
    generatePerformanceTest(module);
  }
  
  // Générer la configuration de performance
  generatePerformanceConfig();
  
  console.log('\nPerformance test generation completed');
  console.log(`Tests generated in ${TEST_DIR}`);
  console.log('Configuration saved to performance.config.json');
}

// Exécution
main(); 