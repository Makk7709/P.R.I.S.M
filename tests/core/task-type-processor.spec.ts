/**
 * Tests TDD pour TaskTypeProcessor
 * Processus TDD strict - Pas de simplification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskTypeProcessor } from '../../src/core/TaskTypeProcessor.js';
import { CriticalityLevel } from '../../src/core/TrustContext.js';
import { ConsensusStatus, DecisionType } from '../../src/core/ConsensusManager.js';

// Mocks
vi.mock('../../src/orchestrator/CriticalityClassifier.js', () => ({
  CriticalityClassifier: vi.fn().mockImplementation(() => ({
    classify: vi.fn()
  }))
}));

vi.mock('../../src/core/ConsensusManager.js', () => ({
  ConsensusManager: vi.fn().mockImplementation(() => ({
    propose: vi.fn(),
    getProposalStatus: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    emit: vi.fn()
  })),
  ConsensusStatus: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    TIMEOUT: 'TIMEOUT'
  },
  DecisionType: {
    CRITICAL: 'critical'
  }
}));

vi.mock('../../src/core/TrustContext.js', () => ({
  TrustContext: vi.fn().mockImplementation(() => ({
    requestApproval: vi.fn()
  })),
  CriticalityLevel: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  }
}));

vi.mock('../../src/core/PriorityQueue.js', () => ({
  PriorityQueue: vi.fn().mockImplementation(() => ({
    enqueue: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock('../../src/core/PersonaActivator.js', () => ({
  PersonaActivator: vi.fn().mockImplementation(() => ({
    activate: vi.fn().mockImplementation((taskType) => ({
      name: taskType || 'General',
      buildContext: vi.fn().mockReturnValue('context'),
      getSystemPrompt: vi.fn().mockReturnValue('Tu es un assistant PRISM développé par KOREV AI.'),
      generate: vi.fn().mockResolvedValue({
        content: `Réponse pour ${taskType}`,
        metadata: { persona: taskType, format: 'text' }
      })
    }))
  }))
}));

vi.mock('../../src/core/JarvisPersonality.js', () => ({
  JarvisPersonality: vi.fn().mockImplementation(() => ({
    enrichBasePrompt: vi.fn().mockImplementation((prompt, options) => {
      return `[JARVIS] ${prompt} [USER: ${options?.userName || 'Unknown'}]`;
    }),
    generateSystemPrompt: vi.fn().mockReturnValue('Tu es JARVIS, assistant PRISM développé par KOREV AI.'),
    enrichResponse: vi.fn().mockImplementation((response) => response),
    generateGreeting: vi.fn().mockImplementation((name) => `Bonjour ${name}, à votre service.`),
    shouldMakeSuggestion: vi.fn().mockReturnValue(false),
    getFormattingInstructions: vi.fn().mockReturnValue('Format JARVIS')
  }))
}));

vi.mock('../../src/core/RealTimeResearchEngine.js', () => ({
  RealTimeResearchEngine: vi.fn().mockImplementation(() => ({
    search: vi.fn()
  }))
}));

vi.mock('../../src/core/ConsciousnessLayer.js', () => ({
  ConsciousnessLayer: vi.fn().mockImplementation(() => ({
    enrichPromptWithAwareness: vi.fn((prompt) => `[Consciousness] ${prompt}`),
    reflectOnResponse: vi.fn().mockResolvedValue({ quality: 0.9, improvements: [] }),
    recordInteraction: vi.fn()
  }))
}));

vi.mock('../../src/core/MemoryRetrievalEngine.js', () => ({
  MemoryRetrievalEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    retrieveRelevantMemories: vi.fn().mockResolvedValue({
      enrichedContext: '',
      proactiveSuggestions: [],
      userInfo: {}
    }),
    retrieveMemoriesForResponse: vi.fn().mockResolvedValue({
      enrichedContext: '',
      proactiveSuggestions: [],
      userInfo: {}
    }),
    storeInteractionMemory: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock('../../src/core/InterDomainOrchestrator.js', () => ({
  InterDomainOrchestrator: vi.fn().mockImplementation(() => ({
    needsCollaboration: vi.fn().mockReturnValue(false),
    shouldUseMultiDomain: vi.fn().mockReturnValue({ needed: false, domains: [] }),
    orchestrateCollaboration: vi.fn()
  }))
}));

vi.mock('../../src/core/ProjectComplexityManager.js', () => ({
  ProjectComplexityManager: vi.fn().mockImplementation(() => ({
    detectComplexProject: vi.fn().mockReturnValue({ isComplex: false }),
    detectProject: vi.fn().mockReturnValue({ isComplex: false }),
    findActiveProject: vi.fn().mockReturnValue(null),
    getActiveProjects: vi.fn().mockReturnValue([]),
    getProjectContext: vi.fn().mockReturnValue(null)
  }))
}));

vi.mock('../../src/core/ServerMemoryStore.js', () => ({
  ServerMemoryStore: vi.fn().mockImplementation(() => ({
    storeInteraction: vi.fn().mockReturnValue(true),
    getUserInfo: vi.fn().mockReturnValue({}),
    getRecentInteractions: vi.fn().mockReturnValue([])
  })),
  serverMemoryStore: {
    storeInteraction: vi.fn().mockReturnValue(true),
    getUserInfo: vi.fn().mockReturnValue({}),
    getRecentInteractions: vi.fn().mockReturnValue([])
  }
}));

vi.mock('../../evolution/selfImprovementEngine.js', () => ({
  SelfImprovementEngine: vi.fn().mockImplementation(() => ({
    emit: vi.fn(),
    on: vi.fn()
  }))
}));

vi.mock('../../infrastructure/moralLayer.js', () => ({
  MoralLayer: vi.fn().mockImplementation(() => ({
    analyzeContent: vi.fn().mockReturnValue({ status: 'accepté', score: 0.9, category: 'general' })
  }))
}));

vi.mock('../../backend/orchestrator.js', () => ({
  handleUserInstruction: vi.fn().mockResolvedValue({
    data: {
      enhancedContent: 'Mocked response content',
      content: 'Mocked response content'
    },
    metadata: {
      model: 'openai',
      taskType: 'general'
    }
  }),
  callPerplexity: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: 'Mocked Perplexity response'
      }
    }]
  })
}));

describe('TaskTypeProcessor', () => {
  let processor: TaskTypeProcessor;
  let mockClassifier: any;
  let mockConsensus: any;
  let mockTrust: any;
  let mockPersona: any;
  let mockResearch: any;
  let mockSelfImprovement: any;
  let mockMoralLayer: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create processor
    processor = new TaskTypeProcessor();

    // Get mock instances
    mockClassifier = (processor as any).classifier;
    mockConsensus = (processor as any).consensusManager;
    mockTrust = (processor as any).trustContext;
    mockPersona = (processor as any).personaActivator;
    mockResearch = (processor as any).researchEngine;
    mockSelfImprovement = (processor as any).selfImprovement;
    mockMoralLayer = (processor as any).moralLayer;
  });

  describe('Initialisation', () => {
    it('DOIT initialiser tous les composants PRISM', () => {
      expect(processor).toBeDefined();
      expect(mockClassifier).toBeDefined();
      expect(mockConsensus).toBeDefined();
      expect(mockTrust).toBeDefined();
      expect(mockPersona).toBeDefined();
      expect(mockResearch).toBeDefined();
      expect(mockSelfImprovement).toBeDefined();
      expect(mockMoralLayer).toBeDefined();
    });
  });

  describe('Classification de Criticité', () => {
    it('DOIT classifier la criticité de la requête', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW,
        score: 0.2
      });

      mockPersona.activate.mockReturnValue({
        name: 'General',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: {}
        })
      });

      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      await processor.process('test input', 'general');

      // Le classifier reçoit l'input et un contexte enrichi (pas undefined)
      expect(mockClassifier.classify).toHaveBeenCalledWith('test input', expect.any(Object));
    });

    it('DOIT détecter une requête critique', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: true,
        level: CriticalityLevel.CRITICAL,
        score: 0.9
      });

      mockPersona.activate.mockReturnValue({
        name: 'Strategic',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: {}
        })
      });

      mockTrust.requestApproval.mockResolvedValue({ approved: true });
      mockConsensus.propose.mockResolvedValue('proposal-id-critical-1');
      mockConsensus.getProposalStatus.mockReturnValue({
        status: ConsensusStatus.APPROVED,
        votes: {}
      });
      
      mockConsensus.on.mockImplementation((event, handler) => {
        if (event === 'consensusReached') {
          setTimeout(() => handler({ proposalId: 'proposal-id-critical-1' }), 10);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      await processor.process('supprimer tous les fichiers', 'general');

      expect(mockClassifier.classify).toHaveBeenCalled();
      expect(mockConsensus.propose).toHaveBeenCalled();
    });
  });

  describe('Activation de Persona', () => {
    it('DOIT activer le persona approprié selon le Task Type', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW
      });

      const mockPersonaInstance = {
        name: 'Strategic Advisor',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'strategic response',
          metadata: { persona: 'Strategic Advisor' }
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      await processor.process('stratégie expansion', 'strategie');

      expect(mockPersona.activate).toHaveBeenCalledWith('strategie', expect.any(Object));
      expect(mockPersonaInstance.generate).toHaveBeenCalled();
    });

    it('DOIT activer Financial Advisor pour taskType finance', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW
      });

      const mockPersonaInstance = {
        name: 'Financial Advisor',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'financial response',
          metadata: { persona: 'Financial Advisor' }
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      await processor.process('analyse financière', 'finance');

      expect(mockPersona.activate).toHaveBeenCalledWith('finance', expect.any(Object));
    });
  });

  describe('Recherche Temps Réel', () => {
    it('DOIT déclencher recherche temps réel pour strategie', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW
      });

      const mockPersonaInstance = {
        name: 'Strategic Advisor',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockResearch.search.mockResolvedValue({
        summary: 'research summary',
        sources: [
          { title: 'Source 1', url: 'http://example.com', date: '2024-12-01' }
        ],
        timestamp: new Date().toISOString()
      });
      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      await processor.process('stratégie expansion UAE', 'strategie');

      expect(mockResearch.search).toHaveBeenCalledWith('stratégie expansion UAE', 'strategie');
    });

    it('DOIT déclencher recherche pour recherche taskType', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW
      });

      const mockPersonaInstance = {
        name: 'Research Analyst',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockResearch.search.mockResolvedValue({
        summary: 'research data',
        sources: [],
        timestamp: new Date().toISOString()
      });
      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      await processor.process('recherche actualités IA', 'recherche');

      expect(mockResearch.search).toHaveBeenCalled();
    });

    it('NE DOIT PAS déclencher recherche pour general taskType', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW
      });

      const mockPersonaInstance = {
        name: 'General',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      await processor.process('bonjour', 'general');

      expect(mockResearch.search).not.toHaveBeenCalled();
    });

    it('DOIT passer les données de recherche au persona', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW
      });

      const researchData = {
        summary: 'Données fraîches sur le marché UAE',
        sources: [
          { title: 'Market Report 2024', url: 'http://example.com', date: '2024-12-01' }
        ],
        timestamp: new Date().toISOString()
      };

      mockResearch.search.mockResolvedValue(researchData);

      const mockPersonaInstance = {
        name: 'Strategic Advisor',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      await processor.process('stratégie expansion', 'strategie');

      // Le persona.generate reçoit le contenu de la réponse orchestrateur, pas l'input original
      expect(mockPersonaInstance.generate).toHaveBeenCalledWith(
        expect.any(String), // Contenu de la réponse orchestrateur
        expect.objectContaining({ researchData })
      );
    });
  });

  describe('Priorisation', () => {
    it('DOIT prioriser CRITICAL pour requêtes critiques', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: true,
        level: CriticalityLevel.CRITICAL,
        score: 0.95
      });

      const mockPersonaInstance = {
        name: 'General',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });
      mockConsensus.propose.mockResolvedValue('proposal-id-critical-2');
      mockConsensus.getProposalStatus.mockReturnValue({
        status: ConsensusStatus.APPROVED,
        votes: {}
      });
      
      mockConsensus.on.mockImplementation((event, handler) => {
        if (event === 'consensusReached') {
          setTimeout(() => handler({ proposalId: 'proposal-id-critical-2' }), 10);
        }
      });

      const priorityQueue = (processor as any).priorityQueue;
      
      await new Promise(resolve => setTimeout(resolve, 50));
      await processor.process('requête critique', 'general');

      expect(priorityQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'CRITICAL'
        })
      );
    });

    it('DOIT prioriser HIGH pour taskType urgent', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.MEDIUM
      });

      const mockPersonaInstance = {
        name: 'General',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      const priorityQueue = (processor as any).priorityQueue;
      
      await processor.process('requête urgente', 'urgent');

      expect(priorityQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'HIGH'
        })
      );
    });
  });

  describe('TrustContext & Sécurité', () => {
    it('DOIT demander approbation pour requêtes HIGH', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.HIGH,
        score: 0.7
      });

      const mockPersonaInstance = {
        name: 'General',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      await processor.process('requête importante', 'general');

      expect(mockTrust.requestApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          criticality: CriticalityLevel.HIGH
        })
      );
    });

    it('DOIT rejeter si TrustContext refuse', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.HIGH
      });

      mockPersona.activate.mockReturnValue({
        name: 'General',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn()
      });

      mockTrust.requestApproval.mockResolvedValue({ approved: false });

      await expect(
        processor.process('requête sensible', 'general')
      ).rejects.toThrow('Request rejected by security layer');
    });
  });

  describe('Consensus pour Décisions Critiques', () => {
    it('DOIT utiliser ConsensusManager pour requêtes critiques', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: true,
        level: CriticalityLevel.CRITICAL,
        score: 0.9
      });

      const mockPersonaInstance = {
        name: 'Strategic Advisor',
        buildContext: vi.fn().mockReturnValue('context'),
        generate: vi.fn().mockResolvedValue({
          content: 'consensus response',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });
      mockConsensus.propose.mockResolvedValue('proposal-id-123');
      mockConsensus.getProposalStatus.mockReturnValue({
        status: ConsensusStatus.APPROVED,
        votes: {
          'gpt-4': { vote: 'approve', reasoning: 'safe' },
          'claude-3': { vote: 'approve', reasoning: 'safe' }
        }
      });
      
      // Simuler l'événement consensusReached
      let consensusHandler: any;
      mockConsensus.on.mockImplementation((event, handler) => {
        if (event === 'consensusReached') {
          consensusHandler = handler;
          // Simuler l'événement immédiatement
          setTimeout(() => handler({ proposalId: 'proposal-id-123' }), 10);
        }
      });

      const result = await processor.process('décision critique', 'strategie');

      expect(mockConsensus.propose).toHaveBeenCalled();
      expect(result.metadata.consensusUsed).toBe(true);
      expect(result.metadata.consensusStatus).toBe(ConsensusStatus.APPROVED);
    });

    it('DOIT rejeter si consensus échoue', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: true,
        level: CriticalityLevel.CRITICAL
      });

      mockPersona.activate.mockReturnValue({
        name: 'General',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn()
      });

      mockTrust.requestApproval.mockResolvedValue({ approved: true });
      mockConsensus.propose.mockResolvedValue('proposal-id-456');
      mockConsensus.getProposalStatus.mockReturnValue({
        status: ConsensusStatus.REJECTED,
        votes: {}
      });
      
      // Simuler l'événement consensusReached avec REJECTED
      mockConsensus.on.mockImplementation((event, handler) => {
        if (event === 'consensusReached') {
          setTimeout(() => handler({ proposalId: 'proposal-id-456' }), 10);
        }
      });

      // Attendre un peu pour que l'événement soit traité
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await expect(
        processor.process('décision dangereuse', 'general')
      ).rejects.toThrow('Consensus rejected');
    });
  });

  describe('Validation Éthique (MoralLayer)', () => {
    it('DOIT valider éthiquement toutes les réponses', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW
      });

      const mockPersonaInstance = {
        name: 'General',
        buildContext: vi.fn().mockReturnValue('context'),
        generate: vi.fn().mockResolvedValue({
          content: 'response content',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });
      mockMoralLayer.analyzeContent.mockReturnValue({
        status: 'accepté',
        score: 0.9,
        category: 'general'
      });

      const result = await processor.process('test', 'general');

      expect(mockMoralLayer.analyzeContent).toHaveBeenCalledWith('response content');
      expect(result.metadata.ethicalScore).toBe(0.9);
    });

    it('DOIT bloquer contenu non éthique', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW
      });

      const mockPersonaInstance = {
        name: 'General',
        buildContext: vi.fn().mockReturnValue('context'),
        generate: vi.fn().mockResolvedValue({
          content: 'contenu non éthique',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });
      mockMoralLayer.analyzeContent.mockReturnValue({
        status: 'bloqué',
        score: 0.2,
        category: 'violence'
      });

      const result = await processor.process('test', 'general');

      expect(result.content).toBe('Cette réponse a été filtrée pour des raisons éthiques.');
      expect(result.metadata.ethicalFilter).toBe(true);
      expect(result.metadata.ethicalStatus).toBe('bloqué');
    });
  });

  describe('Auto-Amélioration', () => {
    it('DOIT enregistrer chaque interaction dans SelfImprovementEngine', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW
      });

      const mockPersonaInstance = {
        name: 'General',
        buildContext: vi.fn().mockReturnValue('context'),
        getSystemPrompt: vi.fn().mockReturnValue('Tu es PRISM de KOREV AI'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: {}
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      const startTime = Date.now();
      await processor.process('test input', 'general');
      const responseTime = Date.now() - startTime;

      expect(mockSelfImprovement.emit).toHaveBeenCalledWith(
        'interaction_completed',
        expect.objectContaining({
          input: 'test input',
          output: 'response',
          taskType: 'general',
          success: true,
          responseTime: expect.any(Number)
        })
      );
    });
  });

  describe('Métadonnées Complètes', () => {
    it('DOIT retourner métadonnées complètes avec recherche', async () => {
      mockClassifier.classify.mockReturnValue({
        isCritical: false,
        level: CriticalityLevel.LOW
      });

      const researchData = {
        summary: 'research summary',
        sources: [{ title: 'Source', url: 'http://example.com', date: '2024-12-01' }],
        timestamp: new Date().toISOString()
      };

      mockResearch.search.mockResolvedValue(researchData);

      const mockPersonaInstance = {
        name: 'Strategic Advisor',
        buildContext: vi.fn().mockReturnValue('context'),
        generate: vi.fn().mockResolvedValue({
          content: 'response',
          metadata: { persona: 'Strategic Advisor' }
        })
      };

      mockPersona.activate.mockReturnValue(mockPersonaInstance);
      mockTrust.requestApproval.mockResolvedValue({ approved: true });

      const result = await processor.process('stratégie', 'strategie');

      expect(result.metadata).toMatchObject({
        persona: 'Strategic Advisor',
        researchUsed: true,
        researchSources: researchData.sources,
        consensusUsed: false,
        ethicalScore: 0.9,
        selfImprovementRecorded: true
      });
    });
  });
});

