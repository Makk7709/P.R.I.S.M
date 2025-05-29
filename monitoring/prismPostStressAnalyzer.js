/**
 * @fileoverview Analyseur post-stress pour PRISM
 * @module monitoring/prismPostStressAnalyzer
 */

import kernelBus from '../core/KernelBus.js';

/**
 * Classe responsable de l'analyse des sessions de stress test
 */
export class PrismPostStressAnalyzer {
  constructor() {
    this.stressSessionData = {
      anomaliesTriggered: 0,
      activeResponses: 0,
      reactionTimes: [],
      moduleImpacts: new Map(),
      forcedReboots: 0
    };
    
    this.isActive = false;
    this.sessionStartTime = null;
    
    this._subscribeToEvents();
  }

  /**
   * S'abonne aux événements pertinents du bus PRISM
   * @private
   */
  _subscribeToEvents() {
    prismBus.on('prism:stress:start', () => this._handleStressStart());
    prismBus.on('prism:stress:end', () => this._handleStressEnd());
    prismBus.on('prism:anomaly:detected', (data) => this._handleAnomalyDetected(data));
    prismBus.on('prism:response:triggered', (data) => this._handleResponseTriggered(data));
    prismBus.on('prism:reboot:forced', () => this._handleForcedReboot());
  }

  /**
   * Gère le début d'une session de stress
   * @private
   */
  _handleStressStart() {
    this.isActive = true;
    this.sessionStartTime = Date.now();
    this._resetSessionData();
  }

  /**
   * Gère la fin d'une session de stress
   * @private
   */
  _handleStressEnd() {
    if (!this.isActive) return;
    
    this.isActive = false;
    this._generateReport();
  }

  /**
   * Gère la détection d'une anomalie
   * @param {Object} data - Données de l'anomalie
   * @private
   */
  _handleAnomalyDetected(data) {
    if (!this.isActive) return;
    
    this.stressSessionData.anomaliesTriggered++;
    this.stressSessionData.reactionTimes.push(Date.now());
    
    const moduleName = data.module || 'unknown';
    this.stressSessionData.moduleImpacts.set(
      moduleName,
      (this.stressSessionData.moduleImpacts.get(moduleName) || 0) + 1
    );
  }

  /**
   * Gère le déclenchement d'une réponse
   * @param {Object} data - Données de la réponse
   * @private
   */
  _handleResponseTriggered(data) {
    if (!this.isActive) return;
    
    this.stressSessionData.activeResponses++;
    if (this.stressSessionData.reactionTimes.length > 0) {
      const lastAnomalyTime = this.stressSessionData.reactionTimes[this.stressSessionData.reactionTimes.length - 1];
      const reactionTime = Date.now() - lastAnomalyTime;
      this.stressSessionData.reactionTimes.push(reactionTime);
    }
  }

  /**
   * Gère un reboot forcé
   * @private
   */
  _handleForcedReboot() {
    if (!this.isActive) return;
    this.stressSessionData.forcedReboots++;
  }

  /**
   * Réinitialise les données de session
   * @private
   */
  _resetSessionData() {
    this.stressSessionData = {
      anomaliesTriggered: 0,
      activeResponses: 0,
      reactionTimes: [],
      moduleImpacts: new Map(),
      forcedReboots: 0
    };
  }

  /**
   * Génère le rapport d'analyse post-stress
   * @private
   */
  _generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - this.sessionStartTime,
      anomaliesTriggered: this.stressSessionData.anomaliesTriggered,
      activeResponses: this.stressSessionData.activeResponses,
      recoveryRate: this._calculateRecoveryRate(),
      averageReactionTime: this._calculateAverageReactionTime(),
      mostAffectedModules: this._getMostAffectedModules(),
      forcedReboots: this.stressSessionData.forcedReboots
    };

    this._logReport(report);
    prismBus.emit('prism:analytics:postStressReport', report);
  }

  /**
   * Calcule le taux de récupération
   * @returns {number} Taux de récupération (0-1)
   * @private
   */
  _calculateRecoveryRate() {
    if (this.stressSessionData.anomaliesTriggered === 0) return 1;
    return this.stressSessionData.activeResponses / this.stressSessionData.anomaliesTriggered;
  }

  /**
   * Calcule le temps de réaction moyen
   * @returns {number} Temps de réaction moyen en ms
   * @private
   */
  _calculateAverageReactionTime() {
    if (this.stressSessionData.reactionTimes.length === 0) return 0;
    return this.stressSessionData.reactionTimes.reduce((a, b) => a + b, 0) / this.stressSessionData.reactionTimes.length;
  }

  /**
   * Obtient les modules les plus affectés
   * @returns {Array<{module: string, impact: number}>} Liste des modules triés par impact
   * @private
   */
  _getMostAffectedModules() {
    return Array.from(this.stressSessionData.moduleImpacts.entries())
      .map(([module, impact]) => ({ module, impact }))
      .sort((a, b) => b.impact - a.impact);
  }

  /**
   * Affiche le rapport dans la console
   * @param {Object} report - Rapport d'analyse
   * @private
   */
  _logReport(report) {
    console.group('📊 Rapport d\'analyse post-stress PRISM');
    console.log('📈 Durée de session:', (report.sessionDuration / 1000).toFixed(2), 'secondes');
    console.log('📈 Anomalies déclenchées:', report.anomaliesTriggered);
    console.log('📈 Réponses actives:', report.activeResponses);
    console.log('📈 Taux de récupération:', (report.recoveryRate * 100).toFixed(2) + '%');
    console.log('📈 Temps de réaction moyen:', report.averageReactionTime.toFixed(2), 'ms');
    console.log('📉 Reboots forcés:', report.forcedReboots);
    
    console.group('Modules les plus affectés:');
    report.mostAffectedModules.forEach(({ module, impact }) => {
      console.log(`- ${module}: ${impact} impacts`);
    });
    console.groupEnd();
    
    console.groupEnd();
  }
} 