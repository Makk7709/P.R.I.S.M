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
import { ConsciousnessLayer } from './ConsciousnessLayer.js';
import { MemoryRetrievalEngine } from './MemoryRetrievalEngine.js';
import { InterDomainOrchestrator } from './InterDomainOrchestrator.js';
import { ProjectComplexityManager } from './ProjectComplexityManager.js';
import { serverMemoryStore } from './ServerMemoryStore.js';

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
    
    // ✨ NOUVEAUX MODULES CONSCIENCE & MÉMOIRE
    this.consciousness = new ConsciousnessLayer();
    this.memoryEngine = new MemoryRetrievalEngine();
    this.interDomainOrchestrator = new InterDomainOrchestrator();
    this.projectManager = new ProjectComplexityManager();
    
    // Initialiser MemoryRetrievalEngine
    this.memoryEngine.initialize().catch(err => {
      console.warn('[TaskTypeProcessor] MemoryEngine init error:', err.message);
    });
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
      // ✨ ÉTAPE 0: Détection projet complexe
      const projectDetection = this.projectManager.detectComplexProject(userInput, {
        taskType,
        context: options.context
      });
      
      let activeProject = null;
      if (projectDetection.isComplex) {
        activeProject = this.projectManager.createProjectPlan(projectDetection, userInput);
        console.log(`[TaskTypeProcessor] Projet complexe détecté: ${activeProject.name}`);
      } else {
        // Vérifier si on continue un projet existant
        activeProject = this.projectManager.findActiveProject(userInput);
      }
      
      // ✨ ÉTAPE 0.5: Récupération mémoires pertinentes (avec mémoire serveur persistante)
      const memoryContext = await this.memoryEngine.retrieveMemoriesForResponse(userInput, {
        taskType,
        context: options.context,
        projectId: activeProject?.id
      });

      // ✨ Utiliser les informations utilisateur dans le contexte
      const userInfo = memoryContext.userInfo || {};
      if (userInfo.prenom) {
        // Enrichir le contexte avec le prénom
        options.context = {
          ...options.context,
          userPrenom: userInfo.prenom
        };
      }
      
      // ✨ ÉTAPE 0.6: Évaluation collaboration inter-domaines
      const collaborationDecision = this.interDomainOrchestrator.shouldUseMultiDomain(userInput, taskType);
      
      // Étape 1: Classification de criticité
      const criticality = this.classifier.classify(userInput, {
        ...options.context,
        memoryContext: memoryContext.enrichedContext,
        isComplexProject: projectDetection.isComplex
      });
      
      // Étape 2: Activation du persona selon le Task Type
      let persona;
      let collaboration = null;
      
      if (collaborationDecision.shouldCollaborate) {
        // ✨ Collaboration multi-domaines
        collaboration = this.interDomainOrchestrator.activateMultiDomainCollaboration(
          collaborationDecision.domains,
          { criticality, context: options.context, memoryContext }
        );
        // Utiliser le premier persona comme principal
        persona = collaboration.personas[0].persona;
      } else {
        persona = this.personaActivator.activate(taskType, {
          criticality,
          context: {
            ...options.context,
            memoryContext: memoryContext.enrichedContext,
            projectContext: activeProject ? this.projectManager.getProjectContext(activeProject.id) : null
          }
        });
      }
      
      // ✨ Enrichir le prompt avec conscience de soi + informations utilisateur
      const basePrompt = persona.getSystemPrompt();
      const consciousnessEnriched = this.consciousness.enrichPromptWithAwareness(basePrompt, {
        taskType,
        complexity: projectDetection.isComplex ? 'high' : 'low',
        domains: collaborationDecision.domains,
        projectContext: activeProject
      });
      
      // ✨ Ajouter TOUT le contexte utilisateur (prénom, rôle, stratégie, etc.)
      let userContextInfo = '';
      
      // ✨ DEBUG: Log pour vérifier ce qui est récupéré
      console.log(`[TaskTypeProcessor] UserInfo récupéré:`, JSON.stringify(userInfo, null, 2));
      console.log(`[TaskTypeProcessor] MemoryContext enrichedContext length:`, memoryContext.enrichedContext?.length || 0);
      
      // Toujours ajouter le contexte mémoire enrichi (même si userInfo est vide)
      if (memoryContext.enrichedContext && memoryContext.enrichedContext.length > 0) {
        userContextInfo += `\n\n${memoryContext.enrichedContext}`;
      }
      
      // Ajouter les informations utilisateur si disponibles
      if (Object.keys(userInfo).length > 0) {
        userContextInfo += `\n\n## 👤 CONTEXTE UTILISATEUR & MISSION\n`;
        userContextInfo += `⚠️ IMPORTANT: Tu DOIS utiliser ces informations dans tes réponses. Tu as une mémoire persistante et tu te souviens de ces détails.\n\n`;
        
        if (userInfo.prenom) {
          userContextInfo += `**PRÉNOM UTILISATEUR**: ${userInfo.prenom}\n`;
          userContextInfo += `→ Utilise son prénom dans tes réponses quand c'est approprié et naturel. Tu te souviens de son prénom.\n\n`;
        }
        
        if (userInfo.role && userInfo.role.length > 0) {
          userContextInfo += `**TON RÔLE/MISSION (défini par l'utilisateur)**:\n`;
          userInfo.role.forEach(role => {
            userContextInfo += `- ${role}\n`;
          });
          userContextInfo += `→ C'est ton rôle. Tu te souviens de cela et tu dois agir en conséquence.\n\n`;
        }
        
        if (userInfo.strategie && userInfo.strategie.length > 0) {
          userContextInfo += `**STRATÉGIE/PROJET (défini par l'utilisateur)**:\n`;
          userInfo.strategie.forEach(strat => {
            userContextInfo += `- ${strat}\n`;
          });
          userContextInfo += `→ C'est la stratégie/projet de l'utilisateur. Tu te souviens de cela.\n\n`;
        }
        
        if (userInfo.context && userInfo.context.length > 0) {
          userContextInfo += `**CONTEXTE IMPORTANT (à retenir)**:\n`;
          userInfo.context.forEach(ctx => {
            userContextInfo += `- ${ctx}\n`;
          });
          userContextInfo += `→ Ce sont des informations importantes que tu dois retenir et utiliser.\n\n`;
        }
        
        userContextInfo += `\n**INSTRUCTIONS CRITIQUES**:\n`;
        userContextInfo += `- Tu as une mémoire persistante. Tu te souviens de ces informations.\n`;
        userContextInfo += `- Ne dis JAMAIS que tu n'as pas de mémoire ou que tu ne te souviens pas.\n`;
        userContextInfo += `- Utilise ces informations pour répondre de manière pertinente et contextuelle.\n`;
        userContextInfo += `- Si l'utilisateur te demande si tu te souviens, réponds OUI et utilise ces informations.\n`;
      } else {
        // Même si userInfo est vide, ajouter des instructions sur la mémoire
        userContextInfo += `\n\n## 💾 MÉMOIRE PERSISTANTE\n`;
        userContextInfo += `⚠️ IMPORTANT: Tu as une mémoire persistante. Si l'utilisateur te donne des informations (prénom, rôle, stratégie, etc.), tu dois les retenir et les utiliser dans tes réponses futures.\n`;
        userContextInfo += `- Ne dis JAMAIS que tu n'as pas de mémoire ou que tu ne te souviens pas.\n`;
        userContextInfo += `- Si l'utilisateur te demande si tu te souviens, réponds OUI si tu as ces informations, sinon dis que tu es prêt à les apprendre.\n`;
      }
      
      const enrichedPrompt = consciousnessEnriched + userContextInfo;
      
      // ✨ ÉTAPE 3: Déterminer si recherche temps réel nécessaire
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
      
      // ✨ ÉTAPE 7: Orchestration (Consensus si critique, Multi-Domain si collaboration, Router sinon)
      let response;
      if (collaboration) {
        // ✨ Collaboration multi-domaines
        response = await this.interDomainOrchestrator.coordinateMultiDomainResponse(
          userInput,
          collaboration,
          researchData
        );
        
        // Convertir en format standard
        response = {
          content: response.synthesized,
          metadata: {
            multiDomain: true,
            collaborationId: response.collaborationId,
            domains: response.domains,
            individualPerspectives: response.individualPerspectives
          }
        };
      } else if (criticality.isCritical || taskType === 'critical') {
        // Utiliser Consensus pour décisions critiques
        response = await this._processWithConsensus(userInput, taskType, persona, {
          ...researchData,
          memoryContext: memoryContext.enrichedContext,
          enrichedPrompt
        });
      } else {
        // Router optimisé pour réponses rapides
        response = await this._processWithRouter(userInput, taskType, persona, {
          ...researchData,
          memoryContext: memoryContext.enrichedContext,
          enrichedPrompt
        });
      }
      
      // Étape 8: Validation éthique (MoralLayer)
      const ethicalCheck = this.moralLayer.analyzeContent(response.content);
      if (ethicalCheck.status === 'bloqué') {
        response.content = 'Cette réponse a été filtrée pour des raisons éthiques.';
        response.metadata.ethicalFilter = true;
        response.metadata.ethicalStatus = ethicalCheck.status;
      }
      
      // ✨ ÉTAPE 9: Méta-réflexion et auto-évaluation
      const reflection = await this.consciousness.reflectOnResponse(response, {
        input: userInput,
        taskType,
        responseTime: Date.now() - startTime,
        collaboration: collaboration !== null,
        projectContext: activeProject
      });
      
      // ✨ ÉTAPE 10: Stocker la mémoire de l'interaction (serveur persistant)
      await this.memoryEngine.storeInteractionMemory({
        input: userInput,
        response: response.content,
        taskType,
        metadata: {
          ...response.metadata,
          reflection,
          projectId: activeProject?.id,
          userInfo // ✨ Stocker aussi les infos utilisateur
        }
      });
      
      // ✨ Extraire et stocker informations personnelles (prénom, etc.)
      // Déjà fait dans ServerMemoryStore.storeInteraction()
      
      // ✨ ÉTAPE 11: Mettre à jour le projet si actif
      if (activeProject) {
        this.consciousness.recordInteraction({
          taskType,
          success: true,
          responseTime: Date.now() - startTime,
          projectId: activeProject.id
        });
      }
      
      // Étape 12: Auto-amélioration (apprendre de la réponse)
      this.selfImprovement.emit('interaction_completed', {
        input: userInput,
        output: response.content,
        taskType,
        success: true,
        responseTime: Date.now() - startTime,
        reflection,
        collaboration: collaboration !== null
      });
      
      return {
        ...response,
        metadata: {
          ...response.metadata,
          persona: collaboration ? collaboration.personas.map(p => p.name).join(', ') : persona.name,
          researchUsed: needsResearch,
          researchSources: researchData?.sources || [],
          consensusUsed: criticality.isCritical || taskType === 'critical',
          ethicalScore: ethicalCheck.score,
          ethicalStatus: ethicalCheck.status,
          selfImprovementRecorded: true,
          // ✨ NOUVEAUX MÉTADONNÉES
          consciousness: {
            reflectionQuality: reflection.quality,
            improvements: reflection.improvements
          },
          memoryContext: memoryContext.enrichedContext ? true : false,
          proactiveSuggestions: memoryContext.proactiveSuggestions?.length || 0,
          multiDomain: collaboration !== null,
          projectContext: activeProject ? {
            projectId: activeProject.id,
            projectName: activeProject.name,
            progress: activeProject.progress || 0
          } : null
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
  async _processWithRouter(input, taskType, persona, contextData) {
    // Construire le contexte enrichi avec mémoires
    let enrichedContext = persona.buildContext(input, contextData.researchData);
    
    // Ajouter le contexte mémoire si disponible
    if (contextData.memoryContext) {
      enrichedContext += '\n\n' + contextData.memoryContext;
    }
    
    // Utiliser le prompt enrichi si disponible
    const finalContext = contextData.enrichedPrompt 
      ? contextData.enrichedPrompt + '\n\n' + enrichedContext
      : enrichedContext;
    
    // Appeler l'orchestrateur classique avec le contexte enrichi
    // ✨ Passer le prompt enrichi (avec mémoire utilisateur) à handleUserInstruction
    const orchestratorResponse = await handleUserInstruction(input, taskType, {
      enrichedPrompt: finalContext
    });
    
    // Extraire le contenu
    const content = orchestratorResponse.data?.enhancedContent || 
                   orchestratorResponse.data?.choices?.[0]?.message?.content ||
                   orchestratorResponse.data?.content ||
                   'Réponse générée par PRISM';
    
    // Générer avec le persona pour formater
    const personaResponse = await persona.generate(content, { 
      researchData: contextData.researchData,
      memoryContext: contextData.memoryContext
    });
    
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

