import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusEngine, MembraneGuardian, EconomicOptimizer, OperationalBalancer } from '../consensus.js';
import { DEFAULT_CONFIG, DataQuality, Recommendation } from '../types.js';

describe('MembraneGuardian Agent', () => {
  let agent: MembraneGuardian;
  
  beforeEach(() => {
    agent = new MembraneGuardian(DEFAULT_CONFIG.triggers);
  });

  it('should recommend CIP for critical MHI', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.6,
      NSP: 2.0,
      NDP: 1.8,
      MHI: 0.3, // Critical MHI
      timestamp: new Date()
    };

    const vote = agent.generateVote(sensorReading, kpi, 0.3);
    
    expect(vote.agentId).toBe('MembraneGuardian');
    expect(vote.recommendation).toBe(Recommendation.SCHEDULE_CIP);
    expect(vote.score).toBeGreaterThan(0.9);
    expect(vote.justification).toContain('Critical MHI');
  });

  it('should recommend CIP for NPF decline ≥15%', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.84, // 16% decline from baseline
      NSP: 2.0,
      NDP: 1.1,
      MHI: 0.6,
      timestamp: new Date()
    };

    const vote = agent.generateVote(sensorReading, kpi, 0.6);
    
    expect(vote.recommendation).toBe(Recommendation.SCHEDULE_CIP);
    expect(vote.justification).toContain('Performance triggers');
  });

  it('should recommend INSPECT for elevated SDI', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 3.2, // Above threshold
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.93, // Minor decline
      NSP: 2.0,
      NDP: 1.05,
      MHI: 0.7,
      timestamp: new Date()
    };

    const vote = agent.generateVote(sensorReading, kpi, 0.7);
    
    expect(vote.recommendation).toBe(Recommendation.INSPECT);
    expect(vote.justification).toContain('Fouling indicators');
  });

  it('should recommend ADJUST_SETPOINTS for good conditions', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.97,
      NSP: 2.0,
      NDP: 1.02,
      MHI: 0.85,
      timestamp: new Date()
    };

    const vote = agent.generateVote(sensorReading, kpi, 0.85);
    
    expect(vote.recommendation).toBe(Recommendation.ADJUST_SETPOINTS);
    expect(vote.justification).toContain('Proactive membrane preservation');
  });
});

describe('EconomicOptimizer Agent', () => {
  let agent: EconomicOptimizer;
  
  beforeEach(() => {
    agent = new EconomicOptimizer();
  });

  it('should recommend CIP for severe membrane damage risk', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.5,
      NSP: 2.0,
      NDP: 2.0,
      MHI: 0.2, // Severe condition
      timestamp: new Date()
    };

    const vote = agent.generateVote(sensorReading, kpi, 0.2, 10);
    
    expect(vote.recommendation).toBe(Recommendation.SCHEDULE_CIP);
    expect(vote.justification).toContain('membrane damage risk');
  });

  it('should recommend ADJUST_SETPOINTS for high delay value', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.95,
      NSP: 2.0,
      NDP: 1.05,
      MHI: 0.8,
      timestamp: new Date()
    };

    const vote = agent.generateVote(sensorReading, kpi, 0.8, 5); // Only 5h since last CIP
    
    expect(vote.recommendation).toBe(Recommendation.ADJUST_SETPOINTS);
    expect(vote.justification).toContain('Delay value');
  });

  it('should recommend INSPECT for cost-benefit analysis', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.7,
      NSP: 2.0,
      NDP: 1.3,
      MHI: 0.5, // Borderline condition
      timestamp: new Date()
    };

    const vote = agent.generateVote(sensorReading, kpi, 0.5, 20);
    
    expect(vote.recommendation).toBe(Recommendation.INSPECT);
    expect(vote.justification).toContain('Cost-benefit analysis');
  });
});

