/**
 * @fileoverview Module de mémoire courte adaptative pour PRISM
 * @module monitoring/prismMemento
 * @version 1.1.0
 */

/**
 * Copyright (c) 2024 Korev AI. All Rights Reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * 
 * This software and its documentation are proprietary to Korev AI.
 * No part of this software, including but not limited to the source code,
 * documentation, and any other materials, may be reproduced, distributed,
 * or transmitted in any form or by any means, including photocopying,
 * recording, or other electronic or mechanical methods, without the prior
 * written permission of Korev AI.
 * 
 * Unauthorized copying, distribution, or use of this software, via any medium,
 * is strictly prohibited. The receipt or possession of the source code and/or
 * related information does not convey or imply any right to use, reproduce,
 * disclose or distribute its contents, or to manufacture, use, or sell anything
 * that it may describe.
 */

import kernelBus from '../../core/KernelBus.js';

/**
 * Classe gérant la mémoire courte adaptative de PRISM
 * @class PrismMemento
 * @version 1.1.0
 */
export class PrismMemento {
  /**
   * @constructor
   * @param {Object} options - Options de configuration
   * @param {number} [options.maxInsights=20] - Nombre maximum d'insights à conserver
   * @param {number} [options.snapshotInterval=900000] - Intervalle de génération des snapshots (15 minutes)
   * @param {number} [options.confidenceThreshold=0.7] - Seuil de confiance minimum pour les insights
   * @param {number} [options.maxPersistedSnapshots=10] - Nombre maximum de snapshots à persister
   * @param {number} [options.volatilityWindow=5] - Fenêtre de temps pour le calcul de la volatilité
   * @param {number} [options.anomalyDetectionThreshold=0.85] - Seuil pour la détection d'anomalies
   */
  constructor(options = {}) {
    this.version = '1.1.0';
    this.maxInsights = options.maxInsights || 20;
    this.snapshotInterval = options.snapshotInterval || 900000; // 15 minutes
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
    this.maxPersistedSnapshots = options.maxPersistedSnapshots || 10;
    this.volatilityWindow = options.volatilityWindow || 5;
    this.anomalyDetectionThreshold = options.anomalyDetectionThreshold || 0.85;
    
    this.insights = [];
    this.lastSnapshot = null;
    this.snapshotTimer = null;
    this.persistedSnapshots = [];
    this.volatilityHistory = [];
    
    // Rate limiting
    this.rateLimitWindow = 60000; // 1 minute
    this.rateLimitMax = 10; // max 10 events per minute
    this.rateLimitTimestamps = [];
    
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
   * Gère l'arrivée d'un nouvel insight avec validation et rate limiting
   * @private
   * @param {Object} event - Événement contenant l'insight
   */
  handleNewInsight(event) {
    // Rate limiting check
    if (!this.isWithinRateLimit()) {
      console.warn('Rate limit exceeded for insights');
      return;
    }

    // Input validation
    if (!this.isValidInsightFormat(event.analysis)) {
      console.warn('Invalid insight format received:', event.analysis);
      return;
    }

    const insight = event.analysis;
    
    // Filtre les insights selon les critères
    if (this.isValidInsight(insight)) {
      this.addInsight(insight);
      this.rateLimitTimestamps.push(Date.now());
    }
  }

  /**
   * Vérifie si un insight respecte le format attendu
   * @private
   * @param {Object} insight - Insight à valider
   * @returns {boolean} - True si le format est valide
   */
  isValidInsightFormat(insight) {
    return (
      insight &&
      typeof insight === 'object' &&
      typeof insight.confidence === 'number' &&
      insight.confidence >= 0 &&
      insight.confidence <= 1 &&
      typeof insight.type === 'string' &&
      ['critical', 'improvement', 'drift'].includes(insight.type)
    );
  }

  /**
   * Vérifie si le rate limit est respecté
   * @private
   * @returns {boolean} - True si le rate limit est respecté
   */
  isWithinRateLimit() {
    const now = Date.now();
    this.rateLimitTimestamps = this.rateLimitTimestamps.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );
    return this.rateLimitTimestamps.length < this.rateLimitMax;
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
   * Calcule la volatilité du système basée sur l'historique récent
   * @private
   * @returns {number} - Score de volatilité entre 0 et 1
   */
  calculateVolatility() {
    if (this.volatilityHistory.length < 2) return 0.5;
    
    // Optimisation pour éviter les copies inutiles
    const recentHistory = this.volatilityHistory.slice(-this.volatilityWindow);
    const changes = new Array(recentHistory.length - 1);
    
    for (let i = 1; i < recentHistory.length; i++) {
      changes[i - 1] = Math.abs(recentHistory[i] - recentHistory[i - 1]);
    }
    
    return changes.reduce((a, b) => a + b, 0) / changes.length;
  }

  /**
   * Ajuste dynamiquement les paramètres en fonction de la volatilité
   * @private
   */
  adjustParameters() {
    const volatility = this.calculateVolatility();
    
    // Ajustement du seuil de confiance
    this.confidenceThreshold = Math.max(0.5, Math.min(0.9, 
      this.confidenceThreshold * (1 + (volatility - 0.5) * 0.2)
    ));
    
    // Ajustement de l'intervalle de snapshot
    this.snapshotInterval = Math.max(300000, Math.min(1800000,
      this.snapshotInterval * (1 - (volatility - 0.5) * 0.3)
    ));
    
    // Redémarrage du timer avec le nouvel intervalle
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.startSnapshotTimer();
    }
  }

