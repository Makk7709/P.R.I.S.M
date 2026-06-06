/**
 * @fileoverview Module de régulation adaptative des cycles de PRISM
 * @module monitoring/prismSovereignCycle
 */


/**
 * @class PrismSovereignCycle
 * @description Gère l'auto-régulation adaptative des cycles de PRISM
 */
export class PrismSovereignCycle {
  constructor() {
    this.currentCycle = 'balanced';
    this.cycleHistory = [];
    this.vitalityThresholds = {
      high: 0.7,
      low: 0.4,
      inertia: 0.6
    };
    this.cycleEmojis = {
      reflection: '🔥',
      balanced: '📈',
      rest: '🌿',
      recalibration: '⚡'
    };
    this.initializeUI();
  }

  /**
   * Initialise le module et s'abonne aux événements pertinents
   */
  async initialize() {
    prismBus.subscribe('prism:sentientPulse:update', this.handleVitalityUpdate.bind(this));
    prismBus.subscribe('prism:sentientPulse:alert', this.handleVitalityAlert.bind(this));
    this.logCycleChange('initialization', 'Système de cycles souverains initialisé');
  }

  /**
   * Gère les mises à jour de vitalité
   * @param {Object} event - Événement de mise à jour de vitalité
   */
  handleVitalityUpdate(event) {
    const { cognitiveVitality, adaptiveInertia } = event;
    this.adjustCycle(cognitiveVitality, adaptiveInertia);
  }

  /**
   * Gère les alertes de vitalité
   * @param {Object} event - Événement d'alerte de vitalité
   */
  handleVitalityAlert(event) {
    const { severity, _type } = event;
    if (severity === 'critical') {
      this.forceRecalibration();
    }
  }

  /**
   * Ajuste le cycle en fonction des métriques de vitalité
   * @param {number} cognitiveVitality - Vitalité cognitive (0-1)
   * @param {number} adaptiveInertia - Inertie adaptative (0-1)
   */
  adjustCycle(cognitiveVitality, adaptiveInertia) {
    let newCycle;

    if (adaptiveInertia > this.vitalityThresholds.inertia) {
      newCycle = 'recalibration';
    } else if (cognitiveVitality > this.vitalityThresholds.high) {
      newCycle = 'reflection';
    } else if (cognitiveVitality < this.vitalityThresholds.low) {
      newCycle = 'rest';
    } else {
      newCycle = 'balanced';
    }

    if (newCycle !== this.currentCycle) {
      this.transitionToCycle(newCycle);
    }
  }

  /**
   * Effectue la transition vers un nouveau cycle
   * @param {string} newCycle - Nouveau cycle à activer
   */
  transitionToCycle(newCycle) {
    const previousCycle = this.currentCycle;
    this.currentCycle = newCycle;
    
    this.logCycleChange(newCycle, `Transition de ${previousCycle} vers ${newCycle}`);
    this.updateUI();
    
    prismBus.emit('prism:sovereignCycle:cycleChanged', {
      previousCycle,
      newCycle,
      timestamp: Date.now()
    });
  }

  /**
   * Force un cycle de recalibration
   */
  forceRecalibration() {
    this.transitionToCycle('recalibration');
  }

  /**
   * Initialise l'interface utilisateur
   */
  initializeUI() {
    const container = document.createElement('div');
    container.id = 'sovereign-cycle-indicator';
    container.className = 'sovereign-cycle-indicator';
    container.innerHTML = `
      <div class="cycle-icon">${this.cycleEmojis[this.currentCycle]}</div>
      <div class="cycle-label">${this.currentCycle}</div>
    `;
    document.body.appendChild(container);
  }

  /**
   * Met à jour l'interface utilisateur
   */
  updateUI() {
    const container = document.getElementById('sovereign-cycle-indicator');
    if (container) {
      container.classList.add('transitioning');
      container.querySelector('.cycle-icon').textContent = this.cycleEmojis[this.currentCycle];
      container.querySelector('.cycle-label').textContent = this.currentCycle;
      
      setTimeout(() => {
        container.classList.remove('transitioning');
      }, 300);
    }
  }

  /**
   * Enregistre un changement de cycle
   * @param {string} cycle - Cycle concerné
   * @param {string} reason - Raison du changement
   */
  logCycleChange(cycle, reason) {
    const entry = {
      cycle,
      reason,
      timestamp: Date.now()
    };
    this.cycleHistory.push(entry);
  }

  /**
   * Exporte l'historique des cycles
   * @returns {Array} Historique des cycles
   */
  exportCycleHistory() {
    return this.cycleHistory;
  }
}

// Styles CSS pour l'indicateur de cycle
const style = document.createElement('style');
style.textContent = `
  .sovereign-cycle-indicator {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 15px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Orbitron', sans-serif;
    z-index: 1000;
    transition: all 0.3s ease;
  }

  .sovereign-cycle-indicator.transitioning {
    transform: scale(1.1);
    opacity: 0.8;
  }

  .cycle-icon {
    font-size: 1.2em;
  }

  .cycle-label {
    text-transform: capitalize;
    font-size: 0.9em;
  }
`;
document.head.appendChild(style); 