/**
 * PRISM Self-Healing System
 * Handles automatic recovery and repair of PRISM components
 */

import prismBus from './prismBus.js';
import prismPredictiveOptimization from './monitoring/prismPredictiveOptimization.js';
import prismCircuitBreaker from './monitoring/prismCircuitBreaker.js';
import prismLoadBalancer from './monitoring/prismLoadBalancer.js';
import prismLogger from './monitoring/prismLogger.js';

class PrismSelfHeal {
  constructor() {
    this.healingStrategies = new Map();
    this.healingHistory = [];
    this.maxHistoryLength = 50;
    this.initializeStrategies();
  }

  initializeStrategies() {
    // Memory leak detection and cleanup
    this.registerStrategy('memory', async (_error) => {
      if (global.gc) {
        global.gc();
      }
      return { success: true, action: 'memory_cleanup' };
    });

    // Module reinitialization
    this.registerStrategy('module', async (error) => {
      const moduleName = error.module;
      if (moduleName) {
        await prismBus.emit('module:reinitialize', { module: moduleName });
        return { success: true, action: 'module_reinit', module: moduleName };
      }
      return { success: false, action: 'module_reinit_failed' };
    });

    // Connection recovery
    this.registerStrategy('connection', async (error) => {
      await prismBus.emit('connection:retry', { error });
      return { success: true, action: 'connection_retry' };
    });

    // State recovery
    this.registerStrategy('state', async (_error) => {
      await prismBus.emit('state:restore', { timestamp: Date.now() });
      return { success: true, action: 'state_restore' };
    });

    // Performance optimization
    this.registerStrategy('performance', async (_error) => {
      const metrics = await this.collectMetrics();
      const prediction = await prismPredictiveOptimization.predictPerformanceDecline(metrics);
      
      if (prediction.probability > 0.7) {
        const adaptation = await prismPredictiveOptimization.adaptPerformanceThresholds(prediction);
        return { 
          success: true, 
          action: 'performance_optimization', 
          prediction,
          adaptation
        };
      }
      
      return { success: false, action: 'performance_optimization_skipped' };
    });

    // Circuit breaker recovery
    this.registerStrategy('circuit', async (error) => {
      const circuitName = error.circuit;
      if (circuitName) {
        const circuit = prismCircuitBreaker.getCircuit(circuitName);
        if (circuit && circuit.state === 'OPEN') {
          prismCircuitBreaker.reset(circuitName);
          return { success: true, action: 'circuit_reset', circuit: circuitName };
        }
      }
      return { success: false, action: 'circuit_reset_failed' };
    });

    // Load balancer recovery
    this.registerStrategy('load', async (error) => {
      const queueName = error.queue;
      if (queueName) {
        const queue = prismLoadBalancer.getQueue(queueName);
        if (queue) {
          await prismLoadBalancer.processQueue(queueName);
          return { success: true, action: 'queue_processed', queue: queueName };
        }
      }
      return { success: false, action: 'queue_processing_failed' };
    });
  }

  registerStrategy(type, handler) {
    this.healingStrategies.set(type, handler);
  }

  async heal(error) {
    const healingRecord = {
      timestamp: Date.now(),
      error,
      actions: []
    };

    try {
      const strategy = this.healingStrategies.get(error.type) || this.healingStrategies.get('state');
      if (strategy) {
        const result = await strategy(error);
        healingRecord.actions.push(result);
        healingRecord.success = result.success;
        
        // Logger l'action de récupération
        prismLogger.logRecovery(error.type, result);
      } else {
        healingRecord.success = false;
        healingRecord.reason = 'no_strategy_found';
      }
    } catch (healingError) {
      healingRecord.success = false;
      healingRecord.error = healingError;
      
      // Logger l'erreur de récupération
      prismLogger.error('Healing failed', { error: healingError });
    }

    this.healingHistory.push(healingRecord);
    if (this.healingHistory.length > this.maxHistoryLength) {
      this.healingHistory.shift();
    }

    await prismBus.emit('healing:complete', healingRecord);
    return healingRecord;
  }

  getHealingHistory() {
    return [...this.healingHistory];
  }

  async diagnose() {
    const diagnosis = {
      timestamp: Date.now(),
      healingHistory: this.getHealingHistory(),
      activeStrategies: Array.from(this.healingStrategies.keys()),
      systemHealth: this.calculateSystemHealth()
    };

    await prismBus.emit('diagnosis:complete', diagnosis);
    return diagnosis;
  }

  calculateSystemHealth() {
    const recentHistory = this.healingHistory.slice(-10);
    const successfulHeals = recentHistory.filter(record => record.success).length;
    return {
      score: recentHistory.length > 0 ? (successfulHeals / recentHistory.length) * 100 : 100,
      recentIncidents: recentHistory.length,
      successRate: `${successfulHeals}/${recentHistory.length}`
    };
  }

  async collectMetrics() {
    // Collecter les métriques de performance
    const metrics = [];
    
    // Collecter les métriques de circuit breaker
    for (const [name, circuit] of prismCircuitBreaker.circuits) {
      metrics.push({
        type: 'circuit',
        name,
        state: circuit.state,
        failureCount: circuit.failureCount,
        timestamp: Date.now()
      });
    }
    
    // Collecter les métriques de load balancer
    for (const [name, queue] of prismLoadBalancer.queues) {
      metrics.push({
        type: 'queue',
        name,
        size: queue.items.length,
        processed: queue.stats.totalProcessed,
        failed: queue.stats.totalFailed,
        timestamp: Date.now()
      });
    }
    
    return metrics;
  }
}

export const prismSelfHeal = new PrismSelfHeal();
export default prismSelfHeal; 