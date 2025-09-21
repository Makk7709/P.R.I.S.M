#!/usr/bin/env node

/**
 * CONSENSUS INVARIANT GUARD
 * 
 * Script de protection des tests invariants gelés.
 * Calcule SHA-256 des fichiers invariants et compare au manifest.
 * Exit(1) si divergence détectée.
 * 
 * Usage: node scripts/consensus-invariant-guard.mjs
 */

import { createHash } from 'crypto';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Fichiers invariants à protéger
const INVARIANT_FILES = [
  'tests/consensus/consensus.invariants.spec.ts'
];

// Manifest de freeze
const FREEZE_MANIFEST_PATH = join(projectRoot, 'tests/consensus/.freeze-manifest.json');

/**
 * Calcule le hash SHA-256 d'un fichier
 */
function calculateFileHash(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const hash = createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  } catch (error) {
    console.error(`❌ Erreur lecture fichier ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Obtient les métadonnées d'un fichier
 */
function getFileMetadata(filePath) {
  const fullPath = join(projectRoot, filePath);
  if (!existsSync(fullPath)) {
    console.error(`❌ Fichier manquant: ${filePath}`);
    process.exit(1);
  }
  
  const stats = statSync(fullPath);
  return {
    path: filePath,
    sha256: calculateFileHash(fullPath),
    size: stats.size,
    mtime: stats.mtime.toISOString()
  };
}

/**
 * Lit le manifest de freeze
 */
function readFreezeManifest() {
  if (!existsSync(FREEZE_MANIFEST_PATH)) {
    console.error(`❌ Manifest de freeze manquant: ${FREEZE_MANIFEST_PATH}`);
    console.log('💡 Exécutez d\'abord: pnpm freeze:consensus');
    process.exit(1);
  }
  
  try {
    const content = readFileSync(FREEZE_MANIFEST_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Erreur lecture manifest:`, error.message);
    process.exit(1);
  }
}

/**
 * Génère un nouveau manifest de freeze
 */
function generateFreezeManifest() {
  const manifest = {
    version: '1.0.0',
    module: 'ConsensusManager',
    description: 'Manifest de freeze pour tests invariants',
    timestamp_init: new Date().toISOString(),
    files: {}
  };
  
  for (const filePath of INVARIANT_FILES) {
    const metadata = getFileMetadata(filePath);
    manifest.files[filePath] = metadata;
  }
  
  return manifest;
}

/**
 * Vérifie l'intégrité des fichiers invariants
 */
function guardInvariants() {
  console.log('🔒 CONSENSUS INVARIANT GUARD - Vérification intégrité...\n');
  
  const currentManifest = generateFreezeManifest();
  const storedManifest = readFreezeManifest();
  
  let violations = 0;
  const violations_details = [];
  
  for (const filePath of INVARIANT_FILES) {
    const current = currentManifest.files[filePath];
    const stored = storedManifest.files[filePath];
    
    if (!stored) {
      violations++;
      violations_details.push(`Fichier non gelé: ${filePath}`);
      continue;
    }
    
    if (current.sha256 !== stored.sha256) {
      violations++;
      violations_details.push(`Hash modifié: ${filePath}`);
      violations_details.push(`  Attendu: ${stored.sha256}`);
      violations_details.push(`  Actuel:  ${current.sha256}`);
    }
    
    if (current.size !== stored.size) {
      violations++;
      violations_details.push(`Taille modifiée: ${filePath}`);
      violations_details.push(`  Attendu: ${stored.size} bytes`);
      violations_details.push(`  Actuel:  ${current.size} bytes`);
    }
  }
  
  if (violations > 0) {
    console.error('❌ VIOLATIONS DÉTECTÉES - Tests invariants modifiés!\n');
    violations_details.forEach(detail => console.error(detail));
    console.error('\n🚫 INTERDICTION: Les tests invariants sont GELÉS');
    console.error('💡 Pour modifier, créez un POLICY_CHANGE.md explicite');
    console.error('⚠️  En mode normal, aucun changement autorisé');
    process.exit(1);
  }
  
  console.log('✅ INTÉGRITÉ VÉRIFIÉE - Tous les invariants sont gelés');
  console.log(`📊 Fichiers protégés: ${INVARIANT_FILES.length}`);
  console.log(`🔐 Module: ${storedManifest.module}`);
  console.log(`📅 Gelé depuis: ${storedManifest.timestamp_init}`);
  console.log('\n🎯 Tests invariants: IMMUTABLES ✓');
}

/**
 * Met à jour le manifest de freeze
 */
async function updateFreezeManifest() {
  console.log('📝 Mise à jour du manifest de freeze...\n');
  
  const manifest = generateFreezeManifest();
  
  try {
    const fs = await import('fs');
    await fs.promises.writeFile(
      FREEZE_MANIFEST_PATH, 
      JSON.stringify(manifest, null, 2)
    );
    
    console.log('✅ Manifest mis à jour:', FREEZE_MANIFEST_PATH);
    console.log('🔒 Fichiers gelés:');
    Object.values(manifest.files).forEach(file => {
      console.log(`  ${file.path} (${file.size} bytes, SHA: ${file.sha256.substring(0, 12)}...)`);
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour manifest:', error.message);
    process.exit(1);
  }
}

// Main
const command = process.argv[2];

switch (command) {
  case 'guard':
    guardInvariants();
    break;
  case 'update':
    updateFreezeManifest();
    break;
  case 'generate':
    updateFreezeManifest();
    break;
  default:
    console.log('🔒 CONSENSUS INVARIANT GUARD');
    console.log('Usage:');
    console.log('  node scripts/consensus-invariant-guard.mjs guard    # Vérifier intégrité');
    console.log('  node scripts/consensus-invariant-guard.mjs update   # Mettre à jour manifest');
    console.log('  node scripts/consensus-invariant-guard.mjs generate # Générer nouveau manifest');
    break;
}
