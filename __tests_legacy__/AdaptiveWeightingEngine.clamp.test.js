/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';

// Force l'utilisation du vrai module 'crypto' de Node.js pour ce test
jest.unmock('crypto');
import crypto from 'node:crypto';

import { AdaptiveWeightingEngine, WeightCriteria } from '../src/core/AdaptiveWeightingEngine.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const SECRET = 'unit-test-secret-key-123';

jest.useFakeTimers();

describe('AdaptiveWeightingEngine - Hardening Features', () => {
  const tempJournalDir = path.join(process.cwd(), '.tmp_journal_tests');

  beforeAll(async () => {
    await fs.mkdir(tempJournalDir, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup tmp directory after tests
    try {
      await fs.rm(tempJournalDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test('clampWeights enforces min/max constraints', () => {
    const engine = new AdaptiveWeightingEngine({
      minWeight: 0.1,
      maxWeight: 0.5,
      secureJournal: { journalPath: tempJournalDir }
    });

    const weights = {
      [WeightCriteria.PERFORMANCE]: -0.2,
      [WeightCriteria.COST]: 0.8,
      [WeightCriteria.LATENCY]: 0,
      [WeightCriteria.AVAILABILITY]: 1,
      [WeightCriteria.SPECIALIZATION]: 0.3,
      [WeightCriteria.ACCURACY]: 0.4
    };

    const clamped = engine.clampWeights(weights);
    expect(clamped).toBe(true);

    for (const value of Object.values(weights)) {
      expect(value).toBeGreaterThanOrEqual(0.1);
      expect(value).toBeLessThanOrEqual(0.5);
    }
  });

  test('normalizeWeights brings sum approximately to 1', () => {
    const engine = new AdaptiveWeightingEngine({ secureJournal: { journalPath: tempJournalDir } });
    const weights = {
      a: 0.2,
      b: 0.2,
      c: 0.2
    };

    engine.normalizeWeights(weights);
    const sum = Object.values(weights).reduce((acc, v) => acc + v, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  test('snapshot write & import round-trips with valid signature', async () => {
    const engine = new AdaptiveWeightingEngine({ secureJournal: { journalPath: tempJournalDir, hmacSecret: SECRET } });
    const snapshot = await engine.saveSnapshot();

    expect(engine.journal.verifySnapshot(snapshot)).toBe(true);

    const newEngine = new AdaptiveWeightingEngine({ secureJournal: { journalPath: tempJournalDir, hmacSecret: SECRET } });
    newEngine.importWeights(snapshot);

    expect(newEngine.exportWeights().adaptiveWeights).toEqual(engine.exportWeights().adaptiveWeights);
  });

  test('automatic snapshot timer triggers saveSnapshot', async () => {
    const engine = new AdaptiveWeightingEngine({
      snapshotIntervalMs: 100,
      secureJournal: { journalPath: tempJournalDir }
    });

    jest.advanceTimersByTime(350);
    await jest.runOnlyPendingTimersAsync();

    expect(engine.metrics.snapshotsWrittenTotal).toBeGreaterThanOrEqual(1);
  });
}); 