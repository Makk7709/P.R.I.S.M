/**
 * PRISM Performance Optimizer
 * Module pour optimiser les performances du chat vocal avec mesures TDD
 */

export class PerformanceOptimizer {
  constructor() {
    this.metrics = {
      apiCalls: [],
      voiceGeneration: [],
      contextLoading: [],
      enhancement: []
    };
    this.thresholds = {
      totalResponse: 2000,    // Max 2s total
      apiCall: 1500,          // Max 1.5s par API
      voiceGen: 1000,         // Max 1s pour ElevenLabs
      contextLoad: 200        // Max 200ms pour contexte
    };
  }

  startTimer(operation) {
    return {
      operation,
      startTime: Date.now(),
      end: () => {
        const duration = Date.now() - this.startTime;
        this.recordMetric(operation, duration);
        return duration;
      }
    };
  }

  recordMetric(operation, duration) {
    if (!this.metrics[operation]) {
      this.metrics[operation] = [];
    }
    this.metrics[operation].push({
      duration,
      timestamp: Date.now()
    });
    
    // Garder seulement les 50 dernières mesures
    if (this.metrics[operation].length > 50) {
      this.metrics[operation] = this.metrics[operation].slice(-50);
    }
  }

  getAverageTime(operation) {
    const metrics = this.metrics[operation] || [];
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return Math.round(total / metrics.length);
  }

  getPerformanceReport() {
    return {
      averages: {
        apiCalls: this.getAverageTime('apiCalls'),
        voiceGeneration: this.getAverageTime('voiceGeneration'),
        contextLoading: this.getAverageTime('contextLoading'),
        enhancement: this.getAverageTime('enhancement')
      },
      thresholds: this.thresholds,
      alerts: this.getPerformanceAlerts()
    };
  }

  getPerformanceAlerts() {
    const alerts = [];
    
    if (this.getAverageTime('apiCalls') > this.thresholds.apiCall) {
      alerts.push({
        type: 'API_SLOW',
        message: `Appels API trop lents: ${this.getAverageTime('apiCalls')}ms (seuil: ${this.thresholds.apiCall}ms)`,
        severity: 'high'
      });
    }
    
    if (this.getAverageTime('voiceGeneration') > this.thresholds.voiceGen) {
      alerts.push({
        type: 'VOICE_SLOW',
        message: `Génération vocale lente: ${this.getAverageTime('voiceGeneration')}ms (seuil: ${this.thresholds.voiceGen}ms)`,
        severity: 'medium'
      });
    }
    
    return alerts;
  }

  // Optimisations spécifiques
  optimizeForSpeed() {
    return {
      skipContext: true,           // Skip contexte pour requêtes simples
      maxTokens: 300,             // Réduire tokens à 300
      temperature: 0.1,           // Température basse pour plus de rapidité
      parallelProcessing: true,   // Traitement parallèle audio + réponse
      cacheAggressively: true     // Cache plus agressif
    };
  }

  optimizeForQuality() {
    return {
      skipContext: false,
      maxTokens: 800,
      temperature: 0.3,
      parallelProcessing: true,
      cacheAggressively: false
    };
  }
}

// Instance globale
export const performanceOptimizer = new PerformanceOptimizer(); 