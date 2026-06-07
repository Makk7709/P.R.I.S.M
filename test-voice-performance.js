#!/usr/bin/env node

/**
 * Test de Performance Chat Vocal PRISM
 * Mesures TDD pour optimisation latence
 */

import { performanceOptimizer } from './backend/performance-optimizer.js';
import { handleUserInstruction } from './backend/orchestrator.js';

class VoicePerformanceTest {
  constructor() {
    this.testScenarios = [
      {
        name: "Requête simple",
        message: "Bonjour, comment ça va ?",
        targetTime: 2000,
        type: "simple"
      },
      {
        name: "Requête complexe",
        message: "Explique-moi la stratégie marketing pour une startup en IA dans le secteur de la santé",
        targetTime: 3000,
        type: "complex"
      },
      {
        name: "Requête ultra-courte",
        message: "Oui",
        targetTime: 1000,
        type: "ultra-short"
      }
    ];
    this.results = [];
  }

  async runPerformanceTests() {
    console.log('🚀 Tests de Performance Chat Vocal PRISM\n');
    console.log('═'.repeat(60));

    for (const scenario of this.testScenarios) {
      console.log(`\n🧪 Test: ${scenario.name}`);
      console.log(`📝 Message: "${scenario.message}"`);
      console.log(`🎯 Cible: ${scenario.targetTime}ms`);
      
      const results = await this.runScenario(scenario);
      this.results.push({ scenario, results });
      
      // Afficher résultats immédiatement
      console.log(`⏱️  Temps total: ${results.totalTime}ms`);
      console.log(`${results.totalTime <= scenario.targetTime ? '✅' : '❌'} ${results.totalTime <= scenario.targetTime ? 'SUCCÈS' : 'ÉCHEC'}`);
      
      if (results.breakdown) {
        console.log('📊 Détail:');
        Object.entries(results.breakdown).forEach(([phase, time]) => {
          console.log(`   - ${phase}: ${time}ms`);
        });
      }
    }

    this.generateReport();
  }

  async runScenario(scenario) {
    const startTime = Date.now();
    const breakdown = {};

    try {
      // Timer pour orchestrateur
      const orchestratorTimer = performanceOptimizer.startTimer('apiCalls');
      
      const response = await handleUserInstruction(
        scenario.message, 
        scenario.type === 'simple' ? 'general' : 'complex'
      );
      
      breakdown.orchestrator = orchestratorTimer.end();
      
      const totalTime = Date.now() - startTime;
      breakdown.total = totalTime;

      return {
        success: true,
        totalTime,
        breakdown,
        response: `${response?.data?.enhancedContent?.substring(0, 100)  }...`
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      return {
        success: false,
        totalTime,
        error: error.message,
        breakdown
      };
    }
  }

  generateReport() {
    console.log('\n📋 RAPPORT DE PERFORMANCE');
    console.log('═'.repeat(60));

    const performanceReport = performanceOptimizer.getPerformanceReport();
    
    console.log('\n📊 Moyennes par composant:');
    Object.entries(performanceReport.averages).forEach(([component, avgTime]) => {
      if (avgTime > 0) {
        const threshold = performanceReport.thresholds[component.replace('s', '')] || 1000;
        const status = avgTime <= threshold ? '✅' : '❌';
        console.log(`   ${status} ${component}: ${avgTime}ms (seuil: ${threshold}ms)`);
      }
    });

    console.log('\n🚨 Alertes de performance:');
    if (performanceReport.alerts.length === 0) {
      console.log('   ✅ Aucune alerte - Performance acceptable');
    } else {
      performanceReport.alerts.forEach(alert => {
        const emoji = alert.severity === 'high' ? '🔴' : '🟠';
        console.log(`   ${emoji} ${alert.message}`);
      });
    }

    console.log('\n🎯 Recommandations:');
    this.generateRecommendations();
  }

  generateRecommendations() {
    const report = performanceOptimizer.getPerformanceReport();
    const recommendations = [];

    if (report.averages.apiCalls > 2000) {
      recommendations.push('🔧 Réduire maxTokens à 300 pour requêtes simples');
      recommendations.push('⚡ Implémenter cache plus agressif');
      recommendations.push('🎯 Skip contexte pour requêtes < 10 mots');
    }

    if (report.averages.voiceGeneration > 1500) {
      recommendations.push('🎤 Traitement parallèle audio + réponse');
      recommendations.push('🔊 Cache audio pour phrases communes');
    }

    if (report.averages.contextLoading > 300) {
      recommendations.push('📚 Réduire snapshots de contexte à 2');
      recommendations.push('💾 Cache contexte en mémoire');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance acceptable - surveillance continue');
    }

    recommendations.forEach(rec => console.log(`   ${rec}`));
  }

  async runContinuousMonitoring(iterations = 10) {
    console.log(`\n🔄 Monitoring continu (${iterations} itérations)\n`);
    
    for (let i = 0; i < iterations; i++) {
      const scenario = this.testScenarios[i % this.testScenarios.length];
      const result = await this.runScenario(scenario);
      
      console.log(`[${i+1}/${iterations}] ${scenario.name}: ${result.totalTime}ms ${result.success ? '✅' : '❌'}`);
      
      // Pause entre tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n📈 Monitoring terminé - Génération rapport...');
    this.generateReport();
  }
}

// Script principal
async function main() {
  console.log('🎯 PRISM Voice Performance Audit');
  console.log('Analyse TDD des performances du chat vocal\n');

  const tester = new VoicePerformanceTest();

  // Tests de base
  await tester.runPerformanceTests();

  // Option monitoring continu
  const args = process.argv.slice(2);
  if (args.includes('--monitor')) {
    const iterations = Number.parseInt(args.find(arg => arg.startsWith('--iterations='))?.split('=')[1]) || 10;
    await tester.runContinuousMonitoring(iterations);
  }

  console.log('\n🏁 Tests terminés');
}

main().catch(console.error); 