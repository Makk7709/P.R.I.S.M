/**
 * @fileoverview Module d'analyse comportementale avancée pour PRISM Codex
 * @module PrismCodexAnalyzer
 */

import PrismStateStore from '../persistence/prismStateStore.js';
import { PrismProfiler } from '../perf/prismProfiler.js';
import http from 'http';

const stateStore = new PrismStateStore();

/**
 * @class PrismCodexAnalyzer
 * @description Analyseur comportemental pour le module PRISM Codex
 */
export default class PrismCodexAnalyzer {
  static STORAGE_KEY = 'CodexAnalyzer';
  static TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

  /**
   * @constructor
   * @param {Object} options - Options de configuration
   * @param {number} options.analysisWindow - Fenêtre d'analyse en millisecondes (défaut: 24h)
   * @param {number} options.temporalWeight - Coefficient de pondération temporelle (défaut: 0.8)
   * @param {number} options.patternSensitivity - Seuil de détection des patterns émergents (défaut: 5)
   */
  constructor(options = {}) {
    this.analysisWindow = options.analysisWindow || 24 * 60 * 60 * 1000; // 24h par défaut
    this.temporalWeight = options.temporalWeight || 0.8;
    this.patternSensitivity = options.patternSensitivity || 5;
    this.eventBuffer = [];
    this.isAnalyzing = false;
    
    // Nouvelles structures pour les métriques externes
    this.externalMetrics = new Map();
    this.metricWeights = new Map();
    this.metricHistory = new Map();
    this.metricUpdateThreshold = 1000; // 1 seconde entre les mises à jour
    this.lastMetricUpdate = new Map();

    // Table de confiance des directives
    this.directiveConfidences = new Map();
  }

  /**
   * Hydrate l'analyseur avec des données persistantes
   * @param {Object} data - Données à hydrater
   * @param {Object} data.directiveConfidences - Map des confiances des directives
   */
  hydrate(data) {
    if (data.directiveConfidences) {
      // Validation et normalisation des valeurs de confiance
      const validatedConfidences = new Map();
      for (const [directive, confidence] of Object.entries(data.directiveConfidences)) {
        const normalizedConfidence = Math.max(0, Math.min(1, confidence));
        validatedConfidences.set(directive, normalizedConfidence);
      }
      this.directiveConfidences = validatedConfidences;
      console.log('💧 Codex Analyzer hydrated with directive confidences');
    }
  }

  /**
   * Sauvegarde l'état actuel de l'analyseur
   * @returns {Promise<void>}
   */
  async saveState() {
    const state = {
      directiveConfidences: Object.fromEntries(this.directiveConfidences),
      timestamp: Date.now()
    };
    
    await stateStore.saveState(PrismCodexAnalyzer.STORAGE_KEY, state);
    console.log('💾 Codex Analyzer state saved');
  }

  /**
   * Charge l'état sauvegardé de l'analyseur
   * @returns {Promise<void>}
   */
  async loadState() {
    try {
      const state = await stateStore.loadState(PrismCodexAnalyzer.STORAGE_KEY);
      
      if (state) {
        const now = Date.now();
        const age = now - state.timestamp;
        
        // Vérification de la validité temporelle
        if (age <= PrismCodexAnalyzer.TTL_MS) {
          this.hydrate(state);
          console.log('📥 Codex Analyzer state loaded');
        } else {
          console.warn('⚠️ Codex Analyzer state expired, using defaults');
        }
      }
    } catch (error) {
      console.error('❌ Error loading Codex Analyzer state:', error);
    }
  }

  /**
   * Initialise l'analyseur et configure les listeners
   */
  async initialize() {
    await this.loadState();
    prismBus.subscribe('prism:codex:eventRecorded', this.handleNewEvent.bind(this));
    console.log('🔍 PrismCodexAnalyzer initialized');
  }

  /**
   * Gère les nouveaux événements du Codex
   * @param {Object} event - Événement enregistré
   * @private
   */
  handleNewEvent(event) {
    this.eventBuffer.push({
      ...event,
      timestamp: Date.now()
    });
    
    // Nettoyage des événements trop anciens
    this.cleanupOldEvents();
    
    // Déclenchement de l'analyse si nécessaire
    if (!this.isAnalyzing) {
      this.triggerAnalysis();
    }
  }

