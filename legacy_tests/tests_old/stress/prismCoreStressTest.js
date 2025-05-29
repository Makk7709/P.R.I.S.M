/**
 * @fileoverview Stress test pour PRISM Core v1.0.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { prismBus } from '../../prismBus.js';
import { jest } from '@jest/globals';
import kernelBus from '../../core/KernelBus.js';
import performanceMonitor from '../../monitoring/prismPerformanceMonitor.js';
import fsPromises from 'fs/promises';
import { PrismCore } from '../../core/prismCore.js';
import { PrismLogger } from '../../monitoring/prismLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  TOTAL_EVENTS: 1000,
  BATCH_SIZE: 100,
  RESULTS_PATH: path.join(process.cwd(), 'tests', 'results'),
  EVENT_TYPE: 'prism:test:event'
};

// Metrics tracking
class MetricsCollector {
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
      memoryUsage: [],
      cpuUsage: [],
      totalEvents: 0,
      processedEvents: 0,
      failedEvents: 0,
      overloads: 0,
      batchTimes: [],
      errors: []
    };
  }

  async collectMetrics() {
    return new Promise((resolve) => {
      const unsubscribe = kernelBus.on('prism:core:performanceMetrics', (metrics) => {
        this.metrics.memoryUsage.push(metrics.memory.current);
        this.metrics.cpuUsage.push(metrics.cpu.current);
        this.metrics.eventLatencies.push(...Object.values(metrics.events).map(e => e.averageDuration));
      });

      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 1000);
    });
  }

  getResults() {
    const duration = this.metrics.endTime - this.metrics.startTime;
    const avgLatency = this.metrics.eventLatencies.reduce((a, b) => a + b, 0) / this.metrics.eventLatencies.length;
    
    return {
      summary: {
        totalEvents: this.metrics.eventsProcessed,
        totalDurationMs: duration,
        eventsPerSecond: (this.metrics.eventsProcessed / duration) * 1000,
        averageLatencyMs: avgLatency,
        failures: this.metrics.failuresDetected,
        overloads: this.metrics.overloadsDetected
      },
      details: {
        eventLatencies: this.metrics.eventLatencies,
        memoryUsage: this.metrics.memoryUsage,
        cpuUsage: this.metrics.cpuUsage
      }
    };
  }
}

class PrismCoreStressTest {
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

  async runTest(numEvents = 1000) {
    this.logger.info('Starting PRISM Core stress test...');
    
    // Initialize metrics collection
    this.initializeMetrics();
    
    // Inject events
    await this.injectEvents(numEvents);
    
    // Collect final metrics
    this.collectFinalMetrics();
    
    // Save results
    this.saveResults();
    
    this.logger.info('Stress test completed successfully');
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
    const batchSize = 100;
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
        priority: index % 3
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
  }

  saveResults() {
    const results = {
      ...this.results,
      timestamp: Date.now()
    };
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync(
      'prismCoreExtendedStressResults.json',
      JSON.stringify(results, null, 2)
    );
  }
}

describe('PRISM Core Performance Monitoring Stress Test', () => {
  let metricsCollector;
  let mockEmit;
  let mockOn;

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
    mockEmit = jest.fn();
    mockOn = jest.fn();
    kernelBus.emit = mockEmit;
    kernelBus.on = mockOn;
    
    performanceMonitor.setConfig({
      samplingInterval: 100, // Faster for testing
      maxHistorySize: 1000,
      enabled: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should handle 1000 events without performance degradation', async () => {
    metricsCollector.metrics.startTime = Date.now();
    
    // Inject 1000 events
    for (let i = 0; i < 1000; i++) {
      kernelBus.emit('prism:core:event:start', `test:event:${i}`);
      await new Promise(resolve => setTimeout(resolve, 1)); // Small delay to simulate real processing
      kernelBus.emit('prism:core:event:end', `test:event:${i}`);
    }
    
    // Collect metrics for 1 second
    await metricsCollector.collectMetrics();
    
    metricsCollector.metrics.endTime = Date.now();
    const results = metricsCollector.getResults();
    
    // Save results to file
    await fsPromises.writeFile(
      'prismCoreStressResults.json',
      JSON.stringify(results, null, 2)
    );
    
    // Verify results
    expect(results.summary.totalEvents).toBe(1000);
    expect(results.summary.failures).toBe(0);
    expect(results.summary.overloads).toBe(0);
    expect(results.summary.averageLatencyMs).toBeLessThan(100); // Should be under 100ms
    
    // Verify metrics were collected
    expect(results.details.eventLatencies.length).toBeGreaterThan(0);
    expect(results.details.memoryUsage.length).toBeGreaterThan(0);
    expect(results.details.cpuUsage.length).toBeGreaterThan(0);
  });
});

// Run the test if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const test = new PrismCoreStressTest();
  test.runTest(1000).then(results => {
    console.log('Test results:', results);
  }).catch(error => {
    console.error('Test failed:', error);
  });
}

export { PrismCoreStressTest, CONFIG }; 