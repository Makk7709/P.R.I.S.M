/**
 * @fileoverview Couche stratégique de PRISM - Gestion des risques et directives
 * @module prismStrategicLayer
 */

import PrismStateStore from './persistence/prismStateStore.js';
import prismPredictiveOptimization from './monitoring/prismPredictiveOptimization.js';
import prismCircuitBreaker from './monitoring/prismCircuitBreaker.js';
import prismLoadBalancer from './monitoring/prismLoadBalancer.js';
import prismLogger from './monitoring/prismLogger.js';

// Mapping des risques vers les directives
const RISK_DIRECTIVE_MAP = {
  lowVitality: {
    directive: 'stimulate_awareness',
    emoji: '🌞'
  },
  highInertia: {
    directive: 'boost_dynamism',
    emoji: '🔄'
  },
  behavioralDrift: {
    directive: 'induce_recalibration',
    emoji: '⚙️'
  },
  performanceDecline: {
    directive: 'optimize_performance',
    emoji: '⚡'
  },
  stabilityIssues: {
    directive: 'enhance_stability',
    emoji: '🛡️'
  },
  loadSpikes: {
    directive: 'balance_load',
    emoji: '⚖️'
  }
};

// Cache des dernières émissions de directives
const directiveCooldowns = new Map();
const stateStore = new PrismStateStore();

// Initialisation des modules de monitoring
prismCircuitBreaker.createCircuit('strategic', {
  failureThreshold: 5,
  resetTimeout: 30000
});

prismLoadBalancer.createQueue('strategic', {
  maxQueueSize: 1000,
  batchSize: 100
});

/**
 * Restaure l'état du Strategic Layer
 * @param {object} data - Données d'état à restaurer
 * @returns {Promise<void>}
 */
export async function hydrate(data) {
  if (!data || !data.directiveCooldowns) return;
  
  // Restaurer les cooldowns
  for (const [directive, timestamp] of Object.entries(data.directiveCooldowns)) {
    directiveCooldowns.set(directive, timestamp);
  }
  
  prismLogger.info('Strategic Layer state restored');
}

/**
 * Sauvegarde l'état actuel du Strategic Layer
 * @returns {Promise<void>}
 */
async function saveState() {
  const state = {
    directiveCooldowns: Object.fromEntries(directiveCooldowns)
  };
  
  await stateStore.saveState('StrategicLayer', state);
}

/**
 * Génère des directives stratégiques basées sur l'analyse des risques
 * @param {Array<{type: string, gravity: number}>} risks - Liste des risques analysés
 * @returns {Promise<void>}
 */
export async function generateDirectives(risks) {
  const startTime = performance.now();
  
  try {
    // Exécuter via le circuit breaker
    await prismCircuitBreaker.execute('strategic', async () => {
      // Trier les risques par gravité (déjà fait par analyzeRisks)
      for (const risk of risks) {
        const { type, gravity } = risk;
        const directiveInfo = RISK_DIRECTIVE_MAP[type];
        
        if (!directiveInfo) {
          prismLogger.warn(`Type de risque non mappé: ${type}`);
          continue;
        }

        const { directive, emoji } = directiveInfo;
        const lastEmission = directiveCooldowns.get(directive) || 0;
        const now = Date.now();

        // Vérifier le cooldown (5 minutes = 300000 ms)
        if (now - lastEmission < 300000) {
          prismLogger.debug(`Directive ignorée (cooldown): ${emoji} ${directive}`);
          continue;
        }

        // Calculer la confiance
        const confidence = Math.min(1, gravity + 0.2);

        // Ajouter l'événement à la file d'attente
        await prismLoadBalancer.enqueue('strategic', {
          type: 'directive',
          directive,
          confidence,
          context: {
            riskType: type,
            gravity,
            timestamp: now
          }
        });

        // Émettre l'événement
        prismBus.emit('prism:strategy:directiveIssued', {
          directive,
          confidence,
          context: {
            riskType: type,
            gravity,
            timestamp: now
          }
        });

        // Mettre à jour le cooldown
        directiveCooldowns.set(directive, now);
        prismLogger.info(`Directive émise: ${emoji} ${directive} (confiance: ${confidence.toFixed(2)})`);
        
        // Sauvegarder l'état après chaque émission
        await saveState();
      }
    });
  } catch (error) {
    prismLogger.error('Erreur lors de la génération des directives', { error });
    throw error;
  }

  const endTime = performance.now();
  const processingTime = endTime - startTime;
  
  // Log de performance si nécessaire
  if (risks.length > 100) {
    prismLogger.info(`Performance: ${processingTime.toFixed(2)}ms pour ${risks.length} risques`);
  }
}

/**
 * Analyse les métriques de performance et génère des directives d'optimisation
 * @returns {Promise<void>}
 */
export async function analyzePerformanceMetrics() {
  try {
    const _metrics = await prismPredictiveOptimization.analyzeMetrics({
      responseTime: performance.now(),
      stabilityScore: 0.8,
      load: 0.5
    });

    const predictions = await prismPredictiveOptimization.generatePredictions();
    const _adaptations = await prismPredictiveOptimization.applyAdaptations(predictions);

    // Générer des directives basées sur les prédictions
    const risks = Object.entries(predictions).map(([type, prediction]) => ({
      type: type === 'performance' ? 'performanceDecline' :
            type === 'stability' ? 'stabilityIssues' :
            type === 'load' ? 'loadSpikes' : type,
      gravity: prediction.probability
    }));

    await generateDirectives(risks);
  } catch (error) {
    prismLogger.error('Erreur lors de l\'analyse des métriques', { error });
    throw error;
  }
}

// Export des constantes pour les tests
export const CONSTANTS = {
  RISK_DIRECTIVE_MAP,
  COOLDOWN_DURATION: 300000
}; 