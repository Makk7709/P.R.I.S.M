/**
 * @fileoverview Module de stockage d'état pour PRISM
 */

class PrismStateStore {
  constructor() {
    this.states = new Map();
  }

  /**
   * Sauvegarde l'état d'un module
   * @param {string} key - Clé du module
   * @param {Object} state - État à sauvegarder
   * @returns {Promise<void>}
   */
  async saveState(key, state) {
    this.states.set(key, {
      ...state,
      timestamp: Date.now()
    });
  }

  /**
   * Charge l'état d'un module
   * @param {string} key - Clé du module
   * @returns {Promise<Object|null>}
   */
  async loadState(key) {
    return this.states.get(key) || null;
  }

  /**
   * Supprime l'état d'un module
   * @param {string} key - Clé du module
   * @returns {Promise<void>}
   */
  async deleteState(key) {
    this.states.delete(key);
  }

  /**
   * Nettoie les états expirés
   * @param {number} ttl - Durée de vie en ms
   * @returns {Promise<void>}
   */
  async cleanup(ttl) {
    const now = Date.now();
    for (const [key, state] of this.states.entries()) {
      if (now - state.timestamp > ttl) {
        this.states.delete(key);
      }
    }
  }
}

export const stateStore = new PrismStateStore(); 