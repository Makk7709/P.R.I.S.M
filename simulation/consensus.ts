import { 
  SensorReading, 
  MHI, 
  Recommendation, 
  AgentVote, 
  ConsensusDecision,
  NormalizedKPI,
  TriggerThresholds,
  SimulationConfig 
} from './types.js';
import { CleaningTriggerAnalyzer } from './fouling_model.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// MULTI-AGENT CONSENSUS ENGINE - PRISM-IND Water Treatment
// Three agents: MembraneGuardian, EconomicOptimizer, OperationalBalancer
// Règle 2/3 majoritaire + unanimité si MHI < 0.35
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Specific agent implementations for water treatment consensus
 */
export class MembraneGuardian {
  private triggerAnalyzer: CleaningTriggerAnalyzer;
  
  constructor(thresholds: TriggerThresholds) {
    this.triggerAnalyzer = new CleaningTriggerAnalyzer(thresholds);
  }

  /**
   * MembraneGuardian focuses on MHI preservation and compliance
   */
  generateVote(
    sensorReading: SensorReading,
    kpi: NormalizedKPI,
    mhi: number
  ): AgentVote {
    
    const triggerAnalysis = this.triggerAnalyzer.analyzeTriggers(kpi, sensorReading);
    
    let recommendation: Recommendation;
    let score: number;
    let justification: string;
    
    // Primary focus: membrane health preservation
    if (mhi < 0.35) {
      recommendation = Recommendation.SCHEDULE_CIP;
      score = 0.95;
      justification = `Critical MHI ${(mhi * 100).toFixed(1)}% - immediate CIP required`;
    } else if (triggerAnalysis.npfDeclinePercent >= 15 || triggerAnalysis.ndpIncreasePercent >= 15) {
      recommendation = Recommendation.SCHEDULE_CIP;
      score = 0.85;
      justification = `Performance triggers: NPF decline ${triggerAnalysis.npfDeclinePercent.toFixed(1)}%, NDP increase ${triggerAnalysis.ndpIncreasePercent.toFixed(1)}%`;
    } else if (triggerAnalysis.sdiPersistent || triggerAnalysis.mfiElevated) {
      recommendation = Recommendation.INSPECT;
      score = 0.75;
      justification = `Fouling indicators: SDI persistent=${triggerAnalysis.sdiPersistent}, MFI elevated=${triggerAnalysis.mfiElevated}`;
    } else if (triggerAnalysis.npfDeclinePercent >= 10) {
      recommendation = Recommendation.ADJUST_SETPOINTS;
      score = 0.70;
      justification = `Early warning: NPF declining ${triggerAnalysis.npfDeclinePercent.toFixed(1)}%`;
    } else {
      recommendation = Recommendation.ADJUST_SETPOINTS;
      score = 0.60;
      justification = `Proactive membrane preservation`;
    }
    
    return {
      agentId: 'MembraneGuardian',
      recommendation,
      score,
      justification
    };
  }
}

export class EconomicOptimizer {
  private downtimeCostEUR: number;
  private chemistryCostEUR: number;
  private productionValueEUR: number;
  
  constructor(
    downtimeCostEUR: number = 300,    // 3h downtime * 100 m³/h * 1 EUR/m³
    chemistryCostEUR: number = 1750,  // 42 elements * ~42 EUR/element
    productionValueEUR: number = 100  // 100 m³/h * 1 EUR/m³
  ) {
    this.downtimeCostEUR = downtimeCostEUR;
    this.chemistryCostEUR = chemistryCostEUR;
    this.productionValueEUR = productionValueEUR;
  }

