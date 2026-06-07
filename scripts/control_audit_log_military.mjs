#!/usr/bin/env node
/**
 * 🎯 Prompt de Contrôle - Audit Log Tamper-Evident
 * Vérifie que toutes les détections fonctionnent correctement (fail-closed)
 */

import { TamperEvidentAuditLog } from '../src/audit/TamperEvidentAuditLog.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const TEST_DIR = path.join(process.cwd(), 'test-control-audit');

async function cleanup() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch (_e) {
    // Ignore
  }
}

console.log('🎯 PROMPT DE CONTRÔLE - Audit Log Tamper-Evident');
console.log('='.repeat(80));
console.log('');

let allTestsPassed = true;
const results = [];

async function testScenario(name, testFn) {
  console.log(`\n📋 ${name}`);
  console.log('-'.repeat(80));
  
  await cleanup();
  
  try {
    const result = await testFn();
    if (result) {
      console.log(`✅ ${name}: PASS`);
      results.push({ name, status: 'PASS' });
      return true;
    } else {
      console.log(`❌ ${name}: FAIL`);
      results.push({ name, status: 'FAIL' });
      allTestsPassed = false;
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    results.push({ name, status: 'ERROR', error: error.message });
    allTestsPassed = false;
    return false;
  }
}

// Test 1: Happy Path
await testScenario('Happy Path: Append 100 events + Verify', async () => {
  const log = new TamperEvidentAuditLog({
    logDir: path.join(TEST_DIR, 'logs'),
    keyDir: path.join(TEST_DIR, 'keys'),
    pubKeyId: 'control-key'
  });
  await log.initialize();
  
  // Append 100 events
  for (let i = 0; i < 100; i++) {
    await log.appendAuditEvent({
      correlationId: `ctrl-${i}`,
      eventType: 'control_test',
      payload: { index: i, data: `test data ${i}` }
    });
  }
  
  const verify = await log.verifyAuditLog();
  
  console.log(`   - Appended: 100 events`);
  console.log(`   - Verify OK: ${verify.ok}`);
  console.log(`   - Checked: ${verify.stats.checked} records`);
  
  return verify.ok && verify.stats.checked === 100;
});

// Test 2: Corruption Detection
await testScenario('Corruption: Modification champ → HASH_MISMATCH', async () => {
  const log = new TamperEvidentAuditLog({
    logDir: path.join(TEST_DIR, 'logs'),
    keyDir: path.join(TEST_DIR, 'keys'),
    pubKeyId: 'control-key'
  });
  await log.initialize();
  
  await log.appendAuditEvent({ eventType: 'test1', payload: {} });
  await log.appendAuditEvent({ eventType: 'test2', payload: {} });
  await log.appendAuditEvent({ eventType: 'test3', payload: {} });
  
  // Corrompre le 2ème record
  const files = await fs.readdir(path.join(TEST_DIR, 'logs'));
  const logFile = path.join(TEST_DIR, 'logs', files[0]);
  const content = await fs.readFile(logFile, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  const record = JSON.parse(lines[1]);
  const originalEventType = record.eventType;
  record.eventType = 'CORRUPTED';
  lines[1] = JSON.stringify(record);
  await fs.writeFile(logFile, `${lines.join('\n')  }\n`, 'utf8');
  
  const verify = await log.verifyAuditLog();
  
  console.log(`   - Corruption: eventType changed from '${originalEventType}' to 'CORRUPTED'`);
  console.log(`   - Verify OK: ${verify.ok} (should be false)`);
  console.log(`   - Failure type: ${verify.failure?.type}`);
  console.log(`   - Failure seq: ${verify.failure?.seq}`);
  
  return !verify.ok && verify.failure?.type === 'HASH_MISMATCH';
});

// Test 3: Suppression Detection
await testScenario('Suppression: Ligne supprimée → SEQ_GAP', async () => {
  const log = new TamperEvidentAuditLog({
    logDir: path.join(TEST_DIR, 'logs'),
    keyDir: path.join(TEST_DIR, 'keys'),
    pubKeyId: 'control-key'
  });
  await log.initialize();
  
  for (let i = 0; i < 5; i++) {
    await log.appendAuditEvent({ eventType: `test${i}`, payload: {} });
  }
  
  // Supprimer le 3ème record (seq=3)
  const files = await fs.readdir(path.join(TEST_DIR, 'logs'));
  const logFile = path.join(TEST_DIR, 'logs', files[0]);
  const content = await fs.readFile(logFile, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  const deletedSeq = JSON.parse(lines[2]).seq;
  lines.splice(2, 1);
  await fs.writeFile(logFile, `${lines.join('\n')  }\n`, 'utf8');
  
  const verify = await log.verifyAuditLog();
  
  console.log(`   - Deleted: record with seq=${deletedSeq}`);
  console.log(`   - Verify OK: ${verify.ok} (should be false)`);
  console.log(`   - Failure type: ${verify.failure?.type}`);
  
  return !verify.ok && (verify.failure?.type === 'SEQ_GAP' || verify.failure?.type === 'PREVHASH_MISMATCH');
});

// Test 4: Insertion Detection
await testScenario('Insertion: Ligne insérée → SEQ_GAP', async () => {
  const log = new TamperEvidentAuditLog({
    logDir: path.join(TEST_DIR, 'logs'),
    keyDir: path.join(TEST_DIR, 'keys'),
    pubKeyId: 'control-key'
  });
  await log.initialize();
  
  for (let i = 0; i < 3; i++) {
    await log.appendAuditEvent({ eventType: `test${i}`, payload: {} });
  }
  
  // Insérer une ligne factice
  const files = await fs.readdir(path.join(TEST_DIR, 'logs'));
  const logFile = path.join(TEST_DIR, 'logs', files[0]);
  const content = await fs.readFile(logFile, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  const fakeRecord = {
    version: 1,
    seq: 999,
    ts: new Date().toISOString(),
    correlationId: 'fake',
    eventType: 'FAKE',
    payloadDigest: 'fake',
    prevHash: 'FAKE',
    hash: 'FAKE',
    pubKeyId: 'control-key',
    sig: 'FAKE'
  };
  
  lines.splice(2, 0, JSON.stringify(fakeRecord));
  await fs.writeFile(logFile, `${lines.join('\n')  }\n`, 'utf8');
  
  const verify = await log.verifyAuditLog();
  
  console.log(`   - Inserted: fake record with seq=999`);
  console.log(`   - Verify OK: ${verify.ok} (should be false)`);
  console.log(`   - Failure type: ${verify.failure?.type}`);
  
  return !verify.ok && (verify.failure?.type === 'SEQ_GAP' || verify.failure?.type === 'PREVHASH_MISMATCH');
});

// Test 5: Reorder Detection
await testScenario('Reorder: Permutation → PREVHASH_MISMATCH', async () => {
  const log = new TamperEvidentAuditLog({
    logDir: path.join(TEST_DIR, 'logs'),
    keyDir: path.join(TEST_DIR, 'keys'),
    pubKeyId: 'control-key'
  });
  await log.initialize();
  
  for (let i = 0; i < 5; i++) {
    await log.appendAuditEvent({ eventType: `test${i}`, payload: {} });
  }
  
  // Permuter deux lignes
  const files = await fs.readdir(path.join(TEST_DIR, 'logs'));
  const logFile = path.join(TEST_DIR, 'logs', files[0]);
  const content = await fs.readFile(logFile, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  const line1Seq = JSON.parse(lines[1]).seq;
  const line2Seq = JSON.parse(lines[2]).seq;
  
  const temp = lines[1];
  lines[1] = lines[2];
  lines[2] = temp;
  await fs.writeFile(logFile, `${lines.join('\n')  }\n`, 'utf8');
  
  const verify = await log.verifyAuditLog();
  
  console.log(`   - Reordered: swapped seq=${line1Seq} and seq=${line2Seq}`);
  console.log(`   - Verify OK: ${verify.ok} (should be false)`);
  console.log(`   - Failure type: ${verify.failure?.type}`);
  
  return !verify.ok && (verify.failure?.type === 'PREVHASH_MISMATCH' || verify.failure?.type === 'SEQ_GAP');
});

// Test 6: Signature Invalid
await testScenario('Signature Invalid: Autre clé → SIG_INVALID', async () => {
  const log = new TamperEvidentAuditLog({
    logDir: path.join(TEST_DIR, 'logs'),
    keyDir: path.join(TEST_DIR, 'keys'),
    pubKeyId: 'control-key'
  });
  await log.initialize();
  
  await log.appendAuditEvent({ eventType: 'test', payload: {} });
  
  // Générer autre clé
  const { publicKey: _otherPub, privateKey: otherPriv } = 
    crypto.generateKeyPairSync('ed25519');
  
  // Re-signer avec autre clé
  const files = await fs.readdir(path.join(TEST_DIR, 'logs'));
  const logFile = path.join(TEST_DIR, 'logs', files[0]);
  const content = await fs.readFile(logFile, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  const record = JSON.parse(lines[0]);
  const canonical = JSON.stringify({
    version: record.version,
    seq: record.seq,
    ts: record.ts,
    correlationId: record.correlationId,
    eventType: record.eventType,
    payloadDigest: record.payloadDigest,
    prevHash: record.prevHash,
    pubKeyId: record.pubKeyId
  }, Object.keys({version:1,seq:1,ts:'',correlationId:'',eventType:'',payloadDigest:'',prevHash:'',pubKeyId:''}).sort());
  
  const wrongSig = crypto.sign(null, Buffer.from(canonical, 'utf8'), otherPriv);
  record.sig = wrongSig.toString('hex');
  lines[0] = JSON.stringify(record);
  await fs.writeFile(logFile, `${lines.join('\n')  }\n`, 'utf8');
  
  const verify = await log.verifyAuditLog();
  
  console.log(`   - Signature: replaced with different key`);
  console.log(`   - Verify OK: ${verify.ok} (should be false)`);
  console.log(`   - Failure type: ${verify.failure?.type}`);
  
  return !verify.ok && verify.failure?.type === 'SIG_INVALID';
});

// Résumé
console.log(`\n${  '='.repeat(80)}`);
console.log('📊 RÉSUMÉ DES TESTS');
console.log('='.repeat(80));

results.forEach((r, i) => {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${i + 1}. ${r.name}: ${r.status}`);
  if (r.error) {
    console.log(`   Error: ${r.error}`);
  }
});

const passCount = results.filter(r => r.status === 'PASS').length;
console.log(`\n📊 Résultat: ${passCount}/${results.length} tests passés`);

if (allTestsPassed) {
  console.log('\n✅ TOUS LES TESTS PASSENT - Audit Log Tamper-Evident VALIDÉ');
  console.log('\n🔒 Preuves disponibles:');
  console.log('   - Corruption → HASH_MISMATCH');
  console.log('   - Suppression → SEQ_GAP');
  console.log('   - Insertion → SEQ_GAP');
  console.log('   - Reorder → PREVHASH_MISMATCH');
  console.log('   - Signature invalide → SIG_INVALID');
} else {
  console.log('\n❌ CERTAINS TESTS ÉCHOUENT - Audit Log nécessite correction');
  process.exit(1);
}

// Risques résiduels
console.log(`\n${  '='.repeat(80)}`);
console.log('⚠️  RISQUES RÉSIDUELS');
console.log('='.repeat(80));
console.log('1. Effacement total des fichiers');
console.log('   → Mitigation: Anchoring périodique (Merkle root → registre)');
console.log('2. Compromission clé privée');
console.log('   → Mitigation: Rotation automatique + HSM/KMS');
console.log('3. Compression/encodage malveillant');
console.log('   → Mitigation: Compression optionnelle avec hash pré-compression');

// Next Steps
console.log(`\n${  '='.repeat(80)}`);
console.log('🎯 NEXT STEPS');
console.log('='.repeat(80));
console.log('1. Anchoring externe (optionnel) - Merkle root → registre');
console.log('2. HSM/KMS integration - Clés privées dans Hardware Security Module');
console.log('3. Compression optionnelle - Avec vérification hash');
console.log('4. Retention policies - Rotation automatique anciens segments');

await cleanup();
process.exit(allTestsPassed ? 0 : 1);
