import { jest } from '@jest/globals';
import path from 'node:path';
import fs from 'node:fs/promises';
import PRISM from '../../prismCore.js';
import { KernelBus } from '../../core/KernelBus.js';
import PrismMood from '../../prismMood.js';
import PrismSoul from '../../prismSoul.js';
import PrismPerformanceMonitor from '../../monitoring/PrismPerformanceMonitor.js';
import PrismCoreMetrics from '../../monitoring/coreMetrics.js';
import { PrismCore } from '../../prismCore.js';
import { performance } from 'node:perf_hooks';
import { PrismStrategy } from '../../core/PrismStrategy.js';
import { PrismSelfOptimization } from '../../core/PrismSelfOptimization.js';

// Mock session management
jest.mock('../../prismSession.js', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    getSessionId: jest.fn(() => 'test-session-id'),
    getSessionInfo: jest.fn(() => ({
      id: 'test-session-id',
      metadata: {
        timestamp: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      }
    })),
    isSessionValid: jest.fn(() => true),
    updateLastActivity: jest.fn(),
    resetSession: jest.fn()
  }
}));

// Mock window for KernelBus
global.window = {
    onerror: null,
    addEventListener: () => {},
    onunhandledrejection: null,
    performance: {
        memory: null
    }
};

// Mock CustomEvent for Node.js environment
global.CustomEvent = class CustomEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail;
  }
};

// Test configuration
const NUM_EVENTS = 50000;
const MAX_FAILURES = 0;
const MAX_AVG_BATCH_TIME = 500; // ms
const BATCH_SIZE = 100;
const SCALABILITY_TEST_ITERATIONS = 5;

// Metrics for stress test
let eventsProcessed = 0;
let failuresDetected = 0;
let totalBatchTime = 0;
let batchCount = 0;
let cpuUsage = [];
let memoryUsage = [];
let latencies = [];

// Performance monitoring
const performanceMonitor = new PrismPerformanceMonitor();
const coreMetrics = new PrismCoreMetrics();

// Event generation with more complex scenarios
const generateRandomEvent = () => {
  const eventTypes = ['emotional', 'behavioral', 'memory', 'module', 'system', 'error'];
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  
  switch(type) {
    case 'emotional':
      return {
        type: 'emotional',
        data: {
          valence: Math.random(),
          arousal: Math.random(),
          dominance: Math.random(),
          intensity: Math.random(),
          timestamp: Date.now()
        }
      };
    case 'behavioral':
      return {
        type: 'behavioral',
        data: {
          openness: Math.random(),
          conscientiousness: Math.random(),
          extraversion: Math.random(),
          agreeableness: Math.random(),
          neuroticism: Math.random(),
          timestamp: Date.now()
        }
      };
    case 'memory':
      return {
        type: 'memory',
        data: {
          shortTerm: new Map([['testKey', Math.random()]]),
          longTerm: new Map([['testKey', Math.random()]]),
          timestamp: Date.now()
        }
      };
    case 'module':
      return {
        type: 'module',
        data: {
          tone: Math.random(),
          think: Math.random(),
          adapt: Math.random(),
          timestamp: Date.now()
        }
      };
    case 'system':
      return {
        type: 'system',
        data: {
          status: 'operational',
          load: Math.random(),
          timestamp: Date.now()
        }
      };
    case 'error':
      return {
        type: 'error',
        data: {
          code: Math.floor(Math.random() * 1000),
          message: 'Simulated error',
          timestamp: Date.now()
        }
      };
  }
};

// Performance monitoring functions
const recordMetrics = () => {
  const metrics = performanceMonitor.getMetrics();
  cpuUsage.push(metrics.cpu);
  memoryUsage.push(metrics.memory);
  latencies.push(metrics.latency);
};

// Generate test report
const generateReport = async () => {
  const report = {
    totalEventsInjected: NUM_EVENTS,
    eventsProcessed,
    failuresDetected,
    overloadsDetected: cpuUsage.filter(usage => usage > 80).length,
    averageBatchTimeMs: totalBatchTime / batchCount,
    cpuUsage: {
      average: cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length,
      max: Math.max(...cpuUsage),
      min: Math.min(...cpuUsage)
    },
    memoryUsage: {
      average: memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length,
      max: Math.max(...memoryUsage),
      min: Math.min(...memoryUsage)
    },
    latencies: {
      average: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      max: Math.max(...latencies),
      min: Math.min(...latencies)
    },
    timestamp: new Date().toISOString()
  };

  await fs.writeFile(
    path.join(process.cwd(), 'prismCoreStressResults.json'),
    JSON.stringify(report, null, 2)
  );

  return report;
};

