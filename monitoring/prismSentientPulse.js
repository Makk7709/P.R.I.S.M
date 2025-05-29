/**
 * @fileoverview Module de monitoring en temps réel de l'état de conscience comportementale de PRISM
 * @module monitoring/prismSentientPulse
 */

import kernelBus from '../core/KernelBus.js';

/**
 * Classe gérant le monitoring en temps réel de l'état de conscience comportementale de PRISM
 */
export class PrismSentientPulse {
  constructor() {
    this.cognitiveVitality = 100;
    this.behavioralEnergy = 100;
    this.adaptiveInertia = 0;
    this.insightsHistory = [];
    this.snapshotsHistory = [];
    this.recoveryPlansHistory = [];
    this.lastUpdate = Date.now();
    this.updateInterval = 30000; // 30 secondes
    this.historyWindow = 600000; // 10 minutes
    this.isMonitoring = false;
    this.alertThresholds = {
      cognitiveVitality: 40,
      adaptiveInertia: 60
    };
  }

  /**
   * Initialise le monitoring et démarre l'écoute des événements
   */
  async initialize() {
    this.setupEventListeners();
    this.startMonitoring();
    this.createUI();
    console.log('🔄 PrismSentientPulse initialized');
  }

  /**
   * Configure les écouteurs d'événements sur le bus PRISM
   */
  setupEventListeners() {
    prismBus.subscribe('prism:reflection:insightGenerated', this.handleInsight.bind(this));
    prismBus.subscribe('prism:memento:snapshotGenerated', this.handleSnapshot.bind(this));
    prismBus.subscribe('prism:sentinel:recoveryPlanSelected', this.handleRecoveryPlan.bind(this));
  }

