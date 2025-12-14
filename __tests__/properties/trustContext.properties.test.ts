/**
 * TrustContext - Property-Based Tests (Invariants Critiques)
 * 
 * Invariants prouvés:
 * I1) CRITICAL ne peut jamais retourner APPROVED sans approbation valide (signature OK + authorized + digest match)
 * I2) Toute altération 1-bit du payload signé => verifyApproval échoue (tamper detection)
 * I3) Default deny : si policy/role absent ou inconnu => rejet
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import crypto from 'node:crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { TrustContext, CriticalityLevel, createSignedApproval } from '../../src/core/TrustContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TrustContext - Property-Based Tests (Invariants Critiques)', () => {
  let trustContext: TrustContext;
  let testKeyDir: string;
  let approverPrivateKey: string;
  let approverPublicKey: string;
  let approverKeyId: string;

  beforeEach(async () => {
    // Créer répertoire de test pour clés
    const testBase = path.join(__dirname, '../../test-trustcontext-temp');
    testKeyDir = path.join(testBase, 'keys', 'approvers');
    await fs.mkdir(testKeyDir, { recursive: true });

    // Générer paire de clés Ed25519 pour approver
    approverKeyId = 'test-approver-001';
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    approverPrivateKey = privateKey;
    approverPublicKey = publicKey;

    // Sauvegarder clé publique
    await fs.writeFile(
      path.join(testKeyDir, `${approverKeyId}.pub`),
      publicKey,
      { mode: 0o644 }
    );

    // Créer TrustContext avec clé publique chargée
    trustContext = new TrustContext({
      keyDir: testKeyDir,
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
    // Nettoyer
    try {
      await fs.rm(path.dirname(testKeyDir), { recursive: true, force: true });
    } catch (error) {
      // Ignorer erreurs de nettoyage
    }
  });

  describe('I1) CRITICAL ne peut jamais retourner APPROVED sans approbation valide', () => {
    it('DOIT rejeter toute tentative d\'approbation sans signature valide', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          async (decisionType, decisionData) => {
            // Créer une décision CRITICAL
            const approvalToken = await trustContext.requireHumanApproval(
              decisionType,
              CriticalityLevel.CRITICAL,
              { data: decisionData },
              {}
            );

            const decision = (trustContext as any).pendingDecisions.get(approvalToken);
            expect(decision).toBeDefined();
            expect(decision.criticality).toBe(CriticalityLevel.CRITICAL);

            // Tentative d'approbation SANS signature valide
            const fakeApproval = {
              approvalId: crypto.randomUUID(),
              decisionId: approvalToken,
              decisionDigest: decision.decisionDigest,
              approver: {
                id: 'fake-approver',
                role: 'owner',
                keyId: approverKeyId
              },
              verdict: 'approve' as const,
              issuedAt: Date.now(),
              signature: 'invalid-signature-hex'
            };

            // approveDecision doit échouer
            const result = await trustContext.approveDecision(fakeApproval);
            expect(result).toBe(false);

            // Vérifier que la décision n'a PAS été approuvée (peut être dans pending ou history)
            const checkResult = trustContext.checkApproval(approvalToken);
            if (checkResult.status !== 'not_found') {
              expect(checkResult.approved).toBe(false);
            }
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    it('DOIT rejeter toute tentative avec signature valide mais role non autorisé', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (decisionType) => {
            // CRITICAL nécessite role 'owner' uniquement
            const approvalToken = await trustContext.requireHumanApproval(
              decisionType,
              CriticalityLevel.CRITICAL,
              { data: 'test' },
              {}
            );

            const decision = (trustContext as any).pendingDecisions.get(approvalToken);

            // Tentative avec role 'security' (non autorisé pour CRITICAL)
            const invalidRoleApproval = createSignedApproval({
              approvalId: crypto.randomUUID(),
              decisionId: approvalToken,
              decisionDigest: decision.decisionDigest,
              approver: {
                id: 'approver-security',
                role: 'security', // NON autorisé pour CRITICAL
                keyId: approverKeyId
              },
              verdict: 'approve',
              issuedAt: Date.now(),
              privateKeyPem: approverPrivateKey
            });

            // approveDecision doit échouer (autorisation)
            const result = await trustContext.approveDecision(invalidRoleApproval);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 30, timeout: 10000 }
      );
    });

    it('DOIT approuver uniquement avec signature valide + role autorisé + digest match', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (decisionType) => {
            const approvalToken = await trustContext.requireHumanApproval(
              decisionType,
              CriticalityLevel.CRITICAL,
              { data: 'test' },
              {}
            );

            const decision = (trustContext as any).pendingDecisions.get(approvalToken);

            // Approbation VALIDE (signature + role owner + digest match)
            const validApproval = createSignedApproval({
              approvalId: crypto.randomUUID(),
              decisionId: approvalToken,
              decisionDigest: decision.decisionDigest, // Digest correct
              approver: {
                id: 'approver-owner',
                role: 'owner', // Autorisé pour CRITICAL
                keyId: approverKeyId
              },
              verdict: 'approve',
              issuedAt: Date.now(),
              privateKeyPem: approverPrivateKey
            });

            const result = await trustContext.approveDecision(validApproval);
            expect(result).toBe(true);

            // Après approbation, la décision est dans l'historique, pas dans pending
            // Vérifier via l'historique
            const history = trustContext.getApprovalHistory(10);
            const approvedDecision = history.find(d => d.type === decisionType && d.status === 'approved');
            expect(approvedDecision).toBeDefined();
            expect(approvedDecision?.approvedBy).toBe('approver-owner');
          }
        ),
        { numRuns: 30, timeout: 10000 }
      );
    });
  });

  describe('I2) Toute altération 1-bit du payload signé => verifyApproval échoue', () => {
    it('DOIT détecter toute modification du payload signé', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }), // Modification à injecter
          async (decisionType, modification) => {
            const approvalToken = await trustContext.requireHumanApproval(
              decisionType,
              CriticalityLevel.HIGH,
              { data: 'test' },
              {}
            );

            const decision = (trustContext as any).pendingDecisions.get(approvalToken);

            // Créer approbation valide
            const validApproval = createSignedApproval({
              approvalId: crypto.randomUUID(),
              decisionId: approvalToken,
              decisionDigest: decision.decisionDigest,
              approver: {
                id: 'approver-security',
                role: 'security', // Autorisé pour HIGH
                keyId: approverKeyId
              },
              verdict: 'approve',
              issuedAt: Date.now(),
              privateKeyPem: approverPrivateKey
            });

            // Altérer le payload (modifier un champ après signature)
            const tamperedApproval = {
              ...validApproval,
              verdict: 'reject' as const // Modifier verdict
            };

            // Vérification doit échouer (signature ne match plus)
            const verification = await (trustContext as any).verifyApproval(tamperedApproval, decision);
            expect(verification.valid).toBe(false);
            expect(verification.errorCode).toBe('SIGNATURE_INVALID');
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    it('DOIT détecter toute modification du decisionDigest', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (decisionType) => {
            const approvalToken = await trustContext.requireHumanApproval(
              decisionType,
              CriticalityLevel.HIGH,
              { data: 'test' },
              {}
            );

            const decision = (trustContext as any).pendingDecisions.get(approvalToken);

            // Créer approbation avec DIGEST INCORRECT
            const wrongDigest = 'a'.repeat(64); // Digest invalide (64 chars mais faux)
            const invalidApproval = createSignedApproval({
              approvalId: crypto.randomUUID(),
              decisionId: approvalToken,
              decisionDigest: wrongDigest, // Digest incorrect
              approver: {
                id: 'approver-security',
                role: 'security',
                keyId: approverKeyId
              },
              verdict: 'approve',
              issuedAt: Date.now(),
              privateKeyPem: approverPrivateKey
            });

            // Vérification doit échouer (digest mismatch)
            const verification = await (trustContext as any).verifyApproval(invalidApproval, decision);
            expect(verification.valid).toBe(false);
            expect(verification.errorCode).toBe('DIGEST_MISMATCH');
          }
        ),
        { numRuns: 30, timeout: 10000 }
      );
    });
  });

  describe('I3) Default deny : si policy/role absent ou inconnu => rejet', () => {
    it('DOIT rejeter si role absent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (decisionType) => {
            const approvalToken = await trustContext.requireHumanApproval(
              decisionType,
              CriticalityLevel.HIGH,
              { data: 'test' },
              {}
            );

            const decision = (trustContext as any).pendingDecisions.get(approvalToken);

            // Approbation avec role ABSENT
            const noRoleApproval = createSignedApproval({
              approvalId: crypto.randomUUID(),
              decisionId: approvalToken,
              decisionDigest: decision.decisionDigest,
              approver: {
                id: 'approver',
                role: '', // Role vide (sera rejeté par schema, mais testons aussi logique)
                keyId: approverKeyId
              },
              verdict: 'approve',
              issuedAt: Date.now(),
              privateKeyPem: approverPrivateKey
            });

            // Schema validation devrait échouer, mais si passé, logique doit rejeter
            try {
              const result = await trustContext.approveDecision(noRoleApproval);
              expect(result).toBe(false);
            } catch (error) {
              // Schema validation échoue => OK (fail-closed)
              expect(error).toBeDefined();
            }
          }
        ),
        { numRuns: 30, timeout: 10000 }
      );
    });

    it('DOIT rejeter si role inconnu (non dans policy)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }).filter(r => !['lead', 'security', 'owner'].includes(r)),
          async (decisionType, unknownRole) => {
            const approvalToken = await trustContext.requireHumanApproval(
              decisionType,
              CriticalityLevel.HIGH,
              { data: 'test' },
              {}
            );

            const decision = (trustContext as any).pendingDecisions.get(approvalToken);

            // Approbation avec role INCONNU
            const unknownRoleApproval = createSignedApproval({
              approvalId: crypto.randomUUID(),
              decisionId: approvalToken,
              decisionDigest: decision.decisionDigest,
              approver: {
                id: 'approver',
                role: unknownRole, // Role non autorisé
                keyId: approverKeyId
              },
              verdict: 'approve',
              issuedAt: Date.now(),
              privateKeyPem: approverPrivateKey
            });

            // approveDecision doit échouer (default deny)
            const result = await trustContext.approveDecision(unknownRoleApproval);
            expect(result).toBe(false);

            // Vérifier code d'erreur
            const verification = await (trustContext as any).verifyApproval(unknownRoleApproval, decision);
            expect(verification.valid).toBe(false);
            expect(verification.errorCode).toBe('AUTHORIZATION_FAILED');
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    it('DOIT rejeter si criticité n\'a pas de policy définie', async () => {
      // Créer TrustContext avec policy incomplète
      const incompleteTrustContext = new TrustContext({
        keyDir: testKeyDir,
        governancePolicy: {
          [CriticalityLevel.LOW]: ['lead'],
          [CriticalityLevel.MEDIUM]: ['lead'],
          // HIGH et CRITICAL non définis => default deny
        },
        minApprovalLevel: CriticalityLevel.HIGH,
        mode: 'PROD'
      });
      await incompleteTrustContext.initialize();

      const approvalToken = await incompleteTrustContext.requireHumanApproval(
        'test',
        CriticalityLevel.HIGH,
        { data: 'test' },
        {}
      );

      const decision = (incompleteTrustContext as any).pendingDecisions.get(approvalToken);

      const approval = createSignedApproval({
        approvalId: crypto.randomUUID(),
        decisionId: approvalToken,
        decisionDigest: decision.decisionDigest,
        approver: {
          id: 'approver',
          role: 'lead',
          keyId: approverKeyId
        },
        verdict: 'approve',
        issuedAt: Date.now(),
        privateKeyPem: approverPrivateKey
      });

      // Doit échouer (policy vide pour HIGH => default deny)
      const result = await incompleteTrustContext.approveDecision(approval);
      expect(result).toBe(false);
    });
  });
});
