/**
 * PrismLegacyCore - Gestionnaire d'héritage et de conscience historique de PRISM
 * @class
 */
export class PrismLegacyCore {
  constructor() {
    this.legacyData = {
      milestones: [],
      lastUpdate: null,
      version: '1.0.0'
    };
    this.isMonitoring = false;
    this.storageKey = 'prism_legacy_data';
    this._initializeLegacy();
  }

  /**
   * Initialise les données d'héritage depuis le stockage local
   * @private
   */
  _initializeLegacy() {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (storedData) {
        this.legacyData = JSON.parse(storedData);
      }
    } catch (error) {
      this._handleError('Initialization error', error);
    }
  }

  /**
   * Démarre la surveillance de l'évolution historique
   * @returns {boolean} État de la surveillance
   */
  startLegacyMonitoring() {
    if (this.isMonitoring) return false;
    
    try {
      this.isMonitoring = true;
      this._emitEvent('monitoring:started');
      return true;
    } catch (error) {
      this._handleError('Monitoring start error', error);
      return false;
    }
  }

  /**
   * Enregistre un jalon d'évolution du système
   * @param {Object} milestone - Données du jalon
   * @param {string} milestone.id - Identifiant unique du jalon
   * @param {string} milestone.description - Description du jalon
   * @param {number} milestone.emotionalWeight - Pondération émotionnelle (0-1)
   * @param {number} milestone.energyLevel - Niveau d'énergie (0-1)
   * @returns {boolean} Succès de l'enregistrement
   */
  recordLegacyMilestone(milestone) {
    if (!this._validateMilestone(milestone)) return false;

    try {
      const enrichedMilestone = {
        ...milestone,
        timestamp: Date.now(),
        systemState: this._captureSystemState()
      };

      this.legacyData.milestones.push(enrichedMilestone);
      this.legacyData.lastUpdate = Date.now();
      
      this._persistLegacyData();
      this._emitEvent('milestone:recorded', enrichedMilestone);
      
      return true;
    } catch (error) {
      this._handleError('Milestone recording error', error);
      return false;
    }
  }

  /**
   * Retourne un résumé synthétique des évolutions majeures
   * @returns {Object} Vue d'ensemble de l'héritage
   */
  getLegacyOverview() {
    try {
      return {
        totalMilestones: this.legacyData.milestones.length,
        lastUpdate: this.legacyData.lastUpdate,
        emotionalTrend: this._calculateEmotionalTrend(),
        energyTrend: this._calculateEnergyTrend(),
        recentMilestones: this._getRecentMilestones(5)
      };
    } catch (error) {
      this._handleError('Overview generation error', error);
      return null;
    }
  }

  /**
   * Valide les données d'un jalon
   * @private
   * @param {Object} milestone - Jalon à valider
   * @returns {boolean} Validité du jalon
   */
  _validateMilestone(milestone) {
    return (
      milestone &&
      typeof milestone.id === 'string' &&
      typeof milestone.description === 'string' &&
      typeof milestone.emotionalWeight === 'number' &&
      typeof milestone.energyLevel === 'number' &&
      milestone.emotionalWeight >= 0 &&
      milestone.emotionalWeight <= 1 &&
      milestone.energyLevel >= 0 &&
      milestone.energyLevel <= 1
    );
  }

  /**
   * Capture l'état actuel du système
   * @private
   * @returns {Object} État du système
   */
  _captureSystemState() {
    return {
      timestamp: Date.now(),
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : null,
      userAgent: navigator.userAgent
    };
  }

  /**
   * Persiste les données d'héritage dans le stockage local
   * @private
   */
  _persistLegacyData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.legacyData));
    } catch (error) {
      this._handleError('Data persistence error', error);
    }
  }

  /**
   * Calcule la tendance émotionnelle
   * @private
   * @returns {number} Tendance émotionnelle moyenne
   */
  _calculateEmotionalTrend() {
    const milestones = this.legacyData.milestones;
    if (!milestones.length) return 0;
    
    const sum = milestones.reduce((acc, m) => acc + m.emotionalWeight, 0);
    return sum / milestones.length;
  }

  /**
   * Calcule la tendance énergétique
   * @private
   * @returns {number} Tendance énergétique moyenne
   */
  _calculateEnergyTrend() {
    const milestones = this.legacyData.milestones;
    if (!milestones.length) return 0;
    
    const sum = milestones.reduce((acc, m) => acc + m.energyLevel, 0);
    return sum / milestones.length;
  }

  /**
   * Récupère les jalons récents
   * @private
   * @param {number} count - Nombre de jalons à récupérer
   * @returns {Array} Jalons récents
   */
  _getRecentMilestones(count) {
    return this.legacyData.milestones
      .slice(-count)
      .map(m => ({
        id: m.id,
        description: m.description,
        timestamp: m.timestamp
      }));
  }

  /**
   * Émet un événement personnalisé
   * @private
   * @param {string} type - Type d'événement
   * @param {Object} [detail] - Détails de l'événement
   */
  _emitEvent(type, detail = {}) {
    const event = new CustomEvent('prism:legacy:update', {
      detail: {
        type,
        timestamp: Date.now(),
        ...detail
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Gère les erreurs de manière sécurisée
   * @private
   * @param {string} context - Contexte de l'erreur
   * @param {Error} error - Erreur à gérer
   */
  _handleError(context, error) {
    this._emitEvent('error', {
      context,
      message: error.message
    });
  }
} 