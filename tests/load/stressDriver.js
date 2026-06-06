/**
 * PRISM Stress Test Driver
 * Génère 60 000 événements mixtes pour tester la stabilité du système
 * - 1 000 CRITICAL /s
 * - 3 000 HIGH /s
 * - 6 000 NORMAL /s
 */

import { KernelBus } from '../../core/KernelBus.js';
import ConsensusManager from '../../src/core/ConsensusManager.js';
import PrismVitals from '../../prismVitals.js';
import fs from 'node:fs';
import path from 'node:path';

class StressTestDriver {
  constructor() {
    this.kernelBus = null;
    this.prismVitals = null;
    this.testResults = {
      startTime: null,
      endTime: null,
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      lostEvents: 0,
      latencies: [],
      consensusMetrics: {
        totalRequests: 0,
        approved: 0,
        rejected: 0,
        timeouts: 0,
        successRate: 0,
      },
      performanceMetrics: {
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        maxLatency: 0,
        minLatency: Infinity,
      },
      systemMetrics: {
        memoryUsage: [],
        cpuUsage: [],
        queueSizes: [],
      },
      errors: [],
    };

    // Configuration du test
    this.config = {
      totalEvents: 60000,
      criticalEventsPerSecond: 1000,
      highEventsPerSecond: 3000,
      normalEventsPerSecond: 6000,
      testDurationSeconds: 10, // 10 secondes de test intensif
      batchSize: 100,
      metricsInterval: 1000, // Collecte des métriques chaque seconde
    };

    this.eventCounter = 0;
    this.isRunning = false;
    this.metricsCollector = null;
  }

