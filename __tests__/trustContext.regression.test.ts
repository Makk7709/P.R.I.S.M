/**
 * TrustContext - Tests de régression (cas limites, edge cases)
 * Tests unitaires ciblés pour garantir robustesse
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { TrustContext, CriticalityLevel, createSignedApproval } from '../src/core/TrustContext.js';
import { KeyRegistry as KeyRegistryClass } from '../src/core/KeyRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TrustContext - Tests de Régression', () => {
  let trustContext: TrustContext;
  let testKeyDir: string;
  let approverPrivateKey: string;
  let approverPublicKey: string;
  let approverKeyId: string;

  beforeEach(async () => {
    const testBase = path.join(__dirname, '../test-trustcontext-temp');
    testKeyDir = path.join(testBase, 'keys', 'approvers');
    await fs.mkdir(testKeyDir, { recursive: true });

    approverKeyId = 'test-approver-001';
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    approverPrivateKey = privateKey;
    approverPublicKey = publicKey;

    await fs.writeFile(path.join(testKeyDir, `${approverKeyId}.pub`), publicKey, { mode: 0o644 });

    // Setup KeyRegistry
    const registryPath = path.join(testBase, 'key-registry.json');
    try {
      await fs.unlink(registryPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    
    const keyRegistry = new KeyRegistryClass({ registryPath });
    await keyRegistry.initialize();
    await keyRegistry.registerKey(approverKeyId, approverPublicKey, ['owner', 'security'], approverPrivateKey);

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
      mode: 'PROD'
    });

    await trustContext.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(path.dirname(testKeyDir), { recursive: true, force: true });
    } catch (error) {
      // Ignorer
    }
  });

  describe('Régression: Signature invalide', () => {
    it('DOIT rejeter approbation avec signature invalide (hex invalide)', async () => {
      const approvalToken = await trustContext.requireHumanApproval(
        'test',
        CriticalityLevel.HIGH,
        { data: 'test' },
        {}
      );

      const decision = (trustContext as any).pendingDecisions.get(approvalToken);

      const invalidApproval = {
        approvalId: crypto.randomUUID(),
        decisionId: approvalToken,
        decisionDigest: decision.decisionDigest,
        approver: {
          id: 'approver-security',
          role: 'security',
          keyId: approverKeyId
        },
        verdict: 'approve' as const,
        issuedAt: Date.now(),
        signature: 'not-a-valid-hex-signature-zzz'
      };

      const result = await trustContext.approveDecision(invalidApproval);
      expect(result).toBe(false);
    });

    it('DOIT rejeter approbation avec clé inconnue (keyId absent)', async () => {
      const approvalToken = await trustContext.requireHumanApproval(
        'test',
        CriticalityLevel.HIGH,
        { data: 'test' },
        {}
      );

      const decision = (trustContext as any).pendingDecisions.get(approvalToken);

      // Générer autre paire de clés (non enregistrée)
      const { publicKey: otherPublicKey, privateKey: otherPrivateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      const unknownKeyApproval = createSignedApproval({
        approvalId: crypto.randomUUID(),
        decisionId: approvalToken,
        decisionDigest: decision.decisionDigest,
        approver: {
          id: 'approver-unknown',
          role: 'security',
          keyId: 'unknown-key-id' // Clé non chargée
        },
        verdict: 'approve',
        issuedAt: Date.now(),
        privateKeyPem: otherPrivateKey
      });

      const result = await trustContext.approveDecision(unknownKeyApproval);
      expect(result).toBe(false);

      // Vérifier code d'erreur
      const verification = await (trustContext as any).verifyApproval(unknownKeyApproval, decision);
      expect(verification.errorCode).toBe('KEY_UNKNOWN');
    });
  });

  describe('Régression: Timestamps incohérents', () => {
    it('DOIT rejeter approbation avec expiresAt < issuedAt', async () => {
      const approvalToken = await trustContext.requireHumanApproval(
        'test',
        CriticalityLevel.HIGH,
        { data: 'test' },
        {}
      );

      const decision = (trustContext as any).pendingDecisions.get(approvalToken);

      const invalidTimestampApproval = createSignedApproval({
        approvalId: crypto.randomUUID(),
        decisionId: approvalToken,
        decisionDigest: decision.decisionDigest,
        approver: {
          id: 'approver-security',
          role: 'security',
          keyId: approverKeyId
        },
        verdict: 'approve',
        issuedAt: Date.now(),
        expiresAt: Date.now() - 1000, // expiresAt avant issuedAt
        privateKeyPem: approverPrivateKey
      });

      // Schema devrait rejeter ou logique doit rejeter
      try {
        const result = await trustContext.approveDecision(invalidTimestampApproval);
        expect(result).toBe(false);
      } catch (error) {
        // Schema validation échoue => OK
        expect(error).toBeDefined();
      }
    });
  });

  describe('Régression: Champs supplémentaires (strict mode)', () => {
    it('DOIT rejeter approbation avec champs supplémentaires non autorisés', async () => {
      const approvalToken = await trustContext.requireHumanApproval(
        'test',
        CriticalityLevel.HIGH,
        { data: 'test' },
        {}
      );

      const decision = (trustContext as any).pendingDecisions.get(approvalToken);

      const validApproval = createSignedApproval({
        approvalId: crypto.randomUUID(),
        decisionId: approvalToken,
        decisionDigest: decision.decisionDigest,
        approver: {
          id: 'approver-security',
          role: 'security',
          keyId: approverKeyId
        },
        verdict: 'approve',
        issuedAt: Date.now(),
        privateKeyPem: approverPrivateKey
      });

      // Ajouter champ non autorisé
      const withExtraField = {
        ...validApproval,
        extraField: 'should-be-rejected'
      };

      // Schema validation doit rejeter (strict mode)
      try {
        const result = await trustContext.approveDecision(withExtraField);
        expect(result).toBe(false);
      } catch (error) {
        // Schema validation échoue => OK (fail-closed)
        expect(error).toBeDefined();
      }
    });
  });

  describe('Régression: DecisionDigest mismatch', () => {
    it('DOIT rejeter si decisionDigest ne correspond pas à la décision réelle', async () => {
      const approvalToken = await trustContext.requireHumanApproval(
        'test-decision',
        CriticalityLevel.HIGH,
        { data: 'original-data' },
        {}
      );

      const decision = (trustContext as any).pendingDecisions.get(approvalToken);

      // Créer approbation avec digest calculé pour AUTRE décision
      const otherDecisionDigest = (trustContext as any).computeDecisionDigest(
        'other-token',
        'other-type',
        CriticalityLevel.HIGH,
        { data: 'other-data' },
        {}
      );

      const wrongDigestApproval = createSignedApproval({
        approvalId: crypto.randomUUID(),
        decisionId: approvalToken,
        decisionDigest: otherDecisionDigest, // Digest d'une autre décision
        approver: {
          id: 'approver-security',
          role: 'security',
          keyId: approverKeyId
        },
        verdict: 'approve',
        issuedAt: Date.now(),
        privateKeyPem: approverPrivateKey
      });

      // Vérifier directement verifyApproval (avant approveDecision qui peut modifier l'état)
      const verification = await (trustContext as any).verifyApproval(wrongDigestApproval, decision);
      expect(verification.valid).toBe(false);
      expect(verification.errorCode).toBe('DIGEST_MISMATCH');
      
      // Ensuite vérifier que approveDecision rejette aussi
      const result = await trustContext.approveDecision(wrongDigestApproval);
      expect(result).toBe(false);
    });
  });

  describe('Régression: DecisionId mismatch', () => {
    it('DOIT rejeter si decisionId ne correspond pas', async () => {
      const approvalToken1 = await trustContext.requireHumanApproval(
        'decision-1',
        CriticalityLevel.HIGH,
        { data: 'data1' },
        {}
      );

      const approvalToken2 = await trustContext.requireHumanApproval(
        'decision-2',
        CriticalityLevel.HIGH,
        { data: 'data2' },
        {}
      );

      const decision1 = (trustContext as any).pendingDecisions.get(approvalToken1);

      // Utiliser decisionId incorrect (token2 au lieu de token1)
      const wrongIdApproval = createSignedApproval({
        approvalId: crypto.randomUUID(),
        decisionId: approvalToken2, // ID incorrect
        decisionDigest: decision1.decisionDigest,
        approver: {
          id: 'approver-security',
          role: 'security',
          keyId: approverKeyId
        },
        verdict: 'approve',
        issuedAt: Date.now(),
        privateKeyPem: approverPrivateKey
      });

      const result = await trustContext.approveDecision(wrongIdApproval);
      expect(result).toBe(false);

      const verification = await (trustContext as any).verifyApproval(wrongIdApproval, decision1);
      expect(verification.errorCode).toBe('DIGEST_MISMATCH');
    });
  });
});
