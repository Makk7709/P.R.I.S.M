// PRISM Persistence Layer
const PRISM_PERSISTENCE_KEY = 'prism_state_v1';
const SCHEMA_VERSION = '1.0.0';
const MEMORY_CHUNK_SIZE = 1024 * 1024; // 1MB
const _MAX_MEMORY_USAGE = 0.8; // 80% de la mémoire disponible

class PrismPersistence {
  constructor() {
    this.schema = {
      version: SCHEMA_VERSION,
      modules: {
        mood: null,
        energy: null,
        vision: null,
        chronicle: null,
        bond: null,
        soul: null,
        memory: null,
        ethos: null,
        think: null
      },
      timestamp: null,
      checksum: null
    };

    // Cache LRU pour optimiser l'accès aux données fréquentes
    this.stateCache = new Map();
    this.maxCacheSize = 100;
    this.cacheHits = 0;
    this.cacheMisses = 0;

    // Gestion de la mémoire
    this.memoryWarningThreshold = 0.7; // 70%
    this.memoryCleanupThreshold = 0.85; // 85%
    this.lastMemoryCheck = Date.now();
    this.memoryCheckInterval = 60000; // 1 minute
  }

  /**
   * Vérifie et optimise l'utilisation de la mémoire
   * @private
   */
  async checkMemoryUsage() {
    if (Date.now() - this.lastMemoryCheck < this.memoryCheckInterval) {
      return;
    }

    this.lastMemoryCheck = Date.now();

    if (window.performance && window.performance.memory) {
      const memoryInfo = window.performance.memory;
      const usageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;

      if (usageRatio > this.memoryCleanupThreshold) {
        await this.forceMemoryCleanup();
      } else if (usageRatio > this.memoryWarningThreshold) {
        this.optimizeCache();
      }
    }
  }

  /**
   * Force le nettoyage de la mémoire
   * @private
   */
  async forceMemoryCleanup() {
    // Vider le cache
    this.stateCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;

    // Forcer la collecte des déchets
    if (window.gc) {
      try {
        window.gc();
      } catch (e) {
        console.warn('Manual garbage collection failed:', e);
      }
    }
  }

  /**
   * Optimise la taille du cache
   * @private
   */
  optimizeCache() {
    if (this.stateCache.size > this.maxCacheSize) {
      // Supprimer les entrées les plus anciennes
      const entriesToRemove = this.stateCache.size - this.maxCacheSize;
      const entries = Array.from(this.stateCache.entries());
      entries
        .slice(0, entriesToRemove)
        .forEach(([key]) => this.stateCache.delete(key));
    }
  }

  /**
   * Sauvegarde l'état du système
   * @param {Object} state - État à sauvegarder
   * @returns {Promise<boolean>}
   */
  async saveState(state) {
    try {
      await this.checkMemoryUsage();

      const stateToSave = this._prepareStateForStorage(state);
      const encodedState = await this._encodeState(stateToSave);
      
      // Sauvegarder par chunks si nécessaire
      if (encodedState.length > MEMORY_CHUNK_SIZE) {
        await this._saveStateInChunks(encodedState);
      } else {
        localStorage.setItem(PRISM_PERSISTENCE_KEY, encodedState);
      }

      // Mettre à jour le cache
      const cacheKey = this._generateCacheKey(state);
      this.stateCache.set(cacheKey, state);
      this.optimizeCache();

      return true;
    } catch (error) {
      console.error('Failed to save PRISM state:', error);
      return false;
    }
  }

  /**
   * Charge l'état du système
   * @returns {Promise<Object>}
   */
  async loadState() {
    try {
      await this.checkMemoryUsage();

      // Vérifier le cache d'abord
      const cacheKey = this._generateCacheKey();
      if (this.stateCache.has(cacheKey)) {
        this.cacheHits++;
        return this.stateCache.get(cacheKey);
      }
      this.cacheMisses++;

      // Charger depuis le stockage
      let encodedState = localStorage.getItem(PRISM_PERSISTENCE_KEY);
      
      // Vérifier si l'état est stocké en chunks
      if (!encodedState) {
        encodedState = await this._loadStateFromChunks();
      }

      if (!encodedState) return null;

      const decodedState = await this._decodeState(encodedState);
      if (!this._validateState(decodedState)) {
        throw new Error('Invalid state schema or checksum');
      }

      // Mettre en cache
      this.stateCache.set(cacheKey, decodedState.modules);
      this.optimizeCache();

      return decodedState.modules;
    } catch (error) {
      console.error('Failed to load PRISM state:', error);
      return null;
    }
  }

