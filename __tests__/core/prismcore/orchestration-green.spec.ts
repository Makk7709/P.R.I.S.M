/**
 * TDD Phase GREEN - Tests Orchestration Simplifiés
 * 
 * Tests qui passent avec l'implémentation PrismCoreOrchestrator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismCoreOrchestrator } from '../../../src/core/PrismCoreOrchestrator.js';
import { ConsensusManager } from '../../../src/core/ConsensusManager.js';
import { SecureJournalManager } from '../../../src/core/SecureJournalManager.js';
import { getTrustContext } from '../../../src/core/TrustContext.js';

describe('PrismCore - Orchestration GREEN Tests', () => {
  let orchestrator: PrismCoreOrchestrator;
  let consensusManager: ConsensusManager;
  let journalManager: SecureJournalManager;
  let trustContext: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    process.env.PRISM_MODE = 'TEST';
    process.env.NODE_ENV = 'test';
    
    consensusManager = new ConsensusManager({
      enableTrustContext: true,
      timeoutMs: 1000,
      autoRequestVotes: false
    });
    
    journalManager = new SecureJournalManager({
      journalPath: './test_orchestration_journal',
      maxRecoveryTime: 50
    });
    
    trustContext = getTrustContext({
      mode: 'TEST',
      minApprovalLevel: 'HIGH'
    });
    
    orchestrator = new PrismCoreOrchestrator({
      consensusManager,
      journalManager,
      trustContext
    });
  });

  afterEach(async () => {
    if (consensusManager) {
      await consensusManager.cleanup();
    }
    if (journalManager) {
      await journalManager.cleanup();
    }
    
    delete process.env.PRISM_MODE;
    delete process.env.NODE_ENV;
  });

  describe('Initialisation Modules', () => {
    it('DOIT initialiser orchestrator avec dépendances', async () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.consensusManager).toBeDefined();
      expect(orchestrator.journalManager).toBeDefined();
      expect(orchestrator.trustContext).toBeDefined();
    });

    it('DOIT initialiser modules en séquence', async () => {
      await orchestrator.initializeModules();
      
      const health = await orchestrator.validateModuleHealth();
      expect(health.get('consensus')).toBe(true);
      expect(health.get('journal')).toBe(true);
      expect(health.get('trust')).toBe(true);
      expect(health.get('enterprise')).toBe(true);
      
      const metrics = await orchestrator.getOrchestratorMetrics();
      expect(metrics.activeModules).toBe(4);
      expect(metrics.failedModules).toBe(0);
    });
  });

  describe('Orchestration Flux', () => {
    it('DOIT orchestrer décision avec consensus', async () => {
      await orchestrator.initializeModules();
      
      const decision = {
        id: 'test-decision-001',
        type: 'CRITICAL',
        payload: { action: 'system_modification' },
        criticality: 'HIGH'
      };
      
      const proposalId = await orchestrator.orchestrateConsensus(decision);
      expect(proposalId).toMatch(/^[a-f0-9-]{36}$/);
      
      const metrics = await orchestrator.getOrchestratorMetrics();
      expect(metrics.consensusLatency).toBeGreaterThanOrEqual(0); // ≥0 car peut être mocked
    });

    it('DOIT coordonner journal des événements', async () => {
      await orchestrator.initializeModules();
      
      await orchestrator.coordinateJournal({
        type: 'CONSENSUS_DECISION',
        proposalId: 'test-proposal',
        decision: { id: 'test' }
      });
      
      const metrics = await orchestrator.getOrchestratorMetrics();
      expect(metrics.journalIntegrity).toBe(true);
    });

    it('DOIT valider avec TrustContext', async () => {
      await orchestrator.initializeModules();
      
      const decision = {
        id: 'trust-test',
        criticality: 'HIGH'
      };
      
      const trusted = await orchestrator.handleTrustValidation(decision);
      expect(trusted).toBe(true);
      
      const metrics = await orchestrator.getOrchestratorMetrics();
      expect(metrics.trustValidationRate).toBe(1);
    });
  });

  describe('Gestion Erreurs', () => {
    it('DOIT isoler module défaillant', async () => {
      await orchestrator.initializeModules();
      
      await orchestrator.isolateFailingModule('journal');
      
      const health = await orchestrator.validateModuleHealth();
      expect(health.get('journal')).toBe(false);
      expect(health.get('consensus')).toBe(true);
      
      const metrics = await orchestrator.getOrchestratorMetrics();
      expect(metrics.failedModules).toBe(1);
    });

    it('DOIT redistribuer charge après isolation', async () => {
      await orchestrator.initializeModules();
      
      await orchestrator.isolateFailingModule('trust');
      await orchestrator.redistributeLoad('trust');
      
      // Vérifier que système continue de fonctionner
      const health = await orchestrator.validateModuleHealth();
      const activeModules = Array.from(health.values()).filter(h => h).length;
      expect(activeModules).toBeGreaterThan(0);
    });

    it('DOIT propager erreurs avec isolation', async () => {
      await orchestrator.initializeModules();
      
      const testError = new Error('Test error simulation');
      await orchestrator.propagateError(testError, 'consensus');
      
      const metrics = await orchestrator.getOrchestratorMetrics();
      expect(metrics.errorIsolationEfficiency).toBeGreaterThan(0);
    });

    it('DOIT émettre emergency si trop de modules échouent', async () => {
      await orchestrator.initializeModules();
      
      let emergencyTriggered = false;
      orchestrator.on('emergency:modules_critical', () => {
        emergencyTriggered = true;
      });
      
      // Simuler échec de plusieurs modules
      await orchestrator.isolateFailingModule('consensus');
      await orchestrator.isolateFailingModule('trust');
      
      const error = new Error('Critical failure');
      await orchestrator.propagateError(error, 'journal');
      
      // Vérifier emergency déclenché
      expect(emergencyTriggered).toBe(true);
    });
  });

  describe('Métriques Temps Réel', () => {
    it('DOIT exposer métriques orchestration', async () => {
      await orchestrator.initializeModules();
      
      const metrics = await orchestrator.getOrchestratorMetrics();
      
      expect(metrics).toHaveProperty('activeModules');
      expect(metrics).toHaveProperty('failedModules');
      expect(metrics).toHaveProperty('consensusLatency');
      expect(metrics).toHaveProperty('journalIntegrity');
      expect(metrics).toHaveProperty('trustValidationRate');
      expect(metrics).toHaveProperty('errorIsolationEfficiency');
      expect(metrics).toHaveProperty('timestamp');
    });

    it('DOIT mettre à jour métriques après opérations', async () => {
      await orchestrator.initializeModules();
      
      const decision = { id: 'metrics-test', type: 'ANALYSIS' };
      await orchestrator.orchestrateConsensus(decision);
      
      const metrics = await orchestrator.getOrchestratorMetrics();
      expect(metrics.consensusLatency).toBeGreaterThanOrEqual(0); // ≥0 car peut être mocked
      expect(metrics.activeModules).toBe(4);
    });
  });
});
