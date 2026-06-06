import { PrismHeartSync } from './prismHeartSync.js';
import { PrismValidator } from './prismValidator.js';

class PrismGuardian {
  constructor() {
    this.heartSync = new PrismHeartSync();
    this.validator = new PrismValidator();
    this.events = new PrismEvents();
    this.checkInterval = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async start() {
    this.heartSync.registerPulseHook('guardian', this.checkModules.bind(this));
    this.events.emit('prism:guardian:started', { timestamp: Date.now() });
  }

  async stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.heartSync.unregisterPulseHook('guardian');
    this.events.emit('prism:guardian:stopped', { timestamp: Date.now() });
  }

  async checkModules() {
    try {
      const report = await this.validator.validateAll();
      
      if (!report.isValid) {
        this.events.emit('prism:guardian:module_failure', {
          timestamp: Date.now(),
          failedModules: report.failedModules,
          retryCount: this.retryCount
        });

        if (this.retryCount < this.maxRetries) {
          await this.attemptRecovery(report.failedModules);
        } else {
          this.events.emit('prism:guardian:max_retries_reached', {
            timestamp: Date.now(),
            failedModules: report.failedModules
          });
        }
      } else {
        this.retryCount = 0;
        this.events.emit('prism:guardian:modules_healthy', {
          timestamp: Date.now()
        });
      }
    } catch (error) {
      this.events.emit('prism:guardian:error', {
        timestamp: Date.now(),
        error: error.message
      });
    }
  }

  async attemptRecovery(failedModules) {
    this.retryCount++;
    this.events.emit('prism:guardian:recovery_attempt', {
      timestamp: Date.now(),
      failedModules,
      attempt: this.retryCount
    });

    // Tentative de redémarrage des modules défaillants
    for (const module of failedModules) {
      try {
        await this.restartModule(module);
      } catch (error) {
        this.events.emit('prism:guardian:recovery_failed', {
          timestamp: Date.now(),
          module,
          error: error.message
        });
      }
    }
  }

  async restartModule(moduleName) {
    // Logique de redémarrage spécifique à chaque module
    this.events.emit('prism:guardian:module_restart', {
      timestamp: Date.now(),
      module: moduleName
    });
  }
}

export default PrismGuardian; 