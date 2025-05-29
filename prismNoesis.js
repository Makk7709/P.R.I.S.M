/**
 * @fileoverview Cœur-Esprit de PRISM - Système de perception unifiée et d'évolution consciente
 * @module PrismNoesis
 */

import PrismHeartSync from './prismHeartSync.js';
import PrismMood from './prismMood.js';
import { Resilience } from './core/Resilience.js';
import { PrismLegacyCore } from './prismLegacyCore.js';

/**
 * Classe principale gérant la perception unifiée et l'évolution de PRISM
 * @class PrismNoesis
 */
export class PrismNoesis {
  #lastEvolutionSuggestion = 0;
  #cooldownPeriod = 20 * 60 * 1000; // 20 minutes en millisecondes
  #pulseThreshold = 15;
  #currentPulseCount = 0;
  #isActive = false;
  #perceptionCache = {
    stability: 1.0,
    tension: 0.0,
    harmony: 1.0
  };

  /**
   * @constructor
   * @param {Object} options - Options de configuration
   */
  constructor(options = {}) {
    this.heartSync = new PrismHeartSync();
    this.moodEngine = new PrismMood();
    this.selfHeal = new Resilience(new PrismHeartSync(), new PrismLegacyCore());
    this.#initializeEventListeners();
  }

  /**
   * Initialise les écouteurs d'événements internes
   * @private
   */
  #initializeEventListeners() {
    this.heartSync.registerPulseHook('noesis', () => {
      this.#currentPulseCount++;
      if (this.#currentPulseCount >= this.#pulseThreshold) {
        this.#analyzeCurrentState();
        this.#currentPulseCount = 0;
      }
    });
  }

  /**
   * Analyse l'état actuel du système
   * @private
   */
  #analyzeCurrentState() {
    try {
      const stability = this.#calculateStability();
      const tension = this.#measureTension();
      const harmony = this.#assessHarmony();

      this.#perceptionCache = { stability, tension, harmony };
      this.#logPerceptionUpdate();
    } catch (error) {
      console.error('🔴 Erreur d\'analyse:', error);
      this.selfHeal.triggerHealing('noesis_analysis_error');
    }
  }

  /**
   * Calcule la stabilité du système
   * @private
   * @returns {number} Score de stabilité entre 0 et 1
   */
  #calculateStability() {
    // Implémentation de l'analyse de stabilité
    return Math.min(1, Math.max(0, this.#perceptionCache.stability));
  }

  /**
   * Mesure la tension émotionnelle et cognitive
   * @private
   * @returns {number} Score de tension entre 0 et 1
   */
  #measureTension() {
    // Implémentation de l'analyse de tension
    return Math.min(1, Math.max(0, this.#perceptionCache.tension));
  }

  /**
   * Évalue l'harmonie structurelle
   * @private
   * @returns {number} Score d'harmonie entre 0 et 1
   */
  #assessHarmony() {
    // Implémentation de l'analyse d'harmonie
    return Math.min(1, Math.max(0, this.#perceptionCache.harmony));
  }

  /**
   * Enregistre les mises à jour de perception
   * @private
   */
  #logPerceptionUpdate() {
    const { stability, tension, harmony } = this.#perceptionCache;
    console.log(`🔄 Perception mise à jour:
      🌟 Stabilité: ${stability.toFixed(2)}
      ⚡ Tension: ${tension.toFixed(2)}
      🎵 Harmonie: ${harmony.toFixed(2)}`);
  }

  /**
   * Démarre le cycle d'analyse Noesis
   * @public
   */
  startNoesisCycle() {
    if (this.#isActive) {
      console.warn('⚠️ Cycle Noesis déjà actif');
      return;
    }
    this.#isActive = true;
    this.#currentPulseCount = 0;
    console.log('🚀 Démarrage du cycle Noesis');
  }

  /**
   * Arrête le cycle d'analyse Noesis
   * @public
   */
  stopNoesisCycle() {
    this.#isActive = false;
    console.log('🛑 Arrêt du cycle Noesis');
  }

  /**
   * Récupère la perception actuelle du système
   * @public
   * @returns {Object} État de perception actuel
   */
  getCurrentPerception() {
    return { ...this.#perceptionCache };
  }

  /**
   * Suggère des adaptations stratégiques
   * @public
   * @returns {Object|null} Suggestions d'évolution ou null si en cooldown
   */
  suggestEvolutionTrajectory() {
    const now = Date.now();
    if (now - this.#lastEvolutionSuggestion < this.#cooldownPeriod) {
      console.log('⏳ Cooldown actif - Suggestion différée');
      return null;
    }

    const suggestions = {
      moodAdjustment: this.#calculateMoodAdjustment(),
      energyLevel: this.#calculateEnergyLevel(),
      stabilityThreshold: this.#calculateStabilityThreshold()
    };

    this.#lastEvolutionSuggestion = now;
    console.log('💫 Suggestions d\'évolution générées:', suggestions);
    return suggestions;
  }

  /**
   * Calcule les ajustements d'humeur nécessaires
   * @private
   * @returns {Object} Ajustements suggérés
   */
  #calculateMoodAdjustment() {
    const { stability, tension } = this.#perceptionCache;
    return {
      intensity: Math.max(0, 1 - tension),
      direction: stability > 0.7 ? 'positive' : 'neutral'
    };
  }

  /**
   * Calcule le niveau d'énergie optimal
   * @private
   * @returns {number} Niveau d'énergie suggéré
   */
  #calculateEnergyLevel() {
    const { harmony, stability } = this.#perceptionCache;
    return Math.min(1, Math.max(0, (harmony + stability) / 2));
  }

  /**
   * Calcule le seuil de stabilité optimal
   * @private
   * @returns {number} Seuil de stabilité suggéré
   */
  #calculateStabilityThreshold() {
    const { tension } = this.#perceptionCache;
    return Math.max(0.5, 1 - tension);
  }
} 