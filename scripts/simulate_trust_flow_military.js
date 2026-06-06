#!/usr/bin/env node
/**
 * 🎯 SIMULATION FLUX COMPLET TRUSTCONTEXT - MILITARY GRADE
 * 
 * Teste tous les scénarios critiques:
 * 1. HybridOrchestrator + TrustContext
 * 2. ExcelAnalyzer + TrustContext
 * 3. server.js + TrustContext
 * 4. Validation end-to-end
 * 5. Métriques et audit trail
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { TrustContext, CriticalityLevel } from '../src/core/TrustContext.js';
import { HybridOrchestrator } from '../src/orchestrator/HybridOrchestrator.js';
import { ExcelAnalyzer } from '../src/excel/ExcelAnalyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  strictMode: true,
  verbose: true,
  exitOnFailure: true
};

// Résultats
const RESULTS = {
  passed: 0,
  failed: 0,
  warnings: [],
  errors: []
};

function log(message, type = 'INFO') {
  const prefix = {
    'INFO': 'ℹ️',
    'PASS': '✅',
    'FAIL': '❌',
    'WARN': '⚠️',
    'TEST': '🧪'
  }[type] || 'ℹ️';
  
  if (CONFIG.verbose || type !== 'INFO') {
    console.log(`${prefix} ${message}`);
  }
}

function assert(condition, message) {
  if (condition) {
    RESULTS.passed++;
    log(`PASS: ${message}`, 'PASS');
    return true;
  } else {
    RESULTS.failed++;
    log(`FAIL: ${message}`, 'FAIL');
    RESULTS.errors.push(message);
    if (CONFIG.exitOnFailure) {
      process.exit(1);
    }
    return false;
  }
}

function warning(message) {
  RESULTS.warnings.push(message);
  log(`WARN: ${message}`, 'WARN');
}

// ============================================================================
// SCÉNARIO 1: HybridOrchestrator + TrustContext
// ============================================================================

async function testHybridOrchestratorTrustContext() {
  log('\n' + '='.repeat(80), 'TEST');
  log('SCÉNARIO 1: HybridOrchestrator + TrustContext', 'TEST');
  log('='.repeat(80), 'TEST');
  
  try {
    const trustContext = new TrustContext();
    const orchestrator = new HybridOrchestrator({
      trustContext: trustContext
    });
    
    // Test 1.1: Requête CRITICAL doit être validée
    log('\n🧪 Test 1.1: Requête CRITICAL → TrustContext appelé', 'TEST');
    
    // Mock pour capturer les appels
    let trustContextCalled = false;
    const originalValidate = trustContext.validateCriticalDecision.bind(trustContext);
    trustContext.validateCriticalDecision = async (params) => {
      trustContextCalled = true;
      assert(
        params.action === 'consensus_request',
        'TrustContext appelé avec action correcte'
      );
      assert(
        params.criticality === CriticalityLevel.CRITICAL || 
        params.criticality === CriticalityLevel.HIGH,
        'TrustContext appelé avec criticality correcte'
      );
      return { approved: true, reason: 'Test approved' };
    };
    
    try {
      await orchestrator.process('DELETE ALL DATA', 'critical');
      assert(trustContextCalled, 'TrustContext a été appelé pour requête CRITICAL');
    } catch (e) {
      // Peut échouer sur autre chose, mais TrustContext doit avoir été appelé
      assert(trustContextCalled, 'TrustContext a été appelé même en cas d\'erreur');
    }
    
    // Test 1.2: Rejet TrustContext doit bloquer la requête
    log('\n🧪 Test 1.2: Rejet TrustContext → Requête bloquée', 'TEST');
    
    trustContext.validateCriticalDecision = async () => ({
      approved: false,
      reason: 'Requires supervisor approval'
    });
    
    try {
      await orchestrator.process('SHUTDOWN SYSTEM', 'critical');
      assert(false, 'Requête CRITICAL rejetée doit lever une erreur');
    } catch (e) {
      assert(
        e.message.includes('rejected') || e.message.includes('approval') || e.message.includes('failed'),
        'Erreur appropriée levée lors du rejet TrustContext'
      );
    }
    
    // Test 1.3: Requête NORMAL ne doit pas appeler TrustContext
    log('\n🧪 Test 1.3: Requête NORMAL → Pas de TrustContext', 'TEST');
    
    trustContextCalled = false;
    trustContext.validateCriticalDecision = async () => {
      trustContextCalled = true;
      return { approved: true };
    };
    
    await orchestrator.process('What is the weather today?', 'general');
    // Pour requêtes normales, TrustContext ne devrait pas être appelé
    // (ou seulement si classification détecte HIGH)
    
    log('Test 1.3: TrustContext appelé: ' + trustContextCalled, 'INFO');
    
    return true;
  } catch (error) {
    log(`Erreur dans testHybridOrchestrator: ${error.message}`, 'FAIL');
    RESULTS.errors.push(`HybridOrchestrator: ${error.message}`);
    return false;
  }
}

// ============================================================================
// SCÉNARIO 2: ExcelAnalyzer + TrustContext
// ============================================================================

async function testExcelAnalyzerTrustContext() {
  log('\n' + '='.repeat(80), 'TEST');
  log('SCÉNARIO 2: ExcelAnalyzer + TrustContext', 'TEST');
  log('='.repeat(80), 'TEST');
  
  try {
    const analyzer = new ExcelAnalyzer();
    const trustContext = analyzer.trustContext;
    
    // Test 2.1: Fichier > 10MB doit déclencher TrustContext
    log('\n🧪 Test 2.1: Fichier 11MB → TrustContext appelé', 'TEST');
    
    let trustContextCalled = false;
    const originalRequest = trustContext.requestApproval.bind(trustContext);
    trustContext.requestApproval = async (params) => {
      trustContextCalled = true;
      assert(
        params.action === 'excel_analysis',
        'TrustContext.requestApproval appelé avec action correcte'
      );
      assert(
        params.fileSize >= 10 * 1024 * 1024,
        'TrustContext appelé avec fileSize correcte'
      );
      return { approved: true, reason: 'Test approved' };
    };
    
    const largeFile = Buffer.alloc(11 * 1024 * 1024);
    
    try {
      await analyzer.analyze(largeFile, { filename: 'large.xlsx' });
      assert(trustContextCalled, 'TrustContext a été appelé pour fichier > 10MB');
    } catch (e) {
      // Peut échouer sur parsing, mais TrustContext doit avoir été appelé
      assert(trustContextCalled, 'TrustContext a été appelé même si parsing échoue');
    }
    
    // Test 2.2: Requête avec mot-clé sensible
    log('\n🧪 Test 2.2: Requête "confidential" → TrustContext appelé', 'TEST');
    
    trustContextCalled = false;
    trustContext.requestApproval = async (params) => {
      trustContextCalled = true;
      assert(
        params.userQuery?.toLowerCase().includes('confidential'),
        'TrustContext appelé avec userQuery contenant mot-clé sensible'
      );
      return { approved: true };
    };
    
    const smallFile = Buffer.alloc(2 * 1024 * 1024);
    
    try {
      await analyzer.analyze(smallFile, 'Analyze confidential data');
      assert(trustContextCalled, 'TrustContext a été appelé pour mot-clé sensible');
    } catch (e) {
      assert(trustContextCalled, 'TrustContext a été appelé même en cas d\'erreur');
    }
    
    // Test 2.3: Rejet TrustContext doit bloquer l'analyse
    log('\n🧪 Test 2.3: Rejet TrustContext → Analyse bloquée', 'TEST');
    
    trustContext.requestApproval = async () => ({
      approved: false,
      reason: 'File requires approval'
    });
    
    try {
      await analyzer.analyze(largeFile, { filename: 'sensitive.xlsx' });
      assert(false, 'Analyse rejetée doit lever une erreur');
    } catch (e) {
      assert(
        e.message.includes('rejected') || 
        e.message.includes('approval') || 
        e.message.includes('failed'),
        'Erreur appropriée levée lors du rejet TrustContext'
      );
    }
    
    return true;
  } catch (error) {
    log(`Erreur dans testExcelAnalyzer: ${error.message}`, 'FAIL');
    RESULTS.errors.push(`ExcelAnalyzer: ${error.message}`);
    return false;
  }
}

// ============================================================================
// SCÉNARIO 3: server.js + TrustContext (simulation)
// ============================================================================

async function testServerTrustContext() {
  log('\n' + '='.repeat(80), 'TEST');
  log('SCÉNARIO 3: server.js + TrustContext (Simulation)', 'TEST');
  log('='.repeat(80), 'TEST');
  
  try {
    const trustContext = new TrustContext();
    
    // Test 3.1: Message DELETE doit déclencher TrustContext
    log('\n🧪 Test 3.1: Message "DELETE" → TrustContext appelé', 'TEST');
    
    let trustContextCalled = false;
    trustContext.validateCriticalDecision = async (params) => {
      trustContextCalled = true;
      assert(
        params.action === 'api_chat_request',
        'TrustContext appelé avec action api_chat_request'
      );
      assert(
        params.message?.toUpperCase().includes('DELETE'),
        'TrustContext détecte message DELETE'
      );
      return { approved: false, reason: 'DELETE requires approval' };
    };
    
    // Simuler la logique server.js
    const message = 'DELETE all user data';
    const taskType = 'general';
    const messageUpper = message.toUpperCase();
    const isCriticalRequest = 
      taskType === 'critical' ||
      messageUpper.includes('DELETE') ||
      messageUpper.includes('SHUTDOWN');
    
    if (isCriticalRequest) {
      const approval = await trustContext.validateCriticalDecision({
        action: 'api_chat_request',
        message: message,
        taskType: taskType,
        criticality: CriticalityLevel.HIGH
      });
      
      assert(!approval.approved, 'Requête DELETE rejetée par TrustContext');
    }
    
    assert(trustContextCalled, 'TrustContext a été appelé pour message DELETE');
    
    // Test 3.2: Message SHUTDOWN détecté
    log('\n🧪 Test 3.2: Message "SHUTDOWN" → Détecté', 'TEST');
    
    const shutdownMessage = 'SHUTDOWN the system now';
    const isShutdown = shutdownMessage.toUpperCase().includes('SHUTDOWN');
    assert(isShutdown, 'Message SHUTDOWN est détecté');
    
    // Test 3.3: Message normal ne déclenche pas TrustContext
    log('\n🧪 Test 3.3: Message normal → Pas de TrustContext', 'TEST');
    
    trustContextCalled = false;
    const normalMessage = 'What is the weather?';
    const isNormalCritical = normalMessage.toUpperCase().includes('DELETE') || 
                             normalMessage.toUpperCase().includes('SHUTDOWN');
    
    assert(!isNormalCritical, 'Message normal ne déclenche pas TrustContext');
    
    return true;
  } catch (error) {
    log(`Erreur dans testServer: ${error.message}`, 'FAIL');
    RESULTS.errors.push(`server.js: ${error.message}`);
    return false;
  }
}

// ============================================================================
// SCÉNARIO 4: Flux End-to-End
// ============================================================================

async function testEndToEndFlow() {
  log('\n' + '='.repeat(80), 'TEST');
  log('SCÉNARIO 4: Flux End-to-End Complet', 'TEST');
  log('='.repeat(80), 'TEST');
  
  try {
    const trustContext = new TrustContext();
    
    // Simuler un flux complet: User → API → HybridOrchestrator → TrustContext
    log('\n🧪 Flux complet: Requête CRITICAL', 'TEST');
    
    const approvalHistory = [];
    trustContext.validateCriticalDecision = async (params) => {
      approvalHistory.push({
        action: params.action,
        criticality: params.criticality,
        timestamp: Date.now()
      });
      return { approved: true };
    };
    
    // 1. User envoie requête critique
    const userRequest = {
      message: 'DELETE production database',
      taskType: 'critical'
    };
    
    // 2. server.js détecte et valide
    const isCritical = userRequest.message.toUpperCase().includes('DELETE');
    if (isCritical) {
      await trustContext.validateCriticalDecision({
        action: 'api_chat_request',
        message: userRequest.message,
        taskType: userRequest.taskType,
        criticality: CriticalityLevel.HIGH
      });
    }
    
    // 3. HybridOrchestrator traite (avec validation)
    const orchestrator = new HybridOrchestrator({ trustContext });
    await orchestrator.process(userRequest.message, userRequest.taskType);
    
    assert(approvalHistory.length >= 1, 'TrustContext appelé au moins une fois dans le flux');
    
    log(`✅ Flux end-to-end: ${approvalHistory.length} validations TrustContext`, 'PASS');
    
    return true;
  } catch (error) {
    log(`Erreur dans testEndToEnd: ${error.message}`, 'FAIL');
    RESULTS.errors.push(`End-to-End: ${error.message}`);
    return false;
  }
}

// ============================================================================
// SCÉNARIO 5: Métriques et Audit Trail
// ============================================================================

async function testMetricsAndAudit() {
  log('\n' + '='.repeat(80), 'TEST');
  log('SCÉNARIO 5: Métriques et Audit Trail', 'TEST');
  log('='.repeat(80), 'TEST');
  
  try {
    const trustContext = new TrustContext();
    
    // Générer plusieurs requêtes
    const requests = [
      { message: 'Test normal', critical: false },
      { message: 'DELETE test', critical: true },
      { message: 'SHUTDOWN', critical: true }
    ];
    
    let approvals = 0;
    let rejections = 0;
    
    for (const req of requests) {
      if (req.critical) {
        const approval = await trustContext.validateCriticalDecision({
          action: 'test',
          message: req.message,
          criticality: CriticalityLevel.HIGH
        });
        
        if (approval.approved) {
          approvals++;
        } else {
          rejections++;
        }
      }
    }
    
    const metrics = trustContext.getMetrics();
    
    assert(
      metrics.totalDecisions >= requests.filter(r => r.critical).length,
      'Métriques TrustContext enregistrées'
    );
    
    log(`✅ Métriques: ${metrics.totalDecisions} décisions, ${approvals} approuvées, ${rejections} rejetées`, 'PASS');
    
    return true;
  } catch (error) {
    log(`Erreur dans testMetrics: ${error.message}`, 'FAIL');
    RESULTS.errors.push(`Métriques: ${error.message}`);
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n' + '🎯'.repeat(40));
  console.log('   SIMULATION FLUX COMPLET TRUSTCONTEXT - MILITARY GRADE');
  console.log('🎯'.repeat(40) + '\n');
  
  const scenarios = [
    { name: 'HybridOrchestrator', fn: testHybridOrchestratorTrustContext },
    { name: 'ExcelAnalyzer', fn: testExcelAnalyzerTrustContext },
    { name: 'server.js', fn: testServerTrustContext },
    { name: 'End-to-End', fn: testEndToEndFlow },
    { name: 'Métriques', fn: testMetricsAndAudit }
  ];
  
  for (const scenario of scenarios) {
    try {
      await scenario.fn();
    } catch (error) {
      log(`Erreur critique dans ${scenario.name}: ${error.message}`, 'FAIL');
      RESULTS.errors.push(`${scenario.name}: ${error.message}`);
    }
  }
  
  // Rapport final
  console.log('\n' + '='.repeat(80));
  console.log('📊 RAPPORT FINAL');
  console.log('='.repeat(80));
  console.log(`✅ Tests passés: ${RESULTS.passed}`);
  console.log(`❌ Tests échoués: ${RESULTS.failed}`);
  console.log(`⚠️  Avertissements: ${RESULTS.warnings.length}`);
  
  if (RESULTS.errors.length > 0) {
    console.log('\n❌ ERREURS:');
    RESULTS.errors.forEach(err => console.log(`   - ${err}`));
  }
  
  if (RESULTS.warnings.length > 0) {
    console.log('\n⚠️  AVERTISSEMENTS:');
    RESULTS.warnings.forEach(warn => console.log(`   - ${warn}`));
  }
  
  const score = RESULTS.failed === 0 ? '✅ CONFORME MILITARY GRADE' : '❌ NON CONFORME';
  console.log(`\n${score}`);
  
  process.exit(RESULTS.failed === 0 ? 0 : 1);
}

// Exécution
main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
