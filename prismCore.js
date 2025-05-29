/**
 * @fileoverview Core PRISM orchestration module - Gère l'initialisation et la coordination de tous les modules PRISM
 * @module prismCore
 * @requires prismInit
 * @requires prismLoading
 * @requires prismUI
 * @requires prismEvents
 * @requires prismNotify
 * @requires prismErrorHandler
 * @requires prismPerf
 * @requires prismCheck
 * @requires prismUpdate
 * @requires prismRetry
 * @requires prismSession
 * @requires prismSanitize
 * @requires prismFailsafe
 * @requires prismObserver
 * @requires prismEmergencyProtocol
 * @requires prismBus
 */

// Core modules
import { initializePRISM } from './prismInit.js';
import { initializeLoading } from './prismLoading.js';
import { initializeUI } from './prismUI.js';
import KernelBus from './core/KernelBus.js';
import { initializeNotifications } from './prismNotify.js';
import { initializePerformance } from './prismPerf.js';
import { initializeSystemCheck } from './prismCheck.js';
import { initializeUpdateCheck } from './prismUpdate.js';
import { initializeRetry } from './prismRetry.js';
import { initializeSession } from './prismSession.js';
import { PrismLegacyCore } from './prismLegacyCore.js';
import { InformationManagementLayer } from './infrastructure/informationManagementLayer.js';
import SafetyRunner from './infrastructure/safetyRunner.js';
import SelfMonitor from './monitoring/selfMonitor.js';
import { MoralLayer } from './infrastructure/moralLayer.js';
import logger from './utils/logger.js';

// Security and utilities
import { sanitizeText, validateInput, escapeHTML } from './prismSanitize.js';
import { updateUIState, logFailsafeEvent, incrementRetryCount } from './prismObserver.js';
import { PrismValidator } from './prismValidator.js';

// Core PRISM modules
import PrismMeta from './prismMeta.js';
import PrismPriority from './prismPriority.js';
import PrismBond from './prismBond.js';
import PrismMood from './prismMood.js';
import PrismSoul from './prismSoul.js';
import PrismEnergy from './prismEnergy.js';
import PrismPulse from './prismPulse.js';
import PrismLegacy from './prismLegacy.js';
import PrismMuse from './prismMuse.js';
import { PrismGhost } from './prismGhost.js';
import PrismSleep from './prismSleep.js';
import PrismContinuum from './prismContinuum.js';
import PrismHarmony from './prismHarmony.js';
import PrismAudit from './prismAudit.js';
import PrismAscension from './prismAscension.js';
import PrismHeartSync from './prismHeartSync.js';
import PrismVitals from './prismVitals.js';
import PrismAwareness from './prismAwareness.js';
import PrismHyperConsciousness from './prismHyperConsciousness.js';
import PrismSovereignty from './prismSovereignty.js';
import { PrismNoesis } from './prismNoesis.js';
import { PrismForecast } from './prismForecast.js';
import { PrismInstinct } from './prismInstinct.js';
import { SelfImprovementEngine } from './evolution/selfImprovementEngine.js';

// Nouveaux modules d'auto-guérison et d'adaptabilité prédictive
import prismPredictiveOptimization from './monitoring/prismPredictiveOptimization.js';
import prismCircuitBreaker from './monitoring/prismCircuitBreaker.js';
import prismLoadBalancer from './monitoring/prismLoadBalancer.js';
import prismLogger from './monitoring/prismLogger.js';

// Emergency protocol
import { prismBus } from './prismBus.js';

// Resilience module
import { Resilience, handleEmergency, triggerEmergencyProtocol } from './infrastructure/resilience.js';

/**
 * @typedef {Object} PRISMState
 * @property {boolean} isInitialized - Indique si PRISM est initialisé
 * @property {boolean} isActive - Indique si PRISM est actif
 * @property {Map<string, Object>} modules - Map des modules chargés
 * @property {number} errorCount - Nombre d'erreurs rencontrées
 * @property {number} maxRetries - Nombre maximum de tentatives
 * @property {string[]} activationSequence - Séquence d'activation des modules
 * @property {Object} pulseCounters - Compteurs de pulsations par module
 */

/**
 * @typedef {Object} PRISMConfig
 * @property {number} maxRetries - Nombre maximum de tentatives
 * @property {string[]} activationSequence - Séquence d'activation des modules
 */

// Configuration par défaut
const DEFAULT_CONFIG = {
  maxRetries: 3,
  activationSequence: [
    'core',
    'memory',
    'emotional',
    'reflexes',
    'adaptation',
    'sleep',
    'meta',
    'priority',
    'continuum',
    'harmony',
    'audit',
    'selfheal',
    'ascension',
    'heartSync',
    'vitals',
    'awareness',
    'hyperConsciousness',
    'sovereignty',
    'noesis',
    'forecast',
    'instinct',
    'legacyCore',
    'validator',
    'predictiveOptimization',
    'circuitBreaker',
    'loadBalancer',
    'logger'
  ]
};

