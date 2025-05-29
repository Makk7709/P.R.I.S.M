class PrismProfiler {
  constructor() {
    if (!PrismProfiler.instance) {
      this.metrics = new Map();
      this.enabled = true;
      PrismProfiler.instance = this;
    }
    return PrismProfiler.instance;
  }

  static getInstance() {
    if (!PrismProfiler.instance) {
      PrismProfiler.instance = new PrismProfiler();
    }
    return PrismProfiler.instance;
  }

  startProfile(name) {
    if (!this.enabled) return;
    this.metrics.set(name, {
      startTime: Date.now(),
      endTime: null,
      duration: null
    });
  }

  endProfile(name) {
    if (!this.enabled) return;
    const metric = this.metrics.get(name);
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
    }
  }

  getMetrics() {
    return Array.from(this.metrics.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
  }

  clear() {
    this.metrics.clear();
  }

  start(label) {
    if (!PrismProfiler.enabled) return;
    this.startProfile(label);
  }

  end(label) {
    if (!PrismProfiler.enabled) return;
    this.endProfile(label);
  }

  clearMetrics() {
    this.clear();
  }

  enable() {
    PrismProfiler.enabled = true;
  }

  disable() {
    PrismProfiler.enabled = false;
  }

  static get enabled() {
    return PrismProfiler.getInstance().enabled;
  }

  static set enabled(value) {
    PrismProfiler.getInstance().enabled = value;
  }
}

module.exports = PrismProfiler; 