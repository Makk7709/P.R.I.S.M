/**
 * PRISM Planner - Système central de planification et d'exécution stratégique
 * @module core/Planner
 */

import kernelBus from './KernelBus.js';
import { PrismSovereignCycle } from '../monitoring/prismSovereignCycle.js';
import { PrismElysiumMode } from '../regulation/prismElysiumMode.js';
import { PrismSelfHeal } from '../prismSelfHeal.js';
import prismEventGuard from '../security/prismEventGuard.js';
import PrismHMAC from '../security/prismHMAC.js';

/**
 * Niveaux d'alerte du système
 * @enum {string}
 */
const AlertLevel = {
  NORMAL: 'normal',
  DEGRADED: 'degraded',
  CRITICAL: 'critical'
};

/**
 * États possibles d'un module dans la matrice système
 * @enum {string}
 */
const ModuleState = {
  OK: 'OK',
  DEGRADED: 'DEGRADED',
  SILENT: 'SILENT',
  CRITICAL: 'CRITICAL'
};

/**
 * Plans d'action prédéfinis pour chaque niveau d'alerte
 * @const {Object}
 */
const RECOVERY_PLANS = {
  [AlertLevel.NORMAL]: {
    name: 'routine_monitoring',
    actions: ['logSystemState', 'updateMetrics'],
    priority: 'low',
    timeout: 5000
  },
  [AlertLevel.DEGRADED]: {
    name: 'proactive_healing',
    actions: ['analyzeSystemState', 'initiateSelfHeal', 'optimizeResources'],
    priority: 'medium',
    timeout: 15000
  },
  [AlertLevel.CRITICAL]: {
    name: 'emergency_protocol',
    actions: ['isolateUnstableModules', 'activateEmergencyProtocol', 'notifyStakeholders'],
    priority: 'high',
    timeout: 30000
  }
};

/**
 * Seuils minimums et maximums pour les ajustements adaptatifs
 * @const {Object}
 */
const THRESHOLD_LIMITS = {
  energy: { min: 10, max: 40 },
  stability: { min: 30, max: 70 },
  performance: { min: 20, max: 60 }
};

/**
 * Seuils pour l'auto-récupération
 * @const {Object}
 */
const AUTO_RECOVERY_THRESHOLDS = {
  CRITICAL_MODULES_PERCENTAGE: 50,
  RECOVERY_ATTEMPTS_MAX: 2,
  RECOVERY_CHECK_INTERVAL: 30000 // 30 secondes
};

/**
 * Classe principale de planification et d'exécution PRISM
 * @class Planner
 */
export class Planner {
  constructor() {
    // État du système
    this.alertLevel = AlertLevel.NORMAL;
    this.anomalyCount = 0;
    this.lastAnomalyTimestamp = null;
    this.recoveryAttempts = new Map();
    this.incidentsHistory = [];
    this.MAX_INCIDENTS_HISTORY = 10;
    
    // Seuils adaptatifs
    this.adaptiveThresholds = {
      energy: 20,
      stability: 50,
      performance: 40
    };
    
    this.negativeTrendCycles = 0;

    // Traqueur d'activité des modules
    this.moduleActivityTracker = new Map();
    this.silenceCheckInterval = null;
    this.CRITICAL_SILENCE_THRESHOLD = 120000; // 2 minutes
    this.SILENCE_CHECK_INTERVAL = 60000; // 1 minute

    // Matrice système
    this.systemMatrix = new Map();

    // Configuration de l'auto-récupération
    this.autoRecoveryInterval = null;
    this.recoveryAttemptsCount = 0;
    this.lastRecoveryTimestamp = null;

    // Modes spéciaux
    this.observationModeEnabled = false;
    this.stressTestModeEnabled = false;
    this.stressTestInterval = null;
    this.STRESS_TEST_INTERVAL = 45000; // 45 secondes

    // Exécuteurs de stratégies
    this.executors = new Map();
    this.isActive = false;
    this.executionHistory = [];
    this.maxHistoryLength = 100;
  }

