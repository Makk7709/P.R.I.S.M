/**
 * @fileoverview PRISM System Monitor - Visualiseur externe de la System Matrix
 * @module prismSystemMonitor
 */

import { PrismBus } from '../prismBus.js';
import planner from '@core/Planner.js';

/**
 * États des modules avec leurs emojis associés
 * @const {Object}
 */
const MODULE_STATES = {
  OK: { emoji: '✅', priority: 0 },
  DEGRADED: { emoji: '⚠️', priority: 1 },
  SILENT: { emoji: '🔕', priority: 2 },
  CRITICAL: { emoji: '🚨', priority: 3 }
};

/**
 * Classe de visualisation de la System Matrix
 * @class PrismSystemMonitor
 */
export class PrismSystemMonitor {
  constructor() {
    this.bus = new PrismBus();
    this.sentinel = new PrismSentinel();
    this.lastUpdate = null;
    this.updateInterval = 1000; // Rafraîchissement toutes les secondes
    this.updateTimer = null;
  }

  /**
   * Initialise le moniteur système
   * @async
   * @returns {Promise<void>}
   */
  async initializeSystemMonitor() {
    console.log('📊 Initializing PRISM System Monitor...');

    // S'abonner aux événements pertinents
    this.bus.subscribe('prism:sentinel:moduleSilent', this.handleModuleSilent.bind(this));
    this.bus.subscribe('prism:sentinel:recoveryPlanSelected', this.handleRecoveryPlan.bind(this));
    this.bus.subscribe('prism:sentinel:anomaly', this.handleAnomaly.bind(this));
    this.bus.subscribe('prism:sentinel:emergency', this.handleEmergency.bind(this));

    // Démarrer le rafraîchissement périodique
    this.startPeriodicUpdate();

    console.log('📊 PRISM System Monitor initialized successfully');
  }

  /**
   * Démarre la mise à jour périodique de l'affichage
   * @private
   */
  startPeriodicUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    this.updateTimer = setInterval(() => this.updateDisplay(), this.updateInterval);
  }

  /**
   * Arrête la mise à jour périodique
   * @private
   */
  stopPeriodicUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Met à jour l'affichage de la System Matrix
   * @private
   */
  async updateDisplay() {
    const matrix = await this.sentinel.getSystemMatrixSnapshot();
    this.renderSystemMatrix(matrix);
  }

  /**
   * Affiche la System Matrix de manière formatée
   * @param {Map<string, string>} matrix - Matrice système à afficher
   */
  renderSystemMatrix(matrix) {
    // Convertir la Map en tableau et trier par priorité
    const sortedModules = Array.from(matrix.entries())
      .map(([name, state]) => ({
        name,
        state,
        priority: MODULE_STATES[state]?.priority || 0
      }))
      .sort((a, b) => b.priority - a.priority);

    // Effacer la console
    console.clear();

    // Afficher l'en-tête
    console.log('\n📊 PRISM System Matrix Status\n');
    console.log('='.repeat(50));

    // Afficher chaque module
    sortedModules.forEach(({ name, state }) => {
      const emoji = MODULE_STATES[state]?.emoji || '❓';
      console.log(`${emoji} ${name.padEnd(30)} ${state}`);
    });

    console.log('='.repeat(50));
    console.log(`\nLast update: ${new Date().toLocaleTimeString()}\n`);
  }

  /**
   * Gère l'événement de module silencieux
   * @private
   * @param {Object} event - Événement de module silencieux
   */
  handleModuleSilent(event) {
    this.updateDisplay();
  }

  /**
   * Gère l'événement de plan de récupération sélectionné
   * @private
   * @param {Object} event - Événement de plan de récupération
   */
  handleRecoveryPlan(event) {
    this.updateDisplay();
  }

  /**
   * Gère l'événement d'anomalie
   * @private
   * @param {Object} event - Événement d'anomalie
   */
  handleAnomaly(event) {
    this.updateDisplay();
  }

  /**
   * Gère l'événement d'urgence
   * @private
   * @param {Object} event - Événement d'urgence
   */
  handleEmergency(event) {
    this.updateDisplay();
  }

  /**
   * Nettoie les ressources du moniteur
   * @async
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.stopPeriodicUpdate();
    // Désabonner des événements si nécessaire
  }
} 