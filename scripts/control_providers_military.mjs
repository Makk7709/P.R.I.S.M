#!/usr/bin/env node
/**
 * Script de Contrôle - ProviderAdapters Hardening (VAGUE 1.4)
 * Vérifie que tous les invariants sont prouvés et stables
 */

import { execSync } from 'node:child_process';

console.log('🎯 PROMPT DE CONTRÔLE - ProviderAdapters Hardening (VAGUE 1.4)');
console.log('='.repeat(80));
console.log('');

let allPassed = true;

/**
 * Exécuter une commande et retourner le résultat
 */
function runCommand(cmd, description) {
  console.log(`📋 ${description}`);
  console.log('-'.repeat(80));
  console.log(`Commande: ${cmd}`);
  console.log('');
  
  try {
    const output = execSync(cmd, { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    // Extraire stats
    const testFilesMatch = output.match(/Test Files\s+(\d+)\s+passed/);
    const testsMatch = output.match(/Tests\s+(\d+)\s+passed/);
    const durationMatch = output.match(/Duration\s+([\d.]+)s/);
    
    if (testFilesMatch && testsMatch) {
      const testFiles = Number.parseInt(testFilesMatch[1]);
      const tests = Number.parseInt(testsMatch[1]);
      const duration = durationMatch ? Number.parseFloat(durationMatch[1]) : null;
      
      console.log(`✅ Succès: ${testFiles} fichier(s) de test, ${tests} test(s) passé(s)`);
      if (duration) {
        console.log(`⏱️  Durée: ${duration.toFixed(2)}s`);
      }
      console.log('');
      
      return { success: true, testFiles, tests, duration };
    } else {
      console.log('❌ Échec: Impossible d\'extraire les statistiques');
      console.log('');
      allPassed = false;
      return { success: false };
    }
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    console.log('');
    allPassed = false;
    return { success: false };
  }
}

/**
 * Tests property-based (invariants métier)
 */
console.log('📋 Property Tests - Invariants Métier (No False-Approve, Déterminisme)');
console.log('-'.repeat(80));
const propsResult = runCommand(
  'npm run test:properties -- __tests__/properties/providers.properties.test.ts',
  'Property Tests - Providers'
);

/**
 * Tests adversariaux (parsing/injection)
 */
console.log('📋 Adversarial Tests - Parsing / Injection / Schéma');
console.log('-'.repeat(80));
const advResult = runCommand(
  'npm run test:providers',
  'Adversarial Tests - Providers'
);

/**
 * Test de stabilité (5 runs)
 */
console.log('📋 Test de Stabilité (5 runs consécutifs)');
console.log('-'.repeat(80));
let stabilityPassed = true;
const durations = [];

for (let i = 1; i <= 5; i++) {
  console.log(`Run ${i}/5:`);
  try {
    const output = execSync('npm run test:providers', { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    const testFilesMatch = output.match(/Test Files\s+(\d+)\s+passed/);
    const testsMatch = output.match(/Tests\s+(\d+)\s+passed/);
    const durationMatch = output.match(/Duration\s+([\d.]+)s/);
    
    if (testFilesMatch && testsMatch) {
      const testFiles = Number.parseInt(testFilesMatch[1]);
      const tests = Number.parseInt(testsMatch[1]);
      const duration = durationMatch ? Number.parseFloat(durationMatch[1]) : null;
      
      if (testFiles === 2 && tests === 16) {
        console.log(`  ✅ Run ${i}: ${testFiles} fichiers, ${tests} tests`);
        if (duration) {
          durations.push(duration);
          console.log(`     Durée: ${duration.toFixed(2)}s`);
        }
      } else {
        console.log(`  ❌ Run ${i}: Échec (${testFiles} fichiers, ${tests} tests au lieu de 2 fichiers, 16 tests)`);
        stabilityPassed = false;
      }
    } else {
      console.log(`  ❌ Run ${i}: Impossible d'extraire les statistiques`);
      stabilityPassed = false;
    }
  } catch (error) {
    console.log(`  ❌ Run ${i}: Erreur - ${error.message}`);
    stabilityPassed = false;
  }
}

console.log('');

if (stabilityPassed && durations.length > 0) {
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  console.log(`✅ Stabilité: 5/5 runs réussis`);
  console.log(`⏱️  Durée moyenne: ${avgDuration.toFixed(2)}s (min: ${minDuration.toFixed(2)}s, max: ${maxDuration.toFixed(2)}s)`);
} else {
  console.log(`❌ Stabilité: Échec`);
  allPassed = false;
}

console.log('');

/**
 * Résumé final
 */
console.log('📊 RÉSUMÉ FINAL');
console.log('='.repeat(80));
console.log('');

const invariants = [
  { name: 'No False-Approve', status: propsResult.success ? '✅ PROUVÉ' : '❌ ÉCHEC' },
  { name: 'Déterminisme sous échec', status: propsResult.success ? '✅ PROUVÉ' : '❌ ÉCHEC' },
  { name: 'Fail-Closed Strict', status: propsResult.success && advResult.success ? '✅ PROUVÉ' : '❌ ÉCHEC' },
  { name: 'Parsing/JSR Invalide', status: advResult.success ? '✅ PROUVÉ' : '❌ ÉCHEC' },
  { name: 'Prompt Injection', status: advResult.success ? '✅ PROUVÉ' : '❌ ÉCHEC' },
  { name: 'Stabilité (5 runs)', status: stabilityPassed ? '✅ STABLE' : '❌ INSTABLE' }
];

invariants.forEach(inv => {
  console.log(`  ${inv.status} - ${inv.name}`);
});

console.log('');

const totalDuration = (propsResult.duration || 0) + (advResult.duration || 0);
if (totalDuration < 120) {
  console.log(`✅ Time Budget: ${totalDuration.toFixed(2)}s < 120s (RESPECTÉ)`);
} else {
  console.log(`❌ Time Budget: ${totalDuration.toFixed(2)}s >= 120s (DÉPASSÉ)`);
  allPassed = false;
}

console.log('');

if (allPassed && stabilityPassed) {
  console.log('✅ VAGUE 1.4: TOUS LES CRITÈRES DE SUCCÈS ATTEINTS');
  console.log('');
  console.log('🎯 Invariants prouvés:');
  console.log('   - No False-Approve: ✅ ProviderResult status != OK => jamais approve');
  console.log('   - Fail-Closed: ✅ Toutes erreurs normalisées, jamais acceptées silencieusement');
  console.log('   - Déterminisme: ✅ Mêmes événements => même décision');
  console.log('');
  console.log('🔒 Preuves disponibles:');
  console.log('   - Property tests: __tests__/properties/providers.properties.test.ts');
  console.log('   - Adversarial tests: __tests__/adversarial/providers.adversarial.test.ts');
  console.log('   - Documentation: docs/VAGUE1_4_PROVIDERS_PROGRESS.md');
  process.exit(0);
} else {
  console.log('❌ VAGUE 1.4: CERTAINS CRITÈRES NON ATTEINTS');
  process.exit(1);
}
