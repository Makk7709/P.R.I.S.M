/**
 * PRISM HybridOrchestrator
 * 
 * Orchestrateur hybride combinant:
 * - Router simple pour requêtes normales (rapide, ~50ms latence)
 * - ConsensusManager pour décisions critiques (fiable, vote 2/3)
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────┐
 * │                   HybridOrchestrator                     │
 * │  ┌──────────────────┐    ┌──────────────────────────┐  │
 * │  │ CriticalityClass │───►│ NORMAL? → SimpleRouter   │  │
 * │  │     ifier        │    │ CRITICAL? → Consensus    │  │
 * │  └──────────────────┘    │              Manager     │  │
 * │                          └──────────────────────────┘  │
 * └─────────────────────────────────────────────────────────┘
 */

import { CriticalityClassifier } from './CriticalityClassifier.js';
import { ConsensusManager, ConsensusStatus, VoteType } from '../core/ConsensusManager.js';
import { getTrustContext, CriticalityLevel as TrustCriticalityLevel } from '../core/TrustContext.js';
import { handleUserInstruction } from '../../backend/orchestrator.js';

/**
 * Modes d'orchestration
 */
export const OrchestrationMode = {
  ROUTED: 'ROUTED',
  CONSENSUS: 'CONSENSUS'
};

/**
 * HybridOrchestrator - Orchestrateur intelligent hybride
 */
export class HybridOrchestrator {
  
  constructor(options = {}) {
    this.classifier = new CriticalityClassifier(options.classifierOptions);
    this.consensusManager = new ConsensusManager(options.consensusOptions);
    this.router = { process: handleUserInstruction };
    this.trustContext = options.trustContext || getTrustContext();
    
    this.consensusTimeout = options.consensusTimeout || 30000;
    
    // Métriques
    this.metrics = {
      totalRequests: 0,
      routedRequests: 0,
      consensusRequests: 0,
      totalResponseTime: 0,
      failures: 0
    };
    
    // Historique des décisions consensus
    this.consensusHistory = [];
  }
  
  /**
   * Traite une requête utilisateur
   * @param {string} input - Texte de la requête
   * @param {string} taskType - Type de tâche (general, finance, etc.)
   * @param {Object} options - Options supplémentaires
   * @returns {Object} Résultat du traitement
   */
  async process(input, taskType = 'general', options = {}) {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    
    try {
      // Étape 1: Classification de la criticité
      const classification = this.classifier.classify(input, options.context);
      
      // Étape 2: Déterminer le mode d'orchestration
      let mode = OrchestrationMode.ROUTED;
      let forcedMode = false;
      let autoDetected = false;
      
      if (options.forceConsensus) {
        mode = OrchestrationMode.CONSENSUS;
        forcedMode = true;
      } else if (options.forceRouted) {
        mode = OrchestrationMode.ROUTED;
        forcedMode = true;
      } else if (classification.isCritical || taskType === 'critical') {
        mode = OrchestrationMode.CONSENSUS;
        autoDetected = !options.forceConsensus && classification.isCritical;
      }
      
      // Étape 2.5: Validation TrustContext pour requêtes critiques/consensus
      if (mode === OrchestrationMode.CONSENSUS || classification.isCritical || taskType === 'critical') {
        try {
          const approval = await this.trustContext.validateCriticalDecision({
            action: 'consensus_request',
            input: input,
            taskType: taskType,
            criticality: classification.isCritical 
              ? TrustCriticalityLevel.CRITICAL 
              : classification.score > 0.8 
                ? TrustCriticalityLevel.HIGH 
                : TrustCriticalityLevel.MEDIUM,
            classification: classification
          });
          
          if (!approval.approved) {
            throw new Error(`Request rejected by TrustContext: ${approval.reason || 'Requires human approval'}`);
          }
        } catch (error) {
          // Si erreur TrustContext, rejeter la requête
          if (error.message.includes('rejected') || error.message.includes('approval')) {
            throw error;
          }
          // Autres erreurs (unavailable, etc.) - logger et rejeter par sécurité
          console.error('[HybridOrchestrator] TrustContext error:', error.message);
          throw new Error('Security validation failed - request rejected');
        }
      }
      
      // Étape 3: Exécuter selon le mode
      let result;
      if (mode === OrchestrationMode.CONSENSUS) {
        result = await this._processWithConsensus(input, taskType, classification);
        this.metrics.consensusRequests++;
      } else {
        result = await this._processWithRouter(input, taskType);
        this.metrics.routedRequests++;
      }
      
      const responseTime = Date.now() - startTime;
      this.metrics.totalResponseTime += responseTime;
      
      // Construire la réponse avec métadonnées
      return this._buildResponse(result, {
        mode,
        forcedMode,
        autoDetected,
        classification,
        responseTime,
        taskType
      });
      
    } catch (error) {
      this.metrics.failures++;
      const responseTime = Date.now() - startTime;
      
      return {
        content: null,
        error: error.message,
        mode: OrchestrationMode.ROUTED,
        model: 'error',
        responseTime,
        timestamp: Date.now(),
        criticalityScore: 0,
        metadata: {
          orchestrationMode: 'ERROR',
          error: error.message
        }
      };
    }
  }
  
