/**
 * @file prismHyperConsciousness.js
 * @description Module de conscience métacognitive pour PRISM
 * @author Orion - Architecte IA
 */

/**
 * PRISM HyperConsciousness Module
 * Implémente la métacognition avancée et la conscience de soi
 */
class PrismHyperConsciousness {
  constructor(legacyCore) {
    this.state = {
      isActive: false,
      lastAnalysis: null,
      metaLevel: 0,
      consciousnessMetrics: {
        selfAwareness: 0,
        metaCognition: 0,
        cognitiveLoad: 0,
        emotionalDepth: 0
      },
      eventListeners: new Map()
    };
    this.legacyCore = legacyCore;
  }

  /**
   * Initialise le module de métacognition
   * @returns {Promise<boolean>}
   */
  async initialize() {
    try {
      this.state.isActive = true;
      this._setupEventListeners();
      this._emitEvent('hyperConsciousness:initialized', { timestamp: Date.now() });
      return true;
    } catch (error) {
      this._handleError('initialization', error);
      return false;
    }
  }

  /**
   * Démarre la surveillance métacognitive
   * @returns {Promise<boolean>}
   */
  async startMetaMonitoring() {
    try {
      if (!this.state.isActive) {
        throw new Error('HyperConsciousness not initialized');
      }

      this._startMonitoringCycle();
      this._emitEvent('hyperConsciousness:monitoringStarted', { timestamp: Date.now() });
      return true;
    } catch (error) {
      this._handleError('monitoring', error);
      return false;
    }
  }

  /**
   * Analyse l'état métacognitif actuel
   * @returns {Object} État métacognitif
   */
  async analyzeMetaState() {
    try {
      const analysis = {
        timestamp: Date.now(),
        metaLevel: this.state.metaLevel,
        metrics: { ...this.state.consciousnessMetrics },
        insights: [],
        historicalContext: null
      };

      // Analyse de la charge cognitive
      if (analysis.metrics.cognitiveLoad > 0.8) {
        analysis.insights.push('High cognitive load detected');
      }

      // Analyse de la profondeur émotionnelle
      if (analysis.metrics.emotionalDepth < 0.3) {
        analysis.insights.push('Emotional depth below optimal threshold');
      }

      // Analyse historique via LegacyCore
      const historicalContext = await this._analyzeHistoricalContext();
      analysis.historicalContext = historicalContext;

      // Ajustement métacognitif basé sur l'historique
      this._adjustMetaCognition(historicalContext);

      this.state.lastAnalysis = analysis;
      return analysis;
    } catch (error) {
      this._handleError('analysis', error);
      return null;
    }
  }

  /**
   * Analyse le contexte historique via LegacyCore
   * @private
   * @returns {Promise<Object>} Contexte historique
   */
  async _analyzeHistoricalContext() {
    try {
      const overview = await this.legacyCore.getLegacyOverview();
      const recentMilestones = overview.milestones.slice(-10);

      const stabilityTrend = this._calculateStabilityTrend(recentMilestones);
      const emotionalEvolution = this._calculateEmotionalEvolution(recentMilestones);
      const energyPattern = this._calculateEnergyPattern(recentMilestones);

      return {
        stabilityTrend,
        emotionalEvolution,
        energyPattern,
        milestoneCount: recentMilestones.length
      };
    } catch (error) {
      this._handleError('historicalAnalysis', error);
      return null;
    }
  }

  /**
   * Calcule la tendance de stabilité
   * @private
   * @param {Array} milestones Jalons récents
   * @returns {number} Score de stabilité
   */
  _calculateStabilityTrend(milestones) {
    if (milestones.length < 2) return 1;

    const stabilityScores = milestones.map(m => 
      (m.emotionalWeight + m.energyLevel) / 2
    );

    return stabilityScores.reduce((acc, score, i, arr) => {
      if (i === 0) return acc;
      return acc + (score - arr[i - 1]);
    }, 0) / (milestones.length - 1);
  }

