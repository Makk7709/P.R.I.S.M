/**
 * @fileoverview Module d'analyse et d'ajustement de la confiance pour PRISM
 * @module prismCodexAnalyzer
 */

import prismEventGuard from './security/prismEventGuard.js';

/**
 * @class PrismCodexAnalyzer
 * @description Gère l'analyse des outcomes et l'ajustement de la confiance
 */
export class PrismCodexAnalyzer {
  constructor() {
    this.confidenceHistory = new Map();
    this.quarterlyReports = [];
    this.currentQuarter = this.getCurrentQuarter();
    this.isActive = false;
  }

  /**
   * Initialise le module d'analyse
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // S'abonner aux outcomes des directives
      prismBus.subscribe('prism:strategy:directiveOutcome', this.handleDirectiveOutcome.bind(this));

      this.isActive = true;
      console.log('✅ Codex Analyzer initialized');
    } catch (error) {
      console.error('❌ Codex Analyzer initialization failed:', error);
      throw error;
    }
  }

  /**
   * Gère la réception d'un outcome de directive
   * @param {Object} outcome - Résultat de l'exécution
   */
  async handleDirectiveOutcome(outcome) {
    if (!this.isActive) return;

    if (!prismEventGuard.guardOutcome(outcome)) {
      console.warn('⚠️ Outcome rejeté par le guard de sécurité');
      return;
    }

    const { directive, module, result, timestamp } = outcome;
    const key = `${module}:${directive}`;

    // Récupérer ou initialiser la confiance
    let confidence = this.confidenceHistory.get(key) || 0.5;

    // Ajuster la confiance
    if (result === 'success') {
      confidence = Math.min(1, confidence + 0.05);
    } else {
      confidence = Math.max(0, confidence - 0.1);
    }

    // Mettre à jour l'historique
    this.confidenceHistory.set(key, confidence);

    // Mettre à jour le rapport trimestriel
    this.updateQuarterlyReport({
      directive,
      module,
      result,
      confidence,
      timestamp
    });

    // Émettre l'événement de mise à jour de la confiance
    prismBus.emit('prism:codex:confidenceUpdated', {
      directive,
      module,
      confidence,
      timestamp
    });
  }

  /**
   * Met à jour le rapport trimestriel
   * @param {Object} data - Données à ajouter au rapport
   */
  updateQuarterlyReport(data) {
    const currentQuarter = this.getCurrentQuarter();
    
    if (currentQuarter !== this.currentQuarter) {
      // Générer le rapport du trimestre précédent
      this.generateQuarterlyReport();
      this.currentQuarter = currentQuarter;
    }

    // Ajouter les données au rapport en cours
    const report = this.quarterlyReports.find(r => r.quarter === currentQuarter);
    if (report) {
      report.data.push(data);
    } else {
      this.quarterlyReports.push({
        quarter: currentQuarter,
        data: [data]
      });
    }
  }

  /**
   * Génère le rapport trimestriel
   */
  generateQuarterlyReport() {
    const report = this.quarterlyReports.find(r => r.quarter === this.currentQuarter);
    if (!report) return;

    const summary = {
      quarter: this.currentQuarter,
      totalDirectives: report.data.length,
      successRate: this.calculateSuccessRate(report.data),
      averageConfidence: this.calculateAverageConfidence(report.data),
      modulePerformance: this.analyzeModulePerformance(report.data),
      timestamp: Date.now()
    };

    // Émettre le rapport
    prismBus.emit('prism:codex:quarterlyReport', summary);
  }

  /**
   * Calcule le taux de succès
   * @param {Array} data - Données du trimestre
   * @returns {number} Taux de succès
   */
  calculateSuccessRate(data) {
    const successes = data.filter(d => d.result === 'success').length;
    return data.length > 0 ? successes / data.length : 0;
  }

  /**
   * Calcule la confiance moyenne
   * @param {Array} data - Données du trimestre
   * @returns {number} Confiance moyenne
   */
  calculateAverageConfidence(data) {
    const sum = data.reduce((acc, d) => acc + d.confidence, 0);
    return data.length > 0 ? sum / data.length : 0;
  }

  /**
   * Analyse la performance par module
   * @param {Array} data - Données du trimestre
   * @returns {Object} Performance par module
   */
  analyzeModulePerformance(data) {
    const moduleData = {};
    
    data.forEach(d => {
      if (!moduleData[d.module]) {
        moduleData[d.module] = {
          total: 0,
          successes: 0,
          averageConfidence: 0
        };
      }
      
      moduleData[d.module].total++;
      if (d.result === 'success') {
        moduleData[d.module].successes++;
      }
      moduleData[d.module].averageConfidence = 
        (moduleData[d.module].averageConfidence * (moduleData[d.module].total - 1) + d.confidence) / 
        moduleData[d.module].total;
    });

    return moduleData;
  }

  /**
   * Récupère le trimestre actuel
   * @returns {string} Trimestre actuel (YYYY-Q1/2/3/4)
   */
  getCurrentQuarter() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    return `${year}-Q${quarter}`;
  }

  /**
   * Récupère l'historique de confiance
   * @returns {Map} Historique de confiance
   */
  getConfidenceHistory() {
    return this.confidenceHistory;
  }

  /**
   * Récupère les rapports trimestriels
   * @returns {Array} Rapports trimestriels
   */
  getQuarterlyReports() {
    return this.quarterlyReports;
  }

  /**
   * Sauvegarde l'état actuel du Codex Analyzer
   * @returns {Promise<void>}
   */
  async saveState() {
    const state = {
      confidenceHistory: Array.from(this.confidenceHistory.entries()),
      quarterlyReports: this.quarterlyReports,
      currentQuarter: this.currentQuarter,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('prismCodexAnalyzer', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save Codex Analyzer state:', error);
      throw error;
    }
  }

  /**
   * Charge l'état précédemment sauvegardé
   * @returns {Promise<void>}
   */
  async loadState() {
    try {
      const savedState = localStorage.getItem('prismCodexAnalyzer');
      if (!savedState) return;

      const state = JSON.parse(savedState);
      
      // Vérifier si les données sont expirées (TTL de 7 jours)
      const now = Date.now();
      if (now - state.timestamp > 7 * 24 * 60 * 60 * 1000) {
        this.confidenceHistory = new Map();
        this.quarterlyReports = [];
        this.currentQuarter = this.getCurrentQuarter();
        return;
      }

      this.confidenceHistory = new Map(state.confidenceHistory);
      this.quarterlyReports = state.quarterlyReports;
      this.currentQuarter = state.currentQuarter;
    } catch (error) {
      console.error('Failed to load Codex Analyzer state:', error);
      throw error;
    }
  }
} 