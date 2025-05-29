// Performance profiling utility for PRISM
// Minimal overhead implementation with debug flag control

const PRISM_DEBUG_PERF = process.env.PRISM_DEBUG_PERF === 'true';

class PrismProfiler {
  constructor() {
    this.marks = new Map();
    this.measurements = new Map();
    this.enabled = PRISM_DEBUG_PERF;
  }

  start(label) {
    if (!this.enabled) return;
    this.marks.set(label, performance.now());
  }

  end(label) {
    if (!this.enabled) return;
    
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`[PrismProfiler] No start mark found for label: ${label}`);
      return;
    }

    const duration = performance.now() - startTime;
    this.measurements.set(label, duration);
    
    console.debug(`[PrismProfiler] ${label}: ${duration.toFixed(2)}ms`);
    this.marks.delete(label);
  }

  getMeasurement(label) {
    return this.measurements.get(label);
  }

  clear() {
    this.marks.clear();
    this.measurements.clear();
  }
}

// Singleton instance
const profiler = new PrismProfiler();

export { profiler as PrismProfiler }; 