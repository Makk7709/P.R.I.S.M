import { describe, it, expect, beforeEach } from 'vitest';
import ConsensusManager, { DecisionType, AIProvider } from '../../src/core/ConsensusManager.js';

class StubAdapter {
  constructor(decision = true) { this.decision = decision; }
  async evaluate() { return { decision: this.decision, reasoning: 'stub' }; }
}

describe('ConsensusManager with real provider hooks (stubbed)', () => {
  let cm;
  beforeEach(async () => {
    cm = new ConsensusManager({ timeoutMs: 50, useRealProviders: false });
    await new Promise(r => setTimeout(r, 5));
    // inject adapters
    cm.providerAdapters = {
      [AIProvider.GPT4]: new StubAdapter(true),
      [AIProvider.CLAUDE3]: new StubAdapter(true),
      [AIProvider.PERPLEXITY]: new StubAdapter(false)
    };
  });

  it('approves with 2/3 majority using adapters', async () => {
    const proposalId = await cm.propose('h', { riskLevel: 0.3, evidenceQuality: 0.9 }, DecisionType.CRITICAL);
    await new Promise(r => setTimeout(r, 60));
    const status = cm.getProposalStatus(proposalId);
    expect(status.status).toBe('APPROVED');
  });
});