  async initialize() {
    console.log('🚀 Initializing PRISM Stress Test Driver...');

    try {
      // Initialiser KernelBus
      this.kernelBus = new KernelBus();
      await new Promise((resolve) => setTimeout(resolve, 500)); // Attendre l'initialisation

      // Initialiser PrismVitals
      this.prismVitals = new PrismVitals();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Configurer les listeners pour capturer les métriques
      this.setupMetricsListeners();

      console.log('✅ Stress Test Driver initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Stress Test Driver:', error);
      this.testResults.errors.push({
        type: 'INITIALIZATION_ERROR',
        message: error.message,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  setupMetricsListeners() {
    // Écouter les événements de performance
    this.kernelBus.on('prism:core:performanceMetrics', (metrics) => {
      this.collectSystemMetrics(metrics);
    });

    // Écouter les événements de consensus
    this.kernelBus.on('prism:consensus:decision', (result) => {
      this.updateConsensusMetrics(result);
    });

    // Écouter les erreurs
    this.kernelBus.on('prism:core:failure', (error) => {
      this.testResults.errors.push({
        type: 'RUNTIME_ERROR',
        message: error.error,
        timestamp: error.timestamp,
      });
    });
  }

  collectSystemMetrics(metrics) {
    if (metrics.memory) {
      this.testResults.systemMetrics.memoryUsage.push({
        timestamp: Date.now(),
        used: metrics.memory.usedJSHeapSize,
        total: metrics.memory.totalJSHeapSize,
      });
    }

    if (metrics.priorityQueueMetrics) {
      this.testResults.systemMetrics.queueSizes.push({
        timestamp: Date.now(),
        size: metrics.priorityQueueMetrics.size || 0,
      });
    }
  }

  updateConsensusMetrics(result) {
    this.testResults.consensusMetrics.totalRequests++;

    switch (result.status) {
      case 'APPROVED':
        this.testResults.consensusMetrics.approved++;
        break;
      case 'REJECTED':
        this.testResults.consensusMetrics.rejected++;
        break;
      case 'TIMEOUT':
        this.testResults.consensusMetrics.timeouts++;
        break;
    }

    // Calculer le taux de succès
    this.testResults.consensusMetrics.successRate =
      this.testResults.consensusMetrics.approved / this.testResults.consensusMetrics.totalRequests;
  }

  generateEvent(priority) {
    const eventTypes = {
      CRITICAL: [
        'prism:security:breach_detected',
        'prism:system:critical_failure',
        'prism:consensus:emergency_decision',
      ],
      HIGH: [
        'prism:system:high_load',
        'prism:adaptation:strategy_change',
        'prism:performance:degradation',
      ],
      NORMAL: ['prism:data:processed', 'prism:monitoring:heartbeat', 'prism:user:interaction'],
    };

    const types = eventTypes[priority];
    const eventType = types[Math.floor(Math.random() * types.length)];

    return {
      type: eventType,
      payload: {
        id: `event_${this.eventCounter++}`,
        priority: priority.toLowerCase(),
        timestamp: Date.now(),
        data: this.generateRandomData(),
        requiresConsensus: priority === 'CRITICAL' && Math.random() < 0.3, // 30% des événements critiques nécessitent un consensus
      },
    };
  }

  generateRandomData() {
    return {
      value: Math.random() * 1000,
      category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
      metadata: {
        source: 'stress_test',
        batch: Math.floor(this.eventCounter / this.config.batchSize),
      },
    };
  }

  async publishEvent(event) {
    const startTime = performance.now();

    try {
      await this.kernelBus.publish(event.type, event.payload);
      const latency = performance.now() - startTime;

      this.testResults.latencies.push(latency);
      this.testResults.successfulEvents++;

      // Mettre à jour les statistiques de latence
      this.updateLatencyStats(latency);

      return true;
    } catch (error) {
      this.testResults.failedEvents++;
      this.testResults.errors.push({
        type: 'EVENT_PUBLISH_ERROR',
        message: error.message,
        event: event.type,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  updateLatencyStats(latency) {
    const perf = this.testResults.performanceMetrics;
    perf.maxLatency = Math.max(perf.maxLatency, latency);
    perf.minLatency = Math.min(perf.minLatency, latency);

    // Calculer la latence moyenne
    if (this.testResults.latencies.length > 0) {
      perf.averageLatency =
        this.testResults.latencies.reduce((a, b) => a + b, 0) / this.testResults.latencies.length;
    }

    // Calculer P95 et P99
    if (this.testResults.latencies.length > 10) {
      const sorted = [...this.testResults.latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);

      perf.p95Latency = sorted[p95Index];
      perf.p99Latency = sorted[p99Index];
    }
  }

  async runStressTest() {
    console.log('🔥 Starting PRISM Stress Test...');
    console.log(
      `📊 Target: ${this.config.totalEvents} events over ${this.config.testDurationSeconds} seconds`
    );
    console.log(
      `⚡ Rate: ${this.config.criticalEventsPerSecond} CRITICAL/s, ${this.config.highEventsPerSecond} HIGH/s, ${this.config.normalEventsPerSecond} NORMAL/s`
    );

    this.testResults.startTime = Date.now();
    this.isRunning = true;

    // Démarrer la collecte de métriques
    this.startMetricsCollection();

    // Calculer les intervalles pour chaque type d'événement
    const criticalInterval = 1000 / this.config.criticalEventsPerSecond;
    const highInterval = 1000 / this.config.highEventsPerSecond;
    const normalInterval = 1000 / this.config.normalEventsPerSecond;

    // Créer les générateurs d'événements
    const generators = [
      this.createEventGenerator('CRITICAL', criticalInterval),
      this.createEventGenerator('HIGH', highInterval),
      this.createEventGenerator('NORMAL', normalInterval),
    ];

    // Lancer tous les générateurs en parallèle
    const generatorPromises = generators.map((generator) => generator());

    // Attendre la fin du test ou timeout
    await Promise.race([
      Promise.all(generatorPromises),
      new Promise((resolve) => setTimeout(resolve, this.config.testDurationSeconds * 1000)),
    ]);

    this.isRunning = false;
    this.testResults.endTime = Date.now();

    // Arrêter la collecte de métriques
    this.stopMetricsCollection();

    // Attendre que tous les événements soient traités
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('✅ Stress test completed');
    return this.generateReport();
  }

  createEventGenerator(priority, interval) {
    return async () => {
      const eventsPerType = this.config.totalEvents / 10; // Répartir équitablement
      let eventCount = 0;

      while (this.isRunning && eventCount < eventsPerType) {
        const event = this.generateEvent(priority);
        await this.publishEvent(event);

        eventCount++;
        this.testResults.totalEvents++;

        // Attendre l'intervalle calculé
        await new Promise((resolve) => setTimeout(resolve, interval));

        // Afficher le progrès
        if (eventCount % 1000 === 0) {
          console.log(`📈 ${priority}: ${eventCount} events published`);
        }
      }
    };
  }

  startMetricsCollection() {
    this.metricsCollector = setInterval(() => {
      if (this.kernelBus) {
        const metrics = this.kernelBus.getMetrics();
        this.collectSystemMetrics(metrics);
      }
    }, this.config.metricsInterval);
  }

  stopMetricsCollection() {
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector);
      this.metricsCollector = null;
    }
  }

  generateReport() {
    const duration = this.testResults.endTime - this.testResults.startTime;
    const eventsPerSecond = this.testResults.totalEvents / (duration / 1000);

    // Calculer les métriques finales
    const consensusSuccessRate =
      this.testResults.consensusMetrics.totalRequests > 0
        ? this.testResults.consensusMetrics.approved /
          this.testResults.consensusMetrics.totalRequests
        : 1.0;

    const eventLossRate = this.testResults.failedEvents / this.testResults.totalEvents;

    const report = {
      testConfiguration: this.config,
      testResults: {
        ...this.testResults,
        duration: duration,
        eventsPerSecond: eventsPerSecond,
        eventLossRate: eventLossRate,
        consensusSuccessRate: consensusSuccessRate,
      },
      qualityMetrics: {
        averageLatencyMs: this.testResults.performanceMetrics.averageLatency,
        p95LatencyMs: this.testResults.performanceMetrics.p95Latency,
        p99LatencyMs: this.testResults.performanceMetrics.p99Latency,
        consensusSuccessRate: consensusSuccessRate,
        eventLossCount: this.testResults.failedEvents,
        systemStability: this.assessSystemStability(),
      },
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString(),
    };

    return report;
  }

  assessSystemStability() {
    const avgLatency = this.testResults.performanceMetrics.averageLatency;
    const consensusRate = this.testResults.consensusMetrics.successRate;
    const errorRate = this.testResults.errors.length / this.testResults.totalEvents;

    let stability = 'EXCELLENT';

    if (avgLatency > 40 || consensusRate < 0.999 || errorRate > 0.001) {
      stability = 'GOOD';
    }

    if (avgLatency > 100 || consensusRate < 0.99 || errorRate > 0.01) {
      stability = 'FAIR';
    }

    if (avgLatency > 200 || consensusRate < 0.95 || errorRate > 0.05) {
      stability = 'POOR';
    }

    return {
      level: stability,
      factors: {
        latency: avgLatency,
        consensus: consensusRate,
        errorRate: errorRate,
      },
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const perf = this.testResults.performanceMetrics;
    const consensus = this.testResults.consensusMetrics;

    if (perf.averageLatency > 40) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'HIGH',
        message: `Average latency (${perf.averageLatency.toFixed(2)}ms) exceeds target (40ms)`,
        suggestion: 'Consider optimizing event processing pipeline or increasing batch sizes',
      });
    }

    if (consensus.successRate < 0.999) {
      recommendations.push({
        type: 'CONSENSUS',
        priority: 'CRITICAL',
        message: `Consensus success rate (${(consensus.successRate * 100).toFixed(2)}%) below target (99.9%)`,
        suggestion: 'Review consensus timeout settings and network stability',
      });
    }

    if (this.testResults.failedEvents > 0) {
      recommendations.push({
        type: 'RELIABILITY',
        priority: 'HIGH',
        message: `${this.testResults.failedEvents} events failed to process`,
        suggestion: 'Investigate error patterns and implement retry mechanisms',
      });
    }

    return recommendations;
  }

  async saveReport(report) {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, 'stress_test_results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Report saved to: ${reportPath}`);
    return reportPath;
  }

  async cleanup() {
    this.isRunning = false;
    this.stopMetricsCollection();

    if (this.kernelBus) {
      this.kernelBus.cleanup();
    }

    console.log('🧹 Stress test cleanup completed');
  }
}

// Fonction principale pour exécuter le test
async function runStressTest() {
  const driver = new StressTestDriver();

  try {
    const initialized = await driver.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize stress test');
      process.exit(1);
    }

    const report = await driver.runStressTest();
    await driver.saveReport(report);

    // Afficher un résumé
    console.log('\n📋 STRESS TEST SUMMARY');
    console.log('═══════════════════════');
    console.log(`Total Events: ${report.testResults.totalEvents}`);
    console.log(`Successful: ${report.testResults.successfulEvents}`);
    console.log(`Failed: ${report.testResults.failedEvents}`);
    console.log(`Average Latency: ${report.qualityMetrics.averageLatencyMs.toFixed(2)}ms`);
    console.log(`P95 Latency: ${report.qualityMetrics.p95LatencyMs.toFixed(2)}ms`);
    console.log(`P99 Latency: ${report.qualityMetrics.p99LatencyMs.toFixed(2)}ms`);
    console.log(
      `Consensus Success Rate: ${(report.qualityMetrics.consensusSuccessRate * 100).toFixed(2)}%`
    );
    console.log(`System Stability: ${report.qualityMetrics.systemStability.level}`);

    // Vérifier les seuils
    const passed =
      report.qualityMetrics.averageLatencyMs < 40 &&
      report.qualityMetrics.consensusSuccessRate >= 0.999 &&
      report.qualityMetrics.eventLossCount === 0;

    console.log(`\n🎯 STRESS TEST: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach((rec) => {
        console.log(`  ${rec.priority}: ${rec.message}`);
        console.log(`    → ${rec.suggestion}`);
      });
    }

    return passed;
  } catch (error) {
    console.error('❌ Stress test failed:', error);
    return false;
  } finally {
    await driver.cleanup();
  }
}

// Exporter pour utilisation en module ou exécution directe
export { StressTestDriver, runStressTest };

// Exécution directe si ce fichier est lancé
if (import.meta.url === `file://${process.argv[1]}`) {
  runStressTest()
    .then((passed) => process.exit(passed ? 0 : 1))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
