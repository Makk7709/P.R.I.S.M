import kernelBus from 'core/KernelBus.js';
import { PrismHeartSync } from './prismHeartSync.js';

class PrismCleanup {
  constructor() {
    this.events = new PrismEvents();
    this.heartSync = new PrismHeartSync();
    this.intervals = new Set();
    this.timeouts = new Set();
    this.eventListeners = new Map();
  }

  registerInterval(intervalId, moduleName) {
    this.intervals.add({ id: intervalId, module: moduleName });
  }

  registerTimeout(timeoutId, moduleName) {
    this.timeouts.add({ id: timeoutId, module: moduleName });
  }

  registerEventListener(element, eventType, handler, moduleName) {
    const key = `${moduleName}:${eventType}`;
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, []);
    }
    this.eventListeners.get(key).push({ element, handler });
  }

  async cleanup() {
    this.events.emit('prism:cleanup:started', {
      timestamp: Date.now()
    });

    // Nettoyage des intervalles
    for (const { id, module } of this.intervals) {
      clearInterval(id);
      this.events.emit('prism:cleanup:interval_cleared', {
        timestamp: Date.now(),
        module
      });
    }
    this.intervals.clear();

    // Nettoyage des timeouts
    for (const { id, module } of this.timeouts) {
      clearTimeout(id);
      this.events.emit('prism:cleanup:timeout_cleared', {
        timestamp: Date.now(),
        module
      });
    }
    this.timeouts.clear();

    // Désinscription des event listeners
    for (const [key, listeners] of this.eventListeners) {
      const [module, eventType] = key.split(':');
      for (const { element, handler } of listeners) {
        element.removeEventListener(eventType, handler);
        this.events.emit('prism:cleanup:event_listener_removed', {
          timestamp: Date.now(),
          module,
          eventType
        });
      }
    }
    this.eventListeners.clear();

    // Désinscription des hooks HeartSync
    this.heartSync.unregisterAllHooks();
    this.events.emit('prism:cleanup:heart_sync_hooks_cleared', {
      timestamp: Date.now()
    });

    this.events.emit('prism:cleanup:completed', {
      timestamp: Date.now()
    });
  }
}

export default PrismCleanup; 