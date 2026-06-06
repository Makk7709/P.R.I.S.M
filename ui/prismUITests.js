/**
 * @fileoverview Script de test manuel pour l'interface PRISM
 */

import { AdaptiveCyclerWidget } from './AdaptiveCyclerWidget.js';
import { InsightCenter } from './InsightCenter.js';

// Supprimer les imports CSS qui causent des problèmes
// import './prismUI.css';
// import './InsightCenter.css';

export class PrismUITestRunner {
  constructor() {
    this.adaptiveCyclerWidget = new AdaptiveCyclerWidget();
    this.insightCenter = new InsightCenter();
    this.testResults = new Map();
  }

  async runAllTests() {
    console.log('🚀 Démarrage des tests manuels PRISM UI');
    console.log('=====================================');
    
    const tests = [
      { name: 'Compression Historique', fn: this.testCompressionHistorique.bind(this) },
      { name: 'Purge Automatique', fn: this.testPurgeAutomatique.bind(this) },
      { name: 'Tooltips Dynamiques', fn: this.testTooltipsDynamiques.bind(this) },
      { name: 'Filtrage d\'Événements', fn: this.testFiltrageEvenements.bind(this) },
      { name: 'Monitoring de Performance', fn: this.testMonitoringPerformance.bind(this) },
      { name: 'Alerte Seuils Critiques', fn: this.testAlerteSeuilsCritiques.bind(this) }
    ];
    
    for (const test of tests) {
      console.log(`\n📋 Test: ${test.name}`);
      try {
        const result = await test.fn();
        this.testResults.set(test.name, {
          status: result.success ? '✅' : '❌',
          details: result
        });
      } catch (error) {
        console.error(`❌ Erreur dans le test ${test.name}:`, error);
        this.testResults.set(test.name, {
          status: '❌',
          error: error.message
        });
      }
    }
    
    this.displayResults();
    return this.testResults;
  }

  displayResults() {
    console.log('\n📊 Résultats des tests');
    console.log('===================');
    for (const [name, result] of this.testResults) {
      console.log(`${name}: ${result.status}`);
      if (result.error) {
        console.log(`  Erreur: ${result.error}`);
      }
      if (result.details) {
        console.log(`  Détails:`, result.details);
      }
    }
    
    const allPassed = Array.from(this.testResults.values()).every(r => r.status === '✅');
    console.log(`\n${allPassed ? '🎉 Tous les tests sont passés!' : '⚠️ Certains tests ont échoué'}`);
  }

  async testCompressionHistorique() {
    console.log('🧪 Test Compression Historique');
    
    try {
      // Generate 1200 alerts
      for (let i = 0; i < 1200; i++) {
        this.adaptiveCyclerWidget.handleAlert({
          type: 'test',
          level: 'info',
          message: `Test alert ${i}`,
          value: Math.random() * 100,
          timestamp: Date.now()
        });
      }
      
      // Verify compression
      const result = this.adaptiveCyclerWidget.alertHistory.length < 1200;
      console.log(`Résultat: ${result ? '✅' : '❌'}`);
      console.log(`Nombre d'alertes après compression: ${this.adaptiveCyclerWidget.alertHistory.length}`);
      
      return {
        success: result,
        alertCount: this.adaptiveCyclerWidget.alertHistory.length,
        compressionRatio: 1200 / this.adaptiveCyclerWidget.alertHistory.length
      };
    } catch (error) {
      console.error('Erreur lors du test de compression:', error);
      throw error;
    }
  }

