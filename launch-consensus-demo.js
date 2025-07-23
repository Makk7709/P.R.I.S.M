#!/usr/bin/env node

/**
 * Lanceur pour la démo PRISM Consensus IA
 * Vérifie les dépendances et lance la démo
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🎯 PRISM Consensus IA - Lancement de la Démo\n');

// Vérifier si chalk est installé
async function checkDependencies() {
  try {
    await import('chalk');
    return true;
  } catch (error) {
    console.log('❌ Dépendance manquante: chalk');
    console.log('💡 Installation automatique...\n');
    
    return new Promise((resolve) => {
      const npm = spawn('npm', ['install', 'chalk'], { 
        stdio: 'inherit',
        shell: true 
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Chalk installé avec succès!\n');
          resolve(true);
        } else {
          console.log('❌ Échec de l\'installation de chalk');
          console.log('📝 Veuillez exécuter: npm install chalk');
          resolve(false);
        }
      });
    });
  }
}

// Vérifier si le ConsensusManager existe
function checkPrismCore() {
  const consensusPath = join(__dirname, 'src', 'core', 'ConsensusManager.js');
  if (!fs.existsSync(consensusPath)) {
    console.log('❌ ConsensusManager non trouvé');
    console.log(`📁 Recherché dans: ${consensusPath}`);
    console.log('💡 Assurez-vous d\'être dans le répertoire racine de PRISM\n');
    return false;
  }
  return true;
}

// Afficher les instructions de démo
function displayDemoInstructions() {
  console.log('🎮 INSTRUCTIONS POUR LA DÉMO GARTNER:');
  console.log('═'.repeat(50));
  console.log('1. 📝 Posez des questions pour tester le consensus');
  console.log('2. 🤖 Observez les réponses des 3 IA en temps réel');
  console.log('3. 🗳️  Suivez le processus de vote 2/3 majorité');
  console.log('4. 📊 Tapez "stats" pour voir les métriques');
  console.log('5. ❓ Tapez "help" pour l\'aide');
  console.log('6. 🚪 Tapez "quit" pour quitter');
  console.log('═'.repeat(50));
  console.log('');
}

// Lancement principal
async function main() {
  // Vérifier PRISM core
  if (!checkPrismCore()) {
    process.exit(1);
  }
  
  // Vérifier les dépendances
  const depsOk = await checkDependencies();
  if (!depsOk) {
    process.exit(1);
  }
  
  // Afficher les instructions
  displayDemoInstructions();
  
  // Lancer la démo
  console.log('🚀 Lancement de la démo...\n');
  
  try {
    const { ConsensusDemoLive } = await import('./demo-consensus-live.js');
    const demo = new ConsensusDemoLive();
    await demo.start();
  } catch (error) {
    console.error('❌ Erreur de lancement:', error.message);
    console.log('\n💡 Solutions possibles:');
    console.log('• Vérifiez que vous êtes dans le répertoire PRISM');
    console.log('• Exécutez: npm install');
    console.log('• Vérifiez que les modules PRISM sont présents');
    process.exit(1);
  }
}

main().catch(console.error); 