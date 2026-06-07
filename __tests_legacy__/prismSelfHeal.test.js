/**
 * @fileoverview Tests pour les modules d'auto-guérison et d'adaptabilité prédictive
 */

import prismPredictiveOptimization from '../monitoring/prismPredictiveOptimization.js';
import prismCircuitBreaker from '../monitoring/prismCircuitBreaker.js';
import prismLoadBalancer from '../monitoring/prismLoadBalancer.js';
import prismLogger from '../monitoring/prismLogger.js';

describe('PrismPredictiveOptimization', () => {
  beforeEach(() => {
    // Réinitialiser l'état du module
    prismPredictiveOptimization.metricsHistory = [];
  });

  test('should predict performance decline', async () => {
    // Simuler des métriques de performance dégradées
    const metrics = Array.from({ length: 10 }, (_, i) => ({
      responseTime: 200 + i * 10,
      timestamp: Date.now() - (10 - i) * 1000
    }));

    const prediction = await prismPredictiveOptimization.predictPerformanceDecline(metrics);
    expect(prediction.probability).toBeGreaterThan(0);
    expect(prediction.prediction).toBe('decline');
  });

  test('should adapt performance thresholds', async () => {
    const prediction = {
      probability: 0.8,
      trend: -0.5
    };

    const adaptation = await prismPredictiveOptimization.adaptPerformanceThresholds(prediction);
    expect(adaptation.thresholds.responseTime).toBeLessThan(200);
    expect(adaptation.thresholds.errorRate).toBeGreaterThan(0.01);
  });
});

describe('PrismCircuitBreaker', () => {
  beforeEach(() => {
    // Réinitialiser l'état du module
    prismCircuitBreaker.circuits.clear();
  });

  test('should create and manage circuit', () => {
    const circuit = prismCircuitBreaker.createCircuit('test');
    expect(circuit.state).toBe('CLOSED');
    expect(circuit.failureCount).toBe(0);
  });

  test('should open circuit after threshold failures', async () => {
    const circuit = prismCircuitBreaker.createCircuit('test', {
      failureThreshold: 3
    });

    // Simuler des échecs
    for (let i = 0; i < 3; i++) {
      try {
        await prismCircuitBreaker.execute('test', () => {
          throw new Error('Test failure');
        });
      } catch {
        // Ignorer l'erreur
      }
    }

    expect(circuit.state).toBe('OPEN');
  });

  test('should recover circuit after timeout', async () => {
    const circuit = prismCircuitBreaker.createCircuit('test', {
      failureThreshold: 3,
      resetTimeout: 100
    });

    // Simuler des échecs
    for (let i = 0; i < 3; i++) {
      try {
        await prismCircuitBreaker.execute('test', () => {
          throw new Error('Test failure');
        });
      } catch {
        // Ignorer l'erreur
      }
    }

    expect(circuit.state).toBe('OPEN');

    // Attendre le timeout
    await new Promise(resolve => setTimeout(resolve, 200));

    // Vérifier que le circuit est en mode half-open
    expect(circuit.state).toBe('HALF_OPEN');
  });
});

describe('PrismLoadBalancer', () => {
  beforeEach(() => {
    // Réinitialiser l'état du module
    prismLoadBalancer.queues.clear();
    prismLoadBalancer.processing.clear();
  });

  test('should create and manage queue', () => {
    const queue = prismLoadBalancer.createQueue('test');
    expect(queue.items).toHaveLength(0);
    expect(queue.stats.totalProcessed).toBe(0);
  });

  test('should enqueue and process items', async () => {
    const queue = prismLoadBalancer.createQueue('test', {
      batchSize: 2
    });

    // Surcharger la méthode processItem pour les tests
    prismLoadBalancer.processItem = async (queueName, item) => {
      return item.item;
    };

    // Ajouter des éléments à la file
    await prismLoadBalancer.enqueue('test', { id: 1 });
    await prismLoadBalancer.enqueue('test', { id: 2 });
    await prismLoadBalancer.enqueue('test', { id: 3 });

    expect(queue.items).toHaveLength(3);

    // Traiter la file
    await prismLoadBalancer.processQueue('test');

    expect(queue.items).toHaveLength(0);
    expect(queue.stats.totalProcessed).toBe(3);
  });

  test('should handle processing failures', async () => {
    const queue = prismLoadBalancer.createQueue('test', {
      batchSize: 2,
      retryAttempts: 2
    });

    // Surcharger la méthode processItem pour simuler des échecs
    prismLoadBalancer.processItem = async (queueName, item) => {
      if (item.item.id === 2) {
        throw new Error('Test failure');
      }
      return item.item;
    };

    // Ajouter des éléments à la file
    await prismLoadBalancer.enqueue('test', { id: 1 });
    await prismLoadBalancer.enqueue('test', { id: 2 });
    await prismLoadBalancer.enqueue('test', { id: 3 });

    // Traiter la file
    await prismLoadBalancer.processQueue('test');

    expect(queue.stats.totalProcessed).toBe(2);
    expect(queue.stats.totalFailed).toBe(1);
  });
});

describe('PrismLogger', () => {
  beforeEach(() => {
    // Réinitialiser l'état du module
    prismLogger.logs = [];
  });

  test('should log messages with different levels', () => {
    prismLogger.debug('Debug message');
    prismLogger.info('Info message');
    prismLogger.warn('Warning message');
    prismLogger.error('Error message');
    prismLogger.critical('Critical message');

    expect(prismLogger.logs).toHaveLength(5);
    expect(prismLogger.logs[0].level).toBe('DEBUG');
    expect(prismLogger.logs[1].level).toBe('INFO');
    expect(prismLogger.logs[2].level).toBe('WARN');
    expect(prismLogger.logs[3].level).toBe('ERROR');
    expect(prismLogger.logs[4].level).toBe('CRITICAL');
  });

  test('should filter logs by level', () => {
    prismLogger.debug('Debug message');
    prismLogger.info('Info message');
    prismLogger.warn('Warning message');
    prismLogger.error('Error message');
    prismLogger.critical('Critical message');

    const errorLogs = prismLogger.getLogs('ERROR');
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].level).toBe('ERROR');
  });

  test('should log recovery actions', () => {
    const action = 'reset';
    const result = { success: true };

    prismLogger.logRecovery(action, result);

    const logs = prismLogger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].data.action).toBe(action);
    expect(logs[0].data.result).toEqual(result);
  });

  test('should log system adjustments', () => {
    const component = 'performance';
    const adjustment = { threshold: 150 };

    prismLogger.logAdjustment(component, adjustment);

    const logs = prismLogger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].data.component).toBe(component);
    expect(logs[0].data.adjustment).toEqual(adjustment);
  });
}); 