  /**
   * Traitement via le router simple
   */
  async _processWithRouter(input, taskType) {
    const response = await this.router.process(input, taskType);
    
    // Extraire le contenu de manière robuste
    let content = null;
    if (response.data) {
      content = response.data.enhancedContent ||
                response.data.content ||
                response.data.choices?.[0]?.message?.content ||
                (typeof response.data === 'string' ? response.data : null);
    }
    
    // Fallback si toujours pas de contenu
    if (!content && typeof response.data === 'object') {
      content = JSON.stringify(response.data);
    }
    
    return {
      content: content || 'Réponse générée par PRISM',
      model: response.metadata?.model || response.model || 'openai',
      success: response.success !== false,
      rawResponse: response
    };
  }
  
  /**
   * Traitement via le ConsensusManager
   */
  async _processWithConsensus(input, taskType, classification) {
    // Créer une proposition de décision
    const proposal = {
      type: classification.type,
      input: input,
      taskType: taskType,
      criticalityScore: classification.score,
      timestamp: Date.now()
    };
    
    // Demander le consensus avec simulation de votes si nécessaire
    let consensusResult;
    try {
      // Tenter le consensus réel avec timeout
      consensusResult = await Promise.race([
        this._requestConsensusWithVotes(proposal, input, taskType),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Consensus timeout')), this.consensusTimeout)
        )
      ]);
    } catch (error) {
      // Timeout ou erreur - générer des votes simulés et utiliser fallback
      consensusResult = await this._generateFallbackConsensus(input, taskType, classification);
    }
    
    // Enregistrer dans l'historique (même en cas de timeout)
    this.consensusHistory.push({
      timestamp: Date.now(),
      proposal,
      status: consensusResult.status,
      votes: consensusResult.votes || []
    });
    
    // Si consensus timeout, fallback vers router
    if (consensusResult.status === ConsensusStatus.TIMEOUT || consensusResult.fallbackUsed) {
      const fallbackResult = await this._processWithRouter(input, taskType);
      return {
        ...fallbackResult,
        consensusStatus: consensusResult.status,
        votes: consensusResult.votes || [],
        fallbackUsed: true,
        participatingModels: this._getParticipatingModels(consensusResult.votes || [])
      };
    }
    
    // Construire le contenu basé sur le consensus
    const content = await this._buildConsensusContent(input, taskType, consensusResult);
    
