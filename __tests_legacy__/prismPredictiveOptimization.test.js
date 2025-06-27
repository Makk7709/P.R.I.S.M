import { jest } from '@jest/globals';
import PrismPredictiveOptimization from '../monitoring/prismPredictiveOptimization.js';
import kernelBus from '../core/KernelBus.js';

// Mock the event bus
jest.mock('../core/KernelBus.js', () => ({
  __esModule: true,
  default: {
    on: jest.fn(),
    emit: jest.fn()
  }
}));

describe('PrismPredictiveOptimization', () => {
  let predictiveOptimization;
  let mockMetrics;

  beforeEach(() => {
    predictiveOptimization = new PrismPredictiveOptimization();
    mockMetrics = {
      latency: 100,
      errorRate: 0.02,
      resourceUsage: 0.5
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default thresholds', () => {
      expect(predictiveOptimization.thresholds).toEqual({
        latency: {
          warning: 150,
          critical: 200
        },
        errorRate: {
          warning: 0.05,
          critical: 0.10
        },
        resourceUsage: {
          warning: 0.70,
          critical: 0.85
        }
      });
    });

    test('should set up event listeners', () => {
      expect(kernelBus.on).toHaveBeenCalledWith(
        'prism:core:performanceMetrics',
        expect.any(Function)
      );
      expect(kernelBus.on).toHaveBeenCalledWith(
        'prism:core:event:end',
        expect.any(Function)
      );
    });
  });

  describe('Performance Metrics Processing', () => {
    test('should process performance metrics and update history', async () => {
      await predictiveOptimization.processPerformanceMetrics(mockMetrics);
      expect(predictiveOptimization.performanceHistory.length).toBe(1);
      expect(predictiveOptimization.performanceHistory[0]).toMatchObject({
        timestamp: expect.any(Number),
        ...mockMetrics
      });
    });

    test('should limit history size to 1000 entries', async () => {
      for (let i = 0; i < 1001; i++) {
        await predictiveOptimization.processPerformanceMetrics(mockMetrics);
      }
      expect(predictiveOptimization.performanceHistory.length).toBe(1000);
    });
  });

  describe('Trend Analysis', () => {
    test('should calculate latency trend correctly', () => {
      const metrics = [
        { duration: 100 },
        { duration: 110 },
        { duration: 120 }
      ];
      const trend = predictiveOptimization.calculateLatencyTrend(metrics);
      expect(trend).toMatchObject({
        increasing: true,
        decreasing: false,
        rate: expect.any(Number)
      });
    });

    test('should calculate error rate trend correctly', () => {
      const metrics = [
        { success: true },
        { success: false },
        { success: false }
      ];
      const trend = predictiveOptimization.calculateErrorRateTrend(metrics);
      expect(trend).toMatchObject({
        increasing: true,
        decreasing: false,
        rate: expect.any(Number)
      });
    });
  });

  describe('Threshold Adjustment', () => {
    test('should adjust thresholds based on increasing trends', async () => {
      const trends = {
        latency: { increasing: true, rate: 0.2 },
        errorRate: { increasing: true, rate: 0.1 },
        resourceUsage: { increasing: true, rate: 0.15 }
      };

      const originalThresholds = { ...predictiveOptimization.thresholds };
      await predictiveOptimization.adjustAdaptiveThresholds(trends);

      expect(predictiveOptimization.thresholds.latency.warning).toBeLessThan(originalThresholds.latency.warning);
      expect(predictiveOptimization.thresholds.latency.critical).toBeLessThan(originalThresholds.latency.critical);
      expect(predictiveOptimization.thresholds.errorRate.warning).toBeLessThan(originalThresholds.errorRate.warning);
      expect(predictiveOptimization.thresholds.errorRate.critical).toBeLessThan(originalThresholds.errorRate.critical);
    });

    test('should emit threshold adjustment event', async () => {
      const trends = {
        latency: { increasing: true, rate: 0.2 },
        errorRate: { increasing: true, rate: 0.1 },
        resourceUsage: { increasing: true, rate: 0.15 }
      };

      await predictiveOptimization.adjustAdaptiveThresholds(trends);

      expect(kernelBus.emit).toHaveBeenCalledWith(
        'prism:optimization:thresholdsAdjusted',
        expect.objectContaining({
          timestamp: expect.any(Number),
          thresholds: expect.any(Object)
        })
      );
    });
  });

  describe('Preemptive Strategy', () => {
    test('should apply preemptive strategy when trends indicate potential issues', async () => {
      const trends = {
        latency: { increasing: true, rate: 0.2 },
        errorRate: { increasing: true, rate: 0.1 },
        resourceUsage: { increasing: true, rate: 0.15 }
      };

      await predictiveOptimization.applyPreemptiveStrategy(trends);

      expect(kernelBus.emit).toHaveBeenCalledWith(
        'prism:optimization:forecastedAdjustment',
        expect.objectContaining({
          timestamp: expect.any(Number),
          trends: expect.any(Object),
          action: 'preemptive'
        })
      );
    });

    test('should not apply preemptive strategy when trends are stable', async () => {
      const trends = {
        latency: { increasing: false, rate: 0.05 },
        errorRate: { increasing: false, rate: 0.02 },
        resourceUsage: { increasing: false, rate: 0.05 }
      };

      await predictiveOptimization.applyPreemptiveStrategy(trends);

      expect(kernelBus.emit).not.toHaveBeenCalledWith(
        'prism:optimization:forecastedAdjustment',
        expect.any(Object)
      );
    });
  });
}); 