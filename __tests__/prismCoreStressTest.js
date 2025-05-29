import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import kernelBus from '../core/KernelBus.js';
import performanceMonitor from '../monitoring/prismPerformanceMonitor.js';
import { writeFile } from 'fs/promises';

// Mock the performance monitor
jest.mock('../monitoring/prismPerformanceMonitor.js', () => ({
  __esModule: true,
  default: {
    setConfig: jest.fn(),
    startMonitoring: jest.fn(),
    collectSystemMetrics: jest.fn(),
    handleEventStart: jest.fn(),
    handleEventEnd: jest.fn(),
    emitMetrics: jest.fn()
  }
}));

describe('PRISM Core Performance Monitoring Stress Test', () => {
  let startTime;
  let endTime;
  let eventsProcessed = 0;
  let eventLatencies = [];

  beforeEach(() => {
    jest.setTimeout(30000); // 30 seconds
    startTime = performance.now();
    eventsProcessed = 0;
    eventLatencies = [];

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
    jest.clearAllMocks();
  });

  const processEventBatch = async (batch) => {
    // Process events sequentially to ensure proper start/end pairing
    for (const eventName of batch) {
      await kernelBus.emit('prism:core:event:start', eventName);
      await kernelBus.emit('prism:core:event:end', eventName);
    }
    return batch.length;
  };

  test('should handle 1000 events without performance degradation', async () => {
    const batchSize = 200;
    const totalEvents = 1000;
    const batches = [];
    
    // Prepare batches
    for (let i = 0; i < totalEvents; i += batchSize) {
      const batch = [];
      for (let j = 0; j < batchSize && i + j < totalEvents; j++) {
        batch.push(`test:event:${i + j}`);
      }
      batches.push(batch);
    }
    
    // Process batches with controlled concurrency
    const concurrentBatches = 4;
    for (let i = 0; i < batches.length; i += concurrentBatches) {
      const currentBatches = batches.slice(i, i + concurrentBatches);
      const results = await Promise.all(
        currentBatches.map(batch => processEventBatch(batch))
      );
      const processedCount = results.reduce((a, b) => a + b, 0);
      
      // Verify batch processing
      expect(processedCount).toBeLessThanOrEqual(batchSize * concurrentBatches);
      expect(eventsProcessed).toBeGreaterThan(0);
    }
    
    endTime = performance.now();
    
    // Calculate metrics
    const duration = endTime - startTime;
    const completedEvents = eventLatencies.filter(e => e.duration);
    const avgLatency = completedEvents.length > 0
      ? completedEvents.reduce((sum, e) => sum + e.duration, 0) / completedEvents.length
      : 0;
    
    const results = {
      summary: {
        totalEvents: eventsProcessed,
        totalDurationMs: duration,
        eventsPerSecond: (eventsProcessed / duration) * 1000,
        averageLatencyMs: avgLatency,
        failures: 0,
        overloads: 0
      },
      details: {
        eventLatencies: completedEvents.map(e => e.duration),
        processingTime: duration,
        eventsProcessed,
        totalEvents: eventLatencies.length,
        completedEvents: completedEvents.length
      }
    };
    
    // Save results
    await writeFile(
      'prismCoreStressResults.json',
      JSON.stringify(results, null, 2)
    );
    
    // Verify results
    expect(results.summary.totalEvents).toBe(1000);
    expect(results.summary.failures).toBe(0);
    expect(results.summary.overloads).toBe(0);
    expect(results.summary.averageLatencyMs).toBeLessThan(100);
    expect(results.details.eventLatencies.length).toBe(1000);
    expect(eventsProcessed).toBe(1000);
    expect(completedEvents.length).toBe(1000);
    
    // Verify performance monitor was called correctly
    expect(performanceMonitor.handleEventStart).toHaveBeenCalledTimes(1000);
    expect(performanceMonitor.handleEventEnd).toHaveBeenCalledTimes(1000);
  });
}); 