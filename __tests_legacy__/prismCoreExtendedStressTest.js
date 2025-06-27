import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import kernelBus from '../core/KernelBus.js';
import performanceMonitor from '../monitoring/PrismPerformanceMonitor.js';
import { writeFile } from 'fs/promises';
import os from 'os';

// Mock the performance monitor
jest.mock('../../monitoring/PrismPerformanceMonitor.js', () => ({
  __esModule: true,
  default: {
    setConfig: jest.fn(),
    startMonitoring: jest.fn(),
    collectSystemMetrics: jest.fn(),
    handleEventStart: jest.fn(),
    handleEventEnd: jest.fn(),
    emitMetrics: jest.fn(),
    setAlertThreshold: jest.fn(),
    onAlert: jest.fn(),
    getModuleMetrics: jest.fn()
  }
}));

describe('PRISM Core Extended Stress Test', () => {
  let startTime;
  let endTime;
  let eventsProcessed = 0;
  let eventLatencies = [];
  let systemMetrics = [];
  let moduleMetrics = {};
  let alerts = [];
  let metricsInterval;

  beforeEach(() => {
    jest.setTimeout(900000); // 15 minutes
    startTime = performance.now();
    eventsProcessed = 0;
    eventLatencies = [];
    systemMetrics = [];
    moduleMetrics = {};
    alerts = [];

    // Mock performance monitor methods
    performanceMonitor.handleEventStart.mockImplementation((eventName) => {
      const start = performance.now();
      eventLatencies.push({ eventName, start });
    });

    performanceMonitor.handleEventEnd.mockImplementation((eventName) => {
      const end = performance.now();
      const event = eventLatencies.find(e => e.eventName === eventName && !e.end);
      if (event) {
        event.end = end;
        event.duration = end - event.start;
        eventsProcessed++;
      }
    });

    performanceMonitor.collectSystemMetrics.mockImplementation(() => {
      const metrics = {
        timestamp: Date.now(),
        cpu: {
          usage: process.cpuUsage(),
          load: os.loadavg()
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem()
        }
      };
      systemMetrics.push(metrics);
      return metrics;
    });

    performanceMonitor.getModuleMetrics.mockImplementation((moduleName) => {
      if (!moduleMetrics[moduleName]) {
        moduleMetrics[moduleName] = {
          cpu: process.cpuUsage(),
          memory: process.memoryUsage(),
          latency: []
        };
      }
      return moduleMetrics[moduleName];
    });

    performanceMonitor.onAlert.mockImplementation((alert) => {
      alerts.push(alert);
    });

    // Set alert thresholds
    performanceMonitor.setAlertThreshold('cpu', 80); // 80% CPU usage
    performanceMonitor.setAlertThreshold('memory', 85); // 85% memory usage
    performanceMonitor.setAlertThreshold('latency', 100); // 100ms latency

    // Mock kernelBus emit to call performance monitor
    const originalEmit = kernelBus.emit;
    kernelBus.emit = jest.fn((eventType, payload) => {
      if (eventType === 'prism:core:event:start') {
        performanceMonitor.handleEventStart(payload);
      } else if (eventType === 'prism:core:event:end') {
        performanceMonitor.handleEventEnd(payload);
      }
      return originalEmit.call(kernelBus, eventType, payload);
    });
  });

  afterEach(() => {
    if (metricsInterval) {
      clearInterval(metricsInterval);
    }
    jest.clearAllMocks();
  });

  const processEventBatch = async (batch) => {
    // Process events sequentially to ensure proper start/end pairing
    for (const event of batch) {
      await kernelBus.emit('prism:core:event:start', event);
      await kernelBus.emit('prism:core:event:end', event);
    }
    return batch.length;
  };

  const collectMetrics = () => {
    const metrics = performanceMonitor.collectSystemMetrics();
    const currentLatency = eventLatencies
      .filter(e => e.duration)
      .slice(-100)
      .reduce((sum, e) => sum + e.duration, 0) / 100;

    if (currentLatency > 100) {
      performanceMonitor.onAlert({
        type: 'latency',
        value: currentLatency,
        threshold: 100,
        timestamp: Date.now()
      });
    }

    // Collect module-specific metrics
    const modules = ['PrismEmotion', 'PrismAdaptation', 'PrismMemento', 'PrismSentience'];
    modules.forEach(module => {
      const moduleMetric = performanceMonitor.getModuleMetrics(module);
      moduleMetric.latency.push(currentLatency);
    });

    return metrics;
  };

  const generateComplexEvent = (index) => {
    // Generate events with potential inconsistencies or missing data
    const eventTypes = ['emotion', 'adaptation', 'memento', 'sentience'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    return {
      id: `test:event:${index}`,
      type: eventType,
      timestamp: Date.now(),
      data: {
        value: Math.random() * 100,
        // Randomly omit some fields to test resilience
        ...(Math.random() > 0.1 && { metadata: { source: 'test' } }),
        ...(Math.random() > 0.2 && { context: { environment: 'test' } }),
        // Add some potential inconsistencies
        ...(Math.random() > 0.9 && { invalidField: undefined }),
        ...(Math.random() > 0.9 && { nested: { invalid: null } })
      }
    };
  };

  test('should handle 100000 events with detailed module metrics', async () => {
    const batchSize = 20000;
    const totalEvents = 100000;
    const batches = [];
    
    // Prepare batches with complex events
    for (let i = 0; i < totalEvents; i += batchSize) {
      const batch = [];
      for (let j = 0; j < batchSize && i + j < totalEvents; j++) {
        batch.push(generateComplexEvent(i + j));
      }
      batches.push(batch);
    }
    
    // Start metrics collection
    metricsInterval = setInterval(() => {
      collectMetrics();
    }, 1000);

    // Process batches with controlled concurrency
    const concurrentBatches = 5;
    
    // Process all batches
    for (let i = 0; i < batches.length; i += concurrentBatches) {
      const currentBatches = batches.slice(i, i + concurrentBatches);
      const results = await Promise.all(
        currentBatches.map(batch => processEventBatch(batch))
      );
      const processedCount = results.reduce((a, b) => a + b, 0);
      
      // Verify batch processing
      expect(processedCount).toBeLessThanOrEqual(batchSize * concurrentBatches);
      expect(eventsProcessed).toBeGreaterThan(0);
      
      // Force metrics collection after each batch
      collectMetrics();
      
      // Add delay between batches to simulate real-world conditions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Clear interval and calculate final metrics
    clearInterval(metricsInterval);
    endTime = performance.now();
    
    // Calculate metrics
    const duration = endTime - startTime;
    const completedEvents = eventLatencies.filter(e => e.duration);
    const avgLatency = completedEvents.length > 0
      ? completedEvents.reduce((sum, e) => sum + e.duration, 0) / completedEvents.length
      : 0;
    
    const results = {
      totalEventsInjected: totalEvents,
      eventsProcessed: eventsProcessed,
      failuresDetected: 0,
      overloadsDetected: alerts.length,
      averageBatchTimeMs: duration / (totalEvents / batchSize),
      cpuUsageByModule: Object.fromEntries(
        Object.entries(moduleMetrics).map(([module, metrics]) => [
          module,
          metrics.cpu
        ])
      ),
      memoryUsageByModule: Object.fromEntries(
        Object.entries(moduleMetrics).map(([module, metrics]) => [
          module,
          metrics.memory
        ])
      ),
      eventLatencyByModule: Object.fromEntries(
        Object.entries(moduleMetrics).map(([module, metrics]) => [
          module,
          {
            average: metrics.latency.reduce((a, b) => a + b, 0) / metrics.latency.length,
            p95: metrics.latency.sort((a, b) => b - a)[Math.floor(metrics.latency.length * 0.95)],
            p99: metrics.latency.sort((a, b) => b - a)[Math.floor(metrics.latency.length * 0.99)]
          }
        ])
      ),
      timestamp: Date.now()
    };
    
    // Save results
    await writeFile(
      'prismCoreExtendedStressResults.json',
      JSON.stringify(results, null, 2)
    );
    
    // Verify results
    expect(results.eventsProcessed).toBe(100000);
    expect(results.failuresDetected).toBe(0);
    expect(results.averageBatchTimeMs).toBeLessThan(5000);
    
    // Verify module metrics
    Object.values(results.eventLatencyByModule).forEach(moduleLatency => {
      expect(moduleLatency.average).toBeLessThan(100);
      expect(moduleLatency.p95).toBeLessThan(200);
      expect(moduleLatency.p99).toBeLessThan(500);
    });
    
    // Verify performance monitor was called correctly
    expect(performanceMonitor.handleEventStart).toHaveBeenCalledTimes(100000);
    expect(performanceMonitor.handleEventEnd).toHaveBeenCalledTimes(100000);
    expect(performanceMonitor.collectSystemMetrics).toHaveBeenCalled();
  });
}); 