import { jest } from '@jest/globals';
import { PrismCore } from '../../prismCore.js';
import { PrismStrategy } from '../../core/PrismStrategy.js';
import { PrismSelfOptimization } from '../../core/PrismSelfOptimization.js';
import { PrismPerformanceMonitor } from '../../monitoring/PrismPerformanceMonitor.js';
import { performance } from 'node:perf_hooks';

describe('PRISM Core Predictive Optimization Tests', () => {
  let prismCore;
  let prismStrategy;
  let prismSelfOptimization;
  let performanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PrismPerformanceMonitor();
    prismSelfOptimization = new PrismSelfOptimization(performanceMonitor);
    prismStrategy = new PrismStrategy(prismSelfOptimization);
    prismCore = new PrismCore(prismStrategy, performanceMonitor);
  });

  describe('Predictive Load Balancing', () => {
    it('should predict and handle increasing load', async () => {
      const initialLoad = 1000;
      const peakLoad = 100000;
      const duration = 60; // seconds
      
      const loadProfile = [];
      const responseTimesMs = [];
      
      for (let second = 0; second < duration; second++) {
        const currentLoad = initialLoad + (peakLoad - initialLoad) * (second / duration);
        loadProfile.push(currentLoad);
        
        const startTime = performance.now();
        await prismCore.handleLoad(currentLoad);
        const endTime = performance.now();
        
        responseTimesMs.push(endTime - startTime);
      }
      
      const averageResponseTime = responseTimesMs.reduce((a, b) => a + b) / responseTimesMs.length;
      expect(averageResponseTime).toBeLessThan(100); // Less than 100ms average
    });

    it('should optimize resource allocation predictively', async () => {
      const metrics = await prismSelfOptimization.getPredictiveMetrics();
      
      expect(metrics.resourceUtilization).toBeLessThan(80); // Less than 80% utilization
      expect(metrics.predictionAccuracy).toBeGreaterThan(90); // Greater than 90% accuracy
    });
  });

  describe('Auto-scaling Capabilities', () => {
    it('should scale resources based on predicted load', async () => {
      const futureLoad = await prismStrategy.predictLoad(Date.now() + 3600000); // 1 hour ahead
      const scalingPlan = await prismSelfOptimization.createScalingPlan(futureLoad);
      
      expect(scalingPlan.resources).toBeGreaterThan(0);
      expect(scalingPlan.confidence).toBeGreaterThan(0.8);
    });

    it('should maintain performance under varying load', async () => {
      const loadPatterns = [
        { users: 1000, duration: 10 },
        { users: 5000, duration: 10 },
        { users: 10000, duration: 10 },
        { users: 50000, duration: 10 },
        { users: 100000, duration: 10 }
      ];

      for (const pattern of loadPatterns) {
        const metrics = await prismCore.handleLoadPattern(pattern);
        
        expect(metrics.responseTime).toBeLessThan(100);
        expect(metrics.errorRate).toBeLessThan(0.001);
        expect(metrics.resourceUtilization).toBeLessThan(90);
      }
    });
  });

  describe('Predictive Caching', () => {
    it('should predict and pre-cache frequently accessed data', async () => {
      const accessPatterns = await prismStrategy.analyzeAccessPatterns();
      const cachePlan = await prismSelfOptimization.optimizeCache(accessPatterns);
      
      expect(cachePlan.hitRate).toBeGreaterThan(0.9);
      expect(cachePlan.efficiency).toBeGreaterThan(0.8);
    });

    it('should adapt cache size based on usage patterns', async () => {
      const initialSize = await prismSelfOptimization.getCacheSize();
      await prismCore.simulateHighLoad();
      const adaptedSize = await prismSelfOptimization.getCacheSize();
      
      expect(adaptedSize).toBeGreaterThan(initialSize);
    });
  });

  describe('Performance Monitoring', () => {
    it('should collect and analyze performance metrics', async () => {
      const metrics = await performanceMonitor.collectMetrics();
      
      expect(metrics).toHaveProperty('latency');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('resourceUtilization');
      
      expect(metrics.latency.p95).toBeLessThan(75);
      expect(metrics.throughput).toBeGreaterThan(10000);
      expect(metrics.errorRate).toBeLessThan(0.001);
      expect(metrics.resourceUtilization).toBeLessThan(80);
    });

    it('should generate predictive alerts', async () => {
      const alerts = await performanceMonitor.getPredictiveAlerts();
      
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.every(alert => alert.confidence > 0.8)).toBe(true);
    });
  });
}); 