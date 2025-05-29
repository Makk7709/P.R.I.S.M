/**
 * Test rapide du système de stress test PRISM
 * Valide que tous les composants sont fonctionnels
 */

import { StressTestDriver } from './tests/load/stressDriver.js';
import { ControlPromptGenerator } from './generate-control-prompt.js';
import fs from 'fs';
import path from 'path';

class StressSystemTester {
  constructor() {
    this.testResults = {
      kernelBus: false,
      prismVitals: false,
      stressDriver: false,
      prometheusExport: false,
      controlPrompt: false
    };
  }

  async runQuickTests() {
    console.log('🧪 PRISM Stress System - Quick Validation Tests');
    console.log('═══════════════════════════════════════════════');

    try {
      await this.testKernelBus();
      await this.testPrismVitals();
      await this.testStressDriver();
      await this.testPrometheusExport();
      await this.testControlPrompt();

      this.displayResults();
      return this.allTestsPassed();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return false;
    }
  }

  async testKernelBus() {
    console.log('\n1️⃣ Testing KernelBus...');
    
    try {
      const { KernelBus } = await import('./core/KernelBus.js');
      const kernelBus = new KernelBus();
      
      // Test basic functionality
      let eventReceived = false;
      kernelBus.subscribe('test:quick', () => {
        eventReceived = true;
      });
      
      await kernelBus.publish('test:quick', { test: true });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (eventReceived) {
        console.log('   ✅ KernelBus event system working');
        this.testResults.kernelBus = true;
      } else {
        console.log('   ❌ KernelBus event not received');
      }
      
      kernelBus.cleanup();
      
    } catch (error) {
      console.log(`   ❌ KernelBus test failed: ${error.message}`);
    }
  }

  async testPrismVitals() {
    console.log('\n2️⃣ Testing PrismVitals...');
    
    try {
      const PrismVitals = (await import('./prismVitals.js')).default;
      const vitals = new PrismVitals();
      
      // Test initialization
      if (vitals.isInitialized) {
        console.log('   ✅ PrismVitals initialized successfully');
        
        // Test metrics generation
        const metrics = vitals.getVitalsReport();
        if (metrics && typeof metrics === 'object') {
          console.log('   ✅ Metrics generation working');
          this.testResults.prismVitals = true;
        } else {
          console.log('   ❌ Metrics generation failed');
        }
      } else {
        console.log('   ❌ PrismVitals initialization failed');
      }
      
      vitals.cleanup();
      
    } catch (error) {
      console.log(`   ❌ PrismVitals test failed: ${error.message}`);
    }
  }

  async testStressDriver() {
    console.log('\n3️⃣ Testing Stress Driver...');
    
    try {
      const driver = new StressTestDriver();
      
      // Override config for quick test
      driver.config = {
        totalEvents: 100,
        criticalEventsPerSecond: 10,
        highEventsPerSecond: 30,
        normalEventsPerSecond: 60,
        testDurationSeconds: 2,
        batchSize: 10,
        metricsInterval: 500
      };
      
      const initialized = await driver.initialize();
      if (initialized) {
        console.log('   ✅ Stress Driver initialized');
        
        // Test event generation
        const event = driver.generateEvent('CRITICAL');
        if (event && event.type && event.payload) {
          console.log('   ✅ Event generation working');
          this.testResults.stressDriver = true;
        } else {
          console.log('   ❌ Event generation failed');
        }
      } else {
        console.log('   ❌ Stress Driver initialization failed');
      }
      
      await driver.cleanup();
      
    } catch (error) {
      console.log(`   ❌ Stress Driver test failed: ${error.message}`);
    }
  }

  async testPrometheusExport() {
    console.log('\n4️⃣ Testing Prometheus Export...');
    
    try {
      const PrismVitals = (await import('./prismVitals.js')).default;
      const vitals = new PrismVitals();
      
      // Test Prometheus metrics generation
      const prometheusMetrics = vitals.generatePrometheusMetrics();
      
      if (prometheusMetrics && prometheusMetrics.includes('prism_events_total')) {
        console.log('   ✅ Prometheus metrics format valid');
        
        // Test if metrics contain expected fields
        const expectedMetrics = [
          'prism_events_total',
          'prism_latency_seconds',
          'prism_consensus_success_rate',
          'prism_memory_usage_bytes'
        ];
        
        const allMetricsPresent = expectedMetrics.every(metric => 
          prometheusMetrics.includes(metric)
        );
        
        if (allMetricsPresent) {
          console.log('   ✅ All required metrics present');
          this.testResults.prometheusExport = true;
        } else {
          console.log('   ❌ Some metrics missing');
        }
      } else {
        console.log('   ❌ Prometheus metrics format invalid');
      }
      
      vitals.cleanup();
      
    } catch (error) {
      console.log(`   ❌ Prometheus export test failed: ${error.message}`);
    }
  }

