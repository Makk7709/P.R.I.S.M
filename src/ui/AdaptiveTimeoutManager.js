/**
 * AdaptiveTimeoutManager - Gestion intelligente des timeouts
 * 
 * @module src/ui/AdaptiveTimeoutManager
 * @description Fournit des timeouts adaptatifs basés sur le type d'opération
 * et la complexité de la requête pour éviter les timeouts prématurés.
 * 
 * @example
 * const manager = new AdaptiveTimeoutManager();
 * manager.create('request-1', OperationType.IMAGE_GENERATION, () => {
 *   console.log('Timeout atteint');
 * });
 */

/**
 * Types d'opérations supportées avec leurs timeouts respectifs
 * @enum {string}
 */
export const OperationType = {
  /** Opération générale - 30 secondes */
  GENERAL: 'general',
  /** Génération d'images - 90 secondes */
  IMAGE_GENERATION: 'image_generation',
  /** Requête API longue - 60 secondes */
  API_LONG: 'api_long',
  /** Synthèse vocale - 45 secondes */
  VOICE_SYNTHESIS: 'voice_synthesis',
  /** Consensus multi-modèles - 120 secondes */
  CONSENSUS: 'consensus'
};

/**
 * Configuration par défaut des timeouts (en millisecondes)
 * @type {Object.<string, TimeoutConfig>}
 */
const DEFAULT_CONFIGS = {
  [OperationType.GENERAL]: {
    timeout: 30000,
    description: 'Opération générale',
    adaptiveMultiplier: 10 // 10ms par caractère supplémentaire
  },
  [OperationType.IMAGE_GENERATION]: {
    timeout: 90000,
    description: 'Génération d\'images',
    adaptiveMultiplier: 5
  },
  [OperationType.API_LONG]: {
    timeout: 60000,
    description: 'Requête API longue',
    adaptiveMultiplier: 15
  },
  [OperationType.VOICE_SYNTHESIS]: {
    timeout: 45000,
    description: 'Synthèse vocale',
    adaptiveMultiplier: 20
  },
  [OperationType.CONSENSUS]: {
    timeout: 120000,
    description: 'Consensus multi-modèles',
    adaptiveMultiplier: 10
  }
};

/**
 * Mots-clés pour la détection du type d'opération
 */
const DETECTION_PATTERNS = {
  [OperationType.IMAGE_GENERATION]: [
    'génère', 'genere', 'crée', 'cree', 'dessine', 'image', 
    'infographie', 'diagramme', 'illustration', 'visualisation',
    'graphique', 'schéma', 'schema'
  ],
  [OperationType.CONSENSUS]: [
    'consensus', 'compare', 'plusieurs modèles', 'multi-modèles',
    'avis de', 'opinions'
  ]
};

/** Timeout maximum absolu (5 minutes) */
const MAX_TIMEOUT = 300000;

/**
 * @typedef {Object} TimeoutConfig
 * @property {number} timeout - Timeout en millisecondes
 * @property {string} description - Description du type d'opération
 * @property {number} adaptiveMultiplier - Multiplicateur pour le calcul adaptatif
 */

/**
 * @typedef {Object} TimeoutStats
 * @property {number} expired - Nombre de timeouts expirés
 * @property {number} cleared - Nombre de timeouts annulés manuellement
 */

/**
 * Gestionnaire de timeouts adaptatifs
 * @class
 */
export class AdaptiveTimeoutManager {
  constructor() {
    /** @type {Map<string, NodeJS.Timeout>} */
    this._timeouts = new Map();
    
    /** @type {TimeoutStats} */
    this._stats = {
      expired: 0,
      cleared: 0
    };
  }

  /**
   * Récupère la configuration pour un type d'opération
   * @param {string} operationType - Type d'opération (voir OperationType)
   * @returns {TimeoutConfig} Configuration du timeout
   */
  getConfig(operationType) {
    return DEFAULT_CONFIGS[operationType] || DEFAULT_CONFIGS[OperationType.GENERAL];
  }

  /**
   * Crée un nouveau timeout
   * @param {string} id - Identifiant unique du timeout
   * @param {string} operationType - Type d'opération
   * @param {Function} callback - Fonction à appeler en cas de timeout
   * @param {string} [message=''] - Message pour le calcul adaptatif
   */
  create(id, operationType, callback, message = '') {
    // Annuler un timeout existant avec le même ID
    if (this._timeouts.has(id)) {
      this.clear(id);
    }

    const timeout = this.calculateAdaptiveTimeout(operationType, message);
    
    const timeoutId = setTimeout(() => {
      this._timeouts.delete(id);
      this._stats.expired++;
      callback();
    }, timeout);

    this._timeouts.set(id, timeoutId);
  }

  /**
   * Annule un timeout existant
   * @param {string} id - Identifiant du timeout à annuler
   */
  clear(id) {
    const timeoutId = this._timeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this._timeouts.delete(id);
      this._stats.cleared++;
    }
  }

  /**
   * Annule tous les timeouts actifs
   */
  clearAll() {
    for (const [id, timeoutId] of this._timeouts) {
      clearTimeout(timeoutId);
      this._stats.cleared++;
    }
    this._timeouts.clear();
  }

  /**
   * Calcule le timeout adaptatif basé sur le type et la longueur du message
   * @param {string} operationType - Type d'opération
   * @param {string} message - Message de la requête
   * @returns {number} Timeout en millisecondes
   */
  calculateAdaptiveTimeout(operationType, message) {
    const config = this.getConfig(operationType);
    const baseTimeout = config.timeout;
    const messageLength = message ? message.length : 0;
    
    // Calcul adaptatif : timeout de base + temps supplémentaire basé sur la longueur
    const additionalTime = messageLength * config.adaptiveMultiplier;
    const calculatedTimeout = baseTimeout + additionalTime;
    
    // Plafonner au maximum
    return Math.min(calculatedTimeout, MAX_TIMEOUT);
  }

  /**
   * Détecte automatiquement le type d'opération à partir du message
   * @param {string} message - Message de la requête
   * @returns {string} Type d'opération détecté
   */
  detectOperationType(message) {
    const lowerMessage = message.toLowerCase();

    // Vérifier chaque pattern
    for (const [type, patterns] of Object.entries(DETECTION_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern.toLowerCase())) {
          return type;
        }
      }
    }

    return OperationType.GENERAL;
  }

  /**
   * Retourne le nombre de timeouts actifs
   * @returns {number}
   */
  getActiveCount() {
    return this._timeouts.size;
  }

  /**
   * Retourne les statistiques des timeouts
   * @returns {TimeoutStats}
   */
  getStats() {
    return { ...this._stats };
  }

  /**
   * Réinitialise les statistiques
   */
  resetStats() {
    this._stats = {
      expired: 0,
      cleared: 0
    };
  }
}

/**
 * Export du type TimeoutConfig pour TypeScript
 * @type {TimeoutConfig}
 */
export const TimeoutConfig = {};

// Export par défaut d'une instance singleton
export const timeoutManager = new AdaptiveTimeoutManager();


