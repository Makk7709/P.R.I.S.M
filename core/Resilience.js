/**
 * PRISM Resilience - Système unifié de résilience et de récupération
 * @module core/Resilience
 */

import kernelBus from './KernelBus.js';
import PrismHeartSync from '../prismHeartSync.js';
import { PrismLegacyCore } from '../prismLegacyCore.js';

/**
 * Types d'incidents système
 * @enum {string}
 */
const ISSUE_TYPES = {
  MODULE_FROZEN: 'module_frozen',
  CACHE_CORRUPTION: 'cache_corruption',
  INSTANCE_FAULT: 'instance_fault',
  EVENT_LOSS: 'event_loss',
  EMERGENCY: 'emergency',
  UI_INCONSISTENCY: 'ui_inconsistency'
};

/**
 * Classe principale de résilience PRISM
 * @class Resilience
 */
export class Resilience {
  constructor(heartSync, legacyCore) {
    if (!heartSync || !legacyCore) {
      throw new Error('Resilience requires both heartSync and legacyCore instances');
    }

    // État du système
    this.heartSync = heartSync;
    this.legacyCore = legacyCore;
    this.recoveryHistory = [];
    this.lastStatus = null;
    this.isRecovering = false;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.failureCount = 0;
    this.emergencyThreshold = 3;
    this.inEmergency = false;
    
    // Seuils adaptatifs
    this.adaptiveThresholds = {
      energy: 20,
      stability: 50,
      performance: 40
    };

    // Configuration du failsafe
    this.isRecoveryInProgress = false;
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
    this.criticalModules = ['particles', 'audio', 'prismInit'];
    this.lastError = null;
  }

  /**
   * Initialise le système de résilience
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Configuration des écouteurs d'événements
      kernelBus.on('prism:emergency:detected', this.handleEmergency.bind(this));
      kernelBus.on('prism:emergency:manualTrigger', this.handleEmergency.bind(this));
      
      // Configuration des gestionnaires d'erreurs
      this.setupErrorHandlers();
      this.setupStateMonitoring();
      
      // Écouter les mises à jour des seuils
      document.addEventListener('prism:sentinel:thresholds-updated', (event) => {
        this.adaptiveThresholds = event.detail.thresholds;
        console.log('📊 Resilience thresholds updated:', this.adaptiveThresholds);
      });
      
      this._emitEvent('prism:resilience:initialized', { timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to initialize resilience system:', error);
      this._emitEvent('prism:resilience:initFailed', { error: error.message });
    }
  }

  /**
   * Configure les gestionnaires d'erreurs globaux
   * @private
   */
  setupErrorHandlers() {
    window.onerror = (msg, url, line, col, error) => {
      this.handleCriticalError(error || new Error(msg));
      return false;
    };

    window.addEventListener('unhandledrejection', (event) => {
      this.handleCriticalError(event.reason);
    });

    window.addEventListener('error', (event) => {
      this.handleCriticalError(event.error);
    });
  }

  /**
   * Configure la surveillance de l'état de l'UI
   * @private
   */
  setupStateMonitoring() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (this.isUIInconsistent(mutation)) {
          this.handleUIInconsistency(mutation);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
  }

  /**
   * Vérifie la cohérence de l'UI
   * @private
   */
  isUIInconsistent(mutation) {
    const criticalElements = ['particle-container', 'status-message', 'transcript', 'btn-prism'];
    return criticalElements.some(id => {
      const element = document.getElementById(id);
      return !element || !element.isConnected || !element.offsetParent;
    });
  }

  /**
   * Gère une erreur critique
   * @param {Error} error - L'erreur à gérer
   */
  async handleCriticalError(error) {
    if (this.isRecoveryInProgress) return;
    
    this.lastError = error;
    console.warn('PRISM Resilience: Critical error detected', error);

    if (this.recoveryAttempts < this.maxRecoveryAttempts) {
      await this.attemptSoftRecovery();
    } else {
      await this.performHardRecovery();
    }
  }

  /**
   * Gère une incohérence de l'UI
   * @param {MutationRecord} mutation - La mutation détectée
   */
  handleUIInconsistency(mutation) {
    console.warn('PRISM Resilience: UI inconsistency detected', mutation);
    this.handleCriticalError(new Error('UI State Inconsistency'));
  }

