/**
 * @fileoverview PRISM Validator - Système de validation d'intégrité pour PRISM
 * @author Orion - Architecte Système PRISM
 * @version 1.0.0
 */

'use strict';

/**
 * Classe principale de validation PRISM
 * @class PrismValidator
 */
export class PrismValidator {
  #isDevelopment = process.env.NODE_ENV === 'development';
  #criticalModules = new Set([
    'heartSync',
    'mood',
    'bond',
    'soul',
    'awareness',
    'noesis'
  ]);

  /**
   * @constructor
   */
  constructor() {
    this.#validateEnvironment();
  }

  /**
   * Valide l'environnement d'exécution
   * @private
   */
  #validateEnvironment() {
    if (typeof window === 'undefined') {
      throw new Error('PRISM Validator must run in a browser environment');
    }
  }

  /**
   * Valide tous les modules et états PRISM
   * @returns {Promise<Object>} Rapport de validation
   */
  async validateAll() {
    const issues = [];
    let status = 'ok';

    try {
      // Vérification des modules critiques
      const moduleIssues = await this.#validateCriticalModules();
      issues.push(...moduleIssues);

      // Vérification de l'état initial
      const stateIssues = await this.#validateInitialState();
      issues.push(...stateIssues);

      // Détermination du statut final
      if (issues.some(issue => issue.severity === 'critical')) {
        status = 'critical';
      } else if (issues.length > 0) {
        status = 'warning';
      }

      // Émission de l'événement de validation
      this.#emitValidationEvent(status, issues);

      return { status, issues };
    } catch (error) {
      this.#logError('Validation failed:', error);
      return {
        status: 'critical',
        issues: [{
          type: 'validation_error',
          severity: 'critical',
          message: error.message
        }]
      };
    }
  }

  /**
   * Valide les modules critiques
   * @private
   * @returns {Promise<Array>} Liste des problèmes détectés
   */
  async #validateCriticalModules() {
    const issues = [];

    for (const moduleName of this.#criticalModules) {
      try {
        const module = window[`prism${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`];
        
        if (!module) {
          issues.push({
            type: 'missing_module',
            severity: 'critical',
            module: moduleName,
            message: `Module critique manquant: ${moduleName}`
          });
          continue;
        }

        // Vérification de l'état du module
        if (typeof module.isActive === 'boolean' && !module.isActive) {
          issues.push({
            type: 'inactive_module',
            severity: 'warning',
            module: moduleName,
            message: `Module inactif: ${moduleName}`
          });
        }

        // Vérification des méthodes essentielles
        const requiredMethods = ['initialize', 'reset'];
        for (const method of requiredMethods) {
          if (typeof module[method] !== 'function') {
            issues.push({
              type: 'missing_method',
              severity: 'critical',
              module: moduleName,
              method,
              message: `Méthode manquante: ${method} dans ${moduleName}`
            });
          }
        }
      } catch (error) {
        issues.push({
          type: 'module_error',
          severity: 'critical',
          module: moduleName,
          message: `Erreur lors de la validation de ${moduleName}: ${error.message}`
        });
      }
    }

    return issues;
  }

  /**
   * Valide l'état initial du système
   * @private
   * @returns {Promise<Array>} Liste des problèmes détectés
   */
  async #validateInitialState() {
    const issues = [];
    const state = await this.#gatherSystemState();

    // Vérification de la session
    if (!state.session) {
      issues.push({
        type: 'session_error',
        severity: 'critical',
        message: 'Session PRISM non initialisée'
      });
    }

    // Vérification du heartbeat
    if (!state.heartbeat || !state.heartbeat.isRunning) {
      issues.push({
        type: 'heartbeat_error',
        severity: 'critical',
        message: 'Heartbeat PRISM non actif'
      });
    }

    // Vérification de l'état émotionnel
    if (state.mood) {
      const { dominant, intensity } = state.mood;
      if (intensity < 0.1 || intensity > 0.9) {
        issues.push({
          type: 'mood_warning',
          severity: 'warning',
          message: `État émotionnel extrême: ${dominant} (${intensity})`
        });
      }
    }

    // Vérification des vitaux
    if (state.vitals) {
      const { energy, stability } = state.vitals;
      if (energy < 0.2) {
        issues.push({
          type: 'energy_warning',
          severity: 'warning',
          message: `Niveau d'énergie faible: ${energy}`
        });
      }
      if (stability < 0.7) {
        issues.push({
          type: 'stability_warning',
          severity: 'warning',
          message: `Stabilité système faible: ${stability}`
        });
      }
    }

    return issues;
  }

  /**
   * Récupère l'état actuel du système
   * @private
   * @returns {Promise<Object>} État du système
   */
  async #gatherSystemState() {
    return {
      session: window.prismSessionId,
      heartbeat: window.prismHeartSync,
      mood: window.prismMood?.getCurrentMood?.(),
      vitals: window.prismVitals?.getVitals?.(),
      noesis: window.prismNoesis?.getState?.()
    };
  }

  /**
   * Émet l'événement de validation
   * @private
   * @param {string} status - Statut de validation
   * @param {Array} issues - Problèmes détectés
   */
  #emitValidationEvent(status, issues) {
    const event = new CustomEvent('prism:validation:complete', {
      detail: {
        timestamp: Date.now(),
        status,
        issues
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Journalise les erreurs en mode développement
   * @private
   * @param {string} message - Message d'erreur
   * @param {Error} error - Erreur
   */
  #logError(message, error) {
    if (this.#isDevelopment) {
      console.error(`%c[PRISM Validator] ${message}`, 'color: #ff4444; font-weight: bold', error);
    }
  }
}

/**
 * Valide une réponse de Perplexity
 * @param {Object} response - La réponse à valider
 * @returns {Promise<Object>} Résultat de la validation
 */
async function validatePerplexityResponse(response) {
    if (!response || typeof response !== 'object') {
        return { isValid: false, details: 'Invalid response format' };
    }

    const requiredFields = ['text', 'confidence', 'sources', 'timestamp'];
    const missingFields = requiredFields.filter(field => !response[field]);

    if (missingFields.length > 0) {
        return { 
            isValid: false, 
            details: `Missing required fields: ${missingFields.join(', ')}` 
        };
    }

    if (typeof response.text !== 'string' || response.text.trim() === '') {
        return { isValid: false, details: 'Empty or invalid text' };
    }

    if (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1) {
        return { isValid: false, details: 'Invalid confidence value' };
    }

    if (!Array.isArray(response.sources)) {
        return { isValid: false, details: 'Sources must be an array' };
    }

    if (typeof response.timestamp !== 'string' || !Date.parse(response.timestamp)) {
        return { isValid: false, details: 'Invalid timestamp' };
    }

    return { isValid: true, details: 'Response is valid' };
}

/**
 * Vérifie la qualité d'une réponse de Perplexity
 * @param {Object} response - La réponse à vérifier
 * @returns {Promise<Object>} Résultat de la vérification
 */
async function qualityCheckPerplexityResponse(response) {
    const validationResult = await validatePerplexityResponse(response);
    if (!validationResult.isValid) {
        return { passed: false, details: validationResult.details };
    }

    // Vérification de la qualité du texte
    const textQuality = {
        minLength: 10,
        maxLength: 1000,
        hasPunctuation: /[.!?]$/.test(response.text.trim()),
        hasCapitalization: /^[A-Z]/.test(response.text.trim())
    };

    const textIssues = [];
    if (response.text.length < textQuality.minLength) {
        textIssues.push('Text too short');
    }
    if (response.text.length > textQuality.maxLength) {
        textIssues.push('Text too long');
    }
    if (!textQuality.hasPunctuation) {
        textIssues.push('Missing punctuation');
    }
    if (!textQuality.hasCapitalization) {
        textIssues.push('Missing capitalization');
    }

    // Vérification de la confiance
    const confidenceThreshold = 0.7;
    if (response.confidence < confidenceThreshold) {
        textIssues.push('Low confidence');
    }

    // Vérification des sources
    if (response.sources.length === 0) {
        textIssues.push('No sources provided');
    }

    return {
        passed: textIssues.length === 0,
        details: textIssues.length > 0 ? textIssues.join(', ') : 'All quality checks passed'
    };
}

export {
    validatePerplexityResponse,
    qualityCheckPerplexityResponse
}; 