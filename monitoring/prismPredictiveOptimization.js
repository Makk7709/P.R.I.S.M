/**
 * @fileoverview Module d'optimisation prédictive pour PRISM
 * @module prismPredictiveOptimization
 */

import prismBus from '../prismBus.js';

class PrismPredictiveOptimization {
  constructor() {
    this.metricsHistory = [];
    this.maxHistorySize = 100;
    this.predictionThreshold = 0.7;
    this.adaptationStrategies = new Map();
    this.initializeStrategies();
  }

  initializeStrategies() {
    // Stratégie pour la performance
    this.registerStrategy('performance', {
      predict: (metrics) => this.predictPerformanceDecline(metrics),
      adapt: (prediction) => this.adaptPerformanceThresholds(prediction)
    });

    // Stratégie pour la stabilité
    this.registerStrategy('stability', {
      predict: (metrics) => this.predictStabilityIssues(metrics),
      adapt: (prediction) => this.adaptStabilityParameters(prediction)
    });

    // Stratégie pour la charge
    this.registerStrategy('load', {
      predict: (metrics) => this.predictLoadSpikes(metrics),
      adapt: (prediction) => this.adaptLoadBalancing(prediction)
    });
  }

  registerStrategy(type, { predict, adapt }) {
    this.adaptationStrategies.set(type, { predict, adapt });
  }

  async analyzeMetrics(metrics) {
    this.metricsHistory.push({
      ...metrics,
      timestamp: Date.now()
    });

    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    const predictions = await this.generatePredictions();
    const adaptations = await this.applyAdaptations(predictions);

    return {
      predictions,
      adaptations,
      timestamp: Date.now()
    };
  }

  async generatePredictions() {
    const predictions = {};

    for (const [type, strategy] of this.adaptationStrategies) {
      try {
        const prediction = await strategy.predict(this.metricsHistory);
        predictions[type] = prediction;
      } catch (error) {
        console.error(`Error generating prediction for ${type}:`, error);
      }
    }

    return predictions;
  }

  async applyAdaptations(predictions) {
    const adaptations = {};

    for (const [type, prediction] of Object.entries(predictions)) {
      if (prediction.probability >= this.predictionThreshold) {
        try {
          const strategy = this.adaptationStrategies.get(type);
          const adaptation = await strategy.adapt(prediction);
          adaptations[type] = adaptation;

          // Émettre un événement pour signaler l'adaptation
          prismBus.emit('prism:optimization:adaptation', {
            type,
            prediction,
            adaptation,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error(`Error applying adaptation for ${type}:`, error);
        }
      }
    }

    return adaptations;
  }

  async predictPerformanceDecline(metrics) {
    const recentMetrics = metrics.slice(-10);
    const responseTimes = recentMetrics.map(m => m.responseTime);
    
    // Calcul de la tendance linéaire
    const trend = this.calculateLinearTrend(responseTimes);
    
    // Prédiction de dégradation si la tendance est négative
    const probability = trend < 0 ? Math.abs(trend) : 0;
    
    return {
      type: 'performance',
      probability,
      trend,
      threshold: 200, // ms
      prediction: trend < 0 ? 'decline' : 'stable'
    };
  }

  async predictStabilityIssues(metrics) {
    const recentMetrics = metrics.slice(-10);
    const stabilityScores = recentMetrics.map(m => m.stabilityScore);
    
    // Calcul de la volatilité
    const volatility = this.calculateVolatility(stabilityScores);
    
    // Prédiction d'instabilité si la volatilité est élevée
    const probability = volatility > 0.3 ? volatility : 0;
    
    return {
      type: 'stability',
      probability,
      volatility,
      threshold: 0.3,
      prediction: volatility > 0.3 ? 'unstable' : 'stable'
    };
  }

  async predictLoadSpikes(metrics) {
    const recentMetrics = metrics.slice(-10);
    const loadValues = recentMetrics.map(m => m.load);
    
    // Calcul de la tendance exponentielle
    const trend = this.calculateExponentialTrend(loadValues);
    
    // Prédiction de pic de charge si la tendance est croissante
    const probability = trend > 0 ? trend : 0;
    
    return {
      type: 'load',
      probability,
      trend,
      threshold: 0.8,
      prediction: trend > 0 ? 'spike' : 'stable'
    };
  }

  async adaptPerformanceThresholds(prediction) {
    const { probability, _trend } = prediction;
    
    // Ajustement des seuils en fonction de la prédiction
    const newThresholds = {
      responseTime: 200 * (1 - probability * 0.2), // Réduction de 20% max
      errorRate: 0.01 * (1 + probability * 0.5), // Augmentation de 50% max
      retryCount: Math.ceil(3 * (1 + probability * 0.3)) // Augmentation de 30% max
    };

    return {
      type: 'performance',
      thresholds: newThresholds,
      confidence: 1 - probability
    };
  }

  async adaptStabilityParameters(prediction) {
    const { probability, _volatility } = prediction;
    
    // Ajustement des paramètres de stabilité
    const newParameters = {
      checkInterval: 1000 * (1 - probability * 0.3), // Réduction de 30% max
      recoveryTimeout: 5000 * (1 + probability * 0.5), // Augmentation de 50% max
      maxRetries: Math.ceil(5 * (1 + probability * 0.4)) // Augmentation de 40% max
    };

    return {
      type: 'stability',
      parameters: newParameters,
      confidence: 1 - probability
    };
  }

  async adaptLoadBalancing(prediction) {
    const { probability, _trend } = prediction;
    
    // Ajustement des paramètres de charge
    const newParameters = {
      batchSize: Math.floor(100 * (1 - probability * 0.4)), // Réduction de 40% max
      queueLimit: Math.floor(1000 * (1 - probability * 0.3)), // Réduction de 30% max
      timeout: 30000 * (1 + probability * 0.5) // Augmentation de 50% max
    };

    return {
      type: 'load',
      parameters: newParameters,
      confidence: 1 - probability
    };
  }

  calculateLinearTrend(values) {
    const n = values.length;
    if (n < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  calculateVolatility(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  calculateExponentialTrend(values) {
    const n = values.length;
    if (n < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = Math.log(values[i] || 1);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }
}

export default new PrismPredictiveOptimization(); 