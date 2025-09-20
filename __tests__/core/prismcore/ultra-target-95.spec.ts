/**
 * TDD Phase RED - Tests ULTRA-CIBLÉS pour ≥95% L/B/F STRICT
 * 
 * Ciblage précis des dernières lignes et branches non couvertes
 * pour atteindre exactement ≥95% sur CHAQUE fichier
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismCoreOrchestrator } from '../../../src/core/PrismCoreOrchestrator.js';
import { IdempotentPrismCore } from '../../../src/core/IdempotentPrismCore.js';
import { FailoverPrismCore } from '../../../src/core/FailoverPrismCore.js';
import { MetricsPrismCore } from '../../../src/core/MetricsPrismCore.js';

describe('PrismCore - ULTRA-TARGET ≥95% Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PRISM_MODE = 'TEST';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.PRISM_MODE;
    delete process.env.NODE_ENV;
  });

  describe('PrismCoreOrchestrator - Dernier 5% (94.97→95%)', () => {
    it('DOIT gérer isolateFailingModule avec module déjà isolé', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      await orchestrator.initializeModules();
      
      // Première isolation
      await orchestrator.isolateFailingModule('test-module');
      expect(orchestrator.isolatedModules.has('test-module')).toBe(true);
      expect(orchestrator.modules.has('test-module')).toBe(false);
      
      // Seconde isolation du même module (devrait gérer gracieusement)
      await orchestrator.isolateFailingModule('test-module');
      expect(orchestrator.isolatedModules.has('test-module')).toBe(true);
    });

    it('DOIT gérer validateModuleHealth avec modules vides', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      // Ne pas initialiser de modules - tester avec maps vides
      
      const health = await orchestrator.validateModuleHealth();
      expect(health).toBeInstanceOf(Map);
      expect(health.size).toBe(0);
    });

    it('DOIT gérer getOrchestratorMetrics dans tous les états', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      
      // État initial
      let metrics = await orchestrator.getOrchestratorMetrics();
      expect(metrics.activeModules).toBe(0);
      expect(metrics.failedModules).toBe(0);
      
      // Après initialisation
      await orchestrator.initializeModules();
      metrics = await orchestrator.getOrchestratorMetrics();
      expect(metrics.activeModules).toBe(4);
      
      // Après isolations
      await orchestrator.isolateFailingModule('test1');
      await orchestrator.isolateFailingModule('test2');
      metrics = await orchestrator.getOrchestratorMetrics();
      expect(metrics.failedModules).toBe(2);
    });

    it('DOIT gérer initializeModules avec modules déjà existants', async () => {
      const orchestrator = new PrismCoreOrchestrator({});
      
      // Première initialisation
      await orchestrator.initializeModules();
      const initialSize = orchestrator.modules.size;
      
      // Re-initialisation (doit gérer modules existants)
      await orchestrator.initializeModules();
      expect(orchestrator.modules.size).toBe(initialSize);
    });
  });

  describe('IdempotentPrismCore - Dernier 1.64% (98.36→100%)', () => {
    it('DOIT gérer simulateError avec tous les types possibles', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ deterministic: true });
      
      // Test tous les types d'erreur pour coverage complète
      const errorTypes = ['timeout', 'network', 'memory', 'corruption', 'unknown'];
      
      for (const errorType of errorTypes) {
        const decision = { id: `error-${errorType}`, type: 'TEST' };
        
        await core.simulateError(errorType, decision.id);
        expect(core.coreState.errorCount).toBeGreaterThan(0);
        
        // Vérifier que l'erreur est trackée
        const state = await core.getSystemState();
        expect(state.coreState.errorCount).toBeGreaterThan(0);
      }
    });

    it('DOIT gérer _calculateExpectedStateHash avec tous les params', async () => {
      const core = new IdempotentPrismCore();
      await core.initialize({ 
        deterministic: true,
        fixedTimestamp: 1000,
        customSalt: 'test-salt'
      });
      
      // Forcer recalcul avec différents états
      core.coreState.errorCount = 5;
      core.coreState.lastOperation = 'test-operation';
      
      const hash1 = await core._calculateExpectedStateHash();
      expect(hash1).toBeDefined();
      
      // Changer état et vérifier hash différent
      core.coreState.errorCount = 10;
      const hash2 = await core._calculateExpectedStateHash();
      expect(hash2).toBeDefined();
      expect(hash1).not.toBe(hash2);
    });

    it('DOIT gérer tous les cas dans _checkStateConsistency', async () => {
      const core = new IdempotentPrismCore();
      
      // Cas 1: Core non initialisé avec modules
      core.coreState.isInitialized = false;
      core.coreState.moduleStates.set('test', { initialized: true });
      
      let consistent = core._checkStateConsistency();
      expect(consistent).toBe(false);
      
      // Cas 2: Core initialisé sans modules
      core.coreState.isInitialized = true;
      core.coreState.moduleStates.clear();
      
      consistent = core._checkStateConsistency();
      expect(consistent).toBe(false);
      
      // Cas 3: État cohérent
      core.coreState.moduleStates.set('test', { initialized: true });
      consistent = core._checkStateConsistency();
      expect(consistent).toBe(true);
    });
  });

  describe('FailoverPrismCore - Dernier 12.38% (87.62→95%)', () => {
    it('DOIT gérer _simulateProviderRequest avec tous types de réponse', async () => {
      const core = new FailoverPrismCore();
      
      // Tester tous les types pour coverage complète
      const requests = [
        { type: 'text_generation', payload: { prompt: 'test', model: 'gpt-4' } },
        { type: 'image_generation', payload: { description: 'test image' } },
        { type: 'audio_transcription', payload: { audio: 'base64data' } },
        { type: 'code_completion', payload: { code: 'function test() {' } },
        { type: 'data_analysis', payload: { data: [1, 2, 3] } },
        { type: 'translation', payload: { text: 'hello', target: 'fr' } },
        { type: 'summarization', payload: { text: 'long text here' } },
        { type: 'unknown_type', payload: { custom: 'data' } }
      ];
      
      for (const request of requests) {
        const result = await core._simulateProviderRequest({ config: { apiKey: 'valid' } }, request);
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      }
    });

    it('DOIT gérer configureFailover avec différentes stratégies', async () => {
      const core = new FailoverPrismCore();
      
      // Test toutes les stratégies possibles
      const strategies = [
        { type: 'circuit_breaker', maxFailures: 3, resetTimeout: 30000 },
        { type: 'retry_exponential', maxRetries: 5, baseDelay: 1000 },
        { type: 'load_balancing', algorithm: 'round_robin' },
        { type: 'fallback_only', enableDegraded: true },
        { type: 'manual_override', autoSwitch: false }
      ];
      
      for (const strategy of strategies) {
        await core.configureFailover(strategy);
        expect(core.failoverStrategy).toMatchObject(strategy);
      }
    });

    it('DOIT gérer emergency protocols avec différents triggers', async () => {
      const core = new FailoverPrismCore();
      await core.initializeWithProviders({
        primary: { test: { apiKey: 'test' } },
        backup: { local: { enabled: true } },
        timeouts: { total: 1000 }
      });
      
      // Test emergency triggers
      const triggers = [
        'all_providers_down',
        'critical_latency_spike',
        'data_corruption_detected',
        'security_breach_suspected',
        'resource_exhaustion'
      ];
      
      for (const trigger of triggers) {
        const result = await core.activateEmergencyProtocol(trigger);
        expect(result.activated).toBe(true);
        expect(result.trigger).toBe(trigger);
        expect(result.timestamp).toBeDefined();
      }
    });

    it('DOIT gérer _handleProviderResponse avec toutes les réponses', async () => {
      const core = new FailoverPrismCore();
      
      // Réponses de succès variées
      const successResponses = [
        { success: true, data: 'text response' },
        { success: true, data: { structured: 'data' } },
        { success: true, data: [1, 2, 3] },
        { success: true, data: null }, // Edge case
        { success: true } // No data field
      ];
      
      for (const response of successResponses) {
        const result = core._handleProviderResponse('test', response);
        expect(result.success).toBe(true);
      }
      
      // Réponses d'erreur variées
      const errorResponses = [
        { success: false, error: 'API key invalid' },
        { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
        { success: false, timeout: true },
        { success: false }, // No error field
        null, // Null response
        undefined // Undefined response
      ];
      
      for (const response of errorResponses) {
        const result = core._handleProviderResponse('test', response);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('MetricsPrismCore - Dernier 9.93% (90.07→95%)', () => {
    it('DOIT gérer configureRetention avec toutes les options', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Test configuration complète de retention
      const retentionConfigs = [
        {
          maxAge: 86400000, // 1 day
          maxSize: 100 * 1024 * 1024, // 100MB
          compressionEnabled: true,
          archiveOldLogs: true,
          rotationInterval: 'daily',
          archiveFormat: 'gzip'
        },
        {
          maxAge: 3600000, // 1 hour
          maxSize: 10 * 1024 * 1024, // 10MB
          compressionEnabled: false,
          archiveOldLogs: false,
          rotationInterval: 'hourly',
          archiveFormat: 'json'
        }
      ];
      
      for (const config of retentionConfigs) {
        core.configureRetention(config);
        expect(core.retentionPolicy).toMatchObject(config);
      }
    });

    it('DOIT gérer generateSystemReport avec toutes les sections', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Ajouter données variées pour rapport complet
      core.recordMetric('cpu_usage', 75, { module: 'system' });
      core.recordMetric('memory_usage', 85, { module: 'system' });
      core.incrementCounter('requests_total', { endpoint: '/api/test' });
      core.measureDuration('operation_time', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      }, { operation: 'test' });
      
      // Options de rapport
      const reportOptions = [
        { includeMetrics: true, includeAlerts: true, includeTrends: true },
        { includeMetrics: true, includeAlerts: false, includeTrends: false },
        { format: 'json' },
        { format: 'html' },
        { timeRange: { start: Date.now() - 3600000, end: Date.now() } }
      ];
      
      for (const options of reportOptions) {
        const report = await core.generateSystemReport(options);
        expect(report).toBeDefined();
        if (options.includeMetrics !== false) {
          expect(report.metrics).toBeDefined();
        }
      }
    });

    it('DOIT gérer _detectAnomalies avec différents patterns', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Simuler patterns d'anomalie
      const anomalyPatterns = [
        { type: 'spike', values: [10, 10, 10, 100, 10, 10] }, // Pic soudain
        { type: 'drop', values: [50, 50, 50, 5, 50, 50] }, // Chute soudaine
        { type: 'trend', values: [10, 20, 30, 40, 50, 60] }, // Tendance croissante
        { type: 'oscillation', values: [10, 50, 10, 50, 10, 50] }, // Oscillation
        { type: 'flatline', values: [25, 25, 25, 25, 25, 25] } // Ligne plate
      ];
      
      for (const pattern of anomalyPatterns) {
        // Créer série temporelle
        for (let i = 0; i < pattern.values.length; i++) {
          core.recordMetric(`${pattern.type}_metric`, pattern.values[i], { 
            module: 'test',
            timestamp: Date.now() + (i * 1000)
          });
        }
        
        await core._detectAnomalies();
        
        // Vérifier détection selon le type
        const anomalies = core.anomalies.filter(a => a.metric.includes(pattern.type));
        if (pattern.type !== 'flatline') {
          expect(anomalies.length).toBeGreaterThan(0);
        }
      }
    });

    it('DOIT gérer _updateSystemHealth avec calculs complexes', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Simuler données système variées
      core.recordMetric('cpu_usage_percent', 90, { module: 'system' });
      core.recordMetric('memory_usage_percent', 95, { module: 'system' });
      core.recordMetric('disk_usage_percent', 85, { module: 'system' });
      core.recordMetric('network_latency_ms', 200, { module: 'network' });
      core.recordMetric('error_rate_percent', 12, { module: 'application' });
      
      // Ajouter erreurs pour calculs
      core.errorAnalysis.errorCounts.set('critical', 5);
      core.errorAnalysis.errorCounts.set('warning', 15);
      core.errorAnalysis.errorCounts.set('info', 100);
      
      await core._updateSystemHealth();
      
      expect(core.systemHealth.score).toBeLessThan(100); // Dégradé
      expect(core.systemHealth.status).not.toBe('healthy');
      expect(core.systemHealth.criticalIssues.length).toBeGreaterThan(0);
    });

    it('DOIT gérer clearMetrics avec sélection partielle', async () => {
      const core = new MetricsPrismCore();
      await core.initializeMetrics({ logLevel: 'info' });
      
      // Ajouter métriques variées
      core.recordMetric('metric1', 1, { module: 'test1' });
      core.recordMetric('metric2', 2, { module: 'test2' });
      core.incrementCounter('counter1', { module: 'test1' });
      core.incrementCounter('counter2', { module: 'test2' });
      
      // Clear sélectif par module
      await core.clearMetrics({ modules: ['test1'] });
      
      const metrics = await core.getMetrics();
      const test1Metrics = Array.from(metrics.gauges.values()).filter(m => 
        m.tags && m.tags.module === 'test1'
      );
      expect(test1Metrics.length).toBe(0);
      
      const test2Metrics = Array.from(metrics.gauges.values()).filter(m => 
        m.tags && m.tags.module === 'test2'
      );
      expect(test2Metrics.length).toBeGreaterThan(0);
    });
  });
});
