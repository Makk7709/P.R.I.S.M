/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { Resilience } from '../core/Resilience.js';
import { PrismEmergencyProtocol } from '../prismEmergencyProtocol.js';
import { PrismVitals } from '../prismVitals.js';

// Mock CustomEvent for Node.js environment
global.CustomEvent = class CustomEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail;
  }
};

// Mock des dépendances
jest.mock('../prismHeartSync.js', () => ({
  PrismHeartSync: jest.fn().mockImplementation(() => ({
    slowDown: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../prismLegacyCore.js', () => ({
  PrismLegacyCore: jest.fn().mockImplementation(() => ({
    loadLastStableState: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../prismVitals.js');

describe('PrismEmergencyProtocol', () => {
  let protocol;
  let resilience;
  let mockHeartSync;
  let mockLegacyCore;
  let originalConsoleLog;
  let originalConsoleError;

  beforeEach(() => {
    // Crée un DOM de base pour le test
    document.body.innerHTML = `
      <div id="prism-observer-container">
        <button id="closeObserver"></button>
      </div>
    `;
    PrismVitals.getVitals.mockReturnValue({
      // ... existing code ...
    });

    protocol = new PrismEmergencyProtocol();
    // Mock prismBus
    // ...
    
    // Sauvegarde des fonctions console originales
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    
    // Mock des fonctions console
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Création des instances mockées
    mockHeartSync = new (require('../prismHeartSync.js').PrismHeartSync)();
    mockLegacyCore = new (require('../prismLegacyCore.js').PrismLegacyCore)();
    
    // Création de l'instance du module de résilience
    resilience = new Resilience(mockHeartSync, mockLegacyCore);
  });

  afterEach(() => {
    // Restauration des fonctions console originales
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    
    // Nettoyage des mocks
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('test:emergency:handle', () => {
    it('should log emergency message without throwing exception', async () => {
      const emergencyData = {
        type: 'test',
        severity: 5,
        context: { test: true }
      };

      await expect(resilience.handleEmergency(emergencyData)).resolves.not.toThrow();
      
      expect(console.log).toHaveBeenCalledWith(
        '%c[PRISM Emergency]%c Détection d\'urgence',
        'background: #ff0000; color: white; padding: 2px 4px; border-radius: 2px;',
        'color: #ff0000;'
      );
    });

    it('should handle emergency protocol execution', async () => {
      const emergencyData = {
        type: 'test',
        severity: 5,
        context: { test: true }
      };

      await resilience.handleEmergency(emergencyData);

      expect(console.log).toHaveBeenCalledWith(
        '%c[PRISM Emergency]%c Protocole d\'urgence exécuté avec succès',
        'background: #00ff00; color: white; padding: 2px 4px; border-radius: 2px;',
        'color: #00ff00;'
      );
    });
  });

  describe('test:emergency:trigger', () => {
    it('should trigger emergency protocol successfully', async () => {
      const triggerData = {
        reason: 'test',
        initiator: 'test-suite'
      };

      await expect(resilience.triggerEmergency(triggerData)).resolves.not.toThrow();
      
      expect(console.log).toHaveBeenCalledWith(
        '%c[PRISM Emergency]%c Déclenchement manuel du protocole d\'urgence',
        'background: #ff0000; color: white; padding: 2px 4px; border-radius: 2px;',
        'color: #ff0000;'
      );
    });

    it('should handle emergency protocol failure', async () => {
      mockHeartSync.slowDown.mockRejectedValueOnce(new Error('Test error'));

      const triggerData = {
        reason: 'test',
        initiator: 'test-suite'
      };

      await expect(resilience.triggerEmergency(triggerData)).rejects.toThrow('Test error');

      expect(console.error).toHaveBeenCalledWith(
        '%c[PRISM Emergency]%c Échec du déclenchement manuel',
        'background: #ff0000; color: white; padding: 2px 4px; border-radius: 2px;',
        'color: #ff0000;',
        expect.any(Error)
      );
    });
  });

  describe('Resilience class', () => {
    it('should record failures and trigger emergency when threshold is reached', () => {
      // Enregistrer des échecs jusqu'au seuil
      for (let i = 0; i < 3; i++) {
        resilience.recordFailure();
      }

      expect(resilience.isInEmergency()).toBe(true);
    });

    it('should reset failure count', () => {
      resilience.recordFailure();
      resilience.resetFailures();
      
      // Vérifier que l'urgence n'est pas déclenchée après reset
      expect(resilience.isInEmergency()).toBe(false);
    });

    it('should set new threshold', () => {
      resilience.setThreshold(5);
      
      // Vérifier que le seuil a été mis à jour
      for (let i = 0; i < 4; i++) {
        resilience.recordFailure();
      }
      expect(resilience.isInEmergency()).toBe(false);
    });

    it('should throw error for invalid threshold', () => {
      expect(() => resilience.setThreshold(0)).toThrow('Threshold must be a positive number');
      expect(() => resilience.setThreshold(-1)).toThrow('Threshold must be a positive number');
    });
  });
}); 