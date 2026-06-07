import { jest } from '@jest/globals';
import { PrismCore } from '../../prismCore.js';
import { PrismStrategy } from '../../core/PrismStrategy.js';
import { PrismSelfOptimization } from '../../core/PrismSelfOptimization.js';
import { PrismPerformanceMonitor } from '../../monitoring/PrismPerformanceMonitor.js';
import { performance } from 'node:perf_hooks';

describe('PRISM Core Scalability Tests', () => {
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

  describe('Horizontal Scaling', () => {
    it('should handle linear scaling up to 100k concurrent users', async () => {
      const concurrencyLevels = [1000, 5000, 10000, 50000, 100000];
      const metrics = [];

      for (const concurrency of concurrencyLevels) {
        const result = await prismCore.testConcurrency(concurrency);
        metrics.push(result);

        expect(result.successRate).toBeGreaterThan(0.999);
        expect(result.averageLatency).toBeLessThan(100);
        expect(result.errorRate).toBeLessThan(0.001);
      }

      // Verify linear scaling
      const latencyIncrease = metrics[metrics.length - 1].averageLatency / metrics[0].averageLatency;
      expect(latencyIncrease).toBeLessThan(2); // Less than 2x increase under 100x load
    });

    it('should maintain consistent performance during scale-out', async () => {
      const initialNodes = await prismCore.getActiveNodes();
      const scaleOutPlan = await prismStrategy.planScaleOut(5); // Scale to 5x

      const performanceMetrics = [];
      for (const step of scaleOutPlan.steps) {
        await prismCore.executeScaleStep(step);
        const metrics = await performanceMonitor.getMetrics();
        performanceMetrics.push(metrics);

        expect(metrics.availability).toBeGreaterThan(0.999);
        expect(metrics.latency.p95).toBeLessThan(75);
      }

      const finalNodes = await prismCore.getActiveNodes();
      expect(finalNodes.length).toBe(initialNodes.length * 5);
    });
  });

  describe('Vertical Scaling', () => {
    it('should optimize resource utilization under load', async () => {
      const loadProfile = {
        duration: 300, // 5 minutes
        rampUp: 60,   // 1 minute
        peak: 100000, // 100k concurrent users
        rampDown: 60  // 1 minute
      };

      const metrics = await prismCore.runLoadTest(loadProfile);
      
      expect(metrics.cpu.average).toBeLessThan(80);
      expect(metrics.memory.average).toBeLessThan(80);
      expect(metrics.resourceEfficiency).toBeGreaterThan(0.8);
    });

    it('should handle burst traffic efficiently', async () => {
      const burstProfile = {
        baseline: 1000,
        burstSize: 50000,
        burstDuration: 10 // 10 seconds
      };

      const metrics = await prismCore.handleBurst(burstProfile);
      
      expect(metrics.maxLatency).toBeLessThan(200);
      expect(metrics.errorRate).toBeLessThan(0.001);
      expect(metrics.recoveryTime).toBeLessThan(2000); // 2 seconds recovery
    });
  });

  describe('Data Scalability', () => {
    it('should maintain performance with growing dataset', async () => {
      const dataGrowthSteps = [1, 10, 100, 1000]; // GB
      const queryLatencies = [];

      for (const dataSize of dataGrowthSteps) {
        await prismCore.scaleDataTo(dataSize);
        const latency = await prismCore.measureQueryLatency();
        queryLatencies.push(latency);

        expect(latency).toBeLessThan(100);
      }

      // Verify sub-linear query time growth
      const latencyIncrease = queryLatencies[queryLatencies.length - 1] / queryLatencies[0];
      expect(latencyIncrease).toBeLessThan(10); // Less than 10x increase for 1000x data
    });

    it('should optimize data distribution automatically', async () => {
      const distribution = await prismSelfOptimization.analyzeDataDistribution();
      const optimizationPlan = await prismStrategy.optimizeDataDistribution(distribution);

      expect(optimizationPlan.balancingScore).toBeGreaterThan(0.9);
      expect(optimizationPlan.dataLocality).toBeGreaterThan(0.8);
    });
  });

  describe('Network Scalability', () => {
    it('should handle high throughput with minimal latency', async () => {
      const throughputTest = {
        duration: 60,
        targetThroughput: 100000 // 100k messages per second
      };

      const metrics = await prismCore.testNetworkThroughput(throughputTest);
      
      expect(metrics.achievedThroughput).toBeGreaterThanOrEqual(throughputTest.targetThroughput);
      expect(metrics.averageLatency).toBeLessThan(50);
      expect(metrics.packetLoss).toBeLessThan(0.0001);
    });

    it('should optimize network topology dynamically', async () => {
      const topology = await prismCore.getCurrentTopology();
      const optimization = await prismStrategy.optimizeNetworkTopology(topology);

      expect(optimization.efficiency).toBeGreaterThan(0.9);
      expect(optimization.redundancy).toBeGreaterThan(0.99);
    });
  });

  describe('Memory Management', () => {
    it('should maintain stable memory usage under load', async () => {
      const memoryProfile = await prismCore.monitorMemoryUnderLoad({
        duration: 300,
        load: 50000
      });

      expect(memoryProfile.leak).toBe(false);
      expect(memoryProfile.fragmentation).toBeLessThan(0.1);
      expect(memoryProfile.gcPauses).toBeLessThan(100); // Less than 100ms
    });

    it('should optimize memory allocation patterns', async () => {
      const memoryMetrics = await prismSelfOptimization.analyzeMemoryPatterns();
      
      expect(memoryMetrics.efficiency).toBeGreaterThan(0.9);
      expect(memoryMetrics.predictability).toBeGreaterThan(0.8);
    });
  });
}); 