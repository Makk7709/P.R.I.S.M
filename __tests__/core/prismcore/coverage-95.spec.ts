/**
 * TDD Phase RED - Tests pour atteindre ≥95% Coverage L/B/F
 * 
 * Ces tests DOIVENT échouer d'abord, puis l'implémentation sera corrigée
 * Ciblage spécifique des branches et lignes non couvertes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismCoreOrchestrator } from '../../../src/core/PrismCoreOrchestrator.js';
import { IdempotentPrismCore } from '../../../src/core/IdempotentPrismCore.js';
import { FailoverPrismCore } from '../../../src/core/FailoverPrismCore.js';
import { MetricsPrismCore } from '../../../src/core/MetricsPrismCore.js';

describe('PrismCore - Coverage ≥95% Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PRISM_MODE = 'TEST';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.PRISM_MODE;
    delete process.env.NODE_ENV;
  });

  describe('PrismCoreOrchestrator - Branches manquantes', () => {
    it('DOIT gérer redistribution sans aucun module actif', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      
      // Isoler tous les modules pour déclencher le cas "aucun module actif"
      await orchestrator.isolateFailingModule('consensus');
      await orchestrator.isolateFailingModule('journal');
      await orchestrator.isolateFailingModule('trust');
      await orchestrator.isolateFailingModule('enterprise');
      
      // Cette ligne devrait déclencher le warn log (ligne 180)
      await orchestrator.redistributeLoad('all-modules');
      
      // Vérifier que tous les modules sont isolés
      expect(orchestrator.modules.size).toBe(0);
      expect(orchestrator.isolatedModules.size).toBe(4);
    });

    it('DOIT gérer erreur dans handleTrustValidation avec catch block', async () => {
      const mockTrustContext = {
        // Mock qui throw une erreur pour déclencher catch block
        validateDecision: vi.fn().mockRejectedValue(new Error('Trust validation failed'))
      };
      
      const orchestrator = new PrismCoreOrchestrator({
        trustContext: mockTrustContext
      });
      
      await orchestrator.initializeModules();
      
      const decision = {
        id: 'error-test',
        criticality: 'HIGH'
      };
      
      // Cette ligne devrait déclencher le catch block (lignes 131-135)
      const result = await orchestrator.handleTrustValidation(decision);
      expect(result).toBe(false);
      expect(orchestrator.metrics.trustValidationRate).toBe(0);
    });

    it('DOIT gérer orchestrateConsensus avec module isolé', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      await orchestrator.initializeModules();
      
      // Isoler le module consensus pour déclencher la branche d'erreur
      await orchestrator.isolateFailingModule('consensus');
      
      const decision = { id: 'isolated-test', type: 'CRITICAL' };
      
      await expect(orchestrator.orchestrateConsensus(decision)).rejects.toThrow('Consensus module isolated');
    });

    it('DOIT gérer coordinateJournal avec module isolé', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      await orchestrator.initializeModules();
      
      // Isoler le module journal pour déclencher mode dégradé
      await orchestrator.isolateFailingModule('journal');
      
      const event = { type: 'DEGRADED_TEST', data: 'test' };
      
      // Mode dégradé ne doit pas faire crash
      await orchestrator.coordinateJournal(event);
      expect(orchestrator.metrics.journalIntegrity).toBe(true);
    });

    it('DOIT gérer exception dans coordinateJournal', async () => {
      const mockJournalManager = {
        appendEntry: vi.fn().mockRejectedValue(new Error('Journal write failed'))
      };
      
      const orchestrator = new PrismCoreOrchestrator({
        journalManager: mockJournalManager
      });
      
      await orchestrator.initializeModules();
      
      const event = { type: 'ERROR_TEST', data: 'test' };
      
      // Cette ligne devrait déclencher le catch block du journal
      await orchestrator.coordinateJournal(event);
      expect(orchestrator.metrics.journalIntegrity).toBe(false);
    });
  });

  describe('IdempotentPrismCore - Branches manquantes', () => {
    it('DOIT gérer processDecision avec core non initialisé', async () => {
      const core = new IdempotentPrismCore();
      // Ne pas initialiser le core
      
      const decision = { id: 'uninit-test', type: 'TEST' };
      
      await expect(core.processDecision(decision)).rejects.toThrow('Core not initialized');
    });

    it('DOIT gérer différents types de décisions dans _processDecisionDeterministic', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true, fixedTimestamp: 1000 });
      
      // Tester tous les types de décision pour coverage branches switch
      const decisionTypes = [
        { type: 'ANALYSIS', expected: 'analysis_complete' },
        { type: 'SYSTEM_CHECK', expected: 'system_healthy' },
        { type: 'PERFORMANCE_ANALYSIS', expected: 'performance_analyzed' },
        { type: 'UNKNOWN_TYPE', expected: 'generic_processing_complete' }
      ];
      
      for (const { type, expected } of decisionTypes) {
        const decision = { id: `test-${type}`, type, payload: {} };
        const result = await core.processDecision(decision);
        expect(result.output.result).toBe(expected);
      }
    });

    it('DOIT gérer différents cas dans _getResourcesUsed', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ mockProviders: false, deterministic: true });
      
      // Test avec mockProviders false
      const decision1 = { id: 'res1', type: 'ANALYSIS', payload: {} };
      const result1 = await core.processDecision(decision1);
      expect(result1.metrics.resourcesUsed).toContain('cpu');
      expect(result1.metrics.resourcesUsed).toContain('network'); // ANALYSIS type
      
      // Test avec mockProviders true
      await core.reset();
      await core.initialize({ mockProviders: true, deterministic: true });
      
      const decision2 = { id: 'res2', type: 'OTHER', payload: {} };
      const result2 = await core.processDecision(decision2);
      expect(result2.metrics.resourcesUsed).toEqual(['cpu', 'memory', 'disk']);
    });

    it('DOIT gérer restoreFromSnapshot avec erreur', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      // Snapshot invalide pour déclencher catch block
      const invalidSnapshot = {
        coreState: null, // Invalid state
        moduleSnapshots: new Map()
      };
      
      const result = await core.restoreFromSnapshot(invalidSnapshot);
      expect(result).toBe(false);
    });

    it('DOIT gérer _checkStateConsistency avec états incohérents', async () => {
      const core = new IdempotentPrismCore();
      
      // État incohérent : initialisé sans modules
      core.coreState.isInitialized = true;
      core.coreState.moduleStates = new Map();
      
      const integrity = await core.validateStateIntegrity();
      expect(integrity.isValid).toBe(false);
      expect(integrity.violations).toContain('state_inconsistency');
      
      // État incohérent : non initialisé avec modules
      core.coreState.isInitialized = false;
      core.coreState.moduleStates = new Map([['test', {}]]);
      
      const integrity2 = await core.validateStateIntegrity();
      expect(integrity2.isValid).toBe(false);
    });

    it('DOIT gérer compareStates avec différences multiples', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true, fixedTimestamp: 1000 });
      
      const state1 = await core.getSystemState();
      
      // Créer state2 avec différences multiples
      const state2 = {
        ...state1,
        timestamp: 2000, // Différent timestamp
        configHash: 'different_config', // Différent config hash
        coreState: {
          ...state1.coreState,
          errorCount: 5 // Différent error count
        }
      };
      
      const comparison = await core.compareStates(state1, state2);
      expect(comparison.identical).toBe(false);
      expect(comparison.differences).toContain('timestamp_mismatch');
      expect(comparison.differences).toContain('config_hash_mismatch');
      expect(comparison.differences).toContain('error_count_mismatch');
      expect(comparison.toleranceViolations.length).toBeGreaterThan(0);
    });
  });

  describe('FailoverPrismCore - Branches manquantes', () => {
    it('DOIT gérer processWithFailover avec request critique sans fallback', async () => {
      const core = new FailoverPrismCore();
      
      const config = {
        primary: {
          openai: { apiKey: 'invalid' }
        },
        backup: {
          local: { enabled: false },
          fallback: { mode: 'disabled' }
        },
        timeouts: { total: 1000 }
      };
      
      await core.initializeWithProviders(config);
      
      const criticalRequest = {
        id: 'critical-fail',
        type: 'consensus',
        payload: { decision: 'critical' },
        requiresAPI: true,
        allowDegraded: false, // No fallback allowed
        priority: 'critical'
      };
      
      const result = await core.processWithFailover(criticalRequest);
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.provider === 'all')).toBe(true);
    });

    it('DOIT gérer _getSafeDefault avec différents comportements', async () => {
      const core = new FailoverPrismCore();
      
      const safeDefaults = {
        responses: new Map([['validation', { valid: true }]]),
        fallbackBehaviors: new Map([
          ['text_generation', 'return_template'],
          ['analysis', 'return_cached'],
          ['consensus', 'require_manual_approval'],
          ['unknown', 'unknown_behavior']
        ]),
        degradedCapabilities: []
      };
      
      core.setSafeDefaults(safeDefaults);
      
      // Test tous les comportements
      const requests = [
        { type: 'text_generation', expected: { template: true } },
        { type: 'analysis', expected: { cached: true } },
        { type: 'consensus', expected: { manual: true } },
        { type: 'validation', expected: { valid: true } },
        { type: 'unknown_type', expected: null }
      ];
      
      for (const { type, expected } of requests) {
        const request = { type, payload: {} };
        const result = core._getSafeDefault(request);
        if (expected) {
          expect(result).toMatchObject(expected);
        } else {
          expect(result).toBeNull();
        }
      }
    });

    it('DOIT gérer _updateCircuitBreaker avec succès et échec', async () => {
      const core = new FailoverPrismCore();
      
      await core.initializeWithProviders({
        primary: { test: { apiKey: 'test' } },
        backup: {},
        timeouts: { total: 1000 }
      });
      
      // Test succès - reset failure count
      core._updateCircuitBreaker('test', true);
      const cb1 = core.circuitBreakers.get('test');
      expect(cb1.failureCount).toBe(0);
      expect(cb1.state).toBe('closed');
      
      // Test échecs multiples - ouvrir circuit
      for (let i = 0; i < 6; i++) {
        core._updateCircuitBreaker('test', false);
      }
      
      const cb2 = core.circuitBreakers.get('test');
      expect(cb2.failureCount).toBe(6);
      expect(cb2.state).toBe('open');
      expect(cb2.nextAttempt).toBeGreaterThan(Date.now());
    });

    it('DOIT gérer _isProviderAvailable avec circuit half-open', async () => {
      const core = new FailoverPrismCore();
      
      await core.initializeWithProviders({
        primary: { test: { apiKey: 'test' } },
        backup: {},
        timeouts: { total: 1000 }
      });
      
      // Mettre circuit en half-open avec timeout expiré
      const cb = core.circuitBreakers.get('test');
      cb.state = 'half-open';
      cb.nextAttempt = Date.now() - 1000; // Timeout expiré
      
      const available = core._isProviderAvailable('test');
      expect(available).toBe(true);
      
      // Test avec timeout pas encore expiré
      cb.state = 'open';
      cb.nextAttempt = Date.now() + 10000;
      
      const notAvailable = core._isProviderAvailable('test');
      expect(notAvailable).toBe(false);
    });

    it('DOIT gérer différents types de mock responses', async () => {
      const core = new FailoverPrismCore();
      
      const requests = [
        { type: 'text_generation', payload: { prompt: 'test' }, expected: 'text' },
        { type: 'analysis', payload: {}, expected: 'analysis' },
        { type: 'consensus', payload: {}, expected: 'consensus' },
        { type: 'validation', payload: {}, expected: 'valid' },
        { type: 'unknown', payload: {}, expected: 'result' }
      ];
      
      for (const { type, payload, expected } of requests) {
        const result = core._generateMockResponse({ type, payload });
        expect(result).toHaveProperty(expected);
      }
    });
  });

  describe('MetricsPrismCore - Branches manquantes', () => {
    it('DOIT gérer measureDuration avec exception dans operation', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      const failingOperation = async () => {
        throw new Error('Operation failed');
      };
      
      await expect(
        core.measureDuration('failing_operation', failingOperation, { module: 'test' })
      ).rejects.toThrow('Operation failed');
      
      // Vérifier que le timer est quand même enregistré avec tag error
      const metrics = await core.getMetrics();
      const timer = Array.from(metrics.timers.values()).find(t => 
        t.name === 'failing_operation' && t.tags.error === 'true'
      );
      expect(timer).toBeDefined();
    });

    it('DOIT gérer _shouldLog avec différents niveaux', async () => {
      const core = new MetricsPrismCore();
      
      // Test avec niveau warn
      await core.initializeMetrics({ logLevel: 'warn' });
      
      // Ces logs ne doivent pas passer
      expect(core._shouldLog('debug')).toBe(false);
      expect(core._shouldLog('info')).toBe(false);
      
      // Ces logs doivent passer
      expect(core._shouldLog('warn')).toBe(true);
      expect(core._shouldLog('error')).toBe(true);
      expect(core._shouldLog('critical')).toBe(true);
    });

    it('DOIT gérer _matchesFilter avec tous les types de filtres', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      core.recordMetric('test_metric', 42, { 
        module: 'test_module', 
        environment: 'test',
        custom: 'value'
      });
      
      const metrics = await core.getMetrics();
      const testMetric = Array.from(metrics.gauges.values())[0];
      
      // Test filtre par modules
      expect(core._matchesFilter(testMetric, { modules: ['test_module'] })).toBe(true);
      expect(core._matchesFilter(testMetric, { modules: ['other_module'] })).toBe(false);
      
      // Test filtre par metricNames
      expect(core._matchesFilter(testMetric, { metricNames: ['test_metric'] })).toBe(true);
      expect(core._matchesFilter(testMetric, { metricNames: ['other_metric'] })).toBe(false);
      
      // Test filtre par tags
      expect(core._matchesFilter(testMetric, { tags: { module: 'test_module' } })).toBe(true);
      expect(core._matchesFilter(testMetric, { tags: { module: 'wrong' } })).toBe(false);
      
      // Test filtre combiné
      expect(core._matchesFilter(testMetric, { 
        modules: ['test_module'],
        metricNames: ['test_metric'],
        tags: { environment: 'test' }
      })).toBe(true);
    });

    it('DOIT gérer exportLogs avec format non supporté', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      await expect(
        core.exportLogs('unsupported_format')
      ).rejects.toThrow('Unsupported export format: unsupported_format');
    });

    it('DOIT gérer _cleanupOldMetrics sans retentionPolicy', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Ne pas configurer retention policy
      core.retentionPolicy = null;
      
      // Ajouter quelques métriques
      core.recordMetric('old_metric', 1, { module: 'test' });
      core.incrementCounter('old_counter', { module: 'test' });
      
      // Cleanup ne doit pas faire crash
      core._cleanupOldMetrics();
      
      // Métriques doivent toujours être là (pas de policy)
      const metrics = await core.getMetrics();
      expect(metrics.gauges.size).toBeGreaterThan(0);
      expect(metrics.counters.size).toBeGreaterThan(0);
    });

    it('DOIT gérer _publishRealTimeMetrics avec realTime disabled', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Ne pas activer real-time
      core.realTimeConfig = { enabled: false };
      
      // Publish ne doit pas émettre d'événement
      let eventEmitted = false;
      core.on('metrics:realtime', () => {
        eventEmitted = true;
      });
      
      core._publishRealTimeMetrics();
      expect(eventEmitted).toBe(false);
    });

    it('DOIT gérer _calculatePercentiles avec array vide', async () => {
      const core = new MetricsPrismCore();
      
      const percentiles = core._calculatePercentiles([]);
      expect(percentiles.get(50)).toBe(undefined); // Array vide
      
      // Test avec un seul élément
      const singlePercentiles = core._calculatePercentiles([42]);
      expect(singlePercentiles.get(50)).toBe(42);
      expect(singlePercentiles.get(95)).toBe(42);
      expect(singlePercentiles.get(99)).toBe(42);
    });
  });
});
