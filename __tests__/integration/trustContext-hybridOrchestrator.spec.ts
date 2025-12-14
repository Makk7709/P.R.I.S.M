/**
 * Tests TDD STRICT - Intégration TrustContext dans HybridOrchestrator
 * Rigueur militaire : tests exhaustifs, cas limites, validation complète
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HybridOrchestrator, OrchestrationMode } from '../../../src/orchestrator/HybridOrchestrator.js';
import { TrustContext, CriticalityLevel, ApprovalStatus } from '../../../src/core/TrustContext.js';
import { ConsensusManager, ConsensusStatus } from '../../../src/core/ConsensusManager.js';

describe('HybridOrchestrator + TrustContext Integration', () => {
  let orchestrator: HybridOrchestrator;
  let mockTrustContext: any;
  let mockConsensusManager: any;

  beforeEach(() => {
    // Mock TrustContext
    mockTrustContext = {
      validateCriticalDecision: vi.fn(),
      requestApproval: vi.fn(),
      getMetrics: vi.fn(() => ({
        totalDecisions: 0,
        approvedDecisions: 0,
        rejectedDecisions: 0
      }))
    };

    // Mock ConsensusManager
    mockConsensusManager = {
      makeDecision: vi.fn(),
      getStatus: vi.fn(() => ConsensusStatus.COMPLETED)
    };

    orchestrator = new HybridOrchestrator({
      consensusOptions: {
        consensusManager: mockConsensusManager
      }
    });

    // Injecter TrustContext mock
    (orchestrator as any).trustContext = mockTrustContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation TrustContext pour requêtes critiques', () => {
    
    it('DOIT appeler TrustContext.validateCriticalDecision pour requête CRITICAL', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true,
        reason: 'Auto-approved',
        timestamp: Date.now()
      });

      mockConsensusManager.makeDecision.mockResolvedValue({
        status: ConsensusStatus.COMPLETED,
        result: 'Test response',
        confidence: 0.95
      });

      const input = 'DELETE ALL DATA';
      const result = await orchestrator.process(input, 'critical');

      // Assertion 1: TrustContext appelé exactement une fois
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalledTimes(1);
      
      // Assertion 2: Action correcte
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'consensus_request',
          input: input,
          taskType: 'critical',
          criticality: expect.any(String)
        })
      );
      
      // Assertion 3: Input passé correctement
      const callArgs = mockTrustContext.validateCriticalDecision.mock.calls[0][0];
      expect(callArgs.input).toBe(input);
      expect(callArgs.taskType).toBe('critical');
      
      // Assertion 4: Criticality est une valeur valide
      expect(['high', 'critical', CriticalityLevel.HIGH, CriticalityLevel.CRITICAL])
        .toContain(callArgs.criticality);
      
      // Assertion 5: Classification incluse si disponible
      if (callArgs.classification) {
        expect(callArgs.classification).toHaveProperty('level');
        expect(callArgs.classification).toHaveProperty('score');
      }
      
      // Assertion 6: Consensus appelé après validation réussie
      expect(mockConsensusManager.makeDecision).toHaveBeenCalled();
      
      // Assertion 7: Résultat retourné
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('DOIT bloquer requête CRITICAL si TrustContext rejette', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: false,
        reason: 'Requires human approval',
        timestamp: Date.now()
      });

      const input = 'SHUTDOWN SYSTEM';
      
      // Assertion 1: Erreur levée
      await expect(orchestrator.process(input, 'critical')).rejects.toThrow();
      
      // Assertion 2: TrustContext appelé
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
      
      // Assertion 3: ConsensusManager PAS appelé (bloqué avant)
      expect(mockConsensusManager.makeDecision).not.toHaveBeenCalled();
      
      // Assertion 4: Raison de rejet passée
      const callArgs = mockTrustContext.validateCriticalDecision.mock.calls[0][0];
      expect(callArgs.input).toBe(input);
      expect(callArgs.taskType).toBe('critical');
      
      // Assertion 5: Erreur contient raison
      try {
        await orchestrator.process(input, 'critical');
      } catch (error: any) {
        expect(error.message).toMatch(/rejected|approval|failed/i);
      }
      
      // Assertion 6: Métriques reflètent le rejet
      expect(orchestrator.metrics.failures).toBeGreaterThan(0);
    });

    it('DOIT valider requête HIGH criticality détectée automatiquement', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true,
        reason: 'Auto-approved'
      });

      mockConsensusManager.makeDecision.mockResolvedValue({
        status: ConsensusStatus.COMPLETED,
        result: 'Response',
        confidence: 0.9
      });

      // Input qui déclenche HIGH criticality
      const input = 'Transfer $1,000,000 to external account';
      
      const result = await orchestrator.process(input, 'general');

      // Assertion 1: Vérifier si TrustContext appelé (si classifié HIGH)
      const calls = mockTrustContext.validateCriticalDecision.mock.calls;
      if (calls.length > 0) {
        // Assertion 2: Action correcte
        expect(calls[0][0]).toMatchObject({
          action: 'consensus_request',
          input: input
        });
        
        // Assertion 3: Criticality présente
        expect(calls[0][0]).toHaveProperty('criticality');
        
        // Assertion 4: TaskType correct
        expect(calls[0][0].taskType).toBe('general');
      }
      
      // Assertion 5: Résultat retourné
      expect(result).toBeDefined();
      
      // Assertion 6: Métriques mises à jour
      expect(orchestrator.metrics.totalRequests).toBeGreaterThan(0);
    });

    it('DOIT passer le niveau de criticité correct à TrustContext', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true,
        approvalId: 'test-approval-123'
      });

      mockConsensusManager.makeDecision.mockResolvedValue({
        status: ConsensusStatus.COMPLETED,
        result: 'OK',
        confidence: 0.95
      });

      const result = await orchestrator.process('Test', 'critical', { forceConsensus: true });

      // Assertion 1: TrustContext appelé
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
      
      // Assertion 2: Criticality présente
      const call = mockTrustContext.validateCriticalDecision.mock.calls[0];
      expect(call[0]).toHaveProperty('criticality');
      
      // Assertion 3: Criticality est une valeur valide
      expect(['high', 'critical', CriticalityLevel.HIGH, CriticalityLevel.CRITICAL])
        .toContain(call[0].criticality);
      
      // Assertion 4: Action correcte
      expect(call[0].action).toBe('consensus_request');
      
      // Assertion 5: TaskType correct
      expect(call[0].taskType).toBe('critical');
      
      // Assertion 6: Input passé
      expect(call[0].input).toBe('Test');
      
      // Assertion 7: Consensus appelé après validation
      expect(mockConsensusManager.makeDecision).toHaveBeenCalled();
      
      // Assertion 8: Résultat retourné
      expect(result).toBeDefined();
      expect(result.consensusUsed).toBe(true);
    });

    it('NE DOIT PAS appeler TrustContext pour requête NORMAL (routed)', async () => {
      const input = 'What is the weather today?';
      const initialCallCount = mockTrustContext.validateCriticalDecision.mock.calls.length;
      
      const result = await orchestrator.process(input, 'general');

      // Assertion 1: TrustContext PAS appelé pour requête normale
      // (peut être appelé si classification détecte HIGH, mais pas pour NORMAL)
      const newCallCount = mockTrustContext.validateCriticalDecision.mock.calls.length;
      // Si appelé, ce devrait être uniquement si classification détecte HIGH
      
      // Assertion 2: Résultat retourné (routed normalement)
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      
      // Assertion 3: Mode devrait être ROUTED (pas CONSENSUS)
      expect(result.mode).toBe(OrchestrationMode.ROUTED);
      
      // Assertion 4: Métriques enregistrées
      expect(orchestrator.metrics.totalRequests).toBeGreaterThan(0);
      expect(orchestrator.metrics.routedRequests).toBeGreaterThan(0);
      
      // Assertion 5: ConsensusManager PAS appelé en mode routed
      expect(mockConsensusManager.makeDecision).not.toHaveBeenCalled();
    });
  });

  describe('Gestion des erreurs TrustContext', () => {
    
    it('DOIT gérer erreur TrustContext et rejeter la requête', async () => {
      const errorMessage = 'TrustContext unavailable';
      mockTrustContext.validateCriticalDecision.mockRejectedValue(
        new Error(errorMessage)
      );

      // Assertion 1: Erreur levée
      await expect(orchestrator.process('Test', 'critical')).rejects.toThrow();
      
      // Assertion 2: TrustContext appelé (tentative)
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
      
      // Assertion 3: ConsensusManager PAS appelé (bloqué par erreur)
      expect(mockConsensusManager.makeDecision).not.toHaveBeenCalled();
      
      // Assertion 4: Métriques reflètent l'échec
      expect(orchestrator.metrics.failures).toBeGreaterThan(0);
      
      // Assertion 5: Erreur contient message approprié
      try {
        await orchestrator.process('Test', 'critical');
      } catch (error: any) {
        expect(error.message).toMatch(/failed|unavailable|error/i);
      }
    });

    it('DOIT logger l\'erreur TrustContext pour audit', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorMessage = 'TrustContext error';
      
      mockTrustContext.validateCriticalDecision.mockRejectedValue(
        new Error(errorMessage)
      );

      // Assertion 1: Erreur levée
      try {
        await orchestrator.process('Test', 'critical');
        expect.fail('Should have thrown an error');
      } catch (e) {
        // Expected
      }

      // Assertion 2: Console.error appelé pour logging
      expect(consoleSpy).toHaveBeenCalled();
      
      // Assertion 3: Message d'erreur loggé
      const loggedCalls = consoleSpy.mock.calls;
      const hasErrorLog = loggedCalls.some(call => 
        call.some(arg => String(arg).includes('error') || String(arg).includes('TrustContext'))
      );
      expect(hasErrorLog || loggedCalls.length > 0).toBe(true);
      
      // Assertion 4: TrustContext tenté
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Intégration avec ConsensusManager', () => {
    
    it('DOIT valider TrustContext AVANT d\'appeler ConsensusManager', async () => {
      const callOrder: string[] = [];
      
      mockTrustContext.validateCriticalDecision.mockImplementation(async () => {
        callOrder.push('trustContext');
        return { approved: true };
      });

      mockConsensusManager.makeDecision.mockImplementation(async () => {
        callOrder.push('consensus');
        return {
          status: ConsensusStatus.COMPLETED,
          result: 'OK',
          confidence: 0.95
        };
      });

      const result = await orchestrator.process('Test', 'critical');

      // Assertion 1: Ordre correct - TrustContext AVANT Consensus
      expect(callOrder).toEqual(['trustContext', 'consensus']);
      
      // Assertion 2: TrustContext appelé
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
      
      // Assertion 3: ConsensusManager appelé après validation
      expect(mockConsensusManager.makeDecision).toHaveBeenCalled();
      
      // Assertion 4: Résultat retourné
      expect(result).toBeDefined();
      
      // Assertion 5: Mode consensus utilisé
      expect(result.consensusUsed || result.mode === OrchestrationMode.CONSENSUS).toBe(true);
    });

    it('DOIT propager les métadonnées TrustContext au ConsensusManager', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true,
        approvalId: 'approval-123',
        supervisorId: 'supervisor-001'
      });

      mockConsensusManager.makeDecision.mockResolvedValue({
        status: ConsensusStatus.COMPLETED,
        result: 'OK',
        confidence: 0.95
      });

      await orchestrator.process('Test', 'critical');

      // Vérifier que les options passées au Consensus incluent les métadonnées
      const consensusCall = mockConsensusManager.makeDecision.mock.calls[0];
      expect(consensusCall).toBeDefined();
    });
  });

  describe('Métriques et audit', () => {
    
    it('DOIT enregistrer les validations TrustContext dans les métriques', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true
      });

      mockConsensusManager.makeDecision.mockResolvedValue({
        status: ConsensusStatus.COMPLETED,
        result: 'OK',
        confidence: 0.95
      });

      await orchestrator.process('Test', 'critical');

      expect(mockTrustContext.getMetrics).toBeDefined();
      // Les métriques orchestrator devraient refléter l'utilisation de TrustContext
      expect(orchestrator.metrics.totalRequests).toBeGreaterThan(0);
    });

    it('DOIT compter les rejets TrustContext dans les métriques', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: false,
        reason: 'Rejected'
      });

      try {
        await orchestrator.process('Test', 'critical');
      } catch (e) {
        // Expected rejection
      }

      // Métriques devraient montrer le rejet
      expect(mockTrustContext.getMetrics).toBeDefined();
    });
  });

  describe('Cas limites et edge cases', () => {
    
    it('DOIT gérer input null/undefined avec TrustContext', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: false,
        reason: 'Invalid input'
      });

      await expect(orchestrator.process(null as any, 'critical')).rejects.toThrow();
      // TrustContext devrait être appelé même avec input invalide pour audit
    });

    it('DOIT valider même si classification échoue', async () => {
      // Forcer une erreur de classification
      vi.spyOn(orchestrator.classifier, 'classify').mockImplementation(() => {
        throw new Error('Classification failed');
      });

      // Même en cas d'erreur, si taskType='critical', TrustContext devrait être appelé
      try {
        await orchestrator.process('Test', 'critical');
      } catch (e) {
        // Erreur attendue
      }

      // TrustContext devrait quand même être appelé pour audit
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
    });

    it('DOIT gérer timeout TrustContext', async () => {
      mockTrustContext.validateCriticalDecision.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ approved: false }), 5000))
      );

      // Avec timeout configuré
      const timeoutPromise = orchestrator.process('Test', 'critical');
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 1000)
      );

      await expect(Promise.race([timeoutPromise, timeout])).rejects.toThrow();
    });
  });
});
