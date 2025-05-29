/**
 * @fileoverview Setup pour les tests de sécurité PRISM
 * @module tests/security/setup
 */

// Configuration globale pour les tests de sécurité
globalThis.PRISM_MODE = 'TEST';
globalThis.SECURITY_TEST = true;

// Mock console pour capturer les logs de sécurité
const originalConsole = { ...console };
globalThis.securityLogs = [];

console.log = (...args) => {
  globalThis.securityLogs.push({ level: 'log', args, timestamp: Date.now() });
  originalConsole.log(...args);
};

console.warn = (...args) => {
  globalThis.securityLogs.push({ level: 'warn', args, timestamp: Date.now() });
  originalConsole.warn(...args);
};

console.error = (...args) => {
  globalThis.securityLogs.push({ level: 'error', args, timestamp: Date.now() });
  originalConsole.error(...args);
};

// Fonction utilitaire pour vérifier les logs de sécurité
globalThis.getSecurityLogs = (level = null) => {
  if (level) {
    return globalThis.securityLogs.filter(log => log.level === level);
  }
  return globalThis.securityLogs;
};

globalThis.clearSecurityLogs = () => {
  globalThis.securityLogs = [];
};

// Mock des variables d'environnement pour les tests
process.env.PRISM_MODE = 'TEST';
process.env.NODE_ENV = 'test';

// Configuration des timeouts pour les tests de sécurité
jest.setTimeout(30000);

// Setup avant chaque test
beforeEach(() => {
  globalThis.clearSecurityLogs();
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useFakeTimers();
});

// Cleanup après chaque test
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Utilitaires de test pour la sécurité
globalThis.SecurityTestUtils = {
  /**
   * Vérifie qu'un veto humain a été requis
   * @param {Array} logs - Logs à vérifier
   * @returns {boolean}
   */
  verifyHumanVetoRequired(logs = globalThis.securityLogs) {
    return logs.some(log => 
      log.args.some(arg => 
        typeof arg === 'string' && 
        (arg.includes('Human approval requested') || 
         arg.includes('🔐') ||
         arg.includes('approval_requested'))
      )
    );
  },

  /**
   * Vérifie qu'un événement critique a été bloqué
   * @param {Array} logs - Logs à vérifier
   * @returns {boolean}
   */
  verifyCriticalEventBlocked(logs = globalThis.securityLogs) {
    return logs.some(log => 
      log.args.some(arg => 
        typeof arg === 'string' && 
        (arg.includes('blocked by TrustContext') || 
         arg.includes('🚫') ||
         arg.includes('human approval required'))
      )
    );
  },

  /**
   * Vérifie qu'une approbation a été accordée
   * @param {Array} logs - Logs à vérifier
   * @returns {boolean}
   */
  verifyApprovalGranted(logs = globalThis.securityLogs) {
    return logs.some(log => 
      log.args.some(arg => 
        typeof arg === 'string' && 
        (arg.includes('Decision approved') || 
         arg.includes('✅') ||
         arg.includes('decision_approved'))
      )
    );
  },

  /**
   * Simule un délai d'attente
   * @param {number} ms - Millisecondes à attendre
   */
  async advanceTime(ms) {
    if (typeof jest !== 'undefined' && jest.advanceTimersByTime) {
      jest.advanceTimersByTime(ms);
    }
    await new Promise(resolve => setImmediate(resolve));
  },

  /**
   * Crée un superviseur de test
   * @param {string} id - ID du superviseur
   * @returns {Object}
   */
  createTestSupervisor(id = 'test_supervisor_001') {
    return {
      id,
      signature: `test_signature_${id}`,
      isValid: true
    };
  }
};

console.log('🔒 Security test setup initialized'); 