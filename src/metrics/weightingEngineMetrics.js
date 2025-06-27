import { Counter, Registry } from 'prom-client';

const registry = new Registry();

// Counters for AdaptiveWeightingEngine
const totalAdaptationsCounter = new Counter({
  name: 'adaptive_weight_engine_adaptations_total',
  help: 'Total number of weight adaptations',
  registers: [registry]
});

const totalClampsCounter = new Counter({
  name: 'adaptive_weight_engine_clamps_total',
  help: 'Total number of clamp operations executed',
  registers: [registry]
});

const snapshotsWrittenCounter = new Counter({
  name: 'adaptive_weight_engine_snapshots_written_total',
  help: 'Total number of snapshots written to the secure journal',
  registers: [registry]
});

/**
 * Connect counters to the provided AdaptiveWeightingEngine instance events.
 * @param {AdaptiveWeightingEngine} engine
 */
export function registerMetrics(engine) {
  if (!engine || typeof engine.on !== 'function') return;

  engine.on('weightsAdapted', () => {
    totalAdaptationsCounter.inc();
  });

  engine.on('weightsClamped', () => {
    totalClampsCounter.inc();
  });

  engine.on('snapshotWritten', () => {
    snapshotsWrittenCounter.inc();
  });
}

export { registry as weightingEngineRegistry }; 