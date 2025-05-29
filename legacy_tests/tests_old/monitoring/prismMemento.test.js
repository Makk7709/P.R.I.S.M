/**
 * @fileoverview Tests unitaires et d'intégration pour PrismMemento
 * @module tests/monitoring/prismMemento
 */

import { jest } from '@jest/globals';
import { PrismMemento } from '../../dist/monitoring/prismMemento.js';
import kernelBus from '../../core/KernelBus.js';

// Mock kernelBus
jest.mock('@core/KernelBus.js', () => ({
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  emit: jest.fn()
}));

describe('PrismMemento', () => {
  let memento;
  const mockOptions = {
    maxInsights: 5,
    snapshotInterval: 1000,
    confidenceThreshold: 0.7,
    maxPersistedSnapshots: 3,
    volatilityWindow: 3,
    anomalyDetectionThreshold: 0.85
  };

  beforeEach(() => {
    jest.clearAllMocks();
    memento = new PrismMemento(mockOptions);
  });

  afterEach(() => {
    memento.cleanup();
  });

  describe('Unit Tests', () => {
    test('addInsight should add valid insight and respect maxInsights limit', () => {
      const validInsight = { confidence: 0.8, type: 'improvement' };
      memento.addInsight(validInsight);
      expect(memento.insights).toHaveLength(1);
      expect(memento.insights[0]).toEqual(validInsight);

      // Test maxInsights limit
      for (let i = 0; i < 10; i++) {
        memento.addInsight({ confidence: 0.8, type: 'improvement' });
      }
      expect(memento.insights).toHaveLength(mockOptions.maxInsights);
    });

    test('generateSnapshot should create valid snapshot structure', () => {
      const snapshot = memento.generateSnapshot();
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('summary');
      expect(snapshot).toHaveProperty('insights');
      expect(snapshot).toHaveProperty('volatility');
    });

    test('adjustParameters should adjust thresholds based on volatility', () => {
      const initialConfidence = memento.confidenceThreshold;
      const initialInterval = memento.snapshotInterval;

      // Simulate high volatility
      memento.volatilityHistory = [0.1, 0.9, 0.1, 0.9];
      memento.adjustParameters();

      expect(memento.confidenceThreshold).not.toBe(initialConfidence);
      expect(memento.snapshotInterval).not.toBe(initialInterval);
    });

    test('detectAnomaly should identify unusual confidence values', () => {
      // Add normal insights
      memento.addInsight({ confidence: 0.8, type: 'improvement' });
      memento.addInsight({ confidence: 0.75, type: 'improvement' });
      memento.addInsight({ confidence: 0.82, type: 'improvement' });

      // Test anomaly detection
      const normalInsight = { confidence: 0.79, type: 'improvement' };
      const anomalousInsight = { confidence: 0.2, type: 'improvement' };

      expect(memento.detectAnomaly(normalInsight)).toBe(false);
      expect(memento.detectAnomaly(anomalousInsight)).toBe(true);
    });

    test('cleanup should clear timer and unsubscribe from events', () => {
      memento.cleanup();
      expect(kernelBus.unsubscribe).toHaveBeenCalledWith(
        'prism:reflection:insightGenerated',
        expect.any(Function)
      );
    });
  });

  describe('Integration Tests', () => {
    test('should handle new insight events correctly', () => {
      const validInsight = { confidence: 0.8, type: 'improvement' };
      const event = { analysis: validInsight };

      // Simulate event
      const handleNewInsight = kernelBus.subscribe.mock.calls[0][1];
      handleNewInsight(event);

      expect(memento.insights).toHaveLength(1);
      expect(memento.insights[0]).toEqual(validInsight);
    });

    test('should emit snapshot events', () => {
      memento.generateSnapshot();
      expect(kernelBus.emit).toHaveBeenCalledWith(
        'prism:memento:snapshotGenerated',
        expect.any(Object)
      );
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid insight format', () => {
      const invalidInsights = [
        { confidence: '0.8', type: 'improvement' }, // wrong type
        { confidence: 0.8 }, // missing type
        { type: 'improvement' }, // missing confidence
        { confidence: 1.5, type: 'improvement' }, // invalid confidence
        { confidence: 0.8, type: 'invalid' } // invalid type
      ];

      invalidInsights.forEach(insight => {
        const event = { analysis: insight };
        const handleNewInsight = kernelBus.subscribe.mock.calls[0][1];
        handleNewInsight(event);
        expect(memento.insights).toHaveLength(0);
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should respect rate limit for insights', () => {
      const validInsight = { confidence: 0.8, type: 'improvement' };
      
      // Try to add 15 insights rapidly
      for (let i = 0; i < 15; i++) {
        memento.handleNewInsight({ analysis: validInsight });
      }

      // Should only process 10 insights per minute
      expect(memento.insights.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Metrics', () => {
    test('getMetrics should return valid metrics', () => {
      const metrics = memento.getMetrics();
      expect(metrics).toHaveProperty('totalInsights');
      expect(metrics).toHaveProperty('avgVolatility');
      expect(metrics).toHaveProperty('lastSnapshotAgeMs');
    });
  });
}); 