/**
 * PrismForecast - Système de prédiction comportementale pour PRISM
 * @class
 */

import prismBus from './prismBus.js';
import prismCircuitBreaker from './monitoring/prismCircuitBreaker.js';
import prismLoadBalancer from './monitoring/prismLoadBalancer.js';
import prismLogger from './monitoring/prismLogger.js';

export class PrismForecast {
  #forecastInterval = null;
  #degradationCount = 0;
  #lastPredictions = [];
  #maxPredictionHistory = 10;
  #pulseCount = 0;
  #pulseThreshold = 10;

  constructor() {
    this.state = {
      current: 'stable',
      confidence: 0,
      trend: 'neutral'
    };
    
    this.eventTarget = new EventTarget();
    this.#setupEventListeners();
    
    this.initializeForecast();
  }

  initializeForecast() {
    // Créer un circuit breaker pour la prédiction
    prismCircuitBreaker.createCircuit('forecast', {
      failureThreshold: 5,
      resetTimeout: 30000
    });
    
    // Créer une file d'attente pour les événements de prédiction
    prismLoadBalancer.createQueue('forecast', {
      maxQueueSize: 1000,
      batchSize: 100
    });
    
    // S'abonner aux événements de prédiction
    prismBus.on('prism:optimization:adaptation', (data) => {
      this.handleOptimizationAdaptation(data);
    });
  }

