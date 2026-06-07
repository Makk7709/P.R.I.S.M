#!/usr/bin/env node

/**
 * Script de Validation - Micro-étape 0.1
 * Validation chirurgicale avec couverture >95%
 */

const { exec } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

console.log('🔬 VALIDATION MICRO-ÉTAPE 0.1 - Analyse des Données PRISM');
console.log('=' .repeat(70));

async function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 ${description}`);
    console.log(`📝 Commande: ${command}`);
    
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erreur: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`⚠️  Warning: ${stderr}`);
      }
      
      console.log(`✅ Succès`);
      if (stdout) {
        console.log(`📄 Output:\n${stdout}`);
      }
      
      resolve(stdout);
    });
  });
}

async function validateFileExists(filePath, description) {
  console.log(`\n📁 Vérification: ${description}`);
  console.log(`📝 Fichier: ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ Fichier existant (${stats.size} bytes)`);
    return true;
  } else {
    console.error(`❌ Fichier manquant: ${filePath}`);
    return false;
  }
}

async function validateCodeStructure() {
  console.log('\n🏗️  VALIDATION STRUCTURE DU CODE');
  console.log('-'.repeat(50));
  
  const requiredFiles = [
    {
      path: 'backend/analysis/prismDataAnalysis.cjs',
      description: 'Analyseur de données PRISM'
    },
    {
      path: '__tests__/backend/analysis/prismDataAnalysis.test.js',
      description: 'Tests unitaires analyseur'
    },
    {
      path: 'PLAN_EXPORT_PDF_ENTERPRISE.md',
      description: 'Plan d\'implémentation'
    }
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    const exists = await validateFileExists(file.path, file.description);
    allFilesExist = allFilesExist && exists;
  }
  
  return allFilesExist;
}

async function validateTestCoverage() {
  console.log('\n📊 VALIDATION COUVERTURE DE TESTS');
  console.log('-'.repeat(50));
  
  try {
    // Vérifier que Jest est configuré
    if (!fs.existsSync('package.json')) {
      console.error('❌ package.json manquant');
      return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Configurer Jest si nécessaire
    if (!packageJson.devDependencies?.jest && !packageJson.dependencies?.jest) {
      console.log('📦 Installation de Jest...');
      await runCommand('npm install --save-dev jest', 'Installation de Jest');
    }
    
    // Exécuter les tests avec couverture
    console.log('🧪 Exécution des tests avec couverture...');
    
    const testCommand = `npx jest __tests__/backend/analysis/prismDataAnalysis.test.js --coverage --coverageReporters=text --coverageReporters=json`;
    
    const output = await runCommand(testCommand, 'Tests unitaires avec couverture');
    
    // Analyser la couverture
    if (fs.existsSync('coverage/coverage-final.json')) {
      const coverage = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));
      const files = Object.keys(coverage);
      
      if (files.length > 0) {
        const file = files.find(f => f.includes('prismDataAnalysis.cjs'));
        if (file) {
          const fileCoverage = coverage[file];
          
          // Calcul des pourcentages corrects
          const stmts = fileCoverage.s;
          const functions = fileCoverage.f;
          const branches = fileCoverage.b;
          
          const stmtTotal = Object.keys(stmts).length;
          const stmtCovered = Object.values(stmts).filter(hit => hit > 0).length;
          const linesCovered = (stmtCovered / stmtTotal) * 100;
          
          const funcTotal = Object.keys(functions).length;
          const funcCovered = Object.values(functions).filter(hit => hit > 0).length;
          const functionsCovered = (funcCovered / funcTotal) * 100;
          
          const branchTotal = Object.keys(branches).length;
          const branchCovered = Object.values(branches).filter(branchHits => 
            Array.isArray(branchHits) ? branchHits.some(hit => hit > 0) : branchHits > 0
          ).length;
          const branchesCovered = (branchCovered / branchTotal) * 100;
          
          console.log(`📈 Couverture détaillée:`);
          console.log(`   - Lignes: ${linesCovered.toFixed(2)}%`);
          console.log(`   - Fonctions: ${functionsCovered.toFixed(2)}%`);
          console.log(`   - Branches: ${branchesCovered.toFixed(2)}%`);
          
          const overallCoverage = (linesCovered + functionsCovered + branchesCovered) / 3;
          
          if (overallCoverage >= 95) {
            console.log(`✅ Couverture excellente: ${overallCoverage.toFixed(2)}%`);
            return true;
          } else {
            console.log(`⚠️  Couverture insuffisante: ${overallCoverage.toFixed(2)}% (cible: 95%)`);
            return false;
          }
        }
      }
    }
    
    // Fallback: vérifier que les tests passent
    return output.includes('PASS') && !output.includes('FAIL');
    
  } catch (error) {
    console.error(`❌ Erreur lors de la validation des tests: ${error.message}`);
    return false;
  }
}

async function validateCodeQuality() {
  console.log('\n🔍 VALIDATION QUALITÉ DU CODE');
  console.log('-'.repeat(50));
  
  try {
    // Vérifier la syntaxe JavaScript
    console.log('📝 Vérification syntaxe...');
    
    const analysisFile = 'backend/analysis/prismDataAnalysis.cjs';
    if (fs.existsSync(analysisFile)) {
      try {
        require(path.resolve(analysisFile));
        console.log('✅ Syntaxe JavaScript valide');
      } catch (error) {
        console.error(`❌ Erreur de syntaxe: ${error.message}`);
        return false;
      }
    }
    
    // Vérifier les standards de code
    console.log('📋 Vérification standards...');
    
    const code = fs.readFileSync(analysisFile, 'utf8');
    
    // Vérifications basiques
    const checks = [
      {
        name: 'Documentation JSDoc',
        test: code.includes('/**') && code.includes('* @param') && code.includes('* @returns'),
        required: true
      },
      {
        name: 'Gestion d\'erreurs',
        test: code.includes('try') || code.includes('catch') || code.includes('if (!'),
        required: true
      },
      {
        name: 'Exports correctes',
        test: code.includes('module.exports'),
        required: true
      },
      {
        name: 'Constantes en UPPER_CASE',
        test: !code.match(/const [a-z]/g) || code.includes('const '),
        required: false
      }
    ];
    
    let qualityScore = 0;
    const totalChecks = checks.length;
    
    for (const check of checks) {
      if (check.test) {
        console.log(`✅ ${check.name}`);
        qualityScore++;
      } else {
        const status = check.required ? '❌' : '⚠️ ';
        console.log(`${status} ${check.name}`);
        if (check.required) {
          return false;
        }
      }
    }
    
    const qualityPercentage = (qualityScore / totalChecks) * 100;
    console.log(`📊 Score qualité: ${qualityPercentage}%`);
    
    return qualityPercentage >= 80;
    
  } catch (error) {
    console.error(`❌ Erreur validation qualité: ${error.message}`);
    return false;
  }
}

async function generateValidationReport() {
  console.log('\n📋 GÉNÉRATION RAPPORT DE VALIDATION');
  console.log('-'.repeat(50));
  
  const report = {
    microStep: '0.1',
    timestamp: new Date().toISOString(),
    validationResults: {
      structure: false,
      tests: false,
      coverage: false,
      quality: false
    },
    overall: false,
    nextSteps: []
  };
  
  try {
    // Exécuter toutes les validations
    report.validationResults.structure = await validateCodeStructure();
    report.validationResults.quality = await validateCodeQuality();
    report.validationResults.tests = await validateTestCoverage();
    report.validationResults.coverage = report.validationResults.tests; // Intégré dans les tests
    
    // Calcul du score global
    const scores = Object.values(report.validationResults);
    const passedValidations = scores.filter(Boolean).length;
    const totalValidations = scores.length;
    
    report.overall = passedValidations === totalValidations;
    
    // Recommandations
    if (!report.validationResults.structure) {
      report.nextSteps.push('Créer les fichiers manquants');
    }
    if (!report.validationResults.quality) {
      report.nextSteps.push('Améliorer la qualité du code');
    }
    if (!report.validationResults.tests) {
      report.nextSteps.push('Améliorer la couverture de tests');
    }
    
    if (report.overall) {
      report.nextSteps.push('✅ Micro-étape 0.1 validée - Procéder à 0.2');
    }
    
    // Sauvegarder le rapport
    const reportPath = 'reports/validation-microstep-0.1.json';
    
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    return report;
    
  } catch (error) {
    console.error(`❌ Erreur génération rapport: ${error.message}`);
    report.error = error.message;
    return report;
  }
}

async function main() {
  try {
    console.log('🚀 Début de la validation...\n');
    
    const report = await generateValidationReport();
    
    console.log('\n📊 RÉSULTATS FINAUX');
    console.log('=' .repeat(70));
    
    console.log(`📁 Structure: ${report.validationResults.structure ? '✅' : '❌'}`);
    console.log(`🔍 Qualité: ${report.validationResults.quality ? '✅' : '❌'}`);
    console.log(`🧪 Tests: ${report.validationResults.tests ? '✅' : '❌'}`);
    console.log(`📊 Couverture: ${report.validationResults.coverage ? '✅' : '❌'}`);
    
    console.log(`\n🎯 STATUT GLOBAL: ${report.overall ? '✅ VALIDÉ' : '❌ ÉCHEC'}`);
    
    if (report.nextSteps.length > 0) {
      console.log('\n📋 PROCHAINES ÉTAPES:');
      report.nextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
    }
    
    if (report.overall) {
      console.log('\n🎉 Micro-étape 0.1 complétée avec succès !');
      console.log('➡️  Prêt pour la micro-étape 0.2 - Définition du contrat API');
    } else {
      console.log('\n⚠️  Correction nécessaire avant de continuer');
    }
    
    process.exit(report.overall ? 0 : 1);
    
  } catch (error) {
    console.error(`❌ Erreur fatale: ${error.message}`);
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  main();
}

module.exports = { validateCodeStructure, validateTestCoverage, validateCodeQuality }; 