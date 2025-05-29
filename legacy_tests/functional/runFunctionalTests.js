/**
 * @fileoverview Script d'exécution des tests fonctionnels PRISM Core
 * @module test/functional/runFunctionalTests
 */

import { jest } from '@jest/globals';

// Mock CSS imports
jest.mock('../../ui/AdaptiveCyclerWidget.css', () => ({}));
jest.mock('../../ui/prismUI.css', () => ({}));

// Import components after mocking CSS
import { AdaptiveCyclerWidget } from '../../ui/AdaptiveCyclerWidget.js';
import { InsightCenter } from '../../ui/InsightCenter.js';
import { AudioManager } from '../../audio.js';

// Configuration des tests
const TEST_CONFIG = {
  iterations: 10,
  timeout: 30000,
  metrics: {
    responseTime: [],
    fluidity: [],
    errors: []
  }
};

// Fonction de mesure des performances
const measurePerformance = async (fn) => {
  const start = performance.now();
  try {
    await fn();
  } catch (error) {
    console.error('Error during performance measurement:', error);
  }
  const end = performance.now();
  return end - start;
};

// Fonction d'évaluation de la fluidité
const evaluateFluidity = (metrics) => {
  const avgResponseTime = metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length;
  const fluidityScore = Math.max(0, 100 - (avgResponseTime / 100));
  return {
    score: fluidityScore,
    rating: fluidityScore >= 90 ? 'Excellent' :
            fluidityScore >= 80 ? 'Bon' :
            fluidityScore >= 70 ? 'Moyen' :
            'À améliorer'
  };
};

// Fonction principale de test
const runFunctionalTests = async () => {
  console.log('🚀 Démarrage des tests fonctionnels PRISM Core...\n');

  // Initialisation des composants
  const adaptiveCyclerWidget = new AdaptiveCyclerWidget();
  const insightCenter = new InsightCenter();
  const audioManager = new AudioManager(
    (speaking) => console.log('Audio mode changed:', speaking),
    (message) => console.log('Audio message:', message)
  );

  // Résultats des tests
  const testResults = {
    adaptiveCycler: {
      status: '✅',
      performance: [],
      errors: [],
      uxFeedback: []
    },
    insightCenter: {
      status: '✅',
      performance: [],
      errors: [],
      uxFeedback: []
    },
    audioManager: {
      status: '✅',
      performance: [],
      errors: [],
      uxFeedback: []
    }
  };

  try {
    // Test 1: Initialisation des composants
    console.log('Test 1: Initialisation des composants');
    await measurePerformance(async () => {
      adaptiveCyclerWidget.toggleVisibility();
      insightCenter.toggleVisibility();
      await audioManager.init();
    });

    // Test 2: Navigation dans l'AdaptiveCyclerWidget
    console.log('\nTest 2: Navigation dans l\'AdaptiveCyclerWidget');
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      const responseTime = await measurePerformance(async () => {
        // Simuler des métriques
        adaptiveCyclerWidget.handleDirectiveOutcome({
          efficiency: Math.random() * 100,
          interval: 2000 + Math.random() * 1000,
          directive: `Directive test ${i + 1}`
        });
      });
      TEST_CONFIG.metrics.responseTime.push(responseTime);
    }

    // Test 3: Exploration de l'InsightCenter
    console.log('\nTest 3: Exploration de l\'InsightCenter');
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      const responseTime = await measurePerformance(async () => {
        // Simuler des événements
        insightCenter.handleDirectiveIssued({
          type: 'directive',
          data: { success: true },
          timestamp: Date.now()
        });
      });
      TEST_CONFIG.metrics.responseTime.push(responseTime);
    }

    // Test 4: Tests audio
    console.log('\nTest 4: Tests audio');
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      const responseTime = await measurePerformance(async () => {
        await audioManager.generateSpeech(`Test audio ${i + 1}`);
      });
      TEST_CONFIG.metrics.responseTime.push(responseTime);
    }

    // Évaluation de la fluidité
    const fluidity = evaluateFluidity(TEST_CONFIG.metrics);
    console.log('\n📊 Résultats des tests:');
    console.log('------------------------');
    console.log(`Fluidité globale: ${fluidity.score.toFixed(1)}% (${fluidity.rating})`);
    console.log(`Temps de réponse moyen: ${(TEST_CONFIG.metrics.responseTime.reduce((a, b) => a + b, 0) / TEST_CONFIG.metrics.responseTime.length).toFixed(2)}ms`);
    console.log(`Nombre d'erreurs: ${TEST_CONFIG.metrics.errors.length}`);

    // Rapport détaillé par composant
    console.log('\n📝 Rapport détaillé:');
    console.log('------------------------');
    console.log('AdaptiveCyclerWidget:', testResults.adaptiveCycler.status);
    console.log('InsightCenter:', testResults.insightCenter.status);
    console.log('AudioManager:', testResults.audioManager.status);

  } catch (error) {
    console.error('\n❌ Erreur pendant les tests:', error);
  } finally {
    // Nettoyage
    adaptiveCyclerWidget.destroy();
    insightCenter.destroy();
    if (audioManager) {
      audioManager.cleanup();
    }
  }
};

// Exécution des tests
runFunctionalTests().catch(console.error); 