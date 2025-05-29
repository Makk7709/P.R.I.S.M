#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const TEST_DIR = path.join(__dirname, '../tests/resilience');
const RESILIENCE_CONFIG = {
  thresholds: {
    mttr: 5 * 60 * 1000, // 5 minutes en ms
    selfHealRate: 99, // %
    errorRate: 0.1 // %
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

function generateResilienceTest(modulePath) {
  const moduleName = path.basename(modulePath, '.js');
  const testPath = path.join(TEST_DIR, `${moduleName}.resilience.test.js`);
  
  // Template de test de résilience
  const testTemplate = `const { expect } = require('chai');
const sinon = require('sinon');
const module = require('../../src/core/${moduleName}');

describe('${moduleName} Resilience Tests', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  // Tests de self-healing
  describe('Self-Healing Tests', () => {
    it('should recover from errors', async () => {
      const errors = [];
      const recoveries = [];
      
      // Simuler des erreurs
      for (let i = 0; i < 100; i++) {
        try {
          sandbox.stub(module, 'operation').throws(new Error('Simulated error'));
          await module.operation();
        } catch (error) {
          errors.push(error);
          
          // Mesurer le temps de récupération
          const startTime = Date.now();
          await module.recover();
          const recoveryTime = Date.now() - startTime;
          recoveries.push(recoveryTime);
        }
      }
      
      // Vérifier le taux de self-heal
      const selfHealRate = (recoveries.length / errors.length) * 100;
      expect(selfHealRate).to.be.at.least(99, \`Self-heal rate (\${selfHealRate.toFixed(2)}%) below SLO (99%)\`);
      
      // Vérifier le MTTR
      const mttr = recoveries.reduce((a, b) => a + b) / recoveries.length;
      expect(mttr).to.be.below(5 * 60 * 1000, \`MTTR (\${(mttr / 1000).toFixed(2)}s) exceeds SLO (5min)\`);
    });
  });
  
  // Tests de circuit breaker
  describe('Circuit Breaker Tests', () => {
    it('should activate circuit breaker', async () => {
      const failures = [];
      
      // Simuler des échecs
      for (let i = 0; i < 10; i++) {
        try {
          sandbox.stub(module, 'operation').throws(new Error('Simulated error'));
          await module.operation();
        } catch (error) {
          failures.push(error);
        }
      }
      
      // Vérifier l'activation du circuit breaker
      expect(module.isCircuitBreakerOpen()).to.be.true;
      
      // Vérifier la récupération
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(module.isCircuitBreakerOpen()).to.be.false;
    });
  });
  
  // Tests de fallback
  describe('Fallback Tests', () => {
    it('should use fallback mechanism', async () => {
      // Simuler une erreur
      sandbox.stub(module, 'primaryOperation').throws(new Error('Primary failed'));
      
      // Exécuter avec fallback
      const result = await module.operationWithFallback();
      
      // Vérifier le fallback
      expect(result).to.be.an('object');
      expect(result.source).to.equal('fallback');
    });
  });
  
  // Tests de retry
  describe('Retry Tests', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      
      // Simuler des échecs suivis d'un succès
      sandbox.stub(module, 'operation').callsFake(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Simulated error');
        }
        return 'success';
      });
      
      // Exécuter avec retry
      const result = await module.operationWithRetry();
      
      // Vérifier les tentatives
      expect(attempts).to.equal(3);
      expect(result).to.equal('success');
    });
  });
  
  // Tests de timeout
  describe('Timeout Tests', () => {
    it('should handle timeouts', async () => {
      // Simuler un timeout
      sandbox.stub(module, 'slowOperation').callsFake(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      });
      
      // Exécuter avec timeout
      const result = await module.operationWithTimeout();
      
      // Vérifier le timeout
      expect(result).to.equal('timeout');
    });
  });
  
  // Tests de bulkhead
  describe('Bulkhead Tests', () => {
    it('should limit concurrent operations', async () => {
      const startTime = Date.now();
      
      // Simuler des opérations concurrentes
      const promises = Array(100).fill().map(() => module.operation());
      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Vérifier le temps total
      expect(totalTime).to.be.below(5000, \`Total time (\${totalTime}ms) exceeds limit (5000ms)\`);
    });
  });
  
  // Tests de rate limiter
  describe('Rate Limiter Tests', () => {
    it('should limit operation rate', async () => {
      const startTime = Date.now();
      
      // Simuler des opérations rapides
      const promises = Array(1000).fill().map(() => module.operation());
      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Vérifier le temps total
      expect(totalTime).to.be.below(10000, \`Total time (\${totalTime}ms) exceeds limit (10000ms)\`);
    });
  });
  
  // Tests de chaos
  describe('Chaos Tests', () => {
    it('should handle random failures', async () => {
      const results = [];
      
      // Simuler des échecs aléatoires
      for (let i = 0; i < 100; i++) {
        try {
          if (Math.random() < 0.1) {
            sandbox.stub(module, 'operation').throws(new Error('Random failure'));
          }
          const result = await module.operation();
          results.push(result);
        } catch (error) {
          results.push('error');
        }
      }
      
      // Vérifier le taux d'erreur
      const errorRate = (results.filter(r => r === 'error').length / results.length) * 100;
      expect(errorRate).to.be.below(0.1, \`Error rate (\${errorRate.toFixed(2)}%) exceeds SLO (0.1%)\`);
    });
  });
});
`;

  // Créer le fichier de test
  fs.writeFileSync(testPath, testTemplate);
  console.log(`Generated resilience test for ${moduleName}`);
}

function generateResilienceConfig() {
  const configPath = path.join(__dirname, '../resilience.config.json');
  const config = {
    ...RESILIENCE_CONFIG,
    files: findFiles(SRC_DIR, /\.js$/).map(file => path.relative(SRC_DIR, file))
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Generated resilience configuration');
}

function main() {
  console.log('Generating resilience tests...');
  
  // Créer le dossier de tests si nécessaire
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  
  // Générer les tests pour chaque module
  const modules = findFiles(SRC_DIR, /\.js$/);
  for (const module of modules) {
    generateResilienceTest(module);
  }
  
  // Générer la configuration de résilience
  generateResilienceConfig();
  
  console.log('\nResilience test generation completed');
  console.log(`Tests generated in ${TEST_DIR}`);
  console.log('Configuration saved to resilience.config.json');
}

// Exécution
main(); 