describe('PRISM Core Advanced Stress Test', () => {
  let prismCore;

  beforeEach(() => {
    // Reset metrics
    eventsProcessed = 0;
    failuresDetected = 0;
    totalBatchTime = 0;
    batchCount = 0;
    cpuUsage = [];
    memoryUsage = [];
    latencies = [];

    // Reset mocks
    jest.clearAllMocks();
    
    // Initialize PRISM with mocked modules
    PRISM.mood = new PrismMood();
    PRISM.soul = new PrismSoul();
    PRISM.kernelBus = new KernelBus();
    
    // Initialize PRISM
    PRISM.init();
  });

  afterEach(() => {
    PRISM.reset();
  });

  test(`Should handle ${NUM_EVENTS} events without failures`, async () => {
    // Process events in batches
    for (let i = 0; i < NUM_EVENTS; i += BATCH_SIZE) {
      const batchStart = Date.now();
      const eventBatch = Array(BATCH_SIZE).fill(null).map(generateRandomEvent);
      
      try {
        await Promise.all(eventBatch.map(event => PRISM.processEvent(event)));
        eventsProcessed += eventBatch.length;
      } catch (error) {
        failuresDetected++;
        console.error('Batch processing error:', error);
      }
      
      const batchTime = Date.now() - batchStart;
      totalBatchTime += batchTime;
      batchCount++;

      // Record metrics after each batch
      recordMetrics();
    }

    const avgBatchTime = totalBatchTime / batchCount;
    
    // Assertions
    expect(eventsProcessed).toBe(NUM_EVENTS);
    expect(failuresDetected).toBeLessThanOrEqual(MAX_FAILURES);
    expect(avgBatchTime).toBeLessThanOrEqual(MAX_AVG_BATCH_TIME);
    
    // Verify PRISM state
    const soulState = PRISM.soul.getSoulState();
    const moodState = PRISM.mood.getCurrentMood();
    
    expect(soulState).toBeDefined();
    expect(moodState).toBeDefined();
    expect(soulState.emotional.valence).toBeGreaterThanOrEqual(0);
    expect(soulState.emotional.valence).toBeLessThanOrEqual(1);
    expect(moodState.intensity).toBeGreaterThanOrEqual(0);
    expect(moodState.intensity).toBeLessThanOrEqual(1);

    // Generate and verify report
    const report = await generateReport();
    expect(report.eventsProcessed).toBe(NUM_EVENTS);
    expect(report.failuresDetected).toBe(0);
    expect(report.averageBatchTimeMs).toBeLessThanOrEqual(MAX_AVG_BATCH_TIME);
  });

  test('Should scale horizontally under load', async () => {
    const scalabilityResults = [];

    for (let i = 0; i < SCALABILITY_TEST_ITERATIONS; i++) {
      const iterationStart = Date.now();
      const eventsProcessed = 0;
      const failuresDetected = 0;

      // Simulate distributed environment
      const numInstances = Math.pow(2, i); // 1, 2, 4, 8, 16 instances
      const eventsPerInstance = Math.floor(NUM_EVENTS / numInstances);

      // Process events in parallel across simulated instances
      const instancePromises = Array(numInstances).fill(null).map(async () => {
        for (let j = 0; j < eventsPerInstance; j += BATCH_SIZE) {
          const batchStart = Date.now();
          const eventBatch = Array(BATCH_SIZE).fill(null).map(generateRandomEvent);
          
          try {
            await Promise.all(eventBatch.map(event => PRISM.processEvent(event)));
            eventsProcessed += eventBatch.length;
          } catch (error) {
            failuresDetected++;
          }
          
          const batchTime = Date.now() - batchStart;
          totalBatchTime += batchTime;
          batchCount++;
        }
      });

      await Promise.all(instancePromises);

      const iterationTime = Date.now() - iterationStart;
      scalabilityResults.push({
        numInstances,
        eventsProcessed,
        failuresDetected,
        totalTime: iterationTime,
        averageBatchTime: totalBatchTime / batchCount
      });
    }

    // Verify scalability
    for (let i = 1; i < scalabilityResults.length; i++) {
      const current = scalabilityResults[i];
      const previous = scalabilityResults[i - 1];
      
      // Verify that doubling instances doesn't double processing time
      expect(current.totalTime).toBeLessThan(previous.totalTime * 1.5);
      expect(current.averageBatchTime).toBeLessThan(previous.averageBatchTime * 1.2);
    }
  });
}); 