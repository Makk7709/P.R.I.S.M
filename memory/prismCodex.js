/**
 * @fileoverview PRISM Codex - Module de mémoire comportementale dynamique
 * @module memory/prismCodex
 */

import kernelBus from '../core/KernelBus.js';

/**
 * Types d'événements supportés par PRISM Codex
 * @enum {string}
 */
const EventType = {
  INSIGHT: 'insight',
  MODE: 'mode',
  EMERGENCY: 'emergency',
  RECOVERY: 'recovery'
};

/**
 * Niveaux de gravité des événements
 * @enum {string}
 */
const Severity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Classe principale de PRISM Codex
 * @class
 */
class PrismCodex {
  constructor() {
    /** @private */
    this.memory = new Map();
    /** @private */
    this.maxEvents = 10000;
    /** @private */
    this.eventCount = 0;
    /** @private */
    this.initialized = false;
  }

  /**
   * Initialise le module PRISM Codex
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // S'abonner aux événements PRISM importants
      prismBus.subscribe('prism:reflection:insightGenerated', this.handleInsight.bind(this));
      prismBus.subscribe('prism:mood:modeChanged', this.handleModeChange.bind(this));
      prismBus.subscribe('prism:guardian:emergency', this.handleEmergency.bind(this));
      prismBus.subscribe('prism:recovery:completed', this.handleRecovery.bind(this));

      this.initialized = true;
      console.log('📖 PRISM Codex initialized');
    } catch (error) {
      console.error('Failed to initialize PRISM Codex:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde un événement dans la mémoire
   * @param {Object} eventData - Données de l'événement
   * @param {string} eventData.type - Type d'événement
   * @param {string} eventData.severity - Gravité de l'événement
   * @param {string} eventData.source - Source de l'événement
   * @param {Object} eventData.data - Données spécifiques à l'événement
   * @returns {Promise<void>}
   */
  async saveEvent(eventData) {
    if (!this.initialized) {
      throw new Error('PRISM Codex not initialized');
    }

    try {
      const event = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...eventData
      };

      // Vérifier la limite d'événements
      if (this.eventCount >= this.maxEvents) {
        await this.pruneMemory();
      }

      this.memory.set(event.id, event);
      this.eventCount++;

      // Émettre l'événement d'enregistrement
      prismBus.emit('prism:codex:eventRecorded', { event });

      console.log(`📖 Event recorded: ${event.type} (${event.severity})`);
    } catch (error) {
      console.error('Failed to save event:', error);
      throw error;
    }
  }

  /**
   * Récupère les événements filtrés
   * @param {Object} filters - Filtres de recherche
   * @param {Date} [filters.startDate] - Date de début
   * @param {Date} [filters.endDate] - Date de fin
   * @param {string} [filters.type] - Type d'événement
   * @param {string} [filters.severity] - Gravité
   * @returns {Promise<Array>} Liste des événements filtrés
   */
  async queryEvents(filters = {}) {
    if (!this.initialized) {
      throw new Error('PRISM Codex not initialized');
    }

    try {
      let events = Array.from(this.memory.values());

      if (filters.startDate) {
        events = events.filter(e => e.timestamp >= filters.startDate.getTime());
      }
      if (filters.endDate) {
        events = events.filter(e => e.timestamp <= filters.endDate.getTime());
      }
      if (filters.type) {
        events = events.filter(e => e.type === filters.type);
      }
      if (filters.severity) {
        events = events.filter(e => e.severity === filters.severity);
      }

      return events.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to query events:', error);
      throw error;
    }
  }

  /**
   * Produit un résumé comportemental pour une période donnée
   * @param {Object} period - Période d'analyse
   * @param {Date} period.start - Date de début
   * @param {Date} period.end - Date de fin
   * @returns {Promise<Object>} Résumé comportemental
   */
  async summarizeBehavior(period) {
    if (!this.initialized) {
      throw new Error('PRISM Codex not initialized');
    }

    try {
      const events = await this.queryEvents({
        startDate: period.start,
        endDate: period.end
      });

      const summary = {
        totalEvents: events.length,
        byType: {},
        bySeverity: {},
        timeline: events.map(e => ({
          timestamp: e.timestamp,
          type: e.type,
          severity: e.severity
        }))
      };

      // Agréger par type et gravité
      events.forEach(event => {
        summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;
        summary.bySeverity[event.severity] = (summary.bySeverity[event.severity] || 0) + 1;
      });

      return summary;
    } catch (error) {
      console.error('Failed to summarize behavior:', error);
      throw error;
    }
  }

  /**
   * Exporte toute la mémoire sous forme JSON compressé
   * @returns {Promise<string>} JSON compressé
   */
  async exportCodex() {
    if (!this.initialized) {
      throw new Error('PRISM Codex not initialized');
    }

    try {
      const data = Array.from(this.memory.values());
      const json = JSON.stringify(data);
      return json;
    } catch (error) {
      console.error('Failed to export codex:', error);
      throw error;
    }
  }

  /**
   * Nettoie la mémoire en supprimant les événements les plus anciens
   * @private
   * @returns {Promise<void>}
   */
  async pruneMemory() {
    try {
      const events = Array.from(this.memory.values())
        .sort((a, b) => a.timestamp - b.timestamp);

      const eventsToRemove = events.slice(0, Math.floor(this.maxEvents * 0.1));
      eventsToRemove.forEach(event => {
        this.memory.delete(event.id);
        this.eventCount--;
      });

      prismBus.emit('prism:codex:memoryPruned', {
        removedCount: eventsToRemove.length
      });

      console.log(`📖 Memory pruned: ${eventsToRemove.length} events removed`);
    } catch (error) {
      console.error('Failed to prune memory:', error);
      throw error;
    }
  }

  /**
   * Gestionnaire d'insights
   * @private
   * @param {Object} event - Événement d'insight
   */
  async handleInsight(event) {
    await this.saveEvent({
      type: EventType.INSIGHT,
      severity: Severity.MEDIUM,
      source: 'reflection',
      data: event.analysis
    });
  }

  /**
   * Gestionnaire de changements de mode
   * @private
   * @param {Object} event - Événement de changement de mode
   */
  async handleModeChange(event) {
    await this.saveEvent({
      type: EventType.MODE,
      severity: Severity.LOW,
      source: 'mood',
      data: event.mode
    });
  }

  /**
   * Gestionnaire d'urgences
   * @private
   * @param {Object} event - Événement d'urgence
   */
  async handleEmergency(event) {
    await this.saveEvent({
      type: EventType.EMERGENCY,
      severity: Severity.CRITICAL,
      source: 'guardian',
      data: event.emergency
    });
  }

  /**
   * Gestionnaire de récupérations
   * @private
   * @param {Object} event - Événement de récupération
   */
  async handleRecovery(event) {
    await this.saveEvent({
      type: EventType.RECOVERY,
      severity: Severity.HIGH,
      source: 'recovery',
      data: event.recovery
    });
  }
}

export default new PrismCodex(); 