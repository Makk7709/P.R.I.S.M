/**
 * PRISM State Store
 * Gère la persistance légère des états critiques des modules PRISM
 * @module persistence/prismStateStore
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
const STATE_PREFIX = 'prism_state_';

class PrismStateStore {
  constructor() {
    this.isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
    this.fs = this.isNode ? fs : null;
    this.path = this.isNode ? path : null;
    this.storageDir = this.isNode ? path.join(__dirname, '../data/state') : null;
    this.initialize();
  }

  initialize() {
    this.stateFile = './.prism-state.json';
  }

  /**
   * Sauvegarde l'état d'un module
   * @param {string} key - Clé unique identifiant le module
   * @param {object} data - Données à sauvegarder
   * @returns {Promise<void>}
   */
  async saveState(key, data) {
    try {
      const state = {
        data,
        timestamp: Date.now(),
        ttl: DEFAULT_TTL
      };

      if (this.isNode) {
        const existingStates = await this._loadNodeStates();
        existingStates[key] = state;
        await this.fs.writeFile(this.stateFile, JSON.stringify(existingStates, null, 2));
      } else {
        const encodedState = btoa(JSON.stringify(state));
        localStorage.setItem(`${STATE_PREFIX}${key}`, encodedState);
      }

      console.log('🗄️  state saved:', key);
    } catch (error) {
      console.error('Failed to save state:', error);
      throw error;
    }
  }

  /**
   * Charge l'état d'un module
   * @param {string} key - Clé unique identifiant le module
   * @returns {Promise<object|null>}
   */
  async loadState(key) {
    try {
      let state;

      if (this.isNode) {
        const states = await this._loadNodeStates();
        state = states[key];
      } else {
        const encodedState = localStorage.getItem(`${STATE_PREFIX}${key}`);
        if (!encodedState) return null;
        state = JSON.parse(atob(encodedState));
      }

      if (!state) return null;

      // Vérifier l'expiration
      if (Date.now() - state.timestamp > state.ttl) {
        await this.clearState(key);
        return null;
      }

      console.log('🗄️  state restored:', key);
      return state.data;
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  }

  /**
   * Nettoie les états expirés
   * @param {number} [ttlMs] - TTL personnalisé en millisecondes
   * @returns {Promise<void>}
   */
  async clearExpired(ttlMs = DEFAULT_TTL) {
    try {
      if (this.isNode) {
        const states = await this._loadNodeStates();
        const now = Date.now();
        const validStates = {};

        for (const [key, state] of Object.entries(states)) {
          if (now - state.timestamp <= ttlMs) {
            validStates[key] = state;
          } else {
            console.log('🗑️  state expired:', key);
          }
        }

        await this.fs.writeFile(this.stateFile, JSON.stringify(validStates, null, 2));
      } else {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith(STATE_PREFIX)) {
            const state = JSON.parse(atob(localStorage.getItem(key)));
            if (Date.now() - state.timestamp > ttlMs) {
              localStorage.removeItem(key);
              console.log('🗑️  state expired:', key.replace(STATE_PREFIX, ''));
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to clear expired states:', error);
      throw error;
    }
  }

  /**
   * Charge les états depuis le fichier en environnement Node
   * @private
   * @returns {Promise<object>}
   */
  async _loadNodeStates() {
    try {
      const content = await this.fs.readFile(this.stateFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }
}

export default PrismStateStore; 