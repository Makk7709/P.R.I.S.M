/**
 * @fileoverview Moteur d'éveil adaptatif pour PRISM - Gère l'analyse et l'ajustement dynamique des paramètres système
 * @author Orion - Architecte Système PRISM
 * @version 1.0.0
 */

/**
 * Seuils et constantes du système
 * @private
 */
const AWARENESS_THRESHOLDS = {
  LOW_ENERGY: 40,
  STABILITY_THRESHOLD: 90,
  ADAPTATION_COOLDOWN: 30 * 60 * 1000, // 30 minutes en millisecondes
  MAX_ADAPTATIONS_PER_CYCLE: 3,
  PULSE_INTERVAL: 10,
  SCAN_INTERVAL: 30000, // 30 secondes en millisecondes
  CRITICAL_ENERGY: 20,
  MISSING_HEARTBEAT_THRESHOLD: 3
};

/**
 * Classe principale gérant l'éveil adaptatif de PRISM
 * @class PrismAwareness
 */
export default class PrismAwareness {
  /**
   * @constructor
   * @param {Object} options - Options de configuration
   */
  constructor(_options = {}) {
    this.isActive = false;
    this.adaptationCount = 0;
    this.lastAdaptationTime = 0;
    this.stabilityMetrics = [];
    this.cycleCount = 0;
    this.heartSync = null;
    this.selfHeal = null;
    this.moodEngine = null;
    this.audioEngine = null;
    this.scanInterval = null;
    this.missingHeartbeats = 0;
    
    // Seuils adaptatifs par défaut
    this.adaptiveThresholds = {
      energy: 20,
      stability: 50,
      performance: 40
    };
  }

  /**
   * Initialise les dépendances du système
   * @param {Object} dependencies - Modules requis
   * @returns {Promise<void>}
   */
  async initialize(dependencies) {
    try {
      const { heartSync, selfHeal, moodEngine, audioEngine } = dependencies;
      this.heartSync = heartSync;
      this.selfHeal = selfHeal;
      this.moodEngine = moodEngine;
      this.audioEngine = audioEngine;
      
      // Écouter les mises à jour des seuils de Sentinel
      document.addEventListener('prism:sentinel:thresholds-updated', (event) => {
        this.adaptiveThresholds = event.detail.thresholds;
        this._logSystemEvent('Thresholds updated from Sentinel', 'info');
      });
      
      // Initialiser le scan périodique
      this._initializePeriodicScan();
    } catch (error) {
      console.error('[PRISM Awareness] Initialization failed:', error);
      throw new Error('Awareness system initialization failed');
    }
  }

