/**
 * @fileoverview Gestion des seeds adaptatifs pour PRISM
 * @module memory/prismAdaptiveSeeds
 */

const VALIDATION_THRESHOLD = 3;
const SEED_EXPIRY_DAYS = 30;
const STORAGE_KEY = 'prism_adaptive_seeds_v1';

/**
 * @typedef {Object} AdaptiveSeed
 * @property {string} id - Identifiant unique du seed
 * @property {string} module - Module concerné par l'ajustement
 * @property {string} adjustmentType - Type d'ajustement (vigilance, cycle, seuil...)
 * @property {any} value - Valeur ajustée
 * @property {number} createdAt - Timestamp de création
 * @property {number} validationCount - Nombre de validations successives
 * @property {boolean} isPersistent - Indique si le seed est persistant
 */

class PrismAdaptiveSeeds {
  constructor() {
    this.seeds = new Map();
    this.initialized = false;
  }

  /**
   * Initialise le module en chargeant les seeds existants
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.loadSeeds();
      this.initialized = true;
      console.log('🌱 PrismAdaptiveSeeds initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PrismAdaptiveSeeds:', error);
      throw error;
    }
  }

  /**
   * Enregistre un nouveau seed ou met à jour un seed existant
   * @param {AdaptiveSeed} seed - Le seed à sauvegarder
   * @returns {Promise<boolean>}
   */
  async saveSeed(seed) {
    try {
      if (!this.initialized) await this.initialize();

      const existingSeed = this.seeds.get(seed.id);
      if (existingSeed) {
        // Mise à jour du seed existant
        this.seeds.set(seed.id, {
          ...existingSeed,
          ...seed,
          validationCount: existingSeed.validationCount + 1,
          isPersistent: existingSeed.validationCount + 1 >= VALIDATION_THRESHOLD
        });
      } else {
        // Nouveau seed
        this.seeds.set(seed.id, {
          ...seed,
          validationCount: 1,
          isPersistent: false
        });
      }

      await this.persistSeeds();
      return true;
    } catch (error) {
      console.error('Failed to save seed:', error);
      return false;
    }
  }

  /**
   * Valide un seed existant
   * @param {string} seedId - ID du seed à valider
   * @returns {Promise<boolean>}
   */
  async validateSeed(seedId) {
    try {
      if (!this.initialized) await this.initialize();

      const seed = this.seeds.get(seedId);
      if (!seed) return false;

      seed.validationCount++;
      seed.isPersistent = seed.validationCount >= VALIDATION_THRESHOLD;

      await this.persistSeeds();
      return true;
    } catch (error) {
      console.error('Failed to validate seed:', error);
      return false;
    }
  }

  /**
   * Sauvegarde les seeds dans le stockage persistant
   * @returns {Promise<void>}
   */
  async persistSeeds() {
    try {
      const seedsArray = Array.from(this.seeds.values());
      const dataToStore = {
        version: '1.0.0',
        timestamp: Date.now(),
        seeds: seedsArray
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to persist seeds:', error);
      throw error;
    }
  }

  /**
   * Charge les seeds depuis le stockage persistant
   * @returns {Promise<void>}
   */
  async loadSeeds() {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (!storedData) return;

      const { seeds: storedSeeds } = JSON.parse(storedData);
      this.seeds = new Map(storedSeeds.map(seed => [seed.id, seed]));
      
      console.log(`🌱 Loaded ${this.seeds.size} adaptive seeds`);
    } catch (error) {
      console.error('Failed to load seeds:', error);
      throw error;
    }
  }

  /**
   * Nettoie les seeds obsolètes ou invalides
   * @returns {Promise<void>}
   */
  async pruneSeeds() {
    try {
      if (!this.initialized) await this.initialize();

      const now = Date.now();
      const expiryTime = now - (SEED_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      for (const [id, seed] of this.seeds.entries()) {
        if (
          seed.createdAt < expiryTime ||
          (!seed.isPersistent && seed.validationCount === 0)
        ) {
          this.seeds.delete(id);
        }
      }

      await this.persistSeeds();
      console.log('🌱 Pruned obsolete seeds');
    } catch (error) {
      console.error('Failed to prune seeds:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les seeds persistants
   * @returns {AdaptiveSeed[]}
   */
  getPersistentSeeds() {
    return Array.from(this.seeds.values())
      .filter(seed => seed.isPersistent);
  }

  /**
   * Récupère les seeds pour un module spécifique
   * @param {string} moduleName - Nom du module
   * @returns {AdaptiveSeed[]}
   */
  getSeedsForModule(moduleName) {
    return Array.from(this.seeds.values())
      .filter(seed => seed.module === moduleName);
  }
}

// Tests unitaires en développement
if (process.env.NODE_ENV === 'development') {
  const runTests = async () => {
    const seeds = new PrismAdaptiveSeeds();
    await seeds.initialize();

    // Test saveSeed
    const testSeed = {
      id: 'test-1',
      module: 'vigilance',
      adjustmentType: 'threshold',
      value: 0.8,
      createdAt: Date.now()
    };

    await seeds.saveSeed(testSeed);
    console.assert(seeds.seeds.has('test-1'), 'Seed not saved');

    // Test validateSeed
    await seeds.validateSeed('test-1');
    const seed = seeds.seeds.get('test-1');
    console.assert(seed.validationCount === 2, 'Validation count incorrect');

    // Test pruning
    await seeds.pruneSeeds();
    console.assert(seeds.seeds.size > 0, 'All seeds pruned incorrectly');
  };

  runTests().catch(console.error);
}

export default PrismAdaptiveSeeds; 