import { jest } from '@jest/globals';
import PrismSelfOptimization from '../../monitoring/prismSelfOptimization.js';
import kernelBus from '../../core/KernelBus.js';

describe('PrismSelfOptimization', () => {
  let prismSelfOptimization;
  let mockStorage;

  beforeEach(() => {
    // Mock PrismStorage
    mockStorage = {
      writeSafe: jest.fn(),
      readSafe: jest.fn()
    };
    jest.spyOn(global, 'Date').mockImplementation(() => ({
      now: () => 1234567890
    }));

    // Create instance
    prismSelfOptimization = new PrismSelfOptimization();
    prismSelfOptimization.storage = mockStorage;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Handling', () => {
    it('should handle emotional stability events', () => {
      const data = { stability: 0.8 };
      kernelBus.emit('prism:emotion:stability', data);
      
      expect(prismSelfOptimization.performanceMetrics.emotionalStability).toHaveLength(1);
      expect(prismSelfOptimization.performanceMetrics.emotionalStability[0]).toEqual({
        value: 0.8,
        timestamp: 1234567890
      });
    });

    it('should handle adaptive efficiency events', () => {
      const data = { efficiency: 0.7 };
      kernelBus.emit('prism:adaptation:efficiency', data);
      
      expect(prismSelfOptimization.performanceMetrics.adaptiveEfficiency).toHaveLength(1);
      expect(prismSelfOptimization.performanceMetrics.adaptiveEfficiency[0]).toEqual({
        value: 0.7,
        timestamp: 1234567890
      });
    });

    it('should handle strategic efficiency events', () => {
      const data = { efficiency: 0.9 };
      kernelBus.emit('prism:strategy:efficiency', data);
      
      expect(prismSelfOptimization.performanceMetrics.strategicEfficiency).toHaveLength(1);
      expect(prismSelfOptimization.performanceMetrics.strategicEfficiency[0]).toEqual({
        value: 0.9,
        timestamp: 1234567890
      });
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze metric trends correctly', () => {
      const metricData = [
        { value: 0.5, timestamp: 1 },
        { value: 0.6, timestamp: 2 },
        { value: 0.7, timestamp: 3 }
      ];

      const analysis = prismSelfOptimization.analyzeMetricTrend(metricData);
      
      expect(analysis.trend).toBe('improving');
      expect(analysis.currentValue).toBe(0.7);
      expect(analysis.averageValue).toBeCloseTo(0.6);
      expect(analysis.volatility).toBeGreaterThan(0);
    });

    it('should return insufficient_data for short metric history', () => {
      const metricData = [{ value: 0.5, timestamp: 1 }];
      const analysis = prismSelfOptimization.analyzeMetricTrend(metricData);
      
      expect(analysis.trend).toBe('insufficient_data');
    });
  });

  describe('Optimization Detection', () => {
    it('should detect optimization opportunities for degrading metrics', () => {
      const analysis = {
        emotionalStability: { trend: 'degrading', volatility: 0.2 },
        adaptiveEfficiency: { trend: 'stable', currentValue: 0.8 },
        strategicEfficiency: { trend: 'degrading', volatility: 0.3 }
      };

      const opportunities = prismSelfOptimization.detectOptimizationOpportunities(analysis);
      
      expect(opportunities).toHaveLength(2);
      expect(opportunities[0].type).toBe('emotional_threshold');
      expect(opportunities[1].type).toBe('strategy_reset_cycle');
    });

    it('should not detect opportunities for stable or improving metrics', () => {
      const analysis = {
        emotionalStability: { trend: 'stable', volatility: 0.1 },
        adaptiveEfficiency: { trend: 'improving', currentValue: 0.9 },
        strategicEfficiency: { trend: 'stable', volatility: 0.1 }
      };

      const opportunities = prismSelfOptimization.detectOptimizationOpportunities(analysis);
      
      expect(opportunities).toHaveLength(0);
    });
  });

  describe('Self-Optimization', () => {
    it('should apply optimizations and emit events', () => {
      const opportunities = [
        {
          type: 'emotional_threshold',
          parameter: 'stability_threshold',
          adjustment: 0.2
        }
      ];

      const emitSpy = jest.spyOn(kernelBus, 'emit');
      
      prismSelfOptimization.applySelfOptimizations(opportunities);
      
      expect(emitSpy).toHaveBeenCalledWith('prism:selfOptimization:parametersAdjusted', {
        adjustments: [{
          type: 'emotional_threshold',
          parameter: 'stability_threshold',
          value: 0.2,
          timestamp: 1234567890
        }],
        timestamp: 1234567890
      });

      expect(mockStorage.writeSafe).toHaveBeenCalledWith(
        'prism_optimization_history',
        expect.any(Array)
      );
    });
  });
}); 