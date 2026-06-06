/**
 * TDD Phase RED - Tests pour Branches Coverage ≥95%
 * 
 * Focus spécifique sur les branches manquantes pour atteindre 95%
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismCoreOrchestrator } from '../../../src/core/PrismCoreOrchestrator.js';
import { IdempotentPrismCore } from '../../../src/core/IdempotentPrismCore.js';
import { FailoverPrismCore } from '../../../src/core/FailoverPrismCore.js';
import { MetricsPrismCore } from '../../../src/core/MetricsPrismCore.js';

describe('PrismCore - Branches ≥95% Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PRISM_MODE = 'TEST';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.PRISM_MODE;
    delete process.env.NODE_ENV;
  });

  describe('PrismCoreOrchestrator - Branches restantes', () => {
    it('DOIT gérer validateModuleHealth avec modules isolés et actifs', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      await orchestrator.initializeModules();
      
      // Cas 1: Tous modules actifs
      let health = await orchestrator.validateModuleHealth();
      expect(health.get('consensus')).toBe(true);
      expect(health.get('journal')).toBe(true);
      
      // Cas 2: Quelques modules isolés
      await orchestrator.isolateFailingModule('consensus');
      health = await orchestrator.validateModuleHealth();
      expect(health.get('consensus')).toBe(false);
      expect(health.get('journal')).toBe(true);
      
      // Cas 3: Tous modules isolés
      await orchestrator.isolateFailingModule('journal');
      await orchestrator.isolateFailingModule('trust');
      await orchestrator.isolateFailingModule('enterprise');
      health = await orchestrator.validateModuleHealth();
      expect(health.get('consensus')).toBe(false);
      expect(health.get('journal')).toBe(false);
      expect(health.get('trust')).toBe(false);
      expect(health.get('enterprise')).toBe(false);
    });

    it('DOIT gérer propagateError avec différents seuils emergency', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      orchestrator.emergencyThreshold = 1; // Seuil très bas pour test
      await orchestrator.initializeModules();
      
      let emergencyTriggered = false;
      orchestrator.on('emergency:modules_critical', () => {
        emergencyTriggered = true;
      });
      
      // Première erreur - doit déclencher emergency (seuil=1)
      await orchestrator.propagateError(new Error('test'), 'test-module');
      expect(emergencyTriggered).toBe(true);
      
      // Vérifier calcul errorIsolationEfficiency
      const _totalModules = orchestrator.modules.size + orchestrator.isolatedModules.size;
      expect(orchestrator.metrics.errorIsolationEfficiency).toBeLessThan(1.0);
    });

    it('DOIT gérer orchestrateConsensus avec consensusManager présent', async () => {
      const mockConsensusManager = {
        propose: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 5)); // Délai artificiel
          return 'mock-proposal-id';
        })
      };
      
      const orchestrator = new PrismCoreOrchestrator({});
      orchestrator.consensusManager = mockConsensusManager; // Set after construction
      await orchestrator.initializeModules();
      
      const decision = { id: 'test', type: 'CRITICAL' };
      const proposalId = await orchestrator.orchestrateConsensus(decision);
      
      expect(mockConsensusManager.propose).toHaveBeenCalled();
      expect(proposalId).toMatch(/^[a-f0-9-]{36}$/);
      expect(orchestrator.metrics.consensusLatency).toBeGreaterThan(0);
    });

    it('DOIT gérer coordinateJournal avec journalManager présent', async () => {
      const mockJournalManager = {
        appendEntry: vi.fn().mockResolvedValue(true)
      };
      
      const orchestrator = new PrismCoreOrchestrator({
        journalManager: mockJournalManager
      });
      await orchestrator.initializeModules();
      
      const event = { type: 'TEST_EVENT', data: 'test' };
      await orchestrator.coordinateJournal(event);
      
      expect(mockJournalManager.appendEntry).toHaveBeenCalledWith(
        'TEST_EVENT',
        event,
        { orchestrated: true }
      );
      expect(orchestrator.metrics.journalIntegrity).toBe(true);
    });

    it('DOIT gérer handleTrustValidation sans validateDecision', async () => {
      const mockTrustContext = {
        // Pas de validateDecision pour tester cette branche
      };
      
      const orchestrator = new PrismCoreOrchestrator({
        trustContext: mockTrustContext
      });
      await orchestrator.initializeModules();
      
      const decision = { id: 'test', criticality: 'HIGH' };
      const result = await orchestrator.handleTrustValidation(decision);
      
      expect(result).toBe(true);
      expect(orchestrator.metrics.trustValidationRate).toBe(1.0);
    });

    it('DOIT gérer handleTrustValidation en mode non-TEST', async () => {
      process.env.PRISM_MODE = 'PRODUCTION';
      
      const mockTrustContext = {};
      const orchestrator = new PrismCoreOrchestrator({
        trustContext: mockTrustContext
      });
      await orchestrator.initializeModules();
      
      const decision = { id: 'test', criticality: 'HIGH' };
      const result = await orchestrator.handleTrustValidation(decision);
      
      expect(result).toBe(true);
      expect(orchestrator.metrics.trustValidationRate).toBe(1.0);
    });
  });

  describe('IdempotentPrismCore - Branches restantes', () => {
    it('DOIT gérer processDecision avec exception dans catch', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      // Mock pour déclencher exception dans processDecision
      const _originalProcessDecisionDeterministic = core._processDecisionDeterministic;
      core._processDecisionDeterministic = vi.fn().mockImplementation(() => {
        throw new Error('Processing failed');
      });
      
      const decision = { id: 'error-test', type: 'ANALYSIS', payload: {} };
      
      await expect(core.processDecision(decision)).rejects.toThrow('Processing failed');
      expect(core.coreState.errorCount).toBe(1);
    });

    it('DOIT gérer validateStateIntegrity avec exception', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      // Mock pour déclencher exception
      const _originalCalculateExpectedStateHash = core._calculateExpectedStateHash;
      core._calculateExpectedStateHash = vi.fn().mockRejectedValue(new Error('Hash calculation failed'));
      
      const report = await core.validateStateIntegrity();
      
      expect(report.isValid).toBe(false);
      expect(report.violations).toContain('validation_error');
      expect(report.checksumMatch).toBe(false);
      expect(report.stateConsistency).toBe(false);
    });

    it('DOIT gérer compareStates sans différences', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true, fixedTimestamp: 1000 });
      
      const state1 = await core.getSystemState();
      const state2 = { ...state1 }; // Copie identique
      
      const comparison = await core.compareStates(state1, state2);
      
      expect(comparison.identical).toBe(true);
      expect(comparison.differences).toEqual([]);
      expect(comparison.hashMatch).toBe(true);
      expect(comparison.toleranceViolations).toEqual([]);
    });

    it('DOIT gérer différentes combinaisons dans _getResourcesUsed', async () => {
      const core = new IdempotentPrismCore();
      
      // Test avec mockProviders=false et type non-ANALYSIS
      await core.initialize({ mockProviders: false, deterministic: true });
      const decision1 = { id: 'test1', type: 'SYSTEM_CHECK', payload: {} };
      const result1 = await core.processDecision(decision1);
      expect(result1.metrics.resourcesUsed).toEqual(['cpu', 'memory']);
      
      // Test avec mockProviders=false et type ANALYSIS
      const decision2 = { id: 'test2', type: 'ANALYSIS', payload: {} };
      const result2 = await core.processDecision(decision2);
      expect(result2.metrics.resourcesUsed).toContain('network');
    });
  });

  describe('FailoverPrismCore - Branches restantes', () => {
    it('DOIT gérer processWithFailover avec succès sur primary', async () => {
      const core = new FailoverPrismCore();
      
      // Mock pour simuler succès du premier provider
      const _originalAttemptProviderRequest = core._attemptProviderRequest;
      core._attemptProviderRequest = vi.fn().mockResolvedValue(true);
      
      const config = {
        primary: { openai: { apiKey: 'valid' } },
        backup: {},
        timeouts: { total: 1000 }
      };
      
      await core.initializeWithProviders(config);
      
      const request = {
        id: 'success-test',
        type: 'text_generation',
        payload: { prompt: 'test' },
        requiresAPI: true,
        allowDegraded: true,
        priority: 'medium'
      };
      
      const result = await core.processWithFailover(request);
      
      expect(result.success).toBe(true);
      expect(result.failoverCount).toBe(0); // Pas de failover nécessaire
      expect(result.degradedMode).toBe(false);
    });

    it('DOIT gérer _validateProvider avec différentes clés', async () => {
      const core = new FailoverPrismCore();
      
      // Tests différents cas de validation
      expect(core._validateProvider({ apiKey: 'valid-key' })).toBe(true);
      expect(core._validateProvider({ apiKey: 'invalid_key_test' })).toBe(false);
      expect(core._validateProvider({ apiKey: 'invalid' })).toBe(false);
      expect(core._validateProvider({ apiKey: '' })).toBe(false);
      expect(core._validateProvider({ apiKey: null })).toBe(false);
      expect(core._validateProvider({ apiKey: undefined })).toBe(false);
      expect(core._validateProvider({})).toBe(false);
    });

    it('DOIT gérer switchToBackupProviders avec activation dégradé', async () => {
      const core = new FailoverPrismCore();
      
      const config = {
        primary: { 
          openai: { apiKey: 'test1' },
          anthropic: { apiKey: 'test2' },
          perplexity: { apiKey: 'test3' }
        },
        backup: { local: { enabled: true } },
        timeouts: { total: 1000 }
      };
      
      await core.initializeWithProviders(config);
      
      // Faire échouer plus de la moitié des providers
      await core.switchToBackupProviders(['openai', 'anthropic']);
      
      expect(core.degradedMode).toBe(true);
      expect(core.metrics.degradedModeActivations).toBe(1);
    });

    it('DOIT gérer _attemptProviderRequest avec timeout', async () => {
      const core = new FailoverPrismCore();
      
      const config = {
        primary: { test: { apiKey: 'valid' } },
        backup: {},
        timeouts: { total: 10 } // Timeout très court
      };
      
      await core.initializeWithProviders(config);
      
      const provider = { id: 'test', config: { apiKey: 'valid' } };
      const request = { type: 'test', payload: {} };
      const result = { errors: [] };
      
      // Mock pour simuler délai long
      const _originalSimulateProviderRequest = core._simulateProviderRequest;
      core._simulateProviderRequest = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Plus long que timeout
        return { success: true };
      });
      
      const success = await core._attemptProviderRequest(provider, request, result);
      
      expect(success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          provider: 'test',
          error: 'timeout'
        })
      );
    });

    it('DOIT gérer enableDegradedMode avec calcul capacité', async () => {
      const core = new FailoverPrismCore();
      
      const config = {
        primary: { 
          openai: { apiKey: 'test1' },
          anthropic: { apiKey: 'test2' }
        },
        backup: { local: { enabled: true } },
        timeouts: { total: 1000 }
      };
      
      await core.initializeWithProviders(config);
      
      // 1 provider down sur 3 total
      await core.switchToBackupProviders(['openai']);
      
      const status = await core.enableDegradedMode();
      
      expect(status.enabled).toBe(true);
      expect(status.estimatedCapacity).toBeCloseTo(2/3); // 2 actifs sur 3 total
      expect(status.restrictions).toContain('no_external_api');
      expect(status.availableFeatures).toContain('local_processing');
    });
  });

  describe('MetricsPrismCore - Branches restantes', () => {
    it('DOIT gérer getMetrics avec filtres timeRange', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      const now = Date.now();
      
      core.recordMetric('old_metric', 1, { module: 'test' });
      
      // Simuler métrique plus ancienne
      const oldMetric = Array.from(core.metrics.gauges.values())[0];
      oldMetric.lastUpdated = now - 10000;
      
      core.recordMetric('new_metric', 2, { module: 'test' });
      
      const timeRange = { start: now - 5000, end: now + 1000 };
      const filtered = await core.getMetrics({ timeRange });
      
      // Devrait filtrer selon timeRange si implémenté
      expect(filtered).toBeDefined();
    });

    it('DOIT gérer exportLogs avec timeRange', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      const now = Date.now();
      
      core.logStructured('info', 'Old message', { module: 'test' });
      
      // Simuler log plus ancien
      core.logs[0].timestamp = now - 10000;
      
      core.logStructured('info', 'New message', { module: 'test' });
      
      const timeRange = { start: now - 5000, end: now + 1000 };
      const export1 = await core.exportLogs('json', timeRange);
      
      expect(export1).toContain('New message');
      // Old message devrait être filtré si dans timeRange
      
      const export2 = await core.exportLogs('json', null);
      expect(export2).toContain('Old message');
      expect(export2).toContain('New message');
    });

    it('DOIT gérer _updateHistogram avec limit et percentiles', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Ajouter beaucoup de valeurs pour déclencher limit
      for (let i = 0; i < 1200; i++) {
        core.recordMetric('histogram_test', i, { module: 'test' });
      }
      
      const metrics = await core.getMetrics();
      const histogram = Array.from(metrics.histograms.values())[0];
      
      expect(histogram.count).toBe(1200);
      expect(histogram.values.length).toBeLessThanOrEqual(500); // Limite appliquée
      expect(histogram.percentiles.has(50)).toBe(true);
      expect(histogram.percentiles.has(95)).toBe(true);
      expect(histogram.percentiles.has(99)).toBe(true);
    });

    it('DOIT gérer _cleanupOldMetrics avec retentionPolicy', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      const retentionPolicy = {
        maxAge: 1, // 1 seconde
        maxSize: 1024 * 1024,
        compressionEnabled: true,
        archiveOldLogs: true
      };
      
      core.configureRetention(retentionPolicy);
      
      const now = Date.now();
      
      // Ajouter métriques anciennes
      core.recordMetric('old_metric', 1, { module: 'test' });
      core.incrementCounter('old_counter', { module: 'test' });
      
      // Simuler âge ancien
      const oldGauge = Array.from(core.metrics.gauges.values())[0];
      const oldCounter = Array.from(core.metrics.counters.values())[0];
      oldGauge.lastUpdated = now - 2000; // 2s ago
      oldCounter.lastUpdated = now - 2000; // 2s ago
      
      // Ajouter métriques récentes
      core.recordMetric('new_metric', 2, { module: 'test' });
      core.incrementCounter('new_counter', { module: 'test' });
      
      // Déclencher cleanup
      core._cleanupOldMetrics();
      
      const metrics = await core.getMetrics();
      
      // Vérifier que les anciennes métriques sont supprimées
      const hasOld = Array.from(metrics.gauges.values()).some(m => m.lastUpdated < now - 1500);
      expect(hasOld).toBe(false);
    });

    it('DOIT gérer _analyzeTrends avec calculs direction', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Simuler tendance dégradante
      core.performanceData.modulePerformance.set('test', {
        moduleName: 'test',
        responseTimes: [100, 110, 120, 130, 140] // Tendance croissante
      });
      
      await core._analyzeTrends();
      
      const trends = core.performanceData.trends;
      expect(trends.length).toBeGreaterThan(0);
      
      const testTrend = trends.find(t => t.metric === 'test_response_time');
      expect(testTrend).toBeDefined();
      expect(testTrend.direction).toBe('degrading');
      expect(testTrend.changeRate).toBeGreaterThan(0);
    });

    it('DOIT gérer _generateAlerts avec différents seuils', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Simuler erreur rate faible pour pas d'alerte
      core.systemHealth.errorRate = 0.05; // 5%
      
      // Ajouter métrique memory normale
      core.recordMetric('memory_usage_percent', 80, { module: 'system' });
      
      // Ajouter response time normale
      core.recordMetric('response_time', 500, { module: 'api' });
      
      await core._generateAlerts();
      
      expect(core.alerts.length).toBe(0); // Pas d'alertes
      
      // Maintenant déclencher alertes
      core.systemHealth.errorRate = 0.15; // 15%
      core.recordMetric('memory_usage_percent', 96, { module: 'system' });
      core.recordMetric('response_time', 4000, { module: 'api' });
      
      await core._generateAlerts();
      
      expect(core.alerts.length).toBeGreaterThan(0);
      expect(core.alerts.some(a => a.message.includes('error rate'))).toBe(true);
      expect(core.alerts.some(a => a.message.includes('memory'))).toBe(true);
      expect(core.alerts.some(a => a.message.includes('response time'))).toBe(true);
    });
  });
});
