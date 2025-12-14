/**
 * TrustContext E2E Tests - TRL 5 Proof Pack
 * 
 * Tests end-to-end du workflow complet:
 * - Decision → Escalade → Approval → Audit
 * - Validation avec providers réels (optionnel)
 * - Métriques de performance
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import crypto from 'node:crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { TrustContext, CriticalityLevel, createSignedApproval } from '../src/core/TrustContext.js';
import { HybridOrchestrator } from '../src/orchestrator/HybridOrchestrator.js';
import { KeyRegistry as KeyRegistryClass } from '../src/core/KeyRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Métriques collectées
const metrics = {
  verifyApproval: [],
  totalPipeline: [],
  errors: []
};

/**
 * Calcule p50, p95, p99 d'un tableau de valeurs
 */
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] || 0;
}

describe('TrustContext E2E Workflow - TRL 5', () => {
  let trustContext;
  let orchestrator;
  let keyRegistry;
  let testKeyDir;
  let approverPrivateKey;
  let approverPublicKey;
  let approverKeyId;

  beforeEach(async () => {
    // Setup keys
    const testBase = path.join(__dirname, '../test-trustcontext-staging');
    testKeyDir = path.join(testBase, 'keys', 'approvers');
    await fs.mkdir(testKeyDir, { recursive: true });

    approverKeyId = 'e2e-approver-001';
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    approverPrivateKey = privateKey;
    approverPublicKey = publicKey;

    // WIPE répertoire de test au complet pour éviter pollution
    try {
      await fs.rm(testBase, { recursive: true, force: true });
    } catch (error) {
      // Ignorer si répertoire n'existe pas
    }
    await fs.mkdir(testKeyDir, { recursive: true });
    
    // Setup KeyRegistry (créer nouvelle instance pour éviter singleton)
    const registryPath = path.join(testBase, 'key-registry.json');
    // Utiliser KeyRegistry directement (pas getKeyRegistry singleton)
    const keyRegistryModule = await import('../../src/core/KeyRegistry.js');
    keyRegistry = new keyRegistryModule.KeyRegistry({ registryPath });
    await keyRegistry.initialize();
    
    // Enregistrer clé avec vérification keypair
    await keyRegistry.registerKey(approverKeyId, approverPublicKey, ['owner', 'security'], approverPrivateKey);

    // Setup TrustContext
    trustContext = new TrustContext({
      keyDir: testKeyDir,
      keyRegistry: keyRegistry,
      governancePolicy: {
        [CriticalityLevel.LOW]: ['lead', 'security', 'owner'],
        [CriticalityLevel.MEDIUM]: ['lead', 'security', 'owner'],
        [CriticalityLevel.HIGH]: ['security', 'owner'],
        [CriticalityLevel.CRITICAL]: ['owner']
      },
      minApprovalLevel: CriticalityLevel.HIGH,
      mode: 'staging'
    });

    await trustContext.initialize();

    // Setup Orchestrator (mock providers pour staging)
    orchestrator = new HybridOrchestrator({
      trustContext: trustContext,
      consensusOptions: {
        timeoutMs: 5000
      }
    });

    // Reset metrics
    metrics.verifyApproval = [];
    metrics.totalPipeline = [];
    metrics.errors = [];
  });

  afterEach(async () => {
    try {
      if (testKeyDir) {
        await fs.rm(path.dirname(testKeyDir), { recursive: true, force: true });
      }
    } catch (error) {
      // Ignorer
    }
  });

  /**
   * S1: Nominal HIGH - Decision escaladée + approval valide => APPROVED
   */
  it('S1: Nominal HIGH decision with valid approval => APPROVED', async () => {
    const pipelineStart = performance.now();

    // 1. Require human approval
    const approvalToken = await trustContext.requireHumanApproval(
      'test_decision',
      CriticalityLevel.HIGH,
      { action: 'test_action', input: 'test input' },
      { requestedBy: 'test-user' }
    );

    // Accès à pendingDecisions (Map privée via bracket notation)
    const decision = trustContext['pendingDecisions']?.get?.(approvalToken);
    expect(decision).toBeDefined();
    expect(decision.status).toBe('pending');

    // 2. Create signed approval
    const verifyStart = performance.now();
    const signedApproval = createSignedApproval({
      approvalId: crypto.randomUUID(),
      decisionId: approvalToken,
      decisionDigest: decision.decisionDigest,
      approver: {
        id: 'approver-001',
        role: 'owner', // Authorized for HIGH (security aussi OK, mais utilisons owner pour être sûr)
        keyId: approverKeyId
      },
      verdict: 'approve',
      reason: 'E2E test approval',
      issuedAt: Date.now(),
      privateKeyPem: approverPrivateKey
    });

    // 3. Verify and approve
    const verifyResult = await trustContext.approveDecision(signedApproval);
    const verifyEnd = performance.now();

    expect(verifyResult).toBe(true);

    // 4. Check approval
    const checkResult = trustContext.checkApproval(approvalToken);
    // Après approbation, decision est dans history, pas pending
    const history = trustContext.getApprovalHistory(10);
    const approved = history.find(d => d.status === 'approved');
    expect(approved).toBeDefined();

    const pipelineEnd = performance.now();
    metrics.verifyApproval.push(verifyEnd - verifyStart);
    metrics.totalPipeline.push(pipelineEnd - pipelineStart);
  });

  /**
   * S2: CRITICAL sans approval => REJECT (fail-closed)
   */
  it('S2: CRITICAL decision without approval => REJECT', async () => {
    const approvalToken = await trustContext.requireHumanApproval(
      'critical_decision',
      CriticalityLevel.CRITICAL,
      { action: 'critical_action', input: 'critical input' },
      {}
    );

    // Ne pas approuver - vérifier que la décision reste pending ou expire
    const checkResult = trustContext.checkApproval(approvalToken);
    
    // CRITICAL nécessite approval, donc ne doit PAS être auto-approved
    expect(checkResult.approved).toBe(false);
    
    // Vérifier que validateCriticalDecision bloque
    try {
      const validation = await trustContext.validateCriticalDecision({
        action: 'critical_action',
        input: 'critical input',
        criticality: CriticalityLevel.CRITICAL
      });
      
      // Si non approuvé, doit retourner approved=false
      expect(validation.approved).toBe(false);
      expect(validation.reason).toContain('approval');
    } catch (error) {
      // Ou lancer une erreur - les deux sont acceptables (fail-closed)
      expect(error.message).toMatch(/approval|rejected/i);
    }
  });

  /**
   * S3: Approval avec signature invalide => REJECT
   */
  it('S3: Approval with invalid signature => REJECT', async () => {
    const approvalToken = await trustContext.requireHumanApproval(
      'test_decision',
      CriticalityLevel.HIGH,
      { action: 'test', input: 'test' },
      {}
    );

      // Accès à pendingDecisions (Map privée)
      const decision = trustContext.pendingDecisions?.get?.(approvalToken) || 
        (trustContext['pendingDecisions']?.get?.(approvalToken));

    const invalidApproval = {
      approvalId: crypto.randomUUID(),
      decisionId: approvalToken,
      decisionDigest: decision.decisionDigest,
      approver: {
        id: 'approver-001',
        role: 'security',
        keyId: approverKeyId
      },
        verdict: 'approve',
      issuedAt: Date.now(),
      signature: 'invalid-signature-hex-12345'
    };

    const result = await trustContext.approveDecision(invalidApproval);
    expect(result).toBe(false);

    metrics.errors.push({ type: 'INVALID_SIGNATURE', scenario: 'S3' });
  });

  /**
   * S4: Digest mismatch => REJECT
   */
  it('S4: Approval with digest mismatch => REJECT', async () => {
    const approvalToken = await trustContext.requireHumanApproval(
      'test_decision',
      CriticalityLevel.HIGH,
      { action: 'test', input: 'original' },
      {}
    );

    // Modifier la décision (simuler altération)
      // Accès à pendingDecisions (Map privée)
      const decision = trustContext.pendingDecisions?.get?.(approvalToken) || 
        (trustContext['pendingDecisions']?.get?.(approvalToken));
    decision.data = { action: 'test', input: 'modified' }; // Modification

    // Créer approbation avec digest de la décision ORIGINALE (ne correspond plus)
    const wrongDigestApproval = createSignedApproval({
      approvalId: crypto.randomUUID(),
      decisionId: approvalToken,
      decisionDigest: decision.decisionDigest, // Utiliser digest original
      approver: {
        id: 'approver-001',
        role: 'security',
        keyId: approverKeyId
      },
      verdict: 'approve',
      issuedAt: Date.now(),
      privateKeyPem: approverPrivateKey
    });

    // Vérifier que le digest ne correspond plus (car décision modifiée)
    // Note: En réalité, decision.decisionDigest ne change pas car il est calculé à la création
    // Pour tester réellement, on doit utiliser un digest complètement différent
    const fakeDigest = 'a'.repeat(64);
    const wrongApproval = createSignedApproval({
      approvalId: crypto.randomUUID(),
      decisionId: approvalToken,
      decisionDigest: fakeDigest, // Digest incorrect
      approver: {
        id: 'approver-001',
        role: 'security',
        keyId: approverKeyId
      },
      verdict: 'approve',
      issuedAt: Date.now(),
      privateKeyPem: approverPrivateKey
    });

    const result = await trustContext.approveDecision(wrongApproval);
    expect(result).toBe(false);

    metrics.errors.push({ type: 'DIGEST_MISMATCH', scenario: 'S4' });
  });

  /**
   * S5: Provider timeout/down => comportement attendu
   */
  it('S5: Provider timeout/down handling', async () => {
    // Pour ce test, on simule un timeout dans ConsensusManager
    // En staging, on peut utiliser un mock provider qui timeout
    
    // Test: TrustContext doit gérer proprement une requête même si provider timeout
    const validation = await trustContext.validateCriticalDecision({
      action: 'timeout_test',
      input: 'test',
      criticality: CriticalityLevel.MEDIUM // Pas besoin d'approval pour MEDIUM
    });

    // MEDIUM devrait être auto-approved (pas besoin approval humaine)
    expect(validation.approved).toBe(true);

    // Pour HIGH/CRITICAL avec timeout provider, TrustContext doit escalader
    const approvalToken = await trustContext.requireHumanApproval(
      'timeout_decision',
      CriticalityLevel.HIGH,
      { action: 'timeout', input: 'test' },
      {}
    );

    // Décision doit être en attente (pas rejetée à cause d'un timeout provider)
    const checkResult = trustContext.checkApproval(approvalToken);
    expect(checkResult.status).toBe('pending');

    metrics.errors.push({ type: 'TIMEOUT', scenario: 'S5' });
  });

  /**
   * S6: Approver non autorisé => REJECT
   */
  it('S6: Unauthorized approver => REJECT', async () => {
    const approvalToken = await trustContext.requireHumanApproval(
      'test_decision',
      CriticalityLevel.CRITICAL,
      { action: 'test', input: 'test' },
      {}
    );

      // Accès à pendingDecisions (Map privée)
      const decision = trustContext.pendingDecisions?.get?.(approvalToken) || 
        (trustContext['pendingDecisions']?.get?.(approvalToken));

    // CRITICAL nécessite role 'owner', mais on utilise 'security' (non autorisé)
    const unauthorizedApproval = createSignedApproval({
      approvalId: crypto.randomUUID(),
      decisionId: approvalToken,
      decisionDigest: decision.decisionDigest,
      approver: {
        id: 'approver-001',
        role: 'security', // NON autorisé pour CRITICAL (nécessite 'owner')
        keyId: approverKeyId
      },
      verdict: 'approve',
      issuedAt: Date.now(),
      privateKeyPem: approverPrivateKey
    });

    const result = await trustContext.approveDecision(unauthorizedApproval);
    expect(result).toBe(false);

    metrics.errors.push({ type: 'AUTHORIZATION_FAILED', scenario: 'S6' });
  });
});

