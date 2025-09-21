/**
 * CONSENSUS MANAGER - MICRO-TESTS
 * 
 * Tests complémentaires pour couvrir les branches manquantes.
 * Ces tests ne sont PAS des invariants et peuvent être modifiés.
 * 
 * Objectif: atteindre Branches ≥85%, Mutation ≥60%, L/F/S >0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusManager, Vote } from '../../src/consensus/ConsensusManager.ts';

describe('ConsensusManager - MICRO-TESTS', () => {
  let consensusManager: ConsensusManager;

  beforeEach(() => {
    consensusManager = new ConsensusManager();
  });

  describe('Cas limites et branches manquantes', () => {
    
    /**
     * Test cas limite: 0 votes valides → NO_CONSENSUS
     */
    it('Cas limite: 0 votes valides → NO_CONSENSUS', () => {
      const votes: Vote[] = [
        { verdict: 'abstain', confidence: 0.5, provider: 'provider1', latencyMs: 100 },
        { verdict: 'abstain', confidence: 0.5, provider: 'provider2', latencyMs: 120 }
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('NO_CONSENSUS');
      expect(result.validVotesCount).toBe(0);
      expect(result.totalVotesCount).toBe(2);
      expect(result.quorumRatio).toBe(0);
      expect(result.noConsensus).toBe(true);
    });

    /**
     * Test cas limite: votes vides → NO_CONSENSUS
     */
    it('Cas limite: votes vides → NO_CONSENSUS', () => {
      const votes: Vote[] = [];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('NO_CONSENSUS');
      expect(result.validVotesCount).toBe(0);
      expect(result.totalVotesCount).toBe(0);
      expect(result.quorumRatio).toBe(0);
      expect(result.noConsensus).toBe(true);
    });

    /**
     * Test cas limite: votes null/undefined → NO_CONSENSUS
     */
    it('Cas limite: votes null → NO_CONSENSUS', () => {
      const result = consensusManager.processConsensus(null as any);

      expect(result.verdict).toBe('NO_CONSENSUS');
      expect(result.validVotesCount).toBe(0);
      expect(result.totalVotesCount).toBe(0);
      expect(result.quorumRatio).toBe(0);
      expect(result.noConsensus).toBe(true);
    });

    /**
     * Test tie 1-0-1: 1 approve, 0 reject, 1 abstain
     */
    it('Tie 1-0-1: 1 approve, 0 reject, 1 abstain → NO_CONSENSUS', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.9, provider: 'provider1', latencyMs: 100 },
        { verdict: 'abstain', confidence: 0.5, provider: 'provider2', latencyMs: 120 }
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('NO_CONSENSUS');
      expect(result.validVotesCount).toBe(1);
      expect(result.totalVotesCount).toBe(2);
      expect(result.quorumRatio).toBe(0.5); // 1/2 = 0.5, pas > 2/3
      expect(result.noConsensus).toBe(true);
    });

    /**
     * Test cas 2-1-0: 2 approve, 1 reject, 0 abstain → APPROVE
     */
    it('Cas 2-1-0: 2 approve, 1 reject, 0 abstain → APPROVE', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.9, provider: 'provider1', latencyMs: 100 },
        { verdict: 'approve', confidence: 0.8, provider: 'provider2', latencyMs: 120 },
        { verdict: 'reject', confidence: 0.7, provider: 'provider3', latencyMs: 110 }
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('approve');
      expect(result.validVotesCount).toBe(3);
      expect(result.totalVotesCount).toBe(3);
      expect(result.quorumRatio).toBe(1.0); // 3/3 = 1.0, > 2/3
      expect(result.noConsensus).toBe(false);
    });

    /**
     * Test cas 1-2-0: 1 approve, 2 reject, 0 abstain → REJECT (couvre ligne 91)
     */
    it('Cas 1-2-0: 1 approve, 2 reject, 0 abstain → REJECT', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.9, provider: 'provider1', latencyMs: 100 },
        { verdict: 'reject', confidence: 0.8, provider: 'provider2', latencyMs: 120 },
        { verdict: 'reject', confidence: 0.7, provider: 'provider3', latencyMs: 110 }
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('reject');
      expect(result.validVotesCount).toBe(3);
      expect(result.totalVotesCount).toBe(3);
      expect(result.quorumRatio).toBe(1.0); // 3/3 = 1.0, > 2/3
      expect(result.noConsensus).toBe(false);
    });

    /**
     * Test gestion des confidences (pondération par défaut =1)
     */
    it('Gestion des confidences: votes avec confidences variées', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.1, provider: 'provider1', latencyMs: 100 },
        { verdict: 'approve', confidence: 0.9, provider: 'provider2', latencyMs: 120 },
        { verdict: 'reject', confidence: 0.5, provider: 'provider3', latencyMs: 110 }
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('approve'); // 2 approve > 1 reject
      expect(result.validVotesCount).toBe(3);
      expect(result.totalVotesCount).toBe(3);
      expect(result.quorumRatio).toBe(1.0);
      expect(result.noConsensus).toBe(false);
    });

    /**
     * Test timeout exactement à la limite (250ms)
     */
    it('Timeout exactement à la limite: 250ms → vote valide', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.9, provider: 'provider1', latencyMs: 250 }, // exactement à la limite
        { verdict: 'approve', confidence: 0.8, provider: 'provider2', latencyMs: 100 }
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('approve');
      expect(result.validVotesCount).toBe(2);
      expect(result.totalVotesCount).toBe(2);
      expect(result.providerTimeoutTotal).toBe(0);
      expect(result.noConsensus).toBe(false);
    });

    /**
     * Test timeout juste au-dessus de la limite (251ms)
     */
    it('Timeout juste au-dessus: 251ms → timeout', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.9, provider: 'provider1', latencyMs: 251 }, // timeout
        { verdict: 'approve', confidence: 0.8, provider: 'provider2', latencyMs: 100 }
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('NO_CONSENSUS'); // 1 vote valide, pas de majorité
      expect(result.validVotesCount).toBe(1);
      expect(result.totalVotesCount).toBe(2);
      expect(result.providerTimeoutTotal).toBe(1);
      expect(result.noConsensus).toBe(true); // Pas de majorité avec 1 seul vote
    });

    /**
     * Test latence totale exactement à 900ms
     */
    it('Latence totale exactement 900ms → NO_CONSENSUS', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.9, provider: 'provider1', latencyMs: 450 }, // timeout individuel
        { verdict: 'approve', confidence: 0.8, provider: 'provider2', latencyMs: 450 }  // timeout individuel
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('NO_CONSENSUS');
      expect(result.validVotesCount).toBe(0); // 450ms > 250ms = timeout
      expect(result.totalVotesCount).toBe(2);
      expect(result.noConsensus).toBe(true);
      expect(result.providerTimeoutTotal).toBe(2);
    });

    /**
     * Test latence totale < 900ms → consensus possible
     */
    it('Latence totale < 900ms → consensus possible', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.9, provider: 'provider1', latencyMs: 100 }, // valide
        { verdict: 'approve', confidence: 0.8, provider: 'provider2', latencyMs: 150 }  // valide
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('approve');
      expect(result.validVotesCount).toBe(2);
      expect(result.totalVotesCount).toBe(2);
      expect(result.noConsensus).toBe(false);
      expect(result.decisionLatencyMs).toBeLessThan(900);
    });

    /**
     * Test cas 1-1-0: 1 approve, 1 reject, 0 abstain → NO_CONSENSUS
     */
    it('Cas 1-1-0: 1 approve, 1 reject, 0 abstain → NO_CONSENSUS', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.9, provider: 'provider1', latencyMs: 100 },
        { verdict: 'reject', confidence: 0.8, provider: 'provider2', latencyMs: 120 }
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('NO_CONSENSUS');
      expect(result.validVotesCount).toBe(2);
      expect(result.totalVotesCount).toBe(2);
      expect(result.quorumRatio).toBe(1.0); // 2/2 = 1.0, > 2/3
      // Mais 1 approve = 1 reject, donc égalité → NO_CONSENSUS
      expect(result.noConsensus).toBe(true);
    });

    /**
     * Test cas 0-1-1: 0 approve, 1 reject, 1 abstain → NO_CONSENSUS
     */
    it('Cas 0-1-1: 0 approve, 1 reject, 1 abstain → NO_CONSENSUS', () => {
      const votes: Vote[] = [
        { verdict: 'reject', confidence: 0.9, provider: 'provider1', latencyMs: 100 },
        { verdict: 'abstain', confidence: 0.5, provider: 'provider2', latencyMs: 120 }
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('NO_CONSENSUS');
      expect(result.validVotesCount).toBe(1);
      expect(result.totalVotesCount).toBe(2);
      expect(result.quorumRatio).toBe(0.5); // 1/2 = 0.5, pas > 2/3
      expect(result.noConsensus).toBe(true);
    });

    /**
     * Test observabilité: getObservabilityMetrics
     */
    it('Observabilité: getObservabilityMetrics retourne des métriques', () => {
      const metrics = consensusManager.getObservabilityMetrics();

      expect(metrics).toHaveProperty('decision_latency_ms_p50');
      expect(metrics).toHaveProperty('decision_latency_ms_p95');
      expect(metrics).toHaveProperty('no_consensus_rate');
      expect(metrics).toHaveProperty('provider_timeout_total');
      
      expect(typeof metrics.decision_latency_ms_p50).toBe('number');
      expect(typeof metrics.decision_latency_ms_p95).toBe('number');
      expect(typeof metrics.no_consensus_rate).toBe('number');
      expect(typeof metrics.provider_timeout_total).toBe('number');
    });

    /**
     * Test cas limite: tous les votes en timeout
     */
    it('Cas limite: tous les votes en timeout → NO_CONSENSUS', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.9, provider: 'provider1', latencyMs: 300 }, // timeout
        { verdict: 'reject', confidence: 0.8, provider: 'provider2', latencyMs: 350 },  // timeout
        { verdict: 'approve', confidence: 0.7, provider: 'provider3', latencyMs: 400 }  // timeout
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('NO_CONSENSUS');
      expect(result.validVotesCount).toBe(0);
      expect(result.totalVotesCount).toBe(3);
      expect(result.providerTimeoutTotal).toBe(3);
      expect(result.noConsensus).toBe(true);
    });

    /**
     * Test cas limite: mélange de timeouts et votes valides
     */
    it('Mélange timeouts et votes valides → NO_CONSENSUS (quorum 2/3 non strict)', () => {
      const votes: Vote[] = [
        { verdict: 'approve', confidence: 0.9, provider: 'provider1', latencyMs: 100 }, // valide
        { verdict: 'approve', confidence: 0.8, provider: 'provider2', latencyMs: 120 }, // valide
        { verdict: 'reject', confidence: 0.7, provider: 'provider3', latencyMs: 300 }   // timeout
      ];

      const result = consensusManager.processConsensus(votes);

      expect(result.verdict).toBe('NO_CONSENSUS'); // 2/3 = 0.667, pas strictement > 2/3
      expect(result.validVotesCount).toBe(2);
      expect(result.totalVotesCount).toBe(3);
      expect(result.providerTimeoutTotal).toBe(1);
      expect(result.noConsensus).toBe(true);
    });
  });
});