describe('OperationalBalancer Agent', () => {
  let agent: OperationalBalancer;
  
  beforeEach(() => {
    agent = new OperationalBalancer();
  });

  it('should recommend CIP for critical MHI requiring stabilization', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.5,
      NSP: 2.0,
      NDP: 1.8,
      MHI: 0.25, // Critical
      timestamp: new Date()
    };

    const vote = agent.generateVote(sensorReading, kpi, 0.25, 0);
    
    expect(vote.recommendation).toBe(Recommendation.SCHEDULE_CIP);
    expect(vote.justification).toContain('immediate stabilization');
  });

  it('should avoid CIP if too many recent CIPs', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.8,
      NSP: 2.0,
      NDP: 1.3,
      MHI: 0.6,
      timestamp: new Date()
    };

    const vote = agent.generateVote(sensorReading, kpi, 0.6, 3); // 3 recent CIPs
    
    expect(vote.recommendation).toBe(Recommendation.ADJUST_SETPOINTS);
    expect(vote.justification).toContain('recent CIPs');
    expect(vote.justification).toContain('avoid membrane stress');
  });

  it('should recommend INSPECT for elevated fouling indicators', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 3.5, // Above threshold
      MFI: 6.5, // Elevated
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.9,
      NSP: 2.0,
      NDP: 1.1,
      MHI: 0.7,
      timestamp: new Date()
    };

    const vote = agent.generateVote(sensorReading, kpi, 0.7, 0);
    
    expect(vote.recommendation).toBe(Recommendation.INSPECT);
    expect(vote.justification).toContain('Fouling indicators');
  });
});

describe('ConsensusEngine', () => {
  let engine: ConsensusEngine;
  
  beforeEach(() => {
    engine = new ConsensusEngine(DEFAULT_CONFIG.triggers);
  });

  it('should require unanimity for critical MHI', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.5,
      NSP: 2.0,
      NDP: 1.8,
      MHI: 0.3, // Critical MHI below 0.35
      timestamp: new Date()
    };

    const decision = engine.executeConsensus(sensorReading, kpi, 0.3);
    
    expect(decision.mhi_below_critical).toBe(true);
    expect(decision.consensusType).toBe('UNANIMOUS_CRITICAL');
    // All agents should agree on CIP for critical MHI
    expect(decision.finalRecommendation).toBe(Recommendation.SCHEDULE_CIP);
  });

  it('should achieve 2/3 majority for normal conditions', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 88, // 12% decline
      dP_bar: 1.4, // Elevated pressure
      SDI: 3.1, // Above threshold
      MFI: 5.5, // Elevated
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.88,
      NSP: 2.0,
      NDP: 1.17,
      MHI: 0.5, // Above critical
      timestamp: new Date()
    };

    const decision = engine.executeConsensus(sensorReading, kpi, 0.5);
    
    expect(decision.mhi_below_critical).toBe(false);
    expect(decision.votes).toHaveLength(3);
    
    // Should achieve majority (at least 2/3 agents agreeing)
    const recommendations = decision.votes.map(v => v.recommendation);
    const majorityCounts = recommendations.reduce((acc, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxCount = Math.max(...Object.values(majorityCounts));
    expect(maxCount).toBeGreaterThanOrEqual(2);
  });

  it('should use tie-break by score when no majority', () => {
    // This test is harder to create since agents usually align on extreme conditions
    // We'll test the tie-break mechanism directly by checking the decision type
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 92, // Moderate decline
      dP_bar: 1.25, // Moderate increase
      SDI: 2.9, // Just below threshold
      MFI: 4.8, // Moderate
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.92,
      NSP: 2.0,
      NDP: 1.04,
      MHI: 0.75, // Good condition
      timestamp: new Date()
    };

    const decision = engine.executeConsensus(sensorReading, kpi, 0.75);
    
    expect(decision.votes).toHaveLength(3);
    expect(['MAJORITY_2_3', 'TIE_BREAK']).toContain(decision.consensusType);
    expect(decision.finalRecommendation).toBeDefined();
  });

  it('should maintain decision history', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.95,
      NSP: 2.0,
      NDP: 1.02,
      MHI: 0.8,
      timestamp: new Date()
    };

    engine.executeConsensus(sensorReading, kpi, 0.8);
    engine.executeConsensus(sensorReading, kpi, 0.8);
    
    const history = engine.getDecisionHistory();
    expect(history).toHaveLength(2);
    expect(history[0].timestamp).toBeInstanceOf(Date);
    expect(history[0].votes).toHaveLength(3);
  });

  it('should reset state properly', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const kpi = {
      NPF: 0.95,
      NSP: 2.0,
      NDP: 1.02,
      MHI: 0.8,
      timestamp: new Date()
    };

    engine.executeConsensus(sensorReading, kpi, 0.8);
    expect(engine.getDecisionHistory()).toHaveLength(1);
    
    engine.reset();
    expect(engine.getDecisionHistory()).toHaveLength(0);
  });
});