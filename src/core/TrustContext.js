/**
 * @fileoverview TrustContext - Module de sécurisation et veto humain pour PRISM
 * @module src/core/TrustContext
 * @version 1.0.0
 * @author PRISM Security Team
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Niveaux de criticité des décisions
 * @enum {string}
 */
export const CriticalityLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * États d'approbation
 * @enum {string}
 */
export const ApprovalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

/**
 * Classe TrustContext - Gestionnaire de confiance et veto humain
 * @class TrustContext
 * @extends EventEmitter
 */
export class TrustContext extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Superviseurs autorisés (identifiants cryptographiques)
      allowedSupervisors: config.allowedSupervisors || [
        'supervisor_001_sha256_hash',
        'supervisor_002_sha256_hash',
        'admin_master_key_hash'
      ],
      
      // Délai d'expiration pour les approbations (30 minutes par défaut)
      approvalTimeoutMs: config.approvalTimeoutMs || 30 * 60 * 1000,
      
      // Cooldown entre les auto-améliorations (30 minutes par défaut)
      selfImprovementCooldownMs: config.selfImprovementCooldownMs || 30 * 60 * 1000,
      
      // Niveau minimum nécessitant une approbation humaine
      minApprovalLevel: config.minApprovalLevel || CriticalityLevel.HIGH,
      
      // Mode de fonctionnement
      mode: process.env.PRISM_MODE || 'PROD'
    };

    // Registre des décisions en attente d'approbation
    this.pendingDecisions = new Map();
    
    // Historique des approbations/rejets
    this.approvalHistory = [];
    
    // Dernière auto-amélioration
    this.lastSelfImprovement = null;
    
    // Métriques de sécurité
    this.securityMetrics = {
      totalDecisions: 0,
      approvedDecisions: 0,
      rejectedDecisions: 0,
      expiredDecisions: 0,
      humanApprovalRate: 0,
      averageApprovalTime: 0
    };

    // Initialisation
    this.initialize();
  }

  /**
   * Initialise le TrustContext
   * @private
   */
  initialize() {
    // Nettoyage périodique des décisions expirées
    setInterval(() => {
      this.cleanupExpiredDecisions();
    }, 60000); // Toutes les minutes

    // Mise à jour des métriques
    setInterval(() => {
      this.updateMetrics();
    }, 5000); // Toutes les 5 secondes

    console.log('🔒 TrustContext initialized with security level:', this.config.minApprovalLevel);
  }

  /**
   * Vérifie si une décision nécessite une approbation humaine
   * @param {string} decisionType - Type de décision
   * @param {string} criticalityLevel - Niveau de criticité
   * @param {Object} context - Contexte de la décision
   * @returns {boolean} True si approbation requise
   */
  requiresHumanApproval(decisionType, criticalityLevel, context = {}) {
    // En mode TEST, pas d'approbation requise sauf pour les décisions CRITICAL
    if (this.config.mode === 'TEST' && criticalityLevel !== CriticalityLevel.CRITICAL) {
      return false;
    }

    // Vérifier le niveau de criticité
    const criticalityOrder = [
      CriticalityLevel.LOW,
      CriticalityLevel.MEDIUM,
      CriticalityLevel.HIGH,
      CriticalityLevel.CRITICAL
    ];

    const decisionIndex = criticalityOrder.indexOf(criticalityLevel);
    const minIndex = criticalityOrder.indexOf(this.config.minApprovalLevel);

    return decisionIndex >= minIndex;
  }

  /**
   * Demande une approbation humaine pour une décision critique
   * @param {string} decisionType - Type de décision
   * @param {string} criticalityLevel - Niveau de criticité
   * @param {Object} decisionData - Données de la décision
   * @param {Object} context - Contexte additionnel
   * @returns {Promise<string>} Token d'approbation unique
   */
  async requireHumanApproval(decisionType, criticalityLevel, decisionData, context = {}) {
    // Générer un hash unique pour cette décision
    const decisionHash = this.generateDecisionHash(decisionType, decisionData, context);
    
    // Créer le token d'approbation
    const approvalToken = this.generateApprovalToken();
    
    // Enregistrer la décision en attente
    const decision = {
      token: approvalToken,
      hash: decisionHash,
      type: decisionType,
      criticality: criticalityLevel,
      data: decisionData,
      context: context,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.approvalTimeoutMs,
      status: ApprovalStatus.PENDING,
      requestedBy: context.requestedBy || 'system',
      approvedBy: null,
      approvalTimestamp: null
    };

    this.pendingDecisions.set(approvalToken, decision);
    this.securityMetrics.totalDecisions++;

    // Émettre l'événement de demande d'approbation
    this.emit('approval_requested', {
      token: approvalToken,
      type: decisionType,
      criticality: criticalityLevel,
      summary: this.generateDecisionSummary(decision),
      expiresAt: decision.expiresAt
    });

    // Logger la demande
    console.log(`🔐 Human approval requested for ${decisionType} (${criticalityLevel})`, {
      token: approvalToken,
      hash: decisionHash,
      expiresAt: new Date(decision.expiresAt).toISOString()
    });

    return approvalToken;
  }

  /**
   * Vérifie si une décision a été approuvée
   * @param {string} approvalToken - Token d'approbation
   * @returns {Object} Statut de l'approbation
   */
  checkApproval(approvalToken) {
    const decision = this.pendingDecisions.get(approvalToken);
    
    if (!decision) {
      return {
        status: 'not_found',
        approved: false,
        message: 'Decision not found or already processed'
      };
    }

    // Vérifier l'expiration
    if (Date.now() > decision.expiresAt && decision.status === ApprovalStatus.PENDING) {
      decision.status = ApprovalStatus.EXPIRED;
      this.securityMetrics.expiredDecisions++;
      this.moveToHistory(decision);
      this.pendingDecisions.delete(approvalToken);
      
      return {
        status: ApprovalStatus.EXPIRED,
        approved: false,
        message: 'Approval request has expired'
      };
    }

    return {
      status: decision.status,
      approved: decision.status === ApprovalStatus.APPROVED,
      approvedBy: decision.approvedBy,
      approvalTimestamp: decision.approvalTimestamp,
      message: this.getStatusMessage(decision.status)
    };
  }

  /**
   * Approuve une décision (appelé par un superviseur autorisé)
   * @param {string} approvalToken - Token d'approbation
   * @param {string} supervisorId - ID du superviseur
   * @param {string} supervisorSignature - Signature cryptographique
   * @returns {boolean} True si approuvé avec succès
   */
  approveDecision(approvalToken, supervisorId, supervisorSignature) {
    // Vérifier l'autorisation du superviseur
    if (!this.verifySupervisor(supervisorId, supervisorSignature)) {
      console.warn('🚫 Unauthorized approval attempt', { supervisorId, token: approvalToken });
      return false;
    }

    const decision = this.pendingDecisions.get(approvalToken);
    
    if (!decision || decision.status !== ApprovalStatus.PENDING) {
      console.warn('🚫 Invalid approval attempt', { token: approvalToken, status: decision?.status });
      return false;
    }

    // Vérifier l'expiration
    if (Date.now() > decision.expiresAt) {
      decision.status = ApprovalStatus.EXPIRED;
      this.securityMetrics.expiredDecisions++;
      this.moveToHistory(decision);
      this.pendingDecisions.delete(approvalToken);
      return false;
    }

    // Approuver la décision
    decision.status = ApprovalStatus.APPROVED;
    decision.approvedBy = supervisorId;
    decision.approvalTimestamp = Date.now();
    
    this.securityMetrics.approvedDecisions++;
    this.moveToHistory(decision);
    this.pendingDecisions.delete(approvalToken);

    // Émettre l'événement d'approbation
    this.emit('decision_approved', {
      token: approvalToken,
      type: decision.type,
      approvedBy: supervisorId,
      timestamp: decision.approvalTimestamp
    });

    console.log(`✅ Decision approved by ${supervisorId}`, {
      token: approvalToken,
      type: decision.type,
      criticality: decision.criticality
    });

    return true;
  }

  /**
   * Rejette une décision
   * @param {string} approvalToken - Token d'approbation
   * @param {string} supervisorId - ID du superviseur
   * @param {string} supervisorSignature - Signature cryptographique
   * @param {string} reason - Raison du rejet
   * @returns {boolean} True si rejeté avec succès
   */
  rejectDecision(approvalToken, supervisorId, supervisorSignature, reason = '') {
    // Vérifier l'autorisation du superviseur
    if (!this.verifySupervisor(supervisorId, supervisorSignature)) {
      console.warn('🚫 Unauthorized rejection attempt', { supervisorId, token: approvalToken });
      return false;
    }

    const decision = this.pendingDecisions.get(approvalToken);
    
    if (!decision || decision.status !== ApprovalStatus.PENDING) {
      console.warn('🚫 Invalid rejection attempt', { token: approvalToken, status: decision?.status });
      return false;
    }

    // Rejeter la décision
    decision.status = ApprovalStatus.REJECTED;
    decision.approvedBy = supervisorId;
    decision.approvalTimestamp = Date.now();
    decision.rejectionReason = reason;
    
    this.securityMetrics.rejectedDecisions++;
    this.moveToHistory(decision);
    this.pendingDecisions.delete(approvalToken);

    // Émettre l'événement de rejet
    this.emit('decision_rejected', {
      token: approvalToken,
      type: decision.type,
      rejectedBy: supervisorId,
      reason: reason,
      timestamp: decision.approvalTimestamp
    });

    console.log(`❌ Decision rejected by ${supervisorId}`, {
      token: approvalToken,
      type: decision.type,
      reason: reason
    });

    return true;
  }

  /**
   * Vérifie si l'auto-amélioration est autorisée (cooldown)
   * @returns {Object} Statut de l'autorisation
   */
  checkSelfImprovementCooldown() {
    if (!this.lastSelfImprovement) {
      return { allowed: true, message: 'No previous self-improvement recorded' };
    }

    const timeSinceLastImprovement = Date.now() - this.lastSelfImprovement.timestamp;
    const cooldownRemaining = this.config.selfImprovementCooldownMs - timeSinceLastImprovement;

    if (cooldownRemaining > 0) {
      return {
        allowed: false,
        message: 'Self-improvement cooldown active',
        cooldownRemainingMs: cooldownRemaining,
        nextAllowedAt: new Date(Date.now() + cooldownRemaining).toISOString()
      };
    }

    return { allowed: true, message: 'Self-improvement cooldown expired' };
  }

  /**
   * Enregistre une auto-amélioration
   * @param {Object} improvementData - Données de l'amélioration
   */
  recordSelfImprovement(improvementData) {
    this.lastSelfImprovement = {
      timestamp: Date.now(),
      data: improvementData
    };

    console.log('📊 Self-improvement recorded in TrustContext', {
      timestamp: this.lastSelfImprovement.timestamp,
      type: improvementData.type || 'unknown'
    });
  }

  /**
   * Enregistre un rejet de consensus pour audit
   * @param {Object} proposal - Proposition rejetée
   */
  recordConsensusRejection(proposal) {
    const rejectionRecord = {
      timestamp: Date.now(),
      proposalId: proposal.id,
      decisionHash: proposal.decisionHash,
      type: proposal.type,
      votes: Object.fromEntries(proposal.votes || new Map()),
      reason: 'consensus_rejection'
    };

    // Ajouter à l'historique
    this.approvalHistory.push(rejectionRecord);

    // Garder seulement les 1000 derniers enregistrements
    if (this.approvalHistory.length > 1000) {
      this.approvalHistory.shift();
    }

    // Émettre l'événement pour monitoring
    this.emit('consensus_rejection_recorded', rejectionRecord);

    console.log('📝 Consensus rejection recorded', {
      proposalId: proposal.id,
      type: proposal.type,
      timestamp: rejectionRecord.timestamp
    });
  }

  /**
   * Génère un hash unique pour une décision
   * @private
   * @param {string} decisionType - Type de décision
   * @param {Object} decisionData - Données de la décision
   * @param {Object} context - Contexte
   * @returns {string} Hash de la décision
   */
  generateDecisionHash(decisionType, decisionData, context) {
    const hashInput = JSON.stringify({
      type: decisionType,
      data: decisionData,
      context: context,
      timestamp: Date.now()
    });
    
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Génère un token d'approbation unique
   * @private
   * @returns {string} Token d'approbation
   */
  generateApprovalToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Vérifie l'autorisation d'un superviseur
   * @private
   * @param {string} supervisorId - ID du superviseur
   * @param {string} signature - Signature cryptographique
   * @returns {boolean} True si autorisé
   */
  verifySupervisor(supervisorId, signature) {
    // En mode TEST, accepter les superviseurs de test
    if (this.config.mode === 'TEST' && supervisorId.startsWith('test_supervisor_')) {
      return true;
    }

    // Vérifier si le superviseur est dans la liste autorisée
    if (!this.config.allowedSupervisors.includes(supervisorId)) {
      return false;
    }

    // TODO: Implémenter la vérification cryptographique de la signature
    // Pour l'instant, on accepte si l'ID est autorisé
    return signature && signature.length > 0;
  }

  /**
   * Génère un résumé de la décision pour l'interface humaine
   * @private
   * @param {Object} decision - Décision
   * @returns {string} Résumé
   */
  generateDecisionSummary(decision) {
    return `${decision.type} (${decision.criticality}) - ${JSON.stringify(decision.data).substring(0, 100)}...`;
  }

  /**
   * Obtient le message de statut
   * @private
   * @param {string} status - Statut
   * @returns {string} Message
   */
  getStatusMessage(status) {
    const messages = {
      [ApprovalStatus.PENDING]: 'Awaiting human approval',
      [ApprovalStatus.APPROVED]: 'Approved by supervisor',
      [ApprovalStatus.REJECTED]: 'Rejected by supervisor',
      [ApprovalStatus.EXPIRED]: 'Approval request expired'
    };
    
    return messages[status] || 'Unknown status';
  }

  /**
   * Déplace une décision vers l'historique
   * @private
   * @param {Object} decision - Décision
   */
  moveToHistory(decision) {
    this.approvalHistory.push({
      ...decision,
      processedAt: Date.now()
    });

    // Garder seulement les 1000 dernières décisions
    if (this.approvalHistory.length > 1000) {
      this.approvalHistory.shift();
    }
  }

  /**
   * Nettoie les décisions expirées
   * @private
   */
  cleanupExpiredDecisions() {
    const now = Date.now();
    const expiredTokens = [];

    for (const [token, decision] of this.pendingDecisions) {
      if (now > decision.expiresAt && decision.status === ApprovalStatus.PENDING) {
        decision.status = ApprovalStatus.EXPIRED;
        this.securityMetrics.expiredDecisions++;
        this.moveToHistory(decision);
        expiredTokens.push(token);
      }
    }

    // Supprimer les décisions expirées
    expiredTokens.forEach(token => {
      this.pendingDecisions.delete(token);
      this.emit('decision_expired', { token });
    });

    if (expiredTokens.length > 0) {
      console.log(`🕐 Cleaned up ${expiredTokens.length} expired decisions`);
    }
  }

  /**
   * Met à jour les métriques de sécurité
   * @private
   */
  updateMetrics() {
    const totalProcessed = this.securityMetrics.approvedDecisions + 
                          this.securityMetrics.rejectedDecisions + 
                          this.securityMetrics.expiredDecisions;

    if (totalProcessed > 0) {
      this.securityMetrics.humanApprovalRate = 
        this.securityMetrics.approvedDecisions / totalProcessed;
    }

    // Calculer le temps moyen d'approbation
    const approvedDecisions = this.approvalHistory.filter(d => 
      d.status === ApprovalStatus.APPROVED && d.approvalTimestamp
    );

    if (approvedDecisions.length > 0) {
      const totalApprovalTime = approvedDecisions.reduce((sum, d) => 
        sum + (d.approvalTimestamp - d.timestamp), 0
      );
      this.securityMetrics.averageApprovalTime = totalApprovalTime / approvedDecisions.length;
    }

    // Émettre les métriques
    this.emit('security_metrics', {
      ...this.securityMetrics,
      pendingDecisions: this.pendingDecisions.size,
      timestamp: Date.now()
    });
  }

  /**
   * Obtient les métriques de sécurité
   * @returns {Object} Métriques
   */
  getSecurityMetrics() {
    return {
      ...this.securityMetrics,
      pendingDecisions: this.pendingDecisions.size,
      lastUpdate: Date.now()
    };
  }

  /**
   * Obtient les décisions en attente
   * @returns {Array} Liste des décisions en attente
   */
  getPendingDecisions() {
    return Array.from(this.pendingDecisions.values()).map(decision => ({
      token: decision.token,
      type: decision.type,
      criticality: decision.criticality,
      summary: this.generateDecisionSummary(decision),
      timestamp: decision.timestamp,
      expiresAt: decision.expiresAt,
      timeRemaining: Math.max(0, decision.expiresAt - Date.now())
    }));
  }

  /**
   * Obtient l'historique des approbations
   * @param {number} limit - Limite du nombre d'éléments
   * @returns {Array} Historique
   */
  getApprovalHistory(limit = 100) {
    return this.approvalHistory
      .slice(-limit)
      .map(decision => ({
        type: decision.type,
        criticality: decision.criticality,
        status: decision.status,
        timestamp: decision.timestamp,
        approvedBy: decision.approvedBy,
        approvalTimestamp: decision.approvalTimestamp,
        processingTime: decision.approvalTimestamp ? 
          decision.approvalTimestamp - decision.timestamp : null
      }));
  }
}

// Instance singleton
let trustContextInstance = null;

/**
 * Obtient l'instance singleton du TrustContext
 * @param {Object} config - Configuration
 * @returns {TrustContext} Instance
 */
export function getTrustContext(config = {}) {
  if (!trustContextInstance) {
    trustContextInstance = new TrustContext(config);
  }
  return trustContextInstance;
}

export default TrustContext; 