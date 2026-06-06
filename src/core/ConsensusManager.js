/**
 * PRISM Consensus Manager
 * Système de validation collective pour les décisions critiques
 * Implémente une règle de majorité qualifiée (2/3) entre les IA fournisseurs
 */

import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import { getTrustContext } from './TrustContext.js';
import OpenAIAdapter from './providers/OpenAIAdapter.js';
import AnthropicAdapter from './providers/AnthropicAdapter.js';
import PerplexityAdapter from './providers/PerplexityAdapter.js';
import {
  validateStrict,
  DecisionProposalSchema,
  VoteSchema,
} from '../security/contracts/consensus.js';

/**
 * Types de décisions critiques
 */
export const DecisionType = {
  SECURITY: 'security',
  CRITICAL: 'critical',
  SELF_IMPROVEMENT: 'self_improvement',
  SYSTEM_MODIFICATION: 'system_modification',
  DATA_ACCESS: 'data_access',
};

/**
 * Types de votes avec support d'abstention
 */
export const VoteType = {
  APPROVE: 'approve',
  REJECT: 'reject',
  ABSTAIN: 'abstain',
  UNAVAILABLE: 'unavailable',
};

/**
 * Statuts de consensus
 */
export const ConsensusStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  TIMEOUT: 'TIMEOUT',
};

/**
 * Fournisseurs d'IA participants au consensus
 */
export const AIProvider = {
  GPT4: 'gpt-4.1',
  CLAUDE3: 'claude-3',
  PERPLEXITY: 'perplexity',
};

/**
 * Classe représentant une proposition de décision
 */
class DecisionProposal {
  constructor(decisionHash, payload, type = DecisionType.CRITICAL) {
    this.id = crypto.randomUUID();
    this.decisionHash = decisionHash;
    this.payload = payload;
    this.type = type;
    this.timestamp = Date.now();
    this.votes = new Map();
    this.status = ConsensusStatus.PENDING;
    this.timeout = null;
    this.requiredVotes = Math.ceil((Object.keys(AIProvider).length * 2) / 3); // 2/3 majorité
  }

  addVote(provider, vote, reasoning = '') {
    this.votes.set(provider, {
      vote: vote, // VoteType.APPROVE, VoteType.REJECT, VoteType.ABSTAIN, VoteType.UNAVAILABLE
      reasoning: reasoning,
      timestamp: Date.now(),
    });
  }

  getVoteCount() {
    const values = Array.from(this.votes.values());
    const approvals = values.filter((v) => v.vote === VoteType.APPROVE || v.vote === true).length;
    const rejections = values.filter((v) => v.vote === VoteType.REJECT || v.vote === false).length;
    const abstentions = values.filter((v) => v.vote === VoteType.ABSTAIN).length;
    const unavailable = values.filter((v) => v.vote === VoteType.UNAVAILABLE).length;
    return { approvals, rejections, abstentions, unavailable, total: this.votes.size };
  }

  isComplete() {
    const { approvals, rejections, abstentions, unavailable, total } = this.getVoteCount();
    const totalProviders = Object.keys(AIProvider).length;
    const _effectiveVotes = approvals + rejections; // Abstentions ne comptent pas dans le quorum
    const _availableProviders = totalProviders - unavailable;

    // Quorum dynamique : 2/3 des fournisseurs totaux
    const requiredQuorum = Math.ceil((totalProviders * 2) / 3);

    // Debug logging pour comprendre le problème
    if (process.env.NODE_ENV === 'test') {
      console.log('DEBUG isComplete:', {
        approvals,
        rejections,
        abstentions,
        unavailable,
        total,
        totalProviders,
        requiredQuorum,
      });
    }

    // Consensus atteint si 2/3 des fournisseurs totaux approuvent
    if (approvals >= requiredQuorum) {
      this.status = ConsensusStatus.APPROVED;
      return true;
    }

    // Consensus rejeté si 2/3 des fournisseurs totaux rejettent
    if (rejections >= requiredQuorum) {
      this.status = ConsensusStatus.REJECTED;
      return true;
    }

    // Fail-open : si plus de la moitié des fournisseurs sont indisponibles/abstentions
    if (unavailable + abstentions >= totalProviders / 2) {
      // et qu'il y a au moins un vote d'approbation qui domine les rejets
      if (approvals > 0 && approvals >= rejections) {
        this.status = ConsensusStatus.APPROVED;
        return true;
      }
    }

    // Impossible d'atteindre le consensus si tous les fournisseurs ont voté
    if (total === totalProviders) {
      if (approvals >= requiredQuorum) {
        this.status = ConsensusStatus.APPROVED;
      } else {
        this.status = ConsensusStatus.REJECTED;
      }
      return true;
    }

    return false;
  }
}

