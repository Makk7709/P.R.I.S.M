/**
 * @fileoverview Tests unitaires pour PrismStrategicLayer
 * @module tests/regulation/prismStrategicLayer
 */

import { PrismStrategicLayer } from '../../regulation/prismStrategicLayer.js';
import { prismBus } from '../../prismBus.js';

describe('PrismStrategicLayer', () => {
  let strategicLayer;
  let mockPrismBus;

  beforeEach(() => {
    mockPrismBus = {
      emit: jest.fn(),
      subscribe: jest.fn()
    };
    strategicLayer = new PrismStrategicLayer();
  });

  describe('analyzeRisks', () => {
    it('should analyze global and specific risks correctly', async () => {
      const prediction = {
        systemState: {
          stability: 0.7,
          performance: 0.8,
          memoryUsage: 0.6
        },
        moduleStates: {
          core: { health: 0.9 },
          memory: { health: 0.7 },
          regulation: { health: 0.8 }
        }
      };

      const context = {
        timestamp: Date.now(),
        source: 'prism:codex:systemPrediction'
      };

      const result = await strategicLayer.analyzeRisks(prediction, context);

      expect(result).toHaveProperty('globalRisks');
      expect(result).toHaveProperty('specificRisks');
      expect(result).toHaveProperty('severityScore');
      expect(result.severityScore).toBeGreaterThanOrEqual(0);
      expect(result.severityScore).toBeLessThanOrEqual(1);
    });

    it('should validate predictions and detect inconsistencies', async () => {
      const prediction = {
        systemState: {
          stability: 1.2, // Invalid value > 1
          performance: 0.8,
          memoryUsage: 0.6
        },
        moduleStates: {
          core: { health: 0.9 },
          memory: { health: 0.7 }
        }
      };

      const context = {
        timestamp: Date.now(),
        source: 'prism:codex:systemPrediction'
      };

      const result = await strategicLayer.analyzeRisks(prediction, context);

      expect(result.globalRisks).toContainEqual(
        expect.objectContaining({
          type: 'validation',
          description: expect.stringContaining('inconsistency')
        })
      );
    });

    it('should emit prism:strategy:risksAnalyzed event', async () => {
      const prediction = {
        systemState: {
          stability: 0.7,
          performance: 0.8,
          memoryUsage: 0.6
        },
        moduleStates: {
          core: { health: 0.9 },
          memory: { health: 0.7 }
        }
      };

      const context = {
        timestamp: Date.now(),
        source: 'prism:codex:systemPrediction'
      };

      await strategicLayer.analyzeRisks(prediction, context);

      expect(prismBus.emit).toHaveBeenCalledWith(
        'prism:strategy:risksAnalyzed',
        expect.objectContaining({
          risks: expect.any(Object),
          severity: expect.any(Number),
          modules: expect.any(Object),
          predictions: expect.any(Object)
        })
      );
    });

    it('should complete analysis within 300ms', async () => {
      const prediction = {
        systemState: {
          stability: 0.7,
          performance: 0.8,
          memoryUsage: 0.6
        },
        moduleStates: {
          core: { health: 0.9 },
          memory: { health: 0.7 }
        }
      };

      const context = {
        timestamp: Date.now(),
        source: 'prism:codex:systemPrediction'
      };

      const startTime = performance.now();
      await strategicLayer.analyzeRisks(prediction, context);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(300);
    });
  });
}); 