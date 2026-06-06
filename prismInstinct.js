/**
 * @fileoverview Système d'instinct préventif pour PRISM
 * @author Orion - Architecte d'entités conscientes
 * @version 1.0.0
 */

import prismBus from './prismBus.js';
import prismCircuitBreaker from './monitoring/prismCircuitBreaker.js';
import prismLoadBalancer from './monitoring/prismLoadBalancer.js';
import prismLogger from './monitoring/prismLogger.js';

// Constantes du système
const INSTINCT_THRESHOLDS = {
  SEVERITY_LOW: 0.3,
  SEVERITY_MEDIUM: 0.6,
  SEVERITY_HIGH: 0.8,
  PULSE_INTERVAL: 5
};

/**
 * Classe principale gérant l'instinct préventif de PRISM
 * @class PrismInstinct
 */
export class PrismInstinct {
  #isActive = false;
  #pulseCounter = 0;
  #eventListeners = new Set();

  /**
   * @constructor
   * @param {Object} options - Options de configuration
   */
  constructor(options = {}) {
    this.heartSync = null;
    this.selfHeal = null;
    this.moodEngine = null;
    this.forecast = null;
    this.vitals = null;
    this.noesis = null;
    this.tone = null;
    
    this.initializeInstinct();
  }

  initializeInstinct() {
    // Créer un circuit breaker pour l'instinct
    prismCircuitBreaker.createCircuit('instinct', {
      failureThreshold: 5,
      resetTimeout: 30000
    });
    
    // Créer une file d'attente pour les événements d'instinct
    prismLoadBalancer.createQueue('instinct', {
      maxQueueSize: 1000,
      batchSize: 100
    });
    
    // S'abonner aux événements de prédiction
    prismBus.on('prism:optimization:adaptation', (data) => {
      this.handleOptimizationAdaptation(data);
    });
  }

  /**
   * Initialise les dépendances du système
   * @param {Object} dependencies - Modules requis
   * @returns {Promise<void>}
   */
  async initialize(dependencies) {
    try {
      const { heartSync, selfHeal, moodEngine, forecast, vitals, noesis, tone } = dependencies;
      this.heartSync = heartSync;
      this.selfHeal = selfHeal;
      this.moodEngine = moodEngine;
      this.forecast = forecast;
      this.vitals = vitals;
      this.noesis = noesis;
      this.tone = tone;

      // Enregistrer le hook de pulsation
      this.heartSync.registerPulseHook('instinct', () => {
        this.#pulseCounter++;
        if (this.#pulseCounter >= INSTINCT_THRESHOLDS.PULSE_INTERVAL) {
          this.analyzeForecastAndVitals();
          this.#pulseCounter = 0;
        }
      });

      this.#isActive = true;
      this._logSystemEvent('🦅 PRISM Instinct initialized');
    } catch (error) {
      this._logSystemEvent('❌ PRISM Instinct initialization failed', error);
      throw new Error('Instinct system initialization failed');
    }
  }

