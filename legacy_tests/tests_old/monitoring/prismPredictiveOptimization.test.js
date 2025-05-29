import { jest } from '@jest/globals';
import PrismPredictiveOptimization from '../../monitoring/prismPredictiveOptimization.js';
import kernelBus from '../../core/KernelBus.js';

describe('PrismPredictiveOptimization', () => {
  let prismPredictiveOptimization;
  let mockMemento;
  let mockTimestamp;

  beforeEach(() => {
    // Mock PrismMemento
    mockMemento = {
      store: jest.fn(),
      retrieve: jest.fn()
    };
    
    // Mock Date.now()
    mockTimestamp = 1704067200000; // 2024-01-01T00:00:00.000Z
    jest.spyOn(Date, 'now').mockImplementation(() => mockTimestamp);

    // Create instance
    prismPredictiveOptimization = new PrismPredictiveOptimization();
    prismPredictiveOptimization.memento = mockMemento;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Performance Metrics Processing', () => {
    it('should process performance metrics correctly', () => {
      const metrics = {
        latency: 100,
        errorRate: 0.02,
        resourceUsage: 0.6
      };

      kernelBus.emit('prism:core:performanceMetrics', metrics);
      
      expect(prismPredictiveOptimization.performanceHistory).toHaveLength(1);
      expect(prismPredictiveOptimization.performanceHistory[0]).toEqual({
        timestamp: mockTimestamp,
        ...metrics
      });
    });

    it('should update performance history on event end', () => {
      const eventData = {
        duration: 150,
        module: 'testModule',
        success: true
      };

      kernelBus.emit('prism:core:event:end', eventData);
      
      expect(prismPredictiveOptimization.performanceHistory).toHaveLength(1);
      expect(prismPredictiveOptimization.performanceHistory[0]).toEqual({
        timestamp: mockTimestamp,
        ...eventData
      });
    });
  });

  describe('Trend Analysis', () => {
    it('should calculate latency trends correctly', () => {
      const metrics = [
        { duration: 100, timestamp: 1 },
        { duration: 120, timestamp: 2 },
        { duration: 140, timestamp: 3 }
      ];

      const trend = prismPredictiveOptimization.calculateLatencyTrend(metrics);
      
      expect(trend.increasing).toBe(true);
      expect(trend.decreasing).toBe(false);
      expect(trend.rate).toBeGreaterThan(0);
    });

    it('should calculate error rate trends correctly', () => {
      const metrics = [
        { success: true, timestamp: 1 },
        { success: false, timestamp: 2 },
        { success: false, timestamp: 3 }
      ];

      const trend = prismPredictiveOptimization.calculateErrorRateTrend(metrics);
      
      expect(trend.increasing).toBe(true);
      expect(trend.decreasing).toBe(false);
      expect(trend.rate).toBeGreaterThan(0);
    });

    it('should calculate resource usage trends correctly', () => {
      const metrics = [
        { resourceUsage: 0.5, timestamp: 1 },
        { resourceUsage: 0.6, timestamp: 2 },
        { resourceUsage: 0.7, timestamp: 3 }
      ];

      const trend = prismPredictiveOptimization.calculateResourceUsageTrend(metrics);
      
      expect(trend.increasing).toBe(true);
      expect(trend.decreasing).toBe(false);
      expect(trend.rate).toBeGreaterThan(0);
    });
  });

  describe('Preemptive Strategy', () => {
    it('should apply preemptive strategy when trends indicate degradation', () => {
      const trends = {
        latency: { increasing: true, rate: 0.15 },
        errorRate: { increasing: true, rate: 0.06 },
        resourceUsage: { increasing: true, rate: 0.12 }
      };

      const emitSpy = jest.spyOn(kernelBus, 'emit');
      
      prismPredictiveOptimization.applyPreemptiveStrategy(trends);
      
      expect(emitSpy).toHaveBeenCalledWith('prism:optimization:forecastedAdjustment', {
        timestamp: mockTimestamp,
        trends,
        action: 'preemptive'
      });
    });

    it('should not apply preemptive strategy for stable trends', () => {
      const trends = {
        latency: { increasing: false, rate: 0.05 },
        errorRate: { increasing: false, rate: 0.02 },
        resourceUsage: { increasing: false, rate: 0.05 }
      };

      const emitSpy = jest.spyOn(kernelBus, 'emit');
      
      prismPredictiveOptimization.applyPreemptiveStrategy(trends);
      
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Threshold Adjustment', () => {
    it('should adjust thresholds based on trends', async () => {
      const trends = {
        latency: { increasing: true, rate: 0.15 },
        errorRate: { increasing: true, rate: 0.06 },
        resourceUsage: { increasing: true, rate: 0.12 }
      };

      const emitSpy = jest.spyOn(kernelBus, 'emit');
      
      await prismPredictiveOptimization.adjustAdaptiveThresholds(trends);
      
      expect(emitSpy).toHaveBeenCalledWith('prism:optimization:thresholdsAdjusted', {
        timestamp: mockTimestamp,
        thresholds: expect.any(Object),
        trends
      });
    });

    it('should maintain threshold bounds', async () => {
      const trends = {
        latency: { increasing: true, rate: 0.5 },
        errorRate: { increasing: true, rate: 0.3 },
        resourceUsage: { increasing: true, rate: 0.4 }
      };

      await prismPredictiveOptimization.adjustAdaptiveThresholds(trends);
      
      expect(prismPredictiveOptimization.thresholds.latency.warning).toBeLessThanOrEqual(200);
      expect(prismPredictiveOptimization.thresholds.errorRate.warning).toBeLessThanOrEqual(0.15);
      expect(prismPredictiveOptimization.thresholds.resourceUsage.warning).toBeLessThanOrEqual(0.9);
    });
  });

  describe('Event Emission', () => {
    it('should emit forecasted adjustment events with correct data', () => {
      const trends = {
        latency: { increasing: true, rate: 0.15 },
        errorRate: { increasing: true, rate: 0.06 },
        resourceUsage: { increasing: true, rate: 0.12 }
      };

      const emitSpy = jest.spyOn(kernelBus, 'emit');
      
      prismPredictiveOptimization.applyPreemptiveStrategy(trends);
      
      expect(emitSpy).toHaveBeenCalledWith('prism:optimization:forecastedAdjustment', {
        timestamp: mockTimestamp,
        trends,
        action: 'preemptive'
      });
    });

    it('should emit threshold adjustment events with correct data', async () => {
      const trends = {
        latency: { increasing: true, rate: 0.15 },
        errorRate: { increasing: true, rate: 0.06 },
        resourceUsage: { increasing: true, rate: 0.12 }
      };

      const emitSpy = jest.spyOn(kernelBus, 'emit');
      
      await prismPredictiveOptimization.adjustAdaptiveThresholds(trends);
      
      expect(emitSpy).toHaveBeenCalledWith('prism:optimization:thresholdsAdjusted', {
        timestamp: mockTimestamp,
        thresholds: expect.any(Object),
        trends
      });
    });
  });
}); 