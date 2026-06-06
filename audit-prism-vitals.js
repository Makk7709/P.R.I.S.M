/**
 * Audit complet de PrismVitals
 * Test chaque composant individuellement
 */

console.log('🔍 AUDIT PRISM VITALS - DÉMARRAGE');
console.log('=====================================');

// Test 1: Imports de base
console.log('\n1️⃣ TEST DES IMPORTS...');

try {
  console.log('   Testing prismBus...');
  const _prismBus = await import('./prismBus.js');
  console.log('   ✅ prismBus: OK');
} catch (e) {
  console.log('   ❌ prismBus: FAILED -', e.message);
}

try {
  console.log('   Testing prismLogger...');
  const _prismLogger = await import('./monitoring/prismLogger.js');
  console.log('   ✅ prismLogger: OK');
} catch (e) {
  console.log('   ❌ prismLogger: FAILED -', e.message);
}

try {
  console.log('   Testing TrustContext...');
  const { _getTrustContext } = await import('./src/core/TrustContext.js');
  console.log('   ✅ TrustContext: OK');
} catch (e) {
  console.log('   ❌ TrustContext: FAILED -', e.message);
}

// Test 2: Création d'instance simple
console.log('\n2️⃣ TEST CRÉATION INSTANCE...');

try {
  const PrismVitals = (await import('./prismVitals.js')).default;
  console.log('   ✅ Import PrismVitals: OK');
  
  const vitals = new PrismVitals();
  console.log('   ✅ Création instance: OK');
  
  // Attendre 2 secondes pour l'initialisation
  console.log('   ⏳ Attente initialisation (2s)...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('   📊 État initialisation:', vitals.isInitialized);
  
  if (vitals.isInitialized) {
    console.log('   ✅ Initialisation: RÉUSSIE');
  } else {
    console.log('   ❌ Initialisation: ÉCHOUÉE');
  }
  
} catch (e) {
  console.log('   ❌ Création instance: FAILED -', e.message);
  console.log('   📋 Stack:', e.stack);
}

// Test 3: Méthodes de base
console.log('\n3️⃣ TEST DES MÉTHODES...');

try {
  const PrismVitals = (await import('./prismVitals.js')).default;
  const vitals = new PrismVitals();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('   Testing getConsensusMetrics...');
  const _consensus = vitals.getConsensusMetrics();
  console.log('   ✅ getConsensusMetrics: OK');
  
  console.log('   Testing getSecurityMetrics...');
  const _security = vitals.getSecurityMetrics();
  console.log('   ✅ getSecurityMetrics: OK');
  
  console.log('   Testing getVitalsReport...');
  const _report = vitals.getVitalsReport();
  console.log('   ✅ getVitalsReport: OK');
  
} catch (e) {
  console.log('   ❌ Test méthodes: FAILED -', e.message);
}

console.log('\n🏁 AUDIT TERMINÉ');
console.log('====================================='); 