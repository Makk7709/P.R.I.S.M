#!/usr/bin/env node

/**
 * UPDATE FREEZE MANIFEST
 * 
 * Met à jour le manifest de freeze pour un module donné.
 * Utilisé par pnpm freeze:consensus
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Main
const module = process.argv[2] || 'tests/consensus';

console.log(`🔄 Mise à jour manifest de freeze pour ${module}...`);

// Utiliser le script consensus-invariant-guard.mjs pour la mise à jour
const guardScript = join(projectRoot, 'scripts', 'consensus-invariant-guard.mjs');

try {
  const { spawn } = await import('node:child_process');
  
  const child = spawn('node', [guardScript, 'update'], {
    stdio: 'inherit',
    cwd: projectRoot
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Manifest de freeze mis à jour avec succès');
    } else {
      console.error('❌ Erreur mise à jour manifest de freeze');
      process.exit(code);
    }
  });
  
} catch (error) {
  console.error('❌ Erreur exécution script guard:', error.message);
  process.exit(1);
}