  async testPurgeAutomatique() {
    console.log('🧪 Test Purge Automatique');
    
    try {
      // Generate alerts with timestamps from 24h ago
      const oldTimestamp = Date.now() - (24 * 60 * 60 * 1000);
      for (let i = 0; i < 100; i++) {
        this.adaptiveCyclerWidget.handleAlert({
          type: 'test',
          level: 'info',
          message: `Old alert ${i}`,
          value: Math.random() * 100,
          timestamp: oldTimestamp
        });
      }
      
      // Generate recent alerts
      for (let i = 0; i < 100; i++) {
        this.adaptiveCyclerWidget.handleAlert({
          type: 'test',
          level: 'info',
          message: `Recent alert ${i}`,
          value: Math.random() * 100,
          timestamp: Date.now()
        });
      }
      
      // Force purge
      await this.adaptiveCyclerWidget.purgeScheduler.activateStrategy('timeBased', {
        maxAge: 24 * 60 * 60 * 1000,
        callback: () => {
          const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
          this.adaptiveCyclerWidget.alertHistory = this.adaptiveCyclerWidget.alertHistory.filter(
            alert => alert.timestamp > cutoffTime
          );
        }
      });
      
      // Wait for purge to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify purge
      const result = this.adaptiveCyclerWidget.alertHistory.every(alert => alert.timestamp > oldTimestamp);
      console.log(`Résultat: ${result ? '✅' : '❌'}`);
      console.log(`Nombre d'alertes après purge: ${this.adaptiveCyclerWidget.alertHistory.length}`);
      
      return {
        success: result,
        alertCount: this.adaptiveCyclerWidget.alertHistory.length,
        oldAlertsRemoved: result
      };
    } catch (error) {
      console.error('Erreur lors du test de purge:', error);
      throw error;
    }
  }

