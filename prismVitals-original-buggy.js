/**
 * @fileoverview Module de surveillance des signes vitaux de PRISM
 * @module prismVitals
 */

import prismBus from './prismBus.js';
import prismLogger from './monitoring/prismLogger.js';

// Import TrustContext for security metrics
import { getTrustContext } from './src/core/TrustContext.js';

// Default security config
let SECURITY_CONFIG = {
  TRUST_THRESHOLD: 0.7,
  SECURITY_LEVEL: 'MEDIUM'
};

// Function to load security config
async function loadSecurityConfig() {
  try {
    const securityModule = await import('./config/security.js');
    SECURITY_CONFIG = securityModule.SECURITY_CONFIG || SECURITY_CONFIG;
  } catch {
    console.warn('Security config not found, using defaults');
  }
}

const VITALS_CYCLE = 5; // Nombre de cycles pour le calcul des tendances
const CRITICAL_THRESHOLD = 30; // Seuil critique d'énergie en pourcentage
const WARNING_THRESHOLD = 50; // Seuil d'avertissement d'énergie en pourcentage
const PERFORMANCE_SAMPLE_SIZE = 10; // Nombre d'échantillons pour la mesure de performance

/**
 * Classe de surveillance des signes vitaux de PRISM
 * @class PrismVitals
 */
export default class PrismVitals {
  constructor() {
    this.isMonitoring = false;
    this.vitalsHistory = [];
    this.currentVitals = null;
    this.cycleCount = 0;
    this.lastUpdate = null;
    this.performanceMetrics = [];
    this.memoryUsage = [];
    this.isInitialized = false;
    
    // Security monitoring
    this.trustContext = null;
    this.securityMetrics = {
      humanApprovalRate: 0,
      pendingDecisions: 0,
      securityChecks: 0,
      blockedEvents: 0,
      lastSecurityUpdate: null
    };

    // Consensus monitoring
    this.consensusMetrics = {
      consensus_success_rate: 0,
      totalConsensusRequests: 0,
      approvedConsensus: 0,
      rejectedConsensus: 0,
      timeoutConsensus: 0,
      averageConsensusTime: 0,
      lastConsensusUpdate: null
    };

    // Self-improvement tracking
    this.selfImprovementMetrics = {
      totalImprovements: 0,
      approvedImprovements: 0,
      rejectedImprovements: 0,
      improvementHistory: [],
      lastImprovementUpdate: null
    };
    
    // Bind des méthodes existantes
    this.handlePulse = this.handlePulse.bind(this);
    this.calculateTrends = this.calculateTrends.bind(this);
    this.updateSecurityMetrics = this.updateSecurityMetrics.bind(this);
    this.updateConsensusMetrics = this.updateConsensusMetrics.bind(this);
    this.recordSelfImprovement = this.recordSelfImprovement.bind(this);
    
    // Initialisation asynchrone
    this.initialize();
  }