// PRISM Core Orchestrator
const PRISM = {
  // State
  state: {
    isInitialized: false,
    isActive: false,
    modules: new Map(),
    errorCount: 0,
    maxRetries: DEFAULT_CONFIG.maxRetries,
    activationSequence: DEFAULT_CONFIG.activationSequence,
    heartSync: null,
    vitals: null,
    awareness: null,
    hyperConsciousness: null,
    sovereignty: null,
    noesis: null,
    forecast: null,
    instinct: null,
    legacyCore: null,
    validator: null,
    selfImprovementEngine: null,
    pulseCounters: {
      audit: 0,
      ascension: 0,
      selfHeal: 0,
      vitals: 0,
      awareness: 0,
      hyperConsciousness: 0,
      sovereignty: 0,
      noesis: 0,
      forecast: 0,
      instinct: 0,
      legacyCore: 0,
      validator: 0,
      predictiveOptimization: 0,
      circuitBreaker: 0,
      loadBalancer: 0,
      logger: 0
    },
    failsafe: null,
    selfHeal: null,
    infoLayer: null,
    safetyRunner: null,
    selfMonitor: null,
    moralLayer: null
  },

  // Methods
  init() {
    if (this.state.isInitialized) return;
    
    // Initialize core modules
    this.mood = new PrismMood();
    this.soul = new PrismSoul();
    this.kernelBus = new KernelBus();
    
    // Initialize InformationManagementLayer
    this.state.infoLayer = new InformationManagementLayer();
    
    // Initialize MoralLayer
    this.state.moralLayer = new MoralLayer();
    
    // Initialize SelfImprovementEngine in TEST mode
    if (process.env.PRISM_MODE === 'TEST') {
      try {
        this.state.selfImprovementEngine = new SelfImprovementEngine();
        logger.info('SelfImprovementEngine initialized in TEST mode');
      } catch (error) {
        logger.error('Failed to initialize SelfImprovementEngine:', error);
      }
    }
    
    // Initialize new modules
    this.initializePredictiveOptimization();
    this.initializeCircuitBreaker();
    this.initializeLoadBalancer();
    this.initializeLogger();
    
    // Initialize safety and monitoring modules
    this.state.safetyRunner = SafetyRunner;
    this.state.selfMonitor = new SelfMonitor();
    
    this.state.isInitialized = true;
  },

  reset() {
    console.log('🔄 Resetting PRISM...');
    
    // Reset state
    this.state = {
      isInitialized: false,
      isActive: false,
      modules: new Map(),
      errorCount: 0,
      maxRetries: DEFAULT_CONFIG.maxRetries,
      activationSequence: DEFAULT_CONFIG.activationSequence,
      heartSync: null,
      vitals: null,
      awareness: null,
      hyperConsciousness: null,
      sovereignty: null,
      noesis: null,
      forecast: null,
      instinct: null,
      legacyCore: null,
      validator: null,
      selfImprovementEngine: null,
      pulseCounters: {
        audit: 0,
        ascension: 0,
        selfHeal: 0,
        vitals: 0,
        awareness: 0,
        hyperConsciousness: 0,
        sovereignty: 0,
        noesis: 0,
        forecast: 0,
        instinct: 0,
        legacyCore: 0,
        validator: 0,
        predictiveOptimization: 0,
        circuitBreaker: 0,
        loadBalancer: 0,
        logger: 0
      },
      failsafe: null,
      selfHeal: null,
      infoLayer: null,
      safetyRunner: null,
      selfMonitor: null,
      moralLayer: null
    };

    // Reset modules
    if (this.mood) this.mood.reset();
    if (this.soul) this.soul.reset();
    if (this.kernelBus) this.kernelBus.clear();
    if (this.state.infoLayer) this.state.infoLayer = null;

    console.log('✅ PRISM reset completed');
  },

  async processEvent(event) {
    if (!this.state.isInitialized) {
      throw new Error('PRISM not initialized');
    }

    try {
      // Process the event directly
      const startTime = Date.now();
      
      // Validate input
      if (!event || typeof event !== 'object') {
        throw new Error('Invalid event format');
      }

      // Process through core modules
      const result = {
        responseTime: Date.now() - startTime,
        modelUsed: 'default',
        temperature: 0.7,
        error: null
      };

      // Analyze run result with SelfImprovementEngine if in TEST mode
      if (process.env.PRISM_MODE === 'TEST' && this.state.selfImprovementEngine) {
        await this.state.selfImprovementEngine.analyzeRunResult({
          responseTime: result.responseTime,
          success: !result.error,
          errors: result.error ? [result.error] : [],
          modelUsed: result.modelUsed,
          temperature: result.temperature
        });
      }
      
      return result;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  },

  // Nouveaux modules d'auto-guérison et d'adaptabilité prédictive
  initializePredictiveOptimization() {
    // Créer des circuits pour les modules critiques
    prismCircuitBreaker.createCircuit('mood', {
      failureThreshold: 5,
      resetTimeout: 30000
    });
    
    prismCircuitBreaker.createCircuit('soul', {
      failureThreshold: 5,
      resetTimeout: 30000
    });
    
    // Créer des files d'attente pour les événements
    prismLoadBalancer.createQueue('events', {
      maxQueueSize: 1000,
      batchSize: 100
    });
    
    // Configurer le logger
    prismLogger.setLogLevel('INFO');
    
    // S'abonner aux événements de prédiction
    prismBus.on('prism:optimization:adaptation', (data) => {
      prismLogger.logAdjustment('system', data);
    });
    
    // S'abonner aux événements de circuit breaker
    prismBus.on('prism:circuit:opened', (data) => {
      prismLogger.logCircuitBreaker(data);
    });
    
    // S'abonner aux événements de load balancer
    prismBus.on('prism:loadBalancer:batchProcessed', (data) => {
      prismLogger.logLoadBalancer(data);
    });
  },

  initializeCircuitBreaker() {
    // S'abonner aux événements de circuit breaker
    prismBus.on('prism:circuit:opened', (data) => {
      prismLogger.logCircuitBreaker(data);
    });
    
    prismBus.on('prism:circuit:closed', (data) => {
      prismLogger.logCircuitBreaker(data);
    });
    
    prismBus.on('prism:circuit:halfOpen', (data) => {
      prismLogger.logCircuitBreaker(data);
    });
  },

  initializeLoadBalancer() {
    // S'abonner aux événements de load balancer
    prismBus.on('prism:loadBalancer:enqueued', (data) => {
      prismLogger.logLoadBalancer(data);
    });
    
    prismBus.on('prism:loadBalancer:batchProcessed', (data) => {
      prismLogger.logLoadBalancer(data);
    });
    
    prismBus.on('prism:loadBalancer:itemFailed', (data) => {
      prismLogger.logLoadBalancer(data);
    });
  },

  initializeLogger() {
    // S'abonner aux événements de logger
    prismBus.on('prism:logger:log', (data) => {
      // Afficher dans la console en mode développement
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PRISM ${data.level}] ${data.message}`, data.data);
      }
    });
  },

  handleError(error) {
    console.error('[PRISM ERROR]', error.message || error);
    this.state.errorCount++;
    
    // Log the error
    if (this.state.selfMonitor) {
      this.state.selfMonitor.recordError(error);
    }
    
    // Emit error event
    prismBus.emit('prism:error', {
      error: error.message || error,
      timestamp: new Date().toISOString(),
      errorCount: this.state.errorCount
    });
    
    // Check if we need to trigger emergency protocol
    if (this.state.errorCount >= this.state.maxRetries) {
      console.error('⚠️ Maximum error count reached, triggering emergency protocol');
      prismBus.emit('prism:emergency', {
        reason: 'Maximum error count reached',
        errorCount: this.state.errorCount
      });
    }
  },

  async runSafetyTests(nbRuns = 50) {
    if (!this.state.isInitialized) {
      throw new Error('PRISM must be initialized before running safety tests');
    }

    console.log(`Starting safety test batch with ${nbRuns} runs`);
    
    try {
      const results = await this.state.safetyRunner.startBatchRun(nbRuns);
      
      // Record each result in the self monitor
      results.forEach(result => {
        this.state.selfMonitor.recordRunResult(result);
      });

      // Analyze the batch
      const analysis = this.state.selfMonitor.analyzeBatch();
      console.log('Safety test analysis:', analysis);

      return {
        results,
        analysis
      };
    } catch (error) {
      console.error('Safety test batch failed:', error);
      throw error;
    }
  }
};

/**
 * Fonction d'activation principale de PRISM
 * @returns {Promise<void>}
 */
export async function activatePRISM() {
  try {
    console.log('🚀 Initializing PRISM v2.1...');
    
    // Initialize PRISM
    PRISM.init();
    
    // Mark as active
    PRISM.state.isActive = true;
    
    console.log('✨ PRISM v2.1 successfully activated!');
    console.log('🎯 Status: ACTIVE');
    console.log('🔧 Mode:', process.env.PRISM_MODE || 'TEST');
    console.log('📊 Modules loaded:', PRISM.state.modules.size);
    
    // Start monitoring if available
    if (PRISM.state.selfMonitor) {
      console.log('📈 Self-monitoring active');
    }
    
    return PRISM;
  } catch (error) {
    console.error('❌ PRISM activation failed:', error.message);
    throw error;
  }
}

export default PRISM; 