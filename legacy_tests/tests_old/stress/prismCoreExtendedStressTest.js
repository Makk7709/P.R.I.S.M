/**
 * @fileoverview Test de charge étendu pour PRISM Core v1.0.0
 * Test de 100 000 événements avec métriques détaillées par module
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { prismBus } from '../../prismBus.js';
import kernelBus from '../../core/KernelBus.js';
import performanceMonitor from '../../monitoring/prismPerformanceMonitor.js';
import fsPromises from 'fs/promises';
import { PrismCore } from '../../core/prismCore.js';
import { PrismLogger } from '../../monitoring/prismLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  TOTAL_EVENTS: 100000,
  BATCH_SIZE: 10000,
  BATCH_DELAY_MS: 2000,
  RESULTS_PATH: path.join(process.cwd(), 'tests', 'stress', 'results'),
  EVENT_TYPE: 'prism:test:event',
  MODULES: [
    'PrismEmotion',
    'PrismAdaptation',
    'PrismMemento',
    'PrismSentience',
    'PrismEnergy',
    'PrismBond',
    'PrismPulse',
    'PrismMuse',
    'PrismGhost',
    'PrismSleep',
    'PrismHarmony'
  ],
  // Seuils d'alerte ajustés
  ALERT_THRESHOLDS: {
    CPU_USAGE: 80,
    MEMORY_USAGE: 85,
    LATENCY: 150,
    ERROR_RATE: 0.01,
    BATCH_TIME: 5000,
    QUEUE_LENGTH: 1000,
    LATENCY_TREND: 0.2,
    MEMORY_TREND: 0.1,
    CPU_TREND: 0.1,
    ERROR_TREND: 0.05
  },
  // Configuration du monitoring
  MONITORING: {
    SAMPLING_INTERVAL: 2000,
    MAX_HISTORY_SIZE: 1000,
    ENABLED: true
  }
};

// Collecteur de métriques étendu
class ExtendedMetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.metrics = {
      eventsProcessed: 0,
      failuresDetected: 0,
      overloadsDetected: 0,
      startTime: 0,
      endTime: 0,
      eventLatencies: [],
      memoryUsage: {},
      cpuUsage: {},
      totalEvents: 0,
      processedEvents: 0,
      failedEvents: 0,
      overloads: 0,
      batchTimes: [],
      errors: [],
      moduleMetrics: {},
      alerts: [],
      queueMetrics: {
        maxLength: 0,
        averageLength: 0,
        overflowCount: 0
      }
    };

    // Initialiser les métriques par module
    CONFIG.MODULES.forEach(module => {
      this.metrics.moduleMetrics[module] = {
        eventCount: 0,
        latencySum: 0,
        maxLatency: 0,
        minLatency: Infinity,
        errors: 0,
        memoryUsage: [],
        cpuUsage: [],
        errorRate: 0,
        alerts: [],
        processingTimes: []
      };
    });
  }

  async collectMetrics() {
    return new Promise((resolve) => {
      const metricsHandler = (metrics) => {
        // Collecter les métriques globales
        this.metrics.memoryUsage = metrics.memory || {};
        this.metrics.cpuUsage = metrics.cpu || {};
        
        // Mettre à jour les métriques de file d'attente
        const queueMetrics = kernelBus.getMetrics();
        this.metrics.queueMetrics.maxLength = Math.max(
          this.metrics.queueMetrics.maxLength,
          queueMetrics.queueLength
        );
        this.metrics.queueMetrics.averageLength = (
          this.metrics.queueMetrics.averageLength * this.metrics.eventsProcessed +
          queueMetrics.queueLength
        ) / (this.metrics.eventsProcessed + 1);
        
        if (queueMetrics.queueLength > CONFIG.ALERT_THRESHOLDS.QUEUE_LENGTH) {
          this.metrics.queueMetrics.overflowCount++;
          this.addAlert('SYSTEM', 'QUEUE_OVERFLOW', 
            `Queue length exceeded threshold: ${queueMetrics.queueLength}`);
        }
        
        // Initialiser les métriques des modules si nécessaire
        if (!metrics.modules) {
          metrics.modules = {};
          CONFIG.MODULES.forEach(module => {
            metrics.modules[module] = {
              memory: 0,
              cpu: 0,
              latency: 0,
              processingTime: 0
            };
          });
        }
        
        // Collecter les métriques par module
        CONFIG.MODULES.forEach(module => {
          const moduleMetrics = metrics.modules[module] || {
            memory: 0,
            cpu: 0,
            latency: 0,
            processingTime: 0
          };
          const moduleData = this.metrics.moduleMetrics[module];
          
          // Mettre à jour les métriques de base
          moduleData.memoryUsage.push(moduleMetrics.memory);
          moduleData.cpuUsage.push(moduleMetrics.cpu);
          moduleData.latencySum += moduleMetrics.latency;
          moduleData.maxLatency = Math.max(moduleData.maxLatency, moduleMetrics.latency);
          moduleData.minLatency = Math.min(moduleData.minLatency, moduleMetrics.latency);
          moduleData.processingTimes.push(moduleMetrics.processingTime || 0);
          
          // Calculer le taux d'erreur
          moduleData.errorRate = moduleData.errors / moduleData.eventCount;
          
          // Vérifier les seuils d'alerte
          this.checkModuleThresholds(module, moduleData, moduleMetrics);
        });
      };

      // S'abonner aux métriques
      kernelBus.on('prism:core:performanceMetrics', metricsHandler);

      setTimeout(() => {
        // Se désabonner après l'intervalle
        kernelBus.removeListener('prism:core:performanceMetrics', metricsHandler);
        resolve();
      }, CONFIG.MONITORING.SAMPLING_INTERVAL);
    });
  }

  checkModuleThresholds(module, moduleData, currentMetrics) {
    // Vérifier l'utilisation CPU
    if (currentMetrics.cpu > CONFIG.ALERT_THRESHOLDS.CPU_USAGE) {
      this.addAlert(module, 'CPU_USAGE', `CPU usage exceeded threshold: ${currentMetrics.cpu}%`);
    }

    // Vérifier l'utilisation mémoire
    if (currentMetrics.memory > CONFIG.ALERT_THRESHOLDS.MEMORY_USAGE) {
      this.addAlert(module, 'MEMORY_USAGE', `Memory usage exceeded threshold: ${currentMetrics.memory}%`);
    }

    // Vérifier la latence
    if (currentMetrics.latency > CONFIG.ALERT_THRESHOLDS.LATENCY) {
      this.addAlert(module, 'LATENCY', `Latency exceeded threshold: ${currentMetrics.latency}ms`);
    }

    // Vérifier le taux d'erreur
    if (moduleData.errorRate > CONFIG.ALERT_THRESHOLDS.ERROR_RATE) {
      this.addAlert(module, 'ERROR_RATE', `Error rate exceeded threshold: ${moduleData.errorRate * 100}%`);
    }
  }

  addAlert(module, type, message) {
    const alert = {
      timestamp: Date.now(),
      module,
      type,
      message
    };
    
    this.metrics.alerts.push(alert);
    this.metrics.moduleMetrics[module].alerts.push(alert);
  }

  getResults() {
    const duration = this.metrics.endTime - this.metrics.startTime;
    const totalEvents = CONFIG.TOTAL_EVENTS;
    const processedEvents = totalEvents - this.metrics.failuresDetected;
    
    // Calculer les métriques par module
    const moduleResults = {};
    CONFIG.MODULES.forEach(module => {
      const moduleMetrics = this.metrics.moduleMetrics[module];
      const memoryUsage = moduleMetrics.memoryUsage;
      const cpuUsage = moduleMetrics.cpuUsage;
      const processingTimes = moduleMetrics.processingTimes;
      
      // Calculer les tendances
      const latencyTrend = moduleMetrics.latencySum > 0 ? 
        (moduleMetrics.maxLatency - moduleMetrics.minLatency) / moduleMetrics.latencySum : 0;
      
      // Calculer les tendances sur des fenêtres glissantes
      const windowSize = 5;
      const memoryTrend = calculateTrend(memoryUsage, windowSize);
      const cpuTrend = calculateTrend(cpuUsage, windowSize);
      const errorTrend = moduleMetrics.errors / totalEvents;
      
      moduleResults[module] = {
        eventCount: moduleMetrics.eventCount,
        averageLatency: moduleMetrics.latencySum / (moduleMetrics.eventCount || 1),
        maxLatency: moduleMetrics.maxLatency,
        minLatency: moduleMetrics.minLatency === Infinity ? 0 : moduleMetrics.minLatency,
        errorCount: moduleMetrics.errors,
        errorRate: moduleMetrics.errorRate,
        averageMemoryUsage: memoryUsage.reduce((a, b) => a + b, 0) / (memoryUsage.length || 1),
        maxMemoryUsage: Math.max(...memoryUsage, 0),
        averageCpuUsage: cpuUsage.reduce((a, b) => a + b, 0) / (cpuUsage.length || 1),
        maxCpuUsage: Math.max(...cpuUsage, 0),
        averageProcessingTime: processingTimes.reduce((a, b) => a + b, 0) / (processingTimes.length || 1),
        maxProcessingTime: Math.max(...processingTimes, 0),
        alerts: moduleMetrics.alerts,
        latencyTrend,
        memoryTrend,
        cpuTrend,
        errorTrend
      };
    });
    
    return {
      summary: {
        totalEvents,
        processedEvents,
        eventsProcessed: processedEvents,
        totalDurationMs: Math.round(duration),
        eventsPerSecond: Math.round((processedEvents / duration) * 1000),
        failures: this.metrics.failuresDetected,
        overloads: this.metrics.overloadsDetected,
        averageBatchTime: this.metrics.batchTimes.reduce((a, b) => a + b, 0) / (this.metrics.batchTimes.length || 1),
        maxBatchTime: Math.max(...this.metrics.batchTimes, 0),
        alerts: this.metrics.alerts,
        queueMetrics: this.metrics.queueMetrics
      },
      moduleMetrics: moduleResults,
      systemMetrics: {
        memoryUsage: this.metrics.memoryUsage,
        cpuUsage: this.metrics.cpuUsage
      },
      errors: this.metrics.errors
    };
  }
}

// Fonction utilitaire pour calculer la tendance sur une fenêtre glissante
function calculateTrend(values, windowSize) {
  if (values.length < 2) return 0;
  
  const trends = [];
  for (let i = windowSize; i < values.length; i++) {
    const windowStart = values[i - windowSize];
    const windowEnd = values[i];
    const trend = (windowEnd - windowStart) / windowStart;
    trends.push(trend);
  }
  
  return trends.length > 0 ? 
    trends.reduce((a, b) => a + b, 0) / trends.length : 0;
}

// Ajouter la génération d'événements complexes
function generateComplexEvent() {
  const eventTypes = [
    'normal',
    'missing_data',
    'inconsistent_data',
    'malformed_data',
    'high_load',
    'error_trigger'
  ];
  
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  
  const baseEvent = {
    timestamp: Date.now(),
    type: CONFIG.EVENT_TYPE,
    module: CONFIG.MODULES[Math.floor(Math.random() * CONFIG.MODULES.length)],
    data: {
      value: Math.random() * 100,
      metadata: {
        source: 'stress_test',
        version: '1.0.0'
      }
    }
  };
  
  switch (eventType) {
    case 'missing_data':
      delete baseEvent.data.value;
      break;
    case 'inconsistent_data':
      baseEvent.data.value = 'invalid_value';
      break;
    case 'malformed_data':
      baseEvent.data = null;
      break;
    case 'high_load':
      baseEvent.data.value = Math.random() * 1000;
      baseEvent.data.metadata.load = 'high';
      break;
    case 'error_trigger':
      baseEvent.data.value = -1;
      baseEvent.data.metadata.error = true;
      break;
  }
  
  return baseEvent;
}

class PrismCoreExtendedStressTest {
  constructor() {
    this.prismCore = new PrismCore();
    this.logger = new PrismLogger();
    this.results = {
      totalEventsInjected: 0,
      eventsProcessed: 0,
      failuresDetected: 0,
      overloadsDetected: 0,
      averageBatchTimeMs: 0,
      cpuUsageByModule: {},
      memoryUsageByModule: {},
      eventLatencyByModule: {},
      timestamp: Date.now()
    };
  }

  async runTest(numEvents = 100000) {
    this.logger.info('Starting PRISM Core extended stress test...');
    
    // Initialize metrics collection
    this.initializeMetrics();
    
    // Inject events in batches
    await this.injectEvents(numEvents);
    
    // Collect final metrics
    this.collectFinalMetrics();
    
    // Save results
    this.saveResults();
    
    this.logger.info('Extended stress test completed successfully');
    return this.results;
  }

  initializeMetrics() {
    // Initialize CPU and memory tracking
    this.cpuUsage = new Map();
    this.memoryUsage = new Map();
    this.eventLatency = new Map();
    
    // Start performance monitoring
    this.startTime = performance.now();
  }

  async injectEvents(numEvents) {
    const batchSize = 1000;
    const batches = Math.ceil(numEvents / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const batchStart = performance.now();
      const batchPromises = [];
      
      // Create batch of events
      for (let j = 0; j < batchSize && (i * batchSize + j) < numEvents; j++) {
        const event = this.createTestEvent(i * batchSize + j);
        batchPromises.push(this.prismCore.processEvent(event));
      }
      
      // Process batch
      try {
        await Promise.all(batchPromises);
        this.results.eventsProcessed += batchPromises.length;
      } catch (error) {
        this.results.failuresDetected++;
        this.logger.error('Event processing failed', error);
      }
      
      // Calculate batch metrics
      const batchTime = performance.now() - batchStart;
      this.results.averageBatchTimeMs = (this.results.averageBatchTimeMs * i + batchTime) / (i + 1);
      
      // Check for overloads
      if (batchTime > 100) {
        this.results.overloadsDetected++;
        this.logger.warn('Batch processing time exceeded threshold', { batchTime });
      }
      
      // Update metrics
      this.updateMetrics();
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  createTestEvent(index) {
    return {
      type: 'test:event',
      id: `test-${index}`,
      timestamp: Date.now(),
      data: {
        value: Math.random(),
        module: `module-${index % 5}`,
        priority: index % 3,
        complexity: Math.floor(Math.random() * 10)
      }
    };
  }

  updateMetrics() {
    // Update CPU usage
    this.prismCore.modules.forEach(module => {
      const cpuUsage = module.getCpuUsage();
      this.cpuUsage.set(module.id, cpuUsage);
    });
    
    // Update memory usage
    this.prismCore.modules.forEach(module => {
      const memoryUsage = module.getMemoryUsage();
      this.memoryUsage.set(module.id, memoryUsage);
    });
    
    // Update event latency
    this.prismCore.modules.forEach(module => {
      const latency = module.getEventLatency();
      this.eventLatency.set(module.id, latency);
    });
  }

  collectFinalMetrics() {
    // Aggregate CPU usage
    this.results.cpuUsageByModule = Object.fromEntries(this.cpuUsage);
    
    // Aggregate memory usage
    this.results.memoryUsageByModule = Object.fromEntries(this.memoryUsage);
    
    // Aggregate event latency
    this.results.eventLatencyByModule = Object.fromEntries(this.eventLatency);
    
    // Calculate total time
    this.results.totalTimeMs = performance.now() - this.startTime;
    
    // Calculate success rate
    this.results.successRate = (this.results.eventsProcessed / this.results.totalEventsInjected) * 100;
    
    // Calculate average latency
    this.results.averageLatencyMs = Object.values(this.results.eventLatencyByModule)
      .reduce((sum, latency) => sum + latency, 0) / Object.keys(this.results.eventLatencyByModule).length;
  }

  saveResults() {
    const results = {
      ...this.results,
      timestamp: Date.now()
    };
    
    // Save to file
    fs.writeFileSync(
      'prismCoreExtendedStressResults.json',
      JSON.stringify(results, null, 2)
    );
  }
}

// Run test
const test = new PrismCoreExtendedStressTest();
test.runTest(100000).then(results => {
  console.log('Test results:', results);
}).catch(error => {
  console.error('Test failed:', error);
}); 