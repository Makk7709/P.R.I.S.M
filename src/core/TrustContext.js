/**
 * @fileoverview TrustContext - Module de sécurisation et veto humain pour PRISM
 * @module src/core/TrustContext
 * @version 1.0.0
 * @author PRISM Security Team
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import {
  validateCriticalDecisionRequest,
  validateApprovalRequest,
  validateApprovalResponse,
  validateSignedApproval,
} from '../security/contracts/trustcontext.js';
import { getKeyRegistry } from './KeyRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Niveaux de criticité des décisions
 * @enum {string}
 */
export const CriticalityLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * États d'approbation
 * @enum {string}
 */
export const ApprovalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
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
        'admin_master_key_hash',
      ],

      // Répertoire pour clés publiques des approvers (legacy: fichiers .pub)
      keyDir: config.keyDir || path.join(process.cwd(), 'keys', 'approvers'),

      // KeyRegistry (TRL 5: gestion centralisée avec révocation)
      keyRegistry:
        config.keyRegistry ||
        getKeyRegistry({
          registryPath:
            process.env.TRUSTCONTEXT_KEYREGISTRY_PATH ||
            path.join(process.cwd(), 'data', 'key-registry.json'),
        }),

      // Mapping approver keyId → clé publique PEM (legacy, fallback si KeyRegistry non disponible)
      approverPublicKeys: config.approverPublicKeys || new Map(),

      // Politique de gouvernance: criticité → rôles autorisés
      governancePolicy: config.governancePolicy || {
        [CriticalityLevel.LOW]: ['lead', 'security', 'owner'],
        [CriticalityLevel.MEDIUM]: ['lead', 'security', 'owner'],
        [CriticalityLevel.HIGH]: ['security', 'owner'],
        [CriticalityLevel.CRITICAL]: ['owner'], // Option double-approval désactivable
      },

      // Délai d'expiration pour les approbations (30 minutes par défaut)
      approvalTimeoutMs: config.approvalTimeoutMs || 30 * 60 * 1000,

      // Cooldown entre les auto-améliorations (30 minutes par défaut)
      selfImprovementCooldownMs: config.selfImprovementCooldownMs || 30 * 60 * 1000,

      // Niveau minimum nécessitant une approbation humaine
      minApprovalLevel: config.minApprovalLevel || CriticalityLevel.HIGH,

      // Mode de fonctionnement
      mode: process.env.PRISM_MODE || 'PROD',
    };

    // Registre des décisions en attente d'approbation
    this.pendingDecisions = new Map();

    // Historique des approbations/rejets
    this.approvalHistory = [];

    // Dernière auto-amélioration
    this.lastSelfImprovement = null;

    // Intervalles (pour cleanup)
    this._cleanupInterval = null;
    this._metricsInterval = null;

    // Métriques de sécurité
    this.securityMetrics = {
      totalDecisions: 0,
      approvedDecisions: 0,
      rejectedDecisions: 0,
      expiredDecisions: 0,
      humanApprovalRate: 0,
      averageApprovalTime: 0,
    };

    // Initialisation (async, mais constructeur sync - initialisation différée)
    this._initialized = false;
    // Note: initialize() est async mais appelé depuis constructeur sync
    // L'initialisation complète se fait au premier appel (lazy init si nécessaire)
  }

  /**
   * Initialise le TrustContext (lazy init)
   * @private
   */
  async _ensureInitialized() {
    if (this._initialized) return;

    // Charger clés publiques des approvers si disponible
    await this._loadApproverPublicKeys();

    // Nettoyage périodique des décisions expirées (seulement une fois)
    if (!this._cleanupInterval) {
      this._cleanupInterval = setInterval(() => {
        this.cleanupExpiredDecisions();
      }, 60000);
    }

    // Mise à jour des métriques (seulement une fois)
    if (!this._metricsInterval) {
      this._metricsInterval = setInterval(() => {
        this.updateMetrics();
      }, 5000);
    }

    this._initialized = true;
    console.log('🔒 TrustContext initialized with security level:', this.config.minApprovalLevel);
  }

  /**
   * Initialise le TrustContext (public, peut être appelé explicitement)
   */
  async initialize() {
    await this._ensureInitialized();
  }

  /**
   * Charge les clés publiques des approvers (KeyRegistry prioritaire, fallback fichiers)
   * @private
   */
  async _loadApproverPublicKeys() {
    try {
      // 1. Initialiser KeyRegistry (TRL 5)
      try {
        await this.config.keyRegistry.initialize();
        const activeKeys = this.config.keyRegistry.listActiveKeys();
        for (const key of activeKeys) {
          const publicKeyPem = this.config.keyRegistry.getPublicKey(key.keyId);
          if (publicKeyPem) {
            this.config.approverPublicKeys.set(key.keyId, publicKeyPem);
            console.log(
              `[TrustContext] Loaded key from registry: ${key.keyId} (roles: ${key.roleBindings.join(', ')})`
            );
          }
        }
      } catch (error) {
        console.warn(
          '[TrustContext] KeyRegistry initialization failed, falling back to file-based keys:',
          error.message
        );
      }

      // 2. Fallback: charger depuis fichiers .pub (legacy)
      try {
        await fs.mkdir(this.config.keyDir, { recursive: true });
        const files = await fs.readdir(this.config.keyDir).catch(() => []);

        for (const file of files) {
          if (file.endsWith('.pub')) {
            const keyId = path.basename(file, '.pub');
            // Ne pas écraser si déjà chargé depuis registry
            if (!this.config.approverPublicKeys.has(keyId)) {
              const keyPath = path.join(this.config.keyDir, file);
              try {
                const publicKeyPem = await fs.readFile(keyPath, 'utf8');
                this.config.approverPublicKeys.set(keyId, publicKeyPem);
                console.log(`[TrustContext] Loaded public key from file: ${keyId}`);
              } catch (error) {
                console.warn(`[TrustContext] Failed to load key ${keyId}:`, error.message);
              }
            }
          }
        }
      } catch (error) {
        console.warn('[TrustContext] Failed to load keys from directory:', error.message);
      }
    } catch (error) {
      console.warn('[TrustContext] Failed to load approver keys:', error.message);
    }
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
      CriticalityLevel.CRITICAL,
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
    // Lazy init si nécessaire
    await this._ensureInitialized();
    // Créer le token d'approbation
    const approvalToken = this.generateApprovalToken();

    // Calculer le DecisionDigest stable (sans timestamp)
    // Le digest doit être calculable de manière identique lors de la vérification
    const decisionDigest = this.computeDecisionDigest(
      approvalToken,
      decisionType,
      criticalityLevel,
      decisionData,
      context
    );

    // Enregistrer la décision en attente
    const decision = {
      token: approvalToken,
      decisionDigest, // Digest stable pour vérification signature
      type: decisionType,
      criticality: criticalityLevel,
      data: decisionData,
      context: context,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.approvalTimeoutMs,
      status: ApprovalStatus.PENDING,
      requestedBy: context.requestedBy || 'system',
      approvedBy: null,
      approvalTimestamp: null,
    };

    this.pendingDecisions.set(approvalToken, decision);
    this.securityMetrics.totalDecisions++;

    // Émettre l'événement de demande d'approbation
    this.emit('approval_requested', {
      token: approvalToken,
      type: decisionType,
      criticality: criticalityLevel,
      decisionDigest,
      summary: this.generateDecisionSummary(decision),
      expiresAt: decision.expiresAt,
    });

    // Logger la demande
    console.log(`🔐 Human approval requested for ${decisionType} (${criticalityLevel})`, {
      token: approvalToken,
      decisionDigest,
      expiresAt: new Date(decision.expiresAt).toISOString(),
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
        message: 'Decision not found or already processed',
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
        message: 'Approval request has expired',
      };
    }

    return {
      status: decision.status,
      approved: decision.status === ApprovalStatus.APPROVED,
      approvedBy: decision.approvedBy,
      approvalTimestamp: decision.approvalTimestamp,
      message: this.getStatusMessage(decision.status),
    };
  }

  /**
   * Approuve une décision avec une approbation signée (fail-closed)
   * @param {Object} signedApproval - Approval signée (format SignedApprovalSchema avec signature)
   * @returns {boolean} True si approuvé avec succès
   */
  async approveDecision(signedApproval) {
    // Lazy init si nécessaire
    await this._ensureInitialized();
    // Fail-closed: validation stricte
    let validatedApproval;
    try {
      validatedApproval = validateSignedApproval(signedApproval);
    } catch (error) {
      console.warn('🚫 FAIL-CLOSED: Invalid signed approval schema', {
        error: error.message,
        decisionId: signedApproval?.decisionId,
      });
      return false;
    }

    const decision = this.pendingDecisions.get(validatedApproval.decisionId);

    if (!decision || decision.status !== ApprovalStatus.PENDING) {
      console.warn('🚫 Invalid approval attempt', {
        decisionId: validatedApproval.decisionId,
        status: decision?.status,
      });
      return false;
    }

    // Vérifier l'expiration de la demande
    if (Date.now() > decision.expiresAt) {
      decision.status = ApprovalStatus.EXPIRED;
      this.securityMetrics.expiredDecisions++;
      this.moveToHistory(decision);
      this.pendingDecisions.delete(validatedApproval.decisionId);
      return false;
    }

    // Vérifier l'approbation signée (signature + digest + autorisation)
    const verification = await this.verifyApproval(validatedApproval, decision);

    if (!verification.valid) {
      // Audit entry explicite pour rejet
      const auditEntry = {
        timestamp: Date.now(),
        event: 'approval_rejected',
        decisionId: validatedApproval.decisionId,
        decisionType: decision.type,
        criticality: decision.criticality,
        approverId: validatedApproval.approver.id,
        approverRole: validatedApproval.approver.role,
        errorCode: verification.errorCode,
        error: verification.error,
      };

      console.warn('🚫 FAIL-CLOSED: Approval verification failed', auditEntry);

      // Émettre événement audit
      this.emit('approval_verification_failed', auditEntry);

      return false;
    }

    // Approuver la décision
    decision.status = ApprovalStatus.APPROVED;
    decision.approvedBy = validatedApproval.approver.id;
    decision.approvalTimestamp = Date.now();
    decision.signedApproval = validatedApproval; // Stocker l'approbation complète pour audit

    this.securityMetrics.approvedDecisions++;
    this.moveToHistory(decision);
    this.pendingDecisions.delete(validatedApproval.decisionId);

    // Émettre l'événement d'approbation
    this.emit('decision_approved', {
      token: validatedApproval.decisionId,
      type: decision.type,
      approvedBy: validatedApproval.approver.id,
      approverRole: validatedApproval.approver.role,
      timestamp: decision.approvalTimestamp,
      decisionDigest: decision.decisionDigest,
    });

    console.log(
      `✅ Decision approved by ${validatedApproval.approver.id} (${validatedApproval.approver.role})`,
      {
        token: validatedApproval.decisionId,
        type: decision.type,
        criticality: decision.criticality,
        decisionDigest: decision.decisionDigest,
      }
    );

    return true;
  }

  /**
   * Rejette une décision avec une approbation signée (fail-closed)
   * @param {Object} signedApproval - Approval signée avec verdict='reject' (format SignedApprovalSchema avec signature)
   * @returns {boolean} True si rejeté avec succès
   */
  async rejectDecision(signedApproval) {
    // Lazy init si nécessaire
    await this._ensureInitialized();
    // Fail-closed: validation stricte
    let validatedApproval;
    try {
      validatedApproval = validateSignedApproval(signedApproval);
    } catch (error) {
      console.warn('🚫 FAIL-CLOSED: Invalid signed rejection schema', {
        error: error.message,
        decisionId: signedApproval?.decisionId,
      });
      return false;
    }

    // Vérifier que verdict est 'reject'
    if (validatedApproval.verdict !== 'reject') {
      console.warn('🚫 FAIL-CLOSED: Invalid verdict for rejection', {
        decisionId: validatedApproval.decisionId,
        verdict: validatedApproval.verdict,
      });
      return false;
    }

    const decision = this.pendingDecisions.get(validatedApproval.decisionId);

    if (!decision || decision.status !== ApprovalStatus.PENDING) {
      console.warn('🚫 Invalid rejection attempt', {
        decisionId: validatedApproval.decisionId,
        status: decision?.status,
      });
      return false;
    }

    // Vérifier l'approbation signée (signature + digest + autorisation)
    const verification = await this.verifyApproval(validatedApproval, decision);

    if (!verification.valid) {
      // Audit entry explicite pour rejet
      const auditEntry = {
        timestamp: Date.now(),
        event: 'rejection_verification_failed',
        decisionId: validatedApproval.decisionId,
        decisionType: decision.type,
        criticality: decision.criticality,
        approverId: validatedApproval.approver.id,
        approverRole: validatedApproval.approver.role,
        errorCode: verification.errorCode,
        error: verification.error,
      };

      console.warn('🚫 FAIL-CLOSED: Rejection verification failed', auditEntry);
      this.emit('approval_verification_failed', auditEntry);

      return false;
    }

    // Rejeter la décision
    decision.status = ApprovalStatus.REJECTED;
    decision.approvedBy = validatedApproval.approver.id;
    decision.approvalTimestamp = Date.now();
    decision.rejectionReason = validatedApproval.reason || '';
    decision.signedApproval = validatedApproval; // Stocker pour audit

    this.securityMetrics.rejectedDecisions++;
    this.moveToHistory(decision);
    this.pendingDecisions.delete(validatedApproval.decisionId);

    // Émettre l'événement de rejet
    this.emit('decision_rejected', {
      token: validatedApproval.decisionId,
      type: decision.type,
      rejectedBy: validatedApproval.approver.id,
      approverRole: validatedApproval.approver.role,
      reason: validatedApproval.reason || '',
      timestamp: decision.approvalTimestamp,
      decisionDigest: decision.decisionDigest,
    });

    console.log(
      `❌ Decision rejected by ${validatedApproval.approver.id} (${validatedApproval.approver.role})`,
      {
        token: validatedApproval.decisionId,
        type: decision.type,
        reason: validatedApproval.reason,
      }
    );

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
        nextAllowedAt: new Date(Date.now() + cooldownRemaining).toISOString(),
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
      data: improvementData,
    };

    console.log('📊 Self-improvement recorded in TrustContext', {
      timestamp: this.lastSelfImprovement.timestamp,
      type: improvementData.type || 'unknown',
    });
  }

  /**
   * Valide une décision critique (wrapper avec validation fail-closed)
   * @param {Object} request - Requête de validation
   * @returns {Promise<Object>} Réponse d'approbation
   */
  async validateCriticalDecision(request) {
    // VALIDATION FAIL-CLOSED: Vérifier que l'input est conforme au schéma
    let validatedRequest;
    try {
      validatedRequest = validateCriticalDecisionRequest(request);
    } catch (error) {
      // Log structuré du rejet
      const logEntry = {
        timestamp: Date.now(),
        event: 'schema_validation_failed',
        module: 'TrustContext.validateCriticalDecision',
        error: error.message,
        action: request?.action,
        criticality: request?.criticality,
      };
      console.error(
        '🚫 FAIL-CLOSED: Critical decision request rejected (schema validation):',
        logEntry
      );
      throw error; // Fail-closed: rejeter explicitement
    }

    // Vérifier si approbation humaine requise
    const requiresApproval = this.requiresHumanApproval(
      validatedRequest.action,
      validatedRequest.criticality,
      validatedRequest
    );

    if (!requiresApproval) {
      // Auto-approbation pour niveaux faibles
      const response = {
        approved: true,
        reason: 'Auto-approved (low criticality)',
        timestamp: Date.now(),
      };

      // VALIDATION FAIL-CLOSED: Vérifier la réponse
      try {
        return validateApprovalResponse(response);
      } catch (error) {
        console.error('🚫 FAIL-CLOSED: Invalid approval response generated:', error.message);
        throw new Error('Internal error: invalid approval response');
      }
    }

    // Demander approbation humaine
    const approvalToken = await this.requireHumanApproval(
      validatedRequest.action,
      validatedRequest.criticality,
      validatedRequest,
      validatedRequest
    );

    // Vérifier l'approbation (immédiatement, peut être pending)
    const approvalStatus = this.checkApproval(approvalToken);

    const response = {
      approved: approvalStatus.approved,
      reason:
        approvalStatus.message ||
        (approvalStatus.approved ? 'Approved' : 'Requires human approval'),
      timestamp: Date.now(),
      approvalId: approvalToken,
    };

    // VALIDATION FAIL-CLOSED: Vérifier la réponse
    try {
      return validateApprovalResponse(response);
    } catch (error) {
      console.error('🚫 FAIL-CLOSED: Invalid approval response generated:', error.message);
      throw new Error('Internal error: invalid approval response');
    }
  }

  /**
   * Demande une approbation (wrapper avec validation fail-closed)
   * @param {Object} request - Requête d'approbation
   * @returns {Promise<Object>} Réponse d'approbation
   */
  async requestApproval(request) {
    // VALIDATION FAIL-CLOSED: Vérifier que l'input est conforme au schéma
    let validatedRequest;
    try {
      validatedRequest = validateApprovalRequest(request);
    } catch (error) {
      // Log structuré du rejet
      const logEntry = {
        timestamp: Date.now(),
        event: 'schema_validation_failed',
        module: 'TrustContext.requestApproval',
        error: error.message,
        action: request?.action,
      };
      console.error('🚫 FAIL-CLOSED: Approval request rejected (schema validation):', logEntry);
      throw error; // Fail-closed: rejeter explicitement
    }

    // Déterminer le niveau de criticité si non fourni
    const criticality =
      validatedRequest.criticality ||
      (validatedRequest.fileSize && validatedRequest.fileSize >= 20 * 1024 * 1024
        ? CriticalityLevel.HIGH
        : CriticalityLevel.MEDIUM);

    // Vérifier si approbation humaine requise
    const requiresApproval = this.requiresHumanApproval(
      validatedRequest.action,
      criticality,
      validatedRequest
    );

    if (!requiresApproval) {
      // Auto-approbation
      const response = {
        approved: true,
        reason: 'Auto-approved',
        timestamp: Date.now(),
      };

      // VALIDATION FAIL-CLOSED: Vérifier la réponse
      try {
        return validateApprovalResponse(response);
      } catch (error) {
        console.error('🚫 FAIL-CLOSED: Invalid approval response generated:', error.message);
        throw new Error('Internal error: invalid approval response');
      }
    }

    // Demander approbation humaine
    const approvalToken = await this.requireHumanApproval(
      validatedRequest.action,
      criticality,
      validatedRequest,
      validatedRequest
    );

    // Vérifier l'approbation
    const approvalStatus = this.checkApproval(approvalToken);

    const response = {
      approved: approvalStatus.approved,
      reason:
        approvalStatus.message ||
        (approvalStatus.approved ? 'Approved' : 'Requires human approval'),
      timestamp: Date.now(),
      approvalId: approvalToken,
    };

    // VALIDATION FAIL-CLOSED: Vérifier la réponse
    try {
      return validateApprovalResponse(response);
    } catch (error) {
      console.error('🚫 FAIL-CLOSED: Invalid approval response generated:', error.message);
      throw new Error('Internal error: invalid approval response');
    }
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
      reason: 'consensus_rejection',
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
      timestamp: rejectionRecord.timestamp,
    });
  }

  /**
   * Calcule un DecisionDigest stable (immutable) pour une décision
   * Le digest est stable : même décision => même digest (sans timestamp)
   * @param {string} decisionId - ID/token de la décision
   * @param {string} decisionType - Type de décision
   * @param {string} criticality - Niveau de criticité
   * @param {Object} decisionData - Données de la décision
   * @param {Object} context - Contexte (optionnel)
   * @returns {string} DecisionDigest (SHA-256 hex, 64 chars)
   */
  computeDecisionDigest(decisionId, decisionType, criticality, decisionData, context = {}) {
    // Canonicalisation stable : ordre des clés fixe, sans timestamp
    const canonical = {
      decisionId,
      type: decisionType,
      criticality,
      data: this._canonicalizeObject(decisionData),
      context: this._canonicalizeObject(context),
    };

    // JSON.stringify avec replacer pour garantir ordre stable
    const canonicalString = JSON.stringify(canonical, Object.keys(canonical).sort());

    return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
  }

  /**
   * Canonicalise un objet (ordre des clés stable, récursif)
   * @private
   */
  _canonicalizeObject(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) => this._canonicalizeObject(item));
    }

    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = this._canonicalizeObject(obj[key]);
    }
    return sorted;
  }

  /**
   * Génère un hash unique pour une décision (legacy, avec timestamp)
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
      timestamp: Date.now(),
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
   * Vérifie si un approver est autorisé selon la politique de gouvernance
   * @param {Object} approver - { id, role }
   * @param {string} criticality - Niveau de criticité de la décision
   * @returns {boolean} True si autorisé
   */
  isApproverAuthorized(approver, criticality) {
    // Default deny: si role absent ou inconnu => rejet
    if (!approver.role) {
      return false;
    }

    // Récupérer les rôles autorisés pour cette criticité
    const allowedRoles = this.config.governancePolicy[criticality] || [];

    // Si aucune politique définie pour cette criticité => default deny
    if (allowedRoles.length === 0) {
      return false;
    }

    return allowedRoles.includes(approver.role);
  }

  /**
   * Vérifie une approbation signée (signature + digest + autorisation)
   * Fail-closed: toute erreur => rejet explicite
   * @param {Object} signedApproval - Approval signée (format SignedApprovalSchema)
   * @param {Object} decision - Décision en attente
   * @returns {Promise<Object>} { valid: boolean, error?: string, errorCode?: string }
   */
  async verifyApproval(signedApproval, decision) {
    // 1. Validation Zod stricte
    try {
      validateSignedApproval(signedApproval);
    } catch (error) {
      return {
        valid: false,
        error: `Schema validation failed: ${error.message}`,
        errorCode: 'SCHEMA_INVALID',
      };
    }

    // 2. Vérifier decisionDigest match
    if (signedApproval.decisionDigest !== decision.decisionDigest) {
      return {
        valid: false,
        error: 'Decision digest mismatch',
        errorCode: 'DIGEST_MISMATCH',
      };
    }

    // 3. Vérifier decisionId match
    if (signedApproval.decisionId !== decision.token) {
      return {
        valid: false,
        error: 'Decision ID mismatch',
        errorCode: 'DECISION_ID_MISMATCH',
      };
    }

    // 4. Vérifier expiration (si expiresAt présent)
    if (signedApproval.expiresAt && Date.now() > signedApproval.expiresAt) {
      return {
        valid: false,
        error: 'Approval signature expired',
        errorCode: 'EXPIRED',
      };
    }

    // 5. Vérifier autorisation (gouvernance policy)
    if (!this.isApproverAuthorized(signedApproval.approver, decision.criticality)) {
      return {
        valid: false,
        error: `Approver role '${signedApproval.approver.role}' not authorized for criticality '${decision.criticality}'`,
        errorCode: 'AUTHORIZATION_FAILED',
      };
    }

    // 6. Vérifier signature cryptographique Ed25519
    const verificationResult = await this._verifySignature(signedApproval);
    if (!verificationResult.valid) {
      return verificationResult;
    }

    return { valid: true };
  }

  /**
   * Canonicalise le payload d'une approbation pour signature/vérification
   * RÈGLE: Même canonicalisation pour sign ET verify (même ordre, même champs)
   * @private
   * @param {Object} approval - Approval (sans signature)
   * @returns {string} Payload canonique JSON
   */
  _canonicalizeApprovalPayload(approval) {
    // Ne jamais inclure 'signature' dans le payload signé
    // Ne pas inclure 'nonce' si undefined/null (pour correspondre à createSignedApproval)
    const payload = {
      approvalId: approval.approvalId,
      decisionId: approval.decisionId,
      decisionDigest: approval.decisionDigest,
      approver: approval.approver,
      verdict: approval.verdict,
      reason: approval.reason,
      issuedAt: approval.issuedAt,
      expiresAt: approval.expiresAt,
      // nonce: omis si undefined/null (comme dans createSignedApproval)
    };

    // Si nonce est présent et défini, l'inclure
    if (approval.nonce !== undefined && approval.nonce !== null) {
      payload.nonce = approval.nonce;
    }

    // Tri stable des clés pour canonicalisation
    return JSON.stringify(payload, Object.keys(payload).sort());
  }

  /**
   * Vérifie la signature Ed25519 d'une approbation
   * @private
   * @param {Object} signedApproval - Approval signée
   * @returns {Object} { valid: boolean, error?: string, errorCode?: string }
   */
  async _verifySignature(signedApproval) {
    // En mode TEST, accepter signatures de test (pour tests unitaires)
    if (this.config.mode === 'TEST' && signedApproval.approver.id.startsWith('test_')) {
      return { valid: true };
    }

    // Récupérer la clé publique (KeyRegistry prioritaire)
    let publicKeyPem = null;

    // 1. Essayer KeyRegistry (TRL 5)
    if (this.config.keyRegistry) {
      try {
        await this.config.keyRegistry.initialize();
        if (this.config.keyRegistry.isActive(signedApproval.approver.keyId)) {
          publicKeyPem = this.config.keyRegistry.getPublicKey(signedApproval.approver.keyId);
        } else {
          // Clé révoquée ou inactive
          return {
            valid: false,
            error: `Key ${signedApproval.approver.keyId} is revoked or inactive`,
            errorCode: 'KEY_UNKNOWN',
          };
        }
      } catch (error) {
        // Fallback sur approverPublicKeys Map
        console.warn('[TrustContext] KeyRegistry lookup failed, using fallback:', error.message);
      }
    }

    // 2. Fallback: Map legacy
    if (!publicKeyPem) {
      publicKeyPem = this.config.approverPublicKeys.get(signedApproval.approver.keyId);
    }

    if (!publicKeyPem) {
      return {
        valid: false,
        error: `Public key not found for keyId: ${signedApproval.approver.keyId}`,
        errorCode: 'KEY_UNKNOWN',
      };
    }

    try {
      // Vérifier que la signature est présente
      if (!signedApproval.signature || typeof signedApproval.signature !== 'string') {
        return {
          valid: false,
          error: 'Signature missing or invalid format',
          errorCode: 'SIGNATURE_INVALID',
        };
      }

      // Canonicaliser le payload (même logique que createSignedApproval)
      // Utiliser la fonction partagée pour garantir identité
      const canonicalPayload = this._canonicalizeApprovalPayload(signedApproval);
      const messageBuffer = Buffer.from(canonicalPayload, 'utf8');

      // Signature en hex (unifié avec createSignedApproval)
      const signatureBuffer = Buffer.from(signedApproval.signature, 'hex');

      // Vérifier signature Ed25519
      const isValid = crypto.verify(
        null, // Ed25519 n'utilise pas de hash algorithm
        messageBuffer,
        publicKeyPem,
        signatureBuffer
      );

      if (!isValid) {
        return {
          valid: false,
          error: 'Ed25519 signature verification failed',
          errorCode: 'SIGNATURE_INVALID',
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Signature verification error: ${error.message}`,
        errorCode: 'SIGNATURE_INVALID',
      };
    }
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
      [ApprovalStatus.EXPIRED]: 'Approval request expired',
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
      processedAt: Date.now(),
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
    expiredTokens.forEach((token) => {
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
    const totalProcessed =
      this.securityMetrics.approvedDecisions +
      this.securityMetrics.rejectedDecisions +
      this.securityMetrics.expiredDecisions;

    if (totalProcessed > 0) {
      this.securityMetrics.humanApprovalRate =
        this.securityMetrics.approvedDecisions / totalProcessed;
    }

    // Calculer le temps moyen d'approbation
    const approvedDecisions = this.approvalHistory.filter(
      (d) => d.status === ApprovalStatus.APPROVED && d.approvalTimestamp
    );

    if (approvedDecisions.length > 0) {
      const totalApprovalTime = approvedDecisions.reduce(
        (sum, d) => sum + (d.approvalTimestamp - d.timestamp),
        0
      );
      this.securityMetrics.averageApprovalTime = totalApprovalTime / approvedDecisions.length;
    }

    // Émettre les métriques
    this.emit('security_metrics', {
      ...this.securityMetrics,
      pendingDecisions: this.pendingDecisions.size,
      timestamp: Date.now(),
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
      lastUpdate: Date.now(),
    };
  }

  /**
   * Obtient les décisions en attente
   * @returns {Array} Liste des décisions en attente
   */
  getPendingDecisions() {
    return Array.from(this.pendingDecisions.values()).map((decision) => ({
      token: decision.token,
      type: decision.type,
      criticality: decision.criticality,
      summary: this.generateDecisionSummary(decision),
      timestamp: decision.timestamp,
      expiresAt: decision.expiresAt,
      timeRemaining: Math.max(0, decision.expiresAt - Date.now()),
    }));
  }

  /**
   * Obtient l'historique des approbations
   * @param {number} limit - Limite du nombre d'éléments
   * @returns {Array} Historique
   */
  getApprovalHistory(limit = 100) {
    return this.approvalHistory.slice(-limit).map((decision) => ({
      type: decision.type,
      criticality: decision.criticality,
      status: decision.status,
      timestamp: decision.timestamp,
      approvedBy: decision.approvedBy,
      approvalTimestamp: decision.approvalTimestamp,
      processingTime: decision.approvalTimestamp
        ? decision.approvalTimestamp - decision.timestamp
        : null,
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

/**
 * Helper: Crée et signe une approbation (pour tests et clients externes)
 * Cette fonction est utilisée par les approvers pour créer une SignedApproval valide
 * @param {Object} params
 * @param {string} params.approvalId - UUID de l'approbation
 * @param {string} params.decisionId - Token de la décision
 * @param {string} params.decisionDigest - Digest de la décision (64 chars hex)
 * @param {Object} params.approver - { id, role, keyId }
 * @param {'approve'|'reject'} params.verdict
 * @param {string} params.reason - Raison optionnelle
 * @param {number} params.issuedAt - Timestamp
 * @param {number} params.expiresAt - Timestamp optionnel
 * @param {string} params.privateKeyPem - Clé privée PEM pour signer
 * @returns {Object} SignedApproval avec signature
 */
/**
 * Canonicalise le payload d'une approbation (fonction partagée)
 * @param {Object} approval - Approval (sans signature)
 * @returns {string} Payload canonique JSON
 */
function canonicalizeApprovalPayload(approval) {
  // Même logique que _canonicalizeApprovalPayload dans TrustContext
  const payload = {
    approvalId: approval.approvalId,
    decisionId: approval.decisionId,
    decisionDigest: approval.decisionDigest,
    approver: approval.approver,
    verdict: approval.verdict,
    reason: approval.reason,
    issuedAt: approval.issuedAt,
    expiresAt: approval.expiresAt,
  };

  // Si nonce est présent et défini, l'inclure
  if (approval.nonce !== undefined && approval.nonce !== null) {
    payload.nonce = approval.nonce;
  }

  // Tri stable des clés pour canonicalisation
  return JSON.stringify(payload, Object.keys(payload).sort());
}

export function createSignedApproval({
  approvalId,
  decisionId,
  decisionDigest,
  approver,
  verdict,
  reason,
  issuedAt,
  expiresAt,
  nonce,
  privateKeyPem,
}) {
  // Créer payload (sans signature)
  const payload = {
    approvalId,
    decisionId,
    decisionDigest,
    approver,
    verdict,
    reason,
    issuedAt,
    expiresAt,
    nonce,
  };

  // Canonicaliser (MÊME fonction que verify)
  const canonicalPayload = canonicalizeApprovalPayload(payload);
  const messageBuffer = Buffer.from(canonicalPayload, 'utf8');

  // Signer avec Ed25519 (algo NULL pour Ed25519)
  const signature = crypto.sign(null, messageBuffer, privateKeyPem);
  // Signature en hex (unifié avec verify)
  const signatureHex = signature.toString('hex');

  return {
    ...payload,
    signature: signatureHex,
  };
}

export default TrustContext;
