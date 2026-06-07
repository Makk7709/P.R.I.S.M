#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { _execSync } = require('node:child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const TEST_DIR = path.join(__dirname, '../tests/observability');
const OBSERVABILITY_CONFIG = {
  thresholds: {
    traceCoverage: 100, // %
    metricCoverage: 100, // %
    logCoverage: 100, // %
    alertLatency: 60 * 1000 // 1 minute en ms
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

function generateObservabilityTest(modulePath) {
  const moduleName = path.basename(modulePath, '.js');
  const testPath = path.join(TEST_DIR, `${moduleName}.observability.test.js`);
  
  // Template de test d'observabilité
  const testTemplate = `const { expect } = require('chai');
const sinon = require('sinon');
const module = require('../../src/core/${moduleName}');

describe('${moduleName} Observability Tests', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  // Tests de traces
  describe('Trace Tests', () => {
    it('should generate traces for all operations', async () => {
      const traces = [];
      
      // Simuler des opérations
      for (let i = 0; i < 100; i++) {
        const trace = await module.operation();
        traces.push(trace);
      }
      
      // Vérifier la couverture des traces
      const traceCoverage = (traces.filter(t => t.spanId).length / traces.length) * 100;
      expect(traceCoverage).to.equal(100, \`Trace coverage (\${traceCoverage.toFixed(2)}%) below SLO (100%)\`);
      
      // Vérifier la structure des traces
      traces.forEach(trace => {
        expect(trace).to.have.property('traceId');
        expect(trace).to.have.property('spanId');
        expect(trace).to.have.property('parentSpanId');
        expect(trace).to.have.property('operation');
        expect(trace).to.have.property('startTime');
        expect(trace).to.have.property('endTime');
        expect(trace).to.have.property('duration');
        expect(trace).to.have.property('status');
        expect(trace).to.have.property('attributes');
      });
    });
  });
  
  // Tests de métriques
  describe('Metric Tests', () => {
    it('should collect metrics for all operations', async () => {
      const metrics = [];
      
      // Simuler des opérations
      for (let i = 0; i < 100; i++) {
        const metric = await module.operation();
        metrics.push(metric);
      }
      
      // Vérifier la couverture des métriques
      const metricCoverage = (metrics.filter(m => m.value !== undefined).length / metrics.length) * 100;
      expect(metricCoverage).to.equal(100, \`Metric coverage (\${metricCoverage.toFixed(2)}%) below SLO (100%)\`);
      
      // Vérifier la structure des métriques
      metrics.forEach(metric => {
        expect(metric).to.have.property('name');
        expect(metric).to.have.property('value');
        expect(metric).to.have.property('type');
        expect(metric).to.have.property('timestamp');
        expect(metric).to.have.property('labels');
      });
    });
  });
  
  // Tests de logs
  describe('Log Tests', () => {
    it('should generate logs for all operations', async () => {
      const logs = [];
      
      // Simuler des opérations
      for (let i = 0; i < 100; i++) {
        const log = await module.operation();
        logs.push(log);
      }
      
      // Vérifier la couverture des logs
      const logCoverage = (logs.filter(l => l.message).length / logs.length) * 100;
      expect(logCoverage).to.equal(100, \`Log coverage (\${logCoverage.toFixed(2)}%) below SLO (100%)\`);
      
      // Vérifier la structure des logs
      logs.forEach(log => {
        expect(log).to.have.property('level');
        expect(log).to.have.property('message');
        expect(log).to.have.property('timestamp');
        expect(log).to.have.property('context');
        expect(log).to.have.property('attributes');
      });
    });
  });
  
  // Tests d'alertes
  describe('Alert Tests', () => {
    it('should generate alerts within SLO', async () => {
      const alerts = [];
      
      // Simuler des conditions d'alerte
      for (let i = 0; i < 100; i++) {
        const alert = await module.checkAlertCondition();
        if (alert) {
          alerts.push(alert);
        }
      }
      
      // Vérifier la latence des alertes
      alerts.forEach(alert => {
        const latency = alert.timestamp - alert.conditionTimestamp;
        expect(latency).to.be.below(60 * 1000, \`Alert latency (\${latency}ms) exceeds SLO (60000ms)\`);
      });
      
      // Vérifier la structure des alertes
      alerts.forEach(alert => {
        expect(alert).to.have.property('id');
        expect(alert).to.have.property('name');
        expect(alert).to.have.property('severity');
        expect(alert).to.have.property('message');
        expect(alert).to.have.property('timestamp');
        expect(alert).to.have.property('conditionTimestamp');
        expect(alert).to.have.property('status');
        expect(alert).to.have.property('attributes');
      });
    });
  });
  
  // Tests de SLIs/SLOs
  describe('SLI/SLO Tests', () => {
    it('should meet all SLOs', async () => {
      const results = [];
      
      // Simuler des opérations
      for (let i = 0; i < 100; i++) {
        const result = await module.operation();
        results.push(result);
      }
      
      // Vérifier les SLIs
      const slis = {
        availability: (results.filter(r => r.status === 'success').length / results.length) * 100,
        latency: results.reduce((a, b) => a + b.duration, 0) / results.length,
        errorRate: (results.filter(r => r.status === 'error').length / results.length) * 100
      };
      
      // Vérifier les SLOs
      expect(slis.availability).to.be.at.least(99.9, \`Availability (\${slis.availability.toFixed(2)}%) below SLO (99.9%)\`);
      expect(slis.latency).to.be.below(200, \`Latency (\${slis.latency.toFixed(2)}ms) exceeds SLO (200ms)\`);
      expect(slis.errorRate).to.be.below(0.1, \`Error rate (\${slis.errorRate.toFixed(2)}%) exceeds SLO (0.1%)\`);
    });
  });
  
  // Tests de corrélation
  describe('Correlation Tests', () => {
    it('should correlate traces, metrics, and logs', async () => {
      const operations = [];
      
      // Simuler des opérations
      for (let i = 0; i < 100; i++) {
        const operation = await module.operation();
        operations.push(operation);
      }
      
      // Vérifier la corrélation
      operations.forEach(op => {
        expect(op.trace.traceId).to.equal(op.metric.traceId);
        expect(op.trace.spanId).to.equal(op.log.spanId);
        expect(op.metric.timestamp).to.be.closeTo(op.log.timestamp, 1000);
      });
    });
  });
  
  // Tests de contexte
  describe('Context Tests', () => {
    it('should propagate context', async () => {
      const context = {
        requestId: 'test-request-id',
        userId: 'test-user-id',
        tenantId: 'test-tenant-id'
      };
      
      // Simuler des opérations avec contexte
      const result = await module.operationWithContext(context);
      
      // Vérifier la propagation du contexte
      expect(result.trace.attributes.requestId).to.equal(context.requestId);
      expect(result.metric.labels.userId).to.equal(context.userId);
      expect(result.log.context.tenantId).to.equal(context.tenantId);
    });
  });
});
`;

  // Créer le fichier de test
  fs.writeFileSync(testPath, testTemplate);
  console.log(`Generated observability test for ${moduleName}`);
}

function generateObservabilityConfig() {
  const configPath = path.join(__dirname, '../observability.config.json');
  const config = {
    ...OBSERVABILITY_CONFIG,
    files: findFiles(SRC_DIR, /\.js$/).map(file => path.relative(SRC_DIR, file))
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Generated observability configuration');
}

function main() {
  console.log('Generating observability tests...');
  
  // Créer le dossier de tests si nécessaire
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  
  // Générer les tests pour chaque module
  const modules = findFiles(SRC_DIR, /\.js$/);
  for (const module of modules) {
    generateObservabilityTest(module);
  }
  
  // Générer la configuration d'observabilité
  generateObservabilityConfig();
  
  console.log('\nObservability test generation completed');
  console.log(`Tests generated in ${TEST_DIR}`);
  console.log('Configuration saved to observability.config.json');
}

// Exécution
main(); 