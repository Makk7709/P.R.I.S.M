export class MetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.metrics = {
      eventsProcessed: 0,
      totalLatency: 0,
      maxLatency: 0,
      minLatency: Number.MAX_VALUE,
      failureCount: 0,
      overloadCount: 0,
      startTime: 0,
      endTime: 0,
      latencyDistribution: {
        under10ms: 0,
        under50ms: 0,
        under100ms: 0,
        under500ms: 0,
        over500ms: 0
      }
    };
  }

  recordEvent(latency) {
    this.metrics.eventsProcessed++;
    this.metrics.totalLatency += latency;
    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
    this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);

    // Update latency distribution
    if (latency < 10) this.metrics.latencyDistribution.under10ms++;
    else if (latency < 50) this.metrics.latencyDistribution.under50ms++;
    else if (latency < 100) this.metrics.latencyDistribution.under100ms++;
    else if (latency < 500) this.metrics.latencyDistribution.under500ms++;
    else this.metrics.latencyDistribution.over500ms++;
  }

  recordFailure() {
    this.metrics.failureCount++;
  }

  recordOverload() {
    this.metrics.overloadCount++;
  }

  startTest() {
    this.metrics.startTime = Date.now();
  }

  endTest() {
    this.metrics.endTime = Date.now();
  }

  getResults() {
    const testDuration = (this.metrics.endTime - this.metrics.startTime) / 1000; // in seconds
    const averageLatency = this.metrics.totalLatency / this.metrics.eventsProcessed;
    const eventsPerSecond = this.metrics.eventsProcessed / testDuration;
    const failureRate = (this.metrics.failureCount / this.metrics.eventsProcessed) * 100;

    return {
      summary: {
        totalEvents: this.metrics.eventsProcessed,
        eventsPerSecond: eventsPerSecond.toFixed(2),
        averageLatency: averageLatency.toFixed(2),
        minLatency: this.metrics.minLatency.toFixed(2),
        maxLatency: this.metrics.maxLatency.toFixed(2),
        failureRate: failureRate.toFixed(2),
        overloadIncidents: this.metrics.overloadCount,
        testDuration: testDuration.toFixed(2)
      },
      latencyDistribution: this.metrics.latencyDistribution,
 