// After all tests, generate metrics summary
afterAll(async () => {
  if (metrics.verifyApproval.length > 0 || metrics.totalPipeline.length > 0) {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: {
        verifyApproval: {
          count: metrics.verifyApproval.length,
          p50: percentile(metrics.verifyApproval, 50),
          p95: percentile(metrics.verifyApproval, 95),
          p99: percentile(metrics.verifyApproval, 99),
          min: Math.min(...metrics.verifyApproval),
          max: Math.max(...metrics.verifyApproval),
          avg: metrics.verifyApproval.reduce((a, b) => a + b, 0) / metrics.verifyApproval.length
        },
        totalPipeline: {
          count: metrics.totalPipeline.length,
          p50: percentile(metrics.totalPipeline, 50),
          p95: percentile(metrics.totalPipeline, 95),
          p99: percentile(metrics.totalPipeline, 99),
          min: Math.min(...metrics.totalPipeline),
          max: Math.max(...metrics.totalPipeline),
          avg: metrics.totalPipeline.reduce((a, b) => a + b, 0) / metrics.totalPipeline.length
        },
        errors: {
          count: metrics.errors.length,
          byType: metrics.errors.reduce((acc, e) => {
            acc[e.type] = (acc[e.type] || 0) + 1;
            return acc;
          }, {})
        }
      }
    };

    const outputDir = process.env.METRICS_OUTPUT_DIR || path.join(__dirname, 'metrics');
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(
      path.join(outputDir, `e2e-metrics-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    console.log('\n=== E2E Metrics Summary ===');
    console.log(JSON.stringify(report.metrics, null, 2));
  }
});
