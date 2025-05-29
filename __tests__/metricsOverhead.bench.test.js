const { metrics, recordLatency } = require('../telemetry/prismMetrics');

describe('Metrics Overhead Benchmark', () => {
  const ITERATIONS = 10000;
  const SEGMENTS = ['segment1', 'segment2', 'segment3'];

  function baselineTest() {
    const start = Date.now();
    for (let i = 0; i < ITERATIONS; i++) {
      // Empty loop for baseline
    }
    return Date.now() - start;
  }

  function metricsTest() {
    const start = Date.now();
    for (let i = 0; i < ITERATIONS; i++) {
      const segment = SEGMENTS[i % SEGMENTS.length];
      recordLatency(segment, Math.random() * 0.5);
    }
    return Date.now() - start;
  }

  it('should have overhead less than 2%', () => {
    // Warm up
    baselineTest();
    metricsTest();

    // Run actual tests
    const baselineTime = baselineTest();
    const metricsTime = metricsTest();

    // Calculate overhead percentage
    const overhead = ((metricsTime - baselineTime) / baselineTime) * 100;

    console.log(`Baseline time: ${baselineTime}ms`);
    console.log(`Metrics time: ${metricsTime}ms`);
    console.log(`Overhead: ${overhead.toFixed(2)}%`);

    expect(overhead).toBeLessThan(2);
  });
}); 