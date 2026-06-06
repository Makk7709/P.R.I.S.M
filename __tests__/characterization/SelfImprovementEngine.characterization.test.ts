/**
 * Characterization tests for SelfImprovementEngine.analyzeBatch + lazy/sync init
 * (evolution/selfImprovementEngine.js, S3776 + S7059).
 *
 * The engine was previously untestable in the gate: its constructor throws
 * unless SECURITY_MODE.CURRENT (frozen at import to process.env.PRISM_MODE ||
 * 'PROD') is in ALLOWED_MODES (['TEST']). The S3776 work made the mode
 * injectable via `config.securityMode` (default = SECURITY_MODE.CURRENT, i.e.
 * iso-behavior in production), which unblocks deterministic testing of
 * analyzeBatch's adjustment-approval logic.
 *
 * Collaborator/decision methods are stubbed on the instance so analyzeBatch is
 * driven deterministically; the non-deterministic batchAnalysis.timestamp is
 * stripped before snapshotting.
 */
import { describe, it, expect, vi } from 'vitest';
import { SelfImprovementEngine } from '../../evolution/selfImprovementEngine.js';

function makeEngine() {
  const e: any = new SelfImprovementEngine({ securityMode: 'TEST' });
  // Deterministic batch metrics
  e.calculateAverageResponseTime = () => 1234;
  e.calculateErrorRate = () => 0.05;
  e.calculateSuccessRate = () => 0.95;
  e.analyzeModelDistribution = () => ({ 'gpt-4': 3, claude: 1 });
  // Neutralize side-effects
  e.applyAdjustments = vi.fn().mockResolvedValue(undefined);
  e.logToPrismVitals = vi.fn();
  e.logBatchAnalysis = vi.fn();
  return e;
}

function stable(result: any) {
  if (result?.batchAnalysis?.timestamp) {
    result.batchAnalysis = { ...result.batchAnalysis, timestamp: '<ts>' };
  }
  return result;
}

describe('SelfImprovementEngine — injectable security mode (S7059 testability)', () => {
  it('constructs synchronously in injected TEST mode and is fully initialized', () => {
    const e: any = makeEngine();
    expect(e.securityMode).toBe('TEST');
    expect(e.consensusManager).not.toBeNull();
  });

  it('analyzeBatch returns null when the (injected) mode is unauthorized', async () => {
    const e: any = makeEngine();
    e.securityMode = 'PROD'; // simulate disallowed mode at call time
    expect(await e.analyzeBatch()).toBeNull();
  });
});

describe('SelfImprovementEngine.analyzeBatch — characterization', () => {
  it('blocked by authorization gate', async () => {
    const e: any = makeEngine();
    e.proposeAdjustments = vi.fn().mockResolvedValue([{ type: 'x', area: 'quality' }]);
    e.checkImprovementAuthorization = () => ({ allowed: false, reasons: ['cooldown', 'limit'] });
    expect(stable(await e.analyzeBatch())).toMatchSnapshot();
  });

  it('all non-critical adjustments auto-approved', async () => {
    const e: any = makeEngine();
    const adjustments = [
      { type: 'a', area: 'quality' },
      { type: 'b', area: 'cost' },
    ];
    e.proposeAdjustments = vi.fn().mockResolvedValue(adjustments);
    e.checkImprovementAuthorization = () => ({ allowed: true });
    e.isAdjustmentCritical = () => false;
    expect(stable(await e.analyzeBatch())).toMatchSnapshot();
    expect(e.applyAdjustments).toHaveBeenCalledTimes(1);
  });

  it('critical adjustments: consensus-rejected, approved+no-token, approved+human-denied', async () => {
    const e: any = makeEngine();
    const adjustments = [
      { type: 'rejected', area: 'model_selection' },
      { type: 'approved_no_token', area: 'model_selection' },
      { type: 'human_denied', area: 'model_selection' },
      { type: 'noncritical', area: 'quality' },
    ];
    e.proposeAdjustments = vi.fn().mockResolvedValue(adjustments);
    e.checkImprovementAuthorization = () => ({ allowed: true });
    e.isAdjustmentCritical = (adj: any) => adj.area === 'model_selection';
    e.requestConsensus = vi.fn(async (adj: any) => adj.type !== 'rejected');
    e.requestHumanApproval = vi.fn(async (adj: any) =>
      adj.type === 'human_denied' ? 'tok' : null
    );
    e.checkApproval = () => ({ approved: false });
    expect(stable(await e.analyzeBatch())).toMatchSnapshot();
  });

  it('critical adjustment approved with valid human token', async () => {
    const e: any = makeEngine();
    const adjustments = [{ type: 'crit_ok', area: 'error_handling' }];
    e.proposeAdjustments = vi.fn().mockResolvedValue(adjustments);
    e.checkImprovementAuthorization = () => ({ allowed: true });
    e.isAdjustmentCritical = () => true;
    e.requestConsensus = vi.fn().mockResolvedValue(true);
    e.requestHumanApproval = vi.fn().mockResolvedValue('valid-token');
    e.checkApproval = () => ({ approved: true });
    expect(stable(await e.analyzeBatch())).toMatchSnapshot();
  });
});