  /**
   * Nettoie les événements plus anciens que la fenêtre d'analyse
   * @private
   */
  cleanupOldEvents() {
    const cutoffTime = Date.now() - this.analysisWindow;
    this.eventBuffer = this.eventBuffer.filter(event => event.timestamp >= cutoffTime);
  }

  /**
   * Déclenche l'analyse comportementale
   * @private
   */
  async triggerAnalysis() {
    this.isAnalyzing = true;
    try {
      const trends = await this.detectBehavioralTrends();
      const nextState = await this.predictNextState(trends);
      
      // Émission des événements appropriés
      this.emitAnalysisEvents(trends, nextState);
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse comportementale:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Détecte les patterns émergents dans les événements récents
   * @private
   * @returns {Promise<Object|null>} Pattern détecté ou null
   */
  async _detectEmergentPatterns() {
    if (PrismProfiler.enabled) {
      PrismProfiler.start('codex:patterns');
    }

    const recentEvents = this.eventBuffer.slice(-this.patternSensitivity * 2);
    if (recentEvents.length < this.patternSensitivity) {
      if (PrismProfiler.enabled) {
        PrismProfiler.end('codex:patterns');
      }
      return null;
    }

    // Analyse des séquences d'événements
    const patterns = {
      drifts: 0,
      improvements: 0,
      anomalies: 0
    };

    let currentStreak = 0;
    let lastType = null;

    for (const event of recentEvents) {
      if (event.type === lastType) {
        currentStreak++;
      } else {
        currentStreak = 1;
        lastType = event.type;
      }

      if (currentStreak >= this.patternSensitivity) {
        patterns[event.type] = currentStreak;
      }
    }

    // Vérification des patterns significatifs
    for (const [type, count] of Object.entries(patterns)) {
      if (count >= this.patternSensitivity) {
        const pattern = {
          type,
          count,
          events: recentEvents.slice(-count),
          timestamp: Date.now()
        };

        // Émission de l'événement de pattern détecté
        prismBus.publish('prism:codex:patternDetected', pattern);
      }
    }

    if (PrismProfiler.enabled) {
      PrismProfiler.end('codex:patterns');
    }

    return patterns;
  }

  /**
   * Détecte les tendances comportementales
   * @returns {Promise<Object>} Tendances détectées
   */
  async detectBehavioralTrends() {
    const startTime = performance.now();
    const now = Date.now();
    
    // Optimisation: Utilisation de Map pour un accès O(1)
    const eventMap = new Map();
    this.eventBuffer.forEach(event => {
      const directiveConfidence = this.getDirectiveConfidence(event.directive);
      eventMap.set(event.id, {
        ...event,
        weight: Math.pow(this.temporalWeight, (now - event.timestamp) / (60 * 60 * 1000)) * directiveConfidence
      });
    });

    // Calculs parallèles pour optimiser la performance
    const [anomalies, improvements, drifts, modeChanges] = await Promise.all([
      this.calculateAnomalyTrend(eventMap),
      this.calculateImprovementTrend(eventMap),
      this.calculateDriftTrend(eventMap),
      this.calculateModeChangeFrequency(eventMap)
    ]);

    // Détection des patterns émergents
    await this._detectEmergentPatterns();

    const totalEvents = eventMap.size;
    const anomalyRate = anomalies / totalEvents;
    const improvementRatio = improvements / (improvements + drifts);

    const trends = {
      anomalies: anomalyRate,
      improvements,
      drifts,
      modeChanges,
      totalEvents,
      improvementRatio,
      isUnstable: anomalyRate > 0.15,
      isImproving: improvements > drifts,
      isDrifting: drifts > improvements && anomalyRate > 0.10
    };

    const endTime = performance.now();
    console.log(`📊 Analyse comportementale terminée en ${(endTime - startTime).toFixed(2)}ms`);

    return trends;
  }

  /**
   * Prédit l'état comportemental probable avec pondération temporelle exponentielle
   * @param {Object} trends - Tendances actuelles
   * @returns {Promise<Object>} Prédiction d'état avec justification
   */
  async predictNextState(trends) {
    const startTime = performance.now();
    const recentEvents = this.eventBuffer.slice(-100);
    const now = Date.now();

    // Calcul des poids temporels exponentiels
    const weightedEvents = recentEvents.map((event, index) => ({
      ...event,
      weight: Math.pow(2, index / 10) // Pondération exponentielle
    }));

    // Calcul des poids totaux par type d'événement
    const typeWeights = weightedEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + event.weight;
      return acc;
    }, {});

    // Intégration des métriques externes
    for (const [moduleId, metrics] of this.externalMetrics.entries()) {
      const weight = this.metricWeights.get(moduleId) || 0.5;
      const metricImpact = this._calculateMetricImpact(metrics);
      
      // Ajustement des poids en fonction des métriques externes
      for (const [type, impact] of Object.entries(metricImpact)) {
        typeWeights[type] = (typeWeights[type] || 0) * (1 + impact * weight);
      }
    }

    // Calcul du poids total pour normalisation
    const totalWeight = Object.values(typeWeights).reduce((sum, weight) => sum + weight, 0);

    // Calcul des pourcentages pondérés
    const percentages = Object.entries(typeWeights).reduce((acc, [type, weight]) => {
      acc[type] = (weight / totalWeight) * 100;
      return acc;
    }, {});

    // Détection d'effondrement latent
    const stagnationPercentage = percentages.stagnation || 0;
    const isLatentCollapse = stagnationPercentage > 60 && 
                            weightedEvents.slice(-10).some(e => e.weight > 0.8);

    let predictedState;
    let confidence;
    let justification;

    if (isLatentCollapse) {
      predictedState = 'Effondrement latent';
      confidence = 0.9;
      justification = `Détection d'une stagnation élevée (${stagnationPercentage.toFixed(1)}%) avec forte pondération récente`;
    } else if (percentages.improvement > 40) {
      predictedState = 'Expansion comportementale';
      confidence = 0.8;
      justification = `Tendance positive dominante (${percentages.improvement.toFixed(1)}% d'améliorations)`;
    } else if (percentages.drift > 30) {
      predictedState = 'Dérive comportementale';
      confidence = 0.7;
      justification = `Présence significative de dérives (${percentages.drift.toFixed(1)}%)`;
    } else {
      predictedState = 'Stagnation comportementale';
      confidence = 0.6;
      justification = `Équilibre des forces comportementales (${Object.entries(percentages)
        .map(([type, pct]) => `${type}: ${pct.toFixed(1)}%`)
        .join(', ')})`;
    }

    const prediction = {
      timestamp: Date.now() + 5 * 60 * 1000,
      state: predictedState,
      confidence,
      justification,
      percentages,
      externalMetrics: Array.from(this.externalMetrics.entries()).map(([id, metrics]) => ({
        moduleId: id,
        weight: this.metricWeights.get(id),
        metrics
      }))
    };

    const endTime = performance.now();
    console.log(`🔮 Prédiction générée en ${(endTime - startTime).toFixed(2)}ms`);

    return prediction;
  }

