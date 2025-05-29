/**
 * @fileoverview Tests de charge pour PRISM
 */

import { PrismCore } from '../prismCore.js';
import { PrismBus } from '../prismBus.js';
import { PrismVitals } from '../prismVitals.js';

const LOAD_TEST_CONFIG = {
  duration: 300000, // 5 minutes
  eventFrequency: 100, // événements par seconde
  maxConcurrentOperations: 1000,
  monitoringInterval: 1000, // 1 seconde
};

class PrismLoadTester {
  constructor() {
    this.core = new PrismCore();
    this.bus = new PrismBus();
    this.vitals = new PrismVitals();
    this.metrics = {
      eventLatency: [],
      memoryUsage: [],
      cpuUsage: [],
      errorCount: 0,
      throughput: []
    };
    this.isRunning = false;
  }

  /**
   * Démarre les tests de charge
   */
  async startLoadTest() {
    console.log('🔄 Starting PRISM load tests...');
    this.isRunning = true;
    const startTime = Date.now();

    // Démarrage du monitoring
    const monitoringInterval = setInterval(
      () => this.collectMetrics(),
      LOAD_TEST_CONFIG.monitoringInterval
    );

    try {
      // Génération de charge
      await Promise.all([
        this.generateEventLoad(),
        this.generateMemoryLoad(),
        this.generateCPULoad(),
        this.generateConcurrentOperations()
      ]);

      // Attendre la durée du test
      await new Promise(resolve => 
        setTimeout(resolve, LOAD_TEST_CONFIG.duration)
      );
    } catch (error) {
      console.error('❌ Load test failed:', error);
      this.metrics.errorCount++;
    } finally {
      this.isRunning = false;
      clearInterval(monitoringInterval);
      await this.generateReport(startTime);
    }
  }

  /**
   * Collecte les métriques pendant le test
   */
  async collectMetrics() {
    const metrics = await this.vitals.collectVitals();
    this.metrics.memoryUsage.push(metrics.memoryUsage);
    this.metrics.cpuUsage.push(metrics.cpuUsage);
  }

  /**
   * Génère une charge d'événements
   */
  async generateEventLoad() {
    const eventsPerBatch = LOAD_TEST_CONFIG.eventFrequency / 10;
    
    while (this.isRunning) {
      const eventPromises = [];
      
      for (let i = 0; i < eventsPerBatch; i++) {
        const startTime = performance.now();
        eventPromises.push(
          this.bus.emit('test:event', { timestamp: Date.now() })
            .then(() => {
              const latency = performance.now() - startTime;
              this.metrics.eventLatency.push(latency);
            })
        );
      }

      await Promise.all(eventPromises);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Génère une charge mémoire
   */
  async generateMemoryLoad() {
    const memoryChunks = [];
    
    while (this.isRunning) {
      try {
        // Allouer 1MB de mémoire
        memoryChunks.push(new Array(1024 * 1024).fill('x'));
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Libérer si trop de mémoire utilisée
        if (this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] > 80) {
          memoryChunks.length = 0;
        }
      } catch (error) {
        console.warn('Memory allocation failed:', error);
      }
    }
  }

  /**
   * Génère une charge CPU
   */
  async generateCPULoad() {
    while (this.isRunning) {
      const startTime = performance.now();
      
      // Simulation de charge CPU
      while (performance.now() - startTime < 100) {
        Math.random() * Math.random();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Génère des opérations concurrentes
   */
  async generateConcurrentOperations() {
    const operations = [];
    
    for (let i = 0; i < LOAD_TEST_CONFIG.maxConcurrentOperations; i++) {
      operations.push(this.simulateOperation());
    }

    await Promise.all(operations);
  }

  /**
   * Simule une opération système
   */
  async simulateOperation() {
    while (this.isRunning) {
      try {
        await this.core.processRequest({
          type: 'test',
          payload: { timestamp: Date.now() }
        });
        
        this.metrics.throughput.push(Date.now());
      } catch (error) {
        this.metrics.errorCount++;
      }
      
      await new Promise(resolve => 
        setTimeout(resolve, Math.random() * 1000)
      );
    }
  }

  /**
   * Génère un rapport de test
   */
  async generateReport(startTime) {
    const duration = Date.now() - startTime;
    const report = {
      duration,
      averageLatency: this.calculateAverage(this.metrics.eventLatency),
      maxLatency: Math.max(...this.metrics.eventLatency),
      averageMemoryUsage: this.calculateAverage(this.metrics.memoryUsage),
      averageCPUUsage: this.calculateAverage(this.metrics.cpuUsage),
      errorRate: (this.metrics.errorCount / this.metrics.throughput.length) * 100,
      throughput: this.metrics.throughput.length / (duration / 1000)
    };

    console.log('📊 Load Test Report:');
    console.table(report);

    return report;
  }

  /**
   * Calcule la moyenne d'un tableau de nombres
   */
  calculateAverage(array) {
    return array.reduce((a, b) => a + b, 0) / array.length;
  }
}

// Export pour utilisation dans les tests
export const loadTester = new PrismLoadTester(); 