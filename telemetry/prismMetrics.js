import { Registry, Counter, Gauge, Histogram } from 'prom-client';

// Create a registry
export const register = new Registry();

// Define default buckets for latency
const DEFAULT_LATENCY_BUCKETS = [0.05, 0.1, 0.2, 0.3, 0.5, 1, Infinity];

// Create metrics
export const metrics = {
  // Counters
  totalRequests: new Counter({
    name: 'prism_total_requests',
    help: 'Total number of requests processed',
    labelNames: ['status'],
    registers: [register],
  }),

  // Gauges
  efficiency: new Gauge({
    name: 'prism_efficiency_percent',
    help: 'Current efficiency percentage',
    registers: [register],
  }),

  // Histograms
  latency: new Histogram({
    name: 'prism_latency_seconds',
    help: 'Request latency in seconds',
    labelNames: ['segment'],
    buckets: DEFAULT_LATENCY_BUCKETS,
    registers: [register],
  }),
};

// Function to update latency buckets
export function updateLatencyBuckets(newBuckets) {
  if (!Array.isArray(newBuckets) || newBuckets.length === 0) {
    console.warn('Invalid buckets provided, using default buckets');
    return;
  }

  // Create new histogram with updated buckets
  metrics.latency = new Histogram({
    name: 'prism_latency_seconds',
    help: 'Request latency in seconds',
    labelNames: ['segment'],
    buckets: newBuckets,
    registers: [register],
  });
}

// Function to record latency
export function recordLatency(segment, duration) {
  if (!segment) {
    console.warn('⚠️ No segment provided for latency recording');
    return;
  }
  metrics.latency.observe({ segment }, duration);
}

// Function to record request
export function recordRequest(status) {
  metrics.totalRequests.inc({ status });
}

// Function to update efficiency
export function updateEfficiency(value) {
  metrics.efficiency.set(value);
} 