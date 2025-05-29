const SafetyRunner = require('../infrastructure/safetyRunner');

describe('SafetyRunner', () => {
  let safetyRunner;

  beforeEach(() => {
    safetyRunner = new SafetyRunner();
  });

  describe('Validation de Base', () => {
    test('devrait être défini', () => {
      expect(safetyRunner).toBeDefined();
    });
  });

  describe('Vérifications de Sécurité', () => {
    test('devrait valider les opérations sûres', () => {
      const operation = {
        type: 'lecture',
        target: 'fichier_test.txt'
      };
      const result = safetyRunner.validateOperation(operation);
      expect(result.isValid).toBe(true);
    });

    test('devrait bloquer les opérations dangereuses', () => {
      const operation = {
        type: 'suppression',
        target: '/etc/passwd'
      };
      const result = safetyRunner.validateOperation(operation);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Gestion des Erreurs', () => {
    test('devrait gérer les opérations invalides', () => {
      const result = safetyRunner.validateOperation(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
}); 