#!/usr/bin/env node
/**
 * Script de test manuel pour TamperEvidentAuditLog
 * Valide que le log détecte toutes les tentatives de tampering
 */

import { TamperEvidentAuditLog } from '../src/audit/TamperEvidentAuditLog.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const TEST_DIR = path.join(process.cwd(), 'test-audit-manual');

async function cleanup() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch (e) {
    // Ignore
  }
}

async function testHappyPath() {
  console.log('\n1️⃣  Test Happy Path: Append + Verify');
  
  await cleanup();
  
  const log = new TamperEvidentAuditLog({
    logDir: path.join(TEST_DIR, 'logs'),
    keyDir: path.join(TEST_DIR, 'keys'),
    pubKeyId: 'test-key'
  });
  
  await log.initialize();
  
  // Append 10 events
  for (let i = 0; i < 10; i++) {
    await log.appendAuditEvent({
      correlationId: `test-${i}`,
      eventType: 'test_event',
      payload: { index: i }
    });
  }
  
  const verify = await log.verifyAuditLog();
  
  console.log('   ✅ Append 10 events: OK');
  console.log('   ✅ Verify result:', verify.ok ? 'PASS' : 'FAIL');
  console.log('   ✅ Checked:', verify.stats.checked, 'records');
  
  return verify.ok;
}

async function testCorruption() {
  console.log('\n2️⃣  Test Corruption Detection');
  
  await cleanup();
  
  const log = new TamperEvidentAuditLog({
    logDir: path.join(TEST_DIR, 'logs'),
    keyDir: path.join(TEST_DIR, 'keys'),
    pubKeyId: 'test-key'
  });
  
  await log.initialize();
  
  // Append 3 events
  await log.appendAuditEvent({ eventType: 'test1', payload: {} });
  await log.appendAuditEvent({ eventType: 'test2', payload: {} });
  await log.appendAuditEvent({ eventType: 'test3', payload: {} });
  
  // Corrompre le 2ème record
  const files = await fs.readdir(path.join(TEST_DIR, 'logs'));
  const logFile = path.join(TEST_DIR, 'logs', files[0]);
  const content = await fs.readFile(logFile, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  const record = JSON.parse(lines[1]);
  record.eventType = 'CORRUPTED';
  lines[1] = JSON.stringify(record);
  await fs.writeFile(logFile, lines.join('\n') + '\n', 'utf8');
  
  const verify = await log.verifyAuditLog();
  
  console.log('   ✅ Corruption applied');
  console.log('   ✅ Verify result:', verify.ok ? 'FAIL (expected)' : 'PASS (detected)');
  console.log('   ✅ Failure type:', verify.failure?.type);
  
  return !verify.ok && verify.failure;
}

async function testSuppression() {
  console.log('\n3️⃣  Test Suppression Detection');
  
  await cleanup();
  
  const log = new TamperEvidentAuditLog({
    logDir: path.join(TEST_DIR, 'logs'),
    keyDir: path.join(TEST_DIR, 'keys'),
    pubKeyId: 'test-key'
  });
  
  await log.initialize();
  
  // Append 5 events
  for (let i = 0; i < 5; i++) {
    await log.appendAuditEvent({ eventType: `test${i}`, payload: {} });
  }
  
  // Supprimer le 3ème record
  const files = await fs.readdir(path.join(TEST_DIR, 'logs'));
  const logFile = path.join(TEST_DIR, 'logs', files[0]);
  const content = await fs.readFile(logFile, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  lines.splice(2, 1); // Supprimer ligne 2 (3ème record)
  await fs.writeFile(logFile, lines.join('\n') + '\n', 'utf8');
  
  const verify = await log.verifyAuditLog();
  
  console.log('   ✅ Suppression applied');
  console.log('   ✅ Verify result:', verify.ok ? 'FAIL (expected)' : 'PASS (detected)');
  console.log('   ✅ Failure type:', verify.failure?.type);
  
  return !verify.ok && verify.failure;
}

async function testReorder() {
  console.log('\n4️⃣  Test Reorder Detection');
  
  await cleanup();
  
  const log = new TamperEvidentAuditLog({
    logDir: path.join(TEST_DIR, 'logs'),
    keyDir: path.join(TEST_DIR, 'keys'),
    pubKeyId: 'test-key'
  });
  
  await log.initialize();
  
  // Append 5 events
  for (let i = 0; i < 5; i++) {
    await log.appendAuditEvent({ eventType: `test${i}`, payload: {} });
  }
  
  // Permuter deux lignes
  const files = await fs.readdir(path.join(TEST_DIR, 'logs'));
  const logFile = path.join(TEST_DIR, 'logs', files[0]);
  const content = await fs.readFile(logFile, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  // Permuter lignes 1 et 2
  const temp = lines[1];
  lines[1] = lines[2];
  lines[2] = temp;
  await fs.writeFile(logFile, lines.join('\n') + '\n', 'utf8');
  
  const verify = await log.verifyAuditLog();
  
  console.log('   ✅ Reorder applied');
  console.log('   ✅ Verify result:', verify.ok ? 'FAIL (expected)' : 'PASS (detected)');
  console.log('   ✅ Failure type:', verify.failure?.type);
  
  return !verify.ok && verify.failure;
}

async function main() {
  console.log('🧪 Test manuel TamperEvidentAuditLog\n');
  
  const results = [];
  
  results.push(await testHappyPath());
  results.push(await testCorruption());
  results.push(await testSuppression());
  results.push(await testReorder());
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Résultats: ${results.filter(r => r).length}/${results.length} tests réussis`);
  
  if (results.every(r => r)) {
    console.log('✅ Tous les tests passent - Audit Log prêt!');
    process.exit(0);
  } else {
    console.log('❌ Certains tests échouent');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
}).finally(async () => {
  await cleanup();
});