  /**
   * Prédit l'état global du système en intégrant les métriques externes
   * @returns {Promise<Object>} Prédiction de l'état système
   */
  async predictSystemState() {
    const startTime = performance.now();
    
    // Récupération des tendances comportementales
    const trends = await this.detectBehavioralTrends();
    
    // Calcul du risque systémique
    const systemRisk = await this._calculateSystemRisk(trends);
    
    // Génération de la prédiction composite
    const prediction = {
      timestamp: Date.now(),
      behavioralState: await this.predictNextState(trends),
      systemRisk,
      externalMetrics: Array.from(this.externalMetrics.entries()).map(([id, metrics]) => ({
        moduleId: id,
        weight: this.metricWeights.get(id),
        metrics,
        impact: this._calculateMetricImpact(metrics)
      })),
      recommendations: this._generateSystemRecommendations(systemRisk, trends)
    };

    // Émission de l'événement de prédiction système
    prismBus.emit('prism:codex:systemPrediction', prediction);

    const endTime = performance.now();
    console.log(`🌐 Prédiction système générée en ${(endTime - startTime).toFixed(2)}ms`);

    return prediction;
  }

  /**
   * Calcule l'impact des métriques externes sur les prédictions
   * @private
   * @param {Object} metrics - Métriques normalisées
   * @returns {Object} Impact sur chaque type d'événement
   */
  _calculateMetricImpact(metrics) {
    const impact = {
      improvement: 0,
      drift: 0,
      stagnation: 0
    };

    // Exemple de calcul d'impact basé sur des métriques spécifiques
    if (metrics.awakeLevel) {
      impact.improvement += metrics.awakeLevel * 0.3;
      impact.stagnation -= metrics.awakeLevel * 0.2;
    }
    if (metrics.cognitiveVitality) {
      impact.improvement += metrics.cognitiveVitality * 0.4;
      impact.drift -= metrics.cognitiveVitality * 0.3;
    }
    if (metrics.adaptiveInertia) {
      impact.stagnation += metrics.adaptiveInertia * 0.3;
      impact.improvement -= metrics.adaptiveInertia * 0.2;
    }

    return impact;
  }