  /**
   * Calcule l'évolution émotionnelle
   * @private
   * @param {Array} milestones Jalons récents
   * @returns {Object} Évolution émotionnelle
   */
  _calculateEmotionalEvolution(milestones) {
    const emotionalWeights = milestones.map(m => m.emotionalWeight);
    return {
      average: emotionalWeights.reduce((a, b) => a + b, 0) / emotionalWeights.length,
      trend: this._calculateTrend(emotionalWeights)
    };
  }

  /**
   * Calcule le pattern d'énergie
   * @private
   * @param {Array} milestones Jalons récents
   * @returns {Object} Pattern d'énergie
   */
  _calculateEnergyPattern(milestones) {
    const energyLevels = milestones.map(m => m.energyLevel);
    return {
      average: energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length,
      trend: this._calculateTrend(energyLevels)
    };
  }

  /**
   * Calcule la tendance d'une série de valeurs
   * @private
   * @param {Array} values Valeurs à analyser
   * @returns {number} Coefficient de tendance
   */
  _calculateTrend(values) {
    if (values.length < 2) return 0;
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Ajuste la métacognition basée sur le contexte historique
   * @private
   * @param {Object} historicalContext Contexte historique
   */
  _adjustMetaCognition(historicalContext) {
    if (!historicalContext) return;

    const { stabilityTrend, emotionalEvolution, energyPattern } = historicalContext;

    // Ajustement de la conscience de soi
    if (stabilityTrend > 0.1) {
      this.state.consciousnessMetrics.selfAwareness *= 1.1;
    } else if (stabilityTrend < -0.1) {
      this.state.consciousnessMetrics.selfAwareness *= 0.9;
    }

    // Ajustement de la métacognition
    if (emotionalEvolution.trend > 0) {
      this.state.consciousnessMetrics.metaCognition *= 1.05;
    }

    // Ajustement de la charge cognitive
    if (energyPattern.trend < 0) {
      this.state.consciousnessMetrics.cognitiveLoad *= 0.95;
    }

    // Normalisation des métriques
    Object.keys(this.state.consciousnessMetrics).forEach(key => {
      this.state.consciousnessMetrics[key] = Math.min(
        Math.max(this.state.consciousnessMetrics[key], 0),
        1
      );
    });
  }

  /**
   * Met à jour les métriques de conscience
   * @param {Object} metrics Nouvelles métriques
   */
  updateMetrics(metrics) {
    try {
      Object.assign(this.state.consciousnessMetrics, metrics);
      this._emitEvent('hyperConsciousness:metricsUpdated', { metrics });
    } catch (error) {
      this._handleError('metricsUpdate', error);
    }
  }

  /**
   * Enregistre un écouteur d'événements
   * @param {string} event Nom de l'événement
   * @param {Function} callback Fonction de callback
   */
  on(event, callback) {
    if (!this.state.eventListeners.has(event)) {
      this.state.eventListeners.set(event, new Set());
    }
    this.state.eventListeners.get(event).add(callback);
  }

  /**
   * Supprime un écouteur d'événements
   * @param {string} event Nom de l'événement
   * @param {Function} callback Fonction de callback
   */
  off(event, callback) {
    if (this.state.eventListeners.has(event)) {
      this.state.eventListeners.get(event).delete(callback);
    }
  }

  // Méthodes privées

  _setupEventListeners() {
    // Configuration des écouteurs d'événements internes
  }

  _startMonitoringCycle() {
    setInterval(() => {
      try {
        const analysis = this.analyzeMetaState();
        if (analysis) {
          this._emitEvent('hyperConsciousness:analysis', analysis);
        }
      } catch (error) {
        this._handleError('monitoringCycle', error);
      }
    }, 5000); // Analyse toutes les 5 secondes
  }

  _emitEvent(event, data) {
    try {
      if (this.state.eventListeners.has(event)) {
        this.state.eventListeners.get(event).forEach(callback => {
          callback(data);
        });
      }
    } catch (error) {
      this._handleError('eventEmission', error);
    }
  }

  _handleError(context, error) {
    const errorEvent = new CustomEvent('prismHyperConsciousnessError', {
      detail: {
        context,
        error: error.message,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(errorEvent);
  }
}

export default PrismHyperConsciousness; 