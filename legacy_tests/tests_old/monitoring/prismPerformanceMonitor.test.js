import { jest } from '@jest/globals';
import performanceMonitor from '../../monitoring/prismPerformanceMonitor.js';
import kernelBus from '../../core/KernelBus.js';

describe('PrismPerformanceMonitor', () => {
  let mockEmit;
  let mockOn;

  beforeEach(() => {
    mockEmit = jest.fn();
    mockOn = jest.fn();
    kernelBus.emit = mockEmit;
    kernelBus.on = mockOn;
    performanceMonitor.setConfig({
      samplingInterval: 100, // Faster for testing
      maxHistorySize: 10,
      enabled: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default configuration', () => {
    expect(performanceMonitor.config).toBeDefined();
    expect(performanceMonitor.config.enabled).toBe(true);
    expect(performanceMonitor.config.samplingInterval).toBe(100);
    expect(performanceMonitor.config.maxHistorySize).toBe(10);
  });

  test('should collect system metrics', () => {
    performanceMonitor.collectSystemMetrics();
    
    expect(performanceMonitor.metrics.cpuUsage.length).toBe(1);
    expect(performanceMonitor.metrics.memoryUsage.length).toBe(1);
    
    const cpuMetric = performanceMonitor.metrics.cpuUsage[0];
    expect(cpuMetric).toHaveProperty('user');
    expect(cpuMetric).toHaveProperty('system');
    expect(cpuMetric).toHaveProperty('timestamp');
    
    const memoryMetric = performanceMonitor.metrics.memoryUsage[0];
    expect(memoryMetric).toHaveProperty('heapUsed');
    expect(memoryMetric).toHaveProperty('heapTotal');
    expect(memoryMetric).toHaveProperty('rss');
  });

  test('should track event latencies', () => {
    const eventName = 'test:event';
    
    performanceMonitor.handleEventStart(eventName);
    expect(performanceMonitor.metrics.eventLatencies.length).toBe(1);
    
    performanceMonitor.handleEventEnd(eventName);
    const event = performanceMonitor.metrics.eventLatencies.find(e => e.eventName === eventName);
    expect(event).toHaveProperty('endTime');
    expect(event).toHaveProperty('duration');
  });

  test('should track module latencies', () => {
    const moduleName = 'test:module';
    
    performanceMonitor.handleModuleStart(moduleName);
    expect(performanceMonitor.metrics.moduleLatencies.has(moduleName)).toBe(true);
    
    performanceMonitor.handleModuleEnd(moduleName);
    const latencies = performanceMonitor.metrics.moduleLatencies.get(moduleName);
    expect(latencies.length).toBe(1);
    expect(latencies[0]).toHaveProperty('endTime');
    expect(latencies[0]).toHaveProperty('duration');
  });

  test('should emit performance metrics', () => {
    performanceMonitor.emitMetrics();
    
    expect(mockEmit).toHaveBeenCalledWith('prism:core:performanceMetrics', expect.any(Object));
    const metrics = mockEmit.mock.calls[0][1];
    
    expect(metrics).toHaveProperty('timestamp');
    expect(metrics).toHaveProperty('cpu');
    expect(metrics).toHaveProperty('memory');
    expect(metrics).toHaveProperty('modules');
    expect(metrics).toHaveProperty('events');
  });

  test('should respect maxHistorySize limit', () => {
    const moduleName = 'test:module';
    
    // Add more items than maxHistorySize
    for (let i = 0; i < 15; i++) {
      performanceMonitor.handleModuleStart(moduleName);
      performanceMonitor.handleModuleEnd(moduleName);
    }
    
    const latencies = performanceMonitor.metrics.moduleLatencies.get(moduleName);
    expect(latencies.length).toBe(10); // maxHistorySize
  });

  test('should be configurable', () => {
    performanceMonitor.setConfig({
      samplingInterval: 2000,
      maxHistorySize: 50,
      enabled: false
    });
    
    expect(performanceMonitor.config.samplingInterval).toBe(2000);
    expect(performanceMonitor.config.maxHistorySize).toBe(50);
    expect(performanceMonitor.config.enabled).toBe(false);
  });

  test('should calculate average latencies correctly', () => {
    const latencies = [
      { duration: 100 },
      { duration: 200 },
      { duration: 300 }
    ];
    
    const average = performanceMonitor.calculateAverageLatency(latencies);
    expect(average).toBe(200);
  });

  test('should handle empty latencies', () => {
    const average = performanceMonitor.calculateAverageLatency([]);
    expect(average).toBe(0);
  });
}); 