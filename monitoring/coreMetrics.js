class CoreMetrics {
  constructor() {
    this.metrics = {
      eventsEmitted: 0,
      eventsReceived: 0,
      cycleDurations: [],
      errors: 0,
      lastSnapshot: Date.now()
    };
  }

  recordEventEmitted() {
    this.metrics.eventsEmitted++;
  }

  recordEventReceived() {
    this.metrics.eventsReceived++;
  }

  recordCycleDuration(duration) {
    this.metrics.cycleDurations.push(duration);
    // Keep only last 100 durations for average calculation
    if (this.metrics.cycleDurations.length > 100) {
      this.metrics.cycleDurations.shift();
    }
  }

  recordError() {
    this.metrics.errors++;
  }

  getSnapshot() {
    const now = Date.now();
    const snapshot = {
      ...this.metrics,
      averageCycleDuration: this.metrics.cycleDurations.length > 0
        ? this.metrics.cycleDurations.reduce((a, b) => a + b, 0) / this.metrics.cycleDurations.length
        : 0,
      eventsPerSecond: (this.metrics.eventsReceived / ((now - this.metrics.lastSnapshot) / 1000)) || 0
    };

    // Reset counters for next snapshot
    this.metrics.lastSnapshot = now;
    this.metrics.eventsEmitted = 0;
    this.metrics.eventsReceived = 0;
    this.metrics.errors = 0;

    return snapshot;
  }
}

export default CoreMetrics; 