import { jest, expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import prismAdaptation from '../../monitoring/prismAdaptation.js';

// Mock KernelBus
jest.mock('../../core/kernelBus.js', () => ({
  KernelBus: jest.fn().mockImplementation(() => ({
    publish: jest.fn()
  }))
}));

describe('PrismAdaptation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeEmotionTrends', () => {
    it('should return stable pattern for empty history', () => {
      const result = prismAdaptation.analyzeEmotionTrends([]);
      expect(result.score).toBe(0);
      expect(result.pattern).toBe('stable');
    });

    it('should detect stabilization pattern', () => {
      const history = [
        { intensity: 0.3 },
        { intensity: 0.4 },
        { intensity: 0.35 },
        { intensity: 0.38 }
      ];
      const result = prismAdaptation.analyzeEmotionTrends(history);
      expect(result.score).toBeLessThan(0.3);
      expect(result.pattern).toBe('stabilization');
    });

    it('should detect escalation pattern', () => {
      const history = [
        { intensity: 0.3 },
        { intensity: 0.6 },
        { intensity: 0.8 },
        { intensity: 0.9 },
        { intensity: 1.0 }
      ];
      const result = prismAdaptation.analyzeEmotionTrends(history);
      expect(result.score).toBeGreaterThan(0.3);
      expect(result.pattern).toBe('escalation');
    });

    it('should detect drift pattern', () => {
      const history = [
        { intensity: 0.3 },
        { intensity: 0.45 },
        { intensity: 0.35 },
        { intensity: 0.5 },
        { intensity: 0.4 }
      ];
      const result = prismAdaptation.analyzeEmotionTrends(history);
      expect(result.score).toBeGreaterThan(0.2);
      expect(result.score).toBeLessThan(0.7);
      expect(result.pattern).toBe('drift');
    });
  });

  describe('adjustAdaptationParameters', () => {
    it('should return stable parameters for low score', () => {
      const parameters = prismAdaptation.adjustAdaptationParameters(0.2);
      expect(parameters.sensitivityMultiplier).toBe(0.8);
      expect(parameters.responseThreshold).toBe(0.6);
      expect(parameters.recoveryRate).toBe(1.2);
    });

    it('should return adaptive parameters for medium score', () => {
      const parameters = prismAdaptation.adjustAdaptationParameters(0.5);
      expect(parameters.sensitivityMultiplier).toBe(1.0);
      expect(parameters.responseThreshold).toBe(0.5);
      expect(parameters.recoveryRate).toBe(1.0);
    });

    it('should return critical parameters for high score', () => {
      const parameters = prismAdaptation.adjustAdaptationParameters(0.8);
      expect(parameters.sensitivityMultiplier).toBe(1.5);
      expect(parameters.responseThreshold).toBe(0.3);
      expect(parameters.recoveryRate).toBe(0.8);
    });
  });

  describe('Performance Tests', () => {
    it('should handle 1000 transitions within 1 second', () => {
      const startTime = performance.now();
      
      // Generate 1000 diverse transitions
      const transitions = Array.from({ length: 1000 }, (_, i) => ({
        intensity: Math.random(),
        timestamp: Date.now() + i
      }));
      
      // Process all transitions
      transitions.forEach(transition => {
        prismAdaptation.analyzeEmotionTrends([transition]);
      });
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain stable memory usage under load', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate and process 1000 transitions
      const transitions = Array.from({ length: 1000 }, (_, i) => ({
        intensity: Math.random(),
        timestamp: Date.now() + i
      }));
      
      transitions.forEach(transition => {
        prismAdaptation.analyzeEmotionTrends([transition]);
      });
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be less than 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
}); 