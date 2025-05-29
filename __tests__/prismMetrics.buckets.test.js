const { metrics, updateLatencyBuckets, recordLatency } = require('../telemetry/prismMetrics');

describe('PRISM Metrics', () => {
  beforeEach(() => {
    // Reset metrics before each test
    metrics.latency.reset();
    metrics.totalRequests.reset();
    metrics.efficiency.reset();
  });

  describe('Latency Buckets', () => {
    it('should use default buckets when no custom buckets provided', () => {
      const defaultBuckets = [0.05, 0.1, 0.2, 0.3, 0.5, 1, Infinity];
      expect(metrics.latency.buckets).toEqual(defaultBuckets);
    });

    it('should update buckets when valid buckets provided', () => {
      const newBuckets = [0.1, 0.2, 0.5, 1, 2, 5, Infinity];
      updateLatencyBuckets(newBuckets);
      expect(metrics.latency.buckets).toEqual(newBuckets);
    });

    it('should keep default buckets when invalid buckets provided', () => {
      const defaultBuckets = metrics.latency.buckets;
      updateLatencyBuckets([]);
      expect(metrics.latency.buckets).toEqual(defaultBuckets);
    });
  });

  describe('Latency Recording', () => {
    it('should record latency with segment', () => {
      recordLatency('test-segment', 0.15);
      const value = metrics.latency.get().values.find(v => v.labels.segment === 'test-segment');
      expect(value).toBeDefined();
    });

    it('should log warning when no segment provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      recordLatency(null, 0.15);
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ No segment provided for latency recording');
      consoleSpy.mockRestore();
    });
  });

  describe('Request Counter', () => {
    it('should increment counter with status', () => {
      metrics.totalRequests.inc({ status: 'success' });
      const value = metrics.totalRequests.get().values.find(v => v.labels.status === 'success');
      expect(value.value).toBe(1);
    });
  });

  describe('Efficiency Gauge', () => {
    it('should update efficiency value', () => {
      metrics.efficiency.set(75);
      expect(metrics.efficiency.get().values[0].value).toBe(75);
    });
  });
}); 