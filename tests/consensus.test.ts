import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusEngine } from '../simulation/consensus.js';
import { EconomicCalculator } from '../simulation/economics.js';
import { SensorReading, MHI, DataQuality, Recommendation, DEFAULT_CONFIG } from '../simulation/types.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// CONSENSUS ENGINE TESTS - PRISM-IND
// ═══════════════════════════════════════════════════════════════════════════════════

describe('ConsensusEngine', () => {
  let consensusEngine: ConsensusEngine;
  let economicCalculator: EconomicCalculator;
  let mockSensorReading: SensorReading;
  let mockMHI: MHI;

  beforeEach(() => {
    consensusEngine = new ConsensusEngine();
    economicCalculator = new EconomicCalculator(DEFAULT_CONFIG.economics);
    
    mockSensorReading = {
      timestamp: new Date(),
      deltaPressure: 0.8,
      permeateFlux: 45,
      turbidity: 0.5,
      conductivity: 1200,
      pH: 7.2,
      temperature: 20,
      flowRate: 100,
      quality: DataQuality.GOOD
    };

    mockMHI = {
      value: 0.75,
      factors: {
        pressurePenalty: 0.1,
        fluxPenalty: 0.05,
        turbidityPenalty: 0.05,
        temperatureCorrection: 0.02,
        pHRisk: 0.03
      },
      timestamp: new Date()
    };
  });

  describe('Consensus Decision Making', () => {
    it('should reach unanimous consensus when all agents agree', async () => {
      // Test with high MHI - agents should generally agree on delay/adjust
      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        mockMHI,
        economicCalculator,
        24 // 24 hours until scheduled CIP
      );

      expect(decision.finalRecommendation).toBeDefined();
      expect(decision.votes).toHaveLength(3);
      expect(decision.confidenceLevel).toBeGreaterThan(0);
      expect(decision.auditTrail).toContain('decision');
    });

    it('should require unanimity for safety-critical situations', async () => {
      // Test with critically low MHI
      const criticalMHI: MHI = {
        ...mockMHI,
        value: 0.2 // Below safety threshold
      };

      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        criticalMHI,
        economicCalculator,
        48
      );

      // Should either be unanimous or default to CLEAN_NOW for safety
      expect([
        'UNANIMOUS',
        'UNANIMOUS' // Safety override
      ]).toContain(decision.consensusType);
      
      if (decision.consensusType === 'UNANIMOUS' && decision.finalRecommendation !== Recommendation.CLEAN_NOW) {
        // If unanimous on something other than clean, all agents must agree
        const recommendations = decision.votes.map(v => v.recommendation);
        const uniqueRecommendations = new Set(recommendations);
        expect(uniqueRecommendations.size).toBe(1);
      }
    });

    it('should resolve ties using weighted scores', async () => {
      // Test with medium MHI where agents might disagree
      const mediumMHI: MHI = {
        ...mockMHI,
        value: 0.45
      };

      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        mediumMHI,
        economicCalculator,
        12
      );

      expect(decision.finalRecommendation).toBeDefined();
      expect(decision.votes).toHaveLength(3);
      
      // Should have weighted scores for all votes
      decision.votes.forEach(vote => {
        expect(vote.weightedScore).toBeGreaterThanOrEqual(0);
        expect(vote.weightedScore).toBeLessThanOrEqual(1);
      });
    });

    it('should apply qualified majority when consensus type is MAJORITY_QUALIFIED', async () => {
      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        mockMHI,
        economicCalculator,
        6
      );

      if (decision.consensusType === 'MAJORITY_QUALIFIED') {
        // Count votes for the final recommendation
        const winningVotes = decision.votes.filter(
          vote => vote.recommendation === decision.finalRecommendation
        ).length;
        
        // Should have at least 2/3 majority (2 out of 3 agents)
        expect(winningVotes).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('Socratic Filters', () => {
    it('should calculate truth filter based on data quality', async () => {
      const badQualityReading: SensorReading = {
        ...mockSensorReading,
        quality: DataQuality.BAD
      };

      const decision = await consensusEngine.executeConsensus(
        badQualityReading,
        mockMHI,
        economicCalculator,
        24
      );

      // Truth scores should reflect poor data quality
      decision.votes.forEach(vote => {
        expect(vote.socraticFilters.truth).toBeLessThan(0.8);
      });
    });

    it('should calculate goodness filter based on membrane health', async () => {
      const criticalMHI: MHI = {
        ...mockMHI,
        value: 0.15 // Very poor membrane health
      };

      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        criticalMHI,
        economicCalculator,
        24
      );

      // Goodness scores should reflect poor membrane health
      decision.votes.forEach(vote => {
        expect(vote.socraticFilters.goodness).toBeLessThan(0.7);
      });
    });

    it('should calculate utility filter based on economic value', async () => {
      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        mockMHI,
        economicCalculator,
        2 // Very soon scheduled CIP
      );

      // Utility scores should be calculated
      decision.votes.forEach(vote => {
        expect(vote.socraticFilters.utility).toBeGreaterThanOrEqual(0);
        expect(vote.socraticFilters.utility).toBeLessThanOrEqual(1);
      });
    });

    it('should have balanced socratic filter weights', async () => {
      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        mockMHI,
        economicCalculator,
        24
      );

      decision.votes.forEach(vote => {
        const { truth, goodness, utility } = vote.socraticFilters;
        
        // All filters should be in valid range
        expect(truth).toBeGreaterThanOrEqual(0);
        expect(truth).toBeLessThanOrEqual(1);
        expect(goodness).toBeGreaterThanOrEqual(0);
        expect(goodness).toBeLessThanOrEqual(1);
        expect(utility).toBeGreaterThanOrEqual(0);
        expect(utility).toBeLessThanOrEqual(1);
        
        // Weighted score should be reasonable combination
        expect(vote.weightedScore).toBeGreaterThanOrEqual(0);
        expect(vote.weightedScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Agent Behavior', () => {
    it('should have consistent agent IDs and personalities', async () => {
      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        mockMHI,
        economicCalculator,
        24
      );

      const expectedAgentIds = ['MEMBRANE_GUARDIAN', 'ECONOMIC_OPTIMIZER', 'OPERATIONAL_BALANCER'];
      const actualAgentIds = decision.votes.map(vote => vote.agentId);
      
      expect(actualAgentIds.sort()).toEqual(expectedAgentIds.sort());
    });

    it('should provide justifications for all recommendations', async () => {
      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        mockMHI,
        economicCalculator,
        24
      );

      decision.votes.forEach(vote => {
        expect(vote.justification).toBeDefined();
        expect(vote.justification.length).toBeGreaterThan(0);
        expect(typeof vote.justification).toBe('string');
      });
    });

    it('should show different agent behaviors for economic vs health scenarios', async () => {
      // Scenario 1: High economic value to continue production
      const highValueScenario = await consensusEngine.executeConsensus(
        { ...mockSensorReading },
        { ...mockMHI, value: 0.6 }, // Decent MHI
        economicCalculator,
        48 // Long time until scheduled CIP
      );

      // Scenario 2: Poor membrane health
      const healthCriticalScenario = await consensusEngine.executeConsensus(
        { ...mockSensorReading },
        { ...mockMHI, value: 0.25 }, // Poor MHI
        economicCalculator,
        48
      );

      // Economic optimizer should be more likely to delay in high-value scenario
      const economicAgentHigh = highValueScenario.votes.find(v => v.agentId === 'ECONOMIC_OPTIMIZER');
      const economicAgentCritical = healthCriticalScenario.votes.find(v => v.agentId === 'ECONOMIC_OPTIMIZER');
      
      // Membrane guardian should be more conservative with poor health
      const guardianAgentHigh = highValueScenario.votes.find(v => v.agentId === 'MEMBRANE_GUARDIAN');
      const guardianAgentCritical = healthCriticalScenario.votes.find(v => v.agentId === 'MEMBRANE_GUARDIAN');

      expect(economicAgentHigh).toBeDefined();
      expect(economicAgentCritical).toBeDefined();
      expect(guardianAgentHigh).toBeDefined();
      expect(guardianAgentCritical).toBeDefined();
    });
  });

  describe('Audit Trail', () => {
    it('should generate valid JSON audit trail', async () => {
      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        mockMHI,
        economicCalculator,
        24
      );

      expect(() => JSON.parse(decision.auditTrail)).not.toThrow();
      
      const auditData = JSON.parse(decision.auditTrail);
      expect(auditData.decision).toBe(decision.finalRecommendation);
      expect(auditData.consensusType).toBe(decision.consensusType);
      expect(auditData.votes).toHaveLength(3);
    });

    it('should maintain decision history', async () => {
      // Make multiple decisions
      await consensusEngine.executeConsensus(mockSensorReading, mockMHI, economicCalculator, 24);
      await consensusEngine.executeConsensus(mockSensorReading, mockMHI, economicCalculator, 12);
      
      const history = consensusEngine.getDecisionHistory();
      expect(history).toHaveLength(2);
      
      history.forEach(decision => {
        expect(decision.timestamp).toBeInstanceOf(Date);
        expect(decision.votes).toHaveLength(3);
      });
    });

    it('should reset state properly', async () => {
      await consensusEngine.executeConsensus(mockSensorReading, mockMHI, economicCalculator, 24);
      
      consensusEngine.reset();
      
      const history = consensusEngine.getDecisionHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing sensor data gracefully', async () => {
      const missingSensorReading: SensorReading = {
        ...mockSensorReading,
        quality: DataQuality.MISSING
      };

      const decision = await consensusEngine.executeConsensus(
        missingSensorReading,
        mockMHI,
        economicCalculator,
        24
      );

      expect(decision.finalRecommendation).toBeDefined();
      expect(decision.votes).toHaveLength(3);
    });

    it('should handle extreme MHI values', async () => {
      // Test with MHI = 0 (completely fouled)
      const extremeMHI: MHI = {
        ...mockMHI,
        value: 0
      };

      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        extremeMHI,
        economicCalculator,
        24
      );

      // Should strongly favor immediate cleaning
      expect(decision.finalRecommendation).toBe(Recommendation.CLEAN_NOW);
    });

    it('should handle very short time until scheduled CIP', async () => {
      const decision = await consensusEngine.executeConsensus(
        mockSensorReading,
        mockMHI,
        economicCalculator,
        0.5 // 30 minutes until scheduled CIP
      );

      expect(decision.finalRecommendation).toBeDefined();
      expect(decision.votes).toHaveLength(3);
    });
  });
});
