#!/usr/bin/env node
/**
 * 🎯 Prompt de Contrôle - Proof Suite (Property-Based Testing + Fuzzing)
 * Vérifie que tous les invariants sont prouvés et que fail-closed est garanti
 */

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

console.log('🎯 PROMPT DE CONTRÔLE - Proof Suite (Property-Based Testing)');
console.log('='.repeat(80));
console.log('');

let allTestsPassed = true;
const results = [];

function runCommand(cmd, description) {
  console.log(`\n📋 ${description}`);
  console.log('-'.repeat(80));
  console.log(`Commande: ${cmd}\n`);
  
  try {
    const output = execSync(cmd, { 
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 120000 // 2 minutes max
    });
    console.log(output);
    results.push({ description, status: 'PASS' });
    return true;
  } catch (error) {
    console.log(error.stdout || '');
    console.error(error.stderr || '');
    console.log(`\n❌ Échec: ${description}`);
    results.push({ description, status: 'FAIL', error: error.message });
    allTestsPassed = false;
    return false;
  }
}

// Test 1: Property Tests - Consensus
runCommand(
  'npm run test:properties -- __tests__/properties/consensus.properties.test.ts',
  'Property Tests - ConsensusManager (ordre, quorum, monotonicité, déterminisme)'
);

// Test 2: Property Tests - Journal
runCommand(
  'npm run test:properties -- __tests__/properties/journal.properties.test.ts',
  'Property Tests - Journal/AuditLog (append→verify, tamper detection, rotation)'
);

// Test 3: Fuzz Tests - Contracts
runCommand(
  'npm run test:fuzz',
  'Fuzz Tests - Contrats Zod (fail-closed sur entrées hostiles)'
);

// Résumé
console.log(`\n${  '='.repeat(80)}`);
console.log('📊 RÉSUMÉ DES TESTS');
console.log('='.repeat(80));

results.forEach((r, i) => {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${i + 1}. ${r.description}: ${r.status}`);
  if (r.error) {
    console.log(`   Error: ${r.error}`);
  }
});

const passCount = results.filter(r => r.status === 'PASS').length;
console.log(`\n📊 Résultat: ${passCount}/${results.length} suites de tests passées`);

if (allTestsPassed) {
  console.log('\n✅ TOUS LES TESTS PASSENT - Proof Suite VALIDÉE');
  console.log('\n🔒 Invariants prouvés:');
  console.log('   - Consensus: Ordre, Quorum, Monotonicité, Déterminisme');
  console.log('   - Journal: Append→Verify, Tamper Detection, Rotation');
  console.log('   - Contracts: Fail-Closed sur entrées hostiles');
} else {
  console.log('\n❌ CERTAINS TESTS ÉCHOUENT - Proof Suite nécessite correction');
  process.exit(1);
}

// Invariants couverts
console.log(`\n${  '='.repeat(80)}`);
console.log('✅ INVARIANTS COUVERTS');
console.log('='.repeat(80));
console.log('A) Invariance à l\'ordre (Consensus)');
console.log('B) Quorum / votes valides (Consensus)');
console.log('C) Monotonicité (Consensus)');
console.log('D) Déterminisme (Consensus)');
console.log('E) Bornes de sécurité / Fail-Closed (Consensus)');
console.log('F) Append→Verify (Journal/AuditLog)');
console.log('G) Tamper Detection (Journal/AuditLog)');
console.log('H) Rotation (Journal/AuditLog)');
console.log('I) Fuzzing Contracts (Fail-Closed sur entrées hostiles)');

// Invariants non couverts (futurs)
console.log(`\n${  '='.repeat(80)}`);
console.log('⏳ INVARIANTS NON COUVERTS (Futurs)');
console.log('='.repeat(80));
console.log('- Robustesse aux abstain/timeouts (consensus edge cases)');
console.log('- Performance invariants (latence bornée)');
console.log('- Concurrent access invariants (thread-safety)');
console.log('- Recovery invariants (crash recovery)');

// Next Steps
console.log(`\n${  '='.repeat(80)}`);
console.log('🎯 NEXT STEPS');
console.log('='.repeat(80));
console.log('1. CI Job: Ajouter job "property-tests" (< 2 minutes)');
console.log('2. Mutation Testing: Activer Stryker sur modules critiques');
console.log('3. Coverage: Vérifier coverage property tests');
console.log('4. Documentation: Mettre à jour SECURITY_PROOF_MVP.md');

process.exit(allTestsPassed ? 0 : 1);
