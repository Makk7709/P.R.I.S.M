/**
 * TaskTypeProcessor - Orchestrateur central qui active les capacités PRISM selon le Task Type
 * @module src/core/TaskTypeProcessor
 */

import crypto from 'crypto';
import { CriticalityClassifier } from '../orchestrator/CriticalityClassifier.js';
import { ConsensusManager, ConsensusStatus, DecisionType } from './ConsensusManager.js';
import { TrustContext, CriticalityLevel } from './TrustContext.js';
import { PriorityQueue } from './PriorityQueue.js';
import { PersonaActivator } from './PersonaActivator.js';
import { RealTimeResearchEngine } from './RealTimeResearchEngine.js';
import { SelfImprovementEngine } from '../../evolution/selfImprovementEngine.js';
import { MoralLayer } from '../../infrastructure/moralLayer.js';
import { handleUserInstruction } from '../../backend/orchestrator.js';

export class TaskTypeProcessor {
  constructor() {
    this.classifier = new CriticalityClassifier();
    this.consensusManager = new ConsensusManager();
    this.trustContext = new TrustContext();
    this.priorityQueue = new PriorityQueue();
    this.personaActivator = new PersonaActivator();
    this.researchEngine = new RealTimeResearchEngine();
    this.selfImprovement = new SelfImprovementEngine();
    this.moralLayer = new MoralLayer();
  }

