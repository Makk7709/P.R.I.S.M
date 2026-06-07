/**
 * @fileoverview Script d'exécution du test de charge étendu pour PRISM Core
 */

import PrismCoreExtendedStressTest from './prismCoreExtendedStressTest.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration de validation ajustée
const VALIDATION_THRESHOLDS = {
  MIN_EVENTS_PER_SECOND: 500,
  MAX_LATENCY: 150,
  MAX_ERROR_RATE: 0.01,
  MAX_MEMORY_USAGE: 85,
  MAX_CPU_USAGE: 80,
  MAX_QUEUE_LENGTH: 1000,
  MAX_BATCH_TIME: 5000,
  MAX_LATENCY_TREND: 0.2,
  MAX_MEMORY_TREND: 0.1,
  MAX_CPU_TREND: 0.1,
  MAX_ERROR_TREND: 0.05
};

async function runExtendedStressTest() {
  console.log('Starting PRISM Core extended stress test...');
  
  try {
    // Créer le dossier de résultats s'il n'existe pas
    const resultsPath = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsPath)) {
      fs.mkdirSync(resultsPath, { recursive: true });
    }
    
    // Initialiser et exécuter le test
    const test = new PrismCoreExtendedStressTest();
    
    // Ajouter un timeout pour le test
    const testPromise = test.run();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout after 5 minutes')), 5 * 60 * 1000);
    });
    
    const results = await Promise.race([testPromise, timeoutPromise]);
    
    // Vérifier les résultats
    const validationResults = validateResults(results);
    
    // Générer le rapport final
    const report = generateReport(results, validationResults);
    
    // Sauvegarder le rapport
    const reportPath = path.join(resultsPath, 'prismCoreExtendedStressReport.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\nTest completed successfully!');
    console.log(`Results saved to: ${reportPath}`);
    
    // Afficher un résumé des résultats
    console.log('\nSummary:');
    console.log('--------');
    console.log(`Total Events: ${results.summary.totalEvents}`);
    console.log(`Processed Events: ${results.summary.eventsProcessed}`);
    console.log(`Failed Events: ${results.summary.failures}`);
    console.log(`Overloads: ${results.summary.overloads}`);
    console.log(`Average Events/Second: ${Math.round(results.summary.eventsPerSecond)}`);
    console.log(`Total Duration: ${results.summary.totalDurationMs}ms`);
    console.log(`Alerts Generated: ${results.summary.alerts.length}`);
    
    // Afficher les métriques de file d'attente
    console.log('\nQueue Metrics:');
    console.log('-------------');
    console.log(`Max Queue Length: ${results.summary.queueMetrics.maxLength}`);
    console.log(`Average Queue Length: ${Math.round(results.summary.queueMetrics.averageLength)}`);
    console.log(`Queue Overflows: ${results.summary.queueMetrics.overflowCount}`);
    
    // Afficher les alertes si présentes
    if (results.summary.alerts.length > 0) {
      console.log('\nAlerts:');
      console.log('-------');
      results.summary.alerts.forEach(alert => {
        console.log(`[${alert.timestamp}] ${alert.module}: ${alert.message}`);
      });
    }
    
    // Afficher les résultats de validation
    console.log('\nValidation Results:');
    console.log('------------------');
    Object.entries(validationResults).forEach(([key, value]) => {
      if (key !== 'failureDetails') {
        console.log(`${key}: ${value ? '✅ PASS' : '❌ FAIL'}`);
      }
    });
    
    // Afficher les détails des échecs
    if (validationResults.failureDetails && Object.keys(validationResults.failureDetails).length > 0) {
      console.log('\nFailure Details:');
      console.log('---------------');
      Object.entries(validationResults.failureDetails).forEach(([key, details]) => {
        console.log(`${key}:`, details);
      });
    }
    
    // Vérifier si tous les tests ont réussi
    const allTestsPassed = Object.entries(validationResults)
      .filter(([key]) => key !== 'failureDetails')
      .every(([_, value]) => value);
      
    if (!allTestsPassed) {
      console.error('\n❌ Some validation tests failed!');
      process.exit(1);
    }
    
    console.log('\n✅ All tests passed successfully!');
    
  } catch (error) {
    console.error('Error running extended stress test:', error);
    process.exit(1);
  }
}