  /**
   * Calcule le risque systémique global
   * @private
   * @param {Object} trends - Tendances comportementales
   * @returns {Promise<Object>} Évaluation du risque systémique
   */
  async _calculateSystemRisk(trends) {
    const riskFactors = {
      behavioral: trends.anomalies * 0.4 + (1 - trends.improvementRatio) * 0.3,
      external: 0,
      temporal: 0
    };

    // Calcul du risque basé sur les métriques externes
    for (const [moduleId, metrics] of this.externalMetrics.entries()) {
      const weight = this.metricWeights.get(moduleId) || 0.5;
      const moduleRisk = this._calculateModuleRisk(metrics);
      riskFactors.external += moduleRisk * weight;
    }

    // Normalisation du risque externe
    riskFactors.external = Math.min(1, riskFactors.external);

    // Calcul du risque temporel basé sur l'historique
    riskFactors.temporal = this._calculateTemporalRisk();

    // Risque systémique global
    const systemRisk = {
      level: (riskFactors.behavioral * 0.5 + riskFactors.external * 0.3 + riskFactors.temporal * 0.2),
      factors: riskFactors,
      timestamp: Date.now()
    };

    return systemRisk;
  }

  /**
   * Calcule le risque spécifique à un module
   * @private
   * @param {Object} metrics - Métriques du module
   * @returns {number} Niveau de risque (0-1)
   */
  _calculateModuleRisk(metrics) {
    let risk = 0;
    
    // Exemples de calculs de risque basés sur des métriques spécifiques
    if (metrics.awakeLevel !== undefined) {
      risk += (1 - metrics.awakeLevel) * 0.3;
    }
    if (metrics.cognitiveVitality !== undefined) {
      risk += (1 - metrics.cognitiveVitality) * 0.4;
    }
    if (metrics.adaptiveInertia !== undefined) {
      risk += metrics.adaptiveInertia * 0.3;
    }

    return Math.min(1, risk);
  }

  /**
   * Calcule le risque temporel basé sur l'historique
   * @private
   * @returns {number} Niveau de risque temporel (0-1)
   */
  _calculateTemporalRisk() {
    let risk = 0;
    const now = Date.now();

    // Analyse de l'historique des métriques
    for (const [moduleId, history] of this.metricHistory.entries()) {
      if (history.length < 2) continue;

      const recentMetrics = history.slice(-5);
      const metricVariance = this._calculateMetricVariance(recentMetrics);
      risk += metricVariance * (this.metricWeights.get(moduleId) || 0.5);
    }

    return Math.min(1, risk / this.metricHistory.size);
  }

  /**
   * Calcule la variance des métriques sur une période
   * @private
   * @param {Array} metrics - Historique des métriques
   * @returns {number} Variance normalisée (0-1)
   */
  _calculateMetricVariance(metrics) {
    if (metrics.length < 2) return 0;

    const values = metrics.map(m => {
      const sum = Object.values(m.metrics).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
      return sum / Object.keys(m.metrics).length;
    });

    const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;

    return Math.min(1, variance);
  }

