#!/usr/bin/env node

/**
 * Test Rapide - Consensus Demo PRISM
 * Vérifie que tous les composants de démo fonctionnent
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Test Consensus Demo PRISM\n');

const tests = [];

// Test 1: Vérifier les fichiers de démo
function testDemoFiles() {
  const files = [
    'dashboard/consensus-demo.html',
    'demo-consensus-live.js',
    'launch-consensus-demo.js',
    'src/core/ConsensusManager.js',
    'DEMO_CONSENSUS_GUIDE.md'
  ];

  let allExists = true;

  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MANQUANT`);
      allExists = false;
    }
  });

  return allExists;
}

// Test 2: Vérifier le ConsensusManager
async function testConsensusManager() {
  try {
    const { ConsensusManager, DecisionType, AIProvider } = await import('./src/core/ConsensusManager.js');
    
    console.log('✅ ConsensusManager importé');
    console.log(`✅ Providers disponibles: ${Object.keys(AIProvider).length}`);
    console.log(`✅ Types de décision: ${Object.keys(DecisionType).length}`);
    
    // Test rapide d'instanciation
    const manager = new ConsensusManager({ timeoutMs: 100 });
    console.log('✅ ConsensusManager instancié');
    
    manager.cleanup();
    return true;
  } catch (error) {
    console.log(`❌ ConsensusManager: ${error.message}`);
    return false;
  }
}

// Test 3: Vérifier les dépendances
async function testDependencies() {
  const deps = ['chalk', 'crypto'];
  let allOk = true;

  for (const dep of deps) {
    try {
      if (dep === 'crypto') {
        const crypto = await import('crypto');
        console.log(`✅ ${dep} (built-in)`);
      } else {
        await import(dep);
        console.log(`✅ ${dep}`);
      }
    } catch (error) {
      console.log(`❌ ${dep} - MANQUANT`);
      allOk = false;
    }
  }

  return allOk;
}

// Test 4: Vérifier l'interface web
function testWebInterface() {
  const htmlPath = path.join(__dirname, 'dashboard/consensus-demo.html');
  
  if (!fs.existsSync(htmlPath)) {
    console.log('❌ Interface web manquante');
    return false;
  }

  const content = fs.readFileSync(htmlPath, 'utf8');
  
  const checks = [
    { name: 'JavaScript', test: content.includes('<script>') },
    { name: 'CSS Styles', test: content.includes('<style>') },
    { name: 'Consensus Class', test: content.includes('class ConsensusDemo') },
    { name: 'AI Cards', test: content.includes('ai-card') }
  ];

  let allOk = true;
  checks.forEach(check => {
    if (check.test) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name}`);
      allOk = false;
    }
  });

  return allOk;
}

// Test 5: Simulation consensus rapide
async function testConsensusSimulation() {
  try {
    const { ConsensusManager, DecisionType } = await import('./src/core/ConsensusManager.js');
    const manager = new ConsensusManager({ timeoutMs: 500 });
    
    console.log('🔄 Test simulation consensus...');
    
    // Écouter les événements
    let proposalCreated = false;
    let voteReceived = false;
    let consensusReached = false;

    manager.on('proposalCreated', () => {
      proposalCreated = true;
      console.log('✅ Événement: proposalCreated');
    });

    manager.on('voteSubmitted', () => {
      voteReceived = true;
      console.log('✅ Événement: voteSubmitted');
    });

    manager.on('consensusReached', () => {
      consensusReached = true;
      console.log('✅ Événement: consensusReached');
    });

    // Créer une proposition test
    await manager.propose(
      'test-hash-' + Date.now(),
      {
        riskLevel: 0.3,
        evidenceQuality: 0.8,
        ethicalConcerns: false
      },
      DecisionType.CRITICAL
    );

    // Attendre les résultats
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    manager.cleanup();

    const success = proposalCreated && voteReceived && consensusReached;
    console.log(success ? '✅ Simulation consensus réussie' : '❌ Simulation consensus échouée');
    
    return success;
  } catch (error) {
    console.log(`❌ Simulation consensus: ${error.message}`);
    return false;
  }
}

// Exécution des tests
async function runAllTests() {
  console.log('📁 Test 1: Fichiers de démo');
  console.log('─'.repeat(30));
  const filesOk = testDemoFiles();
  console.log('');

  console.log('🔧 Test 2: ConsensusManager');
  console.log('─'.repeat(30));
  const managerOk = await testConsensusManager();
  console.log('');

  console.log('📦 Test 3: Dépendances');
  console.log('─'.repeat(30));
  const depsOk = await testDependencies();
  console.log('');

  console.log('🌐 Test 4: Interface Web');
  console.log('─'.repeat(30));
  const webOk = testWebInterface();
  console.log('');

  console.log('🧪 Test 5: Simulation Consensus');
  console.log('─'.repeat(30));
  const simOk = await testConsensusSimulation();
  console.log('');

  // Résumé
  const allTests = [
    { name: 'Fichiers', result: filesOk },
    { name: 'ConsensusManager', result: managerOk },
    { name: 'Dépendances', result: depsOk },
    { name: 'Interface Web', result: webOk },
    { name: 'Simulation', result: simOk }
  ];

  const passed = allTests.filter(t => t.result).length;
  const total = allTests.length;

  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('═'.repeat(40));
  
  allTests.forEach(test => {
    const icon = test.result ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
  });

  console.log('─'.repeat(40));
  console.log(`📈 Score: ${passed}/${total} tests réussis`);

  if (passed === total) {
    console.log('\n🎉 TOUS LES TESTS PASSÉS - PRÊT POUR GARTNER!');
    console.log('\n🚀 Commandes de lancement:');
    console.log('• Interface Web: open dashboard/consensus-demo.html');
    console.log('• Terminal: node launch-consensus-demo.js');
    console.log('• Dashboard: cd dashboard && npm run dev');
  } else {
    console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('📖 Consultez DEMO_CONSENSUS_GUIDE.md pour l\'aide');
    
    if (!depsOk) {
      console.log('\n💡 Installation dépendances:');
      console.log('npm install chalk');
    }
  }

  return passed === total;
}

// Point d'entrée
runAllTests().catch(console.error); 