  /**
   * Démarre le monitoring périodique
   */
  startMonitoring() {
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, this.updateInterval);
  }

  /**
   * Arrête le monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    clearInterval(this.monitoringInterval);
  }

  /**
   * Gère les nouveaux insights générés
   * @param {Object} event - Événement d'insight
   */
  handleInsight(event) {
    this.insightsHistory.push({
      timestamp: Date.now(),
      insight: event.analysis
    });
    this.cleanupHistory();
  }

  /**
   * Gère les nouveaux snapshots du Memento
   * @param {Object} event - Événement de snapshot
   */
  handleSnapshot(event) {
    this.snapshotsHistory.push({
      timestamp: Date.now(),
      snapshot: event.snapshot
    });
    this.cleanupHistory();
  }

  /**
   * Gère les plans de récupération sélectionnés
   * @param {Object} event - Événement de plan de récupération
   */
  handleRecoveryPlan(event) {
    this.recoveryPlansHistory.push({
      timestamp: Date.now(),
      plan: event.plan
    });
    this.cleanupHistory();
  }

  /**
   * Nettoie l'historique en supprimant les entrées trop anciennes
   */
  cleanupHistory() {
    const cutoffTime = Date.now() - this.historyWindow;
    this.insightsHistory = this.insightsHistory.filter(entry => entry.timestamp > cutoffTime);
    this.snapshotsHistory = this.snapshotsHistory.filter(entry => entry.timestamp > cutoffTime);
    this.recoveryPlansHistory = this.recoveryPlansHistory.filter(entry => entry.timestamp > cutoffTime);
  }

  /**
   * Met à jour les métriques de monitoring
   */
  updateMetrics() {
    this.calculateCognitiveVitality();
    this.calculateBehavioralEnergy();
    this.calculateAdaptiveInertia();
    this.updateUI();
    this.checkAlerts();
  }

  /**
   * Calcule la vitalité cognitive basée sur les insights récents
   */
  calculateCognitiveVitality() {
    const recentInsights = this.insightsHistory.filter(
      entry => entry.timestamp > Date.now() - this.historyWindow
    );

    if (recentInsights.length === 0) {
      this.cognitiveVitality = 0;
      return;
    }

    const insightQuality = recentInsights.reduce((sum, entry) => {
      return sum + (entry.insight.confidence || 0.5);
    }, 0) / recentInsights.length;

    const insightFrequency = Math.min(recentInsights.length / 10, 1);
    this.cognitiveVitality = Math.round((insightQuality * 0.7 + insightFrequency * 0.3) * 100);
  }

  /**
   * Calcule l'énergie comportementale basée sur les snapshots récents
   */
  calculateBehavioralEnergy() {
    const recentSnapshots = this.snapshotsHistory.filter(
      entry => entry.timestamp > Date.now() - this.historyWindow
    );

    if (recentSnapshots.length === 0) {
      this.behavioralEnergy = 0;
      return;
    }

    const energyScore = recentSnapshots.reduce((sum, entry) => {
      const snapshot = entry.snapshot;
      const improvements = snapshot.summary.counts.improvements || 0;
      const drifts = snapshot.summary.counts.drifts || 0;
      const stagnations = snapshot.summary.counts.stagnations || 0;
      
      return sum + (improvements - drifts - stagnations * 0.5);
    }, 0) / recentSnapshots.length;

    this.behavioralEnergy = Math.max(0, Math.min(100, Math.round((energyScore + 1) * 50)));
  }

  /**
   * Calcule l'inertie adaptative basée sur les métriques de stagnation et de dérive
   */
  calculateAdaptiveInertia() {
    const recentSnapshots = this.snapshotsHistory.filter(
      entry => entry.timestamp > Date.now() - this.historyWindow
    );

    if (recentSnapshots.length === 0) {
      this.adaptiveInertia = 0;
      return;
    }

    const inertiaScore = recentSnapshots.reduce((sum, entry) => {
      const snapshot = entry.snapshot;
      const stagnations = snapshot.summary.counts.stagnations || 0;
      const drifts = snapshot.summary.counts.drifts || 0;
      const total = stagnations + drifts;
      
      return sum + (total > 0 ? (stagnations / total) : 0);
    }, 0) / recentSnapshots.length;

    this.adaptiveInertia = Math.round(inertiaScore * 100);
  }

  /**
   * Crée l'interface utilisateur pour le monitoring
   */
  createUI() {
    const container = document.createElement('div');
    container.id = 'sentient-pulse-container';
    container.className = 'sentient-pulse-container';
    
    container.innerHTML = `
      <div class="pulse-header">
        <h3>Sentient Pulse</h3>
        <span class="pulse-status">Active</span>
      </div>
      <div class="pulse-metrics">
        <div class="metric cognitive-vitality">
          <div class="metric-label">Vitalité Cognitive</div>
          <div class="metric-value">${this.cognitiveVitality}%</div>
          <div class="metric-bar">
            <div class="metric-fill" style="width: ${this.cognitiveVitality}%"></div>
          </div>
        </div>
        <div class="metric behavioral-energy">
          <div class="metric-label">Énergie Comportementale</div>
          <div class="metric-value">${this.behavioralEnergy}%</div>
          <div class="metric-bar">
            <div class="metric-fill" style="width: ${this.behavioralEnergy}%"></div>
          </div>
        </div>
        <div class="metric adaptive-inertia">
          <div class="metric-label">Inertie Adaptative</div>
          <div class="metric-value">${this.adaptiveInertia}%</div>
          <div class="metric-bar">
            <div class="metric-fill" style="width: ${this.adaptiveInertia}%"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.addStyles();
  }

  /**
   * Ajoute les styles CSS nécessaires
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .sentient-pulse-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 8px;
        padding: 15px;
        color: white;
        font-family: 'Orbitron', sans-serif;
        z-index: 1000;
        width: 300px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .pulse-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      .pulse-header h3 {
        margin: 0;
        font-size: 1.2em;
        color: var(--accent);
      }

      .pulse-status {
        font-size: 0.8em;
        color: #4CAF50;
      }

      .pulse-metrics {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .metric {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .metric-label {
        font-size: 0.9em;
        color: rgba(255, 255, 255, 0.7);
      }

      .metric-value {
        font-size: 1.1em;
        font-weight: bold;
      }

      .metric-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
      }

      .metric-fill {
        height: 100%;
        background: var(--accent);
        transition: width 0.3s ease;
      }

      .cognitive-vitality .metric-fill {
        background: #4CAF50;
      }

      .behavioral-energy .metric-fill {
        background: #2196F3;
      }

      .adaptive-inertia .metric-fill {
        background: #FFC107;
      }

      .alert {
        animation: pulse 1s infinite;
      }

      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Met à jour l'interface utilisateur avec les nouvelles métriques
   */
  updateUI() {
    const container = document.getElementById('sentient-pulse-container');
    if (!container) return;

    container.querySelector('.cognitive-vitality .metric-value').textContent = `${this.cognitiveVitality}%`;
    container.querySelector('.cognitive-vitality .metric-fill').style.width = `${this.cognitiveVitality}%`;
    
    container.querySelector('.behavioral-energy .metric-value').textContent = `${this.behavioralEnergy}%`;
    container.querySelector('.behavioral-energy .metric-fill').style.width = `${this.behavioralEnergy}%`;
    
    container.querySelector('.adaptive-inertia .metric-value').textContent = `${this.adaptiveInertia}%`;
    container.querySelector('.adaptive-inertia .metric-fill').style.width = `${this.adaptiveInertia}%`;
  }

  /**
   * Vérifie les conditions d'alerte et déclenche les alertes appropriées
   */
  checkAlerts() {
    const container = document.getElementById('sentient-pulse-container');
    if (!container) return;

    const cognitiveVitalityElement = container.querySelector('.cognitive-vitality');
    const adaptiveInertiaElement = container.querySelector('.adaptive-inertia');

    if (this.cognitiveVitality < this.alertThresholds.cognitiveVitality) {
      cognitiveVitalityElement.classList.add('alert');
      this.triggerAlert('cognitive');
    } else {
      cognitiveVitalityElement.classList.remove('alert');
    }

    if (this.adaptiveInertia > this.alertThresholds.adaptiveInertia) {
      adaptiveInertiaElement.classList.add('alert');
      this.triggerAlert('inertia');
    } else {
      adaptiveInertiaElement.classList.remove('alert');
    }
  }

  /**
   * Déclenche une alerte appropriée
   * @param {string} type - Type d'alerte ('cognitive' ou 'inertia')
   */
  triggerAlert(type) {
    const message = type === 'cognitive' 
      ? 'Vitalité cognitive faible - Intervention recommandée'
      : 'Inertie adaptative élevée - Ajustement nécessaire';

    prismBus.publish('prism:sentientPulse:alert', {
      type,
      message,
      timestamp: Date.now()
    });
  }
} 