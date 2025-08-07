#!/usr/bin/env node
import ConsensusManager, { DecisionType } from './src/core/ConsensusManager.js';

async function run() {
  console.log('🎬 PRISM Scripted Consensus Demo');
  const cm = new ConsensusManager({
    timeoutMs: 1000,
    useRealProviders: process.env.PRISM_USE_REAL_PROVIDERS === 'true' || process.env.NODE_ENV === 'production' || process.env.PRISM_MODE === 'PROD'
  });
  await new Promise(r => setTimeout(r, 50));

  cm.on('proposalCreated', (e) => console.log('📝 proposalCreated', e.proposalId));
  cm.on('voteSubmitted', (e) => console.log('🗳️ voteSubmitted', e.provider, e.vote));
  cm.on('consensusReached', (e) => console.log('🎯 consensusReached', e.status, `in ${e.decisionTime}ms`));
  cm.on('consensusTimeout', (e) => console.log('⏰ consensusTimeout', e.proposalId));

  // APPROVE case (2/3+ expected): low risk, good evidence, no ethical concerns
  const approvePayload = { riskLevel: 0.3, evidenceQuality: 0.85, ethicalConcerns: false, note: 'approve-demo' };
  const approveId = await cm.propose('approve-demo-001', approvePayload, DecisionType.CRITICAL);
  console.log('🚀 Submitted APPROVE case:', approveId);
  await new Promise(r => setTimeout(r, 1200));
  console.log('📊 APPROVE status:', cm.getProposalStatus(approveId));

  // REJECT case (2/3+ expected): high risk, ethical concerns, weak evidence, security context
  const rejectPayload = { riskLevel: 0.85, evidenceQuality: 0.3, ethicalConcerns: true, note: 'reject-demo' };
  const rejectId = await cm.propose('reject-demo-001', rejectPayload, DecisionType.SECURITY);
  console.log('🚀 Submitted REJECT case:', rejectId);
  await new Promise(r => setTimeout(r, 1200));
  console.log('📊 REJECT status:', cm.getProposalStatus(rejectId));

  cm.cleanup();
}

run().catch(err => {
  console.error('💥 Demo failed:', err);
  process.exit(1);
});

