/**
 * @fileoverview Module de purge automatique des logs PRISM
 * @module utils/prismPurgeScheduler
 */

export class PrismPurgeScheduler {
  constructor() {
    this.strategies = new Map();
  }

  activateStrategy(name, config) {
    this.strategies.set(name, {
      ...config,
      lastRun: Date.now()
    });
  }

  deactivateStrategy(name) {
    this.strategies.delete(name);
  }

  runStrategies() {
    const now = Date.now();
    for (const [name, strategy] of this.strategies) {
      if (now - strategy.lastRun >= strategy.interval) {
        strategy.callback();
        strategy.lastRun = now;
      }
    }
  }
} 