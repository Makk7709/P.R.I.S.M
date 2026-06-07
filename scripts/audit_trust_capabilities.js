#!/usr/bin/env node
/**
 * 🎯 AUDIT TRUSTCONTEXT & CAPACITÉS PRISM
 * 
 * Vérifie:
 * 1. Utilisation systématique de TrustContext
 * 2. Utilisation complète des capacités PRISM
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRISM_ROOT = path.join(__dirname, '..');

// Modules critiques qui DEVRAIENT utiliser TrustContext
const CRITICAL_MODULES = [
  'TaskTypeProcessor.js',
  'HybridOrchestrator.js',
  'ExcelAnalyzer.js',
  'ConsensusManager.js',
  'PrismCoreOrchestrator.js',
  'SelfImprovementEngine.js',
  'server.js'
];

// Capacités PRISM à vérifier
const PRISM_CAPABILITIES = {
  core: [
    'TrustContext',
    'ConsensusManager',
    'ConsciousnessLayer',
    'MemoryRetrievalEngine',
    'TaskTypeProcessor',
    'InterDomainOrchestrator',
    'ProjectComplexityManager'
  ],
  orchestration: [
    'HybridOrchestrator',
    'ResponseModeManager',
    'PersonaActivator',
    'RealTimeResearchEngine'
  ],
  evolution: [
    'SelfImprovementEngine'
  ],
  infrastructure: [
    'MoralLayer',
    'SecureJournalManager',
    'AdaptiveWeightingEngine'
  ],
  excel: [
    'ExcelAnalyzer',
    'ExcelParserService',
    'StatisticalEngine'
  ],
  salesops: [
    'AskPrismEngine',
    'QuestionRouter',
    'Text2SqlGenerator',
    'AuditLogger'
  ]
};

const RESULTS = {
  trustContextUsage: {},
  capabilitiesUsage: {},
  missingIntegrations: [],
  warnings: []
};

function findFiles(dir, pattern) {
  const results = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      results.push(...findFiles(fullPath, pattern));
    } else if (file.isFile() && pattern.test(file.name)) {
      results.push(fullPath);
    }
  }
  
  return results;
}

function analyzeTrustContextUsage() {
  console.log('\n🔍 ANALYSE TRUSTCONTEXT...\n');
  
  for (const module of CRITICAL_MODULES) {
    const modulePath = path.join(PRISM_ROOT, 'src', path.dirname(module), path.basename(module));
    const altPaths = [
      path.join(PRISM_ROOT, 'src', 'core', module),
      path.join(PRISM_ROOT, 'src', 'orchestrator', module),
      path.join(PRISM_ROOT, 'src', 'excel', module),
      path.join(PRISM_ROOT, module),
      path.join(PRISM_ROOT, 'backend', module)
    ];
    
    let found = false;
    let content = '';
    let filePath = '';
    
    for (const p of [modulePath, ...altPaths]) {
      if (fs.existsSync(p)) {
        content = fs.readFileSync(p, 'utf-8');
        filePath = p;
        found = true;
        break;
      }
    }
    
    if (!found) {
      RESULTS.trustContextUsage[module] = {
        status: 'NOT_FOUND',
        path: null,
        usesTrustContext: false,
        usesValidation: false,
        issues: ['Module non trouvé']
      };
      continue;
    }
    
    const usesTrustContext = /TrustContext|trustContext|getTrustContext/.test(content);
    const usesValidation = /validateCriticalDecision|requestApproval|requestHumanApproval/.test(content);
    const importsTrustContext = /import.*TrustContext|from.*TrustContext|require.*TrustContext/.test(content);
    
    const issues = [];
    if (!importsTrustContext && module !== 'ConsensusManager.js') {
      issues.push('Ne importe pas TrustContext');
    }
    if (!usesValidation && !usesTrustContext) {
      issues.push('N\'utilise pas les méthodes de validation TrustContext');
    }
    
    RESULTS.trustContextUsage[module] = {
      status: 'FOUND',
      path: path.relative(PRISM_ROOT, filePath),
      usesTrustContext,
      usesValidation,
      importsTrustContext,
      issues
    };
    
    console.log(`  ${usesValidation ? '✅' : '❌'} ${module}`);
    if (issues.length > 0) {
      console.log(`      ⚠️  ${issues.join(', ')}`);
    }
  }
}

function analyzeCapabilitiesUsage() {
  console.log('\n🔍 ANALYSE CAPACITÉS PRISM...\n');
  
  // Chercher tous les fichiers JS/TS dans src/
  const allFiles = [
    ...findFiles(path.join(PRISM_ROOT, 'src'), /\.(js|ts)$/),
    ...findFiles(path.join(PRISM_ROOT, 'backend'), /\.(js|ts)$/),
    ...findFiles(path.join(PRISM_ROOT, 'evolution'), /\.(js|ts)$/)
  ];
  
  const usageMap = {};
  
  for (const category in PRISM_CAPABILITIES) {
    for (const capability of PRISM_CAPABILITIES[category]) {
      usageMap[capability] = {
        category,
        usedIn: [],
        notUsedIn: [],
        totalReferences: 0
      };
      
      for (const file of allFiles) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const regex = new RegExp(capability, 'g');
          const matches = content.match(regex);
          
          if (matches && matches.length > 0) {
            usageMap[capability].usedIn.push(path.relative(PRISM_ROOT, file));
            usageMap[capability].totalReferences += matches.length;
          }
        } catch (_err) {
          // Ignorer les erreurs de lecture
        }
      }
    }
  }
  
  RESULTS.capabilitiesUsage = usageMap;
  
  // Afficher les résultats
  for (const category in PRISM_CAPABILITIES) {
    console.log(`\n📦 ${category.toUpperCase()}:`);
    for (const capability of PRISM_CAPABILITIES[category]) {
      const usage = usageMap[capability];
      const status = usage.usedIn.length > 0 ? '✅' : '⚠️';
      console.log(`  ${status} ${capability} (${usage.totalReferences} références, ${usage.usedIn.length} fichiers)`);
      
      if (usage.usedIn.length === 0) {
        RESULTS.warnings.push(`${capability} n'est utilisé dans aucun fichier`);
      }
    }
  }
}

function generateReport() {
  console.log(`\n${  '='.repeat(80)}`);
  console.log('📊 RAPPORT D\'AUDIT TRUSTCONTEXT & CAPACITÉS');
  console.log('='.repeat(80));
  
  // Résumé TrustContext
  console.log('\n🔒 TRUSTCONTEXT:');
  let trustContextOK = 0;
  let trustContextKO = 0;
  
  for (const module in RESULTS.trustContextUsage) {
    const info = RESULTS.trustContextUsage[module];
    if (info.status === 'FOUND') {
      if (info.usesValidation || info.usesTrustContext) {
        trustContextOK++;
      } else {
        trustContextKO++;
        RESULTS.missingIntegrations.push(`${module}: TrustContext non utilisé`);
      }
    }
  }
  
  console.log(`  ✅ Modules avec TrustContext: ${trustContextOK}`);
  console.log(`  ❌ Modules sans TrustContext: ${trustContextKO}`);
  
  // Modules manquants
  if (RESULTS.missingIntegrations.length > 0) {
    console.log('\n⚠️  INTÉGRATIONS MANQUANTES:');
    RESULTS.missingIntegrations.forEach(item => console.log(`  - ${item}`));
  }
  
  // Capacités non utilisées
  if (RESULTS.warnings.length > 0) {
    console.log('\n⚠️  CAPACITÉS SOUS-UTILISÉES:');
    RESULTS.warnings.forEach(item => console.log(`  - ${item}`));
  }
  
  // Recommandations
  console.log('\n💡 RECOMMANDATIONS:');
  
  if (trustContextKO > 0) {
    console.log('  1. Intégrer TrustContext dans les modules critiques manquants');
    console.log('  2. Utiliser validateCriticalDecision() pour toutes les actions critiques');
    console.log('  3. Ajouter requestApproval() pour les décisions HIGH/CRITICAL');
  }
  
  const unusedCapabilities = Object.keys(RESULTS.capabilitiesUsage)
    .filter(cap => RESULTS.capabilitiesUsage[cap].usedIn.length === 0);
  
  if (unusedCapabilities.length > 0) {
    console.log(`  4. Vérifier pourquoi ${unusedCapabilities.length} capacités ne sont pas utilisées`);
  }
  
  console.log(`\n${  '='.repeat(80)}`);
}

// Exécution
try {
  analyzeTrustContextUsage();
  analyzeCapabilitiesUsage();
  generateReport();
  
  // Code de sortie
  const hasIssues = RESULTS.missingIntegrations.length > 0 || RESULTS.warnings.length > 0;
  process.exit(hasIssues ? 1 : 0);
} catch (error) {
  console.error('❌ Erreur lors de l\'audit:', error);
  process.exit(1);
}
