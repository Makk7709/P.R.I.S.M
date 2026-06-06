/**
 * @fileoverview Module d'apprentissage comportemental de PRISM
 * @module monitoring/prismBehavioralLearner
 */


/**
 * Classe responsable de l'apprentissage comportemental de PRISM
 * @class PrismBehavioralLearner
 */
export class PrismBehavioralLearner {
  constructor() {
    this.adjustments = new Map();
    this.recommendations = new Map();
    this.cleanupInterval = null;
    this.initialize();
  }

  /**
   * Initialise le module d'apprentissage
   * @private
   */
  initialize() {
    prismBus.subscribe('prism:analytics:postStressReport', this.handleStressReport.bind(this));
    this.startCleanupInterval();
    console.log('📚 PrismBehavioralLearner initialized');
  }

  /**
   * Démarre l'intervalle de nettoyage
   * @private
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredAdjustments();
    }, 60000); // Vérifier toutes les minutes
  }

  /**
   * Arrête l'intervalle de nettoyage
   * @private
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Gère les rapports de stress reçus
   * @param {Object} report - Rapport de stress
   * @private
   */
  handleStressReport(report) {
    console.log('📚 Processing stress report:', report);
    
    const moduleFailures = this.analyzeModuleFailures(report);
    const reactionTimes = this.analyzeReactionTimes(report);
    const errorPatterns = this.analyzeErrorPatterns(report);

    this.generateRecommendations(moduleFailures, reactionTimes, errorPatterns);
    this.applyRecommendations();
    this.cleanupExpiredAdjustments();
  }

  /**
   * Analyse les échecs de modules
   * @param {Object} report - Rapport de stress
   * @returns {Map<string, number>} Fréquence des échecs par module
   * @private
   */
  analyzeModuleFailures(report) {
    const failures = new Map();
    report.modules.forEach(module => {
      if (module.status === 'failed') {
        failures.set(module.name, (failures.get(module.name) || 0) + 1);
      }
    });
    return failures;
  }

  /**
   * Analyse les délais de réaction
   * @param {Object} report - Rapport de stress
   * @returns {Object} Statistiques sur les délais de réaction
   * @private
   */
  analyzeReactionTimes(report) {
    const times = report.reactions.map(r => r.delay);
    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      max: Math.max(...times)
    };
  }

  /**
   * Analyse les patterns d'erreurs
   * @param {Object} report - Rapport de stress
   * @returns {Array<Object>} Patterns d'erreurs identifiés
   * @private
   */
  analyzeErrorPatterns(report) {
    const patterns = [];
    report.errors.forEach(error => {
      if (error.type === 'energy_instability' || error.type === 'heartbeat_loss') {
        patterns.push({
          type: error.type,
          frequency: error.frequency,
          severity: error.severity
        });
      }
    });
    return patterns;
  }

  /**
   * Génère des recommandations basées sur l'analyse
   * @param {Map<string, number>} moduleFailures - Fréquence des échecs par module
   * @param {Object} reactionTimes - Statistiques sur les délais de réaction
   * @param {Array<Object>} errorPatterns - Patterns d'erreurs identifiés
   * @private
   */
  generateRecommendations(moduleFailures, reactionTimes, errorPatterns) {
    // Recommandations pour les modules à risque
    moduleFailures.forEach((frequency, moduleName) => {
      if (frequency > 2) {
        this.recommendations.set(moduleName, {
          type: 'module_vigilance',
          action: 'decrease_threshold',
          value: 0.05,
          duration: 300 // 5 minutes
        });
      }
    });

    // Recommandations pour les délais de réaction
    if (reactionTimes.average > 10) {
      this.recommendations.set('vital_signs', {
        type: 'reaction_time',
        action: 'decrease_analysis_cycle',
        value: 0.20,
        duration: 300
      });
    }

    // Recommandations pour les patterns d'erreurs
    errorPatterns.forEach(pattern => {
      if (pattern.frequency > 3) {
        this.recommendations.set(pattern.type, {
          type: 'error_pattern',
          action: 'increase_monitoring',
          value: 1.5,
          duration: 300
        });
      }
    });
  }

  /**
   * Applique les recommandations générées
   * @private
   */
  applyRecommendations() {
    const adjustments = [];
    
    this.recommendations.forEach((recommendation, target) => {
      console.log(`📚 Applying recommendation for ${target}:`, recommendation);
      
      // Appliquer l'ajustement
      this.adjustments.set(target, {
        ...recommendation,
        timestamp: Date.now()
      });
      
      adjustments.push({
        target,
        ...recommendation
      });
    });

    if (adjustments.length > 0) {
      // Émettre l'événement d'ajustements
      prismBus.emit('prism:learning:adjustmentsMade', {
        timestamp: Date.now(),
        adjustments
      });
    }

    // Nettoyer les recommandations appliquées
    this.recommendations.clear();
  }

  /**
   * Récupère les ajustements actifs
   * @returns {Map<string, Object>} Ajustements actifs
   */
  getActiveAdjustments() {
    this.cleanupExpiredAdjustments();
    return this.adjustments;
  }

  /**
   * Nettoie les ajustements expirés
   * @private
   */
  cleanupExpiredAdjustments() {
    const now = Date.now();
    let hasExpired = false;

    this.adjustments.forEach((adjustment, target) => {
      if (now - adjustment.timestamp > adjustment.duration * 1000) {
        this.adjustments.delete(target);
        hasExpired = true;
        console.log(`📚 Cleaned up expired adjustment for ${target}`);
      }
    });

    if (hasExpired) {
      prismBus.emit('prism:learning:adjustmentsExpired', {
        timestamp: now,
        remainingAdjustments: Array.from(this.adjustments.entries())
      });
    }
  }

  /**
   * Nettoie les ressources lors de la destruction
   */
  destroy() {
    this.stopCleanupInterval();
    this.adjustments.clear();
    this.recommendations.clear();
  }
} 