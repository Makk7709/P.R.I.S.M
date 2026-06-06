#!/usr/bin/env node
/**
 * 🎯 AUDIT QUALITÉ TESTS VITEST - TDD STRICT
 * 
 * Vérifie la qualité des tests selon standards military grade:
 * 1. Structure et organisation
 * 2. Complétude des assertions
 * 3. Couverture cas limites
 * 4. Mocks appropriés
 * 5. Isolation des tests
 * 6. Documentation et clarté
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRISM_ROOT = path.join(__dirname, '..');

const TEST_FILES = [
  '__tests__/integration/trustContext-hybridOrchestrator.spec.ts',
  '__tests__/integration/trustContext-excelAnalyzer.spec.ts',
  '__tests__/integration/trustContext-server.spec.ts'
];

const RESULTS = {
  files: {},
  global: {
    totalTests: 0,
    totalAssertions: 0,
    issues: [],
    strengths: []
  }
};

function analyzeTestFile(filePath) {
  const fullPath = path.join(PRISM_ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    return {
      exists: false,
      error: 'File not found'
    };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  
  const analysis = {
    exists: true,
    path: filePath,
    lines: content.split('\n').length,
    
    // Structure
    describeBlocks: (content.match(/describe\(/g) || []).length,
    itBlocks: (content.match(/it\(/g) || []).length,
    testBlocks: (content.match(/(it|test)\(/g) || []).length,
    
    // Assertions
    expectCalls: (content.match(/expect\(/g) || []).length,
    assertions: (content.match(/expect\(.*\)\.(toBe|toEqual|toHaveBeenCalled|toMatch|toContain|toThrow|toHaveProperty)/g) || []).length,
    
    // Mocks
    viFn: (content.match(/vi\.fn\(/g) || []).length,
    viMock: (content.match(/vi\.mock\(/g) || []).length,
    viSpyOn: (content.match(/vi\.spyOn\(/g) || []).length,
    
    // Setup/Teardown
    beforeEach: (content.match(/beforeEach\(/g) || []).length,
    afterEach: (content.match(/afterEach\(/g) || []).length,
    beforeAll: (content.match(/beforeAll\(/g) || []).length,
    afterAll: (content.match(/afterAll\(/g) || []).length,
    
    // Cas limites
    edgeCases: (content.match(/(edge|cas limite|boundary|null|undefined|empty|invalid)/gi) || []).length,
    errorHandling: (content.match(/(catch|rejects|throws|error|fail)/gi) || []).length,
    
    // Documentation
    comments: (content.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || []).length,
    docStrings: (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length,
    
    // Imports
    imports: (content.match(/^import .* from/gm) || []).length,
    
    // Issues
    issues: [],
    strengths: [],
    score: 0
  };
  
  // Calcul du score (0-100)
  let score = 0;
  
  // Structure (20 points)
  if (analysis.describeBlocks >= 3) score += 10;
  else if (analysis.describeBlocks >= 1) score += 5;
  
  if (analysis.itBlocks >= 8) score += 10;
  else if (analysis.itBlocks >= 5) score += 5;
  
  // Assertions (25 points)
  const assertionsPerTest = analysis.assertions / Math.max(analysis.itBlocks, 1);
  if (assertionsPerTest >= 3) score += 15;
  else if (assertionsPerTest >= 2) score += 10;
  else if (assertionsPerTest >= 1) score += 5;
  
  if (analysis.expectCalls >= analysis.itBlocks * 2) score += 10;
  else if (analysis.expectCalls >= analysis.itBlocks) score += 5;
  
  // Mocks (15 points)
  if (analysis.viFn >= analysis.itBlocks * 0.5) score += 8;
  else if (analysis.viFn >= analysis.itBlocks * 0.3) score += 4;
  
  if (analysis.beforeEach > 0) score += 4;
  if (analysis.afterEach > 0) score += 3;
  
  // Cas limites (20 points)
  if (analysis.edgeCases >= 3) score += 10;
  else if (analysis.edgeCases >= 1) score += 5;
  
  if (analysis.errorHandling >= 3) score += 10;
  else if (analysis.errorHandling >= 2) score += 5;
  
  // Documentation (10 points)
  const commentsPerTest = analysis.comments / Math.max(analysis.itBlocks, 1);
  if (commentsPerTest >= 2) score += 5;
  else if (commentsPerTest >= 1) score += 3;
  
  if (analysis.docStrings > 0) score += 5;
  
  // Complétude (10 points)
  if (analysis.lines >= 200) score += 5; // Tests détaillés
  if (analysis.imports >= 3) score += 5; // Bonnes dépendances
  
  analysis.score = Math.min(100, score);
  
  // Détection d'issues
  if (analysis.itBlocks === 0) {
    analysis.issues.push('Aucun test (it/test) trouvé');
  }
  
  if (analysis.assertions / Math.max(analysis.itBlocks, 1) < 1) {
    analysis.issues.push(`Ratio assertions/test faible: ${(analysis.assertions / Math.max(analysis.itBlocks, 1)).toFixed(2)}`);
  }
  
  if (analysis.beforeEach === 0 && analysis.itBlocks > 0) {
    analysis.issues.push('Pas de beforeEach - isolation des tests non garantie');
  }
  
  if (analysis.edgeCases === 0 && analysis.itBlocks >= 5) {
    analysis.issues.push('Aucun test de cas limite détecté');
  }
  
  if (analysis.errorHandling === 0 && analysis.itBlocks >= 5) {
    analysis.issues.push('Aucun test de gestion d\'erreur détecté');
  }
  
  // Détection des forces
  if (analysis.assertions >= analysis.itBlocks * 3) {
    analysis.strengths.push('Excellent ratio assertions/test');
  }
  
  if (analysis.describeBlocks >= 4) {
    analysis.strengths.push('Bonne organisation en describe blocks');
  }
  
  if (analysis.edgeCases >= 3 && analysis.errorHandling >= 3) {
    analysis.strengths.push('Bonne couverture cas limites et erreurs');
  }
  
  if (analysis.beforeEach > 0 && analysis.afterEach > 0) {
    analysis.strengths.push('Setup/teardown appropriés');
  }
  
  // Vérifier imports
  const importIssues = [];
  if (!content.includes("import { describe, it, expect")) {
    importIssues.push('Imports Vitest manquants ou incomplets');
  }
  if (content.includes('require(') && !content.includes('import')) {
    importIssues.push('Utilise require au lieu de import (ESM)');
  }
  
  if (importIssues.length > 0) {
    analysis.issues.push(...importIssues);
  }
  
  // Vérifier structure async/await
  if (analysis.itBlocks > 0 && !content.includes('async')) {
    analysis.issues.push('Tests asynchrones sans async/await');
  }
  
  return analysis;
}

function generateReport() {
  console.log(`\n${  '='.repeat(80)}`);
  console.log('📊 AUDIT QUALITÉ TESTS VITEST - TDD STRICT');
  console.log(`${'='.repeat(80)  }\n`);
  
  let totalScore = 0;
  let fileCount = 0;
  
  for (const file of TEST_FILES) {
    const analysis = analyzeTestFile(file);
    
    if (!analysis.exists) {
      console.log(`❌ ${file}: FICHIER NON TROUVÉ\n`);
      continue;
    }
    
    RESULTS.files[file] = analysis;
    RESULTS.global.totalTests += analysis.itBlocks;
    RESULTS.global.totalAssertions += analysis.assertions;
    
    fileCount++;
    totalScore += analysis.score;
    
    console.log(`📄 ${path.basename(file)}`);
    console.log('─'.repeat(80));
    console.log(`   Score: ${analysis.score}/100`);
    console.log(`   Tests: ${analysis.itBlocks} | Assertions: ${analysis.assertions} | Ratio: ${(analysis.assertions / Math.max(analysis.itBlocks, 1)).toFixed(2)}`);
    console.log(`   Describe blocks: ${analysis.describeBlocks} | Mocks: ${analysis.viFn} | Setup: ${analysis.beforeEach} beforeEach, ${analysis.afterEach} afterEach`);
    console.log(`   Cas limites: ${analysis.edgeCases} | Gestion erreurs: ${analysis.errorHandling}`);
    console.log(`   Documentation: ${analysis.comments} commentaires, ${analysis.docStrings} doc blocks`);
    
    if (analysis.strengths.length > 0) {
      console.log(`\n   ✅ Forces:`);
      analysis.strengths.forEach(s => console.log(`      - ${s}`));
    }
    
    if (analysis.issues.length > 0) {
      console.log(`\n   ⚠️  Problèmes:`);
      analysis.issues.forEach(i => console.log(`      - ${i}`));
      RESULTS.global.issues.push(...analysis.issues.map(issue => `${file}: ${issue}`));
    }
    
    console.log('');
  }
  
  const avgScore = fileCount > 0 ? totalScore / fileCount : 0;
  
  console.log('='.repeat(80));
  console.log('📊 RÉSUMÉ GLOBAL');
  console.log('='.repeat(80));
  console.log(`   Fichiers analysés: ${fileCount}/${TEST_FILES.length}`);
  console.log(`   Score moyen: ${avgScore.toFixed(1)}/100`);
  console.log(`   Total tests: ${RESULTS.global.totalTests}`);
  console.log(`   Total assertions: ${RESULTS.global.totalAssertions}`);
  console.log(`   Ratio assertions/test: ${(RESULTS.global.totalAssertions / Math.max(RESULTS.global.totalTests, 1)).toFixed(2)}`);
  
  if (RESULTS.global.issues.length > 0) {
    console.log(`\n   ⚠️  Problèmes détectés: ${RESULTS.global.issues.length}`);
    console.log('\n   Détails:');
    RESULTS.global.issues.slice(0, 10).forEach(issue => console.log(`      - ${issue}`));
    if (RESULTS.global.issues.length > 10) {
      console.log(`      ... et ${RESULTS.global.issues.length - 10} autres`);
    }
  }
  
  // Recommandations
  console.log(`\n${  '='.repeat(80)}`);
  console.log('💡 RECOMMANDATIONS');
  console.log('='.repeat(80));
  
  if (avgScore >= 80) {
    console.log('✅ QUALITÉ EXCELLENTE - Tests conformes aux standards TDD strict');
    console.log('   Les tests peuvent être utilisés pour valider l\'implémentation.');
  } else if (avgScore >= 60) {
    console.log('⚠️  QUALITÉ BONNE - Améliorations possibles');
    console.log('   Vérifier les problèmes détectés avant utilisation.');
  } else {
    console.log('❌ QUALITÉ INSUFFISANTE - Tests à retravailler');
    console.log('   Corriger les problèmes majeurs avant utilisation.');
  }
  
  // Critères spécifiques
  const recommendations = [];
  
  if (RESULTS.global.totalAssertions / Math.max(RESULTS.global.totalTests, 1) < 2) {
    recommendations.push('Augmenter le nombre d\'assertions par test (minimum 2-3)');
  }
  
  if (RESULTS.global.issues.some(i => i.includes('beforeEach'))) {
    recommendations.push('Ajouter beforeEach pour isolation des tests');
  }
  
  if (RESULTS.global.issues.some(i => i.includes('cas limite'))) {
    recommendations.push('Ajouter plus de tests de cas limites');
  }
  
  if (recommendations.length > 0) {
    console.log('\n   Actions recommandées:');
    recommendations.forEach(r => console.log(`   - ${r}`));
  }
  
  console.log(`\n${  '='.repeat(80)}`);
  
  return avgScore >= 70; // Seuil de qualité acceptable
}

// Exécution
const isQualityOK = generateReport();
process.exit(isQualityOK ? 0 : 1);
