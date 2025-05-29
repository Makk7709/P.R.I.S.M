import { PrismProfiler } from '../perf/prismProfiler.js';
import PrismStrategicLayer from '../regulation/prismStrategicLayer.js';
import { PrismAdaptiveCycler } from '../regulation/prismAdaptiveCycler.js';
import { PrismCodexAnalyzer } from '../memory/prismCodexAnalyzer.js';

describe('PrismProfiler Performance Benchmarks', () => {
  let profiler;
  let strategicLayer;
  let adaptiveCycler;
  let codexAnalyzer;

  beforeEach(() => {
    profiler = new PrismProfiler();
    strategicLayer = new PrismStrategicLayer();
    adaptiveCycler = new PrismAdaptiveCycler();
    codexAnalyzer = new PrismCodexAnalyzer();
    process.env.PRISM_DEBUG_PERF = 'true';
  });

  afterEach(() => {
    process.env.PRISM_DEBUG_PERF = 'false';
    profiler.clear();
  });

  test('strategic layer operations should complete within budget', async () => {
    const risks = [
      { type: 'performance', severity: 0.8 },
      { type: 'security', severity: 0.9 },
      { type: 'stability', severity: 0.7 }
    ];

    // Test generateCompositeDirectives
    const startTime = performance.now();
    await strategicLayer.generateCompositeDirectives(risks);
    const totalTime = performance.now() - startTime;
    
    // Check total generation time
    expect(totalTime).toBeLessThan(150); // 150ms budget

    // Check individual segment times
    const generateTime = profiler.getMeasurement('strategic:generate');
    const selectTopRisksTime = profiler.getMeasurement('strategic:selectTopRisks');
    const generateDirectivesTime = profiler.getMeasurement('strategic:generateDirectives');
    const resolveConflictsTime = profiler.getMeasurement('strategic:resolveConflicts');

    expect(generateTime).toBeLessThan(150); // 150ms budget
    expect(selectTopRisksTime).toBeLessThan(50); // 50ms budget
    expect(generateDirectivesTime).toBeLessThan(50); // 50ms budget
    expect(resolveConflictsTime).toBeLessThan(50); // 50ms budget
  });

  test('adaptive cycler update should complete within budget', async () => {
    const startTime = performance.now();
    await adaptiveCycler.adjustCycles();
    const totalTime = performance.now() - startTime;
    
    expect(totalTime).toBeLessThan(50); // 50ms budget
    
    const cyclerUpdateTime = profiler.getMeasurement('cycler:update');
    expect(cyclerUpdateTime).toBeLessThan(50); // 50ms budget
  });

  test('codex pattern detection should complete within budget', async () => {
    // Simuler des événements pour l'analyse
    const events = Array.from({ length: 20 }, (_, i) => ({
      type: i % 3 === 0 ? 'drift' : i % 3 === 1 ? 'improvement' : 'anomaly',
      timestamp: Date.now() - i * 1000
    }));
    
    codexAnalyzer.eventBuffer = events;
    
    const startTime = performance.now();
    await codexAnalyzer._detectEmergentPatterns();
    const totalTime = performance.now() - startTime;
    
    expect(totalTime).toBeLessThan(50); // 50ms budget
    
    const patternDetectionTime = profiler.getMeasurement('codex:patterns');
    expect(patternDetectionTime).toBeLessThan(50); // 50ms budget
  });

  test('should complete 100,000 directive outcomes in under 500ms', () => {
    const startTime = performance.now();
    
    for (let i = 0; i < 100000; i++) {
      profiler.start('directiveOutcome');
      // Simulate directive processing
      const result = { id: i, status: 'processed' };
      profiler.end('directiveOutcome');
    }

    const totalTime = performance.now() - startTime;
    expect(totalTime).toBeLessThan(500);
  });

  test('should complete 10,000 cycle tunes in under 300ms', () => {
    const startTime = performance.now();
    
    for (let i = 0; i < 10000; i++) {
      profiler.start('cycleTune');
      // Simulate cycle tuning
      const result = { cycle: i, tuned: true };
      profiler.end('cycleTune');
    }

    const totalTime = performance.now() - startTime;
    expect(totalTime).toBeLessThan(300);
  });

  test('profiling overhead should be less than 3%', () => {
    const iterations = 10000;
    let totalTimeWithProfiling = 0;
    let totalTimeWithoutProfiling = 0;

    // Measure with profiling
    process.env.PRISM_DEBUG_PERF = 'true';
    const startWithProfiling = performance.now();
    for (let i = 0; i < iterations; i++) {
      profiler.start('test');
      // Simulate work
      const result = { id: i, processed: true };
      profiler.end('test');
    }
    totalTimeWithProfiling = performance.now() - startWithProfiling;

    // Measure without profiling
    process.env.PRISM_DEBUG_PERF = 'false';
    const startWithoutProfiling = performance.now();
    for (let i = 0; i < iterations; i++) {
      // Simulate same work
      const result = { id: i, processed: true };
    }
    totalTimeWithoutProfiling = performance.now() - startWithoutProfiling;

    const overhead = (totalTimeWithProfiling - totalTimeWithoutProfiling) / totalTimeWithoutProfiling;
    expect(overhead).toBeLessThan(0.03); // 3% overhead
  });
}); 