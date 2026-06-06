/**
 * Générateur de Prompt de Contrôle - Stress Test PRISM
 * Analyse les résultats et génère le prompt de validation final
 */

import fs from 'fs';
import path from 'path';

class ControlPromptGenerator {
  constructor() {
    this.reportsDir = './reports';
    this.resultsFile = path.join(this.reportsDir, 'stress_test_results.json');
    this.controlPromptFile = path.join(this.reportsDir, 'control_prompt_stress.md');
  }

  async generateControlPrompt() {
    console.log('🎯 Generating Control Prompt - Stress Test Validation...');

    try {
      // Charger les résultats du stress test
      const results = await this.loadTestResults();
      
      // Analyser les métriques
      const analysis = this.analyzeResults(results);
      
      // Générer le prompt de contrôle
      const controlPrompt = this.buildControlPrompt(analysis, results);
      
      // Sauvegarder le prompt
      await this.saveControlPrompt(controlPrompt);
      
      console.log('✅ Control prompt generated successfully');
      return controlPrompt;
      
    } catch (error) {
      console.error('❌ Failed to generate control prompt:', error);
      throw error;
    }
  }

  async loadTestResults() {
    if (!fs.existsSync(this.resultsFile)) {
      throw new Error(`Test results file not found: ${this.resultsFile}`);
    }

    const data = fs.readFileSync(this.resultsFile, 'utf8');
    return JSON.parse(data);
  }

  analyzeResults(results) {
    const analysis = {
      performance: this.analyzePerformance(results),
      consensus: this.analyzeConsensus(results),
      reliability: this.analyzeReliability(results),
      systemStability: this.analyzeSystemStability(results),
      overallStatus: 'UNKNOWN'
    };

    // Déterminer le statut global
    analysis.overallStatus = this.determineOverallStatus(analysis);

    return analysis;
  }

  analyzePerformance(results) {
    const perf = results.qualityMetrics;
    const targets = {
      averageLatency: 40, // ms
      p95Latency: 100,    // ms
      p99Latency: 200     // ms
    };

    return {
      averageLatency: {
        value: perf.averageLatencyMs,
        target: targets.averageLatency,
        status: perf.averageLatencyMs <= targets.averageLatency ? 'PASS' : 'FAIL',
        deviation: perf.averageLatencyMs - targets.averageLatency
      },
      p95Latency: {
        value: perf.p95LatencyMs,
        target: targets.p95Latency,
        status: perf.p95LatencyMs <= targets.p95Latency ? 'PASS' : 'FAIL',
        deviation: perf.p95LatencyMs - targets.p95Latency
      },
      p99Latency: {
        value: perf.p99LatencyMs,
        target: targets.p99Latency,
        status: perf.p99LatencyMs <= targets.p99Latency ? 'PASS' : 'FAIL',
        deviation: perf.p99LatencyMs - targets.p99Latency
      },
      throughput: {
        value: results.testResults.eventsPerSecond,
        target: 10000, // events/sec
        status: results.testResults.eventsPerSecond >= 10000 ? 'PASS' : 'FAIL'
      }
    };
  }

  analyzeConsensus(results) {
    const consensus = results.qualityMetrics;
    const target = 0.999; // 99.9%

    return {
      successRate: {
        value: consensus.consensusSuccessRate,
        target: target,
        status: consensus.consensusSuccessRate >= target ? 'PASS' : 'FAIL',
        deviation: consensus.consensusSuccessRate - target
      },
      totalRequests: results.testResults.consensusMetrics.totalRequests,
      approved: results.testResults.consensusMetrics.approved,
      rejected: results.testResults.consensusMetrics.rejected,
      timeouts: results.testResults.consensusMetrics.timeouts
    };
  }

  analyzeReliability(results) {
    const reliability = results.testResults;

    return {
      eventLoss: {
        value: reliability.eventLossCount,
        target: 0,
        status: reliability.eventLossCount === 0 ? 'PASS' : 'FAIL'
      },
      errorRate: {
        value: reliability.failedEvents / reliability.totalEvents,
        target: 0.001, // 0.1%
        status: (reliability.failedEvents / reliability.totalEvents) <= 0.001 ? 'PASS' : 'FAIL'
      },
      totalErrors: reliability.errors.length,
      systemErrors: reliability.errors.filter(e => e.type === 'RUNTIME_ERROR').length
    };
  }

  analyzeSystemStability(results) {
    const stability = results.qualityMetrics.systemStability;
    const memoryUsage = results.testResults.systemMetrics.memoryUsage;
    
    // Calculer l'utilisation mémoire maximale
    const maxMemory = memoryUsage.length > 0 
      ? Math.max(...memoryUsage.map(m => m.used)) / (1024 * 1024 * 1024) // GB
      : 0;

    return {
      level: stability.level,
      factors: stability.factors,
      memoryUsage: {
        max: maxMemory,
        target: 2.0, // 2GB
        status: maxMemory <= 2.0 ? 'PASS' : 'FAIL'
      },
      duration: results.testResults.duration / 1000 / 60, // minutes
      uptime: results.testResults.duration
    };
  }

