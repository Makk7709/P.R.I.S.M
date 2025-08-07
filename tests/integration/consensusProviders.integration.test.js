import { describe, it, expect, beforeAll } from 'vitest';

// Tests conditionnels: ne s'exécutent que si des clés existent
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;

let OpenAIAdapter, AnthropicAdapter, PerplexityAdapter;

describe('Real Providers Adapters (conditional)', () => {
  beforeAll(async () => {
    // Import dynamiques pour éviter erreurs si dépendances non requises
    const base = await import('../../src/core/providers/ProviderAdapter.js');
    try { OpenAIAdapter = (await import('../../src/core/providers/OpenAIAdapter.js')).default; } catch {}
    try { AnthropicAdapter = (await import('../../src/core/providers/AnthropicAdapter.js')).default; } catch {}
    try { PerplexityAdapter = (await import('../../src/core/providers/PerplexityAdapter.js')).default; } catch {}
  });

  it.runIf(hasOpenAI)('OpenAIAdapter returns boolean decision under timeout', async () => {
    const adapter = new OpenAIAdapter({ timeoutMs: 1500 });
    const start = Date.now();
    const result = await adapter.evaluate({
      type: 'critical',
      payload: { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false }
    });
    const duration = Date.now() - start;
    expect(typeof result.decision).toBe('boolean');
    expect(result.reasoning).toBeTypeOf('string');
    expect(duration).toBeLessThanOrEqual(2000);
  });

  it.runIf(hasAnthropic)('AnthropicAdapter returns boolean decision under timeout', async () => {
    const adapter = new AnthropicAdapter({ timeoutMs: 1500 });
    const start = Date.now();
    const result = await adapter.evaluate({
      type: 'critical',
      payload: { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false }
    });
    const duration = Date.now() - start;
    expect(typeof result.decision).toBe('boolean');
    expect(result.reasoning).toBeTypeOf('string');
    expect(duration).toBeLessThanOrEqual(2500);
  });

  it.runIf(hasPerplexity)('PerplexityAdapter returns boolean decision under timeout', async () => {
    const adapter = new PerplexityAdapter({ timeoutMs: 1500 });
    const start = Date.now();
    const result = await adapter.evaluate({
      type: 'critical',
      payload: { riskLevel: 0.3, evidenceQuality: 0.8, ethicalConcerns: false }
    });
    const duration = Date.now() - start;
    expect(typeof result.decision).toBe('boolean');
    expect(result.reasoning).toBeTypeOf('string');
    expect(duration).toBeLessThanOrEqual(2500);
  });
});

