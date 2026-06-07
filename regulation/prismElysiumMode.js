/**
 * PRISM Elysium Mode System
 * Gestion avancée des modes comportementaux basée sur le niveau d'éveil
 */


class PrismElysiumMode {
  constructor() {
    this.bus = new PrismBus();
    this.currentMode = null;
    this.lastModeChange = 0;
    this.MODE_CHANGE_COOLDOWN = 10 * 60 * 1000; // 10 minutes en millisecondes
    
    // Définition des modes
    this.MODES = {
      CALM: {
        name: 'Elysium Calm',
        icon: '🌿',
        color: '#4CAF50',
        threshold: 0.3,
        description: 'Mode de repos comportemental',
        cycleMultiplier: 0.5,
        reflectionEnabled: false
      },
      FLUX: {
        name: 'Elysium Flux',
        icon: '🌊',
        color: '#2196F3',
        threshold: 0.6,
        description: 'Mode adaptatif standard',
        cycleMultiplier: 1,
        reflectionEnabled: true
      },
      SURGE: {
        name: 'Elysium Surge',
        icon: '⚡',
        color: '#FFC107',
        threshold: 0.85,
        description: 'Mode d\'intensification',
        cycleMultiplier: 1.5,
        reflectionEnabled: true
      },
      NOVA: {
        name: 'Elysium Nova',
        icon: '🌟',
        color: '#9C27B0',
        threshold: 1,
        description: 'Mode d\'expansion exploratoire',
        cycleMultiplier: 2,
        reflectionEnabled: true
      }
    };

    this.initializeEventListeners();
    this.initializeUI();
  }

  /**
   * Initialise les écouteurs d'événements
   */
  initializeEventListeners() {
    this.bus.on('prism:aurora:stateUpdated', this.handleAuroraStateUpdate.bind(this));
    this.bus.on('prism:sentientPulse:alert', this.handleSentientPulseAlert.bind(this));
  }

  /**
   * Initialise l'interface utilisateur
   */
  initializeUI() {
    const container = document.createElement('div');
    container.id = 'elysium-mode-container';
    container.className = 'elysium-mode-container';
    container.innerHTML = `
      <div class="elysium-mode-display">
        <span class="elysium-mode-icon"></span>
        <span class="elysium-mode-name"></span>
      </div>
    `;
    document.body.appendChild(container);
    this.updateUI();
  }

  /**
   * Gère les mises à jour de l'état Aurora
   * @param {Object} state - État actuel d'Aurora
   */
  async handleAuroraStateUpdate(state) {
    const awakeningLevel = state.awakeningLevel || 0;
    await this.evaluateModeChange(awakeningLevel);
  }

  /**
   * Gère les alertes du Sentient Pulse
   * @param {Object} alert - Données d'alerte
   */
  async handleSentientPulseAlert(alert) {
    if (alert.severity === 'critical') {
      await this.forceModeChange(this.MODES.CALM);
    }
  }

  /**
   * Évalue la nécessité d'un changement de mode
   * @param {number} awakeningLevel - Niveau d'éveil actuel
   */
  async evaluateModeChange(awakeningLevel) {
    const now = Date.now();
    if (now - this.lastModeChange < this.MODE_CHANGE_COOLDOWN) {
      return;
    }

    const newMode = this.determineMode(awakeningLevel);
    if (newMode !== this.currentMode) {
      await this.changeMode(newMode, awakeningLevel);
    }
  }

  /**
   * Détermine le mode approprié basé sur le niveau d'éveil
   * @param {number} awakeningLevel - Niveau d'éveil actuel
   * @returns {Object} Mode déterminé
   */
  determineMode(awakeningLevel) {
    if (awakeningLevel >= 0.85) return this.MODES.NOVA;
    if (awakeningLevel >= 0.6) return this.MODES.SURGE;
    if (awakeningLevel >= 0.3) return this.MODES.FLUX;
    return this.MODES.CALM;
  }

  /**
   * Change le mode comportemental
   * @param {Object} newMode - Nouveau mode à activer
   * @param {number} awakeningLevel - Niveau d'éveil actuel
   */
  async changeMode(newMode, awakeningLevel) {
    this.currentMode = newMode;
    this.lastModeChange = Date.now();

    try {
      // Émet l'événement de changement de mode
      await this.bus.emit('prism:elysium:modeChanged', {
        mode: newMode,
        awakeningLevel,
        timestamp: this.lastModeChange
      });

      // Ajuste les cycles souverains
      await this.bus.emit('prism:sovereignCycle:adjust', {
        multiplier: newMode.cycleMultiplier
      });

      // Ajuste la réflexion
      await this.bus.emit('prism:reflection:adjust', {
        enabled: newMode.reflectionEnabled
      });

      this.updateUI();
      this.logModeChange(newMode);
    } catch (error) {
      console.error('Erreur lors du changement de mode:', error);
    }
  }

  /**
   * Force un changement de mode (utilisé pour les situations critiques)
   * @param {Object} mode - Mode à forcer
   */
  async forceModeChange(mode) {
    await this.changeMode(mode, 0);
  }

  /**
   * Met à jour l'interface utilisateur
   */
  updateUI() {
    const container = document.getElementById('elysium-mode-container');
    if (!container) return;

    const iconElement = container.querySelector('.elysium-mode-icon');
    const nameElement = container.querySelector('.elysium-mode-name');

    if (this.currentMode) {
      iconElement.textContent = this.currentMode.icon;
      nameElement.textContent = this.currentMode.name;
      container.style.backgroundColor = this.currentMode.color;
      container.classList.add('mode-transition');
      setTimeout(() => container.classList.remove('mode-transition'), 500);
    }
  }

  /**
   * Journalise le changement de mode
   * @param {Object} mode - Mode activé
   */
  logModeChange(mode) {
    console.log(`${mode.icon} ${mode.name} activé - ${mode.description}`);
  }

  /**
   * Récupère le mode actuel
   * @returns {Object} Mode actuel
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Vérifie si un changement de mode est possible
   * @returns {boolean} True si un changement est possible
   */
  canChangeMode() {
    return Date.now() - this.lastModeChange >= this.MODE_CHANGE_COOLDOWN;
  }
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Only create style element in browser environment
if (isBrowser) {
  const style = document.createElement('style');
  style.textContent = `
    .elysium-mode-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 15px;
      border-radius: 8px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: 'Orbitron', sans-serif;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.5s ease;
      z-index: 1000;
    }

    .elysium-mode-icon {
      font-size: 1.5em;
    }

    .elysium-mode-name {
      font-size: 0.9em;
      font-weight: 500;
    }

    .mode-transition {
      animation: modePulse 0.5s ease;
    }

    @keyframes modePulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

export default PrismElysiumMode; 