  determineOverallStatus(analysis) {
    const criticalChecks = [
      analysis.performance.averageLatency.status,
      analysis.consensus.successRate.status,
      analysis.reliability.eventLoss.status
    ];

    const allCriticalPass = criticalChecks.every(status => status === 'PASS');
    
    if (allCriticalPass) {
      return 'READY_FOR_PILOT';
    } else if (criticalChecks.filter(status => status === 'PASS').length >= 2) {
      return 'NEEDS_OPTIMIZATION';
    } else {
      return 'REQUIRES_MAJOR_FIXES';
    }
  }

  buildControlPrompt(analysis, results) {
    const timestamp = new Date().toISOString();
    const duration = Math.round(results.testResults.duration / 1000 / 60);

    return `# 🎯 Prompt de Contrôle – Stress Test PRISM

**Généré le :** ${timestamp}  
**Durée du test :** ${duration} minutes  
**Configuration :** ${results.testConfiguration.totalEvents.toLocaleString()} événements mixtes

## 📊 RÉSULTATS CRITIQUES

### ⚡ Performance
- **Latence moyenne :** ${analysis.performance.averageLatency.value.toFixed(2)}ms ${this.getStatusIcon(analysis.performance.averageLatency.status)} (cible: ≤40ms)
- **Latence P95 :** ${analysis.performance.p95Latency.value.toFixed(2)}ms ${this.getStatusIcon(analysis.performance.p95Latency.status)} (cible: ≤100ms)
- **Latence P99 :** ${analysis.performance.p99Latency.value.toFixed(2)}ms ${this.getStatusIcon(analysis.performance.p99Latency.status)} (cible: ≤200ms)
- **Débit :** ${Math.round(analysis.performance.throughput.value).toLocaleString()} events/sec ${this.getStatusIcon(analysis.performance.throughput.status)}

### 🤝 Consensus
- **Taux de succès :** ${(analysis.consensus.successRate.value * 100).toFixed(3)}% ${this.getStatusIcon(analysis.consensus.successRate.status)} (cible: ≥99.9%)
- **Requêtes totales :** ${analysis.consensus.totalRequests.toLocaleString()}
- **Approuvées :** ${analysis.consensus.approved.toLocaleString()}
- **Rejetées :** ${analysis.consensus.rejected.toLocaleString()}
- **Timeouts :** ${analysis.consensus.timeouts.toLocaleString()}

### 🛡️ Fiabilité
- **Événements perdus :** ${analysis.reliability.eventLoss.value} ${this.getStatusIcon(analysis.reliability.eventLoss.status)} (cible: 0)
- **Taux d'erreur :** ${(analysis.reliability.errorRate.value * 100).toFixed(3)}% ${this.getStatusIcon(analysis.reliability.errorRate.status)} (cible: ≤0.1%)
- **Erreurs système :** ${analysis.reliability.systemErrors}

### 🏗️ Stabilité Système
- **Niveau :** ${analysis.systemStability.level}
- **Mémoire max :** ${analysis.systemStability.memoryUsage.max.toFixed(2)}GB ${this.getStatusIcon(analysis.systemStability.memoryUsage.status)} (limite: 2GB)
- **Durée d'exécution :** ${duration} minutes

## 🎯 VALIDATION DES SEUILS

${this.generateThresholdValidation(analysis)}

## 🔍 ANALYSE DE DÉRIVE D'ÉTAT

${this.generateStateAnalysis(results)}

## 📈 RECOMMANDATIONS

${this.generateRecommendations(analysis, results)}

## 🚀 STATUT DE DÉPLOIEMENT

**Statut global :** ${this.getDeploymentStatus(analysis.overallStatus)}

${this.getDeploymentRecommendation(analysis.overallStatus)}

## ✅ CHECKLIST DE VALIDATION

- [ ] Latence moyenne < 40ms
- [ ] Consensus ≥ 99.9%
- [ ] Zero événements perdus
- [ ] Aucune dérive d'état détectée
- [ ] Utilisation mémoire < 2GB
- [ ] Aucune erreur critique système

## 📋 ACTIONS SUIVANTES

${this.generateNextActions(analysis.overallStatus)}

---

**Signature de validation :** ${this.generateValidationSignature(analysis)}
`;
  }

  getStatusIcon(status) {
    return status === 'PASS' ? '✅' : '❌';
  }