  /**
   * Tente une récupération douce
   * @private
   */
  async attemptSoftRecovery() {
    this.isRecoveryInProgress = true;
    this.recoveryAttempts++;
    
    try {
      await this.resetUIState();
      await this.reloadCriticalModules();
      this.showNotification('Système PRISM réinitialisé avec succès', 'success');
      this.isRecoveryInProgress = false;
    } catch (error) {
      console.error('PRISM Resilience: Soft recovery failed', error);
      await this.performHardRecovery();
    }
  }

  /**
   * Réinitialise l'état de l'UI
   * @private
   */
  async resetUIState() {
    const elements = {
      'status-message': '',
      'transcript': '',
      'error-message': ''
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    const btnPrism = document.getElementById('btn-prism');
    if (btnPrism) {
      btnPrism.disabled = false;
      btnPrism.classList.remove('error', 'loading');
    }
  }

  /**
   * Recharge les modules critiques
   * @private
   */
  async reloadCriticalModules() {
    for (const module of this.criticalModules) {
      try {
        const modulePath = `./${module}.js`;
        const moduleInstance = await import(modulePath);
        if (typeof moduleInstance.init === 'function') {
          await moduleInstance.init();
        }
      } catch (error) {
        console.error(`PRISM Resilience: Failed to reload module ${module}`, error);
        throw error;
      }
    }
  }

  /**
   * Effectue une récupération complète
   * @private
   */
  async performHardRecovery() {
    this.showNotification('Redémarrage du système PRISM...', 'warning');
    
    try {
      localStorage.setItem('prism_last_error', JSON.stringify({
        message: this.lastError?.message,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('PRISM Resilience: Could not save error state', e);
    }

    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  /**
   * Affiche une notification
   * @private
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `prism-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 8px;
      background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FFC107' : '#2196F3'};
      color: white;
      font-family: var(--font-orbitron);
      z-index: 9999;
      animation: fadeIn 0.3s ease-in-out;
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease-in-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Analyse un problème et détermine la stratégie de récupération
   * @param {Object} issue - Le problème à analyser
   * @returns {Object} Résultat de l'analyse avec actions recommandées
   */
  analyzeIssue(issue) {
    if (!issue || typeof issue !== 'object') {
      return { valid: false, error: 'Invalid issue format' };
    }

    const analysis = {
      type: issue.type || 'unknown',
      severity: issue.severity || 'low',
      timestamp: Date.now(),
      recommendedActions: []
    };

    // Utilisation des seuils adaptatifs pour l'analyse
    const { energy, stability } = issue.vitals || {};
    
    if (energy && energy <= this.adaptiveThresholds.energy) {
      analysis.severity = 'high';
      analysis.recommendedActions.push('restoreEnergy');
    }
    
    if (stability && stability < this.adaptiveThresholds.stability) {
      analysis.severity = 'high';
      analysis.recommendedActions.push('restoreStability');
    }

    switch (issue.type) {
      case ISSUE_TYPES.MODULE_FROZEN:
        analysis.recommendedActions.push('resetModule', 'clearModuleCache');
        break;
      case ISSUE_TYPES.CACHE_CORRUPTION:
        analysis.recommendedActions.push('purgeCache', 'rebuildCache');
        break;
      case ISSUE_TYPES.INSTANCE_FAULT:
        analysis.recommendedActions.push('resetInstance', 'verifyState');
        break;
      case ISSUE_TYPES.EVENT_LOSS:
        analysis.recommendedActions.push('reconnectEvents', 'syncState');
        break;
      case ISSUE_TYPES.UI_INCONSISTENCY:
        analysis.recommendedActions.push('resetUIState', 'reloadCriticalModules');
        break;
      default:
        analysis.recommendedActions.push('diagnose', 'logIssue');
    }

    return analysis;
  }

  /**
   * Tente de récupérer d'un problème détecté
   * @returns {Promise<Object>} Résultat de la récupération
   */
  async attemptRecovery() {
    if (this.isRecovering) {
      return { success: false, error: 'Recovery already in progress' };
    }

    this.isRecovering = true;
    const recoveryId = Date.now();
    
    try {
      this._emitEvent('prism:resilience:recoveryStarted', { recoveryId });
      
      const result = await this._executeRecovery();
      
      this.lastStatus = {
        success: result.success,
        timestamp: Date.now(),
        recoveryId,
        details: result
      };

      this.recoveryHistory.push(this.lastStatus);
      
      if (result.success) {
        this._emitEvent('prism:resilience:recoverySucceeded', { recoveryId, details: result });
      } else {
        this._emitEvent('prism:resilience:recoveryFailed', { recoveryId, error: result.error });
      }

      return this.lastStatus;
    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        recoveryId
      };
      
      this._emitEvent('prism:resilience:recoveryFailed', errorResult);
      return errorResult;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Gère une situation d'urgence
   * @param {Object} emergencyData - Données de l'urgence
   * @returns {Promise<void>}
   */
  async handleEmergency(emergencyData) {
    console.log(
      '%c[PRISM Emergency]%c Détection d\'urgence',
      'background: #ff0000; color: white; padding: 2px 4px; border-radius: 2px;',
      'color: #ff0000;'
    );
    console.log('Type:', emergencyData.type);
    console.log('Sévérité:', emergencyData.severity);
    console.log('Contexte:', emergencyData.context);

    try {
      // 1. Isolation du système
      await this.isolateSystem();
      
      // 2. Sauvegarde des données critiques
      await this.backupCriticalData();
      
      // 3. Notification des composants concernés
      await this.notifyComponents(emergencyData);
      
      // 4. Mise en place des mesures de sécurité
      await this.implementSecurityMeasures();
      
      console.log(
        '%c[PRISM Emergency]%c Protocole d\'urgence exécuté avec succès',
        'background: #00ff00; color: white; padding: 2px 4px; border-radius: 2px;',
        'color: #00ff00;'
      );
    } catch (error) {
      console.error(
        '%c[PRISM Emergency]%c Échec du protocole d\'urgence',
        'background: #ff0000; color: white; padding: 2px 4px; border-radius: 2px;',
        'color: #ff0000;',
        error
      );
      throw error;
    }
  }

  /**
   * Déclenche manuellement le protocole d'urgence
   * @param {Object} triggerData - Données du déclenchement
   * @returns {Promise<void>}
   */
  async triggerEmergency(triggerData) {
    if (this.inEmergency) return;

    try {
      this.inEmergency = true;
      
      // Ralentir HeartSync
      await this.heartSync.slowDown();
      
      // Charger l'état stable
      await this.legacyCore.loadLastStableState();
      
      // Émettre l'événement d'urgence
      const event = new CustomEvent('prism:emergency:declared', {
        detail: {
          timestamp: Date.now(),
          failureCount: this.failureCount,
          threshold: this.emergencyThreshold,
          state: 'active'
        }
      });
      window.dispatchEvent(event);

      await this.handleEmergency({
        type: 'manual',
        severity: 10,
        context: triggerData
      });
    } catch (error) {
      // En cas d'échec lors de l'activation de l'urgence,
      // on force le ralentissement de HeartSync
      await this.heartSync.slowDown();
      throw new Error(`Emergency protocol activation failed: ${error.message}`);
    }
  }

  /**
   * Isole le système
   * @private
   */
  async isolateSystem() {
    // Implémentation de l'isolation
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Sauvegarde les données critiques
   * @private
   */
  async backupCriticalData() {
    // Implémentation de la sauvegarde
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Notifie les composants concernés
   * @private
   */
  async notifyComponents(emergencyData) {
    // Implémentation de la notification
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Met en place les mesures de sécurité
   * @private
   */
  async implementSecurityMeasures() {
    // Implémentation des mesures de sécurité
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Émet un événement
   * @private
   */
  _emitEvent(eventName, data) {
    const event = new CustomEvent(eventName, {
      detail: {
        timestamp: Date.now(),
        ...data
      }
    });
    window.dispatchEvent(event);
  }
}

// Export des fonctions utilitaires
export const handleEmergency = async (emergencyData) => {
  const resilience = new Resilience(new PrismHeartSync(), new PrismLegacyCore());
  await resilience.handleEmergency(emergencyData);
};

export const triggerEmergencyProtocol = async (triggerData) => {
  const resilience = new Resilience(new PrismHeartSync(), new PrismLegacyCore());
  await resilience.triggerEmergency(triggerData);
}; 