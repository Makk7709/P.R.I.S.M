import Benchmark from 'benchmark';
import { PrismCore } from '../../core/PrismCore.js';
import { PrismStrategy } from '../../core/PrismStrategy.js';
import { PrismSelfOptimization } from '../../core/PrismSelfOptimization.js';
import { PrismPerformanceMonitor } from '../../monitoring/PrismPerformanceMonitor.js';

// Initialize PRISM components
const performanceMonitor = new PrismPerformanceMonitor();
const prismSelfOptimization = new PrismSelfOptimization(performanceMonitor);
const prismStrategy = new PrismStrategy(prismSelfOptimization);
const prismCore = new PrismCore(prismStrategy, performanceMonitor);

// Create benchmark suite
const suite = new Benchmark.Suite('PRISM Core Performance Benchmarks');

// Add tests
suite
  .add('Process Single Request', {
    defer: true,
    fn: async (deferred) => {
      await prismCore.process('Test input');
      deferred.resolve();
    }
  })
  .add('Process Batch Requests', {
    defer: true,
    fn: async (deferred) => {
      await prismCore.processBatch([
        'Test input 1',
        'Test input 2',
        'Test input 3'
      ]);
      deferred.resolve();
    }
  })
  .add('Analyze Complex Data', {
    defer: true,
    fn: async (deferred) => {
      await prismCore.analyze({
        data: 'Complex test data',
        options: { depth: 3 }
      });
      deferred.resolve();
    }
  })
  .add('Optimize Performance', {
    defer: true,
    fn: async (deferred) => {
      await prismSelfOptimization.optimize({
        target: 'performance',
        constraints: {
          maxLatency: 100,
          maxMemory: 80
        }
      });
      deferred.resolve();
    }
  })
  .add('Predict Load', {
    defer: true,
    fn: async (deferred) => {
      await prismStrategy.predictLoad(Date.now() + 3600000);
      deferred.resolve();
    }
  })
  .add('Scale Resources', {
    defer: true,
    fn: async (deferred) => {
      await prismCore.scaleResources({
        cpu: 2,
        memory: 4096
      });
      deferred.resolve();
    }
  })
  .add('Cache Operations', {
    defer: true,
    fn: async (deferred) => {
      await prismCore.cacheOperations([
        { key: 'test1', value: 'data1' },
        { key: 'test2', value: 'data2' },
        { key: 'test3', value: 'data3' }
      ]);
      deferred.resolve();
    }
  })
  .add('Network Operations', {
    defer: true,
    fn: async (deferred) => {
      await prismCore.testNetworkOperations({
        messages: 1000,
        size: 1024
      });
      deferred.resolve();
    }
  })
  // Add listeners
  .on('cycle', (event) => {
    console.log(String(event.target));
    performanceMonitor.recordBenchmark(event.target);
  })
  .on('complete', async function() {
    console.log('Fastest test is ' + this.filter('fastest').map('name'));
    
    // Generate detailed report
    const report = await performanceMonitor.generateBenchmarkReport();
    console.log('\nDetailed Performance Report:');
    console.log(JSON.stringify(report, null, 2));
    
    // Save metrics
    await performanceMonitor.saveBenchmarkResults({
      timestamp: Date.now(),
      results: this.map((benchmark) => ({
        name: benchmark.name,
        hz: benchmark.hz,
        stats: benchmark.stats,
        times: benchmark.times
      }))
    });
  })
  .on('error', (error) => {
    console.error('Benchmark error:', error);
  });

// Run async
console.log('Starting PRISM Core Performance Benchmarks...\n');
suite.run({ async: true }); 