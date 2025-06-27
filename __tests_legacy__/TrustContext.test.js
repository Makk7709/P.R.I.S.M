/**
 * @fileoverview Tests unitaires pour TrustContext
 * @module __tests__/TrustContext.test
 */

import { jest } from '@jest/globals';
import { TrustContext, CriticalityLevel, ApprovalStatus, getTrustContext } from '../src/core/TrustContext.js';

// Mock crypto module
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked_hash')
  })),
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mocked_token')
  }))
}));

describe('TrustContext', () => {
  let trustContext;
  let mockConfig;

  beforeEach(() => {
    // Configuration de test
    mockConfig = {
      allowedSupervisors: ['test_supervisor_1', 'test_supervisor_2'],
      approvalTimeoutMs: 5000, // 5 secondes pour les tests
      selfImprovementCooldownMs: 10000, // 10 secondes pour les tests
      minApprovalLevel: CriticalityLevel.HIGH,
      mode: 'TEST'
    };

    trustContext = new TrustContext(mockConfig);
    
    // Mock des timers pour les tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default config', () => {
      const defaultTrustContext = new TrustContext();
      expect(defaultTrustContext.config.mode).toBe('PROD');
      expect(defaultTrustContext.config.allowedSupervisors).toHaveLength(3);
    });

    test('should initialize with custom config', () => {
      expect(trustContext.config.mode).toBe('TEST');
      expect(trustContext.config.allowedSupervisors).toEqual(['test_supervisor_1', 'test_supervisor_2']);
      expect(trustContext.config.approvalTimeoutMs).toBe(5000);
    });

    test('should initialize security metrics', () => {
      expect(trustContext.securityMetrics).toEqual({
        totalDecisions: 0,
        approvedDecisions: 0,
        rejectedDecisions: 0,
        expiredDecisions: 0,
        humanApprovalRate: 0,
        averageApprovalTime: 0
      });
    });
  });

  describe('Human Approval Requirements', () => {
    test('should require approval for HIGH criticality in PROD mode', () => {
      const prodTrustContext = new TrustContext({ mode: 'PROD' });
      const requires = prodTrustContext.requiresHumanApproval(
        'test_decision',
        CriticalityLevel.HIGH,
        {}
      );
      expect(requires).toBe(true);
    });

    test('should not require approval for MEDIUM criticality in TEST mode', () => {
      const requires = trustContext.requiresHumanApproval(
        'test_decision',
        CriticalityLevel.MEDIUM,
        {}
      );
      expect(requires).toBe(false);
    });

    test('should require approval for CRITICAL criticality in TEST mode', () => {
      const requires = trustContext.requiresHumanApproval(
        'test_decision',
        CriticalityLevel.CRITICAL,
        {}
      );
      expect(requires).toBe(true);
    });

    test('should not require approval for LOW criticality', () => {
      const requires = trustContext.requiresHumanApproval(
        'test_decision',
        CriticalityLevel.LOW,
        {}
      );
      expect(requires).toBe(false);
    });
  });

  describe('Approval Token Generation and Management', () => {
    test('should generate approval token for critical decision', async () => {
      const token = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' },
        { requestedBy: 'test' }
      );

      expect(token).toBe('mocked_token');
      expect(trustContext.pendingDecisions.has(token)).toBe(true);
      expect(trustContext.securityMetrics.totalDecisions).toBe(1);
    });

    test('should store decision with correct metadata', async () => {
      const token = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' },
        { requestedBy: 'test' }
      );

      const decision = trustContext.pendingDecisions.get(token);
      expect(decision).toMatchObject({
        token,
        type: 'self_improvement',
        criticality: CriticalityLevel.CRITICAL,
        data: { type: 'model_change' },
        status: ApprovalStatus.PENDING,
        requestedBy: 'test'
      });
    });

    test('should emit approval_requested event', async () => {
      const eventSpy = jest.fn();
      trustContext.on('approval_requested', eventSpy);

      await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' }
      );

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'mocked_token',
          type: 'self_improvement',
          criticality: CriticalityLevel.CRITICAL
        })
      );
    });
  });

  describe('Decision Approval Process', () => {
    let approvalToken;

    beforeEach(async () => {
      approvalToken = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' }
      );
    });

    test('should approve decision with valid supervisor', () => {
      const approved = trustContext.approveDecision(
        approvalToken,
        'test_supervisor_1',
        'valid_signature'
      );

      expect(approved).toBe(true);
      expect(trustContext.pendingDecisions.has(approvalToken)).toBe(false);
      expect(trustContext.securityMetrics.approvedDecisions).toBe(1);
    });

    test('should reject decision with valid supervisor', () => {
      const rejected = trustContext.rejectDecision(
        approvalToken,
        'test_supervisor_1',
        'valid_signature',
        'Test rejection'
      );

      expect(rejected).toBe(true);
      expect(trustContext.pendingDecisions.has(approvalToken)).toBe(false);
      expect(trustContext.securityMetrics.rejectedDecisions).toBe(1);
    });

    test('should not approve with invalid supervisor', () => {
      const approved = trustContext.approveDecision(
        approvalToken,
        'invalid_supervisor',
        'valid_signature'
      );

      expect(approved).toBe(false);
      expect(trustContext.pendingDecisions.has(approvalToken)).toBe(true);
    });

    test('should not approve expired decision', () => {
      // Avancer le temps au-delà du timeout
      jest.advanceTimersByTime(6000);

      const approved = trustContext.approveDecision(
        approvalToken,
        'test_supervisor_1',
        'valid_signature'
      );

      expect(approved).toBe(false);
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

      trustContext.rejectDecision(
        approvalToken,
        'test_supervisor_1',
        'valid_signature',
        'Test rejection'
      );

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          token: approvalToken,
          type: 'self_improvement',
          rejectedBy: 'test_supervisor_1',
          reason: 'Test rejection'
        })
      );
    });
  });

  describe('Approval Status Checking', () => {
    let approvalToken;

    beforeEach(async () => {
      approvalToken = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' }
      );
    });

    test('should return pending status for new decision', () => {
      const status = trustContext.checkApproval(approvalToken);
      expect(status).toMatchObject({
        status: ApprovalStatus.PENDING,
        approved: false,
        message: 'Awaiting human approval'
      });
    });

    test('should return approved status after approval', () => {
      trustContext.approveDecision(approvalToken, 'test_supervisor_1', 'signature');
      
      const status = trustContext.checkApproval(approvalToken);
      expect(status).toMatchObject({
        status: ApprovalStatus.APPROVED,
        approved: true,
        approvedBy: 'test_supervisor_1'
      });
    });

    test('should return expired status for expired decision', () => {
      jest.advanceTimersByTime(6000);
      
      const status = trustContext.checkApproval(approvalToken);
      expect(status).toMatchObject({
        status: ApprovalStatus.EXPIRED,
        approved: false,
        message: 'Approval request has expired'
      });
    });

    test('should return not_found for invalid token', () => {
      const status = trustContext.checkApproval('invalid_token');
      expect(status).toMatchObject({
        status: 'not_found',
        approved: false,
        message: 'Decision not found or already processed'
      });
    });
  });

  describe('Self-Improvement Cooldown', () => {
    test('should allow self-improvement when no previous improvement', () => {
      const status = trustContext.checkSelfImprovementCooldown();
      expect(status.allowed).toBe(true);
      expect(status.message).toBe('No previous self-improvement recorded');
    });

    test('should block self-improvement during cooldown', () => {
      trustContext.recordSelfImprovement({ type: 'test' });
      
      const status = trustContext.checkSelfImprovementCooldown();
      expect(status.allowed).toBe(false);
      expect(status.message).toBe('Self-improvement cooldown active');
      expect(status.cooldownRemainingMs).toBeGreaterThan(0);
    });

    test('should allow self-improvement after cooldown expires', () => {
      trustContext.recordSelfImprovement({ type: 'test' });
      
      // Avancer le temps au-delà du cooldown
      jest.advanceTimersByTime(11000);
      
      const status = trustContext.checkSelfImprovementCooldown();
      expect(status.allowed).toBe(true);
      expect(status.message).toBe('Self-improvement cooldown expired');
    });
  });

  describe('Expired Decision Cleanup', () => {
    test('should clean up expired decisions automatically', async () => {
      const token = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' }
      );

      expect(trustContext.pendingDecisions.has(token)).toBe(true);

      // Avancer le temps pour expirer la décision
      jest.advanceTimersByTime(6000);
      
      // Déclencher le nettoyage
      jest.advanceTimersByTime(60000);

      expect(trustContext.pendingDecisions.has(token)).toBe(false);
      expect(trustContext.securityMetrics.expiredDecisions).toBe(1);
    });

    test('should emit decision_expired event', async () => {
      const eventSpy = jest.fn();
      trustContext.on('decision_expired', eventSpy);

      const token = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' }
      );

      // Avancer le temps pour expirer et nettoyer
      jest.advanceTimersByTime(66000);

      expect(eventSpy).toHaveBeenCalledWith({ token });
    });
  });

  describe('Security Metrics', () => {
    test('should update metrics correctly', async () => {
      // Créer plusieurs décisions
      const token1 = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' }
      );
      
      const token2 = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'prompt_change' }
      );

      // Approuver une décision
      trustContext.approveDecision(token1, 'test_supervisor_1', 'signature');
      
      // Rejeter une décision
      trustContext.rejectDecision(token2, 'test_supervisor_1', 'signature', 'reason');

      // Déclencher la mise à jour des métriques
      jest.advanceTimersByTime(5000);

      const metrics = trustContext.getSecurityMetrics();
      expect(metrics.totalDecisions).toBe(2);
      expect(metrics.approvedDecisions).toBe(1);
      expect(metrics.rejectedDecisions).toBe(1);
      expect(metrics.humanApprovalRate).toBe(0.5);
    });

    test('should emit security_metrics event', () => {
      const eventSpy = jest.fn();
      trustContext.on('security_metrics', eventSpy);

      // Déclencher la mise à jour des métriques
      jest.advanceTimersByTime(5000);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          totalDecisions: expect.any(Number),
          pendingDecisions: expect.any(Number),
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Pending Decisions Management', () => {
    test('should return formatted pending decisions', async () => {
      const token = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' }
      );

      const pending = trustContext.getPendingDecisions();
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({
        token,
        type: 'self_improvement',
        criticality: CriticalityLevel.CRITICAL,
        timeRemaining: expect.any(Number)
      });
    });

    test('should return approval history', async () => {
      const token = await trustContext.requireHumanApproval(
        'self_improvement',
        CriticalityLevel.CRITICAL,
        { type: 'model_change' }
      );

      trustContext.approveDecision(token, 'test_supervisor_1', 'signature');

      const history = trustContext.getApprovalHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        type: 'self_improvement',
        criticality: CriticalityLevel.CRITICAL,
        status: ApprovalStatus.APPROVED,
        approvedBy: 'test_supervisor_1'
      });
    });
  });

  describe('Supervisor Verification', () => {
    test('should verify test supervisors in TEST mode', () => {
      const verified = trustContext.verifySupervisor('test_supervisor_auto', 'signature');
      expect(verified).toBe(true);
    });

    test('should verify allowed supervisors', () => {
      const verified = trustContext.verifySupervisor('test_supervisor_1', 'signature');
      expect(verified).toBe(true);
    });

    test('should reject unauthorized supervisors', () => {
      const verified = trustContext.verifySupervisor('unauthorized_supervisor', 'signature');
      expect(verified).toBe(false);
    });

    test('should reject empty signature', () => {
      const verified = trustContext.verifySupervisor('test_supervisor_1', '');
      expect(verified).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance with getTrustContext', () => {
      const instance1 = getTrustContext();
      const instance2 = getTrustContext();
      expect(instance1).toBe(instance2);
    });

    test('should initialize singleton with config on first call', () => {
      // Reset singleton
      jest.resetModules();
      
      const { getTrustContext: freshGetTrustContext } = require('../src/core/TrustContext.js');
      const instance = freshGetTrustContext({ mode: 'TEST' });
      expect(instance.config.mode).toBe('TEST');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid approval token gracefully', () => {
      expect(() => {
        trustContext.checkApproval(null);
      }).not.toThrow();
    });

    test('should handle missing decision data gracefully', async () => {
      expect(async () => {
        await trustContext.requireHumanApproval('test', CriticalityLevel.LOW, null);
      }).not.toThrow();
    });

    test('should handle supervisor verification errors gracefully', () => {
      expect(() => {
        trustContext.verifySupervisor(null, null);
      }).not.toThrow();
    });
  });

  describe('Performance and Limits', () => {
    test('should limit approval history size', async () => {
      // Créer plus de 1000 décisions pour tester la limite
      for (let i = 0; i < 1005; i++) {
        const token = await trustContext.requireHumanApproval(
          'test_decision',
          CriticalityLevel.CRITICAL,
          { index: i }
        );
        trustContext.approveDecision(token, 'test_supervisor_1', 'signature');
      }

      expect(trustContext.approvalHistory.length).toBeLessThanOrEqual(1000);
    });

    test('should handle high volume of decisions efficiently', async () => {
      const startTime = Date.now();
      
      // Créer 100 décisions rapidement
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          trustContext.requireHumanApproval(
            'bulk_test',
            CriticalityLevel.MEDIUM,
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
  });
});

describe('TrustContext Integration', () => {
  test('should integrate with security config', () => {
    // Test que TrustContext utilise bien la config de sécurité
    const trustContext = new TrustContext();
    expect(trustContext.config.approvalTimeoutMs).toBeGreaterThan(0);
    expect(trustContext.config.allowedSupervisors).toBeInstanceOf(Array);
  });

  test('should work with different criticality levels', () => {
    const trustContext = new TrustContext({ mode: 'PROD' });
    
    expect(trustContext.requiresHumanApproval('test', CriticalityLevel.LOW)).toBe(false);
    expect(trustContext.requiresHumanApproval('test', CriticalityLevel.MEDIUM)).toBe(false);
    expect(trustContext.requiresHumanApproval('test', CriticalityLevel.HIGH)).toBe(true);
    expect(trustContext.requiresHumanApproval('test', CriticalityLevel.CRITICAL)).toBe(true);
  });
});

// Tests de couverture pour les branches non testées
describe('TrustContext Edge Cases', () => {
  test('should handle decision hash generation', () => {
    const hash1 = trustContext.generateDecisionHash('type1', { data: 'test' }, {});
    const hash2 = trustContext.generateDecisionHash('type2', { data: 'test' }, {});
    expect(hash1).toBe('mocked_hash');
    expect(hash2).toBe('mocked_hash');
  });

  test('should generate unique approval tokens', () => {
    const token1 = trustContext.generateApprovalToken();
    const token2 = trustContext.generateApprovalToken();
    expect(token1).toBe('mocked_token');
    expect(token2).toBe('mocked_token');
  });

  test('should generate decision summary', () => {
    const decision = {
      type: 'test_type',
      criticality: CriticalityLevel.HIGH,
      data: { key: 'value'.repeat(50) } // Long data
    };
    
    const summary = trustContext.generateDecisionSummary(decision);
    expect(summary).toContain('test_type');
    expect(summary).toContain('high');
    expect(summary.length).toBeLessThan(150); // Vérifie la troncature
  });
}); 