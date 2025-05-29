class ExtendedMetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.startTime = 0;
    this.endTime = 0;
    this.metrics = {
      eventsProcessed: 0,
      failuresDetected: 0,
      overloadsDetected: 0,
      alerts: [],
      batchTimes: [],
      errors: [],
      queueMetrics: {
        currentLength: 0,
        maxLength: 0,
        overflows: 0,
        averageLength: 0,
        lengths: []
      },
      memoryUsage: [],
      cpuUsage: []
    };

    // Métriques par module
    this.moduleMetrics = {};
    CONFIG.MODULES.forEach(module => {
      this.moduleMetrics[module] = {
        eventCount: 0,
        errors: 0,
        errorRate: 0,
        latencySum: 0,
        maxLatency: 0,
        minLatency: Infinity,
        memoryUsage: [],
        cpuUsage: [],
        processingTimes: [],
        alerts: []
      };
    });
  }

  async collectMetrics() {
    try {
      // Collecter les métriques système
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.memoryUsage.push(memUsage.heapUsed / 1024 / 1024); // MB
      this.metrics.cpuUsage.push((cpuUsage.user + cpuUsage.system) / 1000000); // seconds
      
      // Collecter les métriques de la file d'attente
      const queueLength = kernelBus.getQueueLength();
      this.metrics.queueMetrics.lengths.push(queueLength);
      this.metrics.queueMetrics.currentLength = queueLength;
      this.metrics.queueMetrics.maxLength = Math.max(this.metrics.queueMetrics.maxLength, queueLength);
      
      if (this.metrics.queueMetrics.lengths.length > 0) {
        this.metrics.queueMetrics.averageLength = 
          this.metrics.queueMetrics.lengths.reduce((a, b) => a + b, 0) / 
          this.metrics.queueMetrics.lengths.length;
      }
      
      // Collecter les métriques par module
      for (const module of CONFIG.MODULES) {
        const moduleMetrics = this.moduleMetrics[module];
        
        // Simuler la collecte de métriques spécifiques au module
        moduleMetrics.memoryUsage.push(memUsage.heapUsed / 1024 / 1024);
        moduleMetrics.cpuUsage.push((cpuUsage.user + cpuUsage.system) / 1000000);
        
        // Calculer le taux d'erreur
        if (moduleMetrics.eventCount > 0) {
          moduleMetrics.errorRate = moduleMetrics.errors / moduleMetrics.eventCount;
        }
      }
    } catch (error) {
      console.error('Error collecting metrics:', error);
      this.metrics.errors.push({
        timestamp: Date.now(),
        type: 'metrics_collection_error',
        message: error.message
      });
    }
  }

  getResults() {
    return {
      metrics: this.metrics,
      moduleMetrics: this.moduleMetrics,
      startTime: this.startTime,
      endTime: this.endTime
    };
  }
}

module.exports = ExtendedMetricsCollector; 