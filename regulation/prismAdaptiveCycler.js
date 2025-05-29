/**
 * @fileoverview Module de régulation adaptative des cycles PRISM
 * @module regulation/prismAdaptiveCycler
 */

import kernelBus from '../core/KernelBus.js';
import { CircularDeque } from './CircularDeque.js';
import PrismStorage from '../prismStorage.js';
import PrismHMAC from '../security/prismHMAC.js';
import { PrismProfiler } from '../perf/prismProfiler.js';

const SLIDING_WINDOW_SIZE = 200;
const EFFICIENCY_THRESHOLDS = {
  HIGH: 0.8,  // 80%
  LOW: 0.5    // 50%
};

const CYCLE_ADJUSTMENTS = {
  INTENSIFY: -0.2,  // -20%
  SLOW_DOWN: 0.3    // +30%
};

const MIN_CYCLE_INTERVAL = 1000;  // 1 seconde
const MAX_CYCLE_INTERVAL = 30000; // 30 secondes
const STORAGE_KEY = 'prism_adaptive_cycler_state';
const TTL = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

/**
 * Classe de régulation adaptative des cycles PRISM
 */
export class PrismAdaptiveCycler {
  constructor(options = {}) {
    this.outcomes = new CircularDeque(SLIDING_WINDOW_SIZE);
    this.currentEfficiency = 0;
    this.baseCycleInterval = 5000; // 5 secondes par défaut
    this.currentCycleInterval = this.baseCycleInterval;
    this.storage = new PrismStorage();
    this.debug = options.debug || false;
  }

  /**
   * Initialise le régulateur adaptatif
   */
  async initialize() {
    prismBus.subscribe('prism:strategy:directiveOutcome', this.handleDirectiveOutcome.bind(this));
    await this.loadState();
    if (this.debug) {
      console.log('🔄 PrismAdaptiveCycler initialisé');
    }
  }

  /**
   * Gère l'arrivée d'un nouvel outcome de directive
   * @param {Object} event - Événement d'outcome
   * @param {boolean} event.success - Succès ou échec de la directive
   */
  handleDirectiveOutcome(event) {
    const startTime = performance.now();

    this.outcomes.pushBack(event.success);
    this.currentEfficiency = this.outcomes.getEfficiency();
    this.adjustCycles();
    this.saveState();

    const endTime = performance.now();
    if (endTime - startTime > 200 && this.debug) {
      console.warn('⚠️ PrismAdaptiveCycler: Performance critique détectée');
    }
  }

  /**
   * Ajuste les cycles en fonction de l'efficacité
   */
  async adjustCycles() {
    if (PrismProfiler.enabled) {
      PrismProfiler.start('cycler:update');
    }

    let adjustment = 0;

    if (this.currentEfficiency > EFFICIENCY_THRESHOLDS.HIGH) {
      adjustment = CYCLE_ADJUSTMENTS.INTENSIFY;
    } else if (this.currentEfficiency < EFFICIENCY_THRESHOLDS.LOW) {
      adjustment = CYCLE_ADJUSTMENTS.SLOW_DOWN;
    }

    if (adjustment !== 0) {
      const newInterval = this.currentCycleInterval * (1 + adjustment);
      this.currentCycleInterval = Math.max(
        MIN_CYCLE_INTERVAL,
        Math.min(MAX_CYCLE_INTERVAL, newInterval)
      );

      const payload = {
        efficiency: this.currentEfficiency,
        newInterval: this.currentCycleInterval,
        adjustment: adjustment
      };

      // Sign the payload
      const signature = await PrismHMAC.sign(payload);
      if (signature) {
        payload.sig = signature;
      }

      prismBus.publish('prism:adaptiveCycler:cycleTuned', payload);
    }

    if (PrismProfiler.enabled) {
      PrismProfiler.end('cycler:update');
    }
  }

  /**
   * Récupère l'intervalle de cycle actuel
   * @returns {number} Intervalle en millisecondes
   */
  getCurrentCycleInterval() {
    return this.currentCycleInterval;
  }

  /**
   * Hydrate l'état du cycler avec des données persistées
   * @param {Object} data - Données à charger
   * @param {number} data.currentInterval - Intervalle de cycle actuel
   * @param {number[]} data.deque - File d'attente des outcomes (1 = succès, 0 = échec)
   * @param {number} data.timestamp - Timestamp de sauvegarde
   */
  hydrate(data) {
    if (!data || typeof data !== 'object') return;

    // Vérifier le TTL
    if (data.timestamp && Date.now() - data.timestamp > TTL) {
      if (this.debug) {
        console.log('🔄 PrismAdaptiveCycler: Données expirées, réinitialisation');
      }
      return;
    }

    // Validation des données
    if (typeof data.currentInterval === 'number') {
      this.currentCycleInterval = Math.max(
        MIN_CYCLE_INTERVAL,
        Math.min(MAX_CYCLE_INTERVAL, data.currentInterval)
      );
    }

    if (Array.isArray(data.deque)) {
      // Réinitialiser la file d'attente
      this.outcomes = new CircularDeque(SLIDING_WINDOW_SIZE);
      
      // Charger les outcomes
      data.deque.forEach(outcome => {
        if (typeof outcome === 'number' && (outcome === 0 || outcome === 1)) {
          this.outcomes.pushBack(outcome === 1);
        }
      });
      
      // Recalculer l'efficacité
      this.currentEfficiency = this.outcomes.getEfficiency();
    }
  }

  /**
   * Sauvegarde l'état actuel du cycler
   * @private
   */
  saveState() {
    const state = {
      currentInterval: this.currentCycleInterval,
      deque: Array.from(this.outcomes).map(outcome => outcome ? 1 : 0),
      timestamp: Date.now()
    };
    
    this.storage.writeSafe(STORAGE_KEY, state);
  }

  /**
   * Charge l'état sauvegardé du cycler
   * @private
   */
  async loadState() {
    const state = this.storage.readSafe(STORAGE_KEY);
    if (state) {
      this.hydrate(state);
    }
  }
} 