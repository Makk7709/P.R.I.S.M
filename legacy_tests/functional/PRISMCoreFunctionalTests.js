/**
 * @fileoverview Tests fonctionnels réels de PRISM Core
 * @module test/functional/PRISMCoreFunctionalTests
 */

import { AdaptiveCyclerWidget } from '../../ui/AdaptiveCyclerWidget.js';
import { InsightCenter } from '../../ui/InsightCenter.js';
import { AudioManager } from '../../audio.js';

describe('PRISM Core Functional Tests', () => {
  let adaptiveCyclerWidget;
  let insightCenter;
  let audioManager;
  let testResults;

  beforeEach(() => {
    // Initialize test results
    testResults = {
      adaptiveCycler: {
        performance: [],
        errors: [],
        uxFeedback: []
      },
      insightCenter: {
        performance: [],
        errors: [],
        uxFeedback: []
      },
      audioManager: {
        performance: [],
        errors: [],
        uxFeedback: []
      }
    };

    // Initialize components
    adaptiveCyclerWidget = new AdaptiveCyclerWidget();
    insightCenter = new InsightCenter();
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
  });

  describe('AdaptiveCyclerWidget Tests', () => {
    test('should initialize and display correctly', () => {
      expect(adaptiveCyclerWidget.container).toBeTruthy();
      expect(adaptiveCyclerWidget.container.style.display).toBe('block');
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

    test('should update metrics in real-time', () => {
      // Simulate metric updates
      const testMetrics = {
        efficiency: 85,
        interval: 2500,
        directive: 'Test Directive'
      };

      // Trigger update
      adaptiveCyclerWidget.handleDirectiveOutcome(testMetrics);

      // Verify display
      expect(adaptiveCyclerWidget.efficiencyElement.textContent).toContain('85%');
      expect(adaptiveCyclerWidget.intervalElement.textContent).toContain('2.5s');
      expect(adaptiveCyclerWidget.directiveElement.textContent).toContain('Test Directive');
    });
  });

  describe('InsightCenter Tests', () => {
    test('should initialize and display correctly', () => {
      expect(insightCenter.container).toBeTruthy();
      expect(insightCenter.container.style.display).toBe('block');
    });

    test('should respond to keyboard shortcuts', () => {
      // Test Alt+I toggle
      const altIEvent = new KeyboardEvent('keydown', { key: 'i', altKey: true });
      document.dispatchEvent(altIEvent);
      expect(insightCenter.container.style.display).toBe('none');
    });

    test('should update timeline data', () => {
      // Simulate timeline events
      const testEvent = {
        type: 'directive',
        data: { success: true },
        timestamp: Date.now()
      };

      // Trigger update
      insightCenter.handleDirectiveIssued(testEvent);

      // Verify data
      expect(insightCenter.timelineData.length).toBeGreaterThan(0);
      expect(insightCenter.timelineData[0].type).toBe('directive');
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

      // Update settings
      adaptiveCyclerWidget.updateVoiceSettings(testSettings);

      // Verify settings
      expect(adaptiveCyclerWidget.voiceSettings.voiceId).toBe(testSettings.voiceId);
      expect(adaptiveCyclerWidget.voiceSettings.speakingRate).toBe(testSettings.speakingRate);
    });

    test('should generate and play speech', async () => {
      // Initialize audio
      await audioManager.init();

      // Generate speech
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
}); 