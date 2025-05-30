#!/usr/bin/env node

/**
 * Test Phase 1 - Route API PRISM avec intégration réelle
 * Tests complets avec vraies clés API (non mockées)
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const API_BASE = 'http://localhost:3000';
const API_CHAT = `${API_BASE}/api/chat`;

console.log(chalk.blue.bold('🎯 PRISM Phase 1 - Tests API Réels\n'));

let passedTests = 0;
let totalTests = 0;

async function test(name, testFn) {
  totalTests++;
  console.log(chalk.yellow(`🧪 Test: ${name}`));
  
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    passedTests++;
    console.log(chalk.green(`✅ PASSÉ (${duration}ms)\n`));
  } catch (error) {
    console.log(chalk.red(`❌ ÉCHOUÉ: ${error.message}\n`));
  }
}

async function testBasicChat() {
  const response = await fetch(API_CHAT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Bonjour PRISM, test basique de fonctionnement'
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data.error}`);
  }

  if (!data.success) {
    throw new Error(`API error: ${data.error}`);
  }

  if (!data.response || !data.metadata) {
    throw new Error('Structure de réponse invalide');
  }

  console.log(chalk.gray(`📝 Réponse: ${data.response.choices?.[0]?.message?.content?.substring(0, 100)}...`));
}

async function testValidation() {
  const response = await fetch(API_CHAT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}) // Message manquant
  });

  const data = await response.json();
  
  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (data.code !== 'MISSING_MESSAGE') {
    throw new Error(`Expected MISSING_MESSAGE, got ${data.code}`);
  }
}

async function testTaskTypes() {
  const taskTypes = ['marketing', 'finance', 'email', 'general'];
  
  for (const taskType of taskTypes) {
    const response = await fetch(API_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Test pour ${taskType}`,
        taskType
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`TaskType ${taskType} failed: ${data.error}`);
    }

    if (data.metadata.taskType !== taskType) {
      throw new Error(`TaskType mismatch: expected ${taskType}, got ${data.metadata.taskType}`);
    }

    console.log(chalk.gray(`📝 ${taskType}: ${data.metadata.processingTime}ms`));
  }
}

async function testMetadata() {
  const response = await fetch(API_CHAT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Test métadonnées',
      taskType: 'analysis',
      model: 'claude'
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data.error}`);
  }

  const metadata = data.metadata;
  
  if (metadata.taskType !== 'analysis') {
    throw new Error(`TaskType incorrect: ${metadata.taskType}`);
  }

  if (metadata.model !== 'claude') {
    throw new Error(`Model incorrect: ${metadata.model}`);
  }

  if (!metadata.timestamp || !metadata.processingTime) {
    throw new Error('Métadonnées manquantes');
  }

  // Vérifier que le timestamp est valide
  if (isNaN(new Date(metadata.timestamp).getTime())) {
    throw new Error('Timestamp invalide');
  }

  console.log(chalk.gray(`📝 Métadonnées validées: ${JSON.stringify(metadata, null, 2)}`));
}

async function testPerformance() {
  const startTime = Date.now();
  const promises = [];
  
  // 5 requêtes simultanées
  for (let i = 0; i < 5; i++) {
    promises.push(
      fetch(API_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Test performance ${i + 1}`
        })
      })
    );
  }

  const responses = await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  // Vérifier que toutes les réponses sont OK
  for (let i = 0; i < responses.length; i++) {
    if (!responses[i].ok) {
      throw new Error(`Requête ${i + 1} échouée: ${responses[i].status}`);
    }
  }

  if (duration > 30000) { // 30 secondes max
    throw new Error(`Performance trop lente: ${duration}ms`);
  }

  console.log(chalk.gray(`📝 5 requêtes simultanées en ${duration}ms`));
}

async function testServerStatus() {
  const response = await fetch(`${API_BASE}/api/metrics`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Metrics endpoint failed: ${response.status}`);
  }

  if (data.status !== 'operational') {
    throw new Error(`Server not operational: ${data.status}`);
  }

  console.log(chalk.gray(`📝 Serveur: ${data.status}, Version: ${data.version}`));
}

async function testInvestorDashboard() {
  const response = await fetch(`${API_BASE}/`);
  const html = await response.text();
  
  if (!response.ok) {
    throw new Error(`Dashboard failed: ${response.status}`);
  }

  if (!html.includes('Dashboard Investisseurs')) {
    throw new Error('Section investisseurs manquante');
  }

  console.log(chalk.gray(`📝 Dashboard investisseurs détecté`));
}

// Exécution des tests
async function runTests() {
  console.log(chalk.blue('📡 Vérification de la connectivité serveur...\n'));
  
  try {
    await test('Statut du serveur', testServerStatus);
    await test('Dashboard investisseurs présent', testInvestorDashboard);
    await test('Chat basique avec OpenAI', testBasicChat);
    await test('Validation des paramètres', testValidation);
    await test('Support multi-modèles', testTaskTypes);
    await test('Métadonnées complètes', testMetadata);
    await test('Performance simultanée', testPerformance);
  } catch (error) {
    console.log(chalk.red(`💥 Erreur critique: ${error.message}`));
    process.exit(1);
  }

  // Résultats finaux
  console.log(chalk.blue.bold('\n📊 RÉSULTATS PHASE 1:'));
  console.log(chalk.green(`✅ Tests passés: ${passedTests}/${totalTests}`));
  
  if (passedTests === totalTests) {
    console.log(chalk.green.bold('🎉 PHASE 1 COMPLÈTE - Route API /api/chat fonctionnelle !'));
    console.log(chalk.yellow('➡️  Prêt pour Phase 2: Frontend Vocal Connecté'));
  } else {
    console.log(chalk.red.bold('❌ Certains tests ont échoué'));
    process.exit(1);
  }
}

runTests().catch(console.error); 