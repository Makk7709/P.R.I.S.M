import os from 'node:os';
import { performance } from 'node:perf_hooks';
import kernelBus from '../core/KernelBus.js';
import logger from './prismLogger.js';

class PrismPerformanceMonitor {
  constructor() {
    this.metrics = {
      cpuUsage: [],
      memoryUsage: [],
      moduleLatencies: new Map(),
      eventLatencies: [],
      processingSpeeds: [],
      lastSnapshot: Date.now()
    };

    this.config = {
      samplingInterval: 5000, // 5 seconds
      maxHistorySize: 100,
      enabled: true,
      alertThresholds: {
        cpu: 80, // 80% CPU usage
        memory: 85, // 85% memory usage
        latency: 100 // 100ms latency
      }
    };

    this.alertHandlers = new Set();
    this.initializeEventListeners();
    this.startMonitoring();
  }

  initializeEventListeners() {
    kernelBus.on('prism:core:event:start', this.handleEventStart.bind(this));
    kernelBus.on('prism:core:event:end', this.handleEventEnd.bind(this));
    kernelBus.on('prism:core:module:start', this.handleModuleStart.bind(this));
    kernelBus.on('prism:core:module:end', this.handleModuleEnd.bind(this));
  }

  startMonitoring() {
    if (!this.config.enabled) return;

    setInterval(() => {
      this.collectSystemMetrics();
      this.emitMetrics();
    }, this.config.samplingInterval);
  }

  collectSystemMetrics() {
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    this.metrics.cpuUsage.push({
      user: cpuUsage.user,
      system: cpuUsage.system,
      timestamp: Date.now()
    });

    this.metrics.memoryUsage.push({
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      total: totalMemory,
      free: freeMemory,
      timestamp: Date.now()
    });

    // Keep history size limited
    if (this.metrics.cpuUsage.length > this.config.maxHistorySize) {
      this.metrics.cpuUsage.shift();
    }
    if (this.metrics.memoryUsage.length > this.config.maxHistorySize) {
      this.metrics.memoryUsage.shift();
    }
  }

  handleEventStart(eventName) {
    if (!this.config.enabled) return;
    this.metrics.eventLatencies.push({
      eventName,
      startTime: performance.now()
    });
  }

  handleEventEnd(eventName) {
    if (!this.config.enabled) return;
    const event = this.metrics.eventLatencies.find(e => e.eventName === eventName);
    if (event) {
      event.endTime = performance.now();
      event.duration = event.endTime - event.startTime;
    }
  }

  handleModuleStart(moduleName) {
    if (!this.config.enabled) return;
    if (!this.metrics.moduleLatencies.has(moduleName)) {
      this.metrics.moduleLatencies.set(moduleName, []);
    }
    this.metrics.moduleLatencies.get(moduleName).push({
      startTime: performance.now()
    });
  }

  handleModuleEnd(moduleName) {
    if (!this.config.enabled) return;
    const latencies = this.metrics.moduleLatencies.get(moduleName);
    if (latencies && latencies.length > 0) {
      const lastLatency = latencies[latencies.length - 1];
      lastLatency.endTime = performance.now();
      lastLatency.duration = lastLatency.endTime - lastLatency.startTime;

      // Keep history size limited
      if (latencies.length > this.config.maxHistorySize) {
        latencies.shift();
      }
    }
  }

  calculateAverageLatency(latencies) {
    if (!latencies || latencies.length === 0) return 0;
    return latencies.reduce((sum, l) => sum + l.duration, 0) / latencies.length;
  }

  getModuleMetrics() {
    const moduleMetrics = {};
    for (const [moduleName, latencies] of this.metrics.moduleLatencies) {
      moduleMetrics[moduleName] = {
        averageLatency: this.calculateAverageLatency(latencies),
        totalProcessed: latencies.length
      };
    }
    return moduleMetrics;
  }

  getEventMetrics() {
    const eventMetrics = {};
    const events = this.metrics.eventLatencies.filter(e => e.endTime);
    
    for (const event of events) {
      if (!eventMetrics[event.eventName]) {
        eventMetrics[event.eventName] = {
          count: 0,
          totalDuration: 0
        };
      }
      eventMetrics[event.eventName].count++;
      eventMetrics[event.eventName].totalDuration += event.duration;
    }

    // Calculate averages
    for (const eventName in eventMetrics) {
      eventMetrics[eventName].averageDuration = 
        eventMetrics[eventName].totalDuration / eventMetrics[eventName].count;
    }

    return eventMetrics;
  }

  setAlertThreshold(metric, value) {
    this.config.alertThresholds[metric] = value;
  }

  onAlert(handler) {
    this.alertHandlers.add(handler);
  }

  removeAlertHandler(handler) {
    this.alertHandlers.delete(handler);
  }

  checkThresholds(metrics) {
    const alerts = [];

    // Check CPU usage
    const cpuUsage = (metrics.cpu.current.user + metrics.cpu.current.system) / 1000000;
    if (cpuUsage > this.config.alertThresholds.cpu) {
      alerts.push({
        type: 'cpu',
        value: cpuUsage,
        threshold: this.config.alertThresholds.cpu,
        timestamp: Date.now()
      });
    }

    // Check memory usage
    const memoryUsage = (metrics.memory.current.heapUsed / metrics.memory.current.heapTotal) * 100;
    if (memoryUsage > this.config.alertThresholds.memory) {
      alerts.push({
        type: 'memory',
        value: memoryUsage,
        threshold: this.config.alertThresholds.memory,
        timestamp: Date.now()
      });
    }

    // Check latency
    const avgLatency = this.calculateAverageLatency(this.metrics.eventLatencies);
    if (avgLatency > this.config.alertThresholds.latency) {
      alerts.push({
        type: 'latency',
        value: avgLatency,
        threshold: this.config.alertThresholds.latency,
        timestamp: Date.now()
      });
    }

    // Emit alerts
    for (const alert of alerts) {
      for (const handler of this.alertHandlers) {
        handler(alert);
      }
      kernelBus.emit('prism:core:performanceAlert', alert);
      logger.warn('Performance alert triggered', { alert });
    }

    return alerts;
  }

  emitMetrics() {
    const now = Date.now();
    const snapshot = {
      timestamp: now,
      cpu: {
        current: this.metrics.cpuUsage[this.metrics.cpuUsage.length - 1],
        average: this.calculateAverageLatency(this.metrics.cpuUsage)
      },
      memory: {
        current: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1],
        average: this.calculateAverageLatency(this.metrics.memoryUsage)
      },
      modules: this.getModuleMetrics(),
      events: this.getEventMetrics()
    };

    // Check thresholds and emit alerts if needed
    this.checkThresholds(snapshot);

    kernelBus.emit('prism:core:performanceMetrics', snapshot);
    logger.debug('Performance metrics emitted', { snapshot });
  }

  enable() {
    this.config.enabled = true;
    this.startMonitoring();
  }

  disable() {
    this.config.enabled = false;
  }

  setConfig(newConfig) {
    Object.assign(this.config, newConfig);
    if (this.config.enabled) {
      this.startMonitoring();
    }
  }
}

// Create and export a singleton instance
const performanceMonitor = new PrismPerformanceMonitor();
export { PrismPerformanceMonitor }; // Export the class for testing
export default performanceMonitor; // Export the singleton instance for normal use 