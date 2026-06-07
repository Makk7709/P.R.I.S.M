/**
 * @fileoverview Tests d'intégration KernelBus - Vérification des flux critiques
 * @module tests/security/kernelBusCriticalFlow.spec
 */

import { jest } from '@jest/globals';
import KernelBus from '../../core/KernelBus.js';
import { getTrustContext } from '../../src/core/TrustContext.js';
import { SECURITY_CONFIG, SECURITY_UTILS } from '../../config/security.js';

// Mock des modules externes
jest.mock('../../src/core/TrustContext.js');
jest.mock('../../config/security.js', () => ({
  SECURITY_CONFIG: {
    KERNEL_BUS: {
      MAX_LISTENERS_PER_EVENT: 100,
      MAX_QUEUE_SIZE: 10000,
      EVENT_PROCESSING_TIMEOUT_MS: 30000,
      CRITICAL_EVENTS: [
        'prism:selfimprovement:execute',
        'prism:core:shutdown',
        'prism:security:disable',
        'prism:config:modify',
        'prism:trust:override'
      ]
    }
  },
  SECURITY_UTILS: {
    isCriticalEvent: jest.fn(),
    getCriticalityLevel: jest.fn()
  }
}));

describe('KernelBus Critical Flow Security Verification', () => {
  let kernelBus;
  let mockTrustContext;

  beforeEach(() => {
    // Mock TrustContext
    mockTrustContext = {
      requiresHumanApproval: jest.fn(),
      requireHumanApproval: jest.fn(),
      checkApproval: jest.fn(),
      approveDecision: jest.fn(),
      rejectDecision: jest.fn(),
      getSecurityMetrics: jest.fn(() => ({
        totalDecisions: 0,
        approvedDecisions: 0,
        rejectedDecisions: 0,
        humanApprovalRate: 1,
        pendingDecisions: 0
      }))
    };

    getTrustContext.mockReturnValue(mockTrustContext);

    // Configuration des mocks SECURITY_UTILS
    SECURITY_UTILS.isCriticalEvent.mockImplementation((eventType) => {
      return SECURITY_CONFIG.KERNEL_BUS.CRITICAL_EVENTS.includes(eventType);
    });

    SECURITY_UTILS.getCriticalityLevel.mockImplementation((eventType) => {
      if (eventType.includes('selfimprovement') || eventType.includes('shutdown')) {
        return 'CRITICAL';
      }
      return 'HIGH';
    });

    kernelBus = new KernelBus();
    global.clearSecurityLogs();
  });

  afterEach(() => {
    kernelBus.clear();
    jest.clearAllMocks();
  });

  describe('KernelBus Initialization with Security', () => {
    test('should initialize KernelBus with TrustContext integration', () => {
      expect(kernelBus).toBeInstanceOf(KernelBus);
      expect(kernelBus.trustContext).toBe(mockTrustContext);
      expect(kernelBus.securityEnabled).toBe(true);
    });

    test('should configure security event listeners', () => {
      expect(kernelBus.metrics.securityChecks).toBe(0);
      expect(kernelBus.metrics.blockedEvents).toBe(0);
    });
  });

  describe('Critical Event Detection and Blocking', () => {
    test('should identify critical events correctly', () => {
      const criticalEvents = [
        'prism:selfimprovement:execute',
        'prism:core:shutdown',
        'prism:security:disable',
        'prism:config:modify',
        'prism:trust:override'
      ];

      criticalEvents.forEach(eventType => {
        expect(SECURITY_UTILS.isCriticalEvent(eventType)).toBe(true);
      });

      const nonCriticalEvents = [
        'prism:data:update',
        'prism:ui:refresh',
        'prism:log:info'
      ];

      nonCriticalEvents.forEach(eventType => {
        expect(SECURITY_UTILS.isCriticalEvent(eventType)).toBe(false);
      });
    });

    test('should block critical events without human approval', async () => {
      // Configuration du mock pour exiger une approbation
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.requireHumanApproval.mockResolvedValue('test_token_123');

      const criticalPayload = {
        action: 'execute_improvement',
        changes: ['model_update', 'prompt_optimization']
      };

      // Tenter de publier un événement critique sans approbation
      await expect(
        kernelBus.publish('selfimprovement:execute', criticalPayload)
      ).rejects.toThrow('blocked by TrustContext');

      // Vérifier que l'événement a été bloqué
      expect(kernelBus.metrics.blockedEvents).toBe(1);
      expect(kernelBus.metrics.securityChecks).toBe(1);
      
      // Vérifier que l'approbation humaine a été demandée
      expect(mockTrustContext.requireHumanApproval).toHaveBeenCalledWith(
        'prism:selfimprovement:execute',
        'CRITICAL',
        criticalPayload,
        expect.objectContaining({
          requestedBy: 'KernelBus'
        })
      );

      // Vérifier les logs de sécurité
      expect(global.SecurityTestUtils.verifyCriticalEventBlocked()).toBe(true);
    });

    test('should allow critical events with valid human approval', async () => {
      const approvalToken = 'valid_approval_token_456';
      const criticalPayload = {
        action: 'execute_improvement',
        changes: ['model_update'],
        approvalToken: approvalToken
      };

      // Configuration des mocks pour une approbation valide
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.checkApproval.mockReturnValue({
        approved: true,
        status: 'APPROVED',
        approvedBy: 'test_supervisor_1'
      });

      // Publier l'événement critique avec approbation
      await expect(
        kernelBus.publish('selfimprovement:execute', criticalPayload)
      ).resolves.not.toThrow();

      // Vérifier que l'événement a été traité
      expect(kernelBus.metrics.securityChecks).toBe(1);
      expect(kernelBus.metrics.blockedEvents).toBe(0);
      expect(kernelBus.metrics.publishedEvents).toBe(1);

      // Vérifier que l'approbation a été vérifiée
      expect(mockTrustContext.checkApproval).toHaveBeenCalledWith(approvalToken);
    });

    test('should allow non-critical events without approval', async () => {
      const nonCriticalPayload = {
        data: 'test_data',
        timestamp: Date.now()
      };

      // Publier un événement non critique
      await expect(
        kernelBus.publish('data:update', nonCriticalPayload)
      ).resolves.not.toThrow();

      // Vérifier que l'événement a été traité sans vérification de sécurité
      expect(kernelBus.metrics.publishedEvents).toBe(1);
      expect(kernelBus.metrics.securityChecks).toBe(0);
      expect(kernelBus.metrics.blockedEvents).toBe(0);
    });
  });

  describe('Human Approval Integration', () => {
    test('should request human approval for critical events', async () => {
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.requireHumanApproval.mockResolvedValue('approval_token_789');

      const shutdownPayload = {
        reason: 'emergency_shutdown',
        immediate: true
      };

      // Tenter un arrêt critique
      await expect(
        kernelBus.publish('core:shutdown', shutdownPayload)
      ).rejects.toThrow('human approval required');

      // Vérifier que l'approbation a été demandée
      expect(mockTrustContext.requireHumanApproval).toHaveBeenCalledWith(
        'prism:core:shutdown',
        'CRITICAL',
        shutdownPayload,
        expect.objectContaining({
          requestedBy: 'KernelBus',
          timestamp: expect.any(Number)
        })
      );

      // Vérifier l'émission de l'événement d'approbation requise
      expect(global.SecurityTestUtils.verifyHumanVetoRequired()).toBe(true);
    });

    test('should handle approval timeout correctly', async () => {
      const approvalToken = 'timeout_token_999';
      const criticalPayload = {
        action: 'security_disable',
        approvalToken: approvalToken
      };

      // Configuration pour une approbation expirée
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.checkApproval.mockReturnValue({
        approved: false,
        status: 'EXPIRED',
        message: 'Approval request has expired'
      });

      // Tenter de publier avec un token expiré
      await expect(
        kernelBus.publish('security:disable', criticalPayload)
      ).rejects.toThrow('blocked by TrustContext');

      expect(kernelBus.metrics.blockedEvents).toBe(1);
    });

    test('should handle rejected approvals correctly', async () => {
      const approvalToken = 'rejected_token_111';
      const criticalPayload = {
        action: 'config_modify',
        approvalToken: approvalToken
      };

      // Configuration pour une approbation rejetée
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.checkApproval.mockReturnValue({
        approved: false,
        status: 'REJECTED',
        message: 'Rejected by supervisor'
      });

      // Tenter de publier avec un token rejeté
      await expect(
        kernelBus.publish('config:modify', criticalPayload)
      ).rejects.toThrow('blocked by TrustContext');

      expect(kernelBus.metrics.blockedEvents).toBe(1);
    });
  });

  describe('Supervisor Actions Integration', () => {
    test('should allow supervisors to approve events', () => {
      const approvalToken = 'supervisor_approval_222';
      const supervisorId = 'test_supervisor_1';
      const signature = 'valid_signature';

      mockTrustContext.approveDecision.mockReturnValue(true);

      const result = kernelBus.approveEvent(approvalToken, supervisorId, signature);

      expect(result).toBe(true);
      expect(mockTrustContext.approveDecision).toHaveBeenCalledWith(
        approvalToken,
        supervisorId,
        signature
      );
    });

    test('should allow supervisors to reject events', () => {
      const approvalToken = 'supervisor_rejection_333';
      const supervisorId = 'test_supervisor_1';
      const signature = 'valid_signature';
      const reason = 'Security concern detected';

      mockTrustContext.rejectDecision.mockReturnValue(true);

      const result = kernelBus.rejectEvent(approvalToken, supervisorId, signature, reason);

      expect(result).toBe(true);
      expect(mockTrustContext.rejectDecision).toHaveBeenCalledWith(
        approvalToken,
        supervisorId,
        signature,
        reason
      );
    });

    test('should emit security events for supervisor actions', () => {
      const eventSpy = jest.fn();
      kernelBus.on('prism:security:event_approved', eventSpy);

      const approvalToken = 'event_approval_444';
      mockTrustContext.approveDecision.mockReturnValue(true);

      kernelBus.approveEvent(approvalToken, 'test_supervisor_1', 'signature');

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          token: approvalToken,
          supervisorId: 'test_supervisor_1',
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Security Metrics and Monitoring', () => {
    test('should track security metrics correctly', async () => {
      // Publier plusieurs événements pour tester les métriques
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.requireHumanApproval.mockResolvedValue('token_metrics_555');

      // Événements critiques bloqués
      await expect(
        kernelBus.publish('selfimprovement:execute', { test: 1 })
      ).rejects.toThrow();

      await expect(
        kernelBus.publish('core:shutdown', { test: 2 })
      ).rejects.toThrow();

      // Événement non critique autorisé
      await kernelBus.publish('data:update', { test: 3 });

      const metrics = kernelBus.getMetrics();
      expect(metrics.securityChecks).toBe(2);
      expect(metrics.blockedEvents).toBe(2);
      expect(metrics.publishedEvents).toBe(1);
      expect(metrics.securityEnabled).toBe(true);
      expect(metrics.trustContextActive).toBe(true);
    });

    test('should provide security metrics for monitoring', () => {
      const securityMetrics = kernelBus.getSecurityMetrics();

      expect(securityMetrics).toMatchObject({
        securityChecks: expect.any(Number),
        blockedEvents: expect.any(Number),
        securityEnabled: true,
        trustContextActive: true
      });

      // Vérifier l'intégration avec TrustContext
      expect(mockTrustContext.getSecurityMetrics).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle TrustContext failures gracefully', async () => {
      // Simuler une erreur TrustContext
      mockTrustContext.requireHumanApproval.mockRejectedValue(
        new Error('TrustContext unavailable')
      );

      const criticalPayload = { action: 'test_failure' };

      await expect(
        kernelBus.publish('selfimprovement:execute', criticalPayload)
      ).rejects.toThrow('TrustContext unavailable');

      expect(kernelBus.metrics.blockedEvents).toBe(1);
    });

    test('should handle missing TrustContext', () => {
      // Créer un KernelBus sans TrustContext
      getTrustContext.mockImplementation(() => {
        throw new Error('TrustContext not available');
      });

      const kernelBusNoTrust = new KernelBus();
      expect(kernelBusNoTrust.securityEnabled).toBe(false);
      expect(kernelBusNoTrust.trustContext).toBe(null);
    });

    test('should handle queue overflow with security checks', async () => {
      // Remplir la queue au maximum
      const promises = [];
      for (let i = 0; i < SECURITY_CONFIG.KERNEL_BUS.MAX_QUEUE_SIZE + 1; i++) {
        promises.push(
          kernelBus.publish('data:update', { index: i }).catch(() => {})
        );
      }

      await Promise.allSettled(promises);

      // Vérifier qu'une erreur de débordement a été générée
      expect(kernelBus.metrics.failedEvents).toBeGreaterThan(0);
    });
  });

  describe('Event Processing Timeout', () => {
    test('should timeout event processing within security limits', async () => {
      // Mock d'un traitement très lent
      const slowHandler = jest.fn(() => {
        return new Promise(resolve => {
          setTimeout(resolve, SECURITY_CONFIG.KERNEL_BUS.EVENT_PROCESSING_TIMEOUT_MS + 1000);
        });
      });

      kernelBus.on('prism:slow:event', slowHandler);

      // Publier un événement qui va timeout
      await expect(
        kernelBus.publish('slow:event', { test: 'timeout' })
      ).rejects.toThrow();

      expect(kernelBus.metrics.failedEvents).toBeGreaterThan(0);
    });
  });

  describe('Integration with Security Configuration', () => {
    test('should respect security configuration limits', () => {
      expect(kernelBus.maxListeners).toBe(SECURITY_CONFIG.KERNEL_BUS.MAX_LISTENERS_PER_EVENT);
    });

    test('should validate critical events against configuration', () => {
      SECURITY_CONFIG.KERNEL_BUS.CRITICAL_EVENTS.forEach(eventType => {
        expect(SECURITY_UTILS.isCriticalEvent(eventType)).toBe(true);
      });
    });
  });

  describe('Real-world Critical Flow Scenarios', () => {
    test('should block unauthorized self-improvement execution', async () => {
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.requireHumanApproval.mockResolvedValue('improvement_token_666');

      const selfImprovementPayload = {
        type: 'model_optimization',
        changes: [
          { component: 'prompt_engine', modification: 'temperature_adjustment' },
          { component: 'response_filter', modification: 'quality_threshold' }
        ],
        impact: 'high',
        requestedBy: 'SelfImprovementEngine'
      };

      // Tenter l'auto-amélioration sans approbation
      await expect(
        kernelBus.publish('selfimprovement:execute', selfImprovementPayload)
      ).rejects.toThrow('human approval required');

      // Vérifier que le veto humain a été requis
      expect(global.SecurityTestUtils.verifyHumanVetoRequired()).toBe(true);
      expect(global.SecurityTestUtils.verifyCriticalEventBlocked()).toBe(true);
    });

    test('should allow approved self-improvement execution', async () => {
      const approvalToken = 'approved_improvement_777';
      const selfImprovementPayload = {
        type: 'model_optimization',
        changes: [{ component: 'prompt_engine', modification: 'temperature_adjustment' }],
        approvalToken: approvalToken
      };

      // Configuration pour une approbation valide
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.checkApproval.mockReturnValue({
        approved: true,
        status: 'APPROVED',
        approvedBy: 'security_supervisor'
      });

      // Exécuter l'auto-amélioration approuvée
      await expect(
        kernelBus.publish('selfimprovement:execute', selfImprovementPayload)
      ).resolves.not.toThrow();

      expect(kernelBus.metrics.publishedEvents).toBe(1);
      expect(kernelBus.metrics.blockedEvents).toBe(0);
    });

    test('should block system shutdown without approval', async () => {
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.requireHumanApproval.mockResolvedValue('shutdown_token_888');

      const shutdownPayload = {
        reason: 'maintenance',
        graceful: true,
        delay: 30000
      };

      await expect(
        kernelBus.publish('core:shutdown', shutdownPayload)
      ).rejects.toThrow('human approval required');

      expect(global.SecurityTestUtils.verifyCriticalEventBlocked()).toBe(true);
    });

    test('should block security system disable attempts', async () => {
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.requireHumanApproval.mockResolvedValue('security_disable_999');

      const disablePayload = {
        component: 'TrustContext',
        reason: 'emergency_override'
      };

      await expect(
        kernelBus.publish('security:disable', disablePayload)
      ).rejects.toThrow('human approval required');

      expect(global.SecurityTestUtils.verifyCriticalEventBlocked()).toBe(true);
    });
  });

  describe('Bypass Prevention and Security Hardening', () => {
    test('should prevent event type manipulation', async () => {
      // Tenter de contourner la sécurité en modifiant le type d'événement
      const maliciousPayload = {
        originalType: 'prism:selfimprovement:execute',
        action: 'bypass_security'
      };

      // Publier avec un type non critique mais un payload critique
      await expect(
        kernelBus.publish('data:update', maliciousPayload)
      ).resolves.not.toThrow();

      // Mais tenter le vrai type critique doit être bloqué
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.requireHumanApproval.mockResolvedValue('bypass_token');

      await expect(
        kernelBus.publish('selfimprovement:execute', maliciousPayload)
      ).rejects.toThrow('human approval required');
    });

    test('should prevent approval token forgery', async () => {
      const forgedToken = 'forged_approval_token';
      const criticalPayload = {
        action: 'malicious_action',
        approvalToken: forgedToken
      };

      // Configuration pour un token forgé (non approuvé)
      mockTrustContext.requiresHumanApproval.mockReturnValue(true);
      mockTrustContext.checkApproval.mockReturnValue({
        approved: false,
        status: 'not_found',
        message: 'Decision not found or already processed'
      });

      await expect(
        kernelBus.publish('selfimprovement:execute', criticalPayload)
      ).rejects.toThrow('blocked by TrustContext');

      expect(kernelBus.metrics.blockedEvents).toBe(1);
    });
  });
}); 