/**
 * Tests d'intégration Frontend ↔ Backend - TaskTypeProcessor
 * Processus TDD strict - Pas de simplification
 * Couverture minimum 95%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
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
        'analyse': createMockPersona('Data Analyst'),
        'technique': createMockPersona('Technical Expert'),
        'ethique': createMockPersona('Ethics Counselor'),
        'creative': createMockPersona('Creative Director'),
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
        { title: 'Source 1', url: 'http://example.com/1', date: '2024-12-01' },
        { title: 'Source 2', url: 'http://example.com/2', date: '2024-12-02' }
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

vi.mock('../../backend/voicePersonalityEnhancer.js', () => ({
  VoicePersonalityEnhancer: vi.fn().mockImplementation(() => ({
    enhanceForVoice: vi.fn().mockReturnValue({
      enhancedText: 'Enhanced response',
      voiceConfig: { voice_id: 'test-voice' },
      voiceMetadata: { mode: 'FRIENDLY', emotion: 'neutral' }
    })
  }))
}));

describe('Intégration Frontend ↔ Backend - TaskTypeProcessor', () => {
  let app: express.Application;
  let taskTypeProcessor: TaskTypeProcessor;

  beforeEach(async () => {
    // Créer une app Express minimale pour les tests
    app = express();
    app.use(express.json());
    
    taskTypeProcessor = new TaskTypeProcessor();
    
    // Simuler la route /api/chat
    app.post('/api/chat', async (req, res) => {
      try {
        const { message, taskType = 'general' } = req.body;
        
        if (!message) {
          return res.status(400).json({ success: false, error: 'Message required' });
        }

        const processorResponse = await taskTypeProcessor.process(message, taskType, {
          context: req.body.context
        });

        const orchestratorResponse = {
          data: { content: processorResponse.content },
          metadata: {
            model: processorResponse.metadata?.model || 'auto',
            orchestrationMode: processorResponse.metadata?.consensusUsed ? 'consensus' : 'routed',
            consensusUsed: processorResponse.metadata?.consensusUsed || false,
            persona: processorResponse.metadata?.persona,
            researchUsed: processorResponse.metadata?.researchUsed || false,
            researchSources: processorResponse.metadata?.researchSources || [],
            ethicalScore: processorResponse.metadata?.ethicalScore,
            ...processorResponse.metadata
          }
        };

        // Simuler VoicePersonalityEnhancer
        const enhancedResponse = {
          enhancedText: processorResponse.content,
          voiceConfig: { voice_id: 'test-voice' },
          voiceMetadata: { mode: 'FRIENDLY', emotion: 'neutral' }
        };

        res.json({
          success: true,
          content: enhancedResponse.enhancedText,
          model: orchestratorResponse.metadata.model,
          metadata: {
            voiceMode: enhancedResponse.voiceMetadata.mode,
            emotion: enhancedResponse.voiceMetadata.emotion,
            orchestration: {
              mode: orchestratorResponse.metadata.orchestrationMode,
              consensusUsed: orchestratorResponse.metadata.consensusUsed,
              persona: orchestratorResponse.metadata.persona,
              researchUsed: orchestratorResponse.metadata.researchUsed,
              researchSources: orchestratorResponse.metadata.researchSources,
              consensusStatus: orchestratorResponse.metadata.consensusStatus,
              ethicalScore: orchestratorResponse.metadata.ethicalScore,
              ethicalStatus: orchestratorResponse.metadata.ethicalStatus
            }
          }
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  });

  describe('Connexion Frontend → Backend', () => {
    it('DOIT recevoir taskType depuis le frontend', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message',
          taskType: 'strategie'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.metadata.orchestration.persona).toBe('Strategic Advisor');
    });

    it('DOIT utiliser taskType par défaut "general" si non fourni', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.metadata.orchestration.persona).toBe('General');
    });

    it('DOIT rejeter si message manquant', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          taskType: 'strategie'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Retour Métadonnées Backend → Frontend', () => {
    it('DOIT retourner persona dans métadonnées orchestration', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Stratégie expansion',
          taskType: 'strategie'
        });

      expect(response.body.metadata.orchestration.persona).toBe('Strategic Advisor');
    });

    it('DOIT retourner researchUsed true pour strategie', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Stratégie expansion UAE',
          taskType: 'strategie'
        });

      expect(response.body.metadata.orchestration.researchUsed).toBe(true);
      expect(response.body.metadata.orchestration.researchSources).toBeDefined();
      expect(response.body.metadata.orchestration.researchSources.length).toBeGreaterThan(0);
    });

    it('DOIT retourner researchUsed false pour general', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Bonjour',
          taskType: 'general'
        });

      expect(response.body.metadata.orchestration.researchUsed).toBe(false);
    });

    it('DOIT retourner consensusUsed false pour requête normale', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test normal',
          taskType: 'general'
        });

      expect(response.body.metadata.orchestration.consensusUsed).toBe(false);
    });

    it('DOIT retourner ethicalScore dans métadonnées', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message',
          taskType: 'general'
        });

      expect(response.body.metadata.orchestration.ethicalScore).toBeDefined();
      expect(typeof response.body.metadata.orchestration.ethicalScore).toBe('number');
    });

    it('DOIT retourner ethicalStatus dans métadonnées', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message',
          taskType: 'general'
        });

      expect(response.body.metadata.orchestration.ethicalStatus).toBeDefined();
    });
  });

  describe('Mapping Task Type → Persona', () => {
    it('DOIT mapper strategie → Strategic Advisor', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Stratégie',
          taskType: 'strategie'
        });

      expect(response.body.metadata.orchestration.persona).toBe('Strategic Advisor');
    });

    it('DOIT mapper finance → Financial Advisor', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Analyse financière',
          taskType: 'finance'
        });

      expect(response.body.metadata.orchestration.persona).toBe('Financial Advisor');
    });

    it('DOIT mapper marketing → Marketing Strategist', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Campagne marketing',
          taskType: 'marketing'
        });

      expect(response.body.metadata.orchestration.persona).toBe('Marketing Strategist');
    });

    it('DOIT mapper recherche → Research Analyst', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Recherche actualités',
          taskType: 'recherche'
        });

      expect(response.body.metadata.orchestration.persona).toBe('Research Analyst');
    });

    it('DOIT mapper analyse → Data Analyst', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Analyse données',
          taskType: 'analyse'
        });

      expect(response.body.metadata.orchestration.persona).toBe('Data Analyst');
    });

    it('DOIT mapper technique → Technical Expert', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Question technique',
          taskType: 'technique'
        });

      expect(response.body.metadata.orchestration.persona).toBe('Technical Expert');
    });

    it('DOIT mapper ethique → Ethics Counselor', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Question éthique',
          taskType: 'ethique'
        });

      expect(response.body.metadata.orchestration.persona).toBe('Ethics Counselor');
    });

    it('DOIT mapper creative → Creative Director', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Idée créative',
          taskType: 'creative'
        });

      expect(response.body.metadata.orchestration.persona).toBe('Creative Director');
    });
  });

  describe('Recherche Temps Réel', () => {
    it('DOIT activer recherche pour strategie', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Stratégie expansion',
          taskType: 'strategie'
        });

      expect(response.body.metadata.orchestration.researchUsed).toBe(true);
      expect(response.body.metadata.orchestration.researchSources.length).toBeGreaterThan(0);
    });

    it('DOIT activer recherche pour recherche', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Actualités IA',
          taskType: 'recherche'
        });

      expect(response.body.metadata.orchestration.researchUsed).toBe(true);
    });

    it('DOIT activer recherche pour analyse', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Analyse marché',
          taskType: 'analyse'
        });

      expect(response.body.metadata.orchestration.researchUsed).toBe(true);
    });

    it('DOIT activer recherche pour finance', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Marché financier',
          taskType: 'finance'
        });

      expect(response.body.metadata.orchestration.researchUsed).toBe(true);
    });

    it('NE DOIT PAS activer recherche pour general', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Bonjour',
          taskType: 'general'
        });

      expect(response.body.metadata.orchestration.researchUsed).toBe(false);
    });

    it('DOIT retourner sources de recherche dans métadonnées', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Stratégie expansion',
          taskType: 'strategie'
        });

      expect(response.body.metadata.orchestration.researchSources).toBeDefined();
      expect(Array.isArray(response.body.metadata.orchestration.researchSources)).toBe(true);
      expect(response.body.metadata.orchestration.researchSources.length).toBe(2);
      expect(response.body.metadata.orchestration.researchSources[0]).toHaveProperty('title');
      expect(response.body.metadata.orchestration.researchSources[0]).toHaveProperty('url');
      expect(response.body.metadata.orchestration.researchSources[0]).toHaveProperty('date');
    });
  });

  describe('Structure Réponse Complète', () => {
    it('DOIT retourner structure JSON complète et valide', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test complet',
          taskType: 'strategie'
        });

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('model');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('orchestration');
      expect(response.body.metadata.orchestration).toHaveProperty('persona');
      expect(response.body.metadata.orchestration).toHaveProperty('researchUsed');
      expect(response.body.metadata.orchestration).toHaveProperty('consensusUsed');
      expect(response.body.metadata.orchestration).toHaveProperty('researchSources');
      expect(response.body.metadata.orchestration).toHaveProperty('ethicalScore');
    });

    it('DOIT retourner content comme string', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test',
          taskType: 'general'
        });

      expect(typeof response.body.content).toBe('string');
      expect(response.body.content.length).toBeGreaterThan(0);
    });

    it('DOIT retourner model dans réponse', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test',
          taskType: 'general'
        });

      expect(response.body.model).toBeDefined();
      expect(typeof response.body.model).toBe('string');
    });
  });

  describe('Gestion Erreurs', () => {
    it('DOIT gérer erreurs TaskTypeProcessor gracieusement', async () => {
      // Forcer une erreur dans TaskTypeProcessor
      const mockProcessor = vi.fn().mockRejectedValue(new Error('Processor error'));
      taskTypeProcessor.process = mockProcessor;

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test error',
          taskType: 'general'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Tous les Task Types', () => {
    const taskTypes = [
      'general',
      'finance',
      'recherche',
      'strategie',
      'marketing',
      'analyse',
      'technique',
      'ethique',
      'creative'
    ];

    taskTypes.forEach(taskType => {
      it(`DOIT traiter taskType "${taskType}" correctement`, async () => {
        const response = await request(app)
          .post('/api/chat')
          .send({
            message: `Test ${taskType}`,
            taskType
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.metadata.orchestration.persona).toBeDefined();
        expect(response.body.content).toBeDefined();
      });
    });
  });
});

