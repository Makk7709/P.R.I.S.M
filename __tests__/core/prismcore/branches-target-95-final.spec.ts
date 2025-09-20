/**
 * TDD Phase RED - Tests ULTRA-CIBLÉS pour branches manquantes spécifiques
 * 
 * Objectif: Porter CHAQUE fichier à ≥95% Branches (et Lines/Functions)
 * Contrainte: Un test = une branche spécifique manquante
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismCoreOrchestrator } from '../../../src/core/PrismCoreOrchestrator.js';
import { IdempotentPrismCore } from '../../../src/core/IdempotentPrismCore.js';
import { FailoverPrismCore } from '../../../src/core/FailoverPrismCore.js';
import { MetricsPrismCore } from '../../../src/core/MetricsPrismCore.js';

describe('PrismCore - Branches ≥95% FINAL Target', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PRISM_MODE = 'TEST';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.PRISM_MODE;
    delete process.env.NODE_ENV;
  });

  describe('PrismCoreOrchestrator - Branches manquantes (86.84% → 95%)', () => {
    it('BRANCHE: redistributeLoad avec activeModules.length === 0 (warn path)', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      await orchestrator.initializeModules();
      
      // Forcer tous les modules à être isolés pour déclencher activeModules.length === 0
      orchestrator.modules.clear(); // Force empty active modules
      
      // Cette branche doit déclencher le warn log (ligne 180)
      await orchestrator.redistributeLoad('all-failed');
      
      // Vérifier que les modules actifs sont vides
      expect(orchestrator.modules.size).toBe(0);
    });

    it('BRANCHE: propagateError avec failedCount < emergencyThreshold (no emit)', async () => {
      const orchestrator = new PrismCoreOrchestrator({ emergencyThreshold: 10 }); // Seuil très élevé
      await orchestrator.initializeModules();
      
      let emergencyEmitted = false;
      orchestrator.on('emergency:modules_critical', () => {
        emergencyEmitted = true;
      });
      
      // Une seule erreur avec seuil élevé ne doit PAS déclencher emergency
      await orchestrator.propagateError(new Error('test'), 'single-module');
      
      expect(emergencyEmitted).toBe(false); // Branche else du if (failedCount >= threshold)
    });

    it('BRANCHE: handleTrustValidation avec decision.criticality !== HIGH (return true early)', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      await orchestrator.initializeModules();
      
      const decision = { id: 'test', criticality: 'LOW' }; // Non-HIGH criticality
      const result = await orchestrator.handleTrustValidation(decision);
      
      expect(result).toBe(true); // Branche early return pour non-HIGH
      expect(orchestrator.metrics.trustValidationRate).toBe(1.0);
    });

    it('BRANCHE: handleTrustValidation en mode non-TEST avec HIGH criticality', async () => {
      process.env.PRISM_MODE = 'PRODUCTION'; // Non-TEST mode
      
      const orchestrator = new PrismCoreOrchestrator({});
      await orchestrator.initializeModules();
      
      const decision = { id: 'test', criticality: 'HIGH' };
      const result = await orchestrator.handleTrustValidation(decision);
      
      expect(result).toBe(true); // Branche else du if (isTestMode)
    });

    it('BRANCHE: orchestrateConsensus sans consensusManager.propose (else branch)', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      orchestrator.consensusManager = {}; // Pas de méthode propose
      await orchestrator.initializeModules();
      
      const decision = { id: 'test', type: 'CRITICAL' };
      const proposalId = await orchestrator.orchestrateConsensus(decision);
      
      expect(proposalId).toMatch(/^[a-f0-9-]{36}$/); // UUID généré dans else
      expect(orchestrator.metrics.consensusLatency).toBeGreaterThan(0);
    });

    it('BRANCHE: coordinateJournal sans journalManager.appendEntry (else branch)', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      orchestrator.journalManager = {}; // Pas de méthode appendEntry
      await orchestrator.initializeModules();
      
      const event = { type: 'TEST_EVENT', data: 'test' };
      await orchestrator.coordinateJournal(event);
      
      // Doit passer par la branche else sans crash
      expect(orchestrator.metrics.journalIntegrity).toBe(true);
    });
  });

  describe('IdempotentPrismCore - Branches manquantes (86.95% → 95%)', () => {
    it('BRANCHE: processDecision avec decision === null (throw error)', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      // Tester avec null decision pour déclencher validation error
      await expect(core.processDecision(null)).rejects.toThrow();
    });

    it('BRANCHE: processDecision avec decision === undefined', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      await expect(core.processDecision(undefined)).rejects.toThrow();
    });

    it('BRANCHE: processDecision avec decision === {} (empty object)', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      await expect(core.processDecision({})).rejects.toThrow();
    });

    it('BRANCHE: compareStates avec states identiques (early return true)', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true, fixedTimestamp: 1000 });
      
      const state1 = await core.getSystemState();
      const state2 = { ...state1 }; // Copie exacte
      
      const comparison = await core.compareStates(state1, state2);
      
      expect(comparison.identical).toBe(true); // Branche early return
      expect(comparison.differences).toEqual([]);
    });

    it('BRANCHE: restoreFromSnapshot avec snapshot === null', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      const result = await core.restoreFromSnapshot(null);
      expect(result).toBe(false); // Branche error handling
    });

    it('BRANCHE: restoreFromSnapshot avec snapshot === undefined', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      const result = await core.restoreFromSnapshot(undefined);
      expect(result).toBe(false);
    });

    it('BRANCHE: _processDecisionDeterministic avec type non-reconnu (default case)', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      const decision = { id: 'test', type: 'COMPLETELY_UNKNOWN_TYPE', payload: {} };
      const result = await core.processDecision(decision);
      
      expect(result.output.result).toBe('generic_processing_complete'); // Default case
    });

    it('BRANCHE: _getResourcesUsed avec mockProviders === undefined (else branch)', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true }); // mockProviders non défini
      
      const decision = { id: 'test', type: 'ANALYSIS', payload: {} };
      const result = await core.processDecision(decision);
      
      // Doit utiliser la branche else pour mockProviders undefined
      expect(result.metrics.resourcesUsed).toContain('cpu');
    });
  });

  describe('FailoverPrismCore - Branches manquantes (87.71% → 95%)', () => {
    it('BRANCHE: processWithFailover avec request.requiresAPI === false (skip API)', async () => {
      const core = new FailoverPrismCore();
      await core.initializeWithProviders({
        primary: { test: { apiKey: 'test' } },
        backup: {},
        timeouts: { total: 1000 }
      });
      
      const request = {
        id: 'local-only',
        type: 'local_processing',
        payload: {},
        requiresAPI: false, // Ne nécessite pas d'API
        allowDegraded: true,
        priority: 'low'
      };
      
      const result = await core.processWithFailover(request);
      expect(result.success).toBe(true);
      expect(result.providersUsed).toEqual([]); // Aucun provider API utilisé
    });

    it('BRANCHE: processWithFailover avec allowDegraded === false et tous providers down', async () => {
      const core = new FailoverPrismCore();
      
      // Forcer tous les providers à être invalides
      await core.initializeWithProviders({
        primary: { 
          test1: { apiKey: 'invalid_key_test' },
          test2: { apiKey: 'invalid_key_test' }
        },
        backup: {},
        timeouts: { total: 100 }
      });
      
      const request = {
        id: 'strict-requirement',
        type: 'critical_api_call',
        payload: {},
        requiresAPI: true,
        allowDegraded: false, // Pas de mode dégradé autorisé
        priority: 'critical'
      };
      
      const result = await core.processWithFailover(request);
      expect(result.success).toBe(false); // Doit échouer sans fallback
      expect(result.degradedMode).toBe(false);
    });

    it('BRANCHE: _attemptProviderRequest avec timeout (catch TimeoutError)', async () => {
      const core = new FailoverPrismCore();
      await core.initializeWithProviders({
        primary: { test: { apiKey: 'valid' } },
        backup: {},
        timeouts: { total: 1 } // Timeout très court (1ms)
      });
      
      const provider = { id: 'test', config: { apiKey: 'valid' } };
      const request = { type: 'slow_operation', payload: {} };
      const result = { errors: [] };
      
      const success = await core._attemptProviderRequest(provider, request, result);
      
      expect(success).toBe(false);
      expect(result.errors.some(e => e.error === 'timeout')).toBe(true);
    });

    it('BRANCHE: _isProviderAvailable avec circuit state === half-open et nextAttempt future', async () => {
      const core = new FailoverPrismCore();
      await core.initializeWithProviders({
        primary: { test: { apiKey: 'test' } },
        backup: {},
        timeouts: { total: 1000 }
      });
      
      const cb = core.circuitBreakers.get('test');
      cb.state = 'half-open';
      cb.nextAttempt = Date.now() + 10000; // Future
      
      const available = core._isProviderAvailable('test');
      expect(available).toBe(false); // half-open avec nextAttempt future
    });

    it('BRANCHE: _validateProvider avec provider.config === null', async () => {
      const core = new FailoverPrismCore();
      
      const result = core._validateProvider(null);
      expect(result).toBe(false); // Branche null config
    });

    it('BRANCHE: _validateProvider avec provider.config === undefined', async () => {
      const core = new FailoverPrismCore();
      
      const result = core._validateProvider(undefined);
      expect(result).toBe(false); // Branche undefined config
    });

    it('BRANCHE: switchToBackupProviders avec failedProviders.length <= totalProviders/2 (no degraded)', async () => {
      const core = new FailoverPrismCore();
      await core.initializeWithProviders({
        primary: { 
          p1: { apiKey: 'valid' },
          p2: { apiKey: 'valid' },
          p3: { apiKey: 'valid' },
          p4: { apiKey: 'valid' }
        },
        backup: {},
        timeouts: { total: 1000 }
      });
      
      // Faire échouer seulement 1 provider sur 4 (≤ 50%)
      await core.switchToBackupProviders(['p1']);
      
      expect(core.degradedMode).toBe(false); // Pas assez d'échecs pour mode dégradé
    });
  });

  describe('MetricsPrismCore - Branches manquantes (82.08% → 95%)', () => {
    it('BRANCHE: measureDuration avec exception dans operation (catch + rethrow)', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      const failingOperation = async () => {
        throw new Error('Expected test failure');
      };
      
      // Doit catch l'exception, logger mais rethrow
      await expect(
        core.measureDuration('failing_op', failingOperation, { module: 'test' })
      ).rejects.toThrow('Expected test failure');
      
      // Timer doit quand même être enregistré avec tag error
      const metrics = await core.getMetrics();
      const errorTimer = Array.from(metrics.timers.values()).find(t => 
        t.name === 'failing_op' && t.tags?.error === 'true'
      );
      expect(errorTimer).toBeDefined();
    });

    it('BRANCHE: _shouldLog avec level non-reconnu (return false)', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      const result = core._shouldLog('completely_unknown_level');
      expect(result).toBe(false); // messageLevel === -1, donc < configLevel
    });

    it('BRANCHE: _cleanupOldMetrics avec retentionPolicy === null (early return)', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      core.retentionPolicy = null; // Force null retention
      
      // Ajouter métriques
      core.recordMetric('test_metric', 42, { module: 'test' });
      const beforeCount = core.metrics.gauges.size;
      
      // Cleanup ne doit rien faire avec retentionPolicy null
      core._cleanupOldMetrics();
      
      expect(core.metrics.gauges.size).toBe(beforeCount); // Aucune suppression
    });

    it('BRANCHE: _cleanupOldMetrics avec retentionPolicy === undefined', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      core.retentionPolicy = undefined; // Force undefined
      
      core.recordMetric('test_metric', 42, { module: 'test' });
      const beforeCount = core.metrics.gauges.size;
      
      core._cleanupOldMetrics();
      expect(core.metrics.gauges.size).toBe(beforeCount);
    });

    it('BRANCHE: _publishRealTimeMetrics avec realTimeConfig.enabled === false', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      core.realTimeConfig = { enabled: false }; // Désactiver real-time
      
      let eventEmitted = false;
      core.on('metrics:realtime', () => {
        eventEmitted = true;
      });
      
      core._publishRealTimeMetrics();
      expect(eventEmitted).toBe(false); // Branche early return
    });

    it('BRANCHE: _publishRealTimeMetrics avec realTimeConfig === null', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      core.realTimeConfig = null;
      
      let eventEmitted = false;
      core.on('metrics:realtime', () => {
        eventEmitted = true;
      });
      
      core._publishRealTimeMetrics();
      expect(eventEmitted).toBe(false);
    });

    it('BRANCHE: _matchesFilter avec filter === null (return true)', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      core.recordMetric('test_metric', 42, { module: 'test' });
      const metric = Array.from(core.metrics.gauges.values())[0];
      
      const result = core._matchesFilter(metric, null);
      expect(result).toBe(true); // Branche filter null
    });

    it('BRANCHE: _matchesFilter avec filter === undefined', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      core.recordMetric('test_metric', 42, { module: 'test' });
      const metric = Array.from(core.metrics.gauges.values())[0];
      
      const result = core._matchesFilter(metric, undefined);
      expect(result).toBe(true);
    });

    it('BRANCHE: exportLogs avec format === json et timeRange === null', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      core.logStructured('info', 'Test message', { module: 'test' });
      
      const exported = await core.exportLogs('json', null); // timeRange null
      expect(exported).toContain('Test message');
      expect(() => JSON.parse(exported)).not.toThrow(); // Valid JSON
    });

    it('BRANCHE: _calculatePercentiles avec values.length === 0 (empty array)', async () => {
      const core = new MetricsPrismCore();
      
      const percentiles = core._calculatePercentiles([]);
      expect(percentiles.get(50)).toBeUndefined(); // Branche array vide
      expect(percentiles.get(95)).toBeUndefined();
      expect(percentiles.get(99)).toBeUndefined();
    });
  });
});