  /**
   * EconomicOptimizer minimizes OPEX and downtime
   */
  generateVote(
    sensorReading: SensorReading,
    kpi: NormalizedKPI,
    mhi: number,
    timeSinceLastCIP: number // hours
  ): AgentVote {
    
    let recommendation: Recommendation;
    let score: number;
    let justification: string;
    
    // Calculate economic impact of CIP vs delay
    const totalCipCost = this.downtimeCostEUR + this.chemistryCostEUR;
    const hoursToScheduledCIP = Math.max(0, 48 - timeSinceLastCIP); // Baseline every 48h
    const delayValue = hoursToScheduledCIP * this.productionValueEUR;
    
    // Economic decision logic
    if (mhi < 0.25) {
      // Severe membrane damage risk outweighs economic concerns
      recommendation = Recommendation.SCHEDULE_CIP;
      score = 0.80;
      justification = `Severe membrane damage risk outweighs ${totalCipCost}€ CIP cost`;
    } else if (delayValue > totalCipCost * 1.5) {
      // High value in delaying CIP
      recommendation = Recommendation.ADJUST_SETPOINTS;
      score = 0.85;
      justification = `Delay value ${delayValue.toFixed(0)}€ > CIP cost ${totalCipCost}€`;
    } else if (kpi.NPF > 0.90 && kpi.NDP < 1.10) {
      // Good performance, economically optimal to continue
      recommendation = Recommendation.ADJUST_SETPOINTS;
      score = 0.80;
      justification = `Good performance (NPF ${(kpi.NPF * 100).toFixed(0)}%, NDP ${(kpi.NDP * 100).toFixed(0)}%) - optimize settings`;
    } else if (mhi < 0.40) {
      // Poor membrane health, CIP justified economically  
      recommendation = Recommendation.SCHEDULE_CIP;
      score = 0.75;
      justification = `Poor MHI ${(mhi * 100).toFixed(1)}% justifies ${totalCipCost}€ CIP cost`;
    } else {
      // Inspect before costly intervention
      recommendation = Recommendation.INSPECT;
      score = 0.65;
      justification = `Cost-benefit analysis favors inspection before ${totalCipCost}€ CIP`;
    }
    
    return {
      agentId: 'EconomicOptimizer',
      recommendation,
      score,
      justification
    };
  }
}

export class OperationalBalancer {
  /**
   * OperationalBalancer seeks stability and smooth operation
   */
  generateVote(
    sensorReading: SensorReading,
    kpi: NormalizedKPI,
    mhi: number,
    recentCIPCount: number // CIPs in last 7 days
  ): AgentVote {
    
    let recommendation: Recommendation;
    let score: number;
    let justification: string;
    
    // Operational stability logic
    if (mhi < 0.30) {
      recommendation = Recommendation.SCHEDULE_CIP;
      score = 0.90;
      justification = `Critical MHI ${(mhi * 100).toFixed(1)}% requires immediate stabilization`;
    } else if (recentCIPCount >= 2) {
      // Too many recent CIPs, avoid membrane stress
      recommendation = Recommendation.ADJUST_SETPOINTS;
      score = 0.80;
      justification = `${recentCIPCount} recent CIPs - avoid membrane stress, adjust operations`;
    } else if (kpi.NPF < 0.85 && kpi.NDP > 1.15) {
      // Performance degrading, needs intervention
      recommendation = Recommendation.SCHEDULE_CIP;
      score = 0.75;
      justification = `Performance degrading: NPF ${(kpi.NPF * 100).toFixed(0)}%, NDP ${(kpi.NDP * 100).toFixed(0)}%`;
    } else if (sensorReading.SDI > 3.2 || sensorReading.MFI > 6.0) {
      // Fouling indicators suggest investigation
      recommendation = Recommendation.INSPECT;
      score = 0.70;
      justification = `Fouling indicators: SDI ${sensorReading.SDI.toFixed(1)}, MFI ${sensorReading.MFI.toFixed(1)}`;
    } else {
      // Stable operation, gradual optimization
      recommendation = Recommendation.ADJUST_SETPOINTS;
      score = 0.65;
      justification = `Stable operation - gradual optimization to maintain balance`;
    }
    
    return {
      agentId: 'OperationalBalancer',
      recommendation,
      score,
      justification
    };
  }
}

/**
 * Consensus engine implementing 2/3 majority rule with unanimity for critical MHI
 */
export class ConsensusEngine {
  private membraneGuardian: MembraneGuardian;
  private economicOptimizer: EconomicOptimizer;
  private operationalBalancer: OperationalBalancer;
  private decisionHistory: ConsensusDecision[] = [];
  private criticalMHIThreshold: number = 0.35;

  constructor(
    thresholds: TriggerThresholds,
    economicParams: {
      downtimeCostEUR?: number;
      chemistryCostEUR?: number;
      productionValueEUR?: number;
    } = {}
  ) {
    this.membraneGuardian = new MembraneGuardian(thresholds);
    this.economicOptimizer = new EconomicOptimizer(
      economicParams.downtimeCostEUR,
      economicParams.chemistryCostEUR,
      economicParams.productionValueEUR
    );
    this.operationalBalancer = new OperationalBalancer();
  }

