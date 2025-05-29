/**
 * @fileoverview Tests unitaires pour le module prismEventGuard
 */

import prismEventGuard from '../security/prismEventGuard.js';
import PrismHMAC from '../security/prismHMAC.js';

// Mock crypto.subtle
const mockCrypto = {
  subtle: {
    importKey: jest.fn().mockResolvedValue('mockKey'),
    sign: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
    verify: jest.fn().mockResolvedValue(true)
  }
};

global.crypto = mockCrypto;

describe('PrismEventGuard', () => {
  let prismEventGuard;
  const validEvent = {
    type: 'test',
    payload: { data: 'test' },
    timestamp: Date.now()
  };

  beforeEach(() => {
    prismEventGuard = new prismEventGuard();
    jest.clearAllMocks();
    // Réinitialiser les compteurs avant chaque test
    prismEventGuard.eventCounters.clear();
    // Set test key
    window.PRISM_EVENT_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterEach(() => {
    delete window.PRISM_EVENT_KEY;
  });

  describe('validateOutcome', () => {
    test('accepte un événement valide', () => {
      expect(prismEventGuard.validateOutcome(validEvent)).toBe(true);
    });

    test('rejette un événement sans directive', () => {
      const invalidEvent = { ...validEvent, directive: undefined };
      expect(prismEventGuard.validateOutcome(invalidEvent)).toBe(false);
    });

    test('rejette un événement sans module', () => {
      const invalidEvent = { ...validEvent, module: undefined };
      expect(prismEventGuard.validateOutcome(invalidEvent)).toBe(false);
    });

    test('rejette un événement avec un résultat invalide', () => {
      const invalidEvent = { ...validEvent, result: 'invalid' };
      expect(prismEventGuard.validateOutcome(invalidEvent)).toBe(false);
    });

    test('rejette un événement avec un timestamp invalide', () => {
      const invalidEvent = { ...validEvent, timestamp: -1 };
      expect(prismEventGuard.validateOutcome(invalidEvent)).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    test('accepte les événements dans la limite', () => {
      for (let i = 0; i < 20; i++) {
        expect(prismEventGuard.checkRateLimit('test-module')).toBe(true);
      }
    });

    test('rejette les événements au-delà de la limite', () => {
      for (let i = 0; i < 20; i++) {
        prismEventGuard.checkRateLimit('test-module');
      }
      expect(prismEventGuard.checkRateLimit('test-module')).toBe(false);
    });

    test('réinitialise le compteur après la fenêtre de temps', () => {
      // Simuler le passage du temps
      jest.advanceTimersByTime(11000);
      expect(prismEventGuard.checkRateLimit('test-module')).toBe(true);
    });
  });

  describe('verifySignature', () => {
    test('accepte un événement sans signature', async () => {
      const isValid = await prismEventGuard.verifySignature(validEvent);
      expect(isValid).toBe(true);
    });

    test('accepte un événement avec une signature valide', async () => {
      const signedEvent = {
        ...validEvent,
        sig: 'valid-signature'
      };
      const isValid = await prismEventGuard.verifySignature(signedEvent);
      expect(isValid).toBe(true);
      expect(mockCrypto.subtle.verify).toHaveBeenCalled();
    });

    test('rejette un événement avec une signature invalide', async () => {
      const signedEvent = { ...validEvent, sig: 'invalid-signature' };
      const isValid = await prismEventGuard.verifySignature(signedEvent);
      expect(isValid).toBe(false);
    });

    test('fonctionne en mode dégradé sans clé', async () => {
      prismEventGuard.setDegradedMode(true);
      const signedEvent = { ...validEvent, sig: 'any-signature' };
      const isValid = await prismEventGuard.verifySignature(signedEvent);
      expect(isValid).toBe(true);
    });
  });

  describe('guardOutcome', () => {
    test('accepte un événement valide dans les limites', async () => {
      const isValid = await prismEventGuard.guardOutcome(validEvent);
      expect(isValid).toBe(true);
    });

    test('rejette un événement invalide', async () => {
      const invalidEvent = { ...validEvent, directive: undefined };
      const isValid = await prismEventGuard.guardOutcome(invalidEvent);
      expect(isValid).toBe(false);
    });

    test('rejette un événement au-delà de la limite de rate', async () => {
      for (let i = 0; i < 20; i++) {
        await prismEventGuard.guardOutcome(validEvent);
      }
      const isValid = await prismEventGuard.guardOutcome(validEvent);
      expect(isValid).toBe(false);
    });
  });

  describe('Performance', () => {
    test('traite 1000 validations en moins de 100ms', async () => {
      const events = Array(1000).fill(null).map(() => ({
        ...validEvent,
        sig: 'test-signature'
      }));

      const start = performance.now();
      await Promise.all(events.map(event => prismEventGuard.verifySignature(event)));
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });
}); 