  async testTooltipsDynamiques() {
    console.log('🧪 Test Tooltips Dynamiques');
    
    try {
      // Create test elements with tooltips
      const testElements = [
        { id: 'cpu', label: 'CPU', value: '75%' },
        { id: 'memory', label: 'Mémoire', value: '60%' },
        { id: 'fps', label: 'FPS', value: '30' },
        { id: 'efficiency', label: 'Efficacité', value: '85%' }
      ];
      
      // Create and append test elements
      testElements.forEach(element => {
        const div = document.createElement('div');
        div.id = element.id;
        div.className = 'metric-item';
        div.setAttribute('data-tooltip', `${element.label}: ${element.value}`);
        div.innerHTML = `
          <span class="metric-label">${element.label}:</span>
          <span class="metric-value">${element.value}</span>
        `;
        document.body.appendChild(div);
      });
      
      // Add tooltip styles
      const style = document.createElement('style');
      style.textContent = `
        .metric-item {
          position: relative;
          padding: 8px;
          margin: 4px;
          border: 1px solid #ccc;
          cursor: pointer;
        }
        .metric-item[data-tooltip]:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 1000;
        }
      `;
      document.head.appendChild(style);
      
      // Test tooltip appearance
      let allTooltipsWorking = true;
      const tooltipResults = [];
      
      for (const element of testElements) {
        const el = document.getElementById(element.id);
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        
        // Wait for tooltip to appear
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if tooltip is visible
        const tooltip = el.getAttribute('data-tooltip');
        const isWorking = !!tooltip;
        allTooltipsWorking = allTooltipsWorking && isWorking;
        
        tooltipResults.push({
          element: element.label,
          working: isWorking,
          tooltip: tooltip
        });
        
        el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      }
      
      // Cleanup
      testElements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) el.remove();
      });
      style.remove();
      
      console.log(`Résultat: ${allTooltipsWorking ? '✅' : '❌'}`);
      
      return {
        success: allTooltipsWorking,
        details: tooltipResults
      };
    } catch (error) {
      console.error('Erreur lors du test des tooltips:', error);
      throw error;
    }
  }

  async testFiltrageEvenements() {
    console.log('🧪 Test Filtrage d\'Événements');
    
    try {
      // Generate test events
      const eventTypes = ['info', 'warning', 'error'];
      const modules = ['core', 'ui', 'security'];
      
      for (let i = 0; i < 50; i++) {
        this.insightCenter.handleEvent({
          type: eventTypes[i % 3],
          module: modules[i % 3],
          message: `Test event ${i}`,
          efficiency: Math.random() * 100,
          timestamp: Date.now()
        });
      }
      
      // Test filtering by type
      this.insightCenter.filterState.eventTypes.add('warning');
      this.insightCenter.applyFilters();
      const warningEvents = this.insightCenter.getFilteredEvents();
      const warningFilterWorking = warningEvents.every(event => event.type === 'warning');
      
      // Test filtering by module
      this.insightCenter.filterState.eventTypes.clear();
      this.insightCenter.filterState.moduleFilter.add('core');
      this.insightCenter.applyFilters();
      const coreEvents = this.insightCenter.getFilteredEvents();
      const moduleFilterWorking = coreEvents.every(event => event.module === 'core');
      
      // Test filtering by efficiency
      this.insightCenter.filterState.moduleFilter.clear();
      this.insightCenter.filterState.efficiencyThreshold = 50;
      this.insightCenter.applyFilters();
      const efficientEvents = this.insightCenter.getFilteredEvents();
      const efficiencyFilterWorking = efficientEvents.every(event => event.efficiency >= 50);
      
      const result = warningFilterWorking && moduleFilterWorking && efficiencyFilterWorking;
      console.log(`Résultat: ${result ? '✅' : '❌'}`);
      console.log(`Filtres testés: Type (${warningFilterWorking}), Module (${moduleFilterWorking}), Efficacité (${efficiencyFilterWorking})`);
      
      return {
        success: result,
        filters: {
          type: warningFilterWorking,
          module: moduleFilterWorking,
          efficiency: efficiencyFilterWorking
        },
        eventCounts: {
          warning: warningEvents.length,
          core: coreEvents.length,
          efficient: efficientEvents.length
        }
      };
    } catch (error) {
      console.error('Erreur lors du test de filtrage:', error);
      throw error;
    }
  }

  async testMonitoringPerformance() {
    console.log('🧪 Test Monitoring de Performance');
    
    try {
      // Start performance monitoring
      this.adaptiveCyclerWidget.setupPerformanceMonitoring();
      
      // Simulate 5 minutes of activity
      const startTime = Date.now();
      const endTime = startTime + (5 * 60 * 1000);
      
      let metricsStable = true;
      let lastMetrics = null;
      const metricsHistory = [];
      
      while (Date.now() < endTime) {
        // Wait for next metrics update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const currentMetrics = {
          cpu: this.adaptiveCyclerWidget.performanceMetrics.cpu,
          memory: this.adaptiveCyclerWidget.performanceMetrics.memory,
          fps: this.adaptiveCyclerWidget.performanceMetrics.fps
        };
        
        metricsHistory.push(currentMetrics);
        
        if (lastMetrics) {
          // Check for stability
          const cpuDiff = Math.abs(currentMetrics.cpu - lastMetrics.cpu);
          const memoryDiff = Math.abs(currentMetrics.memory - lastMetrics.memory);
          const fpsDiff = Math.abs(currentMetrics.fps - lastMetrics.fps);
          
          if (cpuDiff > 20 || memoryDiff > 20 || fpsDiff > 10) {
            metricsStable = false;
            console.log('⚠️ Instabilité détectée dans les métriques');
            console.log(`CPU: ${cpuDiff}%, Mémoire: ${memoryDiff}%, FPS: ${fpsDiff}`);
          }
        }
        
        lastMetrics = currentMetrics;
      }
      
      // Additional stability checks
      const cpuValues = metricsHistory.map(m => m.cpu);
      const memoryValues = metricsHistory.map(m => m.memory);
      const fpsValues = metricsHistory.map(m => m.fps);
      
      const cpuStable = Math.max(...cpuValues) - Math.min(...cpuValues) <= 20;
      const memoryStable = Math.max(...memoryValues) - Math.min(...memoryValues) <= 20;
      const fpsStable = Math.max(...fpsValues) - Math.min(...fpsValues) <= 10;
      
      const overallStable = metricsStable && cpuStable && memoryStable && fpsStable;
      
      console.log(`Résultat: ${overallStable ? '✅' : '⚠️'}`);
      console.log('Métriques finales:', lastMetrics);
      console.log('Stabilité:', {
        CPU: cpuStable ? '✅' : '❌',
        Mémoire: memoryStable ? '✅' : '❌',
        FPS: fpsStable ? '✅' : '❌'
      });
      
      return {
        success: overallStable,
        metrics: {
          cpu: {
            stable: cpuStable,
            min: Math.min(...cpuValues),
            max: Math.max(...cpuValues),
            avg: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length
          },
          memory: {
            stable: memoryStable,
            min: Math.min(...memoryValues),
            max: Math.max(...memoryValues),
            avg: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length
          },
          fps: {
            stable: fpsStable,
            min: Math.min(...fpsValues),
            max: Math.max(...fpsValues),
            avg: fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length
          }
        }
      };
    } catch (error) {
      console.error('Erreur lors du test de monitoring:', error);
      throw error;
    }
  }

  async testAlerteSeuilsCritiques() {
    console.log('🧪 Test Alerte Seuils Critiques');
    
    try {
      // Test CPU threshold
      this.adaptiveCyclerWidget.performanceMetrics.cpu = 90;
      const cpuAlerts = this.adaptiveCyclerWidget.checkAlertThresholds({
        cpu: { threshold: 80, message: 'CPU élevé' },
        memory: { threshold: 85, message: 'Mémoire élevée' },
        fps: { threshold: 30, message: 'FPS bas' }
      });
      const cpuAlertWorking = cpuAlerts.some(alert => 
        alert.type === 'cpu' && 
        alert.level === 'warning' && 
        alert.message === 'CPU élevé'
      );
      
      // Test memory threshold
      this.adaptiveCyclerWidget.performanceMetrics.cpu = 50;
      this.adaptiveCyclerWidget.performanceMetrics.memory = 90;
      const memoryAlerts = this.adaptiveCyclerWidget.checkAlertThresholds({
        cpu: { threshold: 80, message: 'CPU élevé' },
        memory: { threshold: 85, message: 'Mémoire élevée' },
        fps: { threshold: 30, message: 'FPS bas' }
      });
      const memoryAlertWorking = memoryAlerts.some(alert => 
        alert.type === 'memory' && 
        alert.level === 'warning' && 
        alert.message === 'Mémoire élevée'
      );
      
      // Test FPS threshold
      this.adaptiveCyclerWidget.performanceMetrics.memory = 50;
      this.adaptiveCyclerWidget.performanceMetrics.fps = 20;
      const fpsAlerts = this.adaptiveCyclerWidget.checkAlertThresholds({
        cpu: { threshold: 80, message: 'CPU élevé' },
        memory: { threshold: 85, message: 'Mémoire élevée' },
        fps: { threshold: 30, message: 'FPS bas' }
      });
      const fpsAlertWorking = fpsAlerts.some(alert => 
        alert.type === 'fps' && 
        alert.level === 'warning' && 
        alert.message === 'FPS bas'
      );
      
      const result = cpuAlertWorking && memoryAlertWorking && fpsAlertWorking;
      console.log(`Résultat: ${result ? '✅' : '❌'}`);
      console.log(`Alertes testées: CPU (${cpuAlertWorking}), Mémoire (${memoryAlertWorking}), FPS (${fpsAlertWorking})`);
      
      if (!result) {
        console.log('Détails des alertes:');
        console.log('CPU:', cpuAlerts);
        console.log('Mémoire:', memoryAlerts);
        console.log('FPS:', fpsAlerts);
      }
      
      return {
        success: result,
        alerts: {
          cpu: {
            working: cpuAlertWorking,
            alerts: cpuAlerts
          },
          memory: {
            working: memoryAlertWorking,
            alerts: memoryAlerts
          },
          fps: {
            working: fpsAlertWorking,
            alerts: fpsAlerts
          }
        }
      };
    } catch (error) {
      console.error('Erreur lors du test des alertes:', error);
      throw error;
    }
  }
}

// Run tests when the file is executed
if (require.main === module) {
  const testRunner = new PrismUITestRunner();
  testRunner.runAllTests().catch(console.error);
} 