/**
 * @fileoverview Reporter personnalisé pour les tests de sécurité PRISM
 * @module tests/security/customReporter
 */

const fs = require('fs');
const path = require('path');

class SecurityReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.outputFile = options.outputFile || 'reports/security_verification.json';
  }

  onRunComplete(contexts, results) {
    const securityReport = this.generateSecurityReport(results);
    this.writeReport(securityReport);
  }

  generateSecurityReport(results) {
    const { testResults, coverageMap } = results;
    
    // Analyser les résultats de couverture
    const coverage = this.analyzeCoverage(results);
    
    // Analyser les tests passés/échoués
    const testAnalysis = this.analyzeTests(testResults);
    
    // Vérifier le fonctionnement du veto humain
    const vetoAnalysis = this.analyzeVetoFunctionality(testResults);
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        tests_passed: testAnalysis.passed,
        tests_failed: testAnalysis.failed,
        tests_total: testAnalysis.total,
        success_rate: testAnalysis.successRate,
        veto_working: vetoAnalysis.working,
        coverage_threshold_met: coverage.thresholdMet
      },
      coverage: {
        statements: coverage.statements,
        branches: coverage.branches,
        functions: coverage.functions,
        lines: coverage.lines,
        threshold: 95,
        files: coverage.files
      },
      security_verification: {
        trust_context_functional: vetoAnalysis.trustContextFunctional,
        human_approval_required: vetoAnalysis.humanApprovalRequired,
        critical_events_blocked: vetoAnalysis.criticalEventsBlocked,
        cooldown_enforced: vetoAnalysis.cooldownEnforced,
        unauthorized_access_blocked: vetoAnalysis.unauthorizedBlocked
      },
      test_details: testAnalysis.details,
      recommendations: this.generateRecommendations(coverage, vetoAnalysis),
      compliance: {
        security_threshold_95_percent: coverage.thresholdMet,
        human_veto_mandatory: vetoAnalysis.working,
        no_bypass_possible: vetoAnalysis.noBypass,
        execution_time_under_30s: results.runTime < 30000
      }
    };
  }

  analyzeCoverage(results) {
    const coverage = results.coverageMap;
    
    if (!coverage) {
      return {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
        thresholdMet: false,
        files: {}
      };
    }

    const summary = coverage.getCoverageSummary();
    const files = {};
    
    // Analyser chaque fichier
    coverage.files().forEach(filePath => {
      const fileCoverage = coverage.fileCoverageFor(filePath);
      const fileSummary = fileCoverage.toSummary();
      
      files[filePath] = {
        statements: fileSummary.statements.pct,
        branches: fileSummary.branches.pct,
        functions: fileSummary.functions.pct,
        lines: fileSummary.lines.pct
      };
    });

    const statements = summary.statements.pct;
    const branches = summary.branches.pct;
    const functions = summary.functions.pct;
    const lines = summary.lines.pct;

    return {
      statements,
      branches,
      functions,
      lines,
      thresholdMet: statements >= 95 && branches >= 95 && functions >= 95 && lines >= 95,
      files
    };
  }

  analyzeTests(testResults) {
    let passed = 0;
    let failed = 0;
    let total = 0;
    const details = [];

    testResults.forEach(testResult => {
      testResult.testResults.forEach(test => {
        total++;
        if (test.status === 'passed') {
          passed++;
        } else {
          failed++;
        }

        details.push({
          name: test.fullName,
          status: test.status,
          duration: test.duration,
          file: testResult.testFilePath
        });
      });
    });

    return {
      passed,
      failed,
      total,
      successRate: total > 0 ? (passed / total) * 100 : 0,
      details
    };
  }

  analyzeVetoFunctionality(testResults) {
    let trustContextFunctional = false;
    let humanApprovalRequired = false;
    let criticalEventsBlocked = false;
    let cooldownEnforced = false;
    let unauthorizedBlocked = false;
    let noBypass = true;

    // Analyser les noms et résultats des tests pour détecter les fonctionnalités de sécurité
    testResults.forEach(testResult => {
      testResult.testResults.forEach(test => {
        const testName = test.fullName.toLowerCase();
        const passed = test.status === 'passed';

        if (testName.includes('trust') && testName.includes('context') && passed) {
          trustContextFunctional = true;
        }

        if (testName.includes('human') && testName.includes('approval') && passed) {
          humanApprovalRequired = true;
        }

        if (testName.includes('critical') && testName.includes('block') && passed) {
          criticalEventsBlocked = true;
        }

        if (testName.includes('cooldown') && passed) {
          cooldownEnforced = true;
        }

        if (testName.includes('unauthorized') && testName.includes('block') && passed) {
          unauthorizedBlocked = true;
        }

        if (testName.includes('bypass') && passed) {
          noBypass = false; // Si un test de bypass passe, c'est un problème
        }
      });
    });

    return {
      working: trustContextFunctional && humanApprovalRequired && criticalEventsBlocked,
      trustContextFunctional,
      humanApprovalRequired,
      criticalEventsBlocked,
      cooldownEnforced,
      unauthorizedBlocked,
      noBypass
    };
  }

  generateRecommendations(coverage, vetoAnalysis) {
    const recommendations = [];

    if (!coverage.thresholdMet) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        message: 'Couverture de tests inférieure à 95%. Ajouter des tests pour les branches non couvertes.'
      });
    }

    if (!vetoAnalysis.working) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: 'Le système de veto humain ne fonctionne pas correctement. Vérifier TrustContext.'
      });
    }

    if (!vetoAnalysis.humanApprovalRequired) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: 'Les approbations humaines ne sont pas requises pour les décisions critiques.'
      });
    }

    if (!vetoAnalysis.criticalEventsBlocked) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: 'Les événements critiques ne sont pas bloqués sans approbation.'
      });
    }

    if (!vetoAnalysis.noBypass) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: 'Des mécanismes de bypass ont été détectés. Sécurité compromise.'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        priority: 'info',
        message: 'Tous les tests de sécurité sont conformes. Système sécurisé.'
      });
    }

    return recommendations;
  }

  writeReport(report) {
    try {
      // Créer le dossier reports s'il n'existe pas
      const reportsDir = path.dirname(this.outputFile);
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Écrire le rapport
      fs.writeFileSync(this.outputFile, JSON.stringify(report, null, 2));
      
      console.log(`\n🔒 Security verification report generated: ${this.outputFile}`);
      
      // Afficher un résumé dans la console
      this.printSummary(report);
      
    } catch (error) {
      console.error('Failed to write security report:', error);
    }
  }

  printSummary(report) {
    console.log('\n📊 SECURITY VERIFICATION SUMMARY');
    console.log('=====================================');
    
    const { summary, coverage, security_verification, compliance } = report;
    
    console.log(`Tests: ${summary.tests_passed}/${summary.tests_total} passed (${summary.success_rate.toFixed(1)}%)`);
    console.log(`Coverage: ${coverage.statements}% statements, ${coverage.branches}% branches`);
    console.log(`Veto System: ${summary.veto_working ? '✅ WORKING' : '❌ FAILED'}`);
    
    console.log('\n🛡️ Security Checks:');
    console.log(`  Human Approval Required: ${security_verification.human_approval_required ? '✅' : '❌'}`);
    console.log(`  Critical Events Blocked: ${security_verification.critical_events_blocked ? '✅' : '❌'}`);
    console.log(`  Cooldown Enforced: ${security_verification.cooldown_enforced ? '✅' : '❌'}`);
    console.log(`  Unauthorized Access Blocked: ${security_verification.unauthorized_access_blocked ? '✅' : '❌'}`);
    
    console.log('\n📋 Compliance:');
    console.log(`  Coverage ≥95%: ${compliance.security_threshold_95_percent ? '✅' : '❌'}`);
    console.log(`  Human Veto Mandatory: ${compliance.human_veto_mandatory ? '✅' : '❌'}`);
    console.log(`  No Bypass Possible: ${compliance.no_bypass_possible ? '✅' : '❌'}`);
    console.log(`  Execution <30s: ${compliance.execution_time_under_30s ? '✅' : '❌'}`);
    
    if (summary.veto_working && compliance.security_threshold_95_percent) {
      console.log('\n🎉 ✅ Veto humain requis : PASS');
      console.log('🔒 Système de sécurité CONFORME');
    } else {
      console.log('\n🚨 ❌ Veto humain requis : FAIL');
      console.log('⚠️ Système de sécurité NON CONFORME');
    }
  }
}

module.exports = SecurityReporter; 