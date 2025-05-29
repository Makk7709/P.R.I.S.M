/**
 * PRISM Heart Sync - Système de synchronisation interne
 * Gère la pulsation interne et la synchronisation des modules PRISM
 */

class PrismHeartSync {
  constructor(pulseInterval = 10000) {
    this.pulseInterval = pulseInterval;
    this.hooks = new Map();
    this.heartbeat = null;
    this.isRunning = false;
    this.lastPulseTime = 0;
    this.performanceMetrics = {
      lastExecutionTime: 0,
      averageExecutionTime: 0,
      executionCount: 0
    };
  }

  /**
   * Démarre le système de synchronisation
   */
  startHeartSync() {
    if (this.isRunning) {
      this._logWarning('HeartSync est déjà en cours d\'exécution');
      return;
    }

    this.isRunning = true;
    this.lastPulseTime = performance.now();
    this._scheduleNextPulse();
  }

  /**
   * Enregistre un hook de pulsation
   * @param {string} name - Nom unique du hook
   * @param {Function} fn - Fonction à exécuter à chaque pulsation
   */
  registerPulseHook(name, fn) {
    if (typeof name !== 'string' || !name.trim()) {
      this._logError('Le nom du hook doit être une chaîne non vide');
      return;
    }

    if (typeof fn !== 'function') {
      this._logError(`Le hook "${name}" doit être une fonction`);
      return;
    }

    if (this.hooks.has(name)) {
      this._logWarning(`Le hook "${name}" est déjà enregistré`);
      return;
    }

    this.hooks.set(name, fn);
  }

  /**
   * Désenregistre un hook de pulsation
   * @param {string} name - Nom du hook à désenregistrer
   */
  unregisterPulseHook(name) {
    if (!this.hooks.has(name)) {
      this._logWarning(`Le hook "${name}" n'existe pas`);
      return;
    }

    this.hooks.delete(name);
  }

  /**
   * Planifie la prochaine pulsation
   * @private
   */
  _scheduleNextPulse() {
    if (!this.isRunning) return;

    const now = performance.now();
    const elapsed = now - this.lastPulseTime;
    const nextInterval = Math.max(0, this.pulseInterval - elapsed);

    this.heartbeat = setTimeout(() => {
      this._executePulse();
    }, nextInterval);
  }

  /**
   * Exécute une pulsation
   * @private
   */
  _executePulse() {
    const startTime = performance.now();
    this.lastPulseTime = startTime;

    // Exécution des hooks
    for (const [name, hook] of this.hooks) {
      try {
        hook();
      } catch (error) {
        this._logError(`Erreur dans le hook "${name}": ${error.message}`);
      }
    }

    // Mise à jour des métriques de performance
    const executionTime = performance.now() - startTime;
    this._updatePerformanceMetrics(executionTime);

    // Planification de la prochaine pulsation
    this._scheduleNextPulse();
  }

  /**
   * Met à jour les métriques de performance
   * @param {number} executionTime - Temps d'exécution de la pulsation
   * @private
   */
  _updatePerformanceMetrics(executionTime) {
    const { averageExecutionTime, executionCount } = this.performanceMetrics;
    
    this.performanceMetrics.lastExecutionTime = executionTime;
    this.performanceMetrics.executionCount++;
    this.performanceMetrics.averageExecutionTime = 
      (averageExecutionTime * (executionCount - 1) + executionTime) / executionCount;

    // Ajustement automatique de l'intervalle si nécessaire
    if (executionTime > this.pulseInterval * 0.8) {
      this.pulseInterval = Math.min(this.pulseInterval * 1.5, 30000);
    } else if (executionTime < this.pulseInterval * 0.2 && this.pulseInterval > 5000) {
      this.pulseInterval = Math.max(this.pulseInterval * 0.8, 5000);
    }
  }

  /**
   * Log un avertissement stylisé
   * @param {string} message - Message d'avertissement
   * @private
   */
  _logWarning(message) {
    console.warn(`%c[PRISM HeartSync] ⚠️ ${message}`, 'color: #FFA500');
  }

  /**
   * Log une erreur stylisée
   * @param {string} message - Message d'erreur
   * @private
   */
  _logError(message) {
    console.error(`%c[PRISM HeartSync] ❌ ${message}`, 'color: #FF0000');
  }
}

export default PrismHeartSync; 