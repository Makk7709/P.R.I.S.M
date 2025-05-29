import { jest } from '@jest/globals';
import PrismRegulation from '../../monitoring/prismRegulation.js';
import kernelBus from '../../core/KernelBus.js';

jest.mock('@core/KernelBus.js', () => ({
  emit: jest.fn()
}));

describe('PrismRegulation', () => {
  let regulation;

  beforeEach(() => {
    regulation = new PrismRegulation();
    jest.clearAllMocks();
  });

  describe('observeSystem', () => {
    it('should detect prolonged drift', () => {
      const emotionHistory = Array(10).fill({ instability: 0.8 });
      const adaptationHistory = [];

      const result = regulation.observeSystem(emotionHistory, adaptationHistory);

      expect(result.anomalies).toContainEqual(expect.objectContaining({
        type: 'prolonged_drift',
        severity: 'high'
      }));
    });

    it('should detect emotional blockage', () => {
      const emotionHistory = Array(5).fill({ intensity: 0.9 });
      const adaptationHistory = [];

      const result = regulation.observeSystem(emotionHistory, adaptationHistory);

      expect(result.anomalies).toContainEqual(expect.objectContaining({
        type: 'emotional_blockage',
        severity: 'medium'
      }));
    });

    it('should detect adaptation inefficiency', () => {
      const emotionHistory = [];
      const adaptationHistory = Array(3).fill({ effectiveness: 0.2 });

      const result = regulation.observeSystem(emotionHistory, adaptationHistory);

      expect(result.anomalies).toContainEqual(expect.objectContaining({
        type: 'adaptation_inefficiency',
        severity: 'medium'
      }));
    });
  });

  describe('triggerCorrectiveAction', () => {
    it('should emit reset_memory action for prolonged drift', () => {
      const anomalies = [{
        type: 'prolonged_drift',
        severity: 'high',
        description: 'État émotionnel instable prolongé'
      }];

      regulation.triggerCorrectiveAction(anomalies);

      expect(kernelBus.emit).toHaveBeenCalledWith(
        'prism:regulation:correctiveAction',
        expect.objectContaining({
          action: 'reset_memory',
          anomalies: expect.any(Array)
        })
      );
    });

    it('should emit force_calm action for emotional blockage', () => {
      const anomalies = [{
        type: 'emotional_blockage',
        severity: 'medium',
        description: 'Blocage émotionnel détecté'
      }];

      regulation.triggerCorrectiveAction(anomalies);

      expect(kernelBus.emit).toHaveBeenCalledWith(
        'prism:regulation:correctiveAction',
        expect.objectContaining({
          action: 'force_calm',
          anomalies: expect.any(Array)
        })
      );
    });

    it('should emit increase_sensitivity action for adaptation inefficiency', () => {
      const anomalies = [{
        type: 'adaptation_inefficiency',
        severity: 'medium',
        description: 'Stratégies adaptatives inefficaces'
      }];

      regulation.triggerCorrectiveAction(anomalies);

      expect(kernelBus.emit).toHaveBeenCalledWith(
        'prism:regulation:correctiveAction',
        expect.objectContaining({
          action: 'increase_sensitivity',
          anomalies: expect.any(Array)
        })
      );
    });
  });

  describe('calculateSystemStability', () => {
    it('should return 1 for empty history', () => {
      const result = regulation.observeSystem([], []);
      expect(result.systemStability).toBe(1);
    });

    it('should calculate correct stability score', () => {
      const emotionHistory = [
        { instability: 0.2 },
        { instability: 0.3 },
        { instability: 0.4 },
        { instability: 0.5 },
        { instability: 0.6 }
      ];

      const result = regulation.observeSystem(emotionHistory, []);
      expect(result.systemStability).toBeCloseTo(0.6, 1);
    });
  });
}); 