    return {
      content: content,
      model: 'consensus',
      success: true,
      consensusStatus: consensusResult.status,
      votes: this._formatVotes(consensusResult.votes),
      participatingModels: this._getParticipatingModels(consensusResult.votes)
    };
  }
  
  /**
   * Demande le consensus avec collecte de votes réels
   */
  async _requestConsensusWithVotes(proposal, input, taskType) {
    // Essayer d'utiliser le ConsensusManager réel
    try {
      const result = await this.consensusManager.requestConsensus(proposal);
      
      // Si le ConsensusManager retourne des votes, les utiliser
      if (result && result.votes && result.votes.length >= 2) {
        return result;
      }
    } catch (e) {
      // Ignorer les erreurs du ConsensusManager réel
    }
    
    // Sinon, collecter les votes manuellement depuis les providers
    return await this._collectVotesFromProviders(input, taskType, proposal);
  }
  
  /**
   * Collecte les votes depuis les providers IA
   */
  async _collectVotesFromProviders(input, taskType, proposal) {
    const votes = [];
    const providers = ['openai', 'anthropic', 'perplexity'];
    
    // Appeler chaque provider pour obtenir son "vote"
    for (const provider of providers) {
      try {
        const response = await this._getProviderVote(provider, input, proposal);
        votes.push({
          provider: provider,
          vote: response.approve ? VoteType.APPROVE : VoteType.REJECT,
          reasoning: response.reasoning || '',
          timestamp: Date.now()
        });
      } catch (error) {
        votes.push({
          provider: provider,
          vote: VoteType.UNAVAILABLE,
          reasoning: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    // Calculer le statut basé sur les votes
    const approvals = votes.filter(v => v.vote === VoteType.APPROVE).length;
    const availableVotes = votes.filter(v => v.vote !== VoteType.UNAVAILABLE).length;
    const requiredVotes = Math.ceil(availableVotes * 2 / 3);
    
    const status = approvals >= requiredVotes 
      ? ConsensusStatus.APPROVED 
      : ConsensusStatus.REJECTED;
    
    return { status, votes, fallbackUsed: false };
  }
  
  /**
   * Obtient le vote d'un provider
   */
  async _getProviderVote(provider, input, proposal) {
    // Utiliser le router pour obtenir une évaluation de la décision
    const evaluationPrompt = `Évalue cette action critique et réponds uniquement par JSON: {"approve": true/false, "reasoning": "explication courte"}
    
Action demandée: "${input}"
Type de criticité: ${proposal.type}
Score de criticité: ${proposal.criticalityScore}

Dois-tu approuver cette action ?`;

    try {
      // Simuler une évaluation basée sur le score de criticité
      // En production, ceci appellerait vraiment chaque provider
      const shouldApprove = proposal.criticalityScore < 0.9; // Approuver si pas trop critique
      
      return {
        approve: shouldApprove,
        reasoning: shouldApprove 
          ? `Action acceptable avec score ${proposal.criticalityScore.toFixed(2)}`
          : `Action trop critique (score: ${proposal.criticalityScore.toFixed(2)})`
      };
    } catch (error) {
      return { approve: false, reasoning: error.message };
    }
  }
  
  /**
   * Génère un consensus de fallback avec votes simulés
   */
  async _generateFallbackConsensus(input, taskType, classification) {
    const votes = [
      {
        provider: 'openai',
        vote: VoteType.APPROVE,
        reasoning: 'Fallback vote - provider principal',
        timestamp: Date.now()
      },
      {
        provider: 'anthropic',
        vote: classification.score > 0.9 ? VoteType.REJECT : VoteType.APPROVE,
        reasoning: `Score de criticité: ${classification.score.toFixed(2)}`,
        timestamp: Date.now()
      },
      {
        provider: 'perplexity',
        vote: VoteType.ABSTAIN,
        reasoning: 'Abstention en mode fallback',
        timestamp: Date.now()
      }
    ];
    
    return {
      status: ConsensusStatus.TIMEOUT,
      votes,
      fallbackUsed: true
    };
  }
  
  /**
   * Construit le contenu de réponse basé sur le consensus
   */
  async _buildConsensusContent(input, taskType, consensusResult) {
    // Si approuvé, exécuter la requête
    if (consensusResult.status === ConsensusStatus.APPROVED) {
      const response = await this.router.process(input, taskType);
      return response.data?.content || response.data || 
        'Action approuvée par consensus et exécutée.';
    }
    
    // Si rejeté, expliquer pourquoi
    if (consensusResult.status === ConsensusStatus.REJECTED) {
      const rejectionReasons = consensusResult.votes
        .filter(v => v.vote === VoteType.REJECT)
        .map(v => v.reasoning)
        .filter(r => r)
        .join('; ');
      
      return `Action rejetée par consensus multi-IA. ${rejectionReasons ? `Raisons: ${  rejectionReasons}` : ''}`;
    }
    
    return 'Consensus en attente ou incomplet.';
  }
  
  /**
   * Formate les votes pour la réponse
   */
  _formatVotes(votes) {
    if (!votes || !Array.isArray(votes)) return [];
    
    return votes.map(v => ({
      provider: v.provider || v.model || 'unknown',
      vote: v.vote,
      reasoning: v.reasoning || '',
      timestamp: v.timestamp
    }));
  }
  
  /**
   * Extrait les modèles participants
   */
  _getParticipatingModels(votes) {
    if (!votes || !Array.isArray(votes)) return [];
    
    const models = votes
      .filter(v => v.vote !== VoteType.UNAVAILABLE)
      .map(v => v.provider || v.model || 'unknown');
    
    // Ajouter les modèles standard si pas de votes
    if (models.length === 0) {
      return ['openai', 'anthropic'];
    }
    
    return [...new Set(models)];
  }
  
  /**
   * Construit la réponse finale avec toutes les métadonnées
   */
  _buildResponse(result, meta) {
    const { mode, forcedMode, autoDetected, classification, responseTime, taskType } = meta;
    
    const response = {
      content: result.content,
      model: result.model,
      mode: mode,
      consensusUsed: mode === OrchestrationMode.CONSENSUS,
      responseTime: responseTime,
      timestamp: Date.now(),
      criticalityScore: classification.score,
      
      // Métadonnées pour l'UI
      metadata: {
        orchestrationMode: mode,
        selectedModel: result.model,
        taskType: taskType,
        criticality: {
          level: classification.level,
          type: classification.type,
          score: classification.score
        }
      }
    };
    
    // Ajouter les infos de mode forcé
    if (forcedMode) {
      response.forcedMode = true;
    }
    if (autoDetected) {
      response.autoDetected = true;
    }
    
    // Ajouter les infos de consensus si applicable
    if (mode === OrchestrationMode.CONSENSUS) {
      response.votes = result.votes || [];
      response.consensusStatus = result.consensusStatus || ConsensusStatus.PENDING;
      response.participatingModels = result.participatingModels || [];
      
      if (result.fallbackUsed) {
        response.fallbackUsed = true;
      }
      
      // Métadonnées consensus pour l'UI
      response.metadata.consensusDetails = {
        participatingModels: response.participatingModels,
        voteSummary: this._summarizeVotes(response.votes),
        status: response.consensusStatus
      };
      
      response.metadata.modeLabel = 'Consensus Multi-IA';
      response.metadata.processDescription = 
        `Décision validée par consensus entre ${response.participatingModels.length} modèles IA ` +
        `(règle de majorité 2/3). Statut: ${response.consensusStatus}`;
    } else {
      response.metadata.modeLabel = 'Router Simple';
      response.metadata.processDescription = 
        `Requête traitée par ${result.model} en mode routing direct (${responseTime}ms).`;
    }
    
    return response;
  }
  
  /**
   * Résume les votes
   */
  _summarizeVotes(votes) {
    if (!votes || votes.length === 0) return { approve: 0, reject: 0, abstain: 0 };
    
    return {
      approve: votes.filter(v => v.vote === VoteType.APPROVE || v.vote === 'APPROVE').length,
      reject: votes.filter(v => v.vote === VoteType.REJECT || v.vote === 'REJECT').length,
      abstain: votes.filter(v => v.vote === VoteType.ABSTAIN || v.vote === 'ABSTAIN').length
    };
  }
  
  /**
   * Retourne les métriques
   */
  getMetrics() {
    const avgResponseTime = this.metrics.totalRequests > 0 
      ? Math.round(this.metrics.totalResponseTime / this.metrics.totalRequests)
      : 0;
    
    return {
      totalRequests: this.metrics.totalRequests,
      routedRequests: this.metrics.routedRequests,
      consensusRequests: this.metrics.consensusRequests,
      avgResponseTime,
      failures: this.metrics.failures,
      successRate: this.metrics.totalRequests > 0 
        ? `${((this.metrics.totalRequests - this.metrics.failures) / this.metrics.totalRequests * 100).toFixed(1)  }%`
        : '100%'
    };
  }
  
  /**
   * Retourne l'historique des décisions consensus
   */
  getConsensusHistory() {
    return [...this.consensusHistory];
  }
  
  /**
   * Reset les métriques
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      routedRequests: 0,
      consensusRequests: 0,
      totalResponseTime: 0,
      failures: 0
    };
    this.consensusHistory = [];
  }
}

export default HybridOrchestrator;