  /**
   * Détecte les anomalies dans les insights
   * @private
   * @param {Object} insight - Insight à analyser
   * @returns {boolean} - True si l'insight est considéré comme une anomalie
   */
  detectAnomaly(insight) {
    if (this.insights.length < 3) return false;
    
    const recentInsights = this.insights.slice(0, 3);
    const avgConfidence = recentInsights.reduce((a, b) => a + b.confidence, 0) / recentInsights.length;
    
    return Math.abs(insight.confidence - avgConfidence) > this.anomalyDetectionThreshold;
  }

  /**
   * Génère un récit narratif enrichi
   * @private
   * @param {Object} counts - Comptages des différents types d'insights
   * @returns {string} - Récit narratif enrichi
   */
  generateNarrative(counts) {
    const parts = [];
    const volatility = this.calculateVolatility();
    
    // Ajout du contexte de volatilité
    if (volatility > 0.7) {
      parts.push("Le système montre une activité intense");
    } else if (volatility < 0.3) {
      parts.push("Le système est dans une phase stable");
    }
    
    // Génération du récit principal
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

    // Ajout d'une conclusion contextuelle
    if (parts.length > 0) {
      parts.push("Ces observations suggèrent une évolution " + 
        (volatility > 0.7 ? "dynamique" : volatility < 0.3 ? "stable" : "modérée") + 
        " du système");
    }

    return parts.join('. ');
  }

  /**
   * Persiste un snapshot en mémoire
   * @private
   * @param {Object} snapshot - Snapshot à persister
   */
  persistSnapshot(snapshot) {
    this.persistedSnapshots.unshift(snapshot);
    
    // Limite le nombre de snapshots persistés
    if (this.persistedSnapshots.length > this.maxPersistedSnapshots) {
      this.persistedSnapshots.pop();
    }
  }

  /**
   * Génère un snapshot narratif de la mémoire
   * @private
   */
  generateSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      summary: this.generateSummary(),
      insights: [...this.insights],
      volatility: this.calculateVolatility()
    };

    this.lastSnapshot = snapshot;
    this.persistSnapshot(snapshot);
    this.volatilityHistory.push(snapshot.volatility);
    
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
   * Exporte l'état actuel du Memento
   * @returns {Object} - État complet du Memento
   */
  exportMemento() {
    return {
      version: this.version,
      insights: [...this.insights],
      lastSnapshot: this.lastSnapshot,
      persistedSnapshots: [...this.persistedSnapshots],
      configuration: {
        maxInsights: this.maxInsights,
        snapshotInterval: this.snapshotInterval,
        confidenceThreshold: this.confidenceThreshold,
        maxPersistedSnapshots: this.maxPersistedSnapshots,
        volatilityWindow: this.volatilityWindow,
        anomalyDetectionThreshold: this.anomalyDetectionThreshold
      }
    };
  }

  /**
   * Retourne les métriques actuelles du module
   * @returns {Object} - Métriques du module
   */
  getMetrics() {
    return {
      totalInsights: this.insights.length,
      avgVolatility: this.calculateVolatility(),
      lastSnapshotAgeMs: this.lastSnapshot ? Date.now() - this.lastSnapshot.timestamp : 0
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