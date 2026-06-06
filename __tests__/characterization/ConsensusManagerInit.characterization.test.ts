/**
 * Characterization test for ConsensusManager synchronous initialization
 * (src/core/ConsensusManager.js, S7059).
 *
 * The constructor previously called the (async-declared but await-free) init()
 * as a fire-and-forget async operation. The S7059 fix calls a synchronous
 * _initialize() instead. This locks the observable contract: after `new
 * ConsensusManager()` returns, the instance is already fully initialized
 * (isInitialized === true) and propose() works without any awaited init —
 * exactly as before.
 */
import { describe, it, expect } from 'vitest';
import { ConsensusManager } from '../../src/core/ConsensusManager.js';

describe('ConsensusManager — synchronous init (S7059)', () => {
  it('is initialized synchronously right after construction', () => {
    const cm = new ConsensusManager({ timeoutMs: 100 });
    expect(cm.isInitialized).toBe(true);
    expect(cm.trustContext).not.toBeNull();
  });

  it('init() remains callable and idempotent (backward-compat)', async () => {
    const cm = new ConsensusManager({ timeoutMs: 100 });
    await expect(cm.init()).resolves.toBeUndefined();
    expect(cm.isInitialized).toBe(true);
  });

  it('still initializes when TrustContext is disabled', () => {
    const cm = new ConsensusManager({ timeoutMs: 100, enableTrustContext: false });
    expect(cm.isInitialized).toBe(true);
    expect(cm.trustContext).toBeNull();
  });
});
