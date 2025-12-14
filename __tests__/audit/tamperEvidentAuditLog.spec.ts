/**
 * Tests TDD STRICT - Audit Log Tamper-Evident
 * Vérifie que le log détecte corruption/modification/suppression/insertion/reorder
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import { TamperEvidentAuditLog } from '../../src/audit/TamperEvidentAuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TamperEvidentAuditLog - Tamper Detection', () => {
  let auditLog: TamperEvidentAuditLog;
  let testLogDir: string;
  let testKeyDir: string;

  beforeEach(async () => {
    // Créer répertoires de test
    const testBase = path.join(__dirname, '../../test-audit-temp');
    testLogDir = path.join(testBase, 'logs');
    testKeyDir = path.join(testBase, 'keys');

    auditLog = new TamperEvidentAuditLog({
      logDir: testLogDir,
      keyDir: testKeyDir,
      pubKeyId: 'test-key',
      maxFileSize: 1024 * 1024, // 1MB pour tests
      rotationStrategy: 'size',
    });

    await auditLog.initialize();
  });

  afterEach(async () => {
    // Nettoyer après chaque test
    try {
      await fs.rm(testLogDir, { recursive: true, force: true });
      await fs.rm(testKeyDir, { recursive: true, force: true });
    } catch (error) {
      // Ignorer erreurs de nettoyage
    }
  });

  describe('Happy Path', () => {
    it('DOIT append 100 events puis verify => OK', async () => {
      // Append 100 events
      const results = [];
      for (let i = 0; i < 100; i++) {
        const result = await auditLog.appendAuditEvent({
          correlationId: `test-${i}`,
          eventType: 'test_event',
          payload: { index: i, data: `test data ${i}` },
        });
        results.push(result);
      }

      // Vérifier que tous ont été ajoutés
      expect(results.length).toBe(100);
      expect(results[0].seq).toBe(1);
      expect(results[99].seq).toBe(100);

      // Verify le log complet
      const verifyResult = await auditLog.verifyAuditLog();

      expect(verifyResult.ok).toBe(true);
      expect(verifyResult.stats.checked).toBe(100);
      expect(verifyResult.stats.firstTs).toBeDefined();
      expect(verifyResult.stats.lastTs).toBeDefined();
    });
  });

  describe('Corruption Detection', () => {
    it("DOIT détecter modification d'un champ => verify FAIL (HASH_MISMATCH)", async () => {
      // Append quelques events
      await auditLog.appendAuditEvent({
        eventType: 'test1',
        payload: { data: 'test1' },
      });
      await auditLog.appendAuditEvent({
        eventType: 'test2',
        payload: { data: 'test2' },
      });

      // Modifier un champ d'un record (corruption)
      const files = await fs.readdir(testLogDir);
      const logFile = path.join(testLogDir, files[0]);
      let content = await fs.readFile(logFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim());

      // Modifier le deuxième record (changer eventType)
      const record = JSON.parse(lines[1]);
      record.eventType = 'CORRUPTED'; // Corruption
      lines[1] = JSON.stringify(record);
      content = lines.join('\n') + '\n';
      await fs.writeFile(logFile, content, 'utf8');

      // Verify doit échouer
      const verifyResult = await auditLog.verifyAuditLog();

      expect(verifyResult.ok).toBe(false);
      expect(verifyResult.failure).toBeDefined();
      expect(verifyResult.failure?.type).toMatch(/HASH_MISMATCH|SIG_INVALID/);
      expect(verifyResult.failure?.seq).toBe(2);
    });
  });

  describe('Suppression Detection', () => {
    it("DOIT détecter suppression d'une ligne => verify FAIL (SEQ_GAP ou PREVHASH_MISMATCH)", async () => {
      // Append 5 events
      for (let i = 0; i < 5; i++) {
        await auditLog.appendAuditEvent({
          eventType: `test${i}`,
          payload: { index: i },
        });
      }

      // Supprimer une ligne (le 3ème record)
      const files = await fs.readdir(testLogDir);
      const logFile = path.join(testLogDir, files[0]);
      let content = await fs.readFile(logFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim());

      // Supprimer la ligne 2 (index 2, qui est le 3ème record, seq=3)
      lines.splice(2, 1);
      content = lines.join('\n') + '\n';
      await fs.writeFile(logFile, content, 'utf8');

      // Verify doit échouer
      const verifyResult = await auditLog.verifyAuditLog();

      expect(verifyResult.ok).toBe(false);
      expect(verifyResult.failure).toBeDefined();
      expect(verifyResult.failure?.type).toMatch(/SEQ_GAP|PREVHASH_MISMATCH/);
    });
  });

  describe('Insertion Detection', () => {
    it("DOIT détecter insertion d'une ligne au milieu => verify FAIL (SEQ_GAP ou PREVHASH_MISMATCH)", async () => {
      // Append 3 events
      for (let i = 0; i < 3; i++) {
        await auditLog.appendAuditEvent({
          eventType: `test${i}`,
          payload: { index: i },
        });
      }

      // Insérer une ligne au milieu
      const files = await fs.readdir(testLogDir);
      const logFile = path.join(testLogDir, files[0]);
      let content = await fs.readFile(logFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim());

      // Créer un record factice
      const fakeRecord = JSON.parse(lines[1]); // Copier le 2ème
      fakeRecord.seq = 999; // Seq invalide
      fakeRecord.hash = 'FAKE_HASH';
      fakeRecord.sig = 'FAKE_SIG';

      // Insérer après la ligne 1
      lines.splice(2, 0, JSON.stringify(fakeRecord));
      content = lines.join('\n') + '\n';
      await fs.writeFile(logFile, content, 'utf8');

      // Verify doit échouer
      const verifyResult = await auditLog.verifyAuditLog();

      expect(verifyResult.ok).toBe(false);
      expect(verifyResult.failure).toBeDefined();
      expect(verifyResult.failure?.type).toMatch(/SEQ_GAP|PREVHASH_MISMATCH|HASH_MISMATCH/);
    });
  });

  describe('Reorder Detection', () => {
    it('DOIT détecter permutation de deux lignes => verify FAIL (PREVHASH_MISMATCH)', async () => {
      // Append 5 events
      for (let i = 0; i < 5; i++) {
        await auditLog.appendAuditEvent({
          eventType: `test${i}`,
          payload: { index: i },
        });
      }

      // Permuter deux lignes (2ème et 3ème)
      const files = await fs.readdir(testLogDir);
      const logFile = path.join(testLogDir, files[0]);
      let content = await fs.readFile(logFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim());

      // Permuter lignes 1 et 2 (indices)
      const temp = lines[1];
      lines[1] = lines[2];
      lines[2] = temp;

      content = lines.join('\n') + '\n';
      await fs.writeFile(logFile, content, 'utf8');

      // Verify doit échouer
      const verifyResult = await auditLog.verifyAuditLog();

      expect(verifyResult.ok).toBe(false);
      expect(verifyResult.failure).toBeDefined();
      // Permuter des lignes peut déclencher SEQ_GAP ou PREVHASH_MISMATCH selon l'implémentation
      expect(verifyResult.failure?.type).toMatch(/PREVHASH_MISMATCH|SEQ_GAP/);
    });
  });

  describe('Signature Invalid Detection', () => {
    it('DOIT détecter signature avec autre clé => verify FAIL (SIG_INVALID)', async () => {
      // Append un event
      await auditLog.appendAuditEvent({
        eventType: 'test',
        payload: { data: 'test' },
      });

      // Générer une autre paire de clés
      const { publicKey: otherPublicKey, privateKey: otherPrivateKey } = crypto.generateKeyPairSync(
        'ed25519',
        {
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        }
      );

      // Modifier la signature avec l'autre clé
      const files = await fs.readdir(testLogDir);
      const logFile = path.join(testLogDir, files[0]);
      let content = await fs.readFile(logFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim());

      const record = JSON.parse(lines[0]);

      // Re-signer avec l'autre clé
      const canonicalRecord = JSON.stringify(
        {
          version: record.version,
          seq: record.seq,
          ts: record.ts,
          correlationId: record.correlationId,
          eventType: record.eventType,
          payloadDigest: record.payloadDigest,
          prevHash: record.prevHash,
          pubKeyId: record.pubKeyId,
        },
        Object.keys({
          version: 1,
          seq: 1,
          ts: '',
          correlationId: '',
          eventType: '',
          payloadDigest: '',
          prevHash: '',
          pubKeyId: '',
        }).sort()
      );

      const messageBuffer = Buffer.from(canonicalRecord, 'utf8');
      const wrongSignature = crypto.sign(null, messageBuffer, {
        key: otherPrivateKey,
        dsaEncoding: 'ieee-p1363',
      });

      record.sig = wrongSignature.toString('hex');
      lines[0] = JSON.stringify(record);
      content = lines.join('\n') + '\n';
      await fs.writeFile(logFile, content, 'utf8');

      // Verify doit échouer
      const verifyResult = await auditLog.verifyAuditLog();

      expect(verifyResult.ok).toBe(false);
      expect(verifyResult.failure).toBeDefined();
      expect(verifyResult.failure?.type).toBe('SIG_INVALID');
    });
  });

  describe('Rotation', () => {
    it('DOIT gérer rotation par taille et verify segments => OK', async () => {
      // Créer un log avec maxFileSize petit (100 bytes)
      const smallLog = new TamperEvidentAuditLog({
        logDir: testLogDir,
        keyDir: testKeyDir,
        pubKeyId: 'test-key',
        maxFileSize: 500, // Très petit pour forcer rotation
        rotationStrategy: 'size',
      });
      await smallLog.initialize();

      // Append plusieurs events (devrait créer plusieurs fichiers)
      for (let i = 0; i < 10; i++) {
        await smallLog.appendAuditEvent({
          eventType: 'test',
          payload: { index: i, largeData: 'x'.repeat(100) }, // Données volumineuses
        });
      }

      // Verify doit passer (vérifie tous les segments)
      const verifyResult = await smallLog.verifyAuditLog();

      expect(verifyResult.ok).toBe(true);
      expect(verifyResult.stats.checked).toBe(10);
    });
  });
});
