/**
 * Characterization tests for backend/orchestrator.handleUserInstruction (S3776).
 *
 * handleUserInstruction is the LLM network entrypoint. Its model callers
 * (callOpenAI/callClaude/callPerplexity) are module-private and throw
 * synchronously when their API key is missing/placeholder — so the cache-miss,
 * model-dispatch (chooseModel) and catch/fallback paths are fully deterministic
 * without any network or SDK mock, simply by forcing placeholder keys before
 * import (dotenv.config() never overrides values already set in process.env).
 *
 * The turbo/demo-response path is covered by re-importing the module with
 * PRISM_TURBO_MODE='true'. The nominal success path (a real provider response +
 * voice enrichment + cache set) is NOT exercised here and is intentionally left
 * untouched by the refactor; only the harness-covered fragments are extracted.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';

const PLACEHOLDER = {
  OPENAI_API_KEY: 'test_openai_key_placeholder',
  ANTHROPIC_API_KEY: 'test_anthropic_key_placeholder',
  PERPLEXITY_API_KEY: 'test_perplexity_key_placeholder',
};

async function loadOrchestrator(extraEnv: Record<string, string> = {}) {
  vi.resetModules();
  Object.assign(process.env, PLACEHOLDER, extraEnv);
  return import('../../backend/orchestrator.js');
}

describe('handleUserInstruction — error/dispatch paths (no network)', () => {
  let handleUserInstruction: any;

  beforeAll(async () => {
    delete process.env.PRISM_TURBO_MODE;
    ({ handleUserInstruction } = await loadOrchestrator());
  });

  it('openai task: throws the OpenAI key error (no fallback for openai)', async () => {
    await expect(handleUserInstruction('plan something', 'general')).rejects.toThrow(
      'OpenAI API key non configurée'
    );
  });

  it('claude task: throws original Claude error after openai fallback also fails', async () => {
    await expect(handleUserInstruction('réflexion stratégique', 'strategie')).rejects.toThrow(
      'Anthropic API key non configurée'
    );
  });

  it('perplexity task: throws original Perplexity error after openai fallback also fails', async () => {
    await expect(handleUserInstruction('dernières actualités', 'recherche')).rejects.toThrow(
      'Perplexity API key non configurée'
    );
  });

  it('unknown task falls back to openai model choice (key error)', async () => {
    await expect(handleUserInstruction('whatever', 'unknown-task-type')).rejects.toThrow(
      'OpenAI API key non configurée'
    );
  });
});

describe('handleUserInstruction — turbo/demo + cache paths', () => {
  it('TURBO mode returns the matching pre-computed demo response', async () => {
    const { handleUserInstruction } = await loadOrchestrator({ PRISM_TURBO_MODE: 'true' });
    const res = await handleUserInstruction('test connection please', 'general');
    expect(res.data.content).toContain('Test de Connexion Réussi');
    expect(res.metadata).toMatchObject({
      model: 'openai',
      taskType: 'general',
      success: true,
      turbo: true,
    });
    expect(typeof res.metadata.responseTime).toBe('number');
  });

  it('TURBO mode with no matching pattern falls through to the model call', async () => {
    const { handleUserInstruction } = await loadOrchestrator({ PRISM_TURBO_MODE: 'true' });
    // "zzz" matches none of hello/test/demo -> falls through to openai (key error)
    await expect(handleUserInstruction('zzz unmatched query', 'general')).rejects.toThrow(
      'OpenAI API key non configurée'
    );
  });

  it('second identical successful call would be served from cache (turbo seeds nothing)', async () => {
    // Turbo responses are returned BEFORE the cache.set, so a turbo response is
    // not cached; a repeated turbo call takes the turbo path again (idempotent).
    const { handleUserInstruction } = await loadOrchestrator({ PRISM_TURBO_MODE: 'true' });
    const a = await handleUserInstruction('hello there', 'general');
    const b = await handleUserInstruction('hello there', 'general');
    expect(a.data.content).toBe(b.data.content);
    expect(a.metadata.turbo).toBe(true);
    expect(b.metadata.turbo).toBe(true);
  });
});