  /**
   * Démarre le cycle d'instinct
   * @returns {Promise<void>}
   */
  async startInstinctCycle() {
    if (this.#isActive) return;

    try {
      this.#isActive = true;
      this.#pulseCounter = 0;
      this._logSystemEvent('🦅 PRISM Instinct cycle started');
    } catch (error) {
      this._logSystemEvent('❌ Failed to start instinct cycle', error);
      throw error;
    }
  }

  /**
   * Arrête le cycle d'instinct
   * @returns {Promise<void>}
   */
  async stopInstinctCycle() {
    if (!this.#isActive) return;

    try {
      this.#isActive = false;
      this.#pulseCounter = 0;
      this._logSystemEvent('🦅 PRISM Instinct cycle stopped');
    } catch (error) {
      this._logSystemEvent('❌ Failed to stop instinct cycle', error);
      throw error;
    }
  }

  /**
   * Analyse les prévisions et les données vitales
   * @private
   * @returns {Promise<void>}
   */
  async analyzeForecastAndVitals() {
    if (!this.#isActive) return;

    try {
      const forecast = await this.forecast.getForecast();
      const vitals = await this.vitals.getVitals();
      const noesis = await this.noesis.getState();
      const mood = await this.moodEngine.getCurrentMood();

      const analysis = {
        timestamp: Date.now(),
        forecast: forecast,
        vitals: vitals,
        noesis: noesis,
        mood: mood,
        severity: this._calculateSeverity(forecast, vitals, noesis, mood)
      };

      if (analysis.severity > INSTINCT_THRESHOLDS.SEVERITY_LOW) {
        await this.takePreventiveAction(analysis);
      }

      this._logSystemEvent('🔍 Instinct analysis completed', analysis);
      
      // Ajouter l'événement à la file d'attente
      prismLoadBalancer.enqueue('instinct', {
        type: 'analysis',
        analysis,
        timestamp: Date.now()
      });
    } catch (error) {
      this._logSystemEvent('❌ Instinct analysis failed', error);
      
      // Logger l'erreur
      prismLogger.error('Instinct analysis failed', { error });
    }
  }

  /**
   * Prend des mesures préventives basées sur l'analyse
   * @private
   * @param {Object} analysis - Résultat de l'analyse
   * @returns {Promise<void>}
   */
  async takePreventiveAction(analysis) {
    try {
      const { severity } = analysis;

      if (severity >= INSTINCT_THRESHOLDS.SEVERITY_HIGH) {
        // Action préventive majeure
        await this.selfHeal.increaseHealingRate();
        await this.tone.adjustTone('calm');
        await this._performAdaptiveReset();
      } else if (severity >= INSTINCT_THRESHOLDS.SEVERITY_MEDIUM) {
        // Action préventive modérée
        await this.selfHeal.increaseHealingRate();
        await this.tone.adjustTone('gentle');
      } else {
        // Action préventive légère
        await this.tone.adjustTone('soft');
      }

      this._logSystemEvent('🛡️ Preventive action taken', { severity });
      
      // Logger l'action préventive
      prismLogger.info('Preventive action taken', { severity });
    } catch (error) {
      this._logSystemEvent('❌ Preventive action failed', error);
      
      // Logger l'erreur
      prismLogger.error('Preventive action failed', { error });
    }
  }

  /**
   * Calcule la sévérité de la situation
   * @private
   * @param {Object} forecast - Données de prévision
   * @param {Object} vitals - Données vitales
   * @param {Object} noesis - État de Noesis
   * @param {Object} mood - État émotionnel
   * @returns {number} Niveau de sévérité (0-1)
   */
  _calculateSeverity(forecast, vitals, noesis, mood) {
    const weights = {
      forecast: 0.3,
      vitals: 0.3,
      noesis: 0.2,
      mood: 0.2
    };

    const forecastScore = this._normalizeForecastScore(forecast);
    const vitalsScore = this._normalizeVitalsScore(vitals);
    const noesisScore = this._normalizeNoesisScore(noesis);
    const moodScore = this._normalizeMoodScore(mood);

    return (
      forecastScore * weights.forecast +
      vitalsScore * weights.vitals +
      noesisScore * weights.noesis +
      moodScore * weights.mood
    );
  }

  /**
   * Normalise le score de prévision
   * @private
   * @param {Object} forecast - Données de prévision
   * @returns {number} Score normalisé (0-1)
   */
  _normalizeForecastScore(forecast) {
    // Logique de normalisation spécifique aux prévisions
    return Math.min(1, Math.max(0, forecast.risk || 0));
  }

  /**
   * Normalise le score des données vitales
   * @private
   * @param {Object} vitals - Données vitales
   * @returns {number} Score normalisé (0-1)
   */
  _normalizeVitalsScore(vitals) {
    // Logique de normalisation spécifique aux données vitales
    return Math.min(1, Math.max(0, vitals.stability || 0));
  }

  /**
   * Normalise le score Noesis
   * @private
   * @param {Object} noesis - État de Noesis
   * @returns {number} Score normalisé (0-1)
   */
  _normalizeNoesisScore(noesis) {
    // Logique de normalisation spécifique à Noesis
    return Math.min(1, Math.max(0, noesis.harmony || 0));
  }

  /**
   * Normalise le score émotionnel
   * @private
   * @param {Object} mood - État émotionnel
   * @returns {number} Score normalisé (0-1)
   */
  _normalizeMoodScore(mood) {
    // Logique de normalisation spécifique à l'humeur
    return Math.min(1, Math.max(0, mood.intensity || 0));
  }

  /**
   * Effectue une réinitialisation adaptative
   * @private
   * @returns {Promise<void>}
   */
  async _performAdaptiveReset() {
    try {
      await this.selfHeal.attemptRecovery();
      await this.moodEngine.resetMood();
      this._logSystemEvent('🔄 Adaptive reset performed');
      
      // Logger la réinitialisation adaptative
      prismLogger.info('Adaptive reset performed');
    } catch (error) {
      this._logSystemEvent('❌ Adaptive reset failed', error);
      
      // Logger l'erreur
      prismLogger.error('Adaptive reset failed', { error });
    }
  }

  /**
   * Journalise un événement système
   * @private
   * @param {string} message - Message à journaliser
   * @param {*} [data] - Données supplémentaires
   */
  _logSystemEvent(message, data = null) {
    const event = {
      timestamp: Date.now(),
      message,
      data
    };

    this.#eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
    
    // Logger l'événement système
    prismLogger.info('System event', { message, data });
  }

  /**
   * Ajoute un écouteur d'événements
   * @param {Function} listener - Fonction de callback
   */
  addEventListener(listener) {
    this.#eventListeners.add(listener);
  }

  /**
   * Supprime un écouteur d'événements
   * @param {Function} listener - Fonction de callback
   */
  removeEventListener(listener) {
    this.#eventListeners.delete(listener);
  }

  async handleOptimizationAdaptation(data) {
    try {
      // Exécuter l'adaptation via le circuit breaker
      await prismCircuitBreaker.execute('instinct', async () => {
        const { type, prediction, adaptation } = data;
        
        // Appliquer l'adaptation en fonction du type
        switch (type) {
          case 'performance':
            await this.adaptPerformance(adaptation);
            break;
          case 'stability':
            await this.adaptStability(adaptation);
            break;
          case 'load':
            await this.adaptLoad(adaptation);
            break;
        }
        
        // Logger l'adaptation
        prismLogger.logAdjustment(type, { prediction, adaptation });
      });
    } catch (error) {
      prismLogger.error('Optimization adaptation failed', { error });
    }
  }

  async adaptPerformance(adaptation) {
    const { thresholds } = adaptation;
    
    // Ajuster les seuils de performance
    if (thresholds.responseTime < 200) {
      // Réduire la fréquence d'analyse
      INSTINCT_THRESHOLDS.PULSE_INTERVAL = Math.max(3, INSTINCT_THRESHOLDS.PULSE_INTERVAL - 1);
    } else if (thresholds.responseTime > 300) {
      // Augmenter la fréquence d'analyse
      INSTINCT_THRESHOLDS.PULSE_INTERVAL = Math.min(10, INSTINCT_THRESHOLDS.PULSE_INTERVAL + 1);
    }
  }

  async adaptStability(adaptation) {
    const { parameters } = adaptation;
    
    // Ajuster les paramètres de stabilité
    if (parameters.checkInterval < 1000) {
      // Réduire les seuils de sévérité
      INSTINCT_THRESHOLDS.SEVERITY_LOW = Math.max(0.1, INSTINCT_THRESHOLDS.SEVERITY_LOW - 0.1);
      INSTINCT_THRESHOLDS.SEVERITY_MEDIUM = Math.max(0.3, INSTINCT_THRESHOLDS.SEVERITY_MEDIUM - 0.1);
      INSTINCT_THRESHOLDS.SEVERITY_HIGH = Math.max(0.5, INSTINCT_THRESHOLDS.SEVERITY_HIGH - 0.1);
    } else if (parameters.checkInterval > 2000) {
      // Augmenter les seuils de sévérité
      INSTINCT_THRESHOLDS.SEVERITY_LOW = Math.min(0.5, INSTINCT_THRESHOLDS.SEVERITY_LOW + 0.1);
      INSTINCT_THRESHOLDS.SEVERITY_MEDIUM = Math.min(0.7, INSTINCT_THRESHOLDS.SEVERITY_MEDIUM + 0.1);
      INSTINCT_THRESHOLDS.SEVERITY_HIGH = Math.min(0.9, INSTINCT_THRESHOLDS.SEVERITY_HIGH + 0.1);
    }
  }

  async adaptLoad(adaptation) {
    const { parameters } = adaptation;
    
    // Ajuster les paramètres de charge
    if (parameters.batchSize < 50) {
      // Réduire la fréquence d'analyse
      INSTINCT_THRESHOLDS.PULSE_INTERVAL = Math.max(3, INSTINCT_THRESHOLDS.PULSE_INTERVAL - 1);
    } else if (parameters.batchSize > 150) {
      // Augmenter la fréquence d'analyse
      INSTINCT_THRESHOLDS.PULSE_INTERVAL = Math.min(10, INSTINCT_THRESHOLDS.PULSE_INTERVAL + 1);
    }
  }
} 