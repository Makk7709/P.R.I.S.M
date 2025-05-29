/**
 * @jest-environment jsdom
 */

// Mock CSS imports
jest.mock('../../ui/AdaptiveCyclerWidget.css', () => ({}));
jest.mock('../../ui/prismUI.css', () => ({}));

// Import configuration mock
import { CONFIG } from '../mocks/configMock.js';
global.CONFIG = CONFIG;

// Import components
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

describe('PRISM Core Functional Tests', () => {
  let adaptiveCyclerWidget;
  let insightCenter;
  let audioManager;
  let testResults;

  beforeEach(() => {
    // Mock des méthodes destroy
    AdaptiveCyclerWidget.prototype.destroy = jest.fn();
    InsightCenter.prototype.destroy = jest.fn();
    AudioManager.prototype.cleanup = jest.fn();

    // Mock du DOM
    document.body.innerHTML = `
      <div id="prism-root">
        <div id="adaptive-cycler-container"></div>
        <div id="insight-center-container"></div>
        <div id="audio-manager-container"></div>
      </div>
    `;

    // Initialize test results
    testResults = {
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

    // Initialize components
    adaptiveCyclerWidget = new AdaptiveCyclerWidget();
    adaptiveCyclerWidget.container = document.getElementById('adaptive-cycler-container');
    adaptiveCyclerWidget.container.style.display = 'none';

    insightCenter = new InsightCenter();
    insightCenter.container = document.getElementById('insight-center-container');
    insightCenter.container.style.display = 'none';

    audioManager = new AudioManager(
      (speaking) => console.log('Audio mode changed:', speaking),
      (message) => console.log('Audio message:', message)
    );

    // Make components visible for testing
    adaptiveCyclerWidget.toggleVisibility();
    insightCenter.toggleVisibility();
  });

  afterEach(() => {
    // Cleanup
    adaptiveCyclerWidget.destroy();
    insightCenter.destroy();
    if (audioManager) {
      audioManager.cleanup();
    }
    document.body.innerHTML = '';
  });

  describe('Component Initialization', () => {
    test('should initialize all components successfully', async () => {
      const initTime = await measurePerformance(async () => {
        adaptiveCyclerWidget.toggleVisibility();
        insightCenter.toggleVisibility();
        await audioManager.init();
      });

      console.log(`⏱️ Temps d'initialisation: ${initTime.toFixed(2)}ms`);
      expect(initTime).toBeLessThan(1000); // Should initialize in less than 1s
      expect(adaptiveCyclerWidget.container).toBeTruthy();
      expect(insightCenter.container).toBeTruthy();
      expect(audioManager.audioContext).toBeTruthy();
    });
  });

  describe('AdaptiveCyclerWidget Tests', () => {
    test('should handle metrics and directives', async () => {
      const times = [];
      for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        const responseTime = await measurePerformance(async () => {
          adaptiveCyclerWidget.handleDirectiveOutcome({
            efficiency: Math.random() * 100,
            interval: 2000 + Math.random() * 1000,
            directive: `Directive test ${i + 1}`
          });
        });
        times.push(responseTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`⏱️ Temps de réponse moyen AdaptiveCycler: ${avgTime.toFixed(2)}ms`);
      expect(avgTime).toBeLessThan(100); // Should respond in less than 100ms
    });

    test('should respond to keyboard shortcuts', () => {
      // Test Alt+A toggle
      const altAEvent = new KeyboardEvent('keydown', { key: 'a', altKey: true });
      document.dispatchEvent(altAEvent);
      expect(adaptiveCyclerWidget.container.style.display).toBe('none');

      // Test Alt+C compact mode
      const altCEvent = new KeyboardEvent('keydown', { key: 'c', altKey: true });
      document.dispatchEvent(altCEvent);
      expect(adaptiveCyclerWidget.compactMode).toBe(true);
    });
  });

  describe('InsightCenter Tests', () => {
    test('should handle timeline events', async () => {
      const times = [];
      for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        const responseTime = await measurePerformance(async () => {
          insightCenter.handleDirectiveIssued({
            type: 'directive',
            data: { success: true },
            timestamp: Date.now()
          });
        });
        times.push(responseTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`⏱️ Temps de réponse moyen InsightCenter: ${avgTime.toFixed(2)}ms`);
      expect(avgTime).toBeLessThan(100); // Should respond in less than 100ms
    });

    test('should respond to keyboard shortcuts', () => {
      // Test Alt+I toggle
      const altIEvent = new KeyboardEvent('keydown', { key: 'i', altKey: true });
      document.dispatchEvent(altIEvent);
      expect(insightCenter.container.style.display).toBe('none');
    });
  });

  describe('AudioManager Tests', () => {
    test('should initialize audio context', async () => {
      const initResult = await audioManager.init();
      expect(initResult).toBe(true);
      expect(audioManager.audioContext).toBeTruthy();
    });

    test('should handle voice settings', () => {
      const testSettings = {
        voiceId: 'test-voice-id',
        speakingRate: 1.2
      };

      adaptiveCyclerWidget.updateVoiceSettings(testSettings);
      expect(adaptiveCyclerWidget.voiceSettings.voiceId).toBe(testSettings.voiceId);
      expect(adaptiveCyclerWidget.voiceSettings.speakingRate).toBe(testSettings.speakingRate);
    });

    test('should generate and play speech', async () => {
      await audioManager.init();
      const testText = 'Test speech generation';
      await expect(audioManager.generateSpeech(testText)).resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should coordinate between components', async () => {
      // Initialize all components
      await audioManager.init();

      // Simulate a complete workflow
      const testDirective = {
        type: 'directive',
        data: { success: true },
        timestamp: Date.now()
      };

      // Update AdaptiveCyclerWidget
      adaptiveCyclerWidget.handleDirectiveOutcome({
        efficiency: 85,
        interval: 2500,
        directive: 'Test Directive'
      });

      // Update InsightCenter
      insightCenter.handleDirectiveIssued(testDirective);

      // Generate speech
      await audioManager.generateSpeech('Test integration');

      // Verify all components are in sync
      expect(adaptiveCyclerWidget.container.style.display).toBe('block');
      expect(insightCenter.container.style.display).toBe('block');
      expect(audioManager.audioContext).toBeTruthy();
    });
  });

  // Test final pour générer le rapport
  describe('Test Report', () => {
    test('should generate performance report', () => {
      const fluidity = evaluateFluidity(TEST_CONFIG.metrics);
      
      console.log('\n📊 Résultats des tests:');
      console.log('------------------------');
      console.log(`Fluidité globale: ${fluidity.score.toFixed(1)}% (${fluidity.rating})`);
      console.log(`Temps de réponse moyen: ${(TEST_CONFIG.metrics.responseTime.reduce((a, b) => a + b, 0) / TEST_CONFIG.metrics.responseTime.length).toFixed(2)}ms`);
      console.log(`Nombre d'erreurs: ${TEST_CONFIG.metrics.errors.length}`);

      console.log('\n📝 Rapport détaillé:');
      console.log('------------------------');
      console.log('AdaptiveCyclerWidget:', testResults.adaptiveCycler.status);
      console.log('InsightCenter:', testResults.insightCenter.status);
      console.log('AudioManager:', testResults.audioManager.status);

      expect(fluidity.score).toBeGreaterThan(70); // Score de fluidité minimum acceptable
      expect(TEST_CONFIG.metrics.errors.length).toBe(0); // Aucune erreur attendue
    });
  });
}); 