/**
 * TDD Phase RED FINALE - Tests ultra-précis pour atteindre ≥95% L/B/F sur TOUS les fichiers
 * 
 * Objectif: Les derniers 5-12% manquants sur chaque fichier
 * Approche: Un test = une branche/ligne spécifique identifiée via coverage HTML
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismCoreOrchestrator } from '../../../src/core/PrismCoreOrchestrator.js';
import { IdempotentPrismCore } from '../../../src/core/IdempotentPrismCore.js';
import { FailoverPrismCore } from '../../../src/core/FailoverPrismCore.js';
import { MetricsPrismCore } from '../../../src/core/MetricsPrismCore.js';

describe('PrismCore - FINAL PUSH ≥95% L/B/F', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PRISM_MODE = 'TEST';
  });

  afterEach(() => {
    delete process.env.PRISM_MODE;
  });

  describe('PrismCoreOrchestrator - 90% → 95% Branches', () => {
    it('BRANCHE: initializeModules avec modules déjà dans la map', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      
      // Pré-remplir modules pour tester branche d'existence
      orchestrator.modules.set('consensus', { initialized: true });
      orchestrator.modules.set('journal', { initialized: true });
      
      // Re-initialiser - doit gérer modules existants
      await orchestrator.initializeModules();
      
      expect(orchestrator.modules.has('consensus')).toBe(true);
      expect(orchestrator.modules.has('journal')).toBe(true);
    });

    it('BRANCHE: validateModuleHealth avec moduleHealth vide mais modules présents', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      await orchestrator.initializeModules();
      
      // Clear moduleHealth mais garder modules
      orchestrator.moduleHealth.clear();
      
      const health = await orchestrator.validateModuleHealth();
      expect(health).toBeInstanceOf(Map);
    });
  });

  describe('IdempotentPrismCore - 89% → 95% Branches', () => {
    it('BRANCHE: initialize avec config.mockProviders absent (undefined path)', async () => {
      const core = new IdempotentPrismCore();
      
      // Config sans mockProviders défini
      const config = { deterministic: true, fixedTimestamp: 1000 };
      await core.initialize(config);
      
      expect(core.coreState.isInitialized).toBe(true);
    });

    it('BRANCHE: _calculateExpectedStateHash avec config.customSalt absent', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true }); // Pas de customSalt
      
      const hash = await core._calculateExpectedStateHash();
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('BRANCHE: compareStates avec tolerance violations mais states "similaires"', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true, fixedTimestamp: 1000 });
      
      const state1 = await core.getSystemState();
      const state2 = {
        ...state1,
        timestamp: state1.timestamp + 50, // Léger décalage (dans tolérance)
        configHash: state1.configHash
      };
      
      const comparison = await core.compareStates(state1, state2);
      
      // Doit détecter différence timestamp mais dans tolérance
      expect(comparison.identical).toBe(false);
      expect(comparison.differences).toContain('timestamp_mismatch');
    });

    it('BRANCHE: takeSnapshot avec modules ayant différents états', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      // Clear les modules existants et ajouter nos modules de test
      core.coreState.moduleStates.clear();
      core.coreState.moduleStates.set('module1', { status: 'active', data: { value: 1 } });
      core.coreState.moduleStates.set('module2', { status: 'inactive', data: null });
      
      const snapshot = await core.takeSnapshot();
      
      expect(snapshot.moduleSnapshots.size).toBe(2);
      expect(snapshot.moduleSnapshots.get('module1')).toBeDefined();
      expect(snapshot.moduleSnapshots.get('module2')).toBeDefined();
    });
  });

  describe('FailoverPrismCore - 90% → 95% Lines & Branches', () => {
    it('BRANCHE: processWithFailover avec backup providers disponibles', async () => {
      const core = new FailoverPrismCore();
      
      await core.initializeWithProviders({
        primary: { 
          primary1: { apiKey: 'invalid_key_test' } // Provider primaire invalide
        },
        backup: { 
          backup1: { apiKey: 'valid_backup', enabled: true }
        },
        timeouts: { total: 1000 }
      });
      
      const request = {
        id: 'backup-test',
        type: 'text_generation',
        payload: { prompt: 'test' },
        requiresAPI: true,
        allowDegraded: true,
        priority: 'medium'
      };
      
      const result = await core.processWithFailover(request);
      expect(result.failoverCount).toBeGreaterThan(0); // A utilisé backup
    });

    it('BRANCHE: switchToBackupProviders avec activateBackupProviders', async () => {
      const core = new FailoverPrismCore();
      
      await core.initializeWithProviders({
        primary: { 
          p1: { apiKey: 'valid' },
          p2: { apiKey: 'valid' }
        },
        backup: { 
          b1: { apiKey: 'valid_backup', enabled: true }
        },
        timeouts: { total: 1000 }
      });
      
      // Activer les backups
      await core.switchToBackupProviders(['p1', 'p2']);
      
      const backupProvider = core.providers.get('b1');
      expect(backupProvider).toBeDefined();
    });

    it('BRANCHE: _getSafeDefault avec request non-reconnu (default null)', async () => {
      const core = new FailoverPrismCore();
      
      const request = {
        type: 'completely_unknown_operation_type',
        payload: { custom: 'data' }
      };
      
      const safeDefault = core._getSafeDefault(request);
      expect(safeDefault).toBeNull(); // Default case
    });

    it('BRANCHE: enableDegradedMode avec calcul estimatedCapacity', async () => {
      const core = new FailoverPrismCore();
      
      await core.initializeWithProviders({
        primary: { 
          p1: { apiKey: 'valid' },
          p2: { apiKey: 'invalid_key_test' },
          p3: { apiKey: 'valid' }
        },
        backup: { 
          b1: { apiKey: 'valid' }
        },
        timeouts: { total: 1000 }
      });
      
      const status = await core.enableDegradedMode();
      
      // 3 valides sur 4 total
      expect(status.estimatedCapacity).toBeCloseTo(0.75);
      expect(status.restrictions).toContain('no_external_api');
    });

    it('BRANCHE: _simulateProviderRequest avec provider config invalide (authentication failed)', async () => {
      const core = new FailoverPrismCore();
      
      const invalidProvider = { 
        id: 'invalid', 
        config: { apiKey: 'invalid_key_test' } 
      };
      const request = { type: 'test', payload: {} };
      
      await expect(
        core._simulateProviderRequest(invalidProvider, request)
      ).rejects.toThrow('authentication_failed');
    });
  });

  describe('MetricsPrismCore - 83% → 95% Branches (le plus dur)', () => {
    it('BRANCHE: initializeMetrics avec config.metricsRetention présent', async () => {
      const core = new MetricsPrismCore();
      
      const config = {
        logLevel: 'info',
        metricsRetention: { enabled: true, maxAge: 3600000 },
        flushInterval: 1000
      };
      
      await core.initializeMetrics(config);
      
      expect(core.config.metricsRetention).toBeDefined();
    });

    it('BRANCHE: getMetrics avec filtres multiples combinés', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Créer métriques diversifiées
      core.recordMetric('cpu_usage', 80, { module: 'system', environment: 'prod' });
      core.recordMetric('memory_usage', 70, { module: 'system', environment: 'test' });
      core.recordMetric('api_latency', 150, { module: 'api', environment: 'prod' });
      
      const filter = {
        modules: ['system'],
        metricNames: ['cpu_usage'],
        tags: { environment: 'prod' }
      };
      
      const filtered = await core.getMetrics(filter);
      
      // Doit filtrer selon tous les critères
      const cpuMetrics = Array.from(filtered.gauges.values()).filter(m => 
        m.name === 'cpu_usage' && m.tags.environment === 'prod'
      );
      expect(cpuMetrics.length).toBe(1);
    });

    it('BRANCHE: exportLogs avec timeRange filtering actif', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      const now = Date.now();
      
      // Log ancien (hors timeRange)
      core.logStructured('info', 'Old log', { module: 'test' });
      core.logs[core.logs.length - 1].timestamp = now - 10000;
      
      // Log récent (dans timeRange)  
      core.logStructured('info', 'Recent log', { module: 'test' });
      
      const timeRange = { start: now - 5000, end: now + 1000 };
      const exportedRecent = await core.exportLogs('json', timeRange);
      
      expect(exportedRecent).toContain('Recent log');
      expect(exportedRecent).not.toContain('Old log'); // Filtré par timeRange
    });

    it('BRANCHE: _cleanupOldMetrics avec retentionPolicy.compressionEnabled', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      core.retentionPolicy = {
        maxAge: 1, // 1 milliseconde pour test
        compressionEnabled: true,
        archiveOldLogs: true
      };
      
      // Créer métriques anciennes
      core.recordMetric('old_metric', 42, { module: 'test' });
      const oldMetric = Array.from(core.metrics.gauges.values())[0];
      oldMetric.lastUpdated = Date.now() - 2000; // 2s ago (bien avant cutoff)
      
      const beforeCount = core.metrics.gauges.size;
      core._cleanupOldMetrics();
      
      // Doit supprimer métriques anciennes
      expect(core.metrics.gauges.size).toBeLessThan(beforeCount);
    });

    it('BRANCHE: _updateHistogram avec values.length exactement à la limite', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Ajouter exactement 501 valeurs pour déclencher le slice
      for (let i = 0; i < 501; i++) {
        core.recordMetric('limit_test', i, { module: 'test' });
      }
      
      const metrics = await core.getMetrics();
      const histogram = Array.from(metrics.histograms.values())[0];
      
      expect(histogram.count).toBe(501);
      expect(histogram.values.length).toBe(500); // Clamped à 500
    });

    it('BRANCHE: _getPercentile avec index edge cases', async () => {
      const core = new MetricsPrismCore();
      
      // Test avec array de taille exacte pour edge cases d\'index
      const values = [1, 2, 3, 4, 5]; // 5 éléments
      
      const p50 = core._getPercentile(values, 0.5);
      const p95 = core._getPercentile(values, 0.95);
      const p99 = core._getPercentile(values, 0.99);
      
      expect(p50).toBeDefined();
      expect(p95).toBeDefined();
      expect(p99).toBeDefined();
    });

    it('BRANCHE: _analyzeTrends avec direction calculation complexe', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Simuler data avec trend oscillant (ni improving ni degrading clairement)
      core.performanceData.modulePerformance.set('oscillating', {
        moduleName: 'oscillating',
        responseTimes: [100, 200, 100, 200, 100, 200] // Pattern oscillant
      });
      
      await core._analyzeTrends();
      
      const trends = core.performanceData.trends;
      const oscillatingTrend = trends.find(t => t.metric === 'oscillating_response_time');
      
      expect(oscillatingTrend).toBeDefined();
      expect(['stable', 'improving', 'degrading']).toContain(oscillatingTrend.direction);
    });

    it('BRANCHE: logStructured avec metadata PII detection', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Log avec potentiel PII
      const sensitiveMetadata = {
        userId: 'user123',
        email: 'test@example.com',
        password: 'secret123',
        module: 'auth'
      };
      
      core.logStructured('info', 'User action', sensitiveMetadata);
      
      const logs = core.getLogs('info');
      const latestLog = logs[logs.length - 1];
      
      // Vérifier que les PII sont masqués/filtrés
      expect(latestLog.metadata.password).toBeUndefined();
    });

    it('BRANCHE: recordMetric avec tags null/undefined handling', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Test avec tags null
      core.recordMetric('test_null', 42, null);
      
      // Test avec tags undefined
      core.recordMetric('test_undefined', 43);
      
      const metrics = await core.getMetrics();
      expect(metrics.gauges.size).toBe(2);
    });
  });
});
