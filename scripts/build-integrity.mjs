#!/usr/bin/env node

/**
 * BUILD INTEGRITY
 * 
 * Génère le rapport d'intégrité integrity.json
 * avec les hash SHA-256 des rapports de validation.
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Chemins des rapports
const COVERAGE_PATH = join(projectRoot, 'coverage', 'coverage-final.json');
const MUTATION_PATH = join(projectRoot, 'reports', 'mutation', 'stryker-report.json');
const VALIDATION_PATH = join(projectRoot, 'reports', 'consensus-validation-summary.json');
const OUTPUT_PATH = join(projectRoot, 'reports', 'integrity.json');

/**
 * Calcule le hash SHA-256 d'un fichier
 */
function calculateFileHash(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = readFileSync(filePath, 'utf8');
    const hash = createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  } catch (error) {
    console.error(`❌ Erreur hash ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Génère le rapport d'intégrité
 */
async function buildIntegrity() {
  console.log('🔒 Génération rapport d\'intégrité...\n');
  
  // Calculer les hash des rapports
  const coverage_sha256 = calculateFileHash(COVERAGE_PATH);
  const mutation_sha256 = calculateFileHash(MUTATION_PATH);
  const validation_sha256 = calculateFileHash(VALIDATION_PATH);
  
  // Construire le rapport d'intégrité
  const integrity = {
    module: 'ConsensusManager',
    timestamp: new Date().toISOString(),
    job_id: `integrity-${Date.now()}`,
    reports: {
      coverage: {
        path: 'coverage/coverage-final.json',
        sha256: coverage_sha256,
        exists: coverage_sha256 !== null
      },
      mutation: {
        path: 'reports/mutation/stryker-report.json',
        sha256: mutation_sha256,
        exists: mutation_sha256 !== null
      },
      validation: {
        path: 'reports/consensus-validation-summary.json',
        sha256: validation_sha256,
        exists: validation_sha256 !== null
      }
    },
    integrity_checks: {
      coverage_sha256,
      mutation_sha256,
      validation_sha256
    }
  };
  
  // Écrire le rapport
  try {
    // S'assurer que le dossier reports existe
    const reportsDir = join(projectRoot, 'reports');
    if (!existsSync(reportsDir)) {
      const fs = await import('fs');
      await fs.promises.mkdir(reportsDir, { recursive: true });
    }
    
    writeFileSync(OUTPUT_PATH, JSON.stringify(integrity, null, 2));
    
    console.log('✅ Rapport d\'intégrité généré:', OUTPUT_PATH);
    console.log('📋 Rapports vérifiés:');
    Object.entries(integrity.reports).forEach(([name, report]) => {
      const status = report.exists ? '✅' : '❌';
      const hash = report.sha256 ? `${report.sha256.substring(0, 12)  }...` : 'N/A';
      console.log(`   ${status} ${name}: ${hash}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur écriture rapport d\'intégrité:', error.message);
    process.exit(1);
  }
}

// Main
buildIntegrity();
