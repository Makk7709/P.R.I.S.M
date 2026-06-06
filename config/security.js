/**
 * @fileoverview Configuration de sécurité PRISM - Variables immuables
 * @module config/security
 * @version 1.0.0
 * @author PRISM Security Team
 *
 * ATTENTION: Ce fichier contient des constantes de sécurité IMMUABLES.
 * Ces valeurs ne peuvent PAS être modifiées par des variables d'environnement
 * après le démarrage du système pour des raisons de sécurité.
 */

/**
 * Configuration de sécurité principale - LECTURE SEULE
 * Ces valeurs sont figées au démarrage et ne peuvent être modifiées
 */
export const SECURITY_CONFIG = Object.freeze({
  // === TRUST CONTEXT ===
  TRUST: Object.freeze({
    // Niveau minimum nécessitant une approbation humaine
    MIN_APPROVAL_LEVEL: 'HIGH',

    // Délai d'expiration des approbations (30 minutes)
    APPROVAL_TIMEOUT_MS: 30 * 60 * 1000,

    // Cooldown entre auto-améliorations (30 minutes)
    SELF_IMPROVEMENT_COOLDOWN_MS: 30 * 60 * 1000,

    // Superviseurs autorisés (hashes SHA-256)
    ALLOWED_SUPERVISORS: Object.freeze([
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // supervisor_001
      'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', // supervisor_002
      '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', // admin_master
    ]),

    // Nombre maximum de tentatives d'approbation
    MAX_APPROVAL_ATTEMPTS: 3,

    // Taille maximale de l'historique des décisions
    MAX_HISTORY_SIZE: 1000,
  }),

  // === KERNEL BUS SECURITY ===
  KERNEL_BUS: Object.freeze({
    // Nombre maximum d'événements en file d'attente
    MAX_QUEUE_SIZE: 10000,

    // Nombre maximum de listeners par événement
    MAX_LISTENERS_PER_EVENT: 100,

    // Timeout pour le traitement des événements (30 secondes)
    EVENT_PROCESSING_TIMEOUT_MS: 30 * 1000,

    // Préfixe obligatoire pour les événements PRISM
    REQUIRED_EVENT_PREFIX: 'prism:',

    // Événements critiques nécessitant une vérification TrustContext
    CRITICAL_EVENTS: Object.freeze([
      'prism:selfimprovement:execute',
      'prism:core:shutdown',
      'prism:security:disable',
      'prism:config:modify',
      'prism:trust:override',
    ]),
  }),

  // === SELF IMPROVEMENT ENGINE ===
  SELF_IMPROVEMENT: Object.freeze({
    // Modes autorisés pour l'auto-amélioration
    ALLOWED_MODES: Object.freeze(['TEST']),

    // Nombre maximum de tentatives d'amélioration par session
    MAX_IMPROVEMENTS_PER_SESSION: 5,

    // Seuil de performance minimum pour déclencher une amélioration
    MIN_PERFORMANCE_THRESHOLD: 0.7,

    // Taille maximale du batch d'analyse
    MAX_BATCH_SIZE: 100,

    // Timeout pour l'exécution d'une amélioration (5 minutes)
    IMPROVEMENT_TIMEOUT_MS: 5 * 60 * 1000,

    // Types d'améliorations autorisées
    ALLOWED_IMPROVEMENT_TYPES: Object.freeze([
      'prompt_optimization',
      'model_selection',
      'response_time',
      'quality',
      'cost',
      'context_management',
      'error_handling',
    ]),
  }),

  // === RATE LIMITING ===
  RATE_LIMITS: Object.freeze({
    // Limite globale d'événements par minute
    GLOBAL_EVENTS_PER_MINUTE: 1000,

    // Limite d'approbations par superviseur par heure
    APPROVALS_PER_SUPERVISOR_PER_HOUR: 10,

    // Limite d'auto-améliorations par jour
    SELF_IMPROVEMENTS_PER_DAY: 5,

    // Limite de tentatives de connexion par IP par minute
    LOGIN_ATTEMPTS_PER_IP_PER_MINUTE: 5,
  }),

  // === MONITORING & AUDIT ===
  MONITORING: Object.freeze({
    // Niveau minimum de log pour les événements de sécurité
    MIN_SECURITY_LOG_LEVEL: 'INFO',

    // Rétention des logs de sécurité (30 jours)
    SECURITY_LOG_RETENTION_DAYS: 30,

    // Intervalle de rapport des métriques de sécurité (5 secondes)
    SECURITY_METRICS_INTERVAL_MS: 5 * 1000,

    // Seuils d'alerte
    ALERT_THRESHOLDS: Object.freeze({
      // Taux d'échec des approbations (20%)
      APPROVAL_FAILURE_RATE: 0.2,

      // Temps moyen d'approbation (10 minutes)
      AVERAGE_APPROVAL_TIME_MS: 10 * 60 * 1000,

      // Nombre de décisions en attente (50)
      PENDING_DECISIONS_THRESHOLD: 50,

      // Utilisation CPU critique (90%)
      CPU_USAGE_CRITICAL: 0.9,

      // Utilisation mémoire critique (95%)
      MEMORY_USAGE_CRITICAL: 0.95,
    }),
  }),

  // === ENCRYPTION & HASHING ===
  CRYPTO: Object.freeze({
    // Algorithme de hachage pour les décisions
    DECISION_HASH_ALGORITHM: 'sha256',

    // Taille des tokens d'approbation (32 bytes = 256 bits)
    APPROVAL_TOKEN_SIZE: 32,

    // Algorithme de signature pour les superviseurs
    SIGNATURE_ALGORITHM: 'RSA-SHA256',

    // Taille minimale des clés RSA (2048 bits)
    MIN_RSA_KEY_SIZE: 2048,
  }),

  // === EMERGENCY PROTOCOLS ===
  EMERGENCY: Object.freeze({
    // Code d'urgence pour bypass temporaire (usage unique)
    EMERGENCY_BYPASS_CODE: 'PRISM_EMERGENCY_OVERRIDE_2024',

    // Durée maximale du mode d'urgence (1 heure)
    EMERGENCY_MODE_MAX_DURATION_MS: 60 * 60 * 1000,

    // Contacts d'urgence (hashes des identifiants)
    EMERGENCY_CONTACTS: Object.freeze(['emergency_contact_001_hash', 'emergency_contact_002_hash']),

    // Actions autorisées en mode d'urgence
    EMERGENCY_ALLOWED_ACTIONS: Object.freeze([
      'system_shutdown',
      'disable_self_improvement',
      'reset_trust_context',
      'emergency_backup',
    ]),
  }),
});