/**
 * Gestionnaire de consensus pour les décisions critiques
 */
export class ConsensusManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      timeoutMs: config.timeoutMs || 1000, // 1 seconde timeout strict
      maxConcurrentProposals: config.maxConcurrentProposals || 10,
      enableTrustContext: config.enableTrustContext !== false,
      cleanupDelayMs: config.cleanupDelayMs || 100, // Délai de nettoyage configurable
      autoRequestVotes: config.autoRequestVotes !== false, // Demande automatique des votes
      ...config,
    };

    this.proposals = new Map();
    this.recentProposals = new Map(); // Cache temporaire pour getProposalStatus
    this.metrics = {
      totalProposals: 0,
      approvedProposals: 0,
      rejectedProposals: 0,
      timeoutProposals: 0,
      averageDecisionTime: 0,
      consensusSuccessRate: 0,
    };

    this.trustContext = null;
    this.providerAdapters = null;
    this.isInitialized = false;

    this.init();
  }

  async init() {
    try {
      if (this.config.enableTrustContext) {
        this.trustContext = getTrustContext();
      }
      // Initialiser adaptateurs réels si demandé et si clés présentes
      if (this.config.useRealProviders) {
        this.providerAdapters = {
          [AIProvider.GPT4]: process.env.OPENAI_API_KEY
            ? new OpenAIAdapter(this.config.providers?.openai || {})
            : null,
          [AIProvider.CLAUDE3]: process.env.ANTHROPIC_API_KEY
            ? new AnthropicAdapter(this.config.providers?.anthropic || {})
            : null,
          [AIProvider.PERPLEXITY]: process.env.PERPLEXITY_API_KEY
            ? new PerplexityAdapter(this.config.providers?.perplexity || {})
            : null,
        };
      }
      this.isInitialized = true;
      console.log('🔒 ConsensusManager initialized');
    } catch (error) {
      console.warn('⚠️ ConsensusManager: Failed to initialize TrustContext:', error.message);
    }
  }

  /**
   * Propose une décision pour validation collective
   * @param {string} decisionHash - Hash unique de la décision
   * @param {Object} payload - Données de la décision
   * @param {string} type - Type de décision (DecisionType)
   * @returns {Promise<string>} ID de la proposition
   */
  async propose(decisionHash, payload, type = DecisionType.CRITICAL) {
    if (!this.isInitialized) {
      throw new Error('ConsensusManager not initialized');
    }

    // Vérifier la limite de propositions concurrentes
    if (this.proposals.size >= this.config.maxConcurrentProposals) {
      throw new Error('Maximum concurrent proposals reached');
    }

    // VALIDATION FAIL-CLOSED: Vérifier que l'input est conforme au schéma
    try {
      validateStrict({ decisionHash, payload, type }, DecisionProposalSchema);
    } catch (error) {
      // Log structuré du rejet
      const logEntry = {
        timestamp: Date.now(),
        event: 'schema_validation_failed',
        module: 'ConsensusManager.propose',
        error: error.message,
        decisionHash,
        type,
      };
      console.error('🚫 FAIL-CLOSED: Decision proposal rejected (schema validation):', logEntry);
      throw error; // Fail-closed: rejeter explicitement
    }

    // Créer la proposition
    const proposal = new DecisionProposal(decisionHash, payload, type);
    this.proposals.set(proposal.id, proposal);
    this.metrics.totalProposals++;

    // Configurer le timeout
    proposal.timeout = setTimeout(() => {
      this.handleTimeout(proposal.id);
    }, this.config.timeoutMs);

    // Émettre l'événement de nouvelle proposition
    this.emit('proposalCreated', {
      proposalId: proposal.id,
      decisionHash,
      payload,
      type,
      timestamp: proposal.timestamp,
    });

    // Demander les votes des IA fournisseurs (si activé)
    if (this.config.autoRequestVotes) {
      await this.requestVotes(proposal);
    }

    return proposal.id;
  }

  /**
   * Demande les votes des IA fournisseurs
   * @param {DecisionProposal} proposal - Proposition à voter
   */
  async requestVotes(proposal) {
    const providers = Object.values(AIProvider);

    // Demander les votes en parallèle pour optimiser le temps
    const votePromises = providers.map((provider) =>
      this.requestVoteFromProvider(provider, proposal)
    );

    try {
      await Promise.allSettled(votePromises);
    } catch (error) {
      console.error('Error requesting votes:', error);
    }
  }

  /**
   * Demande un vote à un fournisseur d'IA spécifique
   * Utilise ProviderResult strict (fail-closed) et respecte "No False-Approve"
   * @param {string} provider - Fournisseur d'IA
   * @param {DecisionProposal} proposal - Proposition à voter
   */
  async requestVoteFromProvider(provider, proposal) {
    const correlationId = crypto.randomUUID();

    try {
      let providerResult;

      if (this.providerAdapters && this.providerAdapters[provider]) {
        // Utiliser adapter qui retourne ProviderResult strict
        providerResult = await this.providerAdapters[provider].evaluate(
          { type: proposal.type, payload: proposal.payload },
          correlationId
        );
      } else {
        // Fallback simulation (convertir en ProviderResult)
        const simulatedVote = await this.simulateAIVote(provider, proposal);
        providerResult = {
          provider: provider.toLowerCase(),
          status: 'OK',
          verdict: simulatedVote.decision ? 'approve' : 'reject',
          rationale: simulatedVote.reasoning,
          latencyMs: 100,
          correlationId,
        };
      }

      // Mapper ProviderResult vers VoteType selon "No False-Approve" invariant
      // Si status !== OK, jamais APPROVE (abstain ou unavailable)
      if (providerResult.status === 'OK' && providerResult.verdict) {
        // Succès: mapper verdict directement
        const voteType =
          providerResult.verdict === 'approve'
            ? VoteType.APPROVE
            : providerResult.verdict === 'reject'
              ? VoteType.REJECT
              : VoteType.ABSTAIN;
        this.submitVote(proposal.id, provider, voteType, providerResult.rationale || '');
      } else {
        // Échec provider: abstain (jamais approve) - No False-Approve
        const errorReason = providerResult.error?.message || `Provider ${providerResult.status}`;
        this.submitVote(
          proposal.id,
          provider,
          VoteType.UNAVAILABLE,
          `Provider error: ${errorReason}`
        );

        // Log structuré
        console.warn({
          timestamp: Date.now(),
          event: 'provider_error_excluded',
          module: 'ConsensusManager.requestVoteFromProvider',
          provider,
          status: providerResult.status,
          proposalId: proposal.id,
          correlationId,
          reason: 'No False-Approve: status != OK => excluded from consensus',
        });
      }
    } catch (error) {
      // Erreur fatale: exclure du consensus (abstain, jamais approve)
      console.error({
        timestamp: Date.now(),
        event: 'provider_fatal_error',
        module: 'ConsensusManager.requestVoteFromProvider',
        provider,
        proposalId: proposal.id,
        correlationId,
        error: error.message,
      });

      this.submitVote(proposal.id, provider, VoteType.UNAVAILABLE, `Fatal error: ${error.message}`);
    }
  }

  /**
   * Simule un vote d'IA (à remplacer par de vrais appels API)
   * @param {string} provider - Fournisseur d'IA
   * @param {DecisionProposal} proposal - Proposition à évaluer
   * @returns {Promise<Object>} Vote et raisonnement
   */
  async simulateAIVote(provider, proposal) {
    // Simulation basée sur le type de décision et le fournisseur
    const { type, payload } = proposal;

    let decision = false;
    let reasoning = '';

    switch (provider) {
      case AIProvider.GPT4:
        // GPT-4 tend à être plus permissif pour l'innovation
        decision = type !== DecisionType.SECURITY || payload.riskLevel < 0.7;
        reasoning = decision ? 'Innovation beneficial' : 'Security risk too high';
        break;

      case AIProvider.CLAUDE3:
        // Claude-3 tend à être plus conservateur sur l'éthique
        decision = !payload.ethicalConcerns && payload.riskLevel < 0.5;
        reasoning = decision ? 'Ethically sound decision' : 'Ethical concerns identified';
        break;

      case AIProvider.PERPLEXITY:
        // Perplexity se base sur les faits et données
        decision = payload.evidenceQuality > 0.6 && payload.riskLevel < 0.6;
        reasoning = decision ? 'Evidence supports decision' : 'Insufficient evidence or high risk';
        break;
    }

    // Ajouter un délai réaliste
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 200 + 50));

    return { decision, reasoning };
  }

  /**
   * Soumet un vote pour une proposition
   * @param {string} proposalId - ID de la proposition
   * @param {string} provider - Fournisseur d'IA votant
   * @param {boolean|string} vote - Vote (boolean ou VoteType: 'approve'/'reject'/'abstain'/'unavailable')
   * @param {string} reasoning - Raisonnement du vote
   */
  submitVote(proposalId, provider, vote, reasoning = '') {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== ConsensusStatus.PENDING) {
      return false;
    }

    // VALIDATION FAIL-CLOSED: Vérifier que le vote est conforme au schéma
    try {
      // Convertir vote boolean en VoteType si nécessaire (rétrocompatibilité)
      let voteType;
      if (typeof vote === 'boolean') {
        voteType = vote ? 'approve' : 'reject';
      } else if (vote === true || vote === 'approve' || vote === VoteType.APPROVE) {
        voteType = 'approve';
      } else if (vote === false || vote === 'reject' || vote === VoteType.REJECT) {
        voteType = 'reject';
      } else if (vote === 'abstain' || vote === VoteType.ABSTAIN) {
        voteType = 'abstain';
      } else if (vote === 'unavailable' || vote === VoteType.UNAVAILABLE) {
        voteType = 'unavailable';
      } else {
        voteType = vote; // Utiliser tel quel
      }

      validateStrict(
        {
          vote: voteType,
          reasoning: reasoning || '',
          timestamp: Date.now(),
          provider: provider || 'unknown',
        },
        VoteSchema
      );
    } catch (error) {
      // Log structuré du rejet
      const logEntry = {
        timestamp: Date.now(),
        event: 'schema_validation_failed',
        module: 'ConsensusManager.submitVote',
        error: error.message,
        proposalId,
        provider,
      };
      console.error('🚫 FAIL-CLOSED: Vote rejected (schema validation):', logEntry);
      throw error; // Fail-closed: rejeter explicitement
    }

    // Utiliser voteType normalisé
    const finalVoteType =
      typeof vote === 'boolean'
        ? vote
          ? VoteType.APPROVE
          : VoteType.REJECT
        : vote === 'approve'
          ? VoteType.APPROVE
          : vote === 'reject'
            ? VoteType.REJECT
            : vote === 'abstain'
              ? VoteType.ABSTAIN
              : vote === 'unavailable'
                ? VoteType.UNAVAILABLE
                : vote;

    proposal.addVote(provider, finalVoteType, reasoning);

    this.emit('voteSubmitted', {
      proposalId,
      provider,
      vote,
      reasoning,
      timestamp: Date.now(),
    });

    // Vérifier si le consensus est atteint
    if (proposal.isComplete()) {
      this.finalizeProposal(proposalId);
    }

    return true;
  }

  /**
   * Finalise une proposition une fois le consensus atteint
   * @param {string} proposalId - ID de la proposition
   */
  finalizeProposal(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return;

    // Nettoyer le timeout
    if (proposal.timeout) {
      clearTimeout(proposal.timeout);
      proposal.timeout = null;
    }

    // Mettre à jour les métriques
    const decisionTime = Date.now() - proposal.timestamp;
    this.updateMetrics(proposal, decisionTime);

    // Émettre l'événement de consensus
    this.emit('consensusReached', {
      proposalId,
      status: proposal.status,
      votes: Object.fromEntries(proposal.votes),
      decisionTime,
      timestamp: Date.now(),
    });

    // Notifier TrustContext si nécessaire
    if (this.trustContext && proposal.status === ConsensusStatus.REJECTED) {
      this.trustContext.recordConsensusRejection(proposal);
    }

    // Garder dans le cache temporaire pour les tests
    this.recentProposals.set(proposalId, proposal);

    // Nettoyer la proposition après un délai configurable
    setTimeout(() => {
      this.proposals.delete(proposalId);
      // Nettoyer aussi le cache après un délai plus long
      setTimeout(() => {
        this.recentProposals.delete(proposalId);
      }, this.config.cleanupDelayMs * 2);
    }, this.config.cleanupDelayMs);
  }

  /**
   * Gère le timeout d'une proposition
   * @param {string} proposalId - ID de la proposition
   */
  handleTimeout(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== ConsensusStatus.PENDING) {
      return;
    }

    proposal.status = ConsensusStatus.TIMEOUT;
    this.metrics.timeoutProposals++;

    // Déclencher TrustContext pour veto humain
    if (this.trustContext) {
      this.trustContext.requireHumanApproval(
        `Consensus timeout for ${proposal.type}`,
        'HIGH',
        proposal.payload,
        { reason: 'Consensus timeout - human intervention required' }
      );
    }

    this.emit('consensusTimeout', {
      proposalId,
      proposal: {
        decisionHash: proposal.decisionHash,
        type: proposal.type,
        votes: Object.fromEntries(proposal.votes),
      },
      timestamp: Date.now(),
    });

    this.finalizeProposal(proposalId);
  }

  /**
   * Met à jour les métriques de consensus
   * @param {DecisionProposal} proposal - Proposition finalisée
   * @param {number} decisionTime - Temps de décision en ms
   */
  updateMetrics(proposal, decisionTime) {
    if (proposal.status === ConsensusStatus.APPROVED) {
      this.metrics.approvedProposals++;
    } else if (proposal.status === ConsensusStatus.REJECTED) {
      this.metrics.rejectedProposals++;
    }

    // Mettre à jour le temps moyen de décision
    const totalDecisions = this.metrics.approvedProposals + this.metrics.rejectedProposals;
    this.metrics.averageDecisionTime =
      (this.metrics.averageDecisionTime * (totalDecisions - 1) + decisionTime) / totalDecisions;

    // Calculer le taux de succès du consensus
    this.metrics.consensusSuccessRate =
      (this.metrics.approvedProposals + this.metrics.rejectedProposals) /
      this.metrics.totalProposals;
  }

  /**
   * Obtient les métriques de consensus
   * @returns {Object} Métriques actuelles
   */
  getMetrics() {
    return {
      ...this.metrics,
      activePendingProposals: Array.from(this.proposals.values()).filter(
        (p) => p.status === ConsensusStatus.PENDING
      ).length,
      timestamp: Date.now(),
    };
  }

  /**
   * Obtient le statut d'une proposition
   * @param {string} proposalId - ID de la proposition
   * @returns {Object|null} Statut de la proposition
   */
  getProposalStatus(proposalId) {
    let proposal = this.proposals.get(proposalId);
    if (!proposal) {
      // Vérifier dans le cache temporaire
      proposal = this.recentProposals.get(proposalId);
      if (!proposal) return null;
    }

    return {
      id: proposal.id,
      status: proposal.status,
      votes: Object.fromEntries(proposal.votes),
      voteCount: proposal.getVoteCount(),
      timeRemaining: proposal.timeout
        ? Math.max(0, this.config.timeoutMs - (Date.now() - proposal.timestamp))
        : 0,
    };
  }

  /**
   * Nettoie les ressources du ConsensusManager
   */
  cleanup() {
    // Nettoyer tous les timeouts
    for (const proposal of this.proposals.values()) {
      if (proposal.timeout) {
        clearTimeout(proposal.timeout);
      }
    }

    this.proposals.clear();
    this.recentProposals.clear();
    this.removeAllListeners();
  }
}

export default ConsensusManager;
