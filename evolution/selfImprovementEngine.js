import winston from 'winston';
import { EventEmitter } from 'events';
import { DynamicProfileManager } from './dynamicProfileManager.js';
import natural from 'natural';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import TrustContext and security config
import { getTrustContext, CriticalityLevel } from '../src/core/TrustContext.js';
import { SECURITY_CONFIG, SECURITY_MODE } from '../config/security.js';
import ConsensusManager, { DecisionType, ConsensusStatus } from '../src/core/ConsensusManager.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { TfIdf } = natural;

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/self-improvement.log' }),
    new winston.transports.Console()
  ]
});

class ImprovementArea {
  static PROMPT_OPTIMIZATION = 'prompt_optimization';
  static MODEL_SELECTION = 'model_selection';
  static RESPONSE_TIME = 'response_time';
  static QUALITY = 'quality';
  static COST = 'cost';
  static CONTEXT_MANAGEMENT = 'context_management';
  static ERROR_HANDLING = 'error_handling';
  static LEARNING_RATE = 'learning_rate';
  static ADAPTATION = 'adaptation';
}

export class SelfImprovementEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Validate TEST mode for security
    if (!SECURITY_CONFIG.SELF_IMPROVEMENT.ALLOWED_MODES.includes(SECURITY_MODE.CURRENT)) {
      throw new Error(`SelfImprovementEngine can only be initialized in allowed modes: ${SECURITY_CONFIG.SELF_IMPROVEMENT.ALLOWED_MODES.join(', ')}`);
    }
    
    this.config = {
      responseTimeThreshold: config.responseTimeThreshold || 5000, // 5 seconds
      errorRateThreshold: config.errorRateThreshold || 0.1, // 10%
      successRateThreshold: config.successRateThreshold || 0.9, // 90%
      batchSize: Math.min(config.batchSize || 50, SECURITY_CONFIG.SELF_IMPROVEMENT.MAX_BATCH_SIZE),
      ...config
    };
    
    this.currentBatch = [];
    this.adjustmentHistory = [];
    this.initializeLogging();
    this.profileManager = new DynamicProfileManager();
    this.improvementHistory = [];
    this.analysisWindow = 100;
    this.improvementThreshold = 0.1;
    this.tfidf = new TfIdf();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.learningMetrics = {
      promptEffectiveness: {},
      modelPerformance: {},
      errorPatterns: new Map(),
      successPatterns: new Map()
    };

    // Initialize TrustContext for security
    this.trustContext = null;
    this.securityEnabled = true;
    this.improvementCount = 0;
    this.sessionStartTime = Date.now();

    // Initialize ConsensusManager for critical decisions
    this.consensusManager = null;
    this.consensusMetrics = {
      totalRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      timeoutRequests: 0
    };

    this.initializeSecurity();
  }

  /**
   * Initialise le système de sécurité et de consensus
   * @private
   */
  async initializeSecurity() {
    try {
      this.trustContext = getTrustContext();
      logger.info('🔒 SelfImprovementEngine: TrustContext initialized');
    } catch (error) {
      logger.warn('⚠️ SelfImprovementEngine: Failed to initialize TrustContext:', error.message);
      this.securityEnabled = false;
    }

    // Initialize ConsensusManager
    try {
      this.consensusManager = new ConsensusManager({
        timeoutMs: 1000, // 1 seconde timeout strict
        enableTrustContext: this.securityEnabled
      });
      
      // Écouter les événements de consensus
      this.consensusManager.on('consensusReached', this.handleConsensusReached.bind(this));
      this.consensusManager.on('consensusTimeout', this.handleConsensusTimeout.bind(this));
      
      logger.info('🔒 SelfImprovementEngine: ConsensusManager initialized');
    } catch (error) {
      logger.warn('⚠️ SelfImprovementEngine: Failed to initialize ConsensusManager:', error.message);
    }
  }

  /**
   * Gère les résultats de consensus
   * @param {Object} consensusResult - Résultat du consensus
   */
  handleConsensusReached(consensusResult) {
    const { proposalId, status, votes, decisionTime } = consensusResult;
    
    if (status === ConsensusStatus.APPROVED) {
      this.consensusMetrics.approvedRequests++;
      logger.info(`✅ Self-improvement consensus APPROVED for proposal ${proposalId} in ${decisionTime}ms`);
    } else if (status === ConsensusStatus.REJECTED) {
      this.consensusMetrics.rejectedRequests++;
      logger.warn(`❌ Self-improvement consensus REJECTED for proposal ${proposalId} in ${decisionTime}ms`);
    }
    
    // Émettre l'événement pour les listeners
    this.emit('consensusDecision', consensusResult);
  }

  /**
   * Gère les timeouts de consensus
   * @param {Object} timeoutResult - Résultat du timeout
   */
  handleConsensusTimeout(timeoutResult) {
    this.consensusMetrics.timeoutRequests++;
    logger.warn(`⏰ Self-improvement consensus TIMEOUT for proposal ${timeoutResult.proposalId}`);
    
    // Émettre l'événement pour les listeners
    this.emit('consensusTimeout', timeoutResult);
  }

  /**
   * Demande un consensus pour une décision d'auto-amélioration critique
   * @param {Object} improvementData - Données de l'amélioration
   * @returns {Promise<boolean>} True si approuvé par consensus
   */
  async requestConsensus(improvementData) {
    if (!this.consensusManager) {
      logger.warn('⚠️ ConsensusManager not available, skipping consensus');
      return true; // Permettre si pas de consensus manager
    }

    // Créer un hash unique pour cette décision
    const decisionHash = crypto.createHash('sha256')
      .update(JSON.stringify({
        type: improvementData.type,
        area: improvementData.area,
        impact: improvementData.impact,
        timestamp: Date.now()
      }))
      .digest('hex');

    this.consensusMetrics.totalRequests++;

    try {
      const proposalId = await this.consensusManager.propose(
        decisionHash,
        {
          improvementType: improvementData.type,
          area: improvementData.area,
          impact: improvementData.impact,
          riskLevel: this.calculateRiskLevel(improvementData),
          evidenceQuality: this.calculateEvidenceQuality(improvementData),
          ethicalConcerns: this.hasEthicalConcerns(improvementData)
        },
        DecisionType.SELF_IMPROVEMENT
      );

      logger.info(`🔒 Consensus requested for self-improvement: ${proposalId}`);

      // Attendre le résultat du consensus
      const consensusResult = await this.waitForConsensus(proposalId);
      
      return consensusResult.status === ConsensusStatus.APPROVED;
      
    } catch (error) {
      logger.error(`🚫 Consensus failed for self-improvement:`, error);
      return false; // Rejeter en cas d'erreur
    }
  }

  /**
   * Attend le résultat d'un consensus
   * @param {string} proposalId - ID de la proposition
   * @returns {Promise<Object>} Résultat du consensus
   */
  async waitForConsensus(proposalId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Consensus timeout'));
      }, 1100); // Légèrement plus que le timeout du ConsensusManager

      const handleConsensus = (result) => {
        if (result.proposalId === proposalId) {
          clearTimeout(timeout);
          this.consensusManager.removeListener('consensusReached', handleConsensus);
          this.consensusManager.removeListener('consensusTimeout', handleTimeout);
          resolve(result);
        }
      };

      const handleTimeout = (result) => {
        if (result.proposalId === proposalId) {
          clearTimeout(timeout);
          this.consensusManager.removeListener('consensusReached', handleConsensus);
          this.consensusManager.removeListener('consensusTimeout', handleTimeout);
          reject(new Error('Consensus timeout'));
        }
      };

      this.consensusManager.on('consensusReached', handleConsensus);
      this.consensusManager.on('consensusTimeout', handleTimeout);
    });
  }

  /**
   * Calcule le niveau de risque d'une amélioration
   * @param {Object} improvementData - Données de l'amélioration
   * @returns {number} Niveau de risque (0-1)
   */
  calculateRiskLevel(improvementData) {
    let riskLevel = 0.3; // Risque de base

    // Augmenter le risque selon le type d'amélioration
    switch (improvementData.area) {
      case ImprovementArea.MODEL_SELECTION:
        riskLevel += 0.3; // Changer de modèle est risqué
        break;
      case ImprovementArea.PROMPT_OPTIMIZATION:
        riskLevel += 0.1; // Optimiser les prompts est moins risqué
        break;
      case ImprovementArea.ERROR_HANDLING:
        riskLevel += 0.2; // Modifier la gestion d'erreur est modérément risqué
        break;
      case ImprovementArea.LEARNING_RATE:
        riskLevel += 0.4; // Modifier le taux d'apprentissage est très risqué
        break;
      default:
        riskLevel += 0.2;
    }

    // Ajuster selon l'impact
    if (improvementData.impact && improvementData.impact.magnitude) {
      riskLevel += improvementData.impact.magnitude * 0.2;
    }

    return Math.min(1.0, riskLevel);
  }

  /**
   * Calcule la qualité des preuves pour une amélioration
   * @param {Object} improvementData - Données de l'amélioration
   * @returns {number} Qualité des preuves (0-1)
   */
  calculateEvidenceQuality(improvementData) {
    let quality = 0.5; // Qualité de base

    // Vérifier la quantité de données
    if (this.currentBatch.length >= this.config.batchSize) {
      quality += 0.2;
    }

    // Vérifier la cohérence des résultats
    if (improvementData.confidence && improvementData.confidence > 0.8) {
      quality += 0.2;
    }

    // Vérifier l'historique
    if (this.improvementHistory.length > 10) {
      quality += 0.1;
    }

    return Math.min(1.0, quality);
  }

  /**
   * Vérifie s'il y a des préoccupations éthiques
   * @param {Object} improvementData - Données de l'amélioration
   * @returns {boolean} True s'il y a des préoccupations éthiques
   */
  hasEthicalConcerns(improvementData) {
    // Vérifier si l'amélioration pourrait affecter la transparence
    if (improvementData.area === ImprovementArea.MODEL_SELECTION) {
      return true; // Changer de modèle peut affecter la transparence
    }

    // Vérifier si l'amélioration pourrait affecter la sécurité
    if (improvementData.area === ImprovementArea.ERROR_HANDLING) {
      return true; // Modifier la gestion d'erreur peut affecter la sécurité
    }

    return false;
  }

  /**
   * Vérifie le cooldown et les limites d'auto-amélioration
   * @returns {Object} Statut de l'autorisation
   */
  checkImprovementAuthorization() {
    const results = {
      allowed: true,
      reasons: [],
      cooldownStatus: null,
      sessionLimits: null
    };

    // Vérifier le cooldown si TrustContext est disponible
    if (this.trustContext) {
      const cooldownStatus = this.trustContext.checkSelfImprovementCooldown();
      results.cooldownStatus = cooldownStatus;
      
      if (!cooldownStatus.allowed) {
        results.allowed = false;
        results.reasons.push(`Cooldown active: ${cooldownStatus.message}`);
      }
    }

    // Vérifier les limites de session
    if (this.improvementCount >= SECURITY_CONFIG.SELF_IMPROVEMENT.MAX_IMPROVEMENTS_PER_SESSION) {
      results.allowed = false;
      results.reasons.push(`Session limit reached: ${this.improvementCount}/${SECURITY_CONFIG.SELF_IMPROVEMENT.MAX_IMPROVEMENTS_PER_SESSION}`);
    }

    // Vérifier les limites quotidiennes (approximation basée sur la session)
    const sessionDuration = Date.now() - this.sessionStartTime;
    const dailyLimit = SECURITY_CONFIG.RATE_LIMITS.SELF_IMPROVEMENTS_PER_DAY;
    const estimatedDailyCount = (this.improvementCount / sessionDuration) * (24 * 60 * 60 * 1000);
    
    if (estimatedDailyCount > dailyLimit) {
      results.allowed = false;
      results.reasons.push(`Daily limit projection exceeded: ${Math.round(estimatedDailyCount)}/${dailyLimit}`);
    }

    results.sessionLimits = {
      currentCount: this.improvementCount,
      maxPerSession: SECURITY_CONFIG.SELF_IMPROVEMENT.MAX_IMPROVEMENTS_PER_SESSION,
      estimatedDaily: Math.round(estimatedDailyCount),
      dailyLimit: dailyLimit
    };

    return results;
  }

  /**
   * Demande une approbation humaine pour une auto-amélioration
   * @param {Object} improvementData - Données de l'amélioration
   * @returns {Promise<string|null>} Token d'approbation ou null si pas nécessaire
   */
  async requestHumanApproval(improvementData) {
    if (!this.securityEnabled || !this.trustContext) {
      logger.warn('⚠️ Security disabled, skipping human approval');
      return null;
    }

    // En mode TEST, seules les améliorations critiques nécessitent une approbation
    const criticalityLevel = this.determineCriticalityLevel(improvementData);
    
    if (!this.trustContext.requiresHumanApproval('self_improvement', criticalityLevel, improvementData)) {
      logger.info(`Self-improvement ${improvementData.type} does not require human approval (${criticalityLevel})`);
      return null;
    }

    try {
      const approvalToken = await this.trustContext.requireHumanApproval(
        'self_improvement',
        criticalityLevel,
        improvementData,
        {
          requestedBy: 'SelfImprovementEngine',
          timestamp: Date.now(),
          sessionCount: this.improvementCount
        }
      );

      logger.info(`🔐 Human approval requested for self-improvement: ${approvalToken}`);
      
      // Émettre un événement pour notifier l'interface utilisateur
      this.emit('approval_required', {
        token: approvalToken,
        type: 'self_improvement',
        data: improvementData,
        criticalityLevel,
        timestamp: Date.now()
      });

      return approvalToken;
    } catch (error) {
      logger.error('🚨 Failed to request human approval for self-improvement:', error);
      throw error;
    }
  }

  /**
   * Détermine le niveau de criticité d'une amélioration
   * @param {Object} improvementData - Données de l'amélioration
   * @returns {string} Niveau de criticité
   */
  determineCriticalityLevel(improvementData) {
    // Améliorations critiques qui affectent le comportement fondamental
    if (improvementData.area === ImprovementArea.MODEL_SELECTION ||
        improvementData.area === ImprovementArea.LEARNING_RATE ||
        improvementData.area === ImprovementArea.ERROR_HANDLING) {
      return CriticalityLevel.HIGH;
    }

    // Améliorations modérées
    if (improvementData.area === ImprovementArea.PROMPT_OPTIMIZATION ||
        improvementData.area === ImprovementArea.CONTEXT_MANAGEMENT) {
      return CriticalityLevel.MEDIUM;
    }

    // Améliorations mineures
    return CriticalityLevel.LOW;
  }

  /**
   * Vérifie l'approbation d'un token
   * @param {string} approvalToken - Token d'approbation
   * @returns {Object} Statut de l'approbation
   */
  checkApproval(approvalToken) {
    if (!this.trustContext || !approvalToken) {
      return { approved: false, message: 'No approval system available' };
    }
    return this.trustContext.checkApproval(approvalToken);
  }

  initializeLogging() {
    const logDir = path.join(process.cwd(), 'logs', 'selfimprovement');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  async analyzeRunResult(runResult) {
    // Validate security mode
    if (!SECURITY_CONFIG.SELF_IMPROVEMENT.ALLOWED_MODES.includes(SECURITY_MODE.CURRENT)) {
      logger.warn(`SelfImprovementEngine: analyzeRunResult called in unauthorized mode: ${SECURITY_MODE.CURRENT}`);
      return null;
    }

    const analysis = {
      timestamp: new Date().toISOString(),
      responseTime: runResult.responseTime,
      success: runResult.success,
      errors: runResult.errors,
      modelUsed: runResult.modelUsed,
      temperature: runResult.temperature
    };

    this.currentBatch.push(analysis);
    this.logAnalysis(analysis);

    if (this.currentBatch.length >= this.config.batchSize) {
      await this.analyzeBatch();
    }

    return analysis;
  }

  async analyzeBatch() {
    // Validate security mode
    if (!SECURITY_CONFIG.SELF_IMPROVEMENT.ALLOWED_MODES.includes(SECURITY_MODE.CURRENT)) {
      logger.warn(`SelfImprovementEngine: analyzeBatch called in unauthorized mode: ${SECURITY_MODE.CURRENT}`);
      return null;
    }

    const batchAnalysis = {
      timestamp: new Date().toISOString(),
      averageResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate(),
      successRate: this.calculateSuccessRate(),
      modelDistribution: this.analyzeModelDistribution()
    };

    const adjustments = await this.proposeAdjustments(batchAnalysis);
    
    // Vérifier l'autorisation avant d'appliquer les ajustements
    const authStatus = this.checkImprovementAuthorization();
    if (!authStatus.allowed) {
      logger.warn(`🚫 Self-improvement blocked: ${authStatus.reasons.join(', ')}`);
      return { batchAnalysis, adjustments: [], blocked: true, reasons: authStatus.reasons };
    }

    // Demander le consensus pour les ajustements critiques
    const approvedAdjustments = [];
    for (const adjustment of adjustments) {
      if (this.isAdjustmentCritical(adjustment)) {
        const consensusApproved = await this.requestConsensus(adjustment);
        if (consensusApproved) {
          // Demander l'approbation TrustContext si nécessaire
          const approvalToken = await this.requestHumanApproval(adjustment);
          if (!approvalToken || this.checkApproval(approvalToken).approved) {
            approvedAdjustments.push(adjustment);
            logger.info(`✅ Critical adjustment approved: ${adjustment.type}`);
          } else {
            logger.warn(`🚫 Critical adjustment requires human approval: ${adjustment.type}`);
          }
        } else {
          logger.warn(`🚫 Critical adjustment rejected by consensus: ${adjustment.type}`);
        }
      } else {
        // Ajustements non critiques approuvés automatiquement
        approvedAdjustments.push(adjustment);
      }
    }

    if (approvedAdjustments.length > 0) {
      await this.applyAdjustments(approvedAdjustments);
      
      // Journaliser dans PrismVitals
      this.logToPrismVitals(batchAnalysis, approvedAdjustments);
    }

    this.logBatchAnalysis(batchAnalysis, approvedAdjustments);
    
    this.currentBatch = [];
    return { batchAnalysis, adjustments: approvedAdjustments };
  }

  /**
   * Vérifie si un ajustement est critique
   * @param {Object} adjustment - Ajustement à vérifier
   * @returns {boolean} True si l'ajustement est critique
   */
  isAdjustmentCritical(adjustment) {
    const criticalAreas = [
      ImprovementArea.MODEL_SELECTION,
      ImprovementArea.LEARNING_RATE,
      ImprovementArea.ERROR_HANDLING
    ];
    
    return criticalAreas.includes(adjustment.area) || 
           (adjustment.impact && adjustment.impact.magnitude > 0.5);
  }

  /**
   * Journalise les décisions dans PrismVitals
   * @param {Object} batchAnalysis - Analyse du batch
   * @param {Array} adjustments - Ajustements appliqués
   */
  logToPrismVitals(batchAnalysis, adjustments) {
    try {
      // Importer PrismVitals de manière dynamique pour éviter les dépendances circulaires
      const PrismVitals = require('../prismVitals.js');
      
      PrismVitals.recordSelfImprovement({
        timestamp: Date.now(),
        batchAnalysis,
        adjustments,
        consensusMetrics: this.consensusMetrics,
        sessionCount: this.improvementCount
      });
      
    } catch (error) {
      logger.warn('⚠️ Failed to log to PrismVitals:', error.message);
    }
  }

  /**
   * Obtient les métriques de consensus
   * @returns {Object} Métriques de consensus
   */
  getConsensusMetrics() {
    return {
      ...this.consensusMetrics,
      consensusSuccessRate: this.consensusMetrics.totalRequests > 0 ? 
        (this.consensusMetrics.approvedRequests + this.consensusMetrics.rejectedRequests) / this.consensusMetrics.totalRequests : 0,
      timestamp: Date.now()
    };
  }

  /**
   * Nettoie les ressources du SelfImprovementEngine
   */
  cleanup() {
    if (this.consensusManager) {
      this.consensusManager.cleanup();
    }
    this.removeAllListeners();
  }

  async proposeAdjustments(batchAnalysis) {
    const adjustments = {
      timestamp: new Date().toISOString(),
      changes: []
    };

    // Adjust temperature based on response time
    if (batchAnalysis.averageResponseTime > this.config.responseTimeThreshold) {
      adjustments.changes.push({
        type: 'temperature',
        action: 'decrease',
        reason: 'High response time',
        value: -0.1
      });
    }

    // Adjust model selection based on error rate
    if (batchAnalysis.errorRate > this.config.errorRateThreshold) {
      adjustments.changes.push({
        type: 'model',
        action: 'switch',
        reason: 'High error rate',
        value: this.selectAlternativeModel()
      });
    }

    // Increase difficulty if success rate is high
    if (batchAnalysis.successRate > this.config.successRateThreshold) {
      adjustments.changes.push({
        type: 'temperature',
        action: 'increase',
        reason: 'High success rate',
        value: 0.05
      });
    }

    this.emit('adjustment_proposed', adjustments);
    return adjustments;
  }

  async applyAdjustments(adjustments) {
    // Validate security mode
    if (!SECURITY_CONFIG.SELF_IMPROVEMENT.ALLOWED_MODES.includes(SECURITY_MODE.CURRENT)) {
      logger.warn(`SelfImprovementEngine: applyAdjustments called in unauthorized mode: ${SECURITY_MODE.CURRENT}`);
      return false;
    }

    if (!adjustments || !adjustments.changes) {
      return false;
    }

    // Vérifier l'autorisation d'amélioration
    const authorization = this.checkImprovementAuthorization();
    if (!authorization.allowed) {
      logger.warn('🚫 Self-improvement blocked:', authorization.reasons.join(', '));
      this.emit('improvement_blocked', {
        reasons: authorization.reasons,
        cooldownStatus: authorization.cooldownStatus,
        sessionLimits: authorization.sessionLimits
      });
      return false;
    }

    // Demander une approbation humaine si nécessaire
    const improvementData = {
      type: 'batch_adjustments',
      changes: adjustments.changes,
      impact: this.calculateImpact(adjustments),
      timestamp: Date.now()
    };

    const approvalToken = await this.requestHumanApproval(improvementData);
    
    // Si un token est retourné, attendre l'approbation
    if (approvalToken) {
      logger.info(`⏳ Waiting for human approval: ${approvalToken}`);
      
      // En mode TEST, on peut simuler une approbation automatique après un délai
      if (SECURITY_MODE.IS_TEST) {
        setTimeout(() => {
          // Simuler une approbation automatique en mode TEST
          if (this.trustContext) {
            this.trustContext.approveDecision(approvalToken, 'test_supervisor_auto', 'test_signature');
            logger.info('🤖 Auto-approved in TEST mode');
          }
        }, 5000); // 5 secondes de délai
      }
      
      return false; // Retourner false pour indiquer que l'amélioration est en attente
    }

    // Appliquer les améliorations
    const appliedChanges = [];
    
    for (const change of adjustments.changes) {
      try {
        // Vérifier le timeout
        const startTime = Date.now();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Improvement timeout')), 
                    SECURITY_CONFIG.SELF_IMPROVEMENT.IMPROVEMENT_TIMEOUT_MS);
        });

        const improvementPromise = this.executeChange(change);
        await Promise.race([improvementPromise, timeoutPromise]);
        
        appliedChanges.push(change);
        logger.info(`✅ Applied improvement: ${change.type} - ${change.action}`);
      } catch (error) {
        logger.error(`❌ Failed to apply improvement ${change.type}:`, error);
        this.logError('adjustment_application', error);
      }
    }

    // Enregistrer l'amélioration dans TrustContext
    if (this.trustContext && appliedChanges.length > 0) {
      this.trustContext.recordSelfImprovement({
        changes: appliedChanges,
        timestamp: Date.now(),
        sessionCount: this.improvementCount
      });
    }

    // Incrémenter le compteur d'améliorations
    this.improvementCount++;

    this.adjustmentHistory.push({
      timestamp: new Date().toISOString(),
      changes: appliedChanges,
      sessionCount: this.improvementCount
    });

    logger.info(`🔄 Self-improvement completed: ${appliedChanges.length} changes applied`);
    
    this.emit('improvement_applied', {
      changes: appliedChanges,
      sessionCount: this.improvementCount,
      timestamp: Date.now()
    });

    return appliedChanges.length > 0;
  }

  /**
   * Calcule l'impact d'un ensemble d'ajustements
   * @param {Object} adjustments - Ajustements proposés
   * @returns {Object} Impact calculé
   */
  calculateImpact(adjustments) {
    let magnitude = 0;
    let riskLevel = 'low';

    for (const change of adjustments.changes) {
      switch (change.type) {
        case 'model':
          magnitude += 0.8; // Changement de modèle = fort impact
          riskLevel = 'high';
          break;
        case 'temperature':
          magnitude += Math.abs(change.value) * 2; // Impact proportionnel
          if (Math.abs(change.value) > 0.2) riskLevel = 'medium';
          break;
        default:
          magnitude += 0.3;
      }
    }

    return {
      magnitude: Math.min(magnitude, 1.0), // Normaliser entre 0 et 1
      riskLevel,
      changeCount: adjustments.changes.length
    };
  }

  /**
   * Exécute une amélioration spécifique
   * @param {Object} change - Changement à appliquer
   * @returns {Promise<void>}
   */
  async executeChange(change) {
    switch (change.type) {
      case 'temperature':
        await this.adjustTemperature(change.value);
        break;
      case 'model':
        await this.switchModel(change.value);
        break;
      default:
        logger.warn(`Unknown improvement type: ${change.type}`);
    }
  }

  // Helper methods
  calculateAverageResponseTime() {
    return this.currentBatch.reduce((sum, run) => sum + run.responseTime, 0) / this.currentBatch.length;
  }

  calculateErrorRate() {
    const errorCount = this.currentBatch.filter(run => run.errors && run.errors.length > 0).length;
    return errorCount / this.currentBatch.length;
  }

  calculateSuccessRate() {
    const successCount = this.currentBatch.filter(run => run.success).length;
    return successCount / this.currentBatch.length;
  }

  analyzeModelDistribution() {
    const distribution = {};
    this.currentBatch.forEach(run => {
      distribution[run.modelUsed] = (distribution[run.modelUsed] || 0) + 1;
    });
    return distribution;
  }

  selectAlternativeModel() {
    // Implementation to select alternative model based on current performance
    return 'fallback_model';
  }

  async adjustTemperature(delta) {
    // Implementation to adjust temperature
    // This should be integrated with PRISM's configuration system
  }

  async switchModel(modelName) {
    // Implementation to switch models
    // This should be integrated with PRISM's model selection system
  }

  // Logging methods
  logAnalysis(analysis) {
    const logPath = path.join(process.cwd(), 'logs', 'selfimprovement', 'analysis.log');
    fs.appendFileSync(logPath, `${JSON.stringify(analysis)  }\n`);
  }

  logBatchAnalysis(batchAnalysis, adjustments) {
    const logPath = path.join(process.cwd(), 'logs', 'selfimprovement', 'batch_analysis.log');
    fs.appendFileSync(logPath, `${JSON.stringify({ batchAnalysis, adjustments })  }\n`);
  }

  logAdjustments(adjustments) {
    const logPath = path.join(process.cwd(), 'logs', 'selfimprovement', 'adjustments.log');
    fs.appendFileSync(logPath, `${JSON.stringify(adjustments)  }\n`);
  }

  logError(context, error) {
    const logPath = path.join(process.cwd(), 'logs', 'selfimprovement', 'errors.log');
    const errorLog = {
      timestamp: new Date().toISOString(),
      context,
      error: error.message || error,
      stack: error.stack
    };
    fs.appendFileSync(logPath, `${JSON.stringify(errorLog)  }\n`);
    logger.error(`[${context}] ${error.message || error}`);
  }

  handleError(error) {
    this.logError('run_error', error);
    this.emit('error', error);
    return {
      success: false,
      error: error.message || error,
      responseTime: 0,
      modelUsed: 'unknown',
      temperature: 0.7
    };
  }

  async analyzeTaskResult(taskResult) {
    const analysis = {
      timestamp: new Date(),
      taskId: taskResult.taskId,
      areas: new Set(),
      suggestions: [],
      metrics: {
        responseTime: taskResult.responseTime,
        quality: this.calculateQualityScore(taskResult),
        cost: this.estimateCost(taskResult),
        success: taskResult.success,
        accuracy: this.calculateAccuracy(taskResult),
        relevance: this.calculateRelevance(taskResult),
        consistency: this.calculateConsistency(taskResult)
      },
      patterns: {
        promptPatterns: this.extractPromptPatterns(taskResult),
        errorPatterns: this.extractErrorPatterns(taskResult),
        successPatterns: this.extractSuccessPatterns(taskResult)
      }
    };

    // Analyze response time
    if (taskResult.responseTime > this.config.maxResponseTime) {
      analysis.areas.add(ImprovementArea.RESPONSE_TIME);
      analysis.suggestions.push(this.generateResponseTimeSuggestion(taskResult));
    }

    // Analyze quality
    if (analysis.metrics.quality < this.config.minQualityScore) {
      analysis.areas.add(ImprovementArea.QUALITY);
      analysis.suggestions.push(this.generateQualitySuggestion(taskResult));
    }

    // Analyze cost
    if (analysis.metrics.cost > this.config.maxCost) {
      analysis.areas.add(ImprovementArea.COST);
      analysis.suggestions.push(this.generateCostSuggestion(taskResult));
    }

    // Analyze model selection
    if (!taskResult.success) {
      analysis.areas.add(ImprovementArea.MODEL_SELECTION);
      analysis.suggestions.push(this.generateModelSelectionSuggestion(taskResult));
    }

    // Analyze prompt optimization
    if (this.shouldOptimizePrompt(taskResult)) {
      analysis.areas.add(ImprovementArea.PROMPT_OPTIMIZATION);
      analysis.suggestions.push(this.generatePromptOptimizationSuggestion(taskResult));
    }

    // Analyze context management
    if (this.shouldImproveContext(taskResult)) {
      analysis.areas.add(ImprovementArea.CONTEXT_MANAGEMENT);
      analysis.suggestions.push(this.generateContextSuggestion(taskResult));
    }

    // Analyze error handling
    if (taskResult.error) {
      analysis.areas.add(ImprovementArea.ERROR_HANDLING);
      analysis.suggestions.push(this.generateErrorHandlingSuggestion(taskResult));
    }

    // Analyze learning rate
    if (this.shouldAdjustLearningRate(taskResult)) {
      analysis.areas.add(ImprovementArea.LEARNING_RATE);
      analysis.suggestions.push(this.generateLearningRateSuggestion(taskResult));
    }

    // Analyze adaptation
    if (this.shouldAdapt(taskResult)) {
      analysis.areas.add(ImprovementArea.ADAPTATION);
      analysis.suggestions.push(this.generateAdaptationSuggestion(taskResult));
    }

    this.improvementHistory.push(analysis);
    this.updateLearningMetrics(analysis);
    this.trimHistory();

    if (analysis.suggestions.length > 0) {
      this.emit('improvementSuggestions', {
        taskId: taskResult.taskId,
        suggestions: analysis.suggestions
      });
    }

    return analysis;
  }

  calculateQualityScore(taskResult) {
    const baseScore = 100;
    const responseTimePenalty = Math.min(taskResult.responseTime / 1000, 10);
    const successBonus = taskResult.success ? 10 : -20;
    const costPenalty = Math.min(taskResult.cost / 10, 5);
    const accuracyBonus = this.calculateAccuracy(taskResult) * 0.3;
    const relevanceBonus = this.calculateRelevance(taskResult) * 0.3;
    const consistencyBonus = this.calculateConsistency(taskResult) * 0.2;
    
    return baseScore - responseTimePenalty + successBonus - costPenalty + 
           accuracyBonus + relevanceBonus + consistencyBonus;
  }

  calculateAccuracy(taskResult) {
    if (!taskResult.success) return 0;
    
    const expectedKeywords = this.profileManager.getProfile(taskResult.userId)
      .expectedKeywords;
    const responseKeywords = this.extractKeywords(taskResult.response);
    
    const matchingKeywords = responseKeywords.filter(k => 
      expectedKeywords.has(k)
    ).length;
    
    return (matchingKeywords / expectedKeywords.size) * 100;
  }

  calculateRelevance(taskResult) {
    if (!taskResult.success) return 0;
    
    const taskKeywords = this.extractKeywords(taskResult.taskDescription);
    const responseKeywords = this.extractKeywords(taskResult.response);
    
    const matchingKeywords = responseKeywords.filter(k => 
      taskKeywords.includes(k)
    ).length;
    
    return (matchingKeywords / taskKeywords.length) * 100;
  }

  calculateConsistency(taskResult) {
    if (!taskResult.success) return 0;
    
    const recentHistory = this.improvementHistory
      .filter(h => h.taskId === taskResult.taskId)
      .slice(-5);
    
    if (recentHistory.length === 0) return 100;
    
    const successRate = recentHistory.filter(h => h.metrics.success).length / 
                       recentHistory.length;
    
    return successRate * 100;
  }

  extractKeywords(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by']);
    
    return tokens
      .filter(word => word.length > 3 && !stopWords.has(word))
      .map(word => this.stemmer.stem(word));
  }

  estimateCost(taskResult) {
    const tokensPerChar = 0.25;
    const inputTokens = taskResult.taskDescription.length * tokensPerChar;
    const outputTokens = taskResult.response.length * tokensPerChar;
    
    const modelCosts = {
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.002,
      'claude-3-opus': 0.015,
      'perplexity': 0.01
    };
    
    const modelCost = modelCosts[taskResult.model] || 0.01;
    return (inputTokens + outputTokens) * modelCost;
  }

  generateResponseTimeSuggestion(taskResult) {
    return {
      area: ImprovementArea.RESPONSE_TIME,
      suggestion: `Consider using a faster model for tasks requiring quick responses. Current response time: ${taskResult.responseTime}ms`,
      priority: 'high',
      action: {
        type: 'model_selection',
        params: {
          maxResponseTime: this.config.maxResponseTime * 0.8,
          preferredModels: this.getFastModels()
        }
      }
    };
  }

  generateQualitySuggestion(taskResult) {
    return {
      area: ImprovementArea.QUALITY,
      suggestion: 'Enhance prompt with more specific instructions and context',
      priority: 'medium',
      action: {
        type: 'prompt_optimization',
        params: {
          addContext: true,
          addExamples: true,
          improveStructure: true,
          addConstraints: true
        }
      }
    };
  }

  generateCostSuggestion(taskResult) {
    return {
      area: ImprovementArea.COST,
      suggestion: 'Optimize token usage and consider using more cost-effective models',
      priority: 'medium',
      action: {
        type: 'cost_optimization',
        params: {
          maxTokens: Math.floor(taskResult.maxTokens * 0.8),
          preferredModels: this.getCostEffectiveModels()
        }
      }
    };
  }

  generateModelSelectionSuggestion(taskResult) {
    return {
      area: ImprovementArea.MODEL_SELECTION,
      suggestion: `Consider using a different model for this type of task. Current model: ${taskResult.model}`,
      priority: 'high',
      action: {
        type: 'model_selection',
        params: {
          alternativeModels: this.getAlternativeModels(taskResult.model),
          taskType: this.determineTaskType(taskResult.taskDescription)
        }
      }
    };
  }

  generatePromptOptimizationSuggestion(taskResult) {
    return {
      area: ImprovementArea.PROMPT_OPTIMIZATION,
      suggestion: 'Refine prompt structure and add task-specific constraints',
      priority: 'medium',
      action: {
        type: 'prompt_optimization',
        params: {
          addConstraints: true,
          improveStructure: true,
          addContext: true,
          addExamples: true
        }
      }
    };
  }

  generateContextSuggestion(taskResult) {
    return {
      area: ImprovementArea.CONTEXT_MANAGEMENT,
      suggestion: 'Improve context management for better task understanding',
      priority: 'medium',
      action: {
        type: 'context_management',
        params: {
          addHistoricalContext: true,
          addDomainContext: true,
          addUserContext: true
        }
      }
    };
  }

  generateErrorHandlingSuggestion(taskResult) {
    return {
      area: ImprovementArea.ERROR_HANDLING,
      suggestion: 'Implement better error handling and recovery strategies',
      priority: 'high',
      action: {
        type: 'error_handling',
        params: {
          addFallbackStrategies: true,
          improveErrorDetection: true,
          addRecoveryMechanisms: true
        }
      }
    };
  }

  generateLearningRateSuggestion(taskResult) {
    return {
      area: ImprovementArea.LEARNING_RATE,
      suggestion: 'Adjust learning rate for better adaptation',
      priority: 'low',
      action: {
        type: 'learning_rate',
        params: {
          adjustRate: true,
          updateThresholds: true
        }
      }
    };
  }

  generateAdaptationSuggestion(taskResult) {
    return {
      area: ImprovementArea.ADAPTATION,
      suggestion: 'Adapt to changing task patterns and user needs',
      priority: 'medium',
      action: {
        type: 'adaptation',
        params: {
          updatePatterns: true,
          adjustStrategies: true
        }
      }
    };
  }

  shouldOptimizePrompt(taskResult) {
    const qualityScore = this.calculateQualityScore(taskResult);
    const hasLowQuality = qualityScore < this.config.minQualityScore;
    const hasHighCost = this.estimateCost(taskResult) > this.config.maxCost;
    const hasFailedAttempts = this.getFailedAttemptsCount(taskResult.taskId) > 1;
    const hasLowAccuracy = this.calculateAccuracy(taskResult) < 70;
    const hasLowRelevance = this.calculateRelevance(taskResult) < 70;
    
    return hasLowQuality || hasHighCost || hasFailedAttempts || 
           hasLowAccuracy || hasLowRelevance;
  }

  shouldImproveContext(taskResult) {
    const profile = this.profileManager.getProfile(taskResult.userId);
    const hasLowSuccessRate = profile.performanceMetrics.successRate < 0.7;
    const hasKnowledgeGaps = profile.knowledgeBase.gaps.size > 0;
    const hasInconsistentPerformance = this.calculateConsistency(taskResult) < 80;
    
    return hasLowSuccessRate || hasKnowledgeGaps || hasInconsistentPerformance;
  }

  shouldAdjustLearningRate(taskResult) {
    const recentHistory = this.improvementHistory.slice(-10);
    const successRate = recentHistory.filter(h => h.metrics.success).length / 
                       recentHistory.length;
    
    return successRate < 0.5 || successRate > 0.9;
  }

  shouldAdapt(taskResult) {
    const profile = this.profileManager.getProfile(taskResult.userId);
    const hasNewTaskPatterns = this.detectNewTaskPatterns(taskResult);
    const hasChangingUserNeeds = this.detectChangingUserNeeds(profile);
    
    return hasNewTaskPatterns || hasChangingUserNeeds;
  }

  detectNewTaskPatterns(taskResult) {
    const recentTasks = this.improvementHistory
      .slice(-20)
      .map(h => h.taskId);
    
    return !recentTasks.includes(taskResult.taskId);
  }

  detectChangingUserNeeds(profile) {
    const recentBehavior = profile.behavioralPatterns;
    const hasNewTaskTypes = Object.keys(recentBehavior.taskFrequency).length > 3;
    const hasChangingTimePatterns = Object.keys(recentBehavior.timeOfDay).length > 5;
    
    return hasNewTaskTypes || hasChangingTimePatterns;
  }

  getFailedAttemptsCount(taskId) {
    return this.improvementHistory
      .filter(analysis => analysis.taskId === taskId && !analysis.metrics.success)
      .length;
  }

  getAlternativeModels(currentModel) {
    const modelHierarchy = {
      'gpt-4': ['gpt-3.5-turbo', 'claude-3-opus'],
      'claude-3-opus': ['gpt-4', 'gpt-3.5-turbo'],
      'gpt-3.5-turbo': ['claude-3-opus', 'perplexity'],
      'perplexity': ['gpt-3.5-turbo']
    };
    
    return modelHierarchy[currentModel] || ['gpt-3.5-turbo', 'claude-3-opus'];
  }

  getFastModels() {
    return ['gpt-3.5-turbo', 'perplexity'];
  }

  getCostEffectiveModels() {
    return ['perplexity', 'gpt-3.5-turbo'];
  }

  determineTaskType(taskDescription) {
    const description = taskDescription.toLowerCase();
    
    if (description.match(/\b(research|find|search|look up)\b/)) {
      return 'research';
    } else if (description.match(/\b(analyze|evaluate|assess)\b/)) {
      return 'analysis';
    } else if (description.match(/\b(generate|create|write)\b/)) {
      return 'generation';
    } else if (description.match(/\b(ethical|moral|right)\b/)) {
      return 'ethical';
    } else if (description.match(/\b(strategy|plan|tactical)\b/)) {
      return 'strategic';
    } else if (description.match(/\b(technical|code|programming|algorithm)\b/)) {
      return 'technical';
    } else if (description.match(/\b(creative|artistic|design)\b/)) {
      return 'creative';
    } else if (description.match(/\b(fact|truth|accurate|precise)\b/)) {
      return 'factual';
    }
    
    return 'analysis';
  }

  updateLearningMetrics(analysis) {
    // Update prompt effectiveness
    if (analysis.metrics.success) {
      const promptKey = this.extractPromptKey(analysis);
      this.learningMetrics.promptEffectiveness[promptKey] = 
        (this.learningMetrics.promptEffectiveness[promptKey] || 0) + 1;
    }

    // Update model performance
    const modelKey = analysis.taskResult.model;
    if (!this.learningMetrics.modelPerformance[modelKey]) {
      this.learningMetrics.modelPerformance[modelKey] = {
        success: 0,
        total: 0,
        avgResponseTime: 0,
        avgQuality: 0
      };
    }
    
    const modelMetrics = this.learningMetrics.modelPerformance[modelKey];
    modelMetrics.total++;
    if (analysis.metrics.success) {
      modelMetrics.success++;
    }
    modelMetrics.avgResponseTime = 
      (modelMetrics.avgResponseTime * (modelMetrics.total - 1) + 
       analysis.metrics.responseTime) / modelMetrics.total;
    modelMetrics.avgQuality = 
      (modelMetrics.avgQuality * (modelMetrics.total - 1) + 
       analysis.metrics.quality) / modelMetrics.total;

    // Update error patterns
    if (!analysis.metrics.success) {
      const errorKey = this.extractErrorKey(analysis);
      this.learningMetrics.errorPatterns.set(
        errorKey,
        (this.learningMetrics.errorPatterns.get(errorKey) || 0) + 1
      );
    }

    // Update success patterns
    if (analysis.metrics.success) {
      const successKey = this.extractSuccessKey(analysis);
      this.learningMetrics.successPatterns.set(
        successKey,
        (this.learningMetrics.successPatterns.get(successKey) || 0) + 1
      );
    }
  }

  extractPromptKey(analysis) {
    return this.stemmer.stem(analysis.taskResult.taskDescription);
  }

  extractErrorKey(analysis) {
    return `${analysis.taskResult.model}_${analysis.taskResult.error}`;
  }

  extractSuccessKey(analysis) {
    return `${analysis.taskResult.model}_${this.determineTaskType(analysis.taskResult.taskDescription)}`;
  }

  trimHistory() {
    if (this.improvementHistory.length > this.analysisWindow) {
      this.improvementHistory = this.improvementHistory.slice(-this.analysisWindow);
    }
  }

  getImprovementMetrics() {
    const recentHistory = this.improvementHistory.slice(-this.analysisWindow);
    
    return {
      totalTasks: recentHistory.length,
      successRate: recentHistory.filter(h => h.metrics.success).length / recentHistory.length,
      averageResponseTime: recentHistory.reduce((sum, h) => sum + h.metrics.responseTime, 0) / recentHistory.length,
      averageQuality: recentHistory.reduce((sum, h) => sum + h.metrics.quality, 0) / recentHistory.length,
      averageCost: recentHistory.reduce((sum, h) => sum + h.metrics.cost, 0) / recentHistory.length,
      improvementAreas: Array.from(new Set(recentHistory.flatMap(h => Array.from(h.areas)))),
      learningMetrics: this.learningMetrics
    };
  }

  async applyImprovements(suggestions) {
    const appliedImprovements = [];
    
    for (const suggestion of suggestions) {
      if (this.shouldApplyImprovement(suggestion)) {
        try {
          await this.executeImprovement(suggestion);
          appliedImprovements.push(suggestion);
          logger.info(`Applied improvement: ${suggestion.area}`);
        } catch (error) {
          logger.error(`Failed to apply improvement: ${error.message}`);
        }
      }
    }
    
    return appliedImprovements;
  }

  shouldApplyImprovement(suggestion) {
    const recentHistory = this.improvementHistory.slice(-10);
    const similarSuggestions = recentHistory.filter(h => 
      h.suggestions.some(s => s.area === suggestion.area)
    );
    
    if (similarSuggestions.length === 0) return true;
    
    const lastSimilarSuggestion = similarSuggestions[similarSuggestions.length - 1];
    const timeSinceLastSuggestion = 
      new Date() - new Date(lastSimilarSuggestion.timestamp);
    
    return timeSinceLastSuggestion > 3600000; // 1 hour
  }

  async executeImprovement(suggestion) {
    switch (suggestion.action.type) {
      case 'model_selection':
        await this.updateModelSelection(suggestion.action.params);
        break;
      case 'prompt_optimization':
        await this.optimizePrompt(suggestion.action.params);
        break;
      case 'cost_optimization':
        await this.optimizeCost(suggestion.action.params);
        break;
      case 'context_management':
        await this.updateContextManagement(suggestion.action.params);
        break;
      case 'error_handling':
        await this.updateErrorHandling(suggestion.action.params);
        break;
      case 'learning_rate':
        await this.updateLearningRate(suggestion.action.params);
        break;
      case 'adaptation':
        await this.updateAdaptation(suggestion.action.params);
        break;
    }
  }

  async updateModelSelection(params) {
    // Update model selection logic
    this.config.maxResponseTime = params.maxResponseTime;
    this.config.preferredModels = params.preferredModels;
  }

  async optimizePrompt(params) {
    // Update prompt optimization logic
    this.config.promptOptimization = {
      ...this.config.promptOptimization,
      ...params
    };
  }

  async optimizeCost(params) {
    // Update cost optimization logic
    this.config.maxTokens = params.maxTokens;
    this.config.preferredModels = params.preferredModels;
  }

  async updateContextManagement(params) {
    // Update context management logic
    this.config.contextManagement = {
      ...this.config.contextManagement,
      ...params
    };
  }

  async updateErrorHandling(params) {
    // Update error handling logic
    this.config.errorHandling = {
      ...this.config.errorHandling,
      ...params
    };
  }

  async updateLearningRate(params) {
    // Update learning rate logic
    this.config.learningRate = {
      ...this.config.learningRate,
      ...params
    };
  }

  async updateAdaptation(params) {
    // Update adaptation logic
    this.config.adaptation = {
      ...this.config.adaptation,
      ...params
    };
  }
} 