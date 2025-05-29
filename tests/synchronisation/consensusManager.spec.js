/**
 * Tests pour ConsensusManager
 * Couvre les vote paths, timeouts et scénarios de consensus
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import ConsensusManager, { DecisionType, ConsensusStatus, AIProvider } from '../../src/core/ConsensusManager.js';

// Mock crypto pour les tests
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hash-456')
  }))
}));

// Mock TrustContext
jest.mock('../../src/core/TrustContext.js', () => ({
  getTrustContext: jest.fn(() => ({
    recordConsensusRejection: jest.fn(),
    requireHumanApproval: jest.fn()
  }))
}));

describe('ConsensusManager', () => {
  let consensusManager;
  let mockTrustContext;

  beforeEach(async () => {
    // Réinitialiser les mocks
    jest.clearAllMocks();
    
    consensusManager = new ConsensusManager({
      timeoutMs: 100, // Timeout court pour les tests
      maxConcurrentProposals: 5
    });
    
    // Attendre l'initialisation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    mockTrustContext = consensusManager.trustContext;
  });

  afterEach(() => {
    if (consensusManager) {
      consensusManager.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(consensusManager.isInitialized).toBe(true);
      expect(consensusManager.config.timeoutMs).toBe(100);
      expect(consensusManager.proposals.size).toBe(0);
    });

    it('should initialize metrics', () => {
      const metrics = consensusManager.getMetrics();
      expect(metrics.totalProposals).toBe(0);
      expect(metrics.approvedProposals).toBe(0);
      expect(metrics.rejectedProposals).toBe(0);
      expect(metrics.consensusSuccessRate).toBe(0);
    });
  });

  describe('Proposal Creation', () => {
    it('should create a proposal successfully', async () => {
      const proposalId = await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );

      expect(proposalId).toBe('test-uuid-123');
      expect(consensusManager.proposals.size).toBe(1);
      
      const metrics = consensusManager.getMetrics();
      expect(metrics.totalProposals).toBe(1);
    });

    it('should reject proposal when max concurrent limit reached', async () => {
      // Créer le maximum de propositions
      for (let i = 0; i < 5; i++) {
        await consensusManager.propose(`hash-${i}`, {}, DecisionType.CRITICAL);
      }

      // La 6ème proposition devrait être rejetée
      await expect(consensusManager.propose('hash-6', {}, DecisionType.CRITICAL))
        .rejects.toThrow('Maximum concurrent proposals reached');
    });

    it('should emit proposalCreated event', async () => {
      const eventSpy = jest.fn();
      consensusManager.on('proposalCreated', eventSpy);

      await consensusManager.propose('test-hash', { test: true }, DecisionType.SECURITY);

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        proposalId: 'test-uuid-123',
        decisionHash: 'test-hash',
        payload: { test: true },
        type: DecisionType.SECURITY
      }));
    });
  });

  describe('Voting Process', () => {
    let proposalId;

    beforeEach(async () => {
      proposalId = await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );
    });

    it('should accept votes from AI providers', () => {
      const result = consensusManager.submitVote(
        proposalId,
        AIProvider.GPT4,
        true,
        'Approved for innovation'
      );

      expect(result).toBe(true);
      
      const status = consensusManager.getProposalStatus(proposalId);
      expect(status.votes[AIProvider.GPT4]).toEqual({
        vote: true,
        reasoning: 'Approved for innovation',
        timestamp: expect.any(Number)
      });
    });

    it('should emit voteSubmitted event', () => {
      const eventSpy = jest.fn();
      consensusManager.on('voteSubmitted', eventSpy);

      consensusManager.submitVote(proposalId, AIProvider.CLAUDE3, false, 'Security concerns');

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        proposalId,
        provider: AIProvider.CLAUDE3,
        vote: false,
        reasoning: 'Security concerns'
      }));
    });

    it('should reject votes for non-existent proposals', () => {
      const result = consensusManager.submitVote(
        'non-existent',
        AIProvider.GPT4,
        true,
        'Test'
      );

      expect(result).toBe(false);
    });

    it('should reject votes for finalized proposals', async () => {
      // Finaliser la proposition avec des votes
      consensusManager.submitVote(proposalId, AIProvider.GPT4, true, 'Approve');
      consensusManager.submitVote(proposalId, AIProvider.CLAUDE3, true, 'Approve');
      
      // Attendre la finalisation
      await new Promise(resolve => setTimeout(resolve, 10));

      // Essayer de voter après finalisation
      const result = consensusManager.submitVote(
        proposalId,
        AIProvider.PERPLEXITY,
        false,
        'Too late'
      );

      expect(result).toBe(false);
    });
  });

  describe('Consensus Logic', () => {
    let proposalId;

    beforeEach(async () => {
      proposalId = await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );
    });

    it('should approve with 2/3 majority (2 out of 3)', async () => {
      const eventSpy = jest.fn();
      consensusManager.on('consensusReached', eventSpy);

      // 2 votes pour, 0 contre = majorité 2/3
      consensusManager.submitVote(proposalId, AIProvider.GPT4, true, 'Approve');
      consensusManager.submitVote(proposalId, AIProvider.CLAUDE3, true, 'Approve');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        proposalId,
        status: ConsensusStatus.APPROVED
      }));
    });

    it('should reject with 2/3 majority against (2 out of 3)', async () => {
      const eventSpy = jest.fn();
      consensusManager.on('consensusReached', eventSpy);

      // 0 votes pour, 2 contre = majorité 2/3 contre
      consensusManager.submitVote(proposalId, AIProvider.GPT4, false, 'Reject');
      consensusManager.submitVote(proposalId, AIProvider.CLAUDE3, false, 'Reject');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        proposalId,
        status: ConsensusStatus.REJECTED
      }));
    });

    it('should reject when all vote but no 2/3 majority', async () => {
      const eventSpy = jest.fn();
      consensusManager.on('consensusReached', eventSpy);

      // 1 pour, 2 contre = pas de majorité 2/3 pour
      consensusManager.submitVote(proposalId, AIProvider.GPT4, true, 'Approve');
      consensusManager.submitVote(proposalId, AIProvider.CLAUDE3, false, 'Reject');
      consensusManager.submitVote(proposalId, AIProvider.PERPLEXITY, false, 'Reject');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        proposalId,
        status: ConsensusStatus.REJECTED
      }));
    });

    it('should update metrics on consensus', async () => {
      consensusManager.submitVote(proposalId, AIProvider.GPT4, true, 'Approve');
      consensusManager.submitVote(proposalId, AIProvider.CLAUDE3, true, 'Approve');

      await new Promise(resolve => setTimeout(resolve, 10));

      const metrics = consensusManager.getMetrics();
      expect(metrics.approvedProposals).toBe(1);
      expect(metrics.consensusSuccessRate).toBe(1);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout proposals after configured time', async () => {
      const timeoutSpy = jest.fn();
      consensusManager.on('consensusTimeout', timeoutSpy);

      const proposalId = await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );

      // Attendre le timeout (100ms + marge)
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(timeoutSpy).toHaveBeenCalledWith(expect.objectContaining({
        proposalId,
        proposal: expect.objectContaining({
          decisionHash: 'test-hash',
          type: DecisionType.CRITICAL
        })
      }));

      const metrics = consensusManager.getMetrics();
      expect(metrics.timeoutProposals).toBe(1);
    });

    it('should trigger TrustContext on timeout', async () => {
      const proposalId = await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );

      // Attendre le timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockTrustContext.requireHumanApproval).toHaveBeenCalledWith(
        expect.stringContaining('Consensus timeout'),
        'HIGH',
        expect.any(Object),
        expect.objectContaining({
          reason: 'Consensus timeout - human intervention required'
        })
      );
    });

    it('should not timeout if consensus reached before timeout', async () => {
      const timeoutSpy = jest.fn();
      consensusManager.on('consensusTimeout', timeoutSpy);

      const proposalId = await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );

      // Atteindre le consensus avant le timeout
      consensusManager.submitVote(proposalId, AIProvider.GPT4, true, 'Approve');
      consensusManager.submitVote(proposalId, AIProvider.CLAUDE3, true, 'Approve');

      // Attendre plus que le timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(timeoutSpy).not.toHaveBeenCalled();
    });
  });

  describe('AI Vote Simulation', () => {
    it('should simulate GPT-4 votes based on risk level', async () => {
      // Test avec faible risque - GPT-4 devrait approuver
      const lowRiskVote = await consensusManager.simulateAIVote(
        AIProvider.GPT4,
        {
          type: DecisionType.CRITICAL,
          payload: { riskLevel: 0.3, ethicalConcerns: false }
        }
      );

      expect(lowRiskVote.decision).toBe(true);
      expect(lowRiskVote.reasoning).toContain('Innovation beneficial');

      // Test avec haut risque de sécurité - GPT-4 devrait rejeter
      const highRiskVote = await consensusManager.simulateAIVote(
        AIProvider.GPT4,
        {
          type: DecisionType.SECURITY,
          payload: { riskLevel: 0.8, ethicalConcerns: false }
        }
      );

      expect(highRiskVote.decision).toBe(false);
      expect(highRiskVote.reasoning).toContain('Security risk too high');
    });

    it('should simulate Claude-3 votes based on ethical concerns', async () => {
      // Test sans préoccupations éthiques - Claude-3 devrait approuver
      const ethicalVote = await consensusManager.simulateAIVote(
        AIProvider.CLAUDE3,
        {
          type: DecisionType.CRITICAL,
          payload: { riskLevel: 0.3, ethicalConcerns: false }
        }
      );

      expect(ethicalVote.decision).toBe(true);
      expect(ethicalVote.reasoning).toContain('Ethically sound');

      // Test avec préoccupations éthiques - Claude-3 devrait rejeter
      const unethicalVote = await consensusManager.simulateAIVote(
        AIProvider.CLAUDE3,
        {
          type: DecisionType.CRITICAL,
          payload: { riskLevel: 0.3, ethicalConcerns: true }
        }
      );

      expect(unethicalVote.decision).toBe(false);
      expect(unethicalVote.reasoning).toContain('Ethical concerns');
    });

    it('should simulate Perplexity votes based on evidence quality', async () => {
      // Test avec bonne qualité d'évidence - Perplexity devrait approuver
      const goodEvidenceVote = await consensusManager.simulateAIVote(
        AIProvider.PERPLEXITY,
        {
          type: DecisionType.CRITICAL,
          payload: { riskLevel: 0.3, evidenceQuality: 0.8 }
        }
      );

      expect(goodEvidenceVote.decision).toBe(true);
      expect(goodEvidenceVote.reasoning).toContain('Evidence supports');

      // Test avec mauvaise qualité d'évidence - Perplexity devrait rejeter
      const poorEvidenceVote = await consensusManager.simulateAIVote(
        AIProvider.PERPLEXITY,
        {
          type: DecisionType.CRITICAL,
          payload: { riskLevel: 0.3, evidenceQuality: 0.3 }
        }
      );

      expect(poorEvidenceVote.decision).toBe(false);
      expect(poorEvidenceVote.reasoning).toContain('Insufficient evidence');
    });
  });

  describe('Proposal Status', () => {
    let proposalId;

    beforeEach(async () => {
      proposalId = await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );
    });

    it('should return proposal status', () => {
      const status = consensusManager.getProposalStatus(proposalId);
      
      expect(status).toEqual({
        id: proposalId,
        status: ConsensusStatus.PENDING,
        votes: {},
        voteCount: { approvals: 0, rejections: 0, total: 0 },
        timeRemaining: expect.any(Number)
      });
    });

    it('should return null for non-existent proposal', () => {
      const status = consensusManager.getProposalStatus('non-existent');
      expect(status).toBeNull();
    });

    it('should update vote count as votes are submitted', () => {
      consensusManager.submitVote(proposalId, AIProvider.GPT4, true, 'Approve');
      consensusManager.submitVote(proposalId, AIProvider.CLAUDE3, false, 'Reject');

      const status = consensusManager.getProposalStatus(proposalId);
      expect(status.voteCount).toEqual({
        approvals: 1,
        rejections: 1,
        total: 2
      });
    });
  });

  describe('Metrics', () => {
    it('should track proposal metrics', async () => {
      const initialMetrics = consensusManager.getMetrics();
      expect(initialMetrics.totalProposals).toBe(0);

      // Créer et approuver une proposition
      const proposalId = await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );

      consensusManager.submitVote(proposalId, AIProvider.GPT4, true, 'Approve');
      consensusManager.submitVote(proposalId, AIProvider.CLAUDE3, true, 'Approve');

      await new Promise(resolve => setTimeout(resolve, 10));

      const finalMetrics = consensusManager.getMetrics();
      expect(finalMetrics.totalProposals).toBe(1);
      expect(finalMetrics.approvedProposals).toBe(1);
      expect(finalMetrics.consensusSuccessRate).toBe(1);
      expect(finalMetrics.averageDecisionTime).toBeGreaterThan(0);
    });

    it('should calculate consensus success rate correctly', async () => {
      // Créer plusieurs propositions avec différents résultats
      const proposal1 = await consensusManager.propose('hash1', {}, DecisionType.CRITICAL);
      const proposal2 = await consensusManager.propose('hash2', {}, DecisionType.CRITICAL);

      // Approuver la première
      consensusManager.submitVote(proposal1, AIProvider.GPT4, true, 'Approve');
      consensusManager.submitVote(proposal1, AIProvider.CLAUDE3, true, 'Approve');

      // Rejeter la seconde
      consensusManager.submitVote(proposal2, AIProvider.GPT4, false, 'Reject');
      consensusManager.submitVote(proposal2, AIProvider.CLAUDE3, false, 'Reject');

      await new Promise(resolve => setTimeout(resolve, 10));

      const metrics = consensusManager.getMetrics();
      expect(metrics.totalProposals).toBe(2);
      expect(metrics.approvedProposals).toBe(1);
      expect(metrics.rejectedProposals).toBe(1);
      expect(metrics.consensusSuccessRate).toBe(1); // 2 décisions sur 2 propositions
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      const proposalId = await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );

      expect(consensusManager.proposals.size).toBe(1);

      consensusManager.cleanup();

      expect(consensusManager.proposals.size).toBe(0);
    });

    it('should clear timeouts on cleanup', async () => {
      const timeoutSpy = jest.fn();
      consensusManager.on('consensusTimeout', timeoutSpy);

      await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );

      consensusManager.cleanup();

      // Attendre plus que le timeout original
      await new Promise(resolve => setTimeout(resolve, 150));

      // Le timeout ne devrait pas se déclencher après cleanup
      expect(timeoutSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', () => {
      // Créer un ConsensusManager avec une config invalide
      const invalidManager = new ConsensusManager({
        timeoutMs: -1 // Valeur invalide
      });

      expect(invalidManager.isInitialized).toBe(true); // Devrait quand même s'initialiser
    });

    it('should handle TrustContext errors gracefully', async () => {
      // Simuler une erreur TrustContext
      if (mockTrustContext) {
        mockTrustContext.requireHumanApproval.mockRejectedValue(new Error('TrustContext error'));
      }

      const proposalId = await consensusManager.propose(
        'test-hash',
        { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false },
        DecisionType.CRITICAL
      );

      // Attendre le timeout pour déclencher TrustContext
      await new Promise(resolve => setTimeout(resolve, 150));

      // Le système devrait continuer à fonctionner malgré l'erreur TrustContext
      expect(consensusManager.getMetrics().timeoutProposals).toBe(1);
    });
  });
}); 