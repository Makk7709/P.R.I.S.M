import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderAdapter } from '../../src/core/providers/ProviderAdapter.js';

class FlakyAdapter extends ProviderAdapter {
  constructor(opts = {}) {
    super(opts);
    this.failuresBeforeSuccess = opts.failuresBeforeSuccess ?? 2;
    this.calls = 0;
  }
  async _evaluate() {
    this.calls += 1;
    if (this.calls <= this.failuresBeforeSuccess) throw new Error('transient');
    return { decision: true, reasoning: 'ok' };
  }
}

class TimeoutAdapter extends ProviderAdapter {
  async _evaluate() {
    await new Promise(() => {}); // never resolve
  }
}

describe('ProviderAdapter base', () => {
  it('retries with backoff then succeeds', async () => {
    const adapter = new FlakyAdapter({ maxRetries: 3, backoffBaseMs: 1 });
    const res = await adapter.evaluate({});
    expect(res.decision).toBe(true);
    expect(adapter.calls).toBe(3);
  });

  it('returns provider_error after exhausting retries', async () => {
    const adapter = new FlakyAdapter({ maxRetries: 1, backoffBaseMs: 1, failuresBeforeSuccess: 5 });
    const res = await adapter.evaluate({});
    expect(res.decision).toBe(false);
    expect(String(res.reasoning)).toContain('provider_error');
  });

  it('timeouts requests and opens circuit after threshold', async () => {
    const adapter = new TimeoutAdapter({ timeoutMs: 5, maxRetries: 0 });
    const first = await adapter.evaluate({});
    expect(first.decision).toBe(false);
    expect(first.reasoning).toContain('provider_error:timeout');

    // trigger failures to open breaker
    for (let i = 0; i < 5; i++) {
      await adapter.evaluate({});
    }
    const afterOpen = await adapter.evaluate({});
    expect(afterOpen.decision).toBe(false);
    expect(afterOpen.reasoning).toBe('circuit_open');
  });
});