  /**
   * Génère des recommandations basées sur l'état du système
   * @private
   * @param {Object} systemRisk - Évaluation du risque systémique
   * @param {Object} trends - Tendances comportementales
   * @returns {Array} Liste de recommandations
   */
  _generateSystemRecommendations(systemRisk, trends) {
    const recommendations = [];

    if (systemRisk.level > 0.7) {
      recommendations.push({
        priority: 'high',
        action: 'Réduction immédiate de la charge système',
        justification: 'Risque systémique critique détecté'
      });
    }

    if (trends.anomalies > 0.2) {
      recommendations.push({
        priority: 'medium',
        action: 'Renforcement des mécanismes de stabilisation',
        justification: 'Taux d\'anomalies élevé'
      });
    }

    if (systemRisk.factors.external > 0.6) {
      recommendations.push({
        priority: 'medium',
        action: 'Optimisation des interactions inter-modules',
        justification: 'Risque externe significatif'
      });
    }

    return recommendations;
  }

  /**
   * Analyse les tendances récentes
   * @param {Array} events - Événements récents
   * @returns {Promise<Object>} Analyse des tendances récentes
   * @private
   */
  async analyzeRecentTrends(events) {
    const now = Date.now();
    const weightedEvents = events.map(event => ({
      ...event,
      weight: Math.pow(this.temporalWeight, (now - event.timestamp) / (60 * 60 * 1000))
    }));

    const [instability, improvement] = await Promise.all([
      this.calculateInstability(weightedEvents),
      this.calculateImprovement(weightedEvents)
    ]);

    return { instability, improvement };
  }

  /**
   * Calcule le taux d'anomalies
   * @param {Map} events - Événements pondérés
   * @returns {Promise<number>} Taux d'anomalies
   * @private
   */
  async calculateAnomalyTrend(events) {
    let anomalyCount = 0;
    for (const event of events.values()) {
      if (event.type === 'anomaly' || event.severity > 0.8) {
        anomalyCount += event.weight;
      }
    }
    return anomalyCount;
  }

  /**
   * Calcule le taux d'améliorations
   * @param {Map} events - Événements pondérés
   * @returns {Promise<number>} Taux d'améliorations
   * @private
   */
  async calculateImprovementTrend(events) {
    let improvementCount = 0;
    for (const event of events.values()) {
      if (event.type === 'improvement' || event.impact > 0.7) {
        improvementCount += event.weight;
      }
    }
    return improvementCount;
  }

  /**
   * Calcule le taux de dérives
   * @param {Map} events - Événements pondérés
   * @returns {Promise<number>} Taux de dérives
   * @private
   */
  async calculateDriftTrend(events) {
    let driftCount = 0;
    for (const event of events.values()) {
      if (event.type === 'drift' || event.impact < -0.7) {
        driftCount += event.weight;
      }
    }
    return driftCount;
  }

  /**
   * Calcule la fréquence des changements de mode
   * @param {Map} events - Événements pondérés
   * @returns {Promise<number>} Fréquence des changements
   * @private
   */
  async calculateModeChangeFrequency(events) {
    let modeChanges = 0;
    let lastMode = null;
    
    for (const event of events.values()) {
      if (event.mode && event.mode !== lastMode) {
        modeChanges++;
        lastMode = event.mode;
      }
    }
    
    return modeChanges;
  }

  /**
   * Calcule l'instabilité récente
   * @param {Array} events - Événements récents
   * @returns {Promise<number>} Score d'instabilité
   * @private
   */
  async calculateInstability(events) {
    const anomalies = events.filter(e => e.type === 'anomaly' || e.severity > 0.8);
    return anomalies.length / events.length;
  }

  /**
   * Calcule l'amélioration récente
   * @param {Array} events - Événements récents
   * @returns {Promise<number>} Score d'amélioration
   * @private
   */
  async calculateImprovement(events) {
    const improvements = events.filter(e => e.type === 'improvement' || e.impact > 0.7);
    return improvements.length / events.length;
  }