  /**
   * Initialise le système de planification
   * @async
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log('🧠 Initializing PRISM Planner...');
      
      // Initialiser les exécuteurs
      this.executors.set('SovereignCycle', new PrismSovereignCycle());
      this.executors.set('ElysiumMode', new PrismElysiumMode());
      this.executors.set('SelfHeal', new PrismSelfHeal());

      // Configuration des écouteurs d'événements
      kernelBus.on('prism:awareness:anomaly', this.handleAnomaly.bind(this));
      kernelBus.on('prism:selfheal:failure', this.handleEmergency.bind(this));
      kernelBus.on('prism:emergency:triggered', this.handleEmergency.bind(this));
      kernelBus.on('prism:*', this.monitorModuleActivity.bind(this));
      kernelBus.on('prism:strategy:compositeIssued', this.handleDirective.bind(this));

      // Initialisation des sous-systèmes
      await Promise.all([
        this.executors.get('SovereignCycle').initialize(),
        this.executors.get('ElysiumMode').initialize(),
        this.executors.get('SelfHeal').initialize()
      ]);

      // Démarrage des surveillances
      this.startSilenceMonitoring();
      await this.monitorGlobalHealth();

      this.isActive = true;
      console.log('🧠 PRISM Planner initialized successfully');
    } catch (error) {
      console.error('❌ PRISM Planner initialization failed:', error);
      throw error;
    }
  }

  // Méthodes de surveillance des modules
  startSilenceMonitoring() {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
    }
    this.silenceCheckInterval = setInterval(
      () => this.checkSilentModules(),
      this.SILENCE_CHECK_INTERVAL
    );
  }

  stopSilenceMonitoring() {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }
  }

  monitorModuleActivity(event) {
    const moduleName = event.type.split(':')[1];
    if (moduleName) {
      this.moduleActivityTracker.set(moduleName, Date.now());
      this.systemMatrix.set(moduleName, ModuleState.OK);
      console.log(`🧩 Module ${moduleName} state updated to ${ModuleState.OK}`);
    }
  }

  checkSilentModules() {
    const now = Date.now();
    const silentModules = [];

    for (const [moduleName, lastActivity] of this.moduleActivityTracker) {
      const silenceDuration = now - lastActivity;
      if (silenceDuration > this.CRITICAL_SILENCE_THRESHOLD) {
        silentModules.push({
          module: moduleName,
          silenceDuration,
          lastActivity
        });
        this.systemMatrix.set(moduleName, ModuleState.SILENT);
        console.log(`🧩 Module ${moduleName} state updated to ${ModuleState.SILENT}`);
      }
    }

    if (silentModules.length > 0) {
      console.log('🔕 Silent modules detected:', silentModules);
      kernelBus.emit('prism:planner:moduleSilent', {
        silentModules,
        timestamp: now
      });
    }
  }

  // Méthodes de gestion des anomalies et urgences
  async handleAnomaly(event) {
    if (this.observationModeEnabled) {
      console.log('🎥 Observation mode: Anomaly detected but no action taken');
      return;
    }

    this.anomalyCount++;
    this.lastAnomalyTimestamp = Date.now();
    this.recordIncident({
      type: 'anomaly',
      details: event,
      timestamp: this.lastAnomalyTimestamp
    });

    const isTendencyNegative = this.analyzeRecentIncidents();
    this.adjustThresholds(isTendencyNegative);

    if (this.anomalyCount >= 3) {
      await this.escalateSituation(event);
    }
  }

  async handleEmergency(event) {
    if (this.observationModeEnabled) {
      console.log('🎥 Observation mode: Emergency detected but no action taken');
      return;
    }

    this.alertLevel = AlertLevel.CRITICAL;
    const plan = await this.selectRecoveryPlan();
    await this._executeCriticalPlan(plan);
  }

  // Méthodes d'exécution des stratégies
  async handleDirective(event) {
    if (event.sig) {
      const { sig, ...payload } = event;
      const isValid = await PrismHMAC.verify(payload, sig);
      if (!isValid) {
        console.warn('❗ Signature HMAC invalide pour compositeIssued');
        return;
      }
    }

    try {
      const { directives } = event;
      for (const directive of directives) {
        const executor = this.executors.get(directive.type);
        if (executor) {
          const result = await this.executeDirective(executor, directive.action, directive.parameters);
          this.recordExecution({
            directive,
            result,
            timestamp: Date.now()
          });
          this.publishOutcome(result);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution des directives:', error);
    }
  }

  async executeDirective(executor, directive, parameters) {
    const directiveMap = {
      'SovereignCycle': {
        'boost_dynamism': 'adjustCycle',
        'force_recalibration': 'forceRecalibration'
      },
      'ElysiumMode': {
        'change_mode': 'changeMode',
        'adjust_parameters': 'adjustParameters'
      },
      'SelfHeal': {
        'trigger_healing': 'attemptRecovery',
        'analyze_issue': 'analyzeIssue'
      }
    };

    const method = directiveMap[executor.constructor.name]?.[directive];
    if (!method) {
      throw new Error(`Unknown directive: ${directive} for ${executor.constructor.name}`);
    }

    if (typeof executor[method] !== 'function') {
      throw new Error(`Method ${method} not found on ${executor.constructor.name}`);
    }

    return await executor[method](parameters);
  }

  // Méthodes utilitaires
  recordIncident(incident) {
    this.incidentsHistory.unshift(incident);
    if (this.incidentsHistory.length > this.MAX_INCIDENTS_HISTORY) {
      this.incidentsHistory.pop();
    }
  }

  analyzeRecentIncidents() {
    if (this.incidentsHistory.length < 2) return false;
    
    const recentIncidents = this.incidentsHistory.slice(0, 3);
    const negativeTrend = recentIncidents.every((incident, index) => {
      if (index === 0) return true;
      return incident.severity > recentIncidents[index - 1].severity;
    });

    if (negativeTrend) {
      this.negativeTrendCycles++;
    } else {
      this.negativeTrendCycles = 0;
    }

    return negativeTrend;
  }

  adjustThresholds(isTendencyNegative) {
    if (isTendencyNegative) {
      this.adaptiveThresholds.energy = Math.max(
        this.adaptiveThresholds.energy - 5,
        THRESHOLD_LIMITS.energy.min
      );
      this.adaptiveThresholds.stability = Math.max(
        this.adaptiveThresholds.stability - 5,
        THRESHOLD_LIMITS.stability.min
      );
    } else {
      this.adaptiveThresholds.energy = Math.min(
        this.adaptiveThresholds.energy + 2,
        THRESHOLD_LIMITS.energy.max
      );
      this.adaptiveThresholds.stability = Math.min(
        this.adaptiveThresholds.stability + 2,
        THRESHOLD_LIMITS.stability.max
      );
    }
  }

  publishOutcome(outcome) {
    if (!prismEventGuard.guardOutcome(outcome)) {
      console.warn('⚠️ Outcome rejeté par le guard de sécurité');
      return;
    }
    kernelBus.emit('prism:strategy:directiveOutcome', outcome);
  }

  recordExecution(execution) {
    this.executionHistory.unshift(execution);
    if (this.executionHistory.length > this.maxHistoryLength) {
      this.executionHistory.pop();
    }
  }

  // Getters
  getExecutionHistory() {
    return this.executionHistory;
  }

  getSystemState() {
    return {
      alertLevel: this.alertLevel,
      anomalyCount: this.anomalyCount,
      lastAnomalyTimestamp: this.lastAnomalyTimestamp,
      adaptiveThresholds: this.adaptiveThresholds,
      negativeTrendCycles: this.negativeTrendCycles,
      observationModeEnabled: this.observationModeEnabled,
      stressTestModeEnabled: this.stressTestModeEnabled
    };
  }

  getSystemMatrixSnapshot() {
    return Array.from(this.systemMatrix.entries()).map(([module, state]) => ({
      module,
      state,
      lastActivity: this.moduleActivityTracker.get(module)
    }));
  }
}

// Create singleton instance
const planner = new Planner();

// Export singleton instance
export default planner; 