  /**
   * Initialisation asynchrone de PrismVitals
   * @private
   */
  async initialize() {
    try {
      // Charger la configuration de sécurité
      await loadSecurityConfig();
      
      // Initialiser les composants
      this.initializeVitals();
      this.initializeSecurity();
      this.initializeConsensusMonitoring();
      
      this.isInitialized = true;
      console.log('✅ PrismVitals: Initialization complete');
      
      // Émettre un événement d'initialisation
      prismBus.emit('prism:vitals:initialized', {
        timestamp: Date.now(),
        version: '1.0.0'
      });
      
    } catch (error) {
      console.error('❌ PrismVitals: Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Initialise le monitoring du consensus
   * @private
   */
  initializeConsensusMonitoring() {
    // Écouter les événements de consensus depuis KernelBus
    prismBus.on('prism:consensus:decision', (consensusResult) => {
      this.updateConsensusMetrics(consensusResult);
    });

    prismBus.on('prism:consensus:timeout', (timeoutResult) => {
      this.consensusMetrics.timeoutConsensus++;
      this.consensusMetrics.totalConsensusRequests++;
      this.updateConsensusSuccessRate();
      this.logConsensusEvent('timeout', timeoutResult);
    });

    console.log('🔒 PrismVitals: Consensus monitoring initialized');
  }

  /**
   * Met à jour les métriques de consensus
   * @param {Object} consensusResult - Résultat du consensus
   * @private
   */
  updateConsensusMetrics(consensusResult) {
    const { status, decisionTime } = consensusResult;
    
    this.consensusMetrics.totalConsensusRequests++;
    
    if (status === 'APPROVED') {
      this.consensusMetrics.approvedConsensus++;
    } else if (status === 'REJECTED') {
      this.consensusMetrics.rejectedConsensus++;
    }

    // Mettre à jour le temps moyen de consensus
    const totalDecisions = this.consensusMetrics.approvedConsensus + this.consensusMetrics.rejectedConsensus;
    if (totalDecisions > 0) {
      this.consensusMetrics.averageConsensusTime = 
        (this.consensusMetrics.averageConsensusTime * (totalDecisions - 1) + decisionTime) / totalDecisions;
    }

    this.updateConsensusSuccessRate();
    this.consensusMetrics.lastConsensusUpdate = Date.now();
    
    this.logConsensusEvent('decision', consensusResult);
    this.checkConsensusAlerts();
  }

  /**
   * Met à jour le taux de succès du consensus
   * @private
   */
  updateConsensusSuccessRate() {
    const totalDecisions = this.consensusMetrics.approvedConsensus + this.consensusMetrics.rejectedConsensus;
    this.consensusMetrics.consensus_success_rate = 
      this.consensusMetrics.totalConsensusRequests > 0 ? 
        totalDecisions / this.consensusMetrics.totalConsensusRequests : 0;
  }

  /**
   * Vérifie les alertes de consensus
   * @private
   */
  checkConsensusAlerts() {
    const alerts = [];

    // Vérifier le taux de succès du consensus
    if (this.consensusMetrics.consensus_success_rate < 0.99) { // Seuil de 99%
      alerts.push({
        type: 'consensus',
        level: 'warning',
        message: `Low consensus success rate: ${(this.consensusMetrics.consensus_success_rate * 100).toFixed(1)}%`,
        metric: 'consensus_success_rate',
        value: this.consensusMetrics.consensus_success_rate,
        threshold: 0.99
      });
    }

    // Vérifier le temps moyen de consensus
    if (this.consensusMetrics.averageConsensusTime > 50) { // Seuil de 50ms
      alerts.push({
        type: 'consensus',
        level: 'warning',
        message: `High consensus time: ${this.consensusMetrics.averageConsensusTime.toFixed(1)}ms`,
        metric: 'consensus_time',
        value: this.consensusMetrics.averageConsensusTime,
        threshold: 50
      });
    }

    // Vérifier le nombre de timeouts
    const timeoutRate = this.consensusMetrics.totalConsensusRequests > 0 ? 
      this.consensusMetrics.timeoutConsensus / this.consensusMetrics.totalConsensusRequests : 0;
    
    if (timeoutRate > 0.01) { // Seuil de 1% de timeouts
      alerts.push({
        type: 'consensus',
        level: 'critical',
        message: `High consensus timeout rate: ${(timeoutRate * 100).toFixed(1)}%`,
        metric: 'consensus_timeout_rate',
        value: timeoutRate,
        threshold: 0.01
      });
    }

    // Émettre les alertes
    alerts.forEach(alert => {
      this.emitConsensusAlert(alert);
    });
  }

  /**
   * Émet une alerte de consensus
   * @param {Object} alert - Alerte à émettre
   * @private
   */
  emitConsensusAlert(alert) {
    console.warn(`🚨 Consensus Alert [${alert.level.toUpperCase()}]: ${alert.message}`);
    
    prismBus.emit('prism:consensus:alert', {
      ...alert,
      timestamp: Date.now(),
      source: 'PrismVitals'
    });

    // Logger l'alerte
    prismLogger.warn('Consensus alert triggered', {
      alert,
      timestamp: Date.now()
    });
  }

  /**
   * Enregistre un événement de consensus
   * @param {string} eventType - Type d'événement
   * @param {Object} data - Données de l'événement
   * @private
   */
  logConsensusEvent(eventType, data) {
    const logEntry = {
      type: `consensus_${eventType}`,
      data,
      timestamp: Date.now(),
      level: 'info'
    };

    prismLogger.info(`Consensus event: ${eventType}`, logEntry);
    
    // Émettre l'événement pour le dashboard
    prismBus.emit('prism:consensus:event', logEntry);
  }

  /**
   * Enregistre une auto-amélioration
   * @param {Object} improvementData - Données de l'amélioration
   * @public
   */
  recordSelfImprovement(improvementData) {
    this.selfImprovementMetrics.totalImprovements++;
    
    if (improvementData.adjustments && improvementData.adjustments.length > 0) {
      this.selfImprovementMetrics.approvedImprovements++;
    } else {
      this.selfImprovementMetrics.rejectedImprovements++;
    }

    // Ajouter à l'historique (garder seulement les 100 dernières)
    this.selfImprovementMetrics.improvementHistory.push({
      timestamp: improvementData.timestamp,
      batchAnalysis: improvementData.batchAnalysis,
      adjustments: improvementData.adjustments,
      consensusMetrics: improvementData.consensusMetrics,
      sessionCount: improvementData.sessionCount
    });

    if (this.selfImprovementMetrics.improvementHistory.length > 100) {
      this.selfImprovementMetrics.improvementHistory.shift();
    }

    this.selfImprovementMetrics.lastImprovementUpdate = Date.now();

    // Émettre l'événement
    prismBus.emit('prism:self_improvement:recorded', {
      metrics: this.selfImprovementMetrics,
      timestamp: Date.now()
    });

    console.log(`📊 Self-improvement recorded: ${this.selfImprovementMetrics.totalImprovements} total`);
  }

  /**
   * Initialise le système de sécurité
   * @private
   */
  initializeSecurity() {
    try {
      this.trustContext = getTrustContext();
      
      // Écouter les événements de sécurité
      this.trustContext.on('security_metrics', (metrics) => {
        this.updateSecurityMetrics(metrics);
      });

      this.trustContext.on('approval_requested', (data) => {
        this.logSecurityEvent('approval_requested', data);
      });

      this.trustContext.on('decision_approved', (data) => {
        this.logSecurityEvent('decision_approved', data);
      });

      this.trustContext.on('decision_rejected', (data) => {
        this.logSecurityEvent('decision_rejected', data);
      });

      console.log('🔒 PrismVitals: Security monitoring initialized');
    } catch (error) {
      console.warn('⚠️ PrismVitals: Failed to initialize security monitoring:', error.message);
    }
  }

  /**
   * Met à jour les métriques de sécurité
   * @param {Object} metrics - Métriques de sécurité
   * @private
   */
  updateSecurityMetrics(metrics) {
    this.securityMetrics = {
      ...this.securityMetrics,
      ...metrics,
      lastSecurityUpdate: Date.now()
    };

    // Vérifier les seuils d'alerte de sécurité
    this.checkSecurityAlerts(metrics);
  }

  /**
   * Vérifie les seuils d'alerte de sécurité
   * @param {Object} metrics - Métriques de sécurité
   * @private
   */
  checkSecurityAlerts(metrics) {
    const alerts = [];

    // Vérifier le taux d'échec des approbations
    if (metrics.humanApprovalRate < (1 - SECURITY_CONFIG.MONITORING.ALERT_THRESHOLDS.APPROVAL_FAILURE_RATE)) {
      alerts.push({
        type: 'security',
        level: 'warning',
        message: `Low human approval rate: ${(metrics.humanApprovalRate * 100).toFixed(1)}%`,
        metric: 'approval_rate',
        value: metrics.humanApprovalRate,
        threshold: 1 - SECURITY_CONFIG.MONITORING.ALERT_THRESHOLDS.APPROVAL_FAILURE_RATE
      });
    }

    // Vérifier le nombre de décisions en attente
    if (metrics.pendingDecisions > SECURITY_CONFIG.MONITORING.ALERT_THRESHOLDS.PENDING_DECISIONS_THRESHOLD) {
      alerts.push({
        type: 'security',
        level: 'critical',
        message: `High number of pending decisions: ${metrics.pendingDecisions}`,
        metric: 'pending_decisions',
        value: metrics.pendingDecisions,
        threshold: SECURITY_CONFIG.MONITORING.ALERT_THRESHOLDS.PENDING_DECISIONS_THRESHOLD
      });
    }

    // Vérifier le temps moyen d'approbation
    if (metrics.averageApprovalTime > SECURITY_CONFIG.MONITORING.ALERT_THRESHOLDS.AVERAGE_APPROVAL_TIME_MS) {
      alerts.push({
        type: 'security',
        level: 'warning',
        message: `Slow approval process: ${(metrics.averageApprovalTime / 1000 / 60).toFixed(1)} minutes`,
        metric: 'approval_time',
        value: metrics.averageApprovalTime,
        threshold: SECURITY_CONFIG.MONITORING.ALERT_THRESHOLDS.AVERAGE_APPROVAL_TIME_MS
      });
    }

    // Émettre les alertes
    alerts.forEach(alert => {
      this.emitSecurityAlert(alert);
    });
  }

  /**
   * Émet une alerte de sécurité
   * @param {Object} alert - Alerte à émettre
   * @private
   */
  emitSecurityAlert(alert) {
    console.warn(`🚨 Security Alert [${alert.level.toUpperCase()}]: ${alert.message}`);
    
    prismBus.emit('prism:security:alert', {
      ...alert,
      timestamp: Date.now(),
      source: 'PrismVitals'
    });

    // Logger l'alerte
    prismLogger.warn('Security alert triggered', {
      alert,
      timestamp: Date.now()
    });
  }

  /**
   * Enregistre un événement de sécurité
   * @param {string} eventType - Type d'événement
   * @param {Object} data - Données de l'événement
   * @private
   */
  logSecurityEvent(eventType, data) {
    const logEntry = {
      type: eventType,
      data,
      timestamp: Date.now(),
      level: 'audit'
    };

    prismLogger.info(`Security event: ${eventType}`, logEntry);
    
    // Émettre l'événement pour le dashboard
    prismBus.emit('prism:security:event', logEntry);
  }

  /**
   * Initialise le système de surveillance des signes vitaux
   * @private
   */
  initializeVitals() {
    this.currentVitals = {
      energy: 100,
      stability: 100,
      performance: 100,
      memory: 100,
      security: 100,
      consensus: 100, // Nouveau vital pour le consensus
      timestamp: Date.now()
    };

    // Écouter les événements du bus
    prismBus.on('prism:pulse', this.handlePulse);
    prismBus.on('prism:energy:update', (data) => {
      this.currentVitals.energy = data.level;
    });
    prismBus.on('prism:performance:update', (data) => {
      this.performanceMetrics.push(data);
      if (this.performanceMetrics.length > PERFORMANCE_SAMPLE_SIZE) {
        this.performanceMetrics.shift();
      }
    });

    console.log('💓 PrismVitals initialized');
  }

  /**
   * Démarre la surveillance continue
   * @private
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Cycle principal de surveillance (toutes les 5 secondes)
    setInterval(() => {
      this.updateVitals();
    }, 5000);
    
    // Cycle de nettoyage de l'historique (toutes les minutes)
    setInterval(() => {
      this.cleanupHistory();
    }, 60000);
  }

  /**
   * Met à jour les signes vitaux
   * @private
   */
  async updateVitals() {
    try {
      const newVitals = {
        energy: await this.calculateEnergy(),
        stability: await this.calculateStability(),
        performance: await this.calculatePerformance(),
        responseTime: await this.measureResponseTime(),
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: this.getCpuUsage(),
        timestamp: Date.now(),
        security: await this.getSecurityVitals()
      };

      // Calculer les tendances
      const trends = this.calculateTrends(newVitals);
      newVitals.trends = trends;

      // Mettre à jour les vitaux actuels
      this.currentVitals = newVitals;
      
      // Ajouter à l'historique
      this.vitalsHistory.push(newVitals);
      
      // Incrémenter le compteur de cycles
      this.cycleCount++;
      this.lastUpdate = Date.now();

      // Émettre les nouveaux signes vitaux
      prismBus.emit('prism:vitals:updated', {
        vitals: newVitals,
        cycle: this.cycleCount,
        timestamp: this.lastUpdate
      });

      // Vérifier les seuils critiques
      this.checkCriticalThresholds(newVitals);

    } catch (error) {
      console.error('❌ Error updating vitals:', error);
      prismLogger.error('Failed to update vitals', { error: error.message });
    }
  }

  /**
   * Obtient les signes vitaux de sécurité
   * @returns {Promise<Object>} Métriques de sécurité
   * @private
   */
  async getSecurityVitals() {
    const securityVitals = {
      trustLevel: 100,
      approvalRate: 1,
      pendingDecisions: 0,
      securityChecks: 0,
      blockedEvents: 0
    };

    if (this.trustContext) {
      try {
        const metrics = this.trustContext.getSecurityMetrics();
        
        securityVitals.approvalRate = metrics.humanApprovalRate || 1;
        securityVitals.pendingDecisions = metrics.pendingDecisions || 0;
        securityVitals.securityChecks = this.securityMetrics.securityChecks || 0;
        securityVitals.blockedEvents = this.securityMetrics.blockedEvents || 0;
        
        // Calculer le niveau de confiance basé sur les métriques
        securityVitals.trustLevel = this.calculateTrustLevel(metrics);
        
      } catch (error) {
        console.warn('⚠️ Failed to get security vitals:', error.message);
        securityVitals.trustLevel = 50; // Niveau de confiance réduit en cas d'erreur
      }
    }

    return securityVitals;
  }

  /**
   * Calcule le niveau de confiance du système
   * @param {Object} metrics - Métriques de sécurité
   * @returns {number} Niveau de confiance (0-100)
   * @private
   */
  calculateTrustLevel(metrics) {
    let trustLevel = 100;

    // Réduire la confiance si beaucoup de décisions en attente
    if (metrics.pendingDecisions > 10) {
      trustLevel -= Math.min(30, metrics.pendingDecisions * 2);
    }

    // Réduire la confiance si le taux d'approbation est faible
    if (metrics.humanApprovalRate < 0.8) {
      trustLevel -= (0.8 - metrics.humanApprovalRate) * 50;
    }

    // Réduire la confiance si beaucoup d'événements bloqués
    if (metrics.blockedEvents > 5) {
      trustLevel -= Math.min(20, metrics.blockedEvents * 2);
    }

    return Math.max(0, Math.min(100, trustLevel));
  }

  /**
   * Mesure le temps de réponse des modules critiques
   * @private
   * @returns {Promise<number>} Temps de réponse en ms
   */
  async measureResponseTime() {
    const measurements = [];
    const criticalModules = ['heartSync', 'awareness', 'selfHeal', 'emergency', 'trustContext'];

    for (const module of criticalModules) {
      const start = performance.now();
      try {
        // Appel de la méthode ping sur chaque module critique
        if (module === 'trustContext' && this.trustContext) {
          // Test spécifique pour TrustContext
          this.trustContext.getSecurityMetrics();
        } else {
          const moduleInstance = window[`prism${module.charAt(0).toUpperCase() + module.slice(1)}`];
          if (moduleInstance && typeof moduleInstance.ping === 'function') {
            await moduleInstance.ping();
          }
        }
      } catch (error) {
        console.warn(`Failed to measure response time for ${module}:`, error);
      }
      measurements.push(performance.now() - start);
    }

    // Calcul de la moyenne des temps de réponse
    const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    
    // Garder un historique pour les tendances
    this.performanceMetrics.push({
      timestamp: Date.now(),
      responseTime: avgResponseTime
    });

    // Garder uniquement les N derniers échantillons
    if (this.performanceMetrics.length > PERFORMANCE_SAMPLE_SIZE) {
      this.performanceMetrics.shift();
    }

    return avgResponseTime;
  }

  /**
   * Vérifie les seuils critiques et émet des alertes
   * @param {Object} vitals - Signes vitaux actuels
   * @private
   */
  checkCriticalThresholds(vitals) {
    const alerts = [];

    // Vérifier l'énergie
    if (vitals.energy < CRITICAL_THRESHOLD) {
      alerts.push({
        type: 'critical',
        metric: 'energy',
        value: vitals.energy,
        threshold: CRITICAL_THRESHOLD,
        message: `Critical energy level: ${vitals.energy}%`
      });
    } else if (vitals.energy < WARNING_THRESHOLD) {
      alerts.push({
        type: 'warning',
        metric: 'energy',
        value: vitals.energy,
        threshold: WARNING_THRESHOLD,
        message: `Low energy level: ${vitals.energy}%`
      });
    }

    // Vérifier la stabilité
    if (vitals.stability < CRITICAL_THRESHOLD) {
      alerts.push({
        type: 'critical',
        metric: 'stability',
        value: vitals.stability,
        threshold: CRITICAL_THRESHOLD,
        message: `Critical stability level: ${vitals.stability}%`
      });
    }

    // Vérifier la sécurité
    if (vitals.security.trustLevel < 50) {
      alerts.push({
        type: 'critical',
        metric: 'security',
        value: vitals.security.trustLevel,
        threshold: 50,
        message: `Critical trust level: ${vitals.security.trustLevel}%`
      });
    }

    // Émettre les alertes
    alerts.forEach(alert => {
      console.warn(`🚨 Vitals Alert [${alert.type.toUpperCase()}]: ${alert.message}`);
      prismBus.emit('prism:vitals:alert', {
        ...alert,
        timestamp: Date.now(),
        vitals: vitals
      });
    });
  }

  /**
   * Obtient les métriques de sécurité pour le dashboard
   * @returns {Object} Métriques de sécurité formatées
   */
  getSecurityMetrics() {
    const baseMetrics = {
      ...this.securityMetrics,
      trustLevel: this.currentVitals?.security?.trustLevel || 0,
      lastUpdate: this.lastUpdate
    };

    if (this.trustContext) {
      const trustMetrics = this.trustContext.getSecurityMetrics();
      return {
        ...baseMetrics,
        ...trustMetrics,
        pendingDecisions: this.trustContext.getPendingDecisions(),
        approvalHistory: this.trustContext.getApprovalHistory(10)
      };
    }

    return baseMetrics;
  }

  /**
   * Obtient les métriques de consensus
   * @returns {Object} Métriques de consensus
   * @public
   */
  getConsensusMetrics() {
    return {
      ...this.consensusMetrics,
      timestamp: Date.now()
    };
  }

  /**
   * Obtient les métriques d'auto-amélioration
   * @returns {Object} Métriques d'auto-amélioration
   * @public
   */
  getSelfImprovementMetrics() {
    return {
      ...this.selfImprovementMetrics,
      improvementRate: this.selfImprovementMetrics.totalImprovements > 0 ? 
        this.selfImprovementMetrics.approvedImprovements / this.selfImprovementMetrics.totalImprovements : 0,
      timestamp: Date.now()
    };
  }

  /**
   * Obtient un rapport complet des métriques
   * @returns {Object} Rapport complet
   * @public
   */
  getVitalsReport() {
    return {
      vitals: this.currentVitals,
      security: this.getSecurityMetrics(),
      consensus: this.getConsensusMetrics(),
      selfImprovement: this.getSelfImprovementMetrics(),
      performance: this.getPerformanceMetrics(),
      trends: this.calculateTrends(),
      alerts: this.getActiveAlerts(),
      timestamp: Date.now()
    };
  }

  /**
   * Obtient les alertes actives
   * @returns {Array} Liste des alertes actives
   * @private
   */
  getActiveAlerts() {
    const alerts = [];
    
    // Vérifier les seuils critiques
    if (this.currentVitals.energy < CRITICAL_THRESHOLD) {
      alerts.push({
        type: 'critical',
        message: `Critical energy level: ${this.currentVitals.energy}%`,
        metric: 'energy',
        value: this.currentVitals.energy,
        threshold: CRITICAL_THRESHOLD
      });
    }

    if (this.consensusMetrics.consensus_success_rate < 0.99) {
      alerts.push({
        type: 'warning',
        message: `Low consensus success rate: ${(this.consensusMetrics.consensus_success_rate * 100).toFixed(1)}%`,
        metric: 'consensus_success_rate',
        value: this.consensusMetrics.consensus_success_rate,
        threshold: 0.99
      });
    }

    return alerts;
  }

  /**
   * Obtient les métriques de performance
   * @returns {Object} Métriques de performance
   * @private
   */
  getPerformanceMetrics() {
    if (this.performanceMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        throughput: 0,
        errorRate: 0,
        samples: 0
      };
    }

    const avgResponseTime = this.performanceMetrics.reduce((sum, metric) => 
      sum + (metric.responseTime || 0), 0) / this.performanceMetrics.length;
    
    const errorRate = this.performanceMetrics.filter(metric => 
      metric.error).length / this.performanceMetrics.length;

    return {
      averageResponseTime: avgResponseTime,
      throughput: this.performanceMetrics.length,
      errorRate: errorRate,
      samples: this.performanceMetrics.length
    };
  }

  /**
   * Gère les événements de pulse du système
   * @param {Object} pulseData - Données du pulse
   * @private
   */
  handlePulse(_pulseData) {
    try {
      // Traiter les données du pulse
      this.updateVitals();
      
      // Émettre un événement de pulse traité
      prismBus.emit('prism:vitals:pulse', {
        timestamp: Date.now(),
        vitals: this.currentVitals
      });
      
    } catch (error) {
      console.error('Error handling pulse:', error);
    }
  }

  /**
   * Calcule les tendances des métriques
   * @param {Object} vitals - Données vitales actuelles
   * @returns {Object} Tendances calculées
   * @private
   */
  calculateTrends(_vitals = null) {
    try {
      const recentHistory = this.vitalsHistory.slice(-VITALS_CYCLE);
      
      if (recentHistory.length < 2) {
        return {
          energy: 'stable',
          performance: 'stable',
          security: 'stable',
          consensus: 'stable'
        };
      }

      // Calculer les tendances pour chaque métrique
      const energyTrend = this.calculateMetricTrend(recentHistory, 'energy');
      const performanceTrend = this.calculateMetricTrend(recentHistory, 'performance');
      const securityTrend = this.calculateMetricTrend(recentHistory, 'security');
      const consensusTrend = this.calculateMetricTrend(recentHistory, 'consensus');

      return {
        energy: energyTrend,
        performance: performanceTrend,
        security: securityTrend,
        consensus: consensusTrend
      };
      
    } catch (error) {
      console.error('Error calculating trends:', error);
      return {
        energy: 'unknown',
        performance: 'unknown',
        security: 'unknown',
        consensus: 'unknown'
      };
    }
  }

  /**
   * Calcule la tendance d'une métrique spécifique
   * @param {Array} history - Historique des données
   * @param {string} metric - Nom de la métrique
   * @returns {string} Tendance ('improving', 'declining', 'stable')
   * @private
   */
  calculateMetricTrend(history, metric) {
    if (history.length < 2) return 'stable';
    
    const values = history.map(h => h[metric] || 0);
    const recent = values.slice(-3);
    const older = values.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }
} 