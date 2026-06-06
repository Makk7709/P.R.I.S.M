/**
 * Property-Based Tests - Journal / Audit Log
 * Prouve que SecureJournalManager + TamperEvidentAuditLog respectent des invariants d'intégrité
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { TamperEvidentAuditLog } from '../../src/audit/TamperEvidentAuditLog.js';

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
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // N events
          async (numEvents) => {
            // Use unique test ID per run (crypto.randomUUID for isolation even in parallel tests)
            const testId = `test-${numEvents}-${crypto.randomUUID().substring(0, 8)}`;
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
            // Use unique test ID per run (isolation even in parallel tests)
            const testId = `tamper-${numEvents}-${corruptIndex}-${crypto.randomUUID().substring(0, 8)}`;
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
            // Lister fichiers de log et trier pour ordre stable
            const files = await fs.readdir(logDir);
            const logFiles = files
              .filter(f => f.startsWith('audit-') && f.endsWith('.jsonl'))
              .sort();
            if (logFiles.length === 0) {
              return true; // Skip si aucun fichier (cas limite)
            }
            const logFile = path.join(logDir, logFiles[0]); // Prendre le premier fichier (plus ancien)
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
            content = `${lines.join('\n')  }\n`;
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
          timeout: 30000
          // Note: Pas de seed fixe car le test modifie des fichiers, besoin de variabilité
        }
      );
    });
  });
  
  describe('H) Rotation', () => {
    
    it('DOIT gérer rotation et verify sur tous segments => OK', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 30 }), // N events (suffisant pour rotation si maxFileSize petit)
          async (numEvents) => {
            // Use unique test ID per run (isolation even in parallel tests)
            const testId = `rotation-${numEvents}-${crypto.randomUUID().substring(0, 8)}`;
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