/**
 * Validation de la configuration de sécurité
 * Vérifie que toutes les valeurs sont dans les plages acceptables
 */
export const SECURITY_VALIDATION = Object.freeze({
  /**
   * Valide la configuration au démarrage
   * @returns {Object} Résultat de la validation
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    // Vérifier les timeouts
    if (SECURITY_CONFIG.TRUST.APPROVAL_TIMEOUT_MS < 5 * 60 * 1000) {
      warnings.push('Approval timeout is less than 5 minutes');
    }

    if (SECURITY_CONFIG.TRUST.SELF_IMPROVEMENT_COOLDOWN_MS < 10 * 60 * 1000) {
      warnings.push('Self-improvement cooldown is less than 10 minutes');
    }

    // Vérifier les superviseurs
    if (SECURITY_CONFIG.TRUST.ALLOWED_SUPERVISORS.length === 0) {
      errors.push('No supervisors configured');
    }

    // Vérifier les limites de rate limiting
    if (SECURITY_CONFIG.RATE_LIMITS.GLOBAL_EVENTS_PER_MINUTE > 10000) {
      warnings.push('Global event rate limit is very high');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      timestamp: Date.now(),
    };
  },

  /**
   * Vérifie l'intégrité de la configuration
   * @returns {boolean} True si la configuration n'a pas été altérée
   */
  checkIntegrity() {
    try {
      // Vérifier que les objets sont toujours figés
      const testFreeze = () => {
        try {
          SECURITY_CONFIG.TRUST.MIN_APPROVAL_LEVEL = 'MODIFIED';
          return false; // Si on arrive ici, l'objet n'est pas figé
        } catch (_error) {
          return true; // L'objet est correctement figé
        }
      };

      return testFreeze();
    } catch (error) {
      console.error('Security config integrity check failed:', error);
      return false;
    }
  },
});

/**
 * Utilitaires de sécurité
 */
export const SECURITY_UTILS = Object.freeze({
  /**
   * Vérifie si un événement est critique
   * @param {string} eventType - Type d'événement
   * @returns {boolean} True si critique
   */
  isCriticalEvent(eventType) {
    return SECURITY_CONFIG.KERNEL_BUS.CRITICAL_EVENTS.includes(eventType);
  },

  /**
   * Obtient le niveau de criticité d'une action
   * @param {string} actionType - Type d'action
   * @returns {string} Niveau de criticité
   */
  getCriticalityLevel(actionType) {
    const criticalActions = [
      'self_improvement',
      'system_shutdown',
      'security_disable',
      'config_modify',
    ];

    const highActions = ['module_restart', 'performance_adjust', 'threshold_modify'];

    if (criticalActions.some((action) => actionType.includes(action))) {
      return 'CRITICAL';
    }

    if (highActions.some((action) => actionType.includes(action))) {
      return 'HIGH';
    }

    return 'MEDIUM';
  },

  /**
   * Génère un hash sécurisé
   * @param {string} input - Données à hasher
   * @returns {string} Hash SHA-256
   */
  generateSecureHash(input) {
    const crypto = require('node:crypto');
    return crypto
      .createHash(SECURITY_CONFIG.CRYPTO.DECISION_HASH_ALGORITHM)
      .update(input)
      .digest('hex');
  },
});

/**
 * Mode de sécurité actuel (déterminé au démarrage)
 */
export const SECURITY_MODE = Object.freeze({
  CURRENT: process.env.PRISM_MODE || 'PROD',
  IS_TEST: (process.env.PRISM_MODE || 'PROD') === 'TEST',
  IS_PROD: (process.env.PRISM_MODE || 'PROD') === 'PROD',
  STARTUP_TIME: Date.now(),
});

// Validation immédiate de la configuration
const validation = SECURITY_VALIDATION.validateConfig();
if (!validation.valid) {
  console.error('🚨 SECURITY CONFIG VALIDATION FAILED:', validation.errors);
  throw new Error('Invalid security configuration');
}

if (validation.warnings.length > 0) {
  console.warn('⚠️ Security configuration warnings:', validation.warnings);
}

// Vérification de l'intégrité
if (!SECURITY_VALIDATION.checkIntegrity()) {
  console.error('🚨 SECURITY CONFIG INTEGRITY CHECK FAILED');
  throw new Error('Security configuration integrity compromised');
}

console.log('🔒 Security configuration loaded and validated successfully');
console.log(`🔒 Security mode: ${SECURITY_MODE.CURRENT}`);
console.log(`🔒 Trust level: ${SECURITY_CONFIG.TRUST.MIN_APPROVAL_LEVEL}`);

export default SECURITY_CONFIG;
