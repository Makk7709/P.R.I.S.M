/**
 * CONSENSUS MANAGER - TESTS INVARIANTS GELÉS
 * 
 * Ces tests sont IMMUTABLES et ne doivent JAMAIS être modifiés.
 * Ils définissent les invariants critiques du système de consensus.
 * 
 * INVARIANT RULES:
 * - Cas 2-0-0 (deux APPROVE, zéro REJECT, zéro ABSTAIN/timeout) → majorité → verdict valide (approve)
 * - Cas 1-1-1 (APPROVE/REJECT/ABSTAIN) → NO_CONSENSUS (2/3 non atteint)
 * - ≥2 timeouts OU latence totale > 900ms → NO_CONSENSUS
 * - Invariance à l'ordre: permutation des votes → même verdict & mêmes métriques
 * - Abort effectif si timeout par agent (>250-300ms/agent) → exclu des votes valides
 * 
 * FREEZE MANIFEST: tests/consensus/.freeze-manifest.json
 * GUARD SCRIPT: scripts/consensus-invariant-guard.mjs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusManager } from '../../src/consensus/ConsensusManager.ts';

describe('ConsensusManager - INVARIANTS GELÉS', () => {
  let consensusManager: ConsensusManager;

  beforeEach(() => {
    consensusManager = new ConsensusManager();
  });

  /**
   * INVARIANT 1: Cas 2-0-0 (majorité stricte 2/3)
   * Deux APPROVE, zéro REJECT, zéro ABSTAIN/timeout → verdict valide (approve)
   * Quorum 2/3 strict (abstain/timeout exclus des valides)
   */
  it('INVARIANT-1: Cas 2-0-0 → APPROVE avec quorum 2/3 strict', () => {
    const votes = [
      { verdict: 'approve' as const, confidence: 0.9, provider: 'provider1', latencyMs: 100 },
      { verdict: 'approve' as const, confidence: 0.8, provider: 'provider2', latencyMs: 120 }
    ];

    const result = consensusManager.processConsensus(votes);

    expect(result.verdict).toBe('approve');
    expect(result.validVotesCount).toBe(2);
    expect(result.totalVotesCount).toBe(2);
    expect(result.quorumRatio).toBe(1.0); // 2/2 = 1.0 (strictement > 2/3)
    expect(result.decisionLatencyMs).toBeLessThanOrEqual(900);
    expect(result.noConsensus).toBe(false);
  });

  /**
   * INVARIANT 2: Cas 1-1-1 (pas de majorité 2/3)
   * APPROVE/REJECT/ABSTAIN → NO_CONSENSUS (2/3 non atteint)
   */
  it('INVARIANT-2: Cas 1-1-1 → NO_CONSENSUS (2/3 non atteint)', () => {
    const votes = [
      { verdict: 'approve' as const, confidence: 0.9, provider: 'provider1', latencyMs: 100 },
      { verdict: 'reject' as const, confidence: 0.8, provider: 'provider2', latencyMs: 120 },
      { verdict: 'abstain' as const, confidence: 0.5, provider: 'provider3', latencyMs: 110 }
    ];

    const result = consensusManager.processConsensus(votes);

    expect(result.verdict).toBe('NO_CONSENSUS');
    expect(result.validVotesCount).toBe(2); // abstain exclu
    expect(result.totalVotesCount).toBe(3);
    expect(result.quorumRatio).toBe(2/3); // 2/3 exactement, pas strictement > 2/3
    expect(result.noConsensus).toBe(true);
  });

  /**
   * INVARIANT 3: Timeouts et latence globale
   * ≥2 timeouts OU latence totale > 900ms → NO_CONSENSUS
   */
  it('INVARIANT-3: ≥2 timeouts OU latence > 900ms → NO_CONSENSUS', () => {
    // Test avec 2 timeouts
    const votesWithTimeouts = [
      { verdict: 'approve' as const, confidence: 0.9, provider: 'provider1', latencyMs: 300 }, // timeout
      { verdict: 'reject' as const, confidence: 0.8, provider: 'provider2', latencyMs: 320 }, // timeout
      { verdict: 'approve' as const, confidence: 0.7, provider: 'provider3', latencyMs: 100 }
    ];

    const result1 = consensusManager.processConsensus(votesWithTimeouts);
    expect(result1.verdict).toBe('NO_CONSENSUS');
    expect(result1.noConsensus).toBe(true);
    expect(result1.providerTimeoutTotal).toBe(2);

    // Test avec latence totale > 900ms
    const votesWithHighLatency = [
      { verdict: 'approve' as const, confidence: 0.9, provider: 'provider1', latencyMs: 400 },
      { verdict: 'approve' as const, confidence: 0.8, provider: 'provider2', latencyMs: 500 }
    ];

    const result2 = consensusManager.processConsensus(votesWithHighLatency);
    expect(result2.verdict).toBe('NO_CONSENSUS');
    expect(result2.noConsensus).toBe(true);
    expect(result2.decisionLatencyMs).toBeGreaterThan(900);
  });

  /**
   * INVARIANT 4: Invariance à l'ordre
   * Permutation des votes → même verdict & mêmes métriques
   */
  it('INVARIANT-4: Invariance à l\'ordre des votes', () => {
    const votes1 = [
      { verdict: 'approve' as const, confidence: 0.9, provider: 'provider1', latencyMs: 100 },
      { verdict: 'reject' as const, confidence: 0.8, provider: 'provider2', latencyMs: 120 },
      { verdict: 'approve' as const, confidence: 0.7, provider: 'provider3', latencyMs: 110 }
    ];

    const votes2 = [
      { verdict: 'reject' as const, confidence: 0.8, provider: 'provider2', latencyMs: 120 },
      { verdict: 'approve' as const, confidence: 0.7, provider: 'provider3', latencyMs: 110 },
      { verdict: 'approve' as const, confidence: 0.9, provider: 'provider1', latencyMs: 100 }
    ];

    const result1 = consensusManager.processConsensus(votes1);
    const result2 = consensusManager.processConsensus(votes2);

    // Même verdict
    expect(result1.verdict).toBe(result2.verdict);
    
    // Mêmes métriques
    expect(result1.validVotesCount).toBe(result2.validVotesCount);
    expect(result1.totalVotesCount).toBe(result2.totalVotesCount);
    expect(result1.quorumRatio).toBe(result2.quorumRatio);
    expect(result1.noConsensus).toBe(result2.noConsensus);
    expect(result1.providerTimeoutTotal).toBe(result2.providerTimeoutTotal);
  });

  /**
   * INVARIANT 5: Abort effectif par timeout agent
   * Si timeout par agent (>250-300ms/agent) → l'agent dépasse le budget → exclu des votes valides
   * Métrique provider_timeout_total incrémentée
   */
  it('INVARIANT-5: Abort effectif si timeout par agent > 250-300ms', () => {
    const votes = [
      { verdict: 'approve' as const, confidence: 0.9, provider: 'provider1', latencyMs: 100 },
      { verdict: 'approve' as const, confidence: 0.8, provider: 'provider2', latencyMs: 280 }, // timeout
      { verdict: 'reject' as const, confidence: 0.7, provider: 'provider3', latencyMs: 320 }  // timeout
    ];

    const result = consensusManager.processConsensus(votes);

    // Les agents en timeout sont exclus des votes valides
    expect(result.validVotesCount).toBe(1); // seul provider1 (100ms < 250ms)
    expect(result.providerTimeoutTotal).toBe(2); // provider2 et provider3 en timeout
    expect(result.verdict).toBe('NO_CONSENSUS'); // pas de majorité avec 1 seul vote valide
    expect(result.noConsensus).toBe(true);
  });
});
