/**
 * @fileoverview Module de mémoire courte adaptative pour PRISM
 * @module monitoring/prismMemento
 */

import kernelBus from '../core/KernelBus.js';

/**
 * Classe gérant la mémoire courte adaptative de PRISM
 * @class PrismMemento
 */
export class PrismMemento {
  /**
   * @constructor
   * @param {Object} options - Options de configuration
   * @param {number} [options.maxInsights=20] - Nombre maximum d'insights à conserver
   * @param {number} [options.snapshotInterval=900000] - Intervalle de génération des snapshots (15 minutes)
   * @param {number} [options.confidenceThreshold=0.7] - Seuil de confiance minimum pour les insights
   */
  constructor(options = {}) {
    this.maxInsights = options.maxInsights || 20;
    this.snapshotInterval = options.snapshotInterval || 900000; // 15 minutes
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
    
    this.insights = [];
    this.lastSnapshot = null;
    this.snapshotTimer = null;
    
    this.initialize();
  }

  /**
   * Initialise le module et ses écouteurs d'événements
   * @private
   */
  initialize() {
    kernelBus.subscribe('prism:reflection:insightGenerated', this.handleNewInsight.bind(this));
    this.startSnapshotTimer();
  }

  /**
   * Gère l'arrivée d'un nouvel insight
   * @private
   * @param {Object} event - Événement contenant l'insight
   */
  handleNewInsight(event) {
    const insight = event.analysis;
    
    // Filtre les insights selon les critères
    if (this.isValidInsight(insight)) {
      this.addInsight(insight);
    }
  }

  /**
   * Vérifie si un insight est valide selon les critères
   * @private
   * @param {Object} insight - Insight à valider
   * @returns {boolean} - True si l'insight est valide
   */
  isValidInsight(insight) {
    return (
      insight.confidence >= this.confidenceThreshold &&
      (insight.type === 'critical' || insight.type === 'improvement' || insight.type === 'drift')
    );
  }

  /**
   * Ajoute un insight à la mémoire
   * @private
   * @param {Object} insight - Insight à ajouter
   */
  addInsight(insight) {
    this.insights.unshift(insight);
    
    // Limite la taille de la mémoire
    if (this.insights.length > this.maxInsights) {
      this.insights.pop();
    }
  }

  /**
   * Démarre le timer pour la génération périodique des snapshots
   * @private
   */
  startSnapshotTimer() {
    this.snapshotTimer = setInterval(() => {
      this.generateSnapshot();
    }, this.snapshotInterval);
  }

  /**
   * Génère un snapshot narratif de la mémoire
   * @private
   */
  generateSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      summary: this.generateSummary(),
      insights: [...this.insights]
    };

    this.lastSnapshot = snapshot;
    console.log('📝 Snapshot Memento généré:', snapshot.summary);
    
    kernelBus.emit('prism:memento:snapshotGenerated', { snapshot });
  }

  /**
   * Génère un résumé narratif des insights
   * @private
   * @returns {Object} - Résumé structuré
   */
  generateSummary() {
    const counts = {
      improvements: 0,
      drifts: 0,
      stagnations: 0,
      critical: 0
    };

    this.insights.forEach(insight => {
      counts[insight.type]++;
    });

    return {
      counts,
      narrative: this.generateNarrative(counts)
    };
  }

  /**
   * Génère un récit narratif basé sur les comptages
   * @private
   * @param {Object} counts - Comptages des différents types d'insights
   * @returns {string} - Récit narratif
   */
  generateNarrative(counts) {
    const parts = [];
    
    if (counts.improvements > 0) {
      parts.push(`${counts.improvements} amélioration${counts.improvements > 1 ? 's' : ''} détectée${counts.improvements > 1 ? 's' : ''}`);
    }
    
    if (counts.drifts > 0) {
      parts.push(`${counts.drifts} dérive${counts.drifts > 1 ? 's' : ''} observée${counts.drifts > 1 ? 's' : ''}`);
    }
    
    if (counts.stagnations > 0) {
      parts.push(`${counts.stagnations} stagnation${counts.stagnations > 1 ? 's' : ''} notée${counts.stagnations > 1 ? 's' : ''}`);
    }
    
    if (counts.critical > 0) {
      parts.push(`${counts.critical} point${counts.critical > 1 ? 's' : ''} critique${counts.critical > 1 ? 's' : ''} identifié${counts.critical > 1 ? 's' : ''}`);
    }

    return parts.join(', ');
  }

  /**
   * Exporte l'état actuel du Memento
   * @returns {Object} - État complet du Memento
   */
  exportMemento() {
    return {
      insights: [...this.insights],
      lastSnapshot: this.lastSnapshot,
      configuration: {
        maxInsights: this.maxInsights,
        snapshotInterval: this.snapshotInterval,
        confidenceThreshold: this.confidenceThreshold
      }
    };
  }

  /**
   * Nettoie les ressources du module
   */
  cleanup() {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }
    kernelBus.unsubscribe('prism:reflection:insightGenerated', this.handleNewInsight);
  }
} 