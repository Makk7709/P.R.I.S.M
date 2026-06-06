/**
 * Characterization tests for HybridOrchestrator.process()
 * (src/orchestrator/HybridOrchestrator.js, S3776).
 *
 * The orchestration tests under tests/orchestrator/** are excluded from the
 * core gate, so process() is not otherwise covered. These golden-master tests
 * mock the collaboration seams (classifier, trustContext, _processWithRouter,
 * _processWithConsensus) to isolate and lock in the decision logic of process()
 * — mode determination, the TrustContext gate and response shaping — before the
 * S3776 refactor. Volatile fields (timestamp, responseTime and the
 * responseTime-bearing processDescription) are stripped for stable snapshots.
 */
import { describe, it, expect } from 'vitest';
import { HybridOrchestrator, OrchestrationMode } from '../../src/orchestrator/HybridOrchestrator.js';

function stripVolatile(resp: any): any {
  if (resp && typeof resp === 'object') {
    delete resp.timestamp;
    delete resp.responseTime;
    if (resp.metadata && typeof resp.metadata === 'object') {
      delete resp.metadata.processDescription;
    }
  }
  return resp;
}

function makeOrchestrator(opts: {
  classification: any;
  approval?: any;
  approvalThrows?: Error;
}) {
  const trustContext = {
    validateCriticalDecision: async () => {
      if (opts.approvalThrows) {
        throw opts.approvalThrows;
      }
      return opts.approval ?? { approved: true };
    },
  };
  const orch: any = new HybridOrchestrator({ trustContext });
  orch.classifier = { classify: () => opts.classification };
  orch._processWithRouter = async () => ({ content: 'ROUTED_CONTENT', model: 'openai', success: true });
  orch._processWithConsensus = async () => ({
    content: 'CONSENSUS_CONTENT',
    model: 'consensus',
    success: true,
    consensusStatus: 'APPROVED',
    votes: [{ provider: 'openai', vote: 'APPROVE', reasoning: 'ok', timestamp: 0 }],
    participatingModels: ['openai', 'anthropic'],
  });
  return orch;
}

const NORMAL = { isCritical: false, score: 0.2, level: 'LOW', type: 'general' };
const CRITICAL = { isCritical: true, score: 0.95, level: 'CRITICAL', type: 'finance' };
const HIGH = { isCritical: false, score: 0.85, level: 'HIGH', type: 'finance' };

describe('HybridOrchestrator.process — characterization', () => {
  it('routed (normal, no flags)', async () => {
    const orch = makeOrchestrator({ classification: NORMAL });
    const res = stripVolatile(await orch.process('hello', 'general', {}));
    expect(res).toMatchSnapshot();
  });

  it('forceConsensus flag', async () => {
    const orch = makeOrchestrator({ classification: NORMAL });
    const res = stripVolatile(await orch.process('hello', 'general', { forceConsensus: true }));
    expect(res).toMatchSnapshot();
  });

  it('forceRouted flag (even when critical)', async () => {
    const orch = makeOrchestrator({ classification: CRITICAL });
    const res = stripVolatile(await orch.process('do critical', 'general', { forceRouted: true }));
    expect(res).toMatchSnapshot();
  });

  it('auto-detected critical classification', async () => {
    const orch = makeOrchestrator({ classification: CRITICAL });
    const res = stripVolatile(await orch.process('rm -rf prod', 'general', {}));
    expect(res).toMatchSnapshot();
  });

  it('taskType critical (high score -> HIGH trust level)', async () => {
    const orch = makeOrchestrator({ classification: HIGH });
    const res = stripVolatile(await orch.process('payment', 'critical', {}));
    expect(res).toMatchSnapshot();
  });

  it('trust gate rejects the request', async () => {
    const orch = makeOrchestrator({
      classification: CRITICAL,
      approval: { approved: false, reason: 'needs human' },
    });
    const res = stripVolatile(await orch.process('danger', 'general', {}));
    expect(res).toMatchSnapshot();
  });

  it('trust gate generic error -> security validation failed', async () => {
    const orch = makeOrchestrator({
      classification: CRITICAL,
      approvalThrows: new Error('service unavailable'),
    });
    const res = stripVolatile(await orch.process('danger', 'general', {}));
    expect(res).toMatchSnapshot();
  });

  it('metrics reflect routed vs consensus counts', async () => {
    const orch = makeOrchestrator({ classification: NORMAL });
    await orch.process('a', 'general', {});
    await orch.process('b', 'general', { forceConsensus: true });
    const m = orch.getMetrics();
    expect({
      totalRequests: m.totalRequests,
      routedRequests: m.routedRequests,
      consensusRequests: m.consensusRequests,
      failures: m.failures,
    }).toMatchSnapshot();
    expect(OrchestrationMode.ROUTED).toBe('ROUTED');
  });
});
