/**
 * @fileoverview Tests unitaires pour PrismSentience
 * @module tests/monitoring/prismSentience
 */

import { jest } from '@jest/globals';
import { PrismSentience } from '../../dist/monitoring/prismSentience.js';
import kernelBus from '../../core/KernelBus.js';

// Mock kernelBus
jest.mock('@core/KernelBus.js', () => ({
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  emit: jest.fn()
}));

describe('PrismSentience', () => {
  let sentience;
  const mockOptions = {
    criticalThreshold: 0.7,
    adaptiveThreshold: 0.5,
    analysisWindow: 3
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sentience = new PrismSentience(mockOptions);
  });

  afterEach(() => {
    sentience.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const defaultSentience = new PrismSentience();
      expect(defaultSentience.version).toBe('1.0.0');
      expect(defaultSentience.criticalThreshold).toBe(0.7);
      expect(defaultSentience.adaptiveThreshold).toBe(0.5);
      expect(defaultSentience.analysisWindow).toBe(5);
    });

    test('should subscribe to memento events', () => {
      expect(kernelBus.subscribe).toHaveBeenCalledWith(
        'prism:memento:snapshotGenerated',
        expect.any(Function)
      );
    });
  });

  describe('Insight Analysis', () => {
    test('should calculate tension from insights', () => {
      const insights = [
        { type: 'critical', confidence: 0.9 },
        { type: 'drift', confidence: 0.8 },
        { type: 'stagnation', confidence: 0.7 }
      ];

      const tension = sentience.analyzeInsights(insights);
      expect(tension).toBeGreaterThan(0);
      expect(tension).toBeLessThanOrEqual(1);
    });

    test('should handle empty insights', () => {
      const tension = sentience.analyzeInsights([]);
      expect(tension).toBe(0);
    });

    test('should respect analysis window', () => {
      const insights = Array(10).fill({ type: 'critical', confidence: 0.9 });
      const tension = sentience.analyzeInsights(insights);
      expect(tension).toBeLessThanOrEqual(1);
    });
  });

  describe('Intent Detection', () => {
    test('should detect critical intent', () => {
      const insights = Array(3).fill({ type: 'critical', confidence: 0.9 });
      const event = { snapshot: { insights } };
      
      const handleNewSnapshot = kernelBus.subscribe.mock.calls[0][1];
      handleNewSnapshot(event);

      expect(kernelBus.emit).toHaveBeenCalledWith(
        'prism:sentience:intentDetected',
        expect.objectContaining({
          level: 'critical'
        })
      );
    });

    test('should detect adaptive intent', () => {
      const insights = Array(3).fill({ type: 'drift', confidence: 0.8 });
      const event = { snapshot: { insights } };
      
      const handleNewSnapshot = kernelBus.subscribe.mock.calls[0][1];
      handleNewSnapshot(event);

      expect(kernelBus.emit).toHaveBeenCalledWith(
        'prism:sentience:intentDetected',
        expect.objectContaining({
          level: 'adaptive'
        })
      );
    });

    test('should not detect intent below thresholds', () => {
      const insights = Array(3).fill({ type: 'stagnation', confidence: 0.3 });
      const event = { snapshot: { insights } };
      
      const handleNewSnapshot = kernelBus.subscribe.mock.calls[0][1];
      handleNewSnapshot(event);

      expect(kernelBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('Metrics', () => {
    test('getMetrics should return valid metrics', () => {
      const metrics = sentience.getMetrics();
      expect(metrics).toHaveProperty('lastTension');
      expect(metrics).toHaveProperty('avgTension');
      expect(metrics).toHaveProperty('lastIntentAgeMs');
    });

    test('should calculate average tension correctly', () => {
      const insights = Array(3).fill({ type: 'critical', confidence: 0.9 });
      const event = { snapshot: { insights } };
      
      const handleNewSnapshot = kernelBus.subscribe.mock.calls[0][1];
      handleNewSnapshot(event);

      const metrics = sentience.getMetrics();
      expect(metrics.avgTension).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    test('should unsubscribe from events', () => {
      sentience.cleanup();
      expect(kernelBus.unsubscribe).toHaveBeenCalledWith(
        'prism:memento:snapshotGenerated',
        expect.any(Function)
      );
    });
  });
}); 