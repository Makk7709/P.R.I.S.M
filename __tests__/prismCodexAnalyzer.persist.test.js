/**
 * @fileoverview Tests de persistance pour le module prismCodexAnalyzer
 */

import { jest } from '@jest/globals';
import { PrismCodexAnalyzer } from '../prismCodexAnalyzer.js';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};

// Mock console
const originalConsole = { ...console };
console.log = jest.fn();
console.error = jest.fn();

describe('PrismCodexAnalyzer Persistence', () => {
  let analyzer;
  let originalLocalStorage;

  beforeEach(() => {
    // Sauvegarder et remplacer localStorage
    originalLocalStorage = global.localStorage;
    global.localStorage = mockLocalStorage;
    
    // Réinitialiser les mocks
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.clear.mockClear();
    console.log.mockClear();
    console.error.mockClear();
    
    // Créer une nouvelle instance
    analyzer = new PrismCodexAnalyzer();
  });

  afterEach(() => {
    // Restaurer localStorage
    global.localStorage = originalLocalStorage;
  });

  describe('Sauvegarde ➜ Restauration', () => {
    test('sauvegarde et restaure correctement les confiances', async () => {
      // Injecter 100 confiances aléatoires
      for (let i = 0; i < 100; i++) {
        const confidence = 0.3 + Math.random() * 0.6; // Entre 0.3 et 0.9
        analyzer.confidenceHistory.set(`directive-${i}`, confidence);
      }

      // Sauvegarder l'état
      await analyzer.saveState();

      // Vérifier que saveState a été appelé
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'prismCodexAnalyzer',
        expect.any(String)
      );

      // Créer une nouvelle instance
      const newAnalyzer = new PrismCodexAnalyzer();

      // Restaurer l'état
      await newAnalyzer.loadState();

      // Vérifier que chaque directive a la même confiance
      for (let i = 0; i < 100; i++) {
        const originalConfidence = analyzer.confidenceHistory.get(`directive-${i}`);
        const restoredConfidence = newAnalyzer.confidenceHistory.get(`directive-${i}`);
        expect(Math.abs(originalConfidence - restoredConfidence)).toBeLessThan(1e-6);
      }
    });
  });

  describe('Expiration TTL', () => {
    test('vide la table après 7 jours', async () => {
      // Créer un état avec un timestamp vieux de 8 jours
      const oldState = {
        confidenceHistory: [['directive-1', 0.8]],
        quarterlyReports: [],
        currentQuarter: '2024-Q1',
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000)
      };

      // Simuler le chargement de l'état
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(oldState));

      // Charger l'état
      await analyzer.loadState();

      // Vérifier que la table est vide
      expect(analyzer.confidenceHistory.size).toBe(0);
    });
  });

  describe('Performance', () => {
    test('sauvegarde et chargement de 100 directives en moins de 50ms', async () => {
      // Injecter 100 confiances
      for (let i = 0; i < 100; i++) {
        analyzer.confidenceHistory.set(`directive-${i}`, 0.8);
      }

      // Mesurer le temps de sauvegarde
      const saveStart = performance.now();
      await analyzer.saveState();
      const saveEnd = performance.now();

      // Mesurer le temps de chargement
      const loadStart = performance.now();
      await analyzer.loadState();
      const loadEnd = performance.now();

      // Vérifier les performances
      const totalTime = (saveEnd - saveStart) + (loadEnd - loadStart);
      expect(totalTime).toBeLessThan(50);
    });
  });

  describe('Nettoyage', () => {
    test('nettoie correctement les mocks après chaque test', () => {
      expect(mockLocalStorage.getItem).not.toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(mockLocalStorage.clear).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });
}); 