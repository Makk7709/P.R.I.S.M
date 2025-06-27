/**
 * @fileoverview Tests unitaires pour prismStrategicLayer
 */

import { generateDirectives, CONSTANTS } from '../prismStrategicLayer.js';
import kernelBus from '../core/KernelBus.js';
import { jest } from '@jest/globals';

// Mock du bus d'événements
jest.mock('../core/KernelBus.js', () => ({
  emit: jest.fn()
}));

describe('prismStrategicLayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateDirectives', () => {
    it('devrait générer les directives correctement pour chaque type de risque', async () => {
      const risks = [
        { type: 'lowVitality', gravity: 0.7 },
        { type: 'highInertia', gravity: 0.5 },
        { type: 'behavioralDrift', gravity: 0.8 }
      ];

      await generateDirectives(risks);

      expect(kernelBus.emit).toHaveBeenCalledTimes(3);
      
      // Vérifier les appels dans l'ordre
      const calls = kernelBus.emit.mock.calls;
      expect(calls[0][0]).toBe('prism:strategy:directiveIssued');
      expect(calls[0][1].directive).toBe('stimulate_awareness');
      expect(calls[1][1].directive).toBe('boost_dynamism');
      expect(calls[2][1].directive).toBe('induce_recalibration');
    });

    it('devrait respecter le cooldown de 5 minutes', async () => {
      const risks = [
        { type: 'lowVitality', gravity: 0.7 }
      ];

      // Premier appel
      await generateDirectives(risks);
      expect(kernelBus.emit).toHaveBeenCalledTimes(1);

      // Deuxième appel immédiat
      await generateDirectives(risks);
      expect(kernelBus.emit).toHaveBeenCalledTimes(1); // Pas de nouvel appel

      // Avancer le temps de 4 minutes
      jest.advanceTimersByTime(240000);
      await generateDirectives(risks);
      expect(kernelBus.emit).toHaveBeenCalledTimes(1); // Toujours pas de nouvel appel

      // Avancer le temps de 1 minute supplémentaire
      jest.advanceTimersByTime(60000);
      await generateDirectives(risks);
      expect(kernelBus.emit).toHaveBeenCalledTimes(2); // Nouvel appel autorisé
    });

    it('devrait calculer la confiance correctement', async () => {
      const risks = [
        { type: 'lowVitality', gravity: 0.7 }
      ];

      await generateDirectives(risks);

      expect(kernelBus.emit).toHaveBeenCalledWith(
        'prism:strategy:directiveIssued',
        expect.objectContaining({
          confidence: 0.9 // 0.7 + 0.2 = 0.9
        })
      );
    });

    it('devrait gérer les types de risques non mappés', async () => {
      const risks = [
        { type: 'unknownRisk', gravity: 0.5 }
      ];

      await generateDirectives(risks);

      expect(kernelBus.emit).not.toHaveBeenCalled();
    });

    it('devrait respecter la contrainte de performance', async () => {
      // Générer 1000 risques
      const risks = Array.from({ length: 1000 }, (_, i) => ({
        type: 'lowVitality',
        gravity: 0.5
      }));

      const startTime = performance.now();
      await generateDirectives(risks);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(300);
    });
  });
}); 