  generateThresholdValidation(analysis) {
    const checks = [
      {
        name: 'Latence moyenne',
        status: analysis.performance.averageLatency.status,
        value: `${analysis.performance.averageLatency.value.toFixed(2)}ms`,
        target: '≤40ms'
      },
      {
        name: 'Consensus',
        status: analysis.consensus.successRate.status,
        value: `${(analysis.consensus.successRate.value * 100).toFixed(3)}%`,
        target: '≥99.9%'
      },
      {
        name: 'Événements perdus',
        status: analysis.reliability.eventLoss.status,
        value: analysis.reliability.eventLoss.value.toString(),
        target: '0'
      }
    ];

    return checks.map(check => 
      `- **${check.name} :** ${check.value} ${this.getStatusIcon(check.status)} (cible: ${check.target})`
    ).join('\n');
  }

  generateStateAnalysis(results) {
    const errors = results.testResults.errors;
    const systemErrors = errors.filter(e => e.type === 'RUNTIME_ERROR');
    
    if (systemErrors.length === 0) {
      return '✅ **Aucune dérive d\'état détectée** - Le système a maintenu sa stabilité pendant toute la durée du test.';
    } else {
      return `⚠️ **${systemErrors.length} erreurs système détectées** - Analyse requise pour identifier les causes de dérive.`;
    }
  }

  generateRecommendations(analysis, results) {
    const recommendations = results.recommendations || [];
    
    if (recommendations.length === 0) {
      return '✅ **Aucune recommandation critique** - Le système fonctionne dans les paramètres optimaux.';
    }

    return recommendations.map(rec => 
      `- **${rec.type}** (${rec.priority}): ${rec.message}\n  → ${rec.suggestion}`
    ).join('\n\n');
  }

  getDeploymentStatus(status) {
    const statusMap = {
      'READY_FOR_PILOT': '🟢 **PRÊT POUR DÉPLOIEMENT PILOTE**',
      'NEEDS_OPTIMIZATION': '🟡 **OPTIMISATION REQUISE**',
      'REQUIRES_MAJOR_FIXES': '🔴 **CORRECTIONS MAJEURES NÉCESSAIRES**'
    };
    return statusMap[status] || '🟠 **STATUT INDÉTERMINÉ**';
  }

  getDeploymentRecommendation(status) {
    const recommendations = {
      'READY_FOR_PILOT': 'Le système PRISM a passé tous les tests critiques et est prêt pour un déploiement pilote en environnement contrôlé.',
      'NEEDS_OPTIMIZATION': 'Le système fonctionne mais nécessite des optimisations avant le déploiement pilote. Adresser les recommandations ci-dessus.',
      'REQUIRES_MAJOR_FIXES': 'Le système présente des problèmes critiques qui doivent être résolus avant tout déploiement.'
    };
    return recommendations[status] || 'Statut de déploiement indéterminé - analyse manuelle requise.';
  }

  generateNextActions(status) {
    const actions = {
      'READY_FOR_PILOT': [
        '1. Préparer l\'environnement de déploiement pilote',
        '2. Configurer le monitoring en production',
        '3. Définir les métriques de succès du pilote',
        '4. Planifier la phase de déploiement progressif'
      ],
      'NEEDS_OPTIMIZATION': [
        '1. Implémenter les optimisations recommandées',
        '2. Re-exécuter les tests de stress',
        '3. Valider les améliorations de performance',
        '4. Planifier un nouveau cycle de validation'
      ],
      'REQUIRES_MAJOR_FIXES': [
        '1. Analyser en détail les erreurs critiques',
        '2. Implémenter les corrections nécessaires',
        '3. Renforcer les tests unitaires et d\'intégration',
        '4. Re-concevoir les composants défaillants si nécessaire'
      ]
    };

    return (actions[status] || ['Définir un plan d\'action personnalisé']).join('\n');
  }

  generateValidationSignature(analysis) {
    const timestamp = Date.now();
    const hash = this.generateHash(analysis);
    return `PRISM-STRESS-${timestamp}-${hash}`;
  }

  generateHash(data) {
    // Simple hash pour la signature
    return Math.abs(JSON.stringify(data).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)).toString(16).substring(0, 8);
  }

  async saveControlPrompt(prompt) {
    fs.writeFileSync(this.controlPromptFile, prompt, 'utf8');
    console.log(`📄 Control prompt saved to: ${this.controlPromptFile}`);
  }
}

// Fonction principale
async function main() {
  const generator = new ControlPromptGenerator();
  
  try {
    const _prompt = await generator.generateControlPrompt();
    
    console.log('\n🎯 CONTROL PROMPT GENERATED');
    console.log('═══════════════════════════');
    console.log(`📄 File: ${generator.controlPromptFile}`);
    console.log('✅ Ready for validation review');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to generate control prompt:', error.message);
    return false;
  }
}

// Exporter pour utilisation en module ou exécution directe
export { ControlPromptGenerator };

// Exécution directe si ce fichier est lancé
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
} 