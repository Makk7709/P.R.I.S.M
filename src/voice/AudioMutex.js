/**
 * PRISM AudioMutex - Verrouillage Audio Anti-Répétition
 * 
 * Implémente un mutex pour garantir qu'un seul audio peut jouer à la fois.
 * Prévient les répétitions et les superpositions audio.
 * 
 * @author PRISM Team
 * @version 1.0.0
 */

/**
 * @typedef {Object} AudioMutexConfig
 * @property {boolean} [strictRelease=false] - Require holder ID for release
 * @property {number} [timeout=0] - Auto-release timeout in ms (0 = no timeout)
 */

/**
 * @typedef {Object} MutexState
 * @property {boolean} locked
 * @property {string|null} holder
 * @property {number} acquiredAt
 */

export class AudioMutex {
  /**
   * @param {AudioMutexConfig} config
   */
  constructor(config = {}) {
    this.config = {
      strictRelease: config.strictRelease || false,
      timeout: config.timeout || 0
    };
    
    /** @type {boolean} */
    this._locked = false;
    
    /** @type {string|null} */
    this._holder = null;
    
    /** @type {number} */
    this._acquiredAt = 0;
    
    /** @type {NodeJS.Timeout|null} */
    this._timeoutHandle = null;
    
    /** @type {Map<string, Function[]>} */
    this._listeners = new Map();
    
    /** @type {Array<{id: string, callback: Function}>} */
    this._waitQueue = [];
  }

  /**
   * Tente d'acquérir le verrou
   * @param {string} holderId - Identifiant du demandeur
   * @returns {boolean} true si acquis, false sinon
   */
  acquire(holderId) {
    if (!holderId) {
      throw new Error('Holder ID is required');
    }
    
    // Si déjà verrouillé par un autre
    if (this._locked && this._holder !== holderId) {
      return false;
    }
    
    // Acquérir ou réacquérir
    this._locked = true;
    this._holder = holderId;
    this._acquiredAt = Date.now();
    
    // Configurer timeout si défini
    if (this.config.timeout > 0) {
      this._clearTimeout();
      this._timeoutHandle = setTimeout(() => {
        this._handleTimeout();
      }, this.config.timeout);
    }
    
    this._emit('acquire', { holderId, timestamp: this._acquiredAt });
    
    return true;
  }

  /**
   * Libère le verrou
   * @returns {boolean} true si libéré
   */
  release() {
    if (!this._locked) {
      return true;
    }
    
    this._clearTimeout();
    
    const previousHolder = this._holder;
    this._locked = false;
    this._holder = null;
    this._acquiredAt = 0;
    
    this._emit('release', { previousHolder, timestamp: Date.now() });
    
    // Traiter la queue d'attente
    this._processWaitQueue();
    
    return true;
  }

  /**
   * Libère le verrou uniquement si c'est le bon holder
   * @param {string} holderId - ID du holder qui veut libérer
   * @returns {boolean} true si libéré
   */
  releaseBy(holderId) {
    if (this.config.strictRelease && this._holder !== holderId) {
      return false;
    }
    
    if (this._holder === holderId || !this.config.strictRelease) {
      return this.release();
    }
    
    return false;
  }

  /**
   * Force la libération du verrou
   */
  forceRelease() {
    const previousHolder = this._holder;
    
    this._clearTimeout();
    this._locked = false;
    this._holder = null;
    this._acquiredAt = 0;
    
    this._emit('forceRelease', { previousHolder, timestamp: Date.now() });
    
    // Traiter la queue d'attente
    this._processWaitQueue();
  }

  /**
   * Vérifie si le mutex est verrouillé
   * @returns {boolean}
   */
  isLocked() {
    return this._locked;
  }

  /**
   * Retourne l'ID du holder actuel
   * @returns {string|null}
   */
  getCurrentHolder() {
    return this._holder;
  }

  /**
   * Attend que le verrou soit disponible puis exécute le callback
   * @param {string} holderId - ID du demandeur
   * @param {Function} callback - Fonction à exécuter une fois le verrou acquis
   */
  waitForLock(holderId, callback) {
    if (!this._locked) {
      // Verrou disponible immédiatement
      this.acquire(holderId);
      setImmediate(() => callback());
      return;
    }
    
    // Ajouter à la queue d'attente
    this._waitQueue.push({ id: holderId, callback });
  }

  /**
   * Retourne l'état actuel du mutex
   * @returns {MutexState}
   */
  getState() {
    return {
      locked: this._locked,
      holder: this._holder,
      acquiredAt: this._acquiredAt
    };
  }

  /**
   * Enregistre un listener d'événement
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction à appeler
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  /**
   * Supprime un listener d'événement
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction à retirer
   */
  off(event, callback) {
    if (!this._listeners.has(event)) return;
    
    const listeners = this._listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // ============ MÉTHODES PRIVÉES ============

  /**
   * Émet un événement
   * @private
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[AudioMutex] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Annule le timeout courant
   * @private
   */
  _clearTimeout() {
    if (this._timeoutHandle) {
      clearTimeout(this._timeoutHandle);
      this._timeoutHandle = null;
    }
  }

  /**
   * Gère l'expiration du timeout
   * @private
   */
  _handleTimeout() {
    if (this._locked) {
      this._emit('timeout', { holder: this._holder, timestamp: Date.now() });
      this.forceRelease();
    }
  }

  /**
   * Traite la queue d'attente après libération
   * @private
   */
  _processWaitQueue() {
    if (this._waitQueue.length === 0) return;
    
    const next = this._waitQueue.shift();
    if (next) {
      this.acquire(next.id);
      setImmediate(() => next.callback());
    }
  }
}

export default AudioMutex;

