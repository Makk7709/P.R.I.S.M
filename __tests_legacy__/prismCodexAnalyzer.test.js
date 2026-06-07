/**
 * @fileoverview Tests unitaires pour le module prismCodexAnalyzer
 */

import { jest } from '@jest/globals';
import { detectBehavioralTrends, predictNextState } from '../memory/prismCodexAnalyzer.js';
import { PrismCodexAnalyzer } from '../memory/prismCodexAnalyzer.js';

// Configuration des timers factices
jest.useFakeTimers();

describe('PrismCodexAnalyzer', () => {
  // Données de test
  const generateTestEvents = (count, type = 'normal') => {
    const events = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const timestamp = now - (count - i) * 1000; // 1 seconde entre chaque événement
      
      let severity;
      switch (type) {
        case 'improvement':
          severity = i < count / 2 ? 'high' : 'low';
          break;
        case 'deterioration':
          severity = i < count / 2 ? 'low' : 'high';
          break;
        case 'collapse':
          severity = i < count * 0.8 ? 'low' : 'critical';
          break;
        default:
          severity = 'medium';
      }
      
      events.push({
        id: `event-${i}`,
        timestamp,
        type: 'behavior',
        severity,
        data: {
          confidence: 0.8,
          metrics: {
            stability: 0.7,
            coherence: 0.6,
            adaptability: 0.5
          }
        }
      });
    }
    
    return events;
  };

  describe('Comportement normal', () => {
    test('analyse d\'un historique d\'événements simulé', () => {
      const events = generateTestEvents(100);
      const trends = detectBehavioralTrends(events);
      
      expect(trends).toBeDefined();
      expect(trends.overallTrend).toBeDefined();
      expect(trends.metrics).toBeDefined();
      expect(trends.anomalies).toBeDefined();
    });

    test('détection correcte d\'une dérive comportementale', () => {
      const events = generateTestEvents(100, 'deterioration');
      const trends = detectBehavioralTrends(events);
      
      expect(trends.overallTrend).toBe('deteriorating');
      expect(trends.metrics.stability.trend).toBe('decreasing');
      expect(trends.anomalies.length).toBeGreaterThan(0);
    });

    test('détection correcte d\'une amélioration progressive', () => {
      const events = generateTestEvents(100, 'improvement');
      const trends = detectBehavioralTrends(events);
      
      expect(trends.overallTrend).toBe('improving');
      expect(trends.metrics.stability.trend).toBe('increasing');
      expect(trends.anomalies.length).toBe(0);
    });

    test('prédiction correcte d\'un risque d\'effondrement', () => {
      const events = generateTestEvents(100, 'collapse');
      const prediction = predictNextState(events);
      
      expect(prediction.riskLevel).toBe('high');
      expect(prediction.probability).toBeGreaterThan(0.7);
      expect(prediction.timeframe).toBeDefined();
    });
  });

  describe('Performances', () => {
    test('analyse de 10 000 événements en moins de 500 ms', () => {
      const events = generateTestEvents(10000);
      
      const startTime = performance.now();
      detectBehavioralTrends(events);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500);
    });

    test('contrôle de la charge mémoire pendant l\'analyse', () => {
      const events = generateTestEvents(10000);
      
      const initialMemory = process.memoryUsage().heapUsed;
      detectBehavioralTrends(events);
      const finalMemory = process.memoryUsage().heapUsed;
      
      // La consommation mémoire ne devrait pas augmenter de plus de 50MB
      expect(finalMemory - initialMemory).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Robustesse', () => {
    test('comportement correct sur un historique vide', () => {
      const trends = detectBehavioralTrends([]);
      
      expect(trends.overallTrend).toBe('stable');
      expect(trends.metrics).toBeDefined();
      expect(trends.anomalies).toHaveLength(0);
    });

    test('comportement correct si événements invalides', () => {
      const invalidEvents = [
        { id: 'invalid-1', timestamp: Date.now() }, // Manque type et severity
        { id: 'invalid-2', type: 'unknown', severity: 'invalid' }, // Type et severity invalides
        { id: 'invalid-3', type: 'behavior', severity: 'high', data: {} } // Données manquantes
      ];
      
      const trends = detectBehavioralTrends(invalidEvents);
      
      expect(trends.overallTrend).toBe('stable');
      expect(trends.anomalies).toHaveLength(3);
      expect(trends.anomalies[0].type).toBe('invalid_event');
    });

    test('gestion des événements malformés', () => {
      const malformedEvents = [
        null,
        undefined,
        { id: 'malformed-1', timestamp: 'invalid-date' },
        { id: 'malformed-2', timestamp: Date.now(), severity: 123 } // Type incorrect
      ];
      
      const trends = detectBehavioralTrends(malformedEvents);
      
      expect(trends.overallTrend).toBe('stable');
      expect(trends.anomalies).toHaveLength(4);
      expect(trends.anomalies.every(a => a.type === 'invalid_event')).toBe(true);
    });
  });

  describe('Détection des patterns émergents', () => {
    let analyzer;
    let mockEmit;

    beforeEach(() => {
      mockEmit = jest.fn();
      analyzer = new PrismCodexAnalyzer({ patternSensitivity: 3 });
      analyzer.eventBuffer = [];
      global.prismBus = { emit: mockEmit };
    });

    test('détecte un pattern de dérive', async () => {
      // Génération d'une séquence de 5 dérives
      const driftEvents = new Array(5).fill().map((_, i) => ({
        id: `drift-${i}`,
        timestamp: Date.now() - (5 - i) * 1000,
        type: 'drift',
        severity: 'high',
        data: { impact: -0.8 }
      }));

      analyzer.eventBuffer = driftEvents;
      await analyzer._detectEmergentPatterns();

      expect(mockEmit).toHaveBeenCalledWith(
        'prism:codex:emergentPatternDetected',
        expect.objectContaining({
          type: 'drift',
          count: 5
        })
      );
    });

    test('ne détecte pas de pattern si insuffisant d\'événements', async () => {
      // Génération de seulement 2 dérives
      const driftEvents = new Array(2).fill().map((_, i) => ({
        id: `drift-${i}`,
        timestamp: Date.now() - (2 - i) * 1000,
        type: 'drift',
        severity: 'high',
        data: { impact: -0.8 }
      }));

      analyzer.eventBuffer = driftEvents;
      await analyzer._detectEmergentPatterns();

      expect(mockEmit).not.toHaveBeenCalled();
    });

    test('respecte la sensibilité personnalisée', async () => {
      // Création d'un analyseur avec une sensibilité de 4
      const customAnalyzer = new PrismCodexAnalyzer({ patternSensitivity: 4 });
      customAnalyzer.eventBuffer = [];

      // Génération de 3 dérives (insuffisant pour la sensibilité de 4)
      const driftEvents = new Array(3).fill().map((_, i) => ({
        id: `drift-${i}`,
        timestamp: Date.now() - (3 - i) * 1000,
        type: 'drift',
        severity: 'high',
        data: { impact: -0.8 }
      }));

      customAnalyzer.eventBuffer = driftEvents;
      await customAnalyzer._detectEmergentPatterns();

      expect(mockEmit).not.toHaveBeenCalled();
    });

    test('détecte plusieurs types de patterns', async () => {
      // Génération d'une séquence mixte
      const mixedEvents = [
        ...Array(5).fill().map((_, i) => ({
          id: `drift-${i}`,
          timestamp: Date.now() - (10 - i) * 1000,
          type: 'drift',
          severity: 'high',
          data: { impact: -0.8 }
        })),
        ...Array(5).fill().map((_, i) => ({
          id: `improvement-${i}`,
          timestamp: Date.now() - (5 - i) * 1000,
          type: 'improvement',
          severity: 'high',
          data: { impact: 0.8 }
        }))
      ];

      analyzer.eventBuffer = mixedEvents;
      await analyzer._detectEmergentPatterns();

      expect(mockEmit).toHaveBeenCalledWith(
        'prism:codex:emergentPatternDetected',
        expect.objectContaining({
          type: 'improvement',
          count: 5
        })
      );
    });
  });

  describe('Prédiction comportementale améliorée', () => {
    let analyzer;
    let mockEmit;

    beforeEach(() => {
      mockEmit = jest.fn();
      analyzer = new PrismCodexAnalyzer();
      analyzer.eventBuffer = [];
      global.prismBus = { emit: mockEmit };
    });

    test('applique correctement la pondération temporelle exponentielle', async () => {
      // Génération d'événements avec des types variés
      const events = new Array(100).fill().map((_, i) => ({
        id: `event-${i}`,
        timestamp: Date.now() - (100 - i) * 1000,
        type: i % 3 === 0 ? 'improvement' : i % 3 === 1 ? 'drift' : 'stagnation',
        severity: 'medium',
        data: { impact: 0.5 }
      }));

      analyzer.eventBuffer = events;
      const prediction = await analyzer.predictNextState({});

      // Vérification de la structure de la prédiction
      expect(prediction).toHaveProperty('state');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('justification');
      expect(prediction).toHaveProperty('metrics');
      expect(prediction.metrics).toHaveProperty('percentages');
      expect(prediction.metrics).toHaveProperty('totalWeight');
      expect(prediction.metrics).toHaveProperty('isLatentCollapse');

      // Vérification que les poids sont correctement calculés
      const weights = events.map((_, i) => Math.pow(2, i / 10));
      expect(prediction.metrics.totalWeight).toBeGreaterThan(0);
      expect(prediction.metrics.percentages).toHaveProperty('improvement');
      expect(prediction.metrics.percentages).toHaveProperty('drift');
      expect(prediction.metrics.percentages).toHaveProperty('stagnation');
    });

    test('détecte correctement un effondrement latent', async () => {
      // Génération d'événements avec une forte stagnation récente
      const events = new Array(100).fill().map((_, i) => ({
        id: `event-${i}`,
        timestamp: Date.now() - (100 - i) * 1000,
        type: i < 70 ? 'stagnation' : 'improvement',
        severity: 'high',
        data: { impact: 0.8 }
      }));

      analyzer.eventBuffer = events;
      const prediction = await analyzer.predictNextState({});

      expect(prediction.state).toBe('Effondrement latent');
      expect(prediction.confidence).toBe(0.9);
      expect(prediction.metrics.isLatentCollapse).toBe(true);
      expect(prediction.justification).toContain('stagnation élevée');
    });

    test('émet correctement l\'événement de prédiction', async () => {
      const events = new Array(100).fill().map((_, i) => ({
        id: `event-${i}`,
        timestamp: Date.now() - (100 - i) * 1000,
        type: 'improvement',
        severity: 'high',
        data: { impact: 0.8 }
      }));

      analyzer.eventBuffer = events;
      await analyzer.predictNextState({});

      expect(mockEmit).toHaveBeenCalledWith(
        'prism:codex:predictionUpdated',
        expect.objectContaining({
          state: expect.any(String),
          confidence: expect.any(Number),
          justification: expect.any(String),
          metrics: expect.objectContaining({
            percentages: expect.any(Object),
            totalWeight: expect.any(Number),
            isLatentCollapse: expect.any(Boolean)
          })
        })
      );
    });

    test('gère correctement les cas limites', async () => {
      // Test avec un historique vide
      const emptyPrediction = await analyzer.predictNextState({});
      expect(emptyPrediction.state).toBe('Stagnation comportementale');
      expect(emptyPrediction.confidence).toBe(0.6);

      // Test avec un seul événement
      analyzer.eventBuffer = [{
        id: 'single-event',
        timestamp: Date.now(),
        type: 'improvement',
        severity: 'high',
        data: { impact: 0.8 }
      }];
      const singleEventPrediction = await analyzer.predictNextState({});
      expect(singleEventPrediction).toBeDefined();
      expect(singleEventPrediction.metrics.percentages).toHaveProperty('improvement');
    });
  });
}); 