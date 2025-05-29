/**
 * Tests pour KernelBus avec PriorityQueue
 * Vérifie l'ordre garanti des événements et l'intégration du consensus
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { KernelBus } from '../../core/KernelBus.js';
import { Priority } from '../../src/core/PriorityQueue.js';
import { ConsensusStatus } from '../../src/core/ConsensusManager.js';

// Mock des dépendances
jest.mock('../../src/core/TrustContext.js', () => ({
  getTrustContext: jest.fn(() => ({
    checkApproval: jest.fn(() => ({ approved: true })),
    requireHumanApproval: jest.fn(),
    checkSelfImprovementCooldown: jest.fn(() => ({ allowed: true }))
  }))
}));

jest.mock('../../config/security.js', () => ({
  SECURITY_CONFIG: {
    KERNEL_BUS: {
      MAX_LISTENERS_PER_EVENT: 10,
      MAX_QUEUE_SIZE: 1000,
      EVENT_PROCESSING_TIMEOUT_MS: 5000
    }
  },
  SECURITY_UTILS: {
    isCriticalEvent: jest.fn(() => false),
    getCriticalityLevel: jest.fn(() => 'LOW')
  }
}));

jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hash-123')
  }))
}));

// Mock performance pour les tests
global.performance = {
  now: jest.fn(() => Date.now())
};

describe('KernelBus Priority System', () => {
  let kernelBus;
  let eventOrder;

  beforeEach(async () => {
    eventOrder = [];
    kernelBus = new KernelBus();
    
    // Attendre l'initialisation
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Mock du ConsensusManager pour les tests
    if (kernelBus.consensusManager) {
      kernelBus.consensusManager.propose = jest.fn().mockResolvedValue('test-proposal-id');
      kernelBus.waitForConsensus = jest.fn().mockResolvedValue({
        status: ConsensusStatus.APPROVED,
        proposalId: 'test-proposal-id'
      });
    }
  });

  afterEach(() => {
    if (kernelBus) {
      kernelBus.cleanup();
    }
    eventOrder = [];
  });

  describe('Priority Queue Integration', () => {
    it('should use PriorityQueue instead of simple array', () => {
      expect(kernelBus.priorityQueue).toBeDefined();
      expect(kernelBus.priorityQueue.getSize).toBeDefined();
      expect(kernelBus.priorityQueue.enqueue).toBeDefined();
      expect(kernelBus.priorityQueue.dequeue).toBeDefined();
    });

    it('should determine event priority correctly', () => {
      // Test événements critiques
      const criticalPriority = kernelBus.determineEventPriority('prism:security:alert', {});
      expect(criticalPriority).toBe(Priority.CRITICAL);

      const criticalPriority2 = kernelBus.determineEventPriority('prism:critical:error', {});
      expect(criticalPriority2).toBe(Priority.CRITICAL);

      // Test événements haute priorité
      const highPriority = kernelBus.determineEventPriority('prism:system:failure', {});
      expect(highPriority).toBe(Priority.HIGH);

      const highPriority2 = kernelBus.determineEventPriority('prism:error:handler', {});
      expect(highPriority2).toBe(Priority.HIGH);

      // Test événements normaux
      const normalPriority = kernelBus.determineEventPriority('prism:user:action', {});
      expect(normalPriority).toBe(Priority.NORMAL);

      // Test avec priorité dans le payload
      const payloadPriority = kernelBus.determineEventPriority('prism:test', { priority: 'critical' });
      expect(payloadPriority).toBe(Priority.CRITICAL);
    });

    it('should process events in priority order', async () => {
      // Créer des listeners pour capturer l'ordre
      kernelBus.subscribe('test:normal', (data) => {
        eventOrder.push({ type: 'normal', data, timestamp: Date.now() });
      });

      kernelBus.subscribe('test:high', (data) => {
        eventOrder.push({ type: 'high', data, timestamp: Date.now() });
      });

      kernelBus.subscribe('test:critical', (data) => {
        eventOrder.push({ type: 'critical', data, timestamp: Date.now() });
      });

      // Publier les événements dans l'ordre inverse de priorité
      await kernelBus.publish('test:normal', { id: 1, priority: 'normal' });
      await kernelBus.publish('test:high', { id: 2, priority: 'high' });
      await kernelBus.publish('test:critical', { id: 3, priority: 'critical' });

      // Attendre le traitement
      await new Promise(resolve => setTimeout(resolve, 100));

      // Vérifier que les événements ont été traités dans l'ordre de priorité
      expect(eventOrder).toHaveLength(3);
      expect(eventOrder[0].type).toBe('critical'); // Priorité la plus haute en premier
      expect(eventOrder[1].type).toBe('high');
      expect(eventOrder[2].type).toBe('normal');
    });

    it('should maintain FIFO order within same priority', async () => {
      // Créer des listeners
      kernelBus.subscribe('test:normal1', (data) => {
        eventOrder.push({ type: 'normal1', data });
      });

      kernelBus.subscribe('test:normal2', (data) => {
        eventOrder.push({ type: 'normal2', data });
      });

      kernelBus.subscribe('test:normal3', (data) => {
        eventOrder.push({ type: 'normal3', data });
      });

      // Publier plusieurs événements de même priorité
      await kernelBus.publish('test:normal1', { id: 1 });
      await kernelBus.publish('test:normal2', { id: 2 });
      await kernelBus.publish('test:normal3', { id: 3 });

      // Attendre le traitement
      await new Promise(resolve => setTimeout(resolve, 100));

      // Vérifier l'ordre FIFO
      expect(eventOrder).toHaveLength(3);
      expect(eventOrder[0].type).toBe('normal1');
      expect(eventOrder[1].type).toBe('normal2');
      expect(eventOrder[2].type).toBe('normal3');
    });
  });

  describe('Consensus Integration', () => {
    it('should detect events requiring consensus', () => {
      // Événements critiques
      expect(kernelBus.requiresConsensus('prism:critical:decision', {})).toBe(true);
      expect(kernelBus.requiresConsensus('prism:security:change', {})).toBe(true);

      // Événements d\'auto-amélioration
      expect(kernelBus.requiresConsensus('prism:self_improvement:update', {})).toBe(true);
      expect(kernelBus.requiresConsensus('prism:system_modification:apply', {})).toBe(true);

      // Événements avec flag explicite
      expect(kernelBus.requiresConsensus('prism:test', { requiresConsensus: true })).toBe(true);

      // Événements normaux
      expect(kernelBus.requiresConsensus('prism:user:action', {})).toBe(false);
      expect(kernelBus.requiresConsensus('prism:info:log', {})).toBe(false);
    });

    it('should determine correct decision type for consensus', () => {
      expect(kernelBus.getDecisionType('prism:security:alert')).toBe('security');
      expect(kernelBus.getDecisionType('prism:self_improvement:update')).toBe('self_improvement');
      expect(kernelBus.getDecisionType('prism:system_modification:apply')).toBe('system_modification');
      expect(kernelBus.getDecisionType('prism:data_access:request')).toBe('data_access');
      expect(kernelBus.getDecisionType('prism:other:event')).toBe('critical');
    });

    it('should request consensus for critical events', async () => {
      const consensusSpy = jest.fn().mockResolvedValue('proposal-123');
      if (kernelBus.consensusManager) {
        kernelBus.consensusManager.propose = consensusSpy;
      }

      await kernelBus.publish('prism:critical:decision', { 
        action: 'modify_system',
        impact: 'high'
      });

      expect(consensusSpy).toHaveBeenCalledWith(
        expect.any(String), // hash
        expect.objectContaining({
          eventType: 'prism:critical:decision',
          payload: expect.objectContaining({
            action: 'modify_system',
            impact: 'high'
          })
        }),
        'critical'
      );
    });

    it('should block events when consensus is rejected', async () => {
      if (kernelBus.consensusManager) {
        kernelBus.waitForConsensus = jest.fn().mockResolvedValue({
          status: ConsensusStatus.REJECTED,
          proposalId: 'test-proposal-id'
        });
      }

      const eventSpy = jest.fn();
      kernelBus.subscribe('critical:blocked', eventSpy);

      await expect(kernelBus.publish('prism:critical:blocked', { test: true }))
        .rejects.toThrow('rejected by consensus');

      // L'événement ne devrait pas avoir été émis
      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should handle consensus timeout gracefully', async () => {
      if (kernelBus.consensusManager) {
        kernelBus.waitForConsensus = jest.fn().mockRejectedValue(new Error('Consensus timeout'));
      }

      await expect(kernelBus.publish('prism:critical:timeout', { test: true }))
        .rejects.toThrow('Consensus timeout');
    });
  });

  describe('Performance and Metrics', () => {
    it('should track priority queue metrics', async () => {
      // Publier quelques événements
      await kernelBus.publish('test:normal', { id: 1 });
      await kernelBus.publish('test:critical', { id: 2, priority: 'critical' });
      await kernelBus.publish('test:high', { id: 3, priority: 'high' });

      const metrics = kernelBus.getMetrics();
      
      expect(metrics.priorityQueueMetrics).toBeDefined();
      expect(metrics.priorityQueueMetrics.totalEnqueued).toBeGreaterThan(0);
      expect(metrics.queueLength).toBeDefined();
    });

    it('should track consensus metrics', async () => {
      const metrics = kernelBus.getMetrics();
      
      expect(metrics.consensusMetrics).toBeDefined();
      expect(metrics.consensusManagerActive).toBe(true);
    });

    it('should measure event latencies', async () => {
      const startTime = Date.now();
      
      await kernelBus.publish('test:latency', { timestamp: startTime });
      
      const metrics = kernelBus.getMetrics();
      expect(metrics.eventLatencies).toBeDefined();
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0);
    });

    it('should handle queue overflow gracefully', async () => {
      // Mock une queue pleine
      kernelBus.priorityQueue.getSize = jest.fn(() => 1001);

      await expect(kernelBus.publish('test:overflow', {}))
        .rejects.toThrow('Priority queue overflow');
    });
  });

  describe('Event Processing', () => {
    it('should process events in batches', async () => {
      const eventSpy = jest.fn();
      kernelBus.subscribe('batch:test', eventSpy);

      // Publier plusieurs événements rapidement
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(kernelBus.publish('batch:test', { id: i }));
      }

      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(eventSpy).toHaveBeenCalledTimes(10);
    });

    it('should handle processing errors gracefully', async () => {
      // Créer un listener qui lance une erreur
      kernelBus.subscribe('error:test', () => {
        throw new Error('Test error in listener');
      });

      // L'événement devrait quand même être publié sans faire planter le système
      await expect(kernelBus.publish('error:test', {})).resolves.not.toThrow();

      const metrics = kernelBus.getMetrics();
      expect(metrics.failedEvents).toBeGreaterThan(0);
    });

    it('should respect processing timeout', async () => {
      // Mock un traitement très lent
      kernelBus.subscribe('slow:test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 secondes
      });

      const startTime = Date.now();
      await kernelBus.publish('slow:test', {});
      
      // Le traitement devrait être interrompu par le timeout
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(6000); // Moins que le timeout + marge
    });
  });

  describe('Security Integration', () => {
    it('should track security metrics', () => {
      const securityMetrics = kernelBus.getSecurityMetrics();
      
      expect(securityMetrics).toHaveProperty('securityChecks');
      expect(securityMetrics).toHaveProperty('blockedEvents');
      expect(securityMetrics).toHaveProperty('consensusRequests');
      expect(securityMetrics).toHaveProperty('consensusSuccessRate');
    });

    it('should handle TrustContext verification', async () => {
      // Mock TrustContext pour bloquer un événement
      if (kernelBus.trustContext) {
        kernelBus.verifyTrustContext = jest.fn().mockResolvedValue(false);
      }

      await expect(kernelBus.publish('test:blocked', {}))
        .rejects.toThrow('blocked by TrustContext');
    });
  });

  describe('Event Subscription and Unsubscription', () => {
    it('should handle subscriptions correctly', () => {
      const handler = jest.fn();
      const unsubscribe = kernelBus.subscribe('test:subscription', handler);

      expect(typeof unsubscribe).toBe('function');
      expect(kernelBus.subscriptions.has(handler)).toBe(true);
    });

    it('should handle unsubscriptions correctly', () => {
      const handler = jest.fn();
      const unsubscribe = kernelBus.subscribe('test:unsubscription', handler);

      unsubscribe();
      expect(kernelBus.subscriptions.has(handler)).toBe(false);
    });

    it('should add prism prefix to event types', async () => {
      const handler = jest.fn();
      kernelBus.subscribe('test:prefix', handler);

      await kernelBus.publish('test:prefix', { data: 'test' });
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources properly', () => {
      const handler = jest.fn();
      kernelBus.subscribe('test:cleanup', handler);

      expect(kernelBus.subscriptions.size).toBeGreaterThan(0);
      expect(kernelBus.priorityQueue.getSize()).toBeGreaterThanOrEqual(0);

      kernelBus.cleanup();

      expect(kernelBus.subscriptions.size).toBe(0);
      expect(kernelBus.priorityQueue.getSize()).toBe(0);
    });

    it('should clear priority queue on clear', () => {
      kernelBus.priorityQueue.enqueue({ test: 'data' }, Priority.NORMAL);
      expect(kernelBus.priorityQueue.getSize()).toBeGreaterThan(0);

      kernelBus.clear();
      expect(kernelBus.priorityQueue.getSize()).toBe(0);
    });
  });

  describe('Batch Event Processing', () => {
    it('should handle batch events correctly', async () => {
      const events = [
        { type: 'batch:test1', payload: { id: 1 } },
        { type: 'batch:test2', payload: { id: 2 } },
        { type: 'batch:test3', payload: { id: 3 } }
      ];

      const results = await kernelBus.publishBatch(events);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle batch errors correctly', async () => {
      // Mock une erreur pour un événement spécifique
      const originalPublish = kernelBus.publish.bind(kernelBus);
      kernelBus.publish = jest.fn().mockImplementation((eventType, payload) => {
        if (eventType === 'batch:error') {
          return Promise.reject(new Error('Test batch error'));
        }
        return originalPublish(eventType, payload);
      });

      const events = [
        { type: 'batch:success', payload: { id: 1 } },
        { type: 'batch:error', payload: { id: 2 } },
        { type: 'batch:success', payload: { id: 3 } }
      ];

      const results = await kernelBus.publishBatch(events);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
      expect(results[2].success).toBe(true);
    });
  });
}); 