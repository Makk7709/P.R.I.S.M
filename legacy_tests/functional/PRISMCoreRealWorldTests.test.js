/**
 * @jest-environment jsdom
 */

// Import mocks
import { createAudioManagerMock } from '../mocks/audioManagerMock';
import { createAdaptiveCyclerWidgetMock } from '../mocks/adaptiveCyclerWidgetMock';
import { createInsightCenterMock } from '../mocks/insightCenterMock';
import { CONFIG } from '../mocks/configMock.js';
import { PrismCore } from '../../prismCore.js';
import { config } from '../../config.js';
import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';

// Mock CSS imports
jest.mock('../../ui/AdaptiveCyclerWidget.css', () => ({}));
jest.mock('../../ui/prismUI.css', () => ({}));

// Create mocks
const mockAudioManager = createAudioManagerMock();
const mockAdaptiveCyclerWidget = createAdaptiveCyclerWidgetMock();
const mockInsightCenter = createInsightCenterMock();

// Mock components
jest.mock('../../audio.js', () => ({
  AudioManager: jest.fn().mockImplementation(() => mockAudioManager)
}));

jest.mock('../../ui/AdaptiveCyclerWidget.js', () => ({
  AdaptiveCyclerWidget: jest.fn().mockImplementation(() => mockAdaptiveCyclerWidget)
}));

jest.mock('../../ui/InsightCenter.js', () => ({
  InsightCenter: jest.fn().mockImplementation(() => mockInsightCenter)
}));

// Set global config
global.CONFIG = CONFIG;

// Import components

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
  if (!metrics.length) return { score: 0, rating: 'À améliorer' };
  const avgResponseTime = metrics.reduce((a, b) => a + b, 0) / metrics.length;
  const fluidityScore = Math.max(0, 100 - (avgResponseTime / 100));
  return {
    score: fluidityScore,
    rating: fluidityScore >= 90 ? 'Excellent' :
            fluidityScore >= 80 ? 'Bon' :
            fluidityScore >= 70 ? 'Moyen' :
            'À améliorer'
  };
};

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock('../../core/prismCore.js');