function validateResults(results) {
  const validation = {
    allEventsProcessed: results.summary.totalEvents === results.summary.eventsProcessed,
    noLostEvents: results.summary.failures === 0,
    acceptableLatency: Object.values(results.moduleMetrics).every(
      module => module.averageLatency <= VALIDATION_THRESHOLDS.MAX_LATENCY
    ),
    acceptableErrorRate: Object.values(results.moduleMetrics).every(
      module => module.errorRate <= VALIDATION_THRESHOLDS.MAX_ERROR_RATE
    ),
    acceptableMemoryUsage: Object.values(results.moduleMetrics).every(
      module => module.maxMemoryUsage <= VALIDATION_THRESHOLDS.MAX_MEMORY_USAGE
    ),
    acceptableCpuUsage: Object.values(results.moduleMetrics).every(
      module => module.maxCpuUsage <= VALIDATION_THRESHOLDS.MAX_CPU_USAGE
    ),
    acceptableQueueLength: results.summary.queueMetrics.maxLength <= VALIDATION_THRESHOLDS.MAX_QUEUE_LENGTH,
    acceptableBatchTime: results.summary.maxBatchTime <= VALIDATION_THRESHOLDS.MAX_BATCH_TIME,
    acceptableEventsPerSecond: results.summary.eventsPerSecond >= VALIDATION_THRESHOLDS.MIN_EVENTS_PER_SECOND,
    acceptableLatencyTrend: Object.values(results.moduleMetrics).every(
      module => module.latencyTrend <= VALIDATION_THRESHOLDS.MAX_LATENCY_TREND
    ),
    acceptableMemoryTrend: Object.values(results.moduleMetrics).every(
      module => module.memoryTrend <= VALIDATION_THRESHOLDS.MAX_MEMORY_TREND
    ),
    acceptableCpuTrend: Object.values(results.moduleMetrics).every(
      module => module.cpuTrend <= VALIDATION_THRESHOLDS.MAX_CPU_TREND
    ),
    acceptableErrorTrend: Object.values(results.moduleMetrics).every(
      module => module.errorTrend <= VALIDATION_THRESHOLDS.MAX_ERROR_TREND
    )
  };
  
  validation.failureDetails = {};
  
  if (!validation.allEventsProcessed) {
    validation.failureDetails.allEventsProcessed = {
      expected: results.summary.totalEvents,
      actual: results.summary.eventsProcessed
    };
  }
  
  if (!validation.noLostEvents) {
    validation.failureDetails.noLostEvents = {
      failures: results.summary.failures
    };
  }
  
  if (!validation.acceptableLatency) {
    validation.failureDetails.acceptableLatency = Object.entries(results.moduleMetrics)
      .filter(([_, metrics]) => metrics.averageLatency > VALIDATION_THRESHOLDS.MAX_LATENCY)
      .map(([module, metrics]) => ({
        module,
        latency: metrics.averageLatency
      }));
  }
  
  if (!validation.acceptableErrorRate) {
    validation.failureDetails.acceptableErrorRate = Object.entries(results.moduleMetrics)
      .filter(([_, metrics]) => metrics.errorRate > VALIDATION_THRESHOLDS.MAX_ERROR_RATE)
      .map(([module, metrics]) => ({
        module,
        errorRate: metrics.errorRate
      }));
  }
  
  if (!validation.acceptableMemoryUsage) {
    validation.failureDetails.acceptableMemoryUsage = Object.entries(results.moduleMetrics)
      .filter(([_, metrics]) => metrics.maxMemoryUsage > VALIDATION_THRESHOLDS.MAX_MEMORY_USAGE)
      .map(([module, metrics]) => ({
        module,
        memoryUsage: metrics.maxMemoryUsage
      }));
  }
  
  if (!validation.acceptableCpuUsage) {
    validation.failureDetails.acceptableCpuUsage = Object.entries(results.moduleMetrics)
      .filter(([_, metrics]) => metrics.maxCpuUsage > VALIDATION_THRESHOLDS.MAX_CPU_USAGE)
      .map(([module, metrics]) => ({
        module,
        cpuUsage: metrics.maxCpuUsage
      }));
  }
  
  if (!validation.acceptableQueueLength) {
    validation.failureDetails.acceptableQueueLength = {
      maxLength: results.summary.queueMetrics.maxLength
    };
  }
  
  if (!validation.acceptableBatchTime) {
    validation.failureDetails.acceptableBatchTime = {
      maxBatchTime: results.summary.maxBatchTime
    };
  }
  
  if (!validation.acceptableEventsPerSecond) {
    validation.failureDetails.acceptableEventsPerSecond = {
      eventsPerSecond: results.summary.eventsPerSecond
    };
  }
  
  return validation;
}

function generateReport(results, validationResults) {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      ...results.summary,
      validation: validationResults
    },
    moduleMetrics: results.moduleMetrics,
    systemMetrics: results.systemMetrics,
    alerts: results.summary.alerts,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      memory: os.totalmem(),
      uptime: process.uptime()
    },
    thresholds: VALIDATION_THRESHOLDS,
    recommendations: generateRecommendations(results, validationResults)
  };
}

function generateRecommendations(results, validationResults) {
  const recommendations = [];
  
  Object.entries(results.moduleMetrics).forEach(([module, metrics]) => {
    if (metrics.latencyTrend > VALIDATION_THRESHOLDS.MAX_LATENCY_TREND) {
      recommendations.push({
        module,
        type: 'LATENCY_TREND',
        severity: 'WARNING',
        message: `La latence de ${module} montre une tendance à la hausse (${(metrics.latencyTrend * 100).toFixed(1)}%). Considérez l'optimisation des performances.`
      });
    }
    
    if (metrics.memoryTrend > VALIDATION_THRESHOLDS.MAX_MEMORY_TREND) {
      recommendations.push({
        module,
        type: 'MEMORY_TREND',
        severity: 'WARNING',
        message: `L'utilisation mémoire de ${module} montre une tendance à la hausse (${(metrics.memoryTrend * 100).toFixed(1)}%). Vérifiez les fuites mémoire potentielles.`
      });
    }
    
    if (metrics.cpuTrend > VALIDATION_THRESHOLDS.MAX_CPU_TREND) {
      recommendations.push({
        module,
        type: 'CPU_TREND',
        severity: 'WARNING',
        message: `L'utilisation CPU de ${module} montre une tendance à la hausse (${(metrics.cpuTrend * 100).toFixed(1)}%). Considérez l'optimisation des performances.`
      });
    }
    
    if (metrics.errorTrend > VALIDATION_THRESHOLDS.MAX_ERROR_TREND) {
      recommendations.push({
        module,
        type: 'ERROR_TREND',
        severity: 'ERROR',
        message: `Le taux d'erreur de ${module} montre une tendance à la hausse (${(metrics.errorTrend * 100).toFixed(1)}%). Vérifiez la stabilité du module.`
      });
    }
  });
  
  return recommendations;
}

// Exécuter le test
runExtendedStressTest().catch(console.error); 