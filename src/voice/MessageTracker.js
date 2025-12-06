/**
 * PRISM MessageTracker - Suivi des Messages Anti-Répétition
 * 
 * Suit les messages audio pour éviter les répétitions et doublons.
 * Implémente déduplication basée sur l'ID et le contenu.
 * 
 * @author PRISM Team
 * @version 1.0.0
 */

/**
 * @typedef {Object} MessageTrackerConfig
 * @property {number} [maxTrackedMessages=100] - Nombre max de messages à tracker
 * @property {number} [deduplicationWindow=5000] - Fenêtre de déduplication en ms
 */

/**
 * @typedef {Object} TrackedMessage
 * @property {string} messageId
 * @property {Object} metadata
 * @property {number} trackedAt
 * @property {string} [contentHash]
 */

/**
 * @typedef {Object} TrackerStats
 * @property {number} duplicatesRejected
 * @property {number} uniquePlayed
 * @property {number} totalChecks
 * @property {number} deduplicationRate
 */

export class MessageTracker {
  /**
   * @param {MessageTrackerConfig} config
   */
  constructor(config = {}) {
    this.config = {
      maxTrackedMessages: config.maxTrackedMessages || 100,
      deduplicationWindow: config.deduplicationWindow || 5000
    };
    
    /** @type {Map<string, TrackedMessage>} */
    this._messages = new Map();
    
    /** @type {Map<string, {messageId: string, timestamp: number}>} */
    this._contentHashes = new Map();
    
    /** @type {string|null} */
    this._activeMessageId = null;
    
    /** @type {TrackerStats} */
    this._stats = {
      duplicatesRejected: 0,
      uniquePlayed: 0,
      totalChecks: 0,
      deduplicationRate: 0
    };
  }

  /**
   * Génère un ID de message unique
   * @returns {string}
   */
  generateMessageId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const counter = this._messages.size;
    return `${timestamp}-${random}-${counter}`;
  }

  /**
   * Enregistre un message comme tracké
   * @param {string} messageId - ID du message
   * @param {Object} metadata - Métadonnées associées
   * @returns {string} ID du message tracké
   */
  track(messageId, metadata = {}) {
    const tracked = {
      messageId,
      metadata: { ...metadata },
      trackedAt: Date.now()
    };
    
    this._messages.set(messageId, tracked);
    
    // Nettoyer si trop de messages
    this._enforceMaxSize();
    
    return messageId;
  }

  /**
   * Enregistre un message avec son contenu pour déduplication
   * @param {string} content - Contenu textuel
   * @param {string} messageId - ID du message
   */
  trackContent(content, messageId) {
    const hash = this._hashContent(content);
    this._contentHashes.set(hash, {
      messageId,
      timestamp: Date.now()
    });
    
    // Nettoyer les vieux hashes
    this._cleanExpiredHashes();
  }

  /**
   * Vérifie si un message est déjà tracké
   * @param {string} messageId - ID à vérifier
   * @returns {boolean}
   */
  isTracked(messageId) {
    return this._messages.has(messageId);
  }

  /**
   * Vérifie si un message devrait être joué (non doublon)
   * @param {string} messageId - ID du message
   * @returns {boolean} true si le message peut être joué
   */
  shouldPlay(messageId) {
    this._stats.totalChecks++;
    
    if (this._messages.has(messageId)) {
      this._stats.duplicatesRejected++;
      this._updateDeduplicationRate();
      return false;
    }
    
    this._stats.uniquePlayed++;
    this._updateDeduplicationRate();
    return true;
  }

  /**
   * Vérifie si un contenu devrait être joué (non doublon par contenu)
   * @param {string} content - Contenu à vérifier
   * @returns {boolean} true si le contenu peut être joué
   */
  shouldPlayContent(content) {
    const hash = this._hashContent(content);
    
    // Nettoyer les vieux hashes
    this._cleanExpiredHashes();
    
    if (this._contentHashes.has(hash)) {
      const entry = this._contentHashes.get(hash);
      const age = Date.now() - entry.timestamp;
      
      if (age < this.config.deduplicationWindow) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Récupère les métadonnées d'un message
   * @param {string} messageId - ID du message
   * @returns {Object|null}
   */
  getMetadata(messageId) {
    const tracked = this._messages.get(messageId);
    if (!tracked) return null;
    
    return {
      ...tracked.metadata,
      trackedAt: tracked.trackedAt
    };
  }

  /**
   * Définit le message actif
   * @param {string} messageId - ID du message
   */
  setActive(messageId) {
    this._activeMessageId = messageId;
    
    // Tracker automatiquement
    if (!this._messages.has(messageId)) {
      this.track(messageId, { activatedAt: Date.now() });
    }
  }

  /**
   * Récupère l'ID du message actif
   * @returns {string|null}
   */
  getActiveMessageId() {
    return this._activeMessageId;
  }

  /**
   * Vérifie si un message est actif
   * @param {string} messageId - ID à vérifier
   * @returns {boolean}
   */
  isActive(messageId) {
    return this._activeMessageId === messageId;
  }

  /**
   * Réinitialise le message actif
   */
  clearActive() {
    this._activeMessageId = null;
  }

  /**
   * Retourne le nombre de messages trackés
   * @returns {number}
   */
  size() {
    return this._messages.size;
  }

  /**
   * Vide tous les messages trackés
   */
  clear() {
    this._messages.clear();
    this._contentHashes.clear();
    this._activeMessageId = null;
    this._stats = {
      duplicatesRejected: 0,
      uniquePlayed: 0,
      totalChecks: 0,
      deduplicationRate: 0
    };
  }

  /**
   * Retourne les statistiques de tracking
   * @returns {TrackerStats}
   */
  getStats() {
    return { ...this._stats };
  }

  /**
   * Retourne tous les messages trackés
   * @returns {TrackedMessage[]}
   */
  getAllTracked() {
    return Array.from(this._messages.values());
  }

  // ============ MÉTHODES PRIVÉES ============

  /**
   * Calcule un hash simple du contenu
   * @private
   */
  _hashContent(content) {
    // Hash simple basé sur la longueur et les premiers/derniers caractères
    const normalized = content.trim().toLowerCase();
    const length = normalized.length;
    const prefix = normalized.substring(0, 50);
    const suffix = normalized.substring(Math.max(0, length - 50));
    
    // Simple hash
    let hash = 0;
    const str = `${length}-${prefix}-${suffix}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `ch-${Math.abs(hash).toString(36)}`;
  }

  /**
   * Applique la limite de taille
   * @private
   */
  _enforceMaxSize() {
    while (this._messages.size > this.config.maxTrackedMessages) {
      // Supprimer le plus ancien
      const firstKey = this._messages.keys().next().value;
      this._messages.delete(firstKey);
    }
  }

  /**
   * Nettoie les hashes expirés
   * @private
   */
  _cleanExpiredHashes() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [hash, entry] of this._contentHashes) {
      if (now - entry.timestamp > this.config.deduplicationWindow) {
        expiredKeys.push(hash);
      }
    }
    
    expiredKeys.forEach(key => this._contentHashes.delete(key));
  }

  /**
   * Met à jour le taux de déduplication
   * @private
   */
  _updateDeduplicationRate() {
    if (this._stats.totalChecks === 0) {
      this._stats.deduplicationRate = 0;
    } else {
      this._stats.deduplicationRate = 
        this._stats.duplicatesRejected / this._stats.totalChecks;
    }
  }
}

export default MessageTracker;

