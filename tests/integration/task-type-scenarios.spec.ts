/**
 * Tests d'intégration - Scénarios réels pour TaskTypeProcessor
 * Processus TDD strict - Pas de simplification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskTypeProcessor } from '../../src/core/TaskTypeProcessor.js';

// Mocks complets
vi.mock('../../src/orchestrator/CriticalityClassifier.js', () => ({
  CriticalityClassifier: vi.fn().mockImplementation(() => ({
    classify: vi.fn().mockReturnValue({
      isCritical: false,
      level: 'low',
      score: 0.2
    })
  }))
}));

vi.mock('../../src/core/ConsensusManager.js', () => ({
  ConsensusManager: vi.fn().mockImplementation(() => ({
    propose: vi.fn().mockResolvedValue('proposal-id'),
    getProposalStatus: vi.fn().mockReturnValue({
      status: 'APPROVED',
      votes: {}
    }),
    on: vi.fn(),
    removeListener: vi.fn()
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
    requestApproval: vi.fn().mockResolvedValue({ approved: true })
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

const createMockPersona = (name) => ({
  name,
  buildContext: vi.fn().mockReturnValue('context'),
  generate: vi.fn().mockResolvedValue({
    content: `Réponse ${name}`,
    metadata: { persona: name, format: 'strategic' }
  })
});

vi.mock('../../src/core/PersonaActivator.js', () => ({
  PersonaActivator: vi.fn().mockImplementation(() => ({
    activate: vi.fn((taskType) => {
      const personas = {
        'strategie': createMockPersona('Strategic Advisor'),
        'finance': createMockPersona('Financial Advisor'),
        'marketing': createMockPersona('Marketing Strategist'),
        'recherche': createMockPersona('Research Analyst'),
        'general': createMockPersona('General')
      };
      return personas[taskType] || personas['general'];
    })
  }))
}));

vi.mock('../../src/core/RealTimeResearchEngine.js', () => ({
  RealTimeResearchEngine: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      summary: 'Données de recherche temps réel',
      sources: [
        { title: 'Source 1', url: 'http://example.com/1', date: '2024-12-01' }
      ],
      timestamp: new Date().toISOString()
    })
  }))
}));

vi.mock('../../evolution/selfImprovementEngine.js', () => ({
  SelfImprovementEngine: vi.fn().mockImplementation(() => ({
    emit: vi.fn(),
    on: vi.fn()
  }))
}));

vi.mock('../../infrastructure/moralLayer.js', () => ({
  MoralLayer: vi.fn().mockImplementation(() => ({
    analyzeContent: vi.fn().mockReturnValue({
      status: 'accepté',
      score: 0.9,
      category: 'general'
    })
  }))
}));

vi.mock('../../backend/orchestrator.js', () => ({
  handleUserInstruction: vi.fn().mockResolvedValue({
    data: {
      enhancedContent: 'Réponse orchestrateur',
      content: 'Réponse orchestrateur'
    },
    metadata: {
      model: 'openai',
      taskType: 'general'
    }
  }),
  callPerplexity: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: 'Réponse Perplexity'
      }
    }]
  })
}));

describe('Scénarios d\'Intégration - TaskTypeProcessor', () => {
  let processor: TaskTypeProcessor;

  beforeEach(() => {
    processor = new TaskTypeProcessor();
  });

  describe('Scénario 1: Stratégie avec Recherche Temps Réel', () => {
    it('DOIT utiliser recherche temps réel pour stratégie d\'expansion', async () => {
      const result = await processor.process(
        'Stratégie d\'expansion en UAE',
        'strategie'
      );

      expect(result.metadata.researchUsed).toBe(true);
      expect(result.metadata.persona).toBe('Strategic Advisor');
      expect(result.metadata.researchSources).toBeDefined();
      expect(result.metadata.researchSources.length).toBeGreaterThan(0);
    });
  });

  describe('Scénario 2: Finance avec Format Structuré', () => {
    it('DOIT activer Financial Advisor pour analyse financière', async () => {
      const result = await processor.process(
        'Analyse financière du budget Q4',
        'finance'
      );

      expect(result.metadata.persona).toBe('Financial Advisor');
      expect(result.content).toBeDefined();
    });
  });

  describe('Scénario 3: Marketing avec Persona Créatif', () => {
    it('DOIT activer Marketing Strategist pour campagne marketing', async () => {
      const result = await processor.process(
        'Créer une campagne marketing pour PRISM',
        'marketing'
      );

      expect(result.metadata.persona).toBe('Marketing Strategist');
    });
  });

  describe('Scénario 4: Décision Critique avec Consensus', () => {
    it('DOIT utiliser consensus pour décision critique', async () => {
      const mockClassifier = (processor as any).classifier;
      mockClassifier.classify.mockReturnValueOnce({
        isCritical: true,
        level: 'critical',
        score: 0.9
      });

      const mockConsensus = (processor as any).consensusManager;
      mockConsensus.propose.mockResolvedValue('proposal-critical');
      mockConsensus.getProposalStatus.mockReturnValue({
        status: 'APPROVED',
        votes: {
          'gpt-4': { vote: 'approve', reasoning: 'safe' },
          'claude-3': { vote: 'approve', reasoning: 'safe' }
        }
      });

      mockConsensus.on.mockImplementation((event, handler) => {
        if (event === 'consensusReached') {
          setTimeout(() => handler({ proposalId: 'proposal-critical' }), 10);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = await processor.process(
        'Investissement critique de 1M€',
        'finance'
      );

      expect(result.metadata.consensusUsed).toBe(true);
      expect(mockConsensus.propose).toHaveBeenCalled();
    });
  });

  describe('Scénario 5: Recherche avec Sources', () => {
    it('DOIT inclure sources dans métadonnées pour recherche', async () => {
      const result = await processor.process(
        'Actualités IA décembre 2024',
        'recherche'
      );

      expect(result.metadata.researchUsed).toBe(true);
      expect(result.metadata.researchSources).toBeDefined();
    });
  });

  describe('Scénario 6: Validation Éthique', () => {
    it('DOIT valider éthiquement toutes les réponses', async () => {
      const result = await processor.process(
        'Contenu normal',
        'general'
      );

      expect(result.metadata.ethicalScore).toBeDefined();
      expect(result.metadata.ethicalStatus).toBe('accepté');
    });

    it('DOIT bloquer contenu non éthique', async () => {
      const mockMoralLayer = (processor as any).moralLayer;
      mockMoralLayer.analyzeContent.mockReturnValueOnce({
        status: 'bloqué',
        score: 0.1,
        category: 'violence'
      });

      const result = await processor.process(
        'Contenu violent',
        'general'
      );

      expect(result.content).toBe('Cette réponse a été filtrée pour des raisons éthiques.');
      expect(result.metadata.ethicalFilter).toBe(true);
    });
  });

  describe('Scénario 7: Auto-Amélioration', () => {
    it('DOIT enregistrer chaque interaction', async () => {
      const mockSelfImprovement = (processor as any).selfImprovement;
      
      await processor.process('Test interaction', 'general');

      expect(mockSelfImprovement.emit).toHaveBeenCalledWith(
        'interaction_completed',
        expect.objectContaining({
          input: 'Test interaction',
          success: true
        })
      );
    });
  });

  describe('Scénario 8: Priorisation', () => {
    it('DOIT prioriser CRITICAL pour requêtes critiques', async () => {
      const mockClassifier = (processor as any).classifier;
      mockClassifier.classify.mockReturnValueOnce({
        isCritical: true,
        level: 'critical',
        score: 0.95
      });

      const priorityQueue = (processor as any).priorityQueue;
      
      await processor.process('Requête critique', 'general');

      expect(priorityQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'CRITICAL'
        })
      );
    });
  });

  describe('Scénario 9: Fallback Graceful', () => {
    it('DOIT gérer erreurs gracieusement', async () => {
      const mockPersona = (processor as any).personaActivator;
      mockPersona.activate.mockImplementationOnce(() => {
        throw new Error('Persona error');
      });

      await expect(
        processor.process('Test', 'general')
      ).rejects.toThrow();
    });
  });

  describe('Scénario 10: Métadonnées Complètes', () => {
    it('DOIT retourner métadonnées complètes', async () => {
      const result = await processor.process(
        'Stratégie complète',
        'strategie'
      );

      expect(result.metadata).toMatchObject({
        persona: expect.any(String),
        researchUsed: expect.any(Boolean),
        consensusUsed: expect.any(Boolean),
        ethicalScore: expect.any(Number),
        selfImprovementRecorded: true
      });
    });
  });
});

