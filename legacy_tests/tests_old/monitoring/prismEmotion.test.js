/**
 * @fileoverview Tests pour le module PrismEmotion
 */

import { PrismEmotion } from '../../dist/monitoring/prismEmotion.js';
import kernelBus from '../../core/KernelBus.js';

describe('PrismEmotion', () => {
  let emotion;
  let mockEmit;

  beforeEach(() => {
    emotion = new PrismEmotion();
    mockEmit = jest.spyOn(kernelBus, 'emit');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 1. TESTS D'INITIALISATION
  describe('Initialization', () => {
    test('should initialize with correct version', () => {
      expect(emotion.version).toBe('1.0.0');
    });

    test('should initialize with default thresholds', () => {
      expect(emotion.criticalThreshold).toBe(0.8);
      expect(emotion.adaptiveThreshold).toBe(0.5);
    });

    test('should initialize with default state', () => {
      expect(emotion.currentState).toBe('calme');
    });
  });

  // 2. TESTS D'INTERPRÉTATION DE LA TENSION
  describe('Tension Interpretation', () => {
    test('should detect calm state with low intent and volatility', () => {
      const state = emotion.interpretTension(0.3, 0.2);
      expect(state).toBe('calme');
    });

    test('should detect agitation state with moderate intent and volatility', () => {
      const state = emotion.interpretTension(0.6, 0.5);
      expect(state).toBe('agitation');
    });

    test('should detect crisis state with high intent and volatility', () => {
      const state = emotion.interpretTension(0.9, 0.8);
      expect(state).toBe('crise');
    });

    test('should handle edge cases correctly', () => {
      expect(emotion.interpretTension(0.5, 0.5)).toBe('agitation');
      expect(emotion.interpretTension(0.8, 0.8)).toBe('crise');
      expect(emotion.interpretTension(0.4, 0.4)).toBe('calme');
    });
  });

  // 3. TESTS D'AJUSTEMENT DE SEUILS
  describe('Threshold Adjustments', () => {
    test('should adjust thresholds for calm state', () => {
      emotion.adjustIntentThresholds('calme');
      expect(emotion.criticalThreshold).toBeGreaterThan(0.8);
      expect(emotion.adaptiveThreshold).toBeLessThan(0.5);
    });

    test('should adjust thresholds for agitation state', () => {
      emotion.adjustIntentThresholds('agitation');
      expect(emotion.criticalThreshold).toBeLessThan(0.8);
      expect(emotion.adaptiveThreshold).toBeGreaterThan(0.5);
    });

    test('should adjust thresholds for crisis state', () => {
      emotion.adjustIntentThresholds('crise');
      expect(emotion.criticalThreshold).toBeLessThan(0.7);
      expect(emotion.adaptiveThreshold).toBeGreaterThan(0.6);
    });

    test('should maintain threshold bounds', () => {
      // Test multiple adjustments to ensure bounds are maintained
      for (let i = 0; i < 10; i++) {
        emotion.adjustIntentThresholds('crise');
      }
      expect(emotion.criticalThreshold).toBeGreaterThanOrEqual(0.5);
      expect(emotion.criticalThreshold).toBeLessThanOrEqual(0.9);
      expect(emotion.adaptiveThreshold).toBeGreaterThanOrEqual(0.3);
      expect(emotion.adaptiveThreshold).toBeLessThanOrEqual(0.7);
    });
  });

  // 4. TESTS D'ÉMISSION D'ÉVÉNEMENTS
  describe('Event Emission', () => {
    test('should emit state change event when state changes', () => {
      emotion.updateState('agitation');
      expect(mockEmit).toHaveBeenCalledWith(
        'prism:emotion:stateChanged',
        expect.objectContaining({
          state: 'agitation',
          timestamp: expect.any(Number),
          adjustments: expect.any(Object)
        })
      );
    });

    test('should not emit event when state remains the same', () => {
      emotion.updateState('calme');
      emotion.updateState('calme');
      expect(mockEmit).toHaveBeenCalledTimes(1);
    });

    test('should include correct adjustment data in event payload', () => {
      emotion.updateState('crise');
      const eventPayload = mockEmit.mock.calls[0][1];
      expect(eventPayload.adjustments).toHaveProperty('criticalThreshold');
      expect(eventPayload.adjustments).toHaveProperty('adaptiveThreshold');
    });
  });

  // 5. TESTS DE STABILITÉ
  describe('Stability Tests', () => {
    test('should handle rapid intent changes without state oscillation', () => {
      const intents = [0.9, 0.2, 0.8, 0.3, 0.7];
      const volatilities = [0.8, 0.3, 0.7, 0.4, 0.6];
      
      intents.forEach((intent, index) => {
        emotion.processIntent(intent, volatilities[index]);
      });

      // Vérifier que le nombre d'événements émis est raisonnable
      expect(mockEmit).toHaveBeenCalledTimes(expect.any(Number));
      expect(mockEmit).toHaveBeenCalledTimes(expect.lessThanOrEqual(3));
    });

    test('should maintain state stability under constant high load', () => {
      for (let i = 0; i < 100; i++) {
        emotion.processIntent(0.9, 0.8);
      }
      
      // Vérifier que l'état final est cohérent
      expect(emotion.currentState).toBe('crise');
      // Vérifier que les seuils sont stables
      expect(emotion.criticalThreshold).toBeGreaterThanOrEqual(0.5);
      expect(emotion.adaptiveThreshold).toBeLessThanOrEqual(0.7);
    });
  });

  // 6. TESTS DE COUVERTURE GLOBALE
  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid intent values', () => {
      expect(() => emotion.processIntent(-0.1, 0.5)).toThrow();
      expect(() => emotion.processIntent(1.1, 0.5)).toThrow();
    });

    test('should handle invalid volatility values', () => {
      expect(() => emotion.processIntent(0.5, -0.1)).toThrow();
      expect(() => emotion.processIntent(0.5, 1.1)).toThrow();
    });

    test('should handle invalid state transitions', () => {
      expect(() => emotion.updateState('invalid_state')).toThrow();
    });

    test('should handle null or undefined inputs', () => {
      expect(() => emotion.processIntent(null, 0.5)).toThrow();
      expect(() => emotion.processIntent(0.5, undefined)).toThrow();
    });
  });
}); 