import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import PRISM from '../../prismCore.js';
import KernelBus from '../../core/KernelBus.js';
import PrismMood from '../../prismMood.js';
import PrismSoul from '../../prismSoul.js';

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

// Test configuration
const NUM_EVENTS = 1000;
const MAX_FAILURES = 0;
const MAX_AVG_BATCH_TIME = 100; // ms

// Metrics for stress test
let eventsProcessed = 0;
let failuresDetected = 0;
let totalBatchTime = 0;
let batchCount = 0;

// Event generation
const generateRandomEvent = () => {
  const eventTypes = ['emotional', 'behavioral', 'memory', 'module'];
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  
  switch(type) {
    case 'emotional':
      return {
        type: 'emotional',
        data: {
          valence: Math.random(),
          arousal: Math.random(),
          dominance: Math.random()
        }
      };
    case 'behavioral':
      return {
        type: 'behavioral',
        data: {
          openness: Math.random(),
          conscientiousness: Math.random()
        }
      };
    case 'memory':
      return {
        type: 'memory',
        data: {
          shortTerm: new Map([['testKey', Math.random()]])
        }
      };
    case 'module':
      return {
        type: 'module',
        data: {
          tone: Math.random(),
          think: Math.random()
        }
      };
  }
};

describe('PRISM Core Stress Test', () => {
  beforeEach(() => {
    // Reset metrics
    eventsProcessed = 0;
    failuresDetected = 0;
    totalBatchTime = 0;
    batchCount = 0;

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
    for (let i = 0; i < NUM_EVENTS; i += 10) {
      const batchStart = Date.now();
      const eventBatch = Array(10).fill(null).map(generateRandomEvent);
      
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
  });
}); 