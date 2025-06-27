/**
 * PRISM Adaptive Weighting Engine
 * Système de pondération adaptative temps réel pour l'orchestration multi-IA
 * Élément technique brevetable A : Pondération adaptative temps réel
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import SecureJournalManager from './SecureJournalManager.js';
import { registerMetrics as registerWeightingEngineMetrics } from '../metrics/weightingEngineMetrics.js';

/**
 * Types de contexte pour la pondération
 */
export const ContextType = {
  FINANCE: 'finance',
  RESEARCH: 'research',
  CREATIVE: 'creative',
  ANALYSIS: 'analysis',
  TECHNICAL: 'technical',
  LEGAL: 'legal'
};

/**
 * Critères de pondération
 */
export const WeightCriteria = {
  PERFORMANCE: 'performance',
  COST: 'cost',
  LATENCY: 'latency',
  AVAILABILITY: 'availability',
  SPECIALIZATION: 'specialization',
  ACCURACY: 'accuracy'
};

/**
 * Moteur de pondération adaptative en temps réel
 * Apprend et ajuste les poids selon les performances observées
 */
export class AdaptiveWeightingEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      learningRate: config.learningRate || 0.01,
      adaptationWindow: config.adaptationWindow || 100, // Dernières 100 décisions
      minUpdateInterval: config.minUpdateInterval || 50, // 50ms minimum entre mises à jour
      contextMemorySize: config.contextMemorySize || 1000,
      ...config
    };

    this.minWeight = (config.minWeight ?? (config.adaptive ? config.adaptive.minWeight : undefined)) ?? 0.01;
    this.maxWeight = (config.maxWeight ?? (config.adaptive ? config.adaptive.maxWeight : undefined)) ?? 0.50;

    this.thresholds = {
      latencyMs: (config.thresholds && config.thresholds.latencyMs) ?? (config.adaptive && config.adaptive.thresholds ? config.adaptive.thresholds.latencyMs : 2000),
      costEuros: (config.thresholds && config.thresholds.costEuros) ?? (config.adaptive && config.adaptive.thresholds ? config.adaptive.thresholds.costEuros : 0.01),
      userSatisfaction: (config.thresholds && config.thresholds.userSatisfaction) ?? (config.adaptive && config.adaptive.thresholds ? config.adaptive.thresholds.userSatisfaction : 0.7)
    };

    this.snapshotIntervalMs = (config.snapshotIntervalMs ?? (config.adaptive ? config.adaptive.snapshotIntervalMs : undefined)) ?? 300000; // 5 minutes par défaut

    this.journal = new SecureJournalManager(config.secureJournal || {});

    this._snapshotTimer = setInterval(() => {
      this.saveSnapshot().catch(err => {
        console.warn('⚠️ Snapshot failure:', err.message);
      });
    }, this.snapshotIntervalMs);

    registerWeightingEngineMetrics(this);

    this.metrics = {
      totalAdaptations: 0,
      contextUpdates: 0,
      avgLatencyReduction: 0,
      avgCostReduction: 0,
      lastUpdateTime: Date.now(),
      totalClamps: 0,
      snapshotsWrittenTotal: 0
    };
    
    this.lastUpdateTime = 0;

    // Poids initiaux par défaut pour chaque contexte
    this.baseWeights = {
      [ContextType.FINANCE]: {
        [WeightCriteria.PERFORMANCE]: 0.35,
        [WeightCriteria.COST]: 0.20,
        [WeightCriteria.LATENCY]: 0.15,
        [WeightCriteria.AVAILABILITY]: 0.15,
        [WeightCriteria.SPECIALIZATION]: 0.10,
        [WeightCriteria.ACCURACY]: 0.05
      },
      [ContextType.RESEARCH]: {
        [WeightCriteria.PERFORMANCE]: 0.25,
        [WeightCriteria.COST]: 0.15,
        [WeightCriteria.LATENCY]: 0.20,
        [WeightCriteria.AVAILABILITY]: 0.10,
        [WeightCriteria.SPECIALIZATION]: 0.15,
        [WeightCriteria.ACCURACY]: 0.15
      },
      [ContextType.CREATIVE]: {
        [WeightCriteria.PERFORMANCE]: 0.40,
        [WeightCriteria.COST]: 0.10,
        [WeightCriteria.LATENCY]: 0.20,
        [WeightCriteria.AVAILABILITY]: 0.10,
        [WeightCriteria.SPECIALIZATION]: 0.15,
        [WeightCriteria.ACCURACY]: 0.05
      }
    };

    // Poids adaptatifs en temps réel (copiés depuis baseWeights)
    this.adaptiveWeights = JSON.parse(JSON.stringify(this.baseWeights));
    
    // Historique des performances par contexte et modèle
    this.performanceHistory = new Map();
  }

  /**
   * Enregistre une performance et adapte les poids en temps réel
   * @param {string} context - Type de contexte
   * @param {string} modelId - ID du modèle utilisé
   * @param {Object} performance - Métriques de performance
   * @param {Object} decision - Décision prise
   */
  recordPerformance(context, modelId, performance, decision) {
    const timestamp = Date.now();
    
    // Créer la clé de contexte si elle n'existe pas
    if (!this.performanceHistory.has(context)) {
      this.performanceHistory.set(context, new Map());
    }
    
    const contextHistory = this.performanceHistory.get(context);
    
    // Créer l'historique du modèle si il n'existe pas
    if (!contextHistory.has(modelId)) {
      contextHistory.set(modelId, []);
    }
    
    const modelHistory = contextHistory.get(modelId);
    
    // Enregistrer la performance
    const performanceRecord = {
      timestamp,
      latency: performance.latency || 0,
      cost: performance.cost || 0,
      accuracy: performance.accuracy || 0,
      availability: performance.availability || 1,
      userSatisfaction: performance.userSatisfaction || 0.5,
      decision: decision
    };
    
    modelHistory.push(performanceRecord);
    
    // Garder seulement les N derniers enregistrements
    if (modelHistory.length > this.config.contextMemorySize) {
      modelHistory.shift();
    }
    
    // Adapter les poids si assez de temps s'est écoulé
    if (timestamp - this.lastUpdateTime >= this.config.minUpdateInterval) {
      this.adaptWeights(context, modelId, performanceRecord);
      this.lastUpdateTime = timestamp;
    }
    
    this.emit('performanceRecorded', {
      context,
      modelId,
      performance: performanceRecord,
      timestamp
    });
  }

  /**
   * Adapte les poids en temps réel basé sur les performances récentes
   * @param {string} context - Contexte à adapter
   * @param {string} modelId - Modèle qui a performé
   * @param {Object} latestPerformance - Dernière performance enregistrée
   */
  adaptWeights(context, modelId, latestPerformance) {
    if (!this.adaptiveWeights[context]) {
      this.adaptiveWeights[context] = JSON.parse(JSON.stringify(this.baseWeights[ContextType.FINANCE]));
    }
    
    const contextHistory = this.performanceHistory.get(context);
    if (!contextHistory || contextHistory.size === 0) return;
    
    // Calculer les performances moyennes récentes
    const recentPerformances = this.getRecentPerformances(context, this.config.adaptationWindow);
    if (recentPerformances.length < 5) return; // Besoin d'au moins 5 échantillons
    
    // Calculer les métriques moyennes
    const avgMetrics = this.calculateAverageMetrics(recentPerformances);
    
    // Adapter les poids selon les performances observées
    const currentWeights = this.adaptiveWeights[context];
    const learningRate = this.config.learningRate;
    
    if (avgMetrics.latency > this.thresholds.latencyMs) {
      currentWeights[WeightCriteria.LATENCY] += learningRate * 0.1;
      currentWeights[WeightCriteria.PERFORMANCE] -= learningRate * 0.05;
      currentWeights[WeightCriteria.COST] -= learningRate * 0.05;
    }
    
    if (avgMetrics.cost > this.thresholds.costEuros) {
      currentWeights[WeightCriteria.COST] += learningRate * 0.1;
      currentWeights[WeightCriteria.PERFORMANCE] -= learningRate * 0.05;
      currentWeights[WeightCriteria.LATENCY] -= learningRate * 0.05;
    }
    
    if (avgMetrics.userSatisfaction < this.thresholds.userSatisfaction) {
      currentWeights[WeightCriteria.PERFORMANCE] += learningRate * 0.15;
      currentWeights[WeightCriteria.ACCURACY] += learningRate * 0.05;
      currentWeights[WeightCriteria.COST] -= learningRate * 0.1;
      currentWeights[WeightCriteria.LATENCY] -= learningRate * 0.1;
    }
    
    this.clampWeights(currentWeights);
    
    this.normalizeWeights(currentWeights);
    
    this.updateAdaptationMetrics(avgMetrics);
    
    this.emit('weightsAdapted', {
      context,
      oldWeights: this.baseWeights[context] || {},
      newWeights: currentWeights,
      trigger: latestPerformance,
      metrics: avgMetrics,
      timestamp: Date.now()
    });
    
    this.metrics.totalAdaptations++;
    this.metrics.contextUpdates++;
  }

  /**
   * Obtient les poids adaptatifs actuels pour un contexte
   * @param {string} context - Contexte demandé
   * @returns {Object} Poids adaptatifs
   */
  getAdaptiveWeights(context) {
    return this.adaptiveWeights[context] || this.baseWeights[ContextType.FINANCE];
  }

  /**
   * Calcule un score de décision pour un modèle donné un contexte
   * @param {string} context - Contexte de la requête
   * @param {string} modelId - ID du modèle à évaluer
   * @param {Object} modelMetrics - Métriques actuelles du modèle
   * @returns {number} Score de décision (0-1)
   */
  calculateDecisionScore(context, modelId, modelMetrics) {
    const weights = this.getAdaptiveWeights(context);
    
    // Normaliser les métriques (0-1)
    const normalizedMetrics = {
      performance: Math.min(1, modelMetrics.performance || 0),
      cost: Math.max(0, 1 - (modelMetrics.cost || 0) / 0.05), // Coût max 5 centimes
      latency: Math.max(0, 1 - (modelMetrics.latency || 0) / 5000), // Latence max 5s
      availability: modelMetrics.availability || 0,
      specialization: modelMetrics.specialization || 0,
      accuracy: modelMetrics.accuracy || 0
    };
    
    // Calculer le score pondéré
    let score = 0;
    for (const [criterion, weight] of Object.entries(weights)) {
      score += weight * (normalizedMetrics[criterion] || 0);
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Obtient les performances récentes pour un contexte
   * @param {string} context - Contexte
   * @param {number} windowSize - Taille de la fenêtre
   * @returns {Array} Performances récentes
   */
  getRecentPerformances(context, windowSize) {
    const contextHistory = this.performanceHistory.get(context);
    if (!contextHistory) return [];
    
    const allPerformances = [];
    for (const modelHistory of contextHistory.values()) {
      allPerformances.push(...modelHistory);
    }
    
    // Trier par timestamp et prendre les plus récents
    return allPerformances
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, windowSize);
  }

  /**
   * Calcule les métriques moyennes d'un ensemble de performances
   * @param {Array} performances - Tableau de performances
   * @returns {Object} Métriques moyennes
   */
  calculateAverageMetrics(performances) {
    if (performances.length === 0) return {};
    
    const sums = performances.reduce((acc, perf) => ({
      latency: (acc.latency || 0) + (perf.latency || 0),
      cost: (acc.cost || 0) + (perf.cost || 0),
      accuracy: (acc.accuracy || 0) + (perf.accuracy || 0),
      availability: (acc.availability || 0) + (perf.availability || 0),
      userSatisfaction: (acc.userSatisfaction || 0) + (perf.userSatisfaction || 0)
    }), {});
    
    const count = performances.length;
    return {
      latency: sums.latency / count,
      cost: sums.cost / count,
      accuracy: sums.accuracy / count,
      availability: sums.availability / count,
      userSatisfaction: sums.userSatisfaction / count
    };
  }

  /**
   * Normalise les poids pour qu'ils somment à 1
   * @param {Object} weights - Poids à normaliser
   */
  normalizeWeights(weights) {
    const sum = Object.values(weights).reduce((acc, val) => acc + val, 0);
    if (sum > 0) {
      for (const key of Object.keys(weights)) {
        weights[key] = weights[key] / sum;
      }
    }
  }

  /**
   * Met à jour les métriques d'adaptation
   * @param {Object} avgMetrics - Métriques moyennes récentes
   */
  updateAdaptationMetrics(avgMetrics) {
    const currentTime = Date.now();
    
    // Calculer les réductions par rapport aux métriques de base
    // (simulation des gains)
    this.metrics.avgLatencyReduction = Math.max(0, 
      ((2500 - avgMetrics.latency) / 2500) * 100); // Réduction par rapport à 2.5s baseline
    this.metrics.avgCostReduction = Math.max(0,
      ((0.02 - avgMetrics.cost) / 0.02) * 100); // Réduction par rapport à 2 centimes baseline
    this.metrics.lastUpdateTime = currentTime;
  }

  /**
   * Obtient les métriques d'adaptation
   * @returns {Object} Métriques actuelles
   */
  getAdaptationMetrics() {
    return {
      ...this.metrics,
      totalContexts: this.performanceHistory.size,
      activeContexts: Array.from(this.performanceHistory.keys()),
      adaptiveWeightsDiff: this.calculateWeightsDifference(),
      timestamp: Date.now()
    };
  }

  /**
   * Calcule la différence entre poids adaptatifs et poids de base
   * @returns {Object} Différences par contexte
   */
  calculateWeightsDifference() {
    const differences = {};
    
    for (const [context, adaptiveWeights] of Object.entries(this.adaptiveWeights)) {
      const baseWeights = this.baseWeights[context] || this.baseWeights[ContextType.FINANCE];
      differences[context] = {};
      
      for (const [criterion, adaptiveWeight] of Object.entries(adaptiveWeights)) {
        const baseWeight = baseWeights[criterion] || 0;
        differences[context][criterion] = adaptiveWeight - baseWeight;
      }
    }
    
    return differences;
  }

  /**
   * Réinitialise les poids adaptatifs à leurs valeurs de base
   * @param {string} context - Contexte à réinitialiser (optionnel, tous si omis)
   */
  resetWeights(context = null) {
    if (context) {
      if (this.baseWeights[context]) {
        this.adaptiveWeights[context] = JSON.parse(JSON.stringify(this.baseWeights[context]));
      }
    } else {
      this.adaptiveWeights = JSON.parse(JSON.stringify(this.baseWeights));
    }
    
    this.emit('weightsReset', { context, timestamp: Date.now() });
  }

  /**
   * Exporte les poids adaptatifs pour sauvegarde
   * @returns {Object} État complet des poids
   */
  exportWeights() {
    return {
      adaptiveWeights: this.adaptiveWeights,
      baseWeights: this.baseWeights,
      metrics: this.metrics,
      timestamp: Date.now()
    };
  }

  /**
   * Importe des poids adaptatifs depuis une sauvegarde
   * @param {Object} snapshot - Données de poids à importer
   */
  importWeights(snapshot) {
    let weightsData = snapshot;

    if (snapshot && snapshot.data && snapshot.signature) {
      const valid = this.journal.verifySnapshot(snapshot);
      if (!valid) {
        this.emit('weightsImportFailed', { reason: 'invalid_signature', timestamp: Date.now() });
        throw new Error('Invalid snapshot signature');
      }
      weightsData = snapshot.data;
    }

    if (weightsData.adaptiveWeights) {
      this.adaptiveWeights = weightsData.adaptiveWeights;
    }
    if (weightsData.baseWeights) {
      this.baseWeights = weightsData.baseWeights;
    }
    if (weightsData.metrics) {
      this.metrics = { ...this.metrics, ...weightsData.metrics };
    }
    
    this.emit('weightsImported', { timestamp: Date.now() });
  }

  clampWeights(weights) {
    let clamped = false;
    for (const key of Object.keys(weights)) {
      if (weights[key] < this.minWeight) {
        weights[key] = this.minWeight;
        clamped = true;
      }
      if (weights[key] > this.maxWeight) {
        weights[key] = this.maxWeight;
        clamped = true;
      }
    }
    if (clamped) {
      this.metrics.totalClamps++;
      this.emit('weightsClamped', { timestamp: Date.now(), weights: { ...weights } });
    }
    return clamped;
  }

  async saveSnapshot() {
    try {
      const data = this.exportWeights();
      const snapshot = await this.journal.writeSnapshot(data);
      this.metrics.snapshotsWrittenTotal++;
      this.emit('snapshotWritten', { snapshot, timestamp: Date.now() });
      return snapshot;
    } catch (error) {
      this.emit('snapshotError', { error: error.message, timestamp: Date.now() });
      throw error;
    }
  }
}

export default AdaptiveWeightingEngine; 