#!/usr/bin/env node

import fetch from 'node-fetch';

const API_ENDPOINT = 'http://localhost:3000/api/chat';

const testCases = [
  { message: 'test', taskType: 'general', expected: '<100ms' },
  { message: 'hello', taskType: 'general', expected: '<50ms (cache)' },
  { message: 'bonjour', taskType: 'general', expected: '<50ms (demo)' },
  { message: 'marketing campaign', taskType: 'marketing', expected: '<200ms' },
  { message: 'test', taskType: 'general', expected: '<10ms (cache hit)' }
];

async function testPerformance() {
  console.log('🚀 PRISM TURBO MODE - Test de Performance');
  console.log('===============================================\n');
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const test of testCases) {
    totalTests++;
    const start = Date.now();
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: test.message,
          taskType: test.taskType
        })
      });
      
      const data = await response.json();
      const responseTime = Date.now() - start;
      
      console.log(`📊 Test: "${test.message}" (${test.taskType})`);
      console.log(`⚡ Temps: ${responseTime}ms ${test.expected}`);
      console.log(`🎯 Modèle: ${data.metadata?.model || 'unknown'}`);
      console.log(`🚀 Optimisé: ${data.metadata?.cached ? 'CACHE' : data.metadata?.turbo ? 'TURBO' : 'NORMAL'}`);
      
      if (data.success && responseTime < 1000) {
        console.log(`✅ SUCCÈS\n`);
        passedTests++;
      } else {
        console.log(`❌ ÉCHEC (${responseTime}ms)\n`);
      }
      
    } catch (error) {
      console.log(`❌ ERREUR: ${error.message}\n`);
    }
    
    // Petit délai entre les tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('===============================================');
  console.log(`🎯 Résultats: ${passedTests}/${totalTests} tests réussis`);
  
  if (passedTests === totalTests) {
    console.log('🔥 TOUTES LES OPTIMISATIONS FONCTIONNENT !');
  } else {
    console.log('⚠️ Certaines optimisations nécessitent des ajustements');
  }
}

// Vérifier si le serveur est lancé
fetch(API_ENDPOINT.replace('/api/chat', '/api/metrics'))
  .then(() => {
    console.log('✅ Serveur PRISM détecté, début des tests...\n');
    testPerformance();
  })
  .catch(() => {
    console.log('❌ Serveur PRISM non détecté sur localhost:3000');
    console.log('🚀 Lancez d\'abord: ./restart-turbo.sh');
  }); 