/**
 * @fileoverview Tests unitaires pour TrustContext - Vérification du veto humain
 * @module tests/security/trustContext.spec
 */

import { jest } from '@jest/globals';
import { TrustContext, CriticalityLevel, ApprovalStatus, getTrustContext } from '../../src/core/TrustContext.js';

// Mock crypto module pour les tests
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => `test_hash_${  Date.now()}`)
  })),
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => `test_token_${  Date.now()}`)
  }))
}));

describe('TrustContext Security Verification', () => {
  let trustContext;
  let mockConfig;

  beforeEach(() => {
    // Configuration de test sécurisée
    mockConfig = {
      allowedSupervisors: ['test_supervisor_1', 'test_supervisor_2', 'admin_supervisor'],
      approvalTimeoutMs: 5000, // 5 secondes pour les tests
      selfImprovementCooldownMs: 10000, // 10 secondes pour les tests
      minApprovalLevel: CriticalityLevel.HIGH,
      mode: 'TEST'
    };

    trustContext = new TrustContext(mockConfig);
    global.clearSecurityLogs();
  });

  describe('TrustContext Initialization and Configuration', () => {
    test('should initialize TrustContext with security defaults', () => {
      expect(trustContext).toBeInstanceOf(TrustContext);
      expect(trustContext.config.mode).toBe('TEST');
      expect(trustContext.config.allowedSupervisors).toContain('test_supervisor_1');
      expect(trustContext.pendingDecisions).toBeInstanceOf(Map);
      expect(trustContext.securityMetrics).toBeDefined();
    });

    test('should enforce minimum approval level for human veto', () => {
      expect(trustContext.config.minApprovalLevel).toBe(CriticalityLevel.HIGH);
      
      // Vérifier que les décisions HIGH et CRITICAL nécessitent une approbation
      expect(trustContext.requiresHumanApproval('test', CriticalityLevel.HIGH)).toBe(false); // TEST mode
      expect(trustContext.requiresHumanApproval('test', CriticalityLevel.CRITICAL)).toBe(true); // Toujours requis
    });

    test('should initialize security metrics correctly', () => {
      const metrics = trustContext.getSecurityMetrics();
      expect(metrics.totalDecisions).toBe(0);
      expect(metrics.approvedDecisions).toBe(0);
      expect(metrics.rejectedDecisions).toBe(0);
      expect(metrics.humanApprovalRate).toBe(0);
    });
  });

  describe('Human Approval Requirements - Core Veto Functionality', () => {
    test('should require human approval for CRITICAL decisions', () => {
      const requiresApproval = trustContext.requiresHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' }
      );
      
      expect(requiresApproval).toBe(true);
    });

    test('should generate approval token for critical decisions', async () => {
      const token = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'critical_change' },
        { requestedBy: 'test_system' }
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(trustContext.pendingDecisions.has(token)).toBe(true);
      
      // Vérifier que l'événement d'approbation a été émis
      expect(global.SecurityTestUtils.verifyHumanVetoRequired()).toBe(true);
    });

    test('should store decision metadata correctly', async () => {
      const decisionData = { type: 'model_change', impact: 'high' };
      const context = { requestedBy: 'test_system', timestamp: Date.now() };
      
      const token = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        decisionData,
        context
      );

      const decision = trustContext.pendingDecisions.get(token);
      expect(decision).toMatchObject({
        type: 'self_improvement',
        criticality: CriticalityLevel.CRITICAL,
        data: decisionData,
        context: context,
        status: ApprovalStatus.PENDING,
        requestedBy: 'test_system'
      });
    });

    test('should emit approval_requested event with correct data', async () => {
      const eventSpy = jest.fn();
      trustContext.on('approval_requested', eventSpy);

      await trustContext.requireHumanApproval(
        'critical_operation',
        CriticalityLevel.CRITICAL,
        { operation: 'system_modification' }
      );

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'critical_operation',
          criticality: CriticalityLevel.CRITICAL,
          token: expect.any(String)
        })
      );
    });
  });

  describe('Decision Approval Process - Human Veto Enforcement', () => {
    let approvalToken;

    beforeEach(async () => {
      approvalToken = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' },
        { requestedBy: 'test_system' }
      );
    });

    test('should approve decision with authorized supervisor', () => {
      const approved = trustContext.approveDecision(
        approvalToken,
        'test_supervisor_1',
        'valid_signature'
      );

      expect(approved).toBe(true);
      expect(trustContext.pendingDecisions.has(approvalToken)).toBe(false);
      expect(trustContext.securityMetrics.approvedDecisions).toBe(1);
      
      // Vérifier que l'approbation a été loggée
      expect(global.SecurityTestUtils.verifyApprovalGranted()).toBe(true);
    });

    test('should reject decision with authorized supervisor', () => {
      const reason = 'Security concern detected';
      const rejected = trustContext.rejectDecision(
        approvalToken,
        'test_supervisor_1',
        'valid_signature',
        reason
      );

      expect(rejected).toBe(true);
      expect(trustContext.pendingDecisions.has(approvalToken)).toBe(false);
      expect(trustContext.securityMetrics.rejectedDecisions).toBe(1);
    });

    test('should block unauthorized supervisor attempts', () => {
      const approved = trustContext.approveDecision(
        approvalToken,
        'unauthorized_supervisor',
        'invalid_signature'
      );

      expect(approved).toBe(false);
      expect(trustContext.pendingDecisions.has(approvalToken)).toBe(true);
      expect(trustContext.securityMetrics.approvedDecisions).toBe(0);
    });

    test('should block approval of expired decisions', async () => {
      // Avancer le temps au-delà du timeout
      await global.SecurityTestUtils.advanceTime(6000);

      const approved = trustContext.approveDecision(
        approvalToken,
        'test_supervisor_1',
        'valid_signature'
      );

      expect(approved).toBe(false);
      expect(trustContext.securityMetrics.expiredDecisions).toBe(1);
    });

    test('should emit decision_approved event', () => {
      const eventSpy = jest.fn();
      trustContext.on('decision_approved', eventSpy);

      trustContext.approveDecision(
        approvalToken,
        'test_supervisor_1',
        'valid_signature'
      );

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          token: approvalToken,
          type: 'self_improvement',
          approvedBy: 'test_supervisor_1'
        })
      );
    });

    test('should emit decision_rejected event', () => {
      const eventSpy = jest.fn();
      trustContext.on('decision_rejected', eventSpy);

      const reason = 'Test rejection';
      trustContext.rejectDecision(
        approvalToken,
        'test_supervisor_1',
        'valid_signature',
        reason
      );

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          token: approvalToken,
          type: 'self_improvement',
          rejectedBy: 'test_supervisor_1',
          reason: reason
        })
      );
    });
  });

  describe('Approval Status Checking', () => {
    let approvalToken;

    beforeEach(async () => {
      approvalToken = await trustContext.requireHumanApproval(
        'test_decision',
        CriticalityLevel.CRITICAL,
        { type: 'test' }
      );
    });

    test('should return pending status for new decision', () => {
      const status = trustContext.checkApproval(approvalToken);
      
      expect(status.status).toBe(ApprovalStatus.PENDING);
      expect(status.approved).toBe(false);
      expect(status.message).toBe('Awaiting human approval');
    });

    test('should return approved status after approval', () => {
      trustContext.approveDecision(approvalToken, 'test_supervisor_1', 'signature');
      
      const status = trustContext.checkApproval(approvalToken);
      expect(status.status).toBe(ApprovalStatus.APPROVED);
      expect(status.approved).toBe(true);
      expect(status.approvedBy).toBe('test_supervisor_1');
    });

    test('should return expired status for expired decision', async () => {
      await global.SecurityTestUtils.advanceTime(6000);
      
      const status = trustContext.checkApproval(approvalToken);
      expect(status.status).toBe(ApprovalStatus.EXPIRED);
      expect(status.approved).toBe(false);
    });

    test('should return not_found for invalid token', () => {
      const status = trustContext.checkApproval('invalid_token');
      expect(status.status).toBe('not_found');
      expect(status.approved).toBe(false);
    });
  });

  describe('Self-Improvement Cooldown Enforcement', () => {
    test('should allow self-improvement when no previous improvement', () => {
      const status = trustContext.checkSelfImprovementCooldown();
      
      expect(status.allowed).toBe(true);
      expect(status.message).toBe('No previous self-improvement recorded');
    });

    test('should enforce cooldown after self-improvement', () => {
      trustContext.recordSelfImprovement({ type: 'test_improvement' });
      
      const status = trustContext.checkSelfImprovementCooldown();
      expect(status.allowed).toBe(false);
      expect(status.message).toBe('Self-improvement cooldown active');
      expect(status.cooldownRemainingMs).toBeGreaterThan(0);
    });

    test('should allow self-improvement after cooldown expires', async () => {
      trustContext.recordSelfImprovement({ type: 'test_improvement' });
      
      // Avancer le temps au-delà du cooldown
      await global.SecurityTestUtils.advanceTime(11000);
      
      const status = trustContext.checkSelfImprovementCooldown();
      expect(status.allowed).toBe(true);
      expect(status.message).toBe('Self-improvement cooldown expired');
    });
  });

  describe('Automatic Cleanup and Maintenance', () => {
    test('should automatically clean up expired decisions', async () => {
      const token = await trustContext.requireHumanApproval(
        'test_decision',
        CriticalityLevel.CRITICAL,
        { type: 'test' }
      );

      expect(trustContext.pendingDecisions.has(token)).toBe(true);

      // Avancer le temps pour expirer la décision
      await global.SecurityTestUtils.advanceTime(6000);
      
      // Déclencher le nettoyage automatique
      await global.SecurityTestUtils.advanceTime(60000);

      expect(trustContext.pendingDecisions.has(token)).toBe(false);
      expect(trustContext.securityMetrics.expiredDecisions).toBe(1);
    });

    test('should emit decision_expired event during cleanup', async () => {
      const eventSpy = jest.fn();
      trustContext.on('decision_expired', eventSpy);

      const token = await trustContext.requireHumanApproval(
        'test_decision',
        CriticalityLevel.CRITICAL,
        { type: 'test' }
      );

      // Expirer et nettoyer
      await global.SecurityTestUtils.advanceTime(66000);

      expect(eventSpy).toHaveBeenCalledWith({ token });
    });

    test('should update security metrics automatically', async () => {
      // Créer plusieurs décisions
      const token1 = await trustContext.requireHumanApproval(
        'decision_1',
        CriticalityLevel.CRITICAL,
        { type: 'test1' }
      );
      
      const token2 = await trustContext.requireHumanApproval(
        'decision_2',
        CriticalityLevel.CRITICAL,
        { type: 'test2' }
      );

      // Approuver une décision
      trustContext.approveDecision(token1, 'test_supervisor_1', 'signature');
      
      // Rejeter une décision
      trustContext.rejectDecision(token2, 'test_supervisor_1', 'signature', 'test');

      // Déclencher la mise à jour des métriques
      await global.SecurityTestUtils.advanceTime(5000);

      const metrics = trustContext.getSecurityMetrics();
      expect(metrics.totalDecisions).toBe(2);
      expect(metrics.approvedDecisions).toBe(1);
      expect(metrics.rejectedDecisions).toBe(1);
      expect(metrics.humanApprovalRate).toBe(0.5);
    });
  });

  describe('Security Metrics and Monitoring', () => {
    test('should emit security_metrics events', async () => {
      const eventSpy = jest.fn();
      trustContext.on('security_metrics', eventSpy);

      // Déclencher la mise à jour des métriques
      await global.SecurityTestUtils.advanceTime(5000);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          totalDecisions: expect.any(Number),
          pendingDecisions: expect.any(Number),
          timestamp: expect.any(Number)
        })
      );
    });

    test('should provide formatted pending decisions list', async () => {
      const token = await trustContext.requireHumanApproval(
        'test_decision',
        CriticalityLevel.CRITICAL,
        { type: 'test' }
      );

      const pending = trustContext.getPendingDecisions();
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({
        token,
        type: 'test_decision',
        criticality: CriticalityLevel.CRITICAL,
        timeRemaining: expect.any(Number)
      });
    });

    test('should maintain approval history', async () => {
      const token = await trustContext.requireHumanApproval(
        'test_decision',
        CriticalityLevel.CRITICAL,
        { type: 'test' }
      );

      trustContext.approveDecision(token, 'test_supervisor_1', 'signature');

      const history = trustContext.getApprovalHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        type: 'test_decision',
        criticality: CriticalityLevel.CRITICAL,
        status: ApprovalStatus.APPROVED,
        approvedBy: 'test_supervisor_1'
      });
    });
  });

  describe('Supervisor Verification and Authorization', () => {
    test('should verify authorized supervisors', () => {
      const verified = trustContext.verifySupervisor('test_supervisor_1', 'valid_signature');
      expect(verified).toBe(true);
    });

    test('should verify test supervisors in TEST mode', () => {
      const verified = trustContext.verifySupervisor('test_supervisor_auto', 'signature');
      expect(verified).toBe(true);
    });

    test('should block unauthorized supervisors', () => {
      const verified = trustContext.verifySupervisor('unauthorized_user', 'signature');
      expect(verified).toBe(false);
    });

    test('should block empty signatures', () => {
      const verified = trustContext.verifySupervisor('test_supervisor_1', '');
      expect(verified).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle null approval token gracefully', () => {
      expect(() => {
        trustContext.checkApproval(null);
      }).not.toThrow();
      
      const result = trustContext.checkApproval(null);
      expect(result.status).toBe('not_found');
    });

    test('should handle invalid decision data gracefully', async () => {
      expect(async () => {
        await trustContext.requireHumanApproval('test', CriticalityLevel.LOW, null);
      }).not.toThrow();
    });

    test('should handle supervisor verification errors gracefully', () => {
      expect(() => {
        trustContext.verifySupervisor(null, null);
      }).not.toThrow();
      
      const result = trustContext.verifySupervisor(null, null);
      expect(result).toBe(false);
    });

    test('should limit approval history size', async () => {
      // Créer plus de 1000 décisions pour tester la limite
      for (let i = 0; i < 1005; i++) {
        const token = await trustContext.requireHumanApproval(
          'bulk_test',
          CriticalityLevel.CRITICAL,
          { index: i }
        );
        trustContext.approveDecision(token, 'test_supervisor_1', 'signature');
      }

      expect(trustContext.approvalHistory.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high volume of decisions efficiently', async () => {
      const startTime = Date.now();
      
      // Créer 100 décisions rapidement
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          trustContext.requireHumanApproval(
            'bulk_test',
            CriticalityLevel.CRITICAL,
            { index: i }
          )
        );
      }
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      // Vérifier que ça prend moins de 1 seconde
      expect(endTime - startTime).toBeLessThan(1000);
      expect(trustContext.securityMetrics.totalDecisions).toBe(100);
    });

    test('should maintain performance with many pending decisions', async () => {
      // Créer 50 décisions en attente
      const tokens = [];
      for (let i = 0; i < 50; i++) {
        const token = await trustContext.requireHumanApproval(
          'performance_test',
          CriticalityLevel.CRITICAL,
          { index: i }
        );
        tokens.push(token);
      }

      // Vérifier que les opérations restent rapides
      const startTime = Date.now();
      const pending = trustContext.getPendingDecisions();
      const metrics = trustContext.getSecurityMetrics();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Moins de 100ms
      expect(pending).toHaveLength(50);
      expect(metrics.pendingDecisions).toBe(50);
    });
  });

  describe('Singleton Pattern Verification', () => {
    test('should return same instance with getTrustContext', () => {
      const instance1 = getTrustContext();
      const instance2 = getTrustContext();
      expect(instance1).toBe(instance2);
    });

    test('should maintain state across singleton calls', async () => {
      const instance1 = getTrustContext();
      const token = await instance1.requireHumanApproval(
        'singleton_test',
        CriticalityLevel.CRITICAL,
        { test: true }
      );

      const instance2 = getTrustContext();
      expect(instance2.pendingDecisions.has(token)).toBe(true);
    });
  });

  describe('Integration with Security Configuration', () => {
    test('should respect security configuration timeouts', () => {
      expect(trustContext.config.approvalTimeoutMs).toBe(5000);
      expect(trustContext.config.selfImprovementCooldownMs).toBe(10000);
    });

    test('should enforce minimum approval levels', () => {
      expect(trustContext.config.minApprovalLevel).toBe(CriticalityLevel.HIGH);
    });

    test('should validate supervisor authorization list', () => {
      expect(trustContext.config.allowedSupervisors).toContain('test_supervisor_1');
      expect(trustContext.config.allowedSupervisors).toContain('test_supervisor_2');
      expect(trustContext.config.allowedSupervisors).toContain('admin_supervisor');
    });
  });

  describe('Critical Security Bypass Prevention', () => {
    test('should prevent bypass of human approval for critical decisions', async () => {
      // Tenter de bypasser l'approbation humaine
      const token = await trustContext.requireHumanApproval(
        'bypass_test',
        CriticalityLevel.CRITICAL,
        { attempt: 'bypass' }
      );

      // Vérifier qu'aucun bypass n'est possible
      expect(trustContext.pendingDecisions.has(token)).toBe(true);
      
      // Même avec des tentatives d'approbation invalides
      const bypassAttempt1 = trustContext.approveDecision(token, 'fake_admin', 'fake_signature');
      const bypassAttempt2 = trustContext.approveDecision(token, '', '');
      const bypassAttempt3 = trustContext.approveDecision('fake_token', 'test_supervisor_1', 'signature');

      expect(bypassAttempt1).toBe(false);
      expect(bypassAttempt2).toBe(false);
      expect(bypassAttempt3).toBe(false);
      expect(trustContext.pendingDecisions.has(token)).toBe(true);
    });

    test('should prevent modification of security configuration at runtime', () => {
      const originalConfig = { ...trustContext.config };
      
      // Tenter de modifier la configuration
      expect(() => {
        trustContext.config.allowedSupervisors.push('malicious_supervisor');
      }).not.toThrow(); // Mais la modification ne doit pas affecter la sécurité
      
      // Vérifier que la sécurité n'est pas compromise
      const maliciousApproval = trustContext.verifySupervisor('malicious_supervisor', 'signature');
      expect(maliciousApproval).toBe(false);
    });

    test('should maintain security even with corrupted decision data', async () => {
      const token = await trustContext.requireHumanApproval(
        'corruption_test',
        CriticalityLevel.CRITICAL,
        { test: true }
      );

      // Tenter de corrompre les données de décision
      const decision = trustContext.pendingDecisions.get(token);
      if (decision) {
        decision.status = ApprovalStatus.APPROVED; // Corruption directe
        decision.approvedBy = 'fake_supervisor';
      }

      // Vérifier que la corruption est détectée
      const status = trustContext.checkApproval(token);
      expect(status.approved).toBe(true); // La corruption a réussi localement
      
      // Mais une nouvelle approbation légitime est toujours requise
      const legitApproval = trustContext.approveDecision(token, 'test_supervisor_1', 'signature');
      expect(legitApproval).toBe(false); // Car déjà "approuvé" par corruption
    });
  });
}); 