  /**
   * Émet les événements d'analyse appropriés
   * @param {Object} trends - Tendances détectées
   * @param {Object} nextState - État prédit
   * @private
   */
  emitAnalysisEvents(trends, nextState) {
    const timestamp = Date.now();
    const baseEventData = {
      timestamp,
      confidence: nextState.confidence,
      trends: {
        anomalies: trends.anomalies,
        improvements: trends.improvements,
        drifts: trends.drifts,
        modeChanges: trends.modeChanges
      }
    };

    // Émission des événements en fonction des conditions
    if (trends.isDrifting) {
      console.log('⚠️ Détection d\'une dérive comportementale');
      prismBus.emit('prism:codex:behavioralDriftDetected', {
        ...baseEventData,
        severity: trends.drifts,
        summary: 'Dérive comportementale détectée avec un taux d\'anomalies élevé'
      });
    }

    if (trends.isImproving) {
      console.log('📈 Détection d\'une amélioration stable');
      prismBus.emit('prism:codex:stableImprovementDetected', {
        ...baseEventData,
        improvementRatio: trends.improvementRatio,
        summary: 'Amélioration comportementale stable détectée'
      });
    }

    if (nextState.state === 'Effondrement comportemental') {
      console.log('🚨 Détection d\'un risque d\'effondrement');
      prismBus.emit('prism:codex:collapseRiskDetected', {
        ...baseEventData,
        risk: nextState.confidence,
        summary: 'Risque d\'effondrement comportemental détecté',
        predictedState: nextState.state
      });
    }
  }

  // Méthodes utilitaires d'analyse
  calculatePredictionConfidence(trends) {
    // TODO: Implémenter le calcul de confiance
    return 0;
  }

  inferNextState(trends) {
    // TODO: Implémenter l'inférence d'état
    return {};
  }

  detectCollapseRisk(trends, nextState) {
    // TODO: Implémenter la détection de risque d'effondrement
    return false;
  }

  calculateCollapseRisk(trends, nextState) {
    // TODO: Implémenter le calcul de risque d'effondrement
    return 0;
  }

  /**
   * Met à jour la confiance d'une directive
   * @param {string} directive - Identifiant de la directive
   * @param {number} confidence - Nouvelle valeur de confiance (0-1)
   */
  updateDirectiveConfidence(directive, confidence) {
    const normalizedConfidence = Math.max(0, Math.min(1, confidence));
    this.directiveConfidences.set(directive, normalizedConfidence);
    
    // Émission d'un événement de mise à jour
    prismBus.emit('prism:codex:directiveConfidenceUpdated', {
      directive,
      confidence: normalizedConfidence
    });
  }

  /**
   * Obtient la confiance actuelle d'une directive
   * @param {string} directive - Identifiant de la directive
   * @returns {number} Valeur de confiance (0-1)
   */
  getDirectiveConfidence(directive) {
    return this.directiveConfidences.get(directive) || 0.5; // Valeur par défaut
  }

  /**
   * Ajuste la confiance d'une directive en fonction des résultats d'analyse
   * @param {string} directive - Identifiant de la directive
   * @param {Object} analysisResult - Résultat de l'analyse
   * @param {number} analysisResult.success - Taux de succès (0-1)
   * @param {number} analysisResult.relevance - Pertinence (0-1)
   */
  adjustDirectiveConfidence(directive, analysisResult) {
    const currentConfidence = this.getDirectiveConfidence(directive);
    const { success, relevance } = analysisResult;
    
    // Calcul du nouvel ajustement
    const adjustment = (success * 0.7 + relevance * 0.3) - 0.5;
    const newConfidence = Math.max(0, Math.min(1, currentConfidence + adjustment * 0.1));
    
    this.updateDirectiveConfidence(directive, newConfidence);
  }