  /**
   * Initialise le scan périodique des signes vitaux
   * @private
   */
  _initializePeriodicScan() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    this.scanInterval = setInterval(() => {
      if (this.isActive) {
        this.scanVitalSigns().catch(_error => {
          this._logSystemEvent('Vital signs scan failed', 'error');
        });
      }
    }, AWARENESS_THRESHOLDS.SCAN_INTERVAL);
  }

  /**
   * Analyse les signes vitaux du système pour détecter les anomalies
   * @returns {Promise<void>}
   */
  async scanVitalSigns() {
    try {
      const vitals = await this._gatherSystemVitals();
      const { energy, stability } = vitals;
      
      // Vérification de l'énergie critique avec seuil adaptatif
      if (energy <= this.adaptiveThresholds.energy) {
        this._emitAnomalyEvent('critical_energy', {
          current: energy,
          threshold: this.adaptiveThresholds.energy
        });
      }
      
      // Vérification de la stabilité avec seuil adaptatif
      if (stability < this.adaptiveThresholds.stability) {
        this._emitAnomalyEvent('stability_degradation', {
          current: stability,
          threshold: this.adaptiveThresholds.stability
        });
      }
      
      // Vérification des battements de cœur
      const hasHeartbeat = await this.heartSync.hasHeartbeat();
      if (!hasHeartbeat) {
        this.missingHeartbeats++;
        if (this.missingHeartbeats >= AWARENESS_THRESHOLDS.MISSING_HEARTBEAT_THRESHOLD) {
          this._emitAnomalyEvent('missing_heartbeat', {
            count: this.missingHeartbeats,
            threshold: AWARENESS_THRESHOLDS.MISSING_HEARTBEAT_THRESHOLD
          });
        }
      } else {
        this.missingHeartbeats = 0;
      }
    } catch (error) {
      this._logSystemEvent('Vital signs scan failed', 'error');
      throw error;
    }
  }

  /**
   * Émet un événement d'anomalie détectée
   * @private
   * @param {string} type - Type d'anomalie
   * @param {Object} data - Données de l'anomalie
   */
  _emitAnomalyEvent(type, data) {
    const event = new CustomEvent('prism:awareness:anomalyDetected', {
      detail: {
        type,
        timestamp: Date.now(),
        data
      }
    });
    
    document.dispatchEvent(event);
    this._logSystemEvent(`Anomaly detected: ${type}`, 'warning');
  }

  /**
   * Démarre le cycle d'analyse adaptative
   * @returns {Promise<void>}
   */
  async startAwarenessCycle() {
    if (this.isActive) return;

    try {
      this.isActive = true;
      this.cycleCount = 0;
      this._logSystemEvent('Awareness cycle started');
      
      // Enregistrement du hook de pulsation
      this.heartSync.registerPulseHook('awareness', async () => {
        if (this.cycleCount % AWARENESS_THRESHOLDS.PULSE_INTERVAL === 0) {
          await this._performAdaptiveAnalysis();
        }
        this.cycleCount++;
      });
    } catch (error) {
      this._logSystemEvent('Failed to start awareness cycle', 'error');
      throw error;
    }
  }

  /**
   * Arrête le cycle d'analyse adaptative
   * @returns {Promise<void>}
   */
  async stopAwarenessCycle() {
    if (!this.isActive) return;

    try {
      this.isActive = false;
      this.heartSync.unregisterPulseHook('awareness');
      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }
      this._logSystemEvent('Awareness cycle stopped');
    } catch (error) {
      this._logSystemEvent('Failed to stop awareness cycle', 'error');
      throw error;
    }
  }

  /**
   * Ajuste le comportement basé sur les données vitales
   * @param {Object} vitals - Données vitales du système
   * @returns {Promise<void>}
   */
  async adjustBehaviorBasedOnVitals(vitals) {
    if (!this._canAdapt()) return;

    try {
      const { energy, mood, stability } = vitals;
      
      // Analyse de l'énergie avec seuil adaptatif
      if (energy < this.adaptiveThresholds.energy) {
        await this._handleLowEnergy();
      }

      // Analyse de l'humeur
      if (mood < 0.5) {
        await this._handleDegradedMood();
      }

      // Analyse de la stabilité avec seuil adaptatif
      this._updateStabilityMetrics(stability);
      if (this._isSystemStable()) {
        await this._accelerateAscension();
      }

      this._incrementAdaptationCount();
    } catch (error) {
      this._logSystemEvent('Behavior adjustment failed', 'error');
      throw error;
    }
  }

  /**
   * Vérifie si le système peut effectuer une adaptation
   * @private
   * @returns {boolean}
   */
  _canAdapt() {
    const now = Date.now();
    const timeSinceLastAdaptation = now - this.lastAdaptationTime;
    
    return (
      this.adaptationCount < AWARENESS_THRESHOLDS.MAX_ADAPTATIONS_PER_CYCLE &&
      timeSinceLastAdaptation > AWARENESS_THRESHOLDS.ADAPTATION_COOLDOWN
    );
  }

  /**
   * Gère les situations de basse énergie
   * @private
   * @returns {Promise<void>}
   */
  async _handleLowEnergy() {
    await this.heartSync.decreasePulseRate();
    await this.selfHeal.increaseHealingRate();
    this._logSystemEvent('Low energy detected - Adjusting system parameters');
  }

  /**
   * Gère les situations d'humeur dégradée
   * @private
   * @returns {Promise<void>}
   */
  async _handleDegradedMood() {
    await this.audioEngine.enhanceAuditMode();
    await this.moodEngine.reduceActivityLevel();
    this._logSystemEvent('Degraded mood detected - Enhancing stability measures');
  }

  /**
   * Met à jour les métriques de stabilité
   * @private
   * @param {number} stability - Indice de stabilité actuel
   */
  _updateStabilityMetrics(stability) {
    this.stabilityMetrics.push(stability);
    if (this.stabilityMetrics.length > 10) {
      this.stabilityMetrics.shift();
    }
  }

  /**
   * Vérifie si le système est stable
   * @private
   * @returns {boolean}
   */
  _isSystemStable() {
    if (this.stabilityMetrics.length < 10) return false;
    
    const stableMetrics = this.stabilityMetrics.filter(
      metric => metric >= AWARENESS_THRESHOLDS.STABILITY_THRESHOLD
    );
    
    return (stableMetrics.length / this.stabilityMetrics.length) >= 0.9;
  }

  /**
   * Accélère la cadence d'ascension
   * @private
   * @returns {Promise<void>}
   */
  async _accelerateAscension() {
    await this.heartSync.increasePulseRate();
    this._logSystemEvent('System stability confirmed - Accelerating ascension');
  }

  /**
   * Incrémente le compteur d'adaptations
   * @private
   */
  _incrementAdaptationCount() {
    this.adaptationCount++;
    this.lastAdaptationTime = Date.now();
  }

  /**
   * Effectue l'analyse adaptative
   * @private
   * @returns {Promise<void>}
   */
  async _performAdaptiveAnalysis() {
    try {
      const vitals = await this._gatherSystemVitals();
      await this.adjustBehaviorBasedOnVitals(vitals);
    } catch (_error) {
      this._logSystemEvent('Adaptive analysis failed', 'error');
    }
  }

  /**
   * Récupère les données vitales du système
   * @private
   * @returns {Promise<Object>}
   */
  async _gatherSystemVitals() {
    return {
      energy: await this.heartSync.getEnergyLevel(),
      mood: await this.moodEngine.getCurrentMood(),
      stability: await this.selfHeal.getStabilityIndex()
    };
  }

  /**
   * Journalise les événements système
   * @private
   * @param {string} message - Message à journaliser
   * @param {string} [level='info'] - Niveau de log
   */
  _logSystemEvent(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[PRISM Awareness][${timestamp}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.info(logMessage);
    }
  }
} 