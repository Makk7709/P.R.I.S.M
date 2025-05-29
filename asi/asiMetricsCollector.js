/**
 * @fileoverview ASI Metrics Collector - Collecteur de métriques pour ASI
 * @module asiMetricsCollector
 * @description Collecte, analyse et surveille les métriques de performance de l'ASI
 */

import { EventEmitter } from 'events';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/asi-metrics.log' }),
    new winston.transports.Console()
  ]
});

/**
 * @class ASIMetricsCollector
 * @extends EventEmitter
 * @description Collecteur et analyseur de métriques pour l'ASI
 */
export class ASIMetricsCollector extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      collectionInterval: config.collectionInterval || 30000, // 30 secondes
      retentionPeriod: config.retentionPeriod || 7 * 24 * 60 * 60 * 1000, // 7 jours
      alertThresholds: config.alertThresholds || {},
      realTimeMonitoring: config.realTimeMonitoring !== false,
      aggregationEnabled: config.aggregationEnabled !== false,
      exportEnabled: config.exportEnabled !== false,
      ...config
    };

    this.state = {
      isActive: false,
      metrics: new Map(),
      aggregatedMetrics: new Map(),
      alerts: [],
      trends: new Map(),
      lastCollection: null,
      collectionStats: {
        totalCollections: 0,
        successfulCollections: 0,
        failedCollections: 0,
        averageCollectionTime: 0
      }
    };

    this.metricTypes = {
      'performance': {
        categories: ['response_time', 'throughput', 'success_rate', 'error_rate'],
        aggregation: 'average',
        alerting: true
      },
      'learning': {
        categories: ['learning_rate', 'adaptation_speed', 'knowledge_growth', 'skill_improvement'],
        aggregation: 'trend',
        alerting: false
      },
      'resource': {
        categories: ['cpu_usage', 'memory_usage', 'disk_usage', 'network_usage'],
        aggregation: 'average',
        alerting: true
      },
      'quality': {
        categories: ['accuracy', 'precision', 'recall', 'confidence'],
        aggregation: 'weighted_average',
        alerting: true
      },
      'ethics': {
        categories: ['ethical_score', 'safety_incidents', 'human_escalations', 'compliance_rate'],
        aggregation: 'average',
        alerting: true
      },
      'user': {
        categories: ['satisfaction', 'engagement', 'task_completion', 'feedback_score'],
        aggregation: 'average',
        alerting: false
      }
    };

    this.initializeMetricsCollector();
  }

  /**
   * Initialise le collecteur de métriques
   */
  initializeMetricsCollector() {
    // Configuration des collecteurs de métriques
    this.metricCollectors = {
      'performance': this.collectPerformanceMetrics.bind(this),
      'learning': this.collectLearningMetrics.bind(this),
      'resource': this.collectResourceMetrics.bind(this),
      'quality': this.collectQualityMetrics.bind(this),
      'ethics': this.collectEthicsMetrics.bind(this),
      'user': this.collectUserMetrics.bind(this)
    };

    // Configuration des analyseurs de tendances
    this.trendAnalyzers = {
      'linear': this.analyzeLinearTrend.bind(this),
      'exponential': this.analyzeExponentialTrend.bind(this),
      'seasonal': this.analyzeSeasonalTrend.bind(this),
      'anomaly': this.detectAnomalies.bind(this)
    };

    // Configuration des seuils d'alerte par défaut
    this.defaultAlertThresholds = {
      'response_time': { warning: 2000, critical: 5000 },
      'success_rate': { warning: 0.8, critical: 0.7 },
      'error_rate': { warning: 0.1, critical: 0.2 },
      'memory_usage': { warning: 0.8, critical: 0.9 },
      'ethical_score': { warning: 0.7, critical: 0.5 }
    };

    // Fusion avec les seuils configurés
    this.alertThresholds = { ...this.defaultAlertThresholds, ...this.config.alertThresholds };
  }

  /**
   * Démarre le collecteur de métriques
   */
  async start() {
    this.state.isActive = true;
    logger.info('🚀 Collecteur de métriques ASI démarré');
    
    // Démarrage de la collecte périodique
    this.startPeriodicCollection();
    
    // Démarrage de l'analyse de tendances
    this.startTrendAnalysis();
    
    // Démarrage du monitoring d'alertes
    this.startAlertMonitoring();
    
    this.emit('metrics_collector_started');
  }

  /**
   * Collecte toutes les métriques
   */
  async collectAllMetrics() {
    if (!this.state.isActive) {
      throw new Error('Collecteur de métriques non actif');
    }

    const collectionId = `collect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      logger.debug(`📊 Collecte de métriques ${collectionId}`);

      const metrics = {};
      const timestamp = new Date();

      // Collecte pour chaque type de métrique
      for (const [type, collector] of Object.entries(this.metricCollectors)) {
        try {
          const typeMetrics = await collector();
          metrics[type] = {
            ...typeMetrics,
            timestamp,
            collectionId
          };
        } catch (error) {
          logger.warn(`Échec de collecte pour ${type}:`, error);
          metrics[type] = {
            error: error.message,
            timestamp,
            collectionId
          };
        }
      }

      // Stockage des métriques
      this.storeMetrics(collectionId, metrics);
      
      // Agrégation si activée
      if (this.config.aggregationEnabled) {
        await this.aggregateMetrics(metrics);
      }
      
      // Vérification des alertes
      await this.checkAlerts(metrics);
      
      const processingTime = Date.now() - startTime;
      this.updateCollectionStats(collectionId, processingTime, true);

      logger.debug(`✅ Collecte de métriques ${collectionId} complétée en ${processingTime}ms`);
      this.emit('metrics_collected', { collectionId, metrics, processingTime });

      return {
        collectionId,
        metrics,
        timestamp,
        processingTime
      };

    } catch (error) {
      logger.error(`❌ Erreur lors de la collecte de métriques ${collectionId}:`, error);
      
      const processingTime = Date.now() - startTime;
      this.updateCollectionStats(collectionId, processingTime, false);
      
      throw error;
    }
  }

  /**
   * Collecte les métriques de performance
   */
  async collectPerformanceMetrics() {
    // Simulation de collecte de métriques de performance
    return {
      response_time: Math.random() * 1000 + 500, // 500-1500ms
      throughput: Math.random() * 100 + 50, // 50-150 req/s
      success_rate: Math.random() * 0.2 + 0.8, // 80-100%
      error_rate: Math.random() * 0.1, // 0-10%
      concurrent_tasks: Math.floor(Math.random() * 20 + 5), // 5-25
      queue_length: Math.floor(Math.random() * 10) // 0-10
    };
  }

  /**
   * Collecte les métriques d'apprentissage
   */
  async collectLearningMetrics() {
    return {
      learning_rate: Math.random() * 0.1 + 0.05, // 0.05-0.15
      adaptation_speed: Math.random() * 0.5 + 0.3, // 0.3-0.8
      knowledge_growth: Math.random() * 10 + 5, // 5-15 new items
      skill_improvement: Math.random() * 0.1 + 0.02, // 2-12% improvement
      transfer_efficiency: Math.random() * 0.3 + 0.6, // 60-90%
      retention_rate: Math.random() * 0.2 + 0.8 // 80-100%
    };
  }

  /**
   * Collecte les métriques de ressources
   */
  async collectResourceMetrics() {
    return {
      cpu_usage: Math.random() * 0.4 + 0.3, // 30-70%
      memory_usage: Math.random() * 0.3 + 0.4, // 40-70%
      disk_usage: Math.random() * 0.2 + 0.5, // 50-70%
      network_usage: Math.random() * 50 + 10, // 10-60 MB/s
      active_connections: Math.floor(Math.random() * 100 + 20), // 20-120
      cache_hit_rate: Math.random() * 0.3 + 0.7 // 70-100%
    };
  }

  /**
   * Collecte les métriques de qualité
   */
  async collectQualityMetrics() {
    return {
      accuracy: Math.random() * 0.2 + 0.8, // 80-100%
      precision: Math.random() * 0.15 + 0.85, // 85-100%
      recall: Math.random() * 0.2 + 0.75, // 75-95%
      confidence: Math.random() * 0.2 + 0.7, // 70-90%
      consistency: Math.random() * 0.15 + 0.85, // 85-100%
      reliability: Math.random() * 0.1 + 0.9 // 90-100%
    };
  }

  /**
   * Collecte les métriques d'éthique
   */
  async collectEthicsMetrics() {
    return {
      ethical_score: Math.random() * 0.2 + 0.8, // 80-100%
      safety_incidents: Math.floor(Math.random() * 3), // 0-2
      human_escalations: Math.floor(Math.random() * 2), // 0-1
      compliance_rate: Math.random() * 0.1 + 0.9, // 90-100%
      bias_detection_rate: Math.random() * 0.2 + 0.8, // 80-100%
      transparency_score: Math.random() * 0.15 + 0.85 // 85-100%
    };
  }

  /**
   * Collecte les métriques utilisateur
   */
  async collectUserMetrics() {
    return {
      satisfaction: Math.random() * 2 + 3, // 3-5 (sur 5)
      engagement: Math.random() * 0.3 + 0.6, // 60-90%
      task_completion: Math.random() * 0.2 + 0.8, // 80-100%
      feedback_score: Math.random() * 1 + 4, // 4-5 (sur 5)
      session_duration: Math.random() * 1800 + 600, // 10-40 minutes
      return_rate: Math.random() * 0.3 + 0.7 // 70-100%
    };
  }

  /**
   * Stocke les métriques collectées
   */
  storeMetrics(collectionId, metrics) {
    const timestamp = Date.now();
    
    this.state.metrics.set(timestamp, {
      id: collectionId,
      timestamp: new Date(timestamp),
      metrics
    });

    // Nettoyage des anciennes métriques
    this.cleanupOldMetrics();
    
    this.state.lastCollection = new Date(timestamp);
  }

  /**
   * Nettoie les anciennes métriques
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    
    for (const [timestamp, _] of this.state.metrics) {
      if (timestamp < cutoffTime) {
        this.state.metrics.delete(timestamp);
      }
    }
  }

  /**
   * Agrège les métriques
   */
  async aggregateMetrics(currentMetrics) {
    const aggregationPeriods = ['1h', '1d', '1w'];
    
    for (const period of aggregationPeriods) {
      const aggregated = await this.calculateAggregation(currentMetrics, period);
      
      const key = `${period}_${Date.now()}`;
      this.state.aggregatedMetrics.set(key, {
        period,
        timestamp: new Date(),
        aggregated
      });
    }

    // Limitation des métriques agrégées
    if (this.state.aggregatedMetrics.size > 1000) {
      const oldestKey = Array.from(this.state.aggregatedMetrics.keys())[0];
      this.state.aggregatedMetrics.delete(oldestKey);
    }
  }

  /**
   * Calcule l'agrégation pour une période
   */
  async calculateAggregation(currentMetrics, period) {
    const periodMs = this.parsePeriod(period);
    const cutoffTime = Date.now() - periodMs;
    
    const relevantMetrics = Array.from(this.state.metrics.values())
      .filter(m => m.timestamp.getTime() > cutoffTime);

    const aggregated = {};
    
    for (const [type, typeConfig] of Object.entries(this.metricTypes)) {
      if (currentMetrics[type] && !currentMetrics[type].error) {
        aggregated[type] = this.aggregateTypeMetrics(
          relevantMetrics.map(m => m.metrics[type]).filter(Boolean),
          typeConfig.aggregation
        );
      }
    }

    return aggregated;
  }

  /**
   * Agrège les métriques d'un type spécifique
   */
  aggregateTypeMetrics(metrics, aggregationType) {
    if (metrics.length === 0) return {};

    const result = {};
    const keys = Object.keys(metrics[0]).filter(k => typeof metrics[0][k] === 'number');

    for (const key of keys) {
      const values = metrics.map(m => m[key]).filter(v => typeof v === 'number');
      
      switch (aggregationType) {
        case 'average':
          result[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
          break;
        case 'sum':
          result[key] = values.reduce((sum, v) => sum + v, 0);
          break;
        case 'max':
          result[key] = Math.max(...values);
          break;
        case 'min':
          result[key] = Math.min(...values);
          break;
        case 'trend':
          result[key] = this.calculateTrend(values);
          break;
        case 'weighted_average':
          result[key] = this.calculateWeightedAverage(values);
          break;
        default:
          result[key] = values[values.length - 1]; // Dernière valeur
      }
    }

    return result;
  }

  /**
   * Vérifie les alertes
   */
  async checkAlerts(metrics) {
    const alerts = [];
    
    for (const [type, typeMetrics] of Object.entries(metrics)) {
      if (typeMetrics.error) continue;
      
      for (const [metric, value] of Object.entries(typeMetrics)) {
        if (typeof value !== 'number') continue;
        
        const thresholds = this.alertThresholds[metric];
        if (!thresholds) continue;
        
        let alertLevel = null;
        if (value >= thresholds.critical || value <= thresholds.critical) {
          alertLevel = 'critical';
        } else if (value >= thresholds.warning || value <= thresholds.warning) {
          alertLevel = 'warning';
        }
        
        if (alertLevel) {
          const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            level: alertLevel,
            type,
            metric,
            value,
            threshold: thresholds[alertLevel],
            message: `${metric} ${alertLevel}: ${value} (seuil: ${thresholds[alertLevel]})`
          };
          
          alerts.push(alert);
          this.state.alerts.push(alert);
        }
      }
    }

    // Limitation des alertes stockées
    if (this.state.alerts.length > 1000) {
      this.state.alerts = this.state.alerts.slice(-500);
    }

    // Émission des alertes
    for (const alert of alerts) {
      this.emit('alert', alert);
      logger.warn(`🚨 Alerte ${alert.level}: ${alert.message}`);
    }
  }

  /**
   * Démarre la collecte périodique
   */
  startPeriodicCollection() {
    setInterval(async () => {
      try {
        await this.collectAllMetrics();
      } catch (error) {
        logger.error('Erreur lors de la collecte périodique:', error);
      }
    }, this.config.collectionInterval);
  }

  /**
   * Démarre l'analyse de tendances
   */
  startTrendAnalysis() {
    setInterval(async () => {
      await this.analyzeTrends();
    }, 300000); // Toutes les 5 minutes
  }

  /**
   * Analyse les tendances
   */
  async analyzeTrends() {
    const recentMetrics = Array.from(this.state.metrics.values()).slice(-20);
    
    if (recentMetrics.length < 5) return;

    for (const [type, typeConfig] of Object.entries(this.metricTypes)) {
      const typeMetrics = recentMetrics
        .map(m => m.metrics[type])
        .filter(m => m && !m.error);
      
      if (typeMetrics.length < 5) continue;

      for (const category of typeConfig.categories) {
        const values = typeMetrics.map(m => m[category]).filter(v => typeof v === 'number');
        
        if (values.length >= 5) {
          const trend = this.calculateTrend(values);
          
          this.state.trends.set(`${type}_${category}`, {
            trend,
            timestamp: new Date(),
            values: values.slice(-10) // Garde les 10 dernières valeurs
          });
        }
      }
    }
  }

  /**
   * Démarre le monitoring d'alertes
   */
  startAlertMonitoring() {
    setInterval(async () => {
      await this.monitorAlerts();
    }, 60000); // Toutes les minutes
  }

  /**
   * Surveille les alertes
   */
  async monitorAlerts() {
    const recentAlerts = this.state.alerts.filter(
      a => Date.now() - a.timestamp.getTime() < 300000 // 5 minutes
    );

    // Détection d'alertes répétées
    const alertCounts = {};
    for (const alert of recentAlerts) {
      const key = `${alert.type}_${alert.metric}`;
      alertCounts[key] = (alertCounts[key] || 0) + 1;
    }

    // Escalade si trop d'alertes répétées
    for (const [key, count] of Object.entries(alertCounts)) {
      if (count >= 3) {
        this.emit('alert_escalation', {
          key,
          count,
          timestamp: new Date(),
          message: `Alertes répétées détectées pour ${key}: ${count} occurrences`
        });
      }
    }
  }

  /**
   * Obtient les métriques actuelles
   */
  getCurrentMetrics() {
    const latest = Array.from(this.state.metrics.values()).slice(-1)[0];
    return latest ? latest.metrics : null;
  }

  /**
   * Obtient les métriques agrégées
   */
  getAggregatedMetrics(period = '1h') {
    const aggregated = Array.from(this.state.aggregatedMetrics.values())
      .filter(a => a.period === period)
      .slice(-1)[0];
    
    return aggregated ? aggregated.aggregated : null;
  }

  /**
   * Obtient les tendances
   */
  getTrends() {
    return Object.fromEntries(this.state.trends);
  }

  /**
   * Obtient les alertes récentes
   */
  getRecentAlerts(hours = 24) {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.state.alerts.filter(a => a.timestamp.getTime() > cutoffTime);
  }

  /**
   * Met à jour les statistiques de collecte
   */
  updateCollectionStats(collectionId, processingTime, success) {
    this.state.collectionStats.totalCollections++;
    
    if (success) {
      this.state.collectionStats.successfulCollections++;
    } else {
      this.state.collectionStats.failedCollections++;
    }
    
    // Mise à jour du temps moyen
    const total = this.state.collectionStats.totalCollections;
    this.state.collectionStats.averageCollectionTime = 
      (this.state.collectionStats.averageCollectionTime * (total - 1) + processingTime) / total;

    this.emit('collection_stats_updated', this.state.collectionStats);
  }

  /**
   * Obtient le statut de santé du collecteur
   */
  async getHealthStatus() {
    const successRate = this.state.collectionStats.totalCollections > 0 ?
      this.state.collectionStats.successfulCollections / this.state.collectionStats.totalCollections : 0;

    const recentAlerts = this.getRecentAlerts(1); // Dernière heure

    return {
      status: this.state.isActive ? 'healthy' : 'inactive',
      lastCollection: this.state.lastCollection,
      metricsStored: this.state.metrics.size,
      aggregatedMetrics: this.state.aggregatedMetrics.size,
      trends: this.state.trends.size,
      recentAlerts: recentAlerts.length,
      collectionSuccessRate: successRate,
      averageCollectionTime: this.state.collectionStats.averageCollectionTime
    };
  }

  /**
   * Arrête le collecteur
   */
  async stop() {
    this.state.isActive = false;
    logger.info('🛑 Collecteur de métriques ASI arrêté');
    this.emit('metrics_collector_stopped');
  }

  // Méthodes utilitaires
  parsePeriod(period) {
    const units = { 'h': 60 * 60 * 1000, 'd': 24 * 60 * 60 * 1000, 'w': 7 * 24 * 60 * 60 * 1000 };
    const match = period.match(/^(\d+)([hdw])$/);
    return match ? parseInt(match[1]) * units[match[2]] : 60 * 60 * 1000;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  calculateWeightedAverage(values) {
    if (values.length === 0) return 0;
    
    const weights = values.map((_, i) => i + 1); // Poids croissants
    const weightedSum = values.reduce((sum, v, i) => sum + (v * weights[i]), 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    return weightedSum / totalWeight;
  }

  // Méthodes manquantes pour les analyseurs de tendances
  analyzeLinearTrend(values) {
    return this.calculateTrend(values);
  }

  analyzeExponentialTrend(values) {
    if (values.length < 3) return 0;
    
    // Calcul simplifié de tendance exponentielle
    const recentValues = values.slice(-5);
    const growthRates = [];
    
    for (let i = 1; i < recentValues.length; i++) {
      if (recentValues[i - 1] !== 0) {
        growthRates.push(recentValues[i] / recentValues[i - 1] - 1);
      }
    }
    
    return growthRates.length > 0 ? 
      growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0;
  }

  analyzeSeasonalTrend(values) {
    if (values.length < 12) return 0;
    
    // Détection de saisonnalité simplifiée
    const period = 7; // Période hebdomadaire
    let seasonalStrength = 0;
    
    for (let i = period; i < values.length; i++) {
      const current = values[i];
      const previous = values[i - period];
      
      if (previous !== 0) {
        seasonalStrength += Math.abs(current - previous) / previous;
      }
    }
    
    return seasonalStrength / Math.max(values.length - period, 1);
  }

  detectAnomalies(values) {
    if (values.length < 5) return [];
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const anomalies = [];
    const threshold = 2; // 2 écarts-types
    
    values.forEach((value, index) => {
      if (Math.abs(value - mean) > threshold * stdDev) {
        anomalies.push({
          index,
          value,
          deviation: Math.abs(value - mean) / stdDev,
          type: value > mean ? 'high' : 'low'
        });
      }
    });
    
    return anomalies;
  }
}

export default ASIMetricsCollector; 