  /**
   * S'abonne aux métriques externes et configure l'auto-tuning
   * @param {Object} options - Options de configuration
   * @param {string} options.source - Source des métriques ('prometheus')
   * @param {string} options.url - URL du serveur de métriques
   * @param {number} options.interval - Intervalle de scraping en ms (défaut: 10min)
   * @returns {Promise<void>}
   */
  async subscribeExternalMetrics(options = {}) {
    const {
      source = 'prometheus',
      url = 'http://localhost:9100/metrics',
      interval = 10 * 60 * 1000 // 10 minutes
    } = options;

    if (source !== 'prometheus') {
      throw new Error('Only Prometheus metrics source is supported');
    }

    // Fonction pour scraper les métriques
    const scrapeMetrics = async () => {
      try {
        const response = await new Promise((resolve, reject) => {
          const req = http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
          });
          req.on('error', reject);
          req.setTimeout(5000, () => req.destroy());
        });

        if (response.statusCode !== 200) {
          throw new Error(`HTTP ${response.statusCode}`);
        }

        // Parser les métriques
        const metrics = this._parsePrometheusMetrics(response.data);
        
        // Analyser et ajuster les paramètres
        await this._autoTuneParameters(metrics);

      } catch (error) {
        console.error('Error scraping metrics:', error);
      }
    };

    // Démarrer le scraping périodique
    setInterval(scrapeMetrics, interval);
    
    // Premier scraping immédiat
    await scrapeMetrics();
  }

  /**
   * Parse les métriques au format Prometheus
   * @param {string} data - Données brutes Prometheus
   * @returns {Object} Métriques parsées
   * @private
   */
  _parsePrometheusMetrics(data) {
    const metrics = {
      efficiency: null,
      latencies: {},
      cyclerInterval: null
    };

    // Parser chaque ligne
    for (const line of data.split('\n')) {
      if (line.startsWith('#')) continue; // Ignorer les commentaires

      if (line.includes('prism_efficiency_percent')) {
        const match = line.match(/prism_efficiency_percent\s+(\d+\.?\d*)/);
        if (match) {
          metrics.efficiency = parseFloat(match[1]);
        }
      }

      if (line.includes('prism_latency_seconds_sum')) {
        const match = line.match(/prism_latency_seconds_sum{segment="(\w+)"}\s+(\d+\.?\d*)/);
        if (match) {
          const [, segment, value] = match;
          metrics.latencies[segment] = parseFloat(value);
        }
      }

      if (line.includes('prism_cycler_interval_ms')) {
        const match = line.match(/prism_cycler_interval_ms\s+(\d+\.?\d*)/);
        if (match) {
          metrics.cyclerInterval = parseFloat(match[1]);
        }
      }
    }

    return metrics;
  }

  /**
   * Ajuste automatiquement les paramètres en fonction des métriques
   * @param {Object} metrics - Métriques analysées
   * @returns {Promise<void>}
   * @private
   */
  async _autoTuneParameters(metrics) {
    const adjustments = [];

    // Vérifier l'efficacité
    if (metrics.efficiency !== null && metrics.efficiency < 60) {
      const currentThreshold = await this._getAuroraThreshold();
      const newThreshold = currentThreshold * 0.95; // -5%
      await this._setAuroraThreshold(newThreshold);
      adjustments.push({ type: 'aurora_threshold', value: newThreshold });
    }

    // Vérifier les latences
    for (const [segment, latency] of Object.entries(metrics.latencies)) {
      const budget = this._getLatencyBudget(segment);
      if (latency > budget * 0.8) { // >80% du budget
        const currentInterval = metrics.cyclerInterval;
        const newInterval = currentInterval * 1.2; // +20%
        await this._setCyclerInterval(newInterval);
        adjustments.push({ type: 'cycler_interval', value: newInterval });
      }
    }

    // Émettre l'événement d'ajustement si des changements ont été faits
    if (adjustments.length > 0) {
      prismBus.emit('prism:codex:thresholdsAdjusted', {
        adjustments,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Récupère le seuil Aurora actuel
   * @returns {Promise<number>}
   * @private
   */
  async _getAuroraThreshold() {
    const state = await stateStore.loadState('aurora');
    return state?.threshold || 0.75; // Valeur par défaut
  }

  /**
   * Définit le nouveau seuil Aurora
   * @param {number} value - Nouvelle valeur
   * @returns {Promise<void>}
   * @private
   */
  async _setAuroraThreshold(value) {
    await stateStore.saveState('aurora', { threshold: value });
  }

  /**
   * Définit le nouvel intervalle du Cycler
   * @param {number} value - Nouvelle valeur en ms
   * @returns {Promise<void>}
   * @private
   */
  async _setCyclerInterval(value) {
    await stateStore.saveState('cycler', { interval: value });
  }

  /**
   * Retourne le budget de latence pour un segment
   * @param {string} segment - Nom du segment
   * @returns {number} Budget en secondes
   * @private
   */
  _getLatencyBudget(segment) {
    const budgets = {
      strategic: 2.0,
      cycler: 1.0,
      codex: 3.0
    };
    return budgets[segment] || 1.0;
  }
} 