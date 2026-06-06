/**
 * Characterization tests for TaskTypeProcessor pure helpers + lazy memory init
 * (src/core/TaskTypeProcessor.js, S3776 + S7059).
 *
 * process() is a heavily-coupled async orchestrator (12 collaborators + a static
 * handleUserInstruction import + the Consensus event loop). Rather than mocking
 * the whole graph, the S3776 refactor extracts the two largest *pure* fragments
 * — the user-context prompt builder and the response-metadata assembler — whose
 * outputs are snapshotted here. Because process() now simply calls these helpers
 * in place of the previous inline code, locking the helpers locks that behavior.
 *
 * The S7059 fix (lazy MemoryRetrievalEngine init via _ensureMemoryInitialized)
 * is exercised against an injected memoryEngine mock.
 *
 * The constructor is bypassed via Object.create (it instantiates the full
 * collaborator graph, which is unnecessary for these unit-pure checks).
 */
import { describe, it, expect, vi } from 'vitest';
import { TaskTypeProcessor } from '../../src/core/TaskTypeProcessor.js';

const proc: any = Object.create(TaskTypeProcessor.prototype);

describe('TaskTypeProcessor._buildUserContextInfo — characterization', () => {
  it('full userInfo (prenom + role + strategie + context) + enriched memory', () => {
    const userInfo = {
      prenom: 'Amine',
      role: ['CTO', 'Architecte'],
      strategie: ['Lever 5M', 'Recruter'],
      context: ['Startup B2B', 'Phase seed'],
    };
    const memoryContext = { enrichedContext: 'MEMOIRE: interactions passées' };
    expect(proc._buildUserContextInfo(userInfo, memoryContext)).toMatchSnapshot();
  });

  it('partial userInfo (prenom only), no enriched memory', () => {
    expect(proc._buildUserContextInfo({ prenom: 'Sam' }, {})).toMatchSnapshot();
  });

  it('empty userInfo -> default persistent-memory instructions', () => {
    expect(proc._buildUserContextInfo({}, {})).toMatchSnapshot();
  });

  it('empty userInfo but enriched memory present', () => {
    expect(proc._buildUserContextInfo({}, { enrichedContext: 'CTX' })).toMatchSnapshot();
  });

  it('userInfo with empty arrays (role/strategie/context) -> no list sections', () => {
    expect(
      proc._buildUserContextInfo({ prenom: 'X', role: [], strategie: [], context: [] }, {})
    ).toMatchSnapshot();
  });
});

describe('TaskTypeProcessor._buildResponseMetadata — characterization', () => {
  const base = {
    response: { content: 'hi', metadata: { model: 'gpt-x', consensusUsed: true } },
    needsResearch: true,
    researchData: { sources: ['a', 'b'] },
    criticality: { isCritical: true },
    taskType: 'critical',
    ethicalCheck: { score: 0.9, status: 'ok' },
    reflection: { quality: 0.8, improvements: ['be concise'] },
    memoryContext: { enrichedContext: 'ctx', proactiveSuggestions: [1, 2] },
  };

  it('solo persona + active project', () => {
    expect(
      proc._buildResponseMetadata({
        ...base,
        collaboration: null,
        persona: { name: 'Strategist' },
        activeProject: { id: 'p1', name: 'Alpha', progress: 42 },
      })
    ).toMatchSnapshot();
  });

  it('multi-domain collaboration + no project + no research', () => {
    expect(
      proc._buildResponseMetadata({
        ...base,
        needsResearch: false,
        researchData: null,
        criticality: { isCritical: false },
        taskType: 'general',
        memoryContext: {},
        collaboration: { personas: [{ name: 'Finance' }, { name: 'Legal' }] },
        persona: { name: 'unused' },
        activeProject: null,
      })
    ).toMatchSnapshot();
  });
});

describe('TaskTypeProcessor._ensureMemoryInitialized — S7059 lazy init', () => {
  it('initializes memoryEngine exactly once across concurrent calls', async () => {
    const p: any = Object.create(TaskTypeProcessor.prototype);
    const initialize = vi.fn().mockResolvedValue(undefined);
    p.memoryEngine = { initialize };
    p._memoryInitPromise = null;

    await Promise.all([p._ensureMemoryInitialized(), p._ensureMemoryInitialized()]);
    await p._ensureMemoryInitialized();

    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it('swallows init errors (non-blocking) like the previous constructor catch', async () => {
    const p: any = Object.create(TaskTypeProcessor.prototype);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    p.memoryEngine = { initialize: vi.fn().mockRejectedValue(new Error('db down')) };
    p._memoryInitPromise = null;

    await expect(p._ensureMemoryInitialized()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      '[TaskTypeProcessor] MemoryEngine init error:',
      'db down'
    );
    warn.mockRestore();
  });
});
