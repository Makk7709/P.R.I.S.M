/**
 * Tests TDD pour AdaptiveTimeoutManager
 * 
 * @description Gestion intelligente des timeouts basée sur le type de requête
 * @requirements
 * - 95% code coverage minimum
 * - Pas de mocks - tests avec vraies valeurs
 * - Timeouts adaptatifs selon le type d'opération
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import du module à tester (sera créé après les tests)
import { AdaptiveTimeoutManager, TimeoutConfig, OperationType } from '../../src/ui/AdaptiveTimeoutManager.js';

describe('AdaptiveTimeoutManager - TDD Strict', () => {
  let manager: AdaptiveTimeoutManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new AdaptiveTimeoutManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    manager.clearAll();
  });

  describe('Configuration des timeouts par type d\'opération', () => {
    it('devrait avoir un timeout par défaut de 30 secondes pour les opérations générales', () => {
      const config = manager.getConfig(OperationType.GENERAL);
      expect(config.timeout).toBe(30000);
    });

    it('devrait avoir un timeout de 90 secondes pour la génération d\'images', () => {
      const config = manager.getConfig(OperationType.IMAGE_GENERATION);
      expect(config.timeout).toBe(90000);
    });

    it('devrait avoir un timeout de 60 secondes pour les requêtes API longues', () => {
      const config = manager.getConfig(OperationType.API_LONG);
      expect(config.timeout).toBe(60000);
    });

    it('devrait avoir un timeout de 45 secondes pour la synthèse vocale', () => {
      const config = manager.getConfig(OperationType.VOICE_SYNTHESIS);
      expect(config.timeout).toBe(45000);
    });

    it('devrait avoir un timeout de 120 secondes pour le consensus multi-modèles', () => {
      const config = manager.getConfig(OperationType.CONSENSUS);
      expect(config.timeout).toBe(120000);
    });
  });

  describe('Création et gestion des timeouts', () => {
    it('devrait créer un timeout avec callback', () => {
      let callbackCalled = false;
      const callback = () => { callbackCalled = true; };

      manager.create('test-1', OperationType.GENERAL, callback);
      
      // Avancer le temps de 30 secondes
      vi.advanceTimersByTime(30000);
      
      expect(callbackCalled).toBe(true);
    });

    it('devrait ne pas déclencher le callback avant le timeout', () => {
      let callbackCalled = false;
      const callback = () => { callbackCalled = true; };

      manager.create('test-2', OperationType.GENERAL, callback);
      
      // Avancer le temps de 29 secondes (avant le timeout)
      vi.advanceTimersByTime(29000);
      
      expect(callbackCalled).toBe(false);
    });

    it('devrait pouvoir annuler un timeout avant qu\'il ne se déclenche', () => {
      let callbackCalled = false;
      const callback = () => { callbackCalled = true; };

      manager.create('test-cancel', OperationType.GENERAL, callback);
      manager.clear('test-cancel');
      
      // Avancer le temps au-delà du timeout
      vi.advanceTimersByTime(35000);
      
      expect(callbackCalled).toBe(false);
    });

    it('devrait gérer plusieurs timeouts simultanément', () => {
      const results: string[] = [];
      
      manager.create('timeout-1', OperationType.GENERAL, () => results.push('general'));
      manager.create('timeout-2', OperationType.IMAGE_GENERATION, () => results.push('image'));
      
      // Après 30s, seul le général devrait être déclenché
      vi.advanceTimersByTime(30000);
      expect(results).toEqual(['general']);
      
      // Après 60s supplémentaires (90s total), l'image devrait être déclenchée
      vi.advanceTimersByTime(60000);
      expect(results).toEqual(['general', 'image']);
    });
  });

  describe('Détection automatique du type d\'opération', () => {
    it('devrait détecter une demande de génération d\'image', () => {
      const type1 = manager.detectOperationType('Génère moi une image de chat');
      expect(type1).toBe(OperationType.IMAGE_GENERATION);

      const type2 = manager.detectOperationType('Crée une infographie professionnelle');
      expect(type2).toBe(OperationType.IMAGE_GENERATION);

      const type3 = manager.detectOperationType('Dessine un diagramme');
      expect(type3).toBe(OperationType.IMAGE_GENERATION);
    });

    it('devrait détecter une demande de consensus', () => {
      const type = manager.detectOperationType('Compare les avis de plusieurs modèles');
      expect(type).toBe(OperationType.CONSENSUS);
    });

    it('devrait retourner GENERAL pour les messages normaux', () => {
      const type = manager.detectOperationType('Bonjour, comment ça va ?');
      expect(type).toBe(OperationType.GENERAL);
    });

    it('devrait être insensible à la casse', () => {
      const type1 = manager.detectOperationType('GÉNÈRE UNE IMAGE');
      expect(type1).toBe(OperationType.IMAGE_GENERATION);

      const type2 = manager.detectOperationType('génère une image');
      expect(type2).toBe(OperationType.IMAGE_GENERATION);
    });
  });

  describe('Timeout adaptatif basé sur la longueur du message', () => {
    it('devrait ajouter du temps supplémentaire pour les messages longs', () => {
      const shortMessage = 'Court message';
      const longMessage = 'A'.repeat(1000); // 1000 caractères

      const shortTimeout = manager.calculateAdaptiveTimeout(OperationType.GENERAL, shortMessage);
      const longTimeout = manager.calculateAdaptiveTimeout(OperationType.GENERAL, longMessage);

      expect(longTimeout).toBeGreaterThan(shortTimeout);
    });

    it('devrait avoir un timeout minimum même pour les messages vides', () => {
      const timeout = manager.calculateAdaptiveTimeout(OperationType.GENERAL, '');
      expect(timeout).toBeGreaterThanOrEqual(30000);
    });

    it('devrait plafonner le timeout maximum', () => {
      const veryLongMessage = 'A'.repeat(10000);
      const timeout = manager.calculateAdaptiveTimeout(OperationType.GENERAL, veryLongMessage);
      
      // Le timeout ne devrait pas dépasser 5 minutes (300000ms)
      expect(timeout).toBeLessThanOrEqual(300000);
    });
  });

  describe('Méthode clearAll', () => {
    it('devrait annuler tous les timeouts actifs', () => {
      const results: string[] = [];
      
      manager.create('t1', OperationType.GENERAL, () => results.push('1'));
      manager.create('t2', OperationType.GENERAL, () => results.push('2'));
      manager.create('t3', OperationType.GENERAL, () => results.push('3'));
      
      manager.clearAll();
      
      vi.advanceTimersByTime(60000);
      
      expect(results).toEqual([]);
    });
  });

  describe('Statistiques et métriques', () => {
    it('devrait compter les timeouts actifs', () => {
      manager.create('t1', OperationType.GENERAL, () => {});
      manager.create('t2', OperationType.GENERAL, () => {});
      
      expect(manager.getActiveCount()).toBe(2);
      
      manager.clear('t1');
      expect(manager.getActiveCount()).toBe(1);
    });

    it('devrait retourner les statistiques des timeouts expirés', () => {
      manager.create('t1', OperationType.GENERAL, () => {});
      
      vi.advanceTimersByTime(30000);
      
      const stats = manager.getStats();
      expect(stats.expired).toBe(1);
      expect(stats.cleared).toBe(0);
    });

    it('devrait retourner les statistiques des timeouts annulés', () => {
      manager.create('t1', OperationType.GENERAL, () => {});
      manager.clear('t1');
      
      const stats = manager.getStats();
      expect(stats.expired).toBe(0);
      expect(stats.cleared).toBe(1);
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait ignorer silencieusement la suppression d\'un timeout inexistant', () => {
      expect(() => manager.clear('inexistant')).not.toThrow();
    });

    it('devrait éviter les doublons de même ID', () => {
      const results: number[] = [];
      
      manager.create('same-id', OperationType.GENERAL, () => results.push(1));
      manager.create('same-id', OperationType.GENERAL, () => results.push(2));
      
      vi.advanceTimersByTime(30000);
      
      // Seul le dernier callback devrait être appelé
      expect(results).toEqual([2]);
    });
  });

  describe('Intégration avec les callbacks async', () => {
    it('devrait fonctionner avec des callbacks asynchrones', async () => {
      let asyncResult = '';
      
      manager.create('async-test', OperationType.GENERAL, async () => {
        asyncResult = 'completed';
      });
      
      vi.advanceTimersByTime(30000);
      
      // Attendre que le callback async soit exécuté
      await vi.runAllTimersAsync();
      
      expect(asyncResult).toBe('completed');
    });
  });

  describe('Réinitialisation des statistiques', () => {
    it('devrait réinitialiser les statistiques à zéro', () => {
      // Créer et expirer un timeout
      manager.create('t1', OperationType.GENERAL, () => {});
      vi.advanceTimersByTime(30000);
      
      // Créer et annuler un timeout
      manager.create('t2', OperationType.GENERAL, () => {});
      manager.clear('t2');
      
      // Vérifier que les stats ne sont pas à zéro
      let stats = manager.getStats();
      expect(stats.expired).toBe(1);
      expect(stats.cleared).toBe(1);
      
      // Réinitialiser
      manager.resetStats();
      
      // Vérifier que les stats sont à zéro
      stats = manager.getStats();
      expect(stats.expired).toBe(0);
      expect(stats.cleared).toBe(0);
    });
  });
});

describe('TimeoutConfig - Types et validation', () => {
  it('devrait avoir tous les types d\'opération définis', () => {
    expect(OperationType.GENERAL).toBeDefined();
    expect(OperationType.IMAGE_GENERATION).toBeDefined();
    expect(OperationType.API_LONG).toBeDefined();
    expect(OperationType.VOICE_SYNTHESIS).toBeDefined();
    expect(OperationType.CONSENSUS).toBeDefined();
  });
});