  async testControlPrompt() {
    console.log('\n5️⃣ Testing Control Prompt Generator...');
    
    try {
      // Create mock test results
      const mockResults = this.createMockResults();
      const reportsDir = './reports';
      
      // Ensure reports directory exists
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Write mock results
      const resultsFile = path.join(reportsDir, 'stress_test_results.json');
      fs.writeFileSync(resultsFile, JSON.stringify(mockResults, null, 2));
      
      // Test control prompt generation
      const generator = new ControlPromptGenerator();
      const prompt = await generator.generateControlPrompt();
      
      if (prompt && prompt.includes('Prompt de Contrôle')) {
        console.log('   ✅ Control prompt generated successfully');
        
        // Check if file was created
        if (fs.existsSync(generator.controlPromptFile)) {
          console.log('   ✅ Control prompt file saved');
          this.testResults.controlPrompt = true;
        } else {
          console.log('   ❌ Control prompt file not saved');
        }
      } else {
        console.log('   ❌ Control prompt generation failed');
      }
      
      // Cleanup mock files
      if (fs.existsSync(resultsFile)) {
        fs.unlinkSync(resultsFile);
      }
      if (fs.existsSync(generator.controlPromptFile)) {
        fs.unlinkSync(generator.controlPromptFile);
      }
      
    } catch (error) {
      console.log(`   ❌ Control prompt test failed: ${error.message}`);
    }
  }

  createMockResults() {
    return {
      testConfiguration: {
        totalEvents: 60000,
        criticalEventsPerSecond: 1000,
        highEventsPerSecond: 3000,
        normalEventsPerSecond: 6000,
        testDurationSeconds: 10
      },
      testResults: {
        startTime: Date.now() - 600000,
        endTime: Date.now(),
        totalEvents: 60000,
        successfulEvents: 59995,
        failedEvents: 5,
        lostEvents: 0,
        duration: 600000,
        eventsPerSecond: 6000,
        consensusMetrics: {
          totalRequests: 300,
          approved: 299,
          rejected: 1,
          timeouts: 0,
          successRate: 0.9967
        },
        systemMetrics: {
          memoryUsage: [
            { timestamp: Date.now(), used: 1500000000, total: 2000000000 }
          ],
          queueSizes: [
            { timestamp: Date.now(), size: 50 }
          ]
        },
        errors: []
      },
      qualityMetrics: {
        averageLatencyMs: 35.2,
        p95LatencyMs: 89.1,
        p99LatencyMs: 156.7,
        consensusSuccessRate: 0.9967,
        eventLossCount: 0,
        systemStability: {
          level: 'EXCELLENT',
          factors: {
            latency: 35.2,
            consensus: 0.9967,
            errorRate: 0.0001
          }
        }
      },
      recommendations: [],
      timestamp: new Date().toISOString()
    };
  }

  displayResults() {
    console.log('\n📋 TEST RESULTS SUMMARY');
    console.log('═══════════════════════');
    
    Object.entries(this.testResults).forEach(([test, passed]) => {
      const icon = passed ? '✅' : '❌';
      const status = passed ? 'PASS' : 'FAIL';
      console.log(`${icon} ${test.padEnd(20)} : ${status}`);
    });
    
    const passedCount = Object.values(this.testResults).filter(Boolean).length;
    const totalCount = Object.keys(this.testResults).length;
    
    console.log(`\n📊 Overall: ${passedCount}/${totalCount} tests passed`);
    
    if (this.allTestsPassed()) {
      console.log('🎯 System ready for stress testing!');
    } else {
      console.log('⚠️  Some components need attention before stress testing');
    }
  }

  allTestsPassed() {
    return Object.values(this.testResults).every(Boolean);
  }
}

// Fonction principale
async function main() {
  const tester = new StressSystemTester();
  
  try {
    const success = await tester.runQuickTests();
    
    if (success) {
      console.log('\n🚀 All systems go! Ready to run full stress test.');
      console.log('💡 Run: ./run-stress-test.sh');
    } else {
      console.log('\n🔧 Please fix the failing components before proceeding.');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return false;
  }
}

// Exporter pour utilisation en module ou exécution directe
export { StressSystemTester };

// Exécution directe si ce fichier est lancé
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
} 