  /**
   * Sauvegarde l'état en chunks
   * @private
   * @param {string} encodedState - État encodé
   */
  async _saveStateInChunks(encodedState) {
    const chunks = [];
    for (let i = 0; i < encodedState.length; i += MEMORY_CHUNK_SIZE) {
      chunks.push(encodedState.slice(i, i + MEMORY_CHUNK_SIZE));
    }

    // Sauvegarder les chunks
    for (let i = 0; i < chunks.length; i++) {
      localStorage.setItem(`${PRISM_PERSISTENCE_KEY}_chunk_${i}`, chunks[i]);
    }
    localStorage.setItem(`${PRISM_PERSISTENCE_KEY}_chunks`, chunks.length.toString());
  }

  /**
   * Charge l'état depuis les chunks
   * @private
   * @returns {Promise<string>}
   */
  async _loadStateFromChunks() {
    const chunksCount = Number.parseInt(localStorage.getItem(`${PRISM_PERSISTENCE_KEY}_chunks`), 10);
    if (!chunksCount) return null;

    let encodedState = '';
    for (let i = 0; i < chunksCount; i++) {
      const chunk = localStorage.getItem(`${PRISM_PERSISTENCE_KEY}_chunk_${i}`);
      if (!chunk) return null;
      encodedState += chunk;
    }

    return encodedState;
  }

  /**
   * Génère une clé de cache unique
   * @private
   * @param {Object} state - État optionnel
   * @returns {string}
   */
  _generateCacheKey(state = null) {
    if (state) {
      return this._generateChecksum(state);
    }
    return 'latest';
  }

  // Private Methods
  _prepareStateForStorage(state) {
    const stateToSave = {
      ...this.schema,
      modules: { ...state },
      timestamp: Date.now(),
      checksum: this._generateChecksum(state)
    };
    return stateToSave;
  }

  _encodeState(state) {
    const jsonString = JSON.stringify(state);
    const compressed = this._compressString(jsonString);
    return btoa(compressed);
  }

  _decodeState(encodedState) {
    const decompressed = this._decompressString(atob(encodedState));
    return JSON.parse(decompressed);
  }

  _validateState(state) {
    if (!state || typeof state !== 'object') return false;
    if (state.version !== SCHEMA_VERSION) return false;
    if (!state.modules || typeof state.modules !== 'object') return false;
    if (!state.checksum || !state.timestamp) return false;

    const currentChecksum = this._generateChecksum(state.modules);
    return currentChecksum === state.checksum;
  }

  _generateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  _compressString(str) {
    return str.replaceAll(/\s+/g, '')
      .replaceAll(/"([^"]+)":/g, '$1:')
      .replaceAll(/,}/g, '}')
      .replaceAll(/,]/g, ']');
  }

  _decompressString(str) {
    return str;
  }
}

// Inline Tests
const runTests = () => {
  const persistence = new PrismPersistence();
  const testState = {
    mood: { value: 0.8 },
    energy: { level: 0.9 },
    vision: { active: true },
    chronicle: { events: [] },
    bond: { strength: 0.7 },
    soul: { essence: 1 },
    memory: { capacity: 0.95 },
    ethos: { alignment: 'neutral' },
    think: { processing: false }
  };

  // Test save and load
  persistence.saveState(testState).then(success => {
    if (!success) throw new Error('Save test failed');
    return persistence.loadState();
  }).then(loadedState => {
    if (!loadedState) throw new Error('Load test failed');
    if (JSON.stringify(loadedState) !== JSON.stringify(testState)) {
      throw new Error('State mismatch after save/load');
    }
  }).catch(error => {
    console.error('Persistence tests failed:', error);
  });

  // Test clear
  persistence.clearState().then(success => {
    if (!success) throw new Error('Clear test failed');
    const clearedState = persistence.loadState();
    if (clearedState !== null) {
      throw new Error('State not properly cleared');
    }
  }).catch(error => {
    console.error('Clear test failed:', error);
  });
};

// Run tests in development
if (process.env.NODE_ENV === 'development') {
  runTests();
}

export default PrismPersistence; 