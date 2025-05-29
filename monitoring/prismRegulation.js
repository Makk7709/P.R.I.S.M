import kernelBus from '../core/KernelBus.js';

/**
 * @class PrismRegulation
 * @description Gardienne de la Régulation Adaptative des systèmes intelligents.
 * Surveille et régule l'état global du système pour maintenir une stabilité comportementale optimale.
 * @version 1.0.0
 */
class PrismRegulation {
  constructor() {
    this.version = '1.0.0';
    this.emotionHistory = [];
    this.adaptationHistory = [];
    this.anomalyThresholds = {
      prolongedDrift: 10, // cycles
      emotionalBlockage: 5, // cycles
      adaptationInefficiency: 3 // cycles
    };
  }

  /**
   * Observe l'état global du système en analysant l'historique émotionnel et adaptatif
   * @param {Array} emotionStateHistory - Historique des états émotionnels
   * @param {Array} adaptationHistory - Historique des adaptations
   * @returns {Object} État d'observation du système
   */
  observeSystem(emotionStateHistory, adaptationHistory) {
    this.emotionHistory = emotionStateHistory;
    this.adaptationHistory = adaptationHistory;

    const anomalies = this.detectSystemAnomalies();
    if (anomalies.length > 0) {
      this.triggerCorrectiveAction(anomalies);
    }

    return {
      timestamp: Date.now(),
      anomalies,
      systemStability: this.calculateSystemStability()
    };
  }

  /**
   * Détecte les anomalies dans le système
   * @returns {Array} Liste des anomalies détectées
   */
  detectSystemAnomalies() {
    const anomalies = [];

    // Détection de dérive prolongée
    if (this.hasProlongedDrift()) {
      anomalies.push({
        type: 'prolonged_drift',
        severity: 'high',
        description: 'État émotionnel instable prolongé'
      });
    }

    // Détection de blocage émotionnel
    if (this.hasEmotionalBlockage()) {
      anomalies.push({
        type: 'emotional_blockage',
        severity: 'medium',
        description: 'Blocage émotionnel détecté'
      });
    }

    // Détection d'inefficacité adaptative
    if (this.hasAdaptationInefficiency()) {
      anomalies.push({
        type: 'adaptation_inefficiency',
        severity: 'medium',
        description: 'Stratégies adaptatives inefficaces'
      });
    }

    return anomalies;
  }

  /**
   * Déclenche des actions correctrices basées sur les anomalies détectées
   * @param {Array} anomalies - Liste des anomalies à corriger
   */
  triggerCorrectiveAction(anomalies) {
    anomalies.forEach(anomaly => {
      let action = null;

      switch (anomaly.type) {
        case 'prolonged_drift':
          action = 'reset_memory';
          break;
        case 'emotional_blockage':
          action = 'force_calm';
          break;
        case 'adaptation_inefficiency':
          action = 'increase_sensitivity';
          break;
      }

      if (action) {
        this.emitCorrectiveAction(anomaly, action);
      }
    });
  }

  /**
   * Émet un événement de régulation sur le KernelBus
   * @param {Object} anomaly - Anomalie détectée
   * @param {string} action - Action corrective à entreprendre
   */
  emitCorrectiveAction(anomaly, action) {
    kernelBus.emit('prism:regulation:correctiveAction', {
      anomalies: [anomaly],
      action,
      timestamp: Date.now()
    });
  }

  /**
   * Vérifie la présence d'une dérive prolongée
   * @private
   * @returns {boolean}
   */
  hasProlongedDrift() {
    if (this.emotionHistory.length < this.anomalyThresholds.prolongedDrift) {
      return false;
    }

    const recentStates = this.emotionHistory.slice(-this.anomalyThresholds.prolongedDrift);
    return recentStates.every(state => state.instability > 0.7);
  }

  /**
   * Vérifie la présence d'un blocage émotionnel
   * @private
   * @returns {boolean}
   */
  hasEmotionalBlockage() {
    if (this.emotionHistory.length < this.anomalyThresholds.emotionalBlockage) {
      return false;
    }

    const recentStates = this.emotionHistory.slice(-this.anomalyThresholds.emotionalBlockage);
    return recentStates.every(state => state.intensity > 0.8);
  }

  /**
   * Vérifie la présence d'une inefficacité adaptative
   * @private
   * @returns {boolean}
   */
  hasAdaptationInefficiency() {
    if (this.adaptationHistory.length < this.anomalyThresholds.adaptationInefficiency) {
      return false;
    }

    const recentAdaptations = this.adaptationHistory.slice(-this.anomalyThresholds.adaptationInefficiency);
    return recentAdaptations.every(adaptation => adaptation.effectiveness < 0.3);
  }

  /**
   * Calcule la stabilité globale du système
   * @private
   * @returns {number} Score de stabilité entre 0 et 1
   */
  calculateSystemStability() {
    if (this.emotionHistory.length === 0) {
      return 1;
    }

    const recentStates = this.emotionHistory.slice(-5);
    const stabilityScores = recentStates.map(state => 1 - state.instability);
    return stabilityScores.reduce((a, b) => a + b, 0) / stabilityScores.length;
  }
}

export default PrismRegulation; 