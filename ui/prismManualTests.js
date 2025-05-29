/**
 * @fileoverview Script de test manuel pour l'interface PRISM
 */

import { AdaptiveCyclerWidget } from './AdaptiveCyclerWidget.js';
import { InsightCenter } from './InsightCenter.js';

export class PrismManualTestRunner {
  constructor() {
    this.adaptiveCyclerWidget = new AdaptiveCyclerWidget();
    this.insightCenter = new InsightCenter();
    this.testResults = new Map();
    this.initialize();
  }

  initialize() {
    // Initialize both widgets
    this.adaptiveCyclerWidget.initialize();
    this.insightCenter.initialize();
    
    // Make widgets visible for testing
    this.adaptiveCyclerWidget.toggleVisibility();
    this.insightCenter.toggleVisibility();
  }

  // Test 1: Compression Historique
  async testHistoricalCompression() {
    console.log('🧪 Test 1: Compression Historique');
    const events = [];
    
    // Generate 1200 events
    for (let i = 0; i < 1200; i++) {
      events.push({
        type: 'test',
        timestamp: Date.now(),
        data: `Event ${i}`
      });
    }

    // Add events to both widgets
    events.forEach(event => {
      this.adaptiveCyclerWidget.handleAlert(event);
      this.insightCenter.logEvent('test', event);
    });

    // Wait for compression to occur
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = {
      compressionTriggered: this.adaptiveCyclerWidget.alertHistory.length < 1200,
      visualIndicator: document.querySelector('.compression-indicator') !== null
    };

    this.testResults.set('compression', result);
    return result;
  }

  // Test 2: Purge Automatique
  async testAutomaticPurge() {
    console.log('🧪 Test 2: Purge Automatique');
    const events = [];
    
    // Generate 10000 events
    for (let i = 0; i < 10000; i++) {
      events.push({
        type: 'test',
        timestamp: Date.now() - (i * 1000), // Spread events over time
        data: `Event ${i}`
      });
    }

    // Add events to both widgets
    events.forEach(event => {
      this.adaptiveCyclerWidget.handleAlert(event);
      this.insightCenter.logEvent('test', event);
    });

    // Wait for purge to occur
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = {
      purgeOccurred: this.adaptiveCyclerWidget.alertHistory.length < 10000,
      noCrash: true // If we get here, no crash occurred
    };

    this.testResults.set('purge', result);
    return result;
  }

  // Test 3: Tooltips Dynamiques
  async testDynamicTooltips() {
    console.log('🧪 Test 3: Tooltips Dynamiques');
    
    // Get all performance indicators
    const indicators = document.querySelectorAll('.performance-indicator');
    const results = [];

    for (const indicator of indicators) {
      // Simulate hover
      indicator.dispatchEvent(new MouseEvent('mouseover'));
      
      // Wait for tooltip
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const tooltip = document.querySelector('.tooltip');
      results.push({
        indicator: indicator.className,
        tooltipVisible: tooltip !== null,
        tooltipPosition: tooltip ? tooltip.getBoundingClientRect() : null
      });
    }

    const result = {
      allTooltipsWorking: results.every(r => r.tooltipVisible),
      tooltipDetails: results
    };

    this.testResults.set('tooltips', result);
    return result;
  }

  // Test 4: Filtrage d'Événements
  async testEventFiltering() {
    console.log('🧪 Test 4: Filtrage d\'Événements');
    
    // Add test events of different types
    const events = [
      { type: 'error', efficiency: 30 },
      { type: 'warning', efficiency: 60 },
      { type: 'info', efficiency: 90 }
    ];

    events.forEach(event => {
      this.insightCenter.logEvent(event.type, event);
    });

    // Test each filter type
    const filterResults = [];
    
    // Type filter
    this.insightCenter.filterState.eventTypes.add('error');
    await new Promise(resolve => setTimeout(resolve, 100));
    filterResults.push({
      type: 'eventType',
      filtered: this.insightCenter.eventLog.filter(e => e.type === 'error').length === 1
    });

    // Efficiency filter
    this.insightCenter.filterState.efficiencyThreshold = 50;
    await new Promise(resolve => setTimeout(resolve, 100));
    filterResults.push({
      type: 'efficiency',
      filtered: this.insightCenter.eventLog.filter(e => e.efficiency >= 50).length === 2
    });

    const result = {
      allFiltersWorking: filterResults.every(r => r.filtered),
      filterDetails: filterResults
    };

    this.testResults.set('filtering', result);
    return result;
  }

  // Test 5: Monitoring de Performance
  async testPerformanceMonitoring() {
    console.log('🧪 Test 5: Monitoring de Performance');
    
    const startTime = Date.now();
    const metrics = [];
    
    // Monitor for 5 minutes
    while (Date.now() - startTime < 300000) {
      metrics.push({
        cpu: this.adaptiveCyclerWidget.performanceMetrics.cpu,
        memory: this.adaptiveCyclerWidget.performanceMetrics.memory,
        fps: this.adaptiveCyclerWidget.performanceMetrics.fps,
        timestamp: Date.now()
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const result = {
      stableUpdates: metrics.every(m => m.fps >= 30),
      noFreezes: !metrics.some(m => m.fps === 0),
      metrics: metrics
    };

    this.testResults.set('performance', result);
    return result;
  }

  // Test 6: Alerte Seuils Critiques
  async testCriticalThresholds() {
    console.log('🧪 Test 6: Alerte Seuils Critiques');
    
    // Simulate high CPU
    this.adaptiveCyclerWidget.performanceMetrics.cpu = 90;
    
    // Simulate high memory
    this.adaptiveCyclerWidget.performanceMetrics.memory = 90;
    
    // Simulate low FPS
    this.adaptiveCyclerWidget.performanceMetrics.fps = 20;
    
    // Wait for alerts to be processed
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = {
      cpuAlert: this.adaptiveCyclerWidget.alertHistory.some(a => a.type === 'cpu'),
      memoryAlert: this.adaptiveCyclerWidget.alertHistory.some(a => a.type === 'memory'),
      fpsAlert: this.adaptiveCyclerWidget.alertHistory.some(a => a.type === 'fps')
    };

    this.testResults.set('thresholds', result);
    return result;
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Démarrage des tests manuels PRISM UI');
    
    try {
      await this.testHistoricalCompression();
      await this.testAutomaticPurge();
      await this.testDynamicTooltips();
      await this.testEventFiltering();
      await this.testPerformanceMonitoring();
      await this.testCriticalThresholds();
      
      console.log('✅ Tests terminés');
      this.printResults();
    } catch (error) {
      console.error('❌ Erreur pendant les tests:', error);
    }
  }

  printResults() {
    console.log('\n📊 Résultats des tests:');
    for (const [test, result] of this.testResults) {
      console.log(`\n${test}:`);
      console.log(JSON.stringify(result, null, 2));
    }
  }
}

// Export for use in browser console
window.PrismManualTestRunner = PrismManualTestRunner; 