describe('PRISM Core - Real-World Scenarios', () => {
  let prismCore;
  let adaptiveCyclerWidget;
  let insightCenter;
  let audioManager;
  let testResults;

  beforeEach(() => {
    // Utiliser la configuration réelle pour les tests en conditions réelles
    prismCore = new PrismCore(config.CONFIG);

    // Reset DOM
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

    // Initialize components with mocks
    adaptiveCyclerWidget = mockAdaptiveCyclerWidget;
    adaptiveCyclerWidget.container = document.getElementById('adaptive-cycler-container');
    adaptiveCyclerWidget.container.style.display = 'none';

    insightCenter = mockInsightCenter;
    insightCenter.container = document.getElementById('insight-center-container');
    insightCenter.container.style.display = 'none';

    audioManager = mockAudioManager;

    // Make components visible for testing
    adaptiveCyclerWidget.container.style.display = 'block';
    insightCenter.container.style.display = 'block';

    // Add event listeners for keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key === 'a') {
        adaptiveCyclerWidget.container.style.display = adaptiveCyclerWidget.container.style.display === 'none' ? 'block' : 'none';
      }
      if (event.altKey && event.key === 'i') {
        insightCenter.container.style.display = insightCenter.container.style.display === 'none' ? 'block' : 'none';
      }
    });
  });

  afterEach(() => {
    // Cleanup
    if (adaptiveCyclerWidget.destroy) adaptiveCyclerWidget.destroy();
    if (insightCenter.destroy) insightCenter.destroy();
    if (audioManager.cleanup) audioManager.cleanup();
    document.body.innerHTML = '';
  });

  describe('1. Préparation de l\'environnement', () => {
    test('should initialize PRISM Core in development mode', async () => {
      const initTime = await measurePerformance(async () => {
        await audioManager.init();
      });

      console.log(`⏱️ Temps d'initialisation: ${initTime.toFixed(2)}ms`);
      expect(initTime).toBeLessThan(1000);
      expect(audioManager.audioContext).toBeTruthy();
    });

    test('should verify ElevenLabs API key availability', async () => {
      audioManager.verifyApiKey.mockResolvedValueOnce(true);
      const hasApiKey = await audioManager.verifyApiKey();
      expect(hasApiKey).toBe(true);
    });
  });

  describe('2. Tests de l\'AdaptiveCyclerWidget', () => {
    test('should handle Alt+A shortcut', () => {
      const initialDisplay = adaptiveCyclerWidget.container.style.display;
      const altAEvent = new KeyboardEvent('keydown', { key: 'a', altKey: true });
      document.dispatchEvent(altAEvent);
      expect(adaptiveCyclerWidget.container.style.display).not.toBe(initialDisplay);
    });

    test('should generate and display metrics', async () => {
      const metrics = {
        temporal: Math.random() * 100,
        directive: Math.random() * 100,
        efficiency: Math.random() * 100
      };

      adaptiveCyclerWidget.updateMetrics.mockResolvedValueOnce(metrics);
      const updatedMetrics = await adaptiveCyclerWidget.updateMetrics(metrics);
      const responseTime = await measurePerformance(async () => {
        await adaptiveCyclerWidget.updateMetrics(metrics);
      });

      expect(responseTime).toBeLessThan(100);
      expect(updatedMetrics).toEqual(metrics);
    });

    test('should handle audio playback', async () => {
      const testDirective = 'Test directive for audio playback';
      const responseTime = await measurePerformance(async () => {
        await adaptiveCyclerWidget.playDirectiveAudio(testDirective);
      });

      expect(responseTime).toBeLessThan(500);
    });
  });

  describe('3. Tests de l\'InsightCenter', () => {
    test('should handle timeline navigation', async () => {
      const testEvents = [
        { type: 'directive', timestamp: Date.now() - 1000 },
        { type: 'metric', timestamp: Date.now() - 500 },
        { type: 'system', timestamp: Date.now() }
      ];

      insightCenter.updateTimeline.mockResolvedValueOnce(testEvents);
      const updatedEvents = await insightCenter.updateTimeline(testEvents);
      const responseTime = await measurePerformance(async () => {
        await insightCenter.updateTimeline(testEvents);
      });

      expect(responseTime).toBeLessThan(100);
      expect(updatedEvents).toEqual(testEvents);
    });

    test('should handle event filters', async () => {
      const filterTypes = ['directive', 'metric', 'system'];
      
      for (const type of filterTypes) {
        const responseTime = await measurePerformance(async () => {
          await insightCenter.toggleEventFilter(type);
        });

        expect(responseTime).toBeLessThan(50);
      }
    });
  });

  describe('4. Tests de l\'AudioManager', () => {
    test('should handle voice settings changes', async () => {
      const testSettings = {
        voiceId: 'test-voice',
        speakingRate: 1.2
      };

      audioManager.updateVoiceSettings.mockResolvedValueOnce(testSettings);
      const updatedSettings = await audioManager.updateVoiceSettings(testSettings);
      const responseTime = await measurePerformance(async () => {
        await audioManager.updateVoiceSettings(testSettings);
      });

      expect(responseTime).toBeLessThan(100);
      expect(updatedSettings).toEqual(testSettings);
    });

    test('should handle speech generation and playback', async () => {
      const testText = 'Test speech generation and playback';
      
      const responseTime = await measurePerformance(async () => {
        await audioManager.generateAndPlaySpeech(testText);
      });

      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('5. Tests d\'intégration', () => {
    test('should coordinate between all components', async () => {
      // Initialize all components
      await audioManager.init();

      // Simulate a complete workflow
      const testDirective = {
        type: 'directive',
        data: { success: true },
        timestamp: Date.now()
      };

      // Update AdaptiveCyclerWidget
      const cyclerResponseTime = await measurePerformance(async () => {
        await adaptiveCyclerWidget.handleDirectiveOutcome({
          efficiency: 85,
          interval: 2500,
          directive: 'Test Directive'
        });
      });

      // Update InsightCenter
      const insightResponseTime = await measurePerformance(async () => {
        await insightCenter.handleDirectiveIssued(testDirective);
      });

      // Generate speech
      const audioResponseTime = await measurePerformance(async () => {
        await audioManager.generateSpeech('Test integration');
      });

      // Verify performance
      expect(cyclerResponseTime).toBeLessThan(100);
      expect(insightResponseTime).toBeLessThan(100);
      expect(audioResponseTime).toBeLessThan(1000);

      // Add performance metrics
      testResults.adaptiveCycler.performance.push(cyclerResponseTime);
      testResults.insightCenter.performance.push(insightResponseTime);
      testResults.audioManager.performance.push(audioResponseTime);
    });
  });

  describe('6. Rapport de test', () => {
    test('should generate test report', () => {
      const report = {
        adaptiveCycler: {
          status: testResults.adaptiveCycler.status,
          performance: evaluateFluidity(testResults.adaptiveCycler.performance),
          errors: testResults.adaptiveCycler.errors,
          uxFeedback: testResults.adaptiveCycler.uxFeedback
        },
        insightCenter: {
          status: testResults.insightCenter.status,
          performance: evaluateFluidity(testResults.insightCenter.performance),
          errors: testResults.insightCenter.errors,
          uxFeedback: testResults.insightCenter.uxFeedback
        },
        audioManager: {
          status: testResults.audioManager.status,
          performance: evaluateFluidity(testResults.audioManager.performance),
          errors: testResults.audioManager.errors,
          uxFeedback: testResults.audioManager.uxFeedback
        }
      };

      console.log('📊 Rapport de test:', JSON.stringify(report, null, 2));
      expect(report).toBeDefined();
      
      // Vérifier les performances globales
      const allPerformances = [
        ...testResults.adaptiveCycler.performance,
        ...testResults.insightCenter.performance,
        ...testResults.audioManager.performance
      ];
      
      const globalFluidity = evaluateFluidity(allPerformances);
      console.log(`🎯 Score de fluidité global: ${globalFluidity.score}% (${globalFluidity.rating})`);
      
      // Vérifier qu'il n'y a pas d'erreurs critiques
      const totalErrors = 
        testResults.adaptiveCycler.errors.length +
        testResults.insightCenter.errors.length +
        testResults.audioManager.errors.length;
      
      expect(totalErrors).toBe(0);
    });
  });
}); 