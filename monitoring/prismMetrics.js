import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import http from 'node:http';

class PrismMetrics {
  constructor() {
    this.registry = new Registry();
    this.initializeMetrics();
    this.server = null;
  }

  initializeMetrics() {
    // Counters
    this.directivesCounter = new Counter({
      name: 'prism_directives_total',
      help: 'Total number of PRISM directives processed',
      labelNames: ['result'],
      registers: [this.registry]
    });

    // Gauges
    this.efficiencyGauge = new Gauge({
      name: 'prism_efficiency_percent',
      help: 'Current PRISM efficiency percentage',
      registers: [this.registry]
    });

    this.cyclerIntervalGauge = new Gauge({
      name: 'prism_cycler_interval_ms',
      help: 'Current PRISM cycler interval in milliseconds',
      registers: [this.registry]
    });

    // Histograms
    this.latencyHistogram = new Histogram({
      name: 'prism_latency_seconds',
      help: 'PRISM operation latency in seconds',
      labelNames: ['segment'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.registry]
    });

    // Initialiser les buckets pour chaque segment
    ['strategic', 'cycler', 'codex'].forEach(seg => {
      this.latencyHistogram.labels(seg).observe(0.5);
    });
  }

  async startMetricsServer(port = 9100) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        if (req.url === '/metrics') {
          try {
            const metrics = await this.registry.metrics();
            res.setHeader('Content-Type', this.registry.contentType);
            res.end(metrics);
          } catch (error) {
            console.error('Error generating metrics:', error);
            res.statusCode = 500;
            res.end('Error generating metrics');
          }
        } else {
          res.statusCode = 404;
          res.end('Not found');
        }
      });

      this.server.on('error', (error) => {
        console.error('Metrics server error:', error);
        reject(error);
      });

      this.server.on('listening', () => {
        console.log(`Metrics server listening on port ${port}`);
        resolve();
      });

      this.server.listen(port);
    });
  }

  // Métriques API
  recordDirective(result) {
    try {
      this.directivesCounter.inc({ result });
    } catch (error) {
      console.error('Error recording directive:', error);
    }
  }

  setEfficiency(value) {
    try {
      this.efficiencyGauge.set(value);
    } catch (error) {
      console.error('Error setting efficiency:', error);
    }
  }

  setCyclerInterval(value) {
    try {
      this.cyclerIntervalGauge.set(value);
    } catch (error) {
      console.error('Error setting cycler interval:', error);
    }
  }

  recordLatency(segment, duration) {
    try {
      this.latencyHistogram.observe({ segment }, duration);
    } catch (error) {
      console.error('Error recording latency:', error);
    }
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Metrics server stopped');
          resolve();
        });
      });
    }
  }
}

export default PrismMetrics; 