  /**
   * Initialise les écouteurs d'événements
   * @private
   */
  #setupEventListeners() {
    this.eventTarget.addEventListener('prism:forecast:update', (event) => {
      this.#handleForecastUpdate(event.detail);
    });
  }

  /**
   * Démarre le cycle de prédiction
   * @returns {boolean} Succès de l'initialisation
   */
  startForecastingCycle() {
    try {
      if (this.#forecastInterval) {
        return false;
      }

      this.#forecastInterval = setInterval(() => {
        this.#pulseCount++;
        if (this.#pulseCount >= this.#pulseThreshold) {
          this.predictNextState();
          this.#pulseCount = 0;
        }
      }, 1000);

      return true;
    } catch (error) {
      this.#logError('startForecastingCycle', error);
      return false;
    }
  }

  /**
   * Prédit le prochain état comportemental
   * @returns {Object} État prédit avec métadonnées
   */
  predictNextState() {
    try {
      const vitals = this.#getVitalsData();
      const mood = this.#getMoodData();
      const noesis = this.#getNoesisData();

      const prediction = this.#calculatePrediction(vitals, mood, noesis);
      this.#updatePredictionHistory(prediction);

      const forecastEvent = new CustomEvent('prism:forecast:update', {
        detail: {
          prediction,
          timestamp: Date.now(),
          confidence: this.#calculateConfidence()
        }
      });

      this.eventTarget.dispatchEvent(forecastEvent);
      this.#logForecast(prediction);
      
      // Ajouter l'événement à la file d'attente
      prismLoadBalancer.enqueue('forecast', {
        type: 'prediction',
        prediction,
        timestamp: Date.now()
      });

      return prediction;
    } catch (error) {
      this.#logError('predictNextState', error);
      return this.#getFallbackPrediction();
    }
  }

  /**
   * Arrête le cycle de prédiction
   */
  stopForecastingCycle() {
    if (this.#forecastInterval) {
      clearInterval(this.#forecastInterval);
      this.#forecastInterval = null;
      this.#pulseCount = 0;
    }
  }

  /**
   * Calcule la prédiction basée sur les données
   * @private
   * @param {Object} vitals - Données vitales
   * @param {Object} mood - Données d'humeur
   * @param {Object} noesis - Données noétiques
   * @returns {Object} Prédiction calculée
   */
  #calculatePrediction(vitals, mood, noesis) {
    const stabilityScore = this.#calculateStabilityScore(vitals, mood, noesis);
    const state = this.#determineState(stabilityScore);
    
    if (state === 'degraded') {
      this.#degradationCount++;
      if (this.#degradationCount >= 3) {
        this.#triggerAdaptation();
      }
    } else {
      this.#degradationCount = 0;
    }

    return {
      state,
      stabilityScore,
      timestamp: Date.now()
    };
  }

  /**
   * Détermine l'état basé sur le score de stabilité
   * @private
   * @param {number} score - Score de stabilité
   * @returns {string} État déterminé
   */
  #determineState(score) {
    if (score >= 0.8) return 'euphoric';
    if (score >= 0.6) return 'stable';
    if (score >= 0.4) return 'unstable';
    return 'degraded';
  }

  /**
   * Calcule le score de stabilité
   * @private
   * @param {Object} vitals - Données vitales
   * @param {Object} mood - Données d'humeur
   * @param {Object} noesis - Données noétiques
   * @returns {number} Score de stabilité
   */
  #calculateStabilityScore(vitals, mood, noesis) {
    // Implémentation de l'algorithme de scoring
    const weights = {
      vitals: 0.4,
      mood: 0.3,
      noesis: 0.3
    };

    return (
      this.#normalizeVitals(vitals) * weights.vitals +
      this.#normalizeMood(mood) * weights.mood +
      this.#normalizeNoesis(noesis) * weights.noesis
    );
  }

  /**
   * Déclenche l'adaptation en cas de dégradation persistante
   * @private
   */
  #triggerAdaptation() {
    const adaptationEvent = new CustomEvent('prism:forecast:adaptation', {
      detail: {
        trigger: 'degradation',
        timestamp: Date.now(),
        severity: this.#degradationCount
      }
    });
    this.eventTarget.dispatchEvent(adaptationEvent);
    
    // Logger l'adaptation
    prismLogger.info('Forecast adaptation triggered', {
      trigger: 'degradation',
      severity: this.#degradationCount
    });
  }

  /**
   * Met à jour l'historique des prédictions
   * @private
   * @param {Object} prediction - Nouvelle prédiction
   */
  #updatePredictionHistory(prediction) {
    this.#lastPredictions.push(prediction);
    if (this.#lastPredictions.length > this.#maxPredictionHistory) {
      this.#lastPredictions.shift();
    }
  }

  /**
   * Calcule le niveau de confiance de la prédiction
   * @private
   * @returns {number} Niveau de confiance
   */
  #calculateConfidence() {
    if (this.#lastPredictions.length < 2) return 0.5;
    
    const recentPredictions = this.#lastPredictions.slice(-3);
    const consistency = recentPredictions.every(p => p.state === recentPredictions[0].state);
    return consistency ? 0.9 : 0.6;
  }

  /**
   * Gère la mise à jour des prédictions
   * @private
   * @param {Object} detail - Détails de la prédiction
   */
  #handleForecastUpdate(detail) {
    this.state = {
      current: detail.prediction.state,
      confidence: detail.confidence,
      trend: this.#calculateTrend()
    };
  }

  /**
   * Calcule la tendance actuelle
   * @private
   * @returns {string} Tendance calculée
   */
  #calculateTrend() {
    if (this.#lastPredictions.length < 2) return 'neutral';
    
    const recentStates = this.#lastPredictions.slice(-3).map(p => p.state);
    const uniqueStates = new Set(recentStates);
    
    if (uniqueStates.size === 1) return 'stable';
    if (recentStates[recentStates.length - 1] === 'degraded') return 'declining';
    return 'improving';
  }

  /**
   * Journalise la prédiction de manière stylisée
   * @private
   * @param {Object} prediction - Prédiction à journaliser
   */
  #logForecast(prediction) {
    const styles = {
      stable: 'color: #4CAF50',
      unstable: 'color: #FFC107',
      euphoric: 'color: #2196F3',
      degraded: 'color: #F44336'
    };

    console.log(
      `%c[PRISM Forecast] État: ${prediction.state} | Score: ${prediction.stabilityScore.toFixed(2)}`,
      styles[prediction.state]
    );
    
    // Logger la prédiction
    prismLogger.info('Forecast prediction', { prediction });
  }

  /**
   * Journalise les erreurs
   * @private
   * @param {string} context - Contexte de l'erreur
   * @param {Error} error - Erreur survenue
   */
  #logError(context, error) {
    console.error(`[PRISM Forecast Error] ${context}:`, error);
    
    // Logger l'erreur
    prismLogger.error('Forecast error', { context, error });
  }

  /**
   * Récupère les données vitales
   * @private
   * @returns {Object} Données vitales
   */
  #getVitalsData() {
    // À implémenter selon l'architecture existante
    return {};
  }

  /**
   * Récupère les données d'humeur
   * @private
   * @returns {Object} Données d'humeur
   */
  #getMoodData() {
    // À implémenter selon l'architecture existante
    return {};
  }

  /**
   * Récupère les données noétiques
   * @private
   * @returns {Object} Données noétiques
   */
  #getNoesisData() {
    // À implémenter selon l'architecture existante
    return {};
  }

  /**
   * Normalise les données vitales
   * @private
   * @param {Object} vitals - Données vitales brutes
   * @returns {number} Score normalisé
   */
  #normalizeVitals(_vitals) {
    // À implémenter selon les métriques spécifiques
    return 0.5;
  }

  /**
   * Normalise les données d'humeur
   * @private
   * @param {Object} mood - Données d'humeur brutes
   * @returns {number} Score normalisé
   */
  #normalizeMood(_mood) {
    // À implémenter selon les métriques spécifiques
    return 0.5;
  }

  /**
   * Normalise les données noétiques
   * @private
   * @param {Object} noesis - Données noétiques brutes
   * @returns {number} Score normalisé
   */
  #normalizeNoesis(_noesis) {
    // À implémenter selon les métriques spécifiques
    return 0.5;
  }

  /**
   * Fournit une prédiction de secours en cas d'erreur
   * @private
   * @returns {Object} Prédiction de secours
   */
  #getFallbackPrediction() {
    return {
      state: 'stable',
      stabilityScore: 0.5,
      timestamp: Date.now()
    };
  }

  async handleOptimizationAdaptation(data) {
    try {
      // Exécuter l'adaptation via le circuit breaker
      await prismCircuitBreaker.execute('forecast', async () => {
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
      // Réduire la fréquence de prédiction
      this.#pulseThreshold = Math.max(5, this.#pulseThreshold - 1);
    } else if (thresholds.responseTime > 300) {
      // Augmenter la fréquence de prédiction
      this.#pulseThreshold = Math.min(15, this.#pulseThreshold + 1);
    }
  }

  async adaptStability(adaptation) {
    const { parameters } = adaptation;
    
    // Ajuster les paramètres de stabilité
    if (parameters.checkInterval < 1000) {
      // Réduire la taille de l'historique
      this.#maxPredictionHistory = Math.max(5, this.#maxPredictionHistory - 1);
    } else if (parameters.checkInterval > 2000) {
      // Augmenter la taille de l'historique
      this.#maxPredictionHistory = Math.min(15, this.#maxPredictionHistory + 1);
    }
  }

  async adaptLoad(adaptation) {
    const { parameters } = adaptation;
    
    // Ajuster les paramètres de charge
    if (parameters.batchSize < 50) {
      // Réduire la fréquence de prédiction
      this.#pulseThreshold = Math.max(5, this.#pulseThreshold - 1);
    } else if (parameters.batchSize > 150) {
      // Augmenter la fréquence de prédiction
      this.#pulseThreshold = Math.min(15, this.#pulseThreshold + 1);
    }
  }
} 