  /**
   * Execute consensus decision process with 2/3 majority rule
   */
  executeConsensus(
    sensorReading: SensorReading,
    kpi: NormalizedKPI,
    mhi: number,
    timeSinceLastCIP: number = 0,
    recentCIPCount: number = 0
  ): ConsensusDecision {
    
    // Collect votes from all three agents
    const votes: AgentVote[] = [
      this.membraneGuardian.generateVote(sensorReading, kpi, mhi),
      this.economicOptimizer.generateVote(sensorReading, kpi, mhi, timeSinceLastCIP),
      this.operationalBalancer.generateVote(sensorReading, kpi, mhi, recentCIPCount)
    ];

    // Check if MHI is below critical threshold
    const mhiBelowCritical = mhi < this.criticalMHIThreshold;

    let finalRecommendation: Recommendation;
    let consensusType: 'MAJORITY_2_3' | 'UNANIMOUS_CRITICAL' | 'TIE_BREAK';
    let auditTrail: string;

    if (mhiBelowCritical) {
      // Unanimity required for critical MHI
      const unanimousRecommendation = this.checkUnanimous(votes);
      if (unanimousRecommendation) {
        finalRecommendation = unanimousRecommendation;
        consensusType = 'UNANIMOUS_CRITICAL';
        auditTrail = `Critical MHI ${(mhi * 100).toFixed(1)}% - unanimous agreement required and achieved`;
      } else {
        // No unanimity in critical situation - default to safest option
        finalRecommendation = Recommendation.SCHEDULE_CIP;
        consensusType = 'UNANIMOUS_CRITICAL';
        auditTrail = `Critical MHI ${(mhi * 100).toFixed(1)}% - no unanimity, defaulting to SCHEDULE_CIP for safety`;
      }
    } else {
      // Normal 2/3 majority rule
      const majorityRecommendation = this.checkTwoThirdsMajority(votes);
      if (majorityRecommendation) {
        finalRecommendation = majorityRecommendation;
        consensusType = 'MAJORITY_2_3';
        auditTrail = `2/3 majority achieved for ${majorityRecommendation}`;
      } else {
        // Tie-break by weighted scores
        finalRecommendation = this.resolveTieByScore(votes);
        consensusType = 'TIE_BREAK';
        auditTrail = `No 2/3 majority - tie-break by weighted scores`;
      }
    }

    const decision: ConsensusDecision = {
      timestamp: sensorReading.timestamp,
      finalRecommendation,
      votes,
      consensusType,
      mhi_below_critical: mhiBelowCritical,
      auditTrail: this.generateDetailedAuditTrail(votes, finalRecommendation, consensusType, auditTrail)
    };

    this.decisionHistory.push(decision);
    return decision;
  }

  /**
   * Check for unanimous agreement among all agents
   */
  private checkUnanimous(votes: AgentVote[]): Recommendation | null {
    const firstRecommendation = votes[0].recommendation;
    const isUnanimous = votes.every(vote => vote.recommendation === firstRecommendation);
    return isUnanimous ? firstRecommendation : null;
  }

  /**
   * Check for 2/3 majority (2 out of 3 agents)
   */
  private checkTwoThirdsMajority(votes: AgentVote[]): Recommendation | null {
    const requiredVotes = 2; // 2 out of 3
    
    for (const recommendation of Object.values(Recommendation)) {
      const supportingVotes = votes.filter(vote => vote.recommendation === recommendation);
      if (supportingVotes.length >= requiredVotes) {
        return recommendation;
      }
    }
    
    return null;
  }

  /**
   * Resolve tie by weighted scores (highest average score wins)
   */
  private resolveTieByScore(votes: AgentVote[]): Recommendation {
    const recommendationScores = new Map<Recommendation, { totalScore: number; count: number }>();
    
    for (const vote of votes) {
      const current = recommendationScores.get(vote.recommendation) || { totalScore: 0, count: 0 };
      current.totalScore += vote.score;
      current.count += 1;
      recommendationScores.set(vote.recommendation, current);
    }
    
    let bestRecommendation = votes[0].recommendation;
    let bestAverageScore = 0;
    
    for (const [recommendation, { totalScore, count }] of recommendationScores) {
      const averageScore = totalScore / count;
      if (averageScore > bestAverageScore) {
        bestAverageScore = averageScore;
        bestRecommendation = recommendation;
      }
    }
    
    return bestRecommendation;
  }

  /**
   * Generate detailed audit trail
   */
  private generateDetailedAuditTrail(
    votes: AgentVote[],
    finalRecommendation: Recommendation,
    consensusType: string,
    auditNote: string
  ): string {
    const trail = {
      timestamp: new Date().toISOString(),
      finalDecision: finalRecommendation,
      consensusType,
      votes: votes.map(vote => ({
        agent: vote.agentId,
        recommendation: vote.recommendation,
        score: vote.score,
        justification: vote.justification
      })),
      auditNote
    };
    
    return JSON.stringify(trail, null, 2);
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(): ConsensusDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Reset consensus engine state
   */
  reset(): void {
    this.decisionHistory = [];
  }

  /**
   * Set critical MHI threshold
   */
  setCriticalMHIThreshold(threshold: number): void {
    this.criticalMHIThreshold = threshold;
  }
}