  /**
   * Traite une requête avec activation complète des capacités PRISM
   * @param {string} userInput - Input utilisateur
   * @param {string} taskType - Type de tâche
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<Object>} Résultat du traitement
   */
  async process(userInput, taskType = 'general', options = {}) {
    const startTime = Date.now();
    
    try {
      // Étape 1: Classification de criticité
      const criticality = this.classifier.classify(userInput, options.context);
      
      // Étape 2: Activation du persona selon le Task Type
      const persona = this.personaActivator.activate(taskType, {
        criticality,
        context: options.context
      });
      
      // Étape 3: Déterminer si recherche temps réel nécessaire
      const needsResearch = this._needsRealTimeResearch(taskType, userInput);
      
      // Étape 4: Recherche temps réel si nécessaire
      let researchData = null;
      if (needsResearch) {
        researchData = await this.researchEngine.search(userInput, taskType);
      }
      
      // Étape 5: Priorisation dans la queue
      const priority = this._determinePriority(criticality, taskType);
      await this.priorityQueue.enqueue({
        id: crypto.randomUUID(),
        input: userInput,
        taskType,
        priority,
        timestamp: Date.now()
      });
      
      // Étape 6: Vérification sécurité (TrustContext)
      if (criticality.level >= CriticalityLevel.HIGH) {
        const securityCheck = await this.trustContext.requestApproval({
          action: 'process_request',
          input: userInput,
          taskType,
          criticality: criticality.level
        });
        
        if (!securityCheck.approved) {
          throw new Error('Request rejected by security layer');
        }
      }
      
      // Étape 7: Orchestration (Consensus si critique, Router sinon)
      let response;
      if (criticality.isCritical || taskType === 'critical') {
        // Utiliser Consensus pour décisions critiques
        response = await this._processWithConsensus(userInput, taskType, persona, researchData);
      } else {
        // Router optimisé pour réponses rapides
        response = await this._processWithRouter(userInput, taskType, persona, researchData);
      }
      
      // Étape 8: Validation éthique (MoralLayer)
      const ethicalCheck = this.moralLayer.analyzeContent(response.content);
      if (ethicalCheck.status === 'bloqué') {
        response.content = 'Cette réponse a été filtrée pour des raisons éthiques.';
        response.metadata.ethicalFilter = true;
        response.metadata.ethicalStatus = ethicalCheck.status;
      }
      
      // Étape 9: Auto-amélioration (apprendre de la réponse)
      // SelfImprovementEngine enregistre automatiquement via ses propres mécanismes
      // On peut émettre un événement pour déclencher l'analyse
      this.selfImprovement.emit('interaction_completed', {
        input: userInput,
        output: response.content,
        taskType,
        success: true,
        responseTime: Date.now() - startTime
      });
      
      return {
        ...response,
        metadata: {
          ...response.metadata,
          persona: persona.name,
          researchUsed: needsResearch,
          researchSources: researchData?.sources || [],
          consensusUsed: criticality.isCritical || taskType === 'critical',
          ethicalScore: ethicalCheck.score,
          ethicalStatus: ethicalCheck.status,
          selfImprovementRecorded: true
        }
      };
    } catch (error) {
      // Enregistrer l'erreur dans SelfImprovement
      this.selfImprovement.emit('interaction_completed', {
        input: userInput,
        output: null,
        taskType,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Détermine si recherche temps réel nécessaire
   * @private
   */
  _needsRealTimeResearch(taskType, input) {
    const researchRequiredTypes = ['strategie', 'recherche', 'analyse', 'finance'];
    const researchKeywords = ['actualité', 'récent', 'tendance', 'marché', 'concurrent'];
    
    return researchRequiredTypes.includes(taskType) || 
           researchKeywords.some(kw => input.toLowerCase().includes(kw));
  }

  /**
   * Détermine la priorité
   * @private
   */
  _determinePriority(criticality, taskType) {
    if (criticality.level === CriticalityLevel.CRITICAL) return 'CRITICAL';
    if (taskType === 'urgent') return 'HIGH';
    return 'NORMAL';
  }

  /**
   * Traite avec Consensus pour décisions critiques
   * @private
   */
  async _processWithConsensus(input, taskType, persona, researchData) {
    // Construire la proposition avec contexte enrichi
    const proposalPayload = {
      input,
      taskType,
      persona: persona.name,
      researchData,
      context: persona.buildContext(input, researchData),
      timestamp: Date.now()
    };
    
    // Créer un hash pour la proposition
    const decisionHash = crypto.createHash('sha256')
      .update(JSON.stringify(proposalPayload))
      .digest('hex');
    
    // Proposer la décision au ConsensusManager
    const proposalId = await this.consensusManager.propose(
      decisionHash,
      proposalPayload,
      DecisionType.CRITICAL
    );
    
    // Attendre le résultat du consensus
    const consensusResult = await this._waitForConsensusResult(proposalId);
    
    if (consensusResult.status === ConsensusStatus.APPROVED) {
      // Générer la réponse avec le persona
      const response = await persona.generate(input, {
        consensusVotes: consensusResult.votes,
        researchData,
        approved: true
      });
      
      return {
        content: response.content,
        metadata: {
          consensusUsed: true,
          consensusStatus: ConsensusStatus.APPROVED,
          votes: consensusResult.votes,
          reasoning: consensusResult.reasoning || 'Consensus approved',
          ...response.metadata
        }
      };
    } else {
      throw new Error(`Consensus rejected: ${consensusResult.reason || 'Unknown reason'}`);
    }
  }

  /**
   * Attend le résultat d'un consensus
   * @private
   */
  async _waitForConsensusResult(proposalId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.consensusManager.removeListener('consensusReached', handleConsensus);
        this.consensusManager.removeListener('consensusTimeout', handleTimeout);
        reject(new Error('Consensus timeout'));
      }, 5000); // 5 secondes timeout

      const handleConsensus = (result) => {
        if (result.proposalId === proposalId) {
          clearTimeout(timeout);
          this.consensusManager.removeListener('consensusReached', handleConsensus);
          this.consensusManager.removeListener('consensusTimeout', handleTimeout);
          
          const proposal = this.consensusManager.getProposalStatus(proposalId);
          if (proposal && proposal.status) {
            resolve({
              status: proposal.status,
              votes: proposal.votes || {},
              reasoning: 'Consensus reached'
            });
          } else {
            reject(new Error('Consensus proposal not found'));
          }
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
      
      // Vérifier si le consensus est déjà terminé
      const status = this.consensusManager.getProposalStatus(proposalId);
      if (status && status.status && status.status !== ConsensusStatus.PENDING) {
        clearTimeout(timeout);
        this.consensusManager.removeListener('consensusReached', handleConsensus);
        this.consensusManager.removeListener('consensusTimeout', handleTimeout);
        resolve({
          status: status.status,
          votes: status.votes || {},
          reasoning: 'Consensus already completed'
        });
      }
    });
  }

  /**
   * Traite avec Router optimisé
   * @private
   */
  async _processWithRouter(input, taskType, persona, researchData) {
    // Construire le contexte enrichi
    const enrichedContext = persona.buildContext(input, researchData);
    
    // Appeler l'orchestrateur classique avec le contexte enrichi
    const orchestratorResponse = await handleUserInstruction(input, taskType);
    
    // Extraire le contenu
    const content = orchestratorResponse.data?.enhancedContent || 
                   orchestratorResponse.data?.choices?.[0]?.message?.content ||
                   orchestratorResponse.data?.content ||
                   'Réponse générée par PRISM';
    
    // Générer avec le persona pour formater
    const personaResponse = await persona.generate(content, { researchData });
    
    return {
      content: personaResponse.content,
      metadata: {
        consensusUsed: false,
        model: orchestratorResponse.metadata?.model,
        ...personaResponse.metadata
      }
    };
  }
}

