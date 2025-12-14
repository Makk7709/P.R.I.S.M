/**
 * Property-Based Tests - Journal / Audit Log
 * Prouve que SecureJournalManager + TamperEvidentAuditLog respectent des invariants d'intégrité
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { TamperEvidentAuditLog } from '../../src/audit/TamperEvidentAuditLog.js';
import { SecureJournalManager } from '../../src/core/SecureJournalManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Journal / Audit Log - Property-Based Tests', () => {
  let testBaseDir: string;
  
  beforeEach(async () => {
    testBaseDir = path.join(__dirname, '../../test-properties-temp');
    // Créer le répertoire de base s'il n'existe pas
    try {
      await fs.mkdir(testBaseDir, { recursive: true });
    } catch (error) {
      // Ignore si existe déjà
    }
  });
  
  afterEach(async () => {
    // Nettoyer après chaque test
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });
  
  describe('F) Append→Verify Invariant', () => {
    
    // Test de régression avec counterexample connu
    it('REGRESSION: DOIT passer avec numEvents=18 (counterexample seed 424242)', async () => {
      const numEvents = 18;
      const testId = `test-${numEvents}`;
      const logDir = path.join(testBaseDir, testId, 'log');
      const keyDir = path.join(testBaseDir, testId, 'keys');
      
      await fs.mkdir(logDir, { recursive: true });
      await fs.mkdir(keyDir, { recursive: true });
      
      const auditLog = new TamperEvidentAuditLog({
        logDir,
        keyDir,
        pubKeyId: 'test-key'
      });
      
      await auditLog.initialize();
      
      // Append N events
      for (let i = 0; i < numEvents; i++) {
        await auditLog.appendAuditEvent({
          correlationId: `test-${i}`,
          eventType: 'test_event',
          payload: { index: i, data: `test data ${i}` }
        });
      }
      
      // Verify doit retourner OK
      const verifyResult = await auditLog.verifyAuditLog();
      
      expect(verifyResult.ok).toBe(true);
      expect(verifyResult.stats.checked).toBe(numEvents);
    });
    
    it('DOIT retourner OK après N appends valides', async () => {
      let runIndex = 0; // Index de run pour isoler chaque test property
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // N events
          async (numEvents) => {
            const currentRun = runIndex++;
            // Use deterministic directory names with run index to ensure isolation
            const testId = `test-${numEvents}-run${currentRun}`;
            const logDir = path.join(testBaseDir, testId, 'log');
            const keyDir = path.join(testBaseDir, testId, 'keys');
            
            // Créer répertoires
            await fs.mkdir(logDir, { recursive: true });
            await fs.mkdir(keyDir, { recursive: true });
            
            const auditLog = new TamperEvidentAuditLog({
              logDir,
              keyDir,
              pubKeyId: 'test-key'
            });
            
            await auditLog.initialize();
            
            // Append N events (séquentiellement pour éviter race conditions)
            for (let i = 0; i < numEvents; i++) {
              await auditLog.appendAuditEvent({
                correlationId: `test-${i}`,
                eventType: 'test_event',
                payload: { index: i, data: `test data ${i}` }
              });
            }
            
            // Ensure all writes are flushed before verification
            // (appendAuditEvent should already await, but explicit flush if needed)
            
            // Verify doit retourner OK
            const verifyResult = await auditLog.verifyAuditLog();
            
            expect(verifyResult.ok).toBe(true);
            expect(verifyResult.stats.checked).toBe(numEvents);
            
            return true;
          }
        ),
        {
          numRuns: 100,
          timeout: 30000
        }
      );
    });
  });
  
  describe('G) Tamper Detection (Property)', () => {
    
    it('DOIT détecter modification aléatoire d\'un champ (verify FAIL)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 20 }), // N events
          fc.integer({ min: 0 }), // Index du record à corrompre
          fc.string(), // Nouvelle valeur (corruption)
          async (numEvents, corruptIndex, corruptValue) => {
            // Use deterministic directory names - already unique via corruptIndex
            const testId = `tamper-${numEvents}-${corruptIndex}-${corruptValue.substring(0, 10)}`;
            const logDir = path.join(testBaseDir, testId, 'log');
            const keyDir = path.join(testBaseDir, testId, 'keys');
            
            const auditLog = new TamperEvidentAuditLog({
              logDir,
              keyDir,
              pubKeyId: 'test-key'
            });
            
            await auditLog.initialize();
            
            // Append N events
            for (let i = 0; i < numEvents; i++) {
              await auditLog.appendAuditEvent({
                correlationId: `test-${i}`,
                eventType: 'test_event',
                payload: { index: i }
              });
            }
            
            // Corrompre un record (modifier un champ)
            const files = await fs.readdir(logDir);
            const logFile = path.join(logDir, files[0]);
            let content = await fs.readFile(logFile, 'utf8');
            const lines = content.split('\n').filter(l => l.trim());
            
            // Vérifier que l'index est valide
            if (lines.length === 0 || corruptIndex >= lines.length) {
              return true; // Skip si index invalide
            }
            
            const record = JSON.parse(lines[corruptIndex]);
            
            // Modifier un champ (eventType)
            record.eventType = corruptValue;
            lines[corruptIndex] = JSON.stringify(record);
            content = lines.join('\n') + '\n';
            await fs.writeFile(logFile, content, 'utf8');
            
            // Verify doit échouer
            const verifyResult = await auditLog.verifyAuditLog();
            
            expect(verifyResult.ok).toBe(false);
            expect(verifyResult.failure).toBeDefined();
            expect(verifyResult.failure?.type).toMatch(/HASH_MISMATCH|SIG_INVALID/);
            
            return true;
          }
        ),
        {
          numRuns: 50, // Réduire car modification de fichiers
          timeout: 30000,
          seed: 424242 // Seed fixe pour reproductibilité
        }
      );
    });
  });
  
  describe('H) Rotation', () => {
    
    it('DOIT gérer rotation et verify sur tous segments => OK', async () => {
      let runIndex = 0; // Index de run pour isoler chaque test property
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 30 }), // N events (suffisant pour rotation si maxFileSize petit)
          async (numEvents) => {
            const currentRun = runIndex++;
            // Use deterministic directory names with run index to ensure isolation
            const testId = `rotation-${numEvents}-run${currentRun}`;
            const logDir = path.join(testBaseDir, testId, 'log');
            const keyDir = path.join(testBaseDir, testId, 'keys');
            
            // Créer log avec maxFileSize très petit pour forcer rotation
            const auditLog = new TamperEvidentAuditLog({
              logDir,
              keyDir,
              pubKeyId: 'test-key',
              maxFileSize: 500, // Très petit pour forcer rotation
              rotationStrategy: 'size'
            });
            
            await auditLog.initialize();
            
            // Append N events avec payloads volumineux (séquentiellement)
            for (let i = 0; i < numEvents; i++) {
              await auditLog.appendAuditEvent({
                correlationId: `test-${i}`,
                eventType: 'test_event',
                payload: { index: i, largeData: 'x'.repeat(200) } // Payload volumineux
              });
            }
            
            // Ensure all writes are flushed before verification
            
            // Verify sur tous segments doit retourner OK
            const verifyResult = await auditLog.verifyAuditLog();
            
            expect(verifyResult.ok).toBe(true);
            expect(verifyResult.stats.checked).toBe(numEvents);
            
            return true;
          }
        ),
        {
          numRuns: 30, // Réduire car rotation de fichiers
          timeout: 40000,
          seed: 424242 // Seed fixe pour reproductibilité
        }
      );
    });
  });
});
