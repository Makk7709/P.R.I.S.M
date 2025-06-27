/**
 * PRISM Consensus Manager
 * Système de validation collective pour les décisions critiques
 * Implémente une règle de majorité qualifiée (2/3) entre les IA fournisseurs
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { getTrustContext } from './TrustContext.js';

/**
 * Types de décisions critiques
 */
export const DecisionType = {
  SECURITY: 'security',
  CRITICAL: 'critical',
  SELF_IMPROVEMENT: 'self_improvement',
  SYSTEM_MODIFICATION: 'system_modification',
  DATA_ACCESS: 'data_access'
};

/**
 * Types de votes avec support d'abstention
 */
export const VoteType = {
  APPROVE: 'approve',
  REJECT: 'reject',
  ABSTAIN: 'abstain',
  UNAVAILABLE: 'unavailable'
};

/**
 * Statuts de consensus
 */
export const ConsensusStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  TIMEOUT: 'TIMEOUT'
};

/**
 * Fournisseurs d'IA participants au consensus
 */
export const AIProvider = {
  GPT4: 'gpt-4.1',
  CLAUDE3: 'claude-3',
  PERPLEXITY: 'perplexity'
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
    this.requiredVotes = Math.ceil(Object.keys(AIProvider).length * 2 / 3); // 2/3 majorité
  }

  addVote(provider, vote, reasoning = '') {
    this.votes.set(provider, {
      vote: vote, // VoteType.APPROVE, VoteType.REJECT, VoteType.ABSTAIN, VoteType.UNAVAILABLE
      reasoning: reasoning,
      timestamp: Date.now()
    });
  }

  getVoteCount() {
    const approvals = Array.from(this.votes.values()).filter(v => v.vote === VoteType.APPROVE || v.vote === true).length;
    const rejections = Array.from(this.votes.values()).filter(v => v.vote === VoteType.REJECT || v.vote === false).length;
    const abstentions = Array.from(this.votes.values()).filter(v => v.vote === VoteType.ABSTAIN).length;
    const unavailable = Array.from(this.votes.values()).filter(v => v.vote === VoteType.UNAVAILABLE).length;
    return { approvals, rejections, abstentions, unavailable, total: this.votes.size };
  }

  isComplete() {
    const { approvals, rejections, abstentions, unavailable, total } = this.getVoteCount();
    const totalProviders = Object.keys(AIProvider).length;
    const effectiveVotes = approvals + rejections; // Abstentions ne comptent pas dans le quorum
    const availableProviders = totalProviders - unavailable;
    
    // Quorum dynamique : ajuster selon les fournisseurs disponibles (fail-open)
    const dynamicQuorum = Math.max(2, Math.ceil(availableProviders * 2 / 3));
    
    // Consensus atteint si 2/3 des votes effectifs sont pour
    if (approvals >= dynamicQuorum) {
      this.status = ConsensusStatus.APPROVED;
      return true;
    }
    
    // Consensus rejeté si 2/3 des votes effectifs sont contre
    if (rejections >= dynamicQuorum) {
      this.status = ConsensusStatus.REJECTED;
      return true;
    }
    
    // Fail-open : si trop de fournisseurs indisponibles/abstentions, approuver avec un quorum réduit
    if (unavailable + abstentions >= totalProviders / 2) {
      // Si plus de la moitié des fournisseurs sont indisponibles/s'abstiennent
      // et qu'il y a au moins un vote d'approbation, approuver (fail-open)
      if (approvals > 0 && approvals >= rejections) {
        this.status = ConsensusStatus.APPROVED;
        return true;
      }
    }
    
    // Impossible d'atteindre le consensus si tous les fournisseurs disponibles ont voté
    if (total === availableProviders && approvals < dynamicQuorum) {
      this.status = ConsensusStatus.REJECTED;
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
      ...config
    };
    
    this.proposals = new Map();
    this.metrics = {
      totalProposals: 0,
      approvedProposals: 0,
      rejectedProposals: 0,
      timeoutProposals: 0,
      averageDecisionTime: 0,
      consensusSuccessRate: 0
    };
    
    this.trustContext = null;
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    try {
      if (this.config.enableTrustContext) {
        this.trustContext = getTrustContext();
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
      timestamp: proposal.timestamp
    });

    // Demander les votes des IA fournisseurs
    await this.requestVotes(proposal);

    return proposal.id;
  }

  /**
   * Demande les votes des IA fournisseurs
   * @param {DecisionProposal} proposal - Proposition à voter
   */
  async requestVotes(proposal) {
    const providers = Object.values(AIProvider);
    
    // Demander les votes en parallèle pour optimiser le temps
    const votePromises = providers.map(provider => 
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
   * @param {string} provider - Fournisseur d'IA
   * @param {DecisionProposal} proposal - Proposition à voter
   */
  async requestVoteFromProvider(provider, proposal) {
    try {
      // Simuler l'appel à l'IA pour obtenir un vote
      // Dans une implémentation réelle, ceci ferait appel aux APIs des IA
      const vote = await this.simulateAIVote(provider, proposal);
      this.submitVote(proposal.id, provider, vote.decision, vote.reasoning);
    } catch (error) {
      console.error(`Error getting vote from ${provider}:`, error);
      // En cas d'erreur, considérer comme un vote de rejet
      this.submitVote(proposal.id, provider, false, 'Provider error');
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
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
    
    return { decision, reasoning };
  }

  /**
   * Soumet un vote pour une proposition
   * @param {string} proposalId - ID de la proposition
   * @param {string} provider - Fournisseur d'IA votant
   * @param {boolean} vote - Vote (true = approve, false = reject)
   * @param {string} reasoning - Raisonnement du vote
   */
  submitVote(proposalId, provider, vote, reasoning = '') {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== ConsensusStatus.PENDING) {
      return false;
    }

    proposal.addVote(provider, vote, reasoning);

    this.emit('voteSubmitted', {
      proposalId,
      provider,
      vote,
      reasoning,
      timestamp: Date.now()
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
      timestamp: Date.now()
    });

    // Notifier TrustContext si nécessaire
    if (this.trustContext && proposal.status === ConsensusStatus.REJECTED) {
      this.trustContext.recordConsensusRejection(proposal);
    }

    // Nettoyer la proposition après un délai
    setTimeout(() => {
      this.proposals.delete(proposalId);
    }, 5000);
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
        votes: Object.fromEntries(proposal.votes)
      },
      timestamp: Date.now()
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
      (this.metrics.approvedProposals + this.metrics.rejectedProposals) / this.metrics.totalProposals;
  }

  /**
   * Obtient les métriques de consensus
   * @returns {Object} Métriques actuelles
   */
  getMetrics() {
    return {
      ...this.metrics,
      activePendingProposals: Array.from(this.proposals.values())
        .filter(p => p.status === ConsensusStatus.PENDING).length,
      timestamp: Date.now()
    };
  }

  /**
   * Obtient le statut d'une proposition
   * @param {string} proposalId - ID de la proposition
   * @returns {Object|null} Statut de la proposition
   */
  getProposalStatus(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return null;

    return {
      id: proposal.id,
      status: proposal.status,
      votes: Object.fromEntries(proposal.votes),
      voteCount: proposal.getVoteCount(),
      timeRemaining: proposal.timeout ? 
        Math.max(0, this.config.timeoutMs - (Date.now() - proposal.timestamp)) : 0
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
    this.removeAllListeners();
  }
}

export default ConsensusManager; 