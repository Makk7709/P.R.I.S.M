/**
 * FileContextManager - Gestionnaire de contexte de fichiers
 *
 * Gère le stockage temporaire des fichiers uploadés dans le chat
 * pour permettre les questions de suivi.
 *
 * @module src/chat/FileContextManager
 */

import crypto from 'node:crypto';

/**
 * FileContextManager - Classe de gestion du contexte fichier
 */
export class FileContextManager {
  /**
   * @param {Object} options - Options de configuration
   * @param {number} options.contextTTL - Durée de vie du contexte en ms (défaut: 30 min)
   * @param {number} options.maxContexts - Nombre max de contextes simultanés (défaut: 100)
   * @param {number} options.maxFileSize - Taille max de fichier (défaut: 50MB)
   */
  constructor(options = {}) {
    this.options = {
      contextTTL: options.contextTTL || 30 * 60 * 1000, // 30 minutes
      maxContexts: options.maxContexts || 100,
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024,
      ...options,
    };

    this.contexts = new Map();
    this.cleanupTimers = new Map();
  }

  /**
   * Stocke un fichier dans le contexte d'une session
   * @param {string} sessionId - ID de la session
   * @param {Object} file - Fichier à stocker
   * @param {Object} metadata - Métadonnées du fichier
   * @returns {Promise<Object>} Contexte créé
   */
  async store(sessionId, file, metadata) {
    // Vérifier les limites
    if (this.contexts.size >= this.options.maxContexts) {
      this._evictOldest();
    }

    // Créer le contexte
    const context = {
      id: crypto.randomUUID(),
      sessionId,
      file: {
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      },
      metadata: {
        originalName: metadata.originalName,
        type: metadata.type,
        uploadedAt: new Date().toISOString(),
        ...metadata,
      },
      parsedData: null,
      analysis: null,
      columns: null,
      dataPreview: null,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };

    // Stocker
    this.contexts.set(sessionId, context);

    // Programmer le nettoyage
    this._scheduleCleanup(sessionId);

    return context;
  }

  /**
   * Récupère le contexte d'une session
   * @param {string} sessionId - ID de la session
   * @returns {Promise<Object|undefined>} Contexte ou undefined
   */
  async get(sessionId) {
    const context = this.contexts.get(sessionId);

    if (context) {
      context.lastAccessed = Date.now();
      // Reprogrammer le nettoyage
      this._scheduleCleanup(sessionId);
    }

    return context;
  }

  /**
   * Enrichit le contexte avec les résultats d'analyse
   * @param {string} sessionId - ID de la session
   * @param {Object} enrichment - Données d'enrichissement
   */
  async enrichContext(sessionId, enrichment) {
    const context = this.contexts.get(sessionId);

    if (context) {
      if (enrichment.columns) {
        context.columns = enrichment.columns;
      }
      if (enrichment.analysis) {
        context.analysis = enrichment.analysis;
      }
      if (enrichment.dataPreview) {
        context.dataPreview = enrichment.dataPreview;
      }
      if (enrichment.statistics) {
        context.statistics = enrichment.statistics;
      }
      if (enrichment.parsedData) {
        context.parsedData = enrichment.parsedData;
      }

      context.lastAccessed = Date.now();
    }
  }

  /**
   * Supprime un contexte
   * @param {string} sessionId - ID de la session
   */
  async delete(sessionId) {
    // Annuler le timer de nettoyage
    const timer = this.cleanupTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(sessionId);
    }

    this.contexts.delete(sessionId);
  }

  /**
   * Liste les sessions actives
   * @returns {string[]} Liste des IDs de session
   */
  listActiveSessions() {
    return Array.from(this.contexts.keys());
  }

  /**
   * Obtient les statistiques d'utilisation
   * @returns {Object} Statistiques
   */
  getStats() {
    let totalMemoryUsage = 0;

    for (const context of this.contexts.values()) {
      if (context.file?.buffer) {
        totalMemoryUsage += context.file.buffer.length;
      }
    }

    return {
      activeContexts: this.contexts.size,
      totalMemoryUsage,
      maxContexts: this.options.maxContexts,
      contextTTL: this.options.contextTTL,
    };
  }

  /**
   * Vide tous les contextes
   */
  clearAll() {
    // Annuler tous les timers
    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    this.cleanupTimers.clear();
    this.contexts.clear();
  }

  /**
   * Programme le nettoyage automatique
   * @private
   */
  _scheduleCleanup(sessionId) {
    // Annuler le timer existant
    const existingTimer = this.cleanupTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Programmer un nouveau nettoyage
    const timer = setTimeout(() => {
      this.contexts.delete(sessionId);
      this.cleanupTimers.delete(sessionId);
    }, this.options.contextTTL);

    this.cleanupTimers.set(sessionId, timer);
  }

  /**
   * Évince le contexte le plus ancien
   * @private
   */
  _evictOldest() {
    let oldestSession = null;
    let oldestTime = Infinity;

    for (const [sessionId, context] of this.contexts) {
      if (context.lastAccessed < oldestTime) {
        oldestTime = context.lastAccessed;
        oldestSession = sessionId;
      }
    }

    if (oldestSession) {
      this.delete(oldestSession);
    }
  }
}

export default FileContextManager;
