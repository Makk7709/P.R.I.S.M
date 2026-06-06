import { 
  SimulationConfig, 
  DEFAULT_CONFIG,
  SensorReading, 
  MolecularData, 
  NormalizedKPI,
  ConsensusDecision,
  StrategyMetrics,
  SystemEvent
} from './types.js';
import { SensorSimulator } from './sensors.js';
import { MolecularSimulator } from './molecular.js';
import { NormalizedKPICalculator, CleaningTriggerAnalyzer } from './fouling_model.js';
import { ConsensusEngine } from './consensus.js';
import { EconomicCalculator, CIPEvent } from './economics.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// SCENARIO SIMULATION - PRISM-IND Water Treatment
// Orchestrates complete simulation: Baseline vs PRISM predictive strategy
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Simulation step result
 */
export interface SimulationStep {
  timestamp: Date;
  sensorReading: SensorReading;
  molecularData: MolecularData;
  normalizedKPI: NormalizedKPI;
  consensusDecision?: ConsensusDecision;
  systemEvent?: SystemEvent;
  economicImpact: number;
  mhi: number;
  timeSinceLastCIP: number;
}

/**
 * Complete simulation results
 */
export interface SimulationResults {
  config: SimulationConfig;
  strategy: 'BASELINE' | 'PRISM';
  steps: SimulationStep[];
  metrics: StrategyMetrics;
  cipEvents: CIPEvent[];
  summary: {
    totalSteps: number;
    totalRuntime: number; // hours
    avgMHI: number;
    minMHI: number;
    maxNPFDecline: number;
    maxNDPIncrease: number;
    consensusDecisions: number;
    automaticCIPs: number;
  };
}

/**
 * Simulation scenario runner
 */
export class ScenarioRunner {
  private config: SimulationConfig;
  private sensorSimulator: SensorSimulator;
  private molecularSimulator: MolecularSimulator;
  private kpiCalculator: NormalizedKPICalculator;
  private triggerAnalyzer: CleaningTriggerAnalyzer;
  private consensusEngine: ConsensusEngine;
  private economicCalculator: EconomicCalculator;

  constructor(config: SimulationConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.sensorSimulator = new SensorSimulator(config);
    this.molecularSimulator = new MolecularSimulator(config);
    this.kpiCalculator = new NormalizedKPICalculator();
    this.triggerAnalyzer = new CleaningTriggerAnalyzer(config.triggers);
    this.consensusEngine = new ConsensusEngine(
      config.triggers,
      {
        downtimeCostEUR: config.economics.downtime_CIP_h * 100 * config.economics.production_value_EUR_per_m3,
        chemistryCostEUR: config.economics.chemistry_cost_per_element_EUR * 42, // Total elements
        productionValueEUR: config.economics.production_value_EUR_per_m3 * 100 // Per hour
      }
    );
    this.economicCalculator = new EconomicCalculator(config.economics);
  }

  /**
   * Run baseline scenario (calendar-based CIP every 48h)
   */
  async runBaselineScenario(): Promise<SimulationResults> {
    console.log('🏭 Running BASELINE scenario (CIP every 48h)...');
    
    const startTime = new Date('2025-01-01T00:00:00Z');
    const steps: SimulationStep[] = [];
    let timeSinceLastCIP = 0; // hours
    let lastCIPTime = startTime.getTime();
    
    // Generate time series data
    const totalMinutes = this.config.durationDays * 24 * 60;
    const totalSteps = Math.floor(totalMinutes / this.config.timeStepMinutes);
    
    for (let i = 0; i < totalSteps; i++) {
      const timestamp = new Date(startTime.getTime() + i * this.config.timeStepMinutes * 60 * 1000);
      timeSinceLastCIP = (timestamp.getTime() - lastCIPTime) / (1000 * 60 * 60);
      
      // Generate sensor and molecular data
      const sensorReading = this.sensorSimulator.generateReading(timestamp);
      const molecularData = this.molecularSimulator.generateMolecularData(timestamp, sensorReading, timeSinceLastCIP);
      const normalizedKPI = this.kpiCalculator.calculateNormalizedKPI(sensorReading, molecularData);
      
      // Check if CIP is due (every 48h)
      let systemEvent: SystemEvent | undefined;
      let economicImpact = 0;
      
      if (timeSinceLastCIP >= 48) {
        // Execute scheduled CIP
        systemEvent = SystemEvent.SCHEDULE_CIP;
        const cipEvent: CIPEvent = {
          timestamp,
          duration: this.config.economics.downtime_CIP_h,
          reason: 'Scheduled calendar CIP (48h)',
          strategy: 'BASELINE'
        };
        
        economicImpact = this.economicCalculator.recordCIPEvent(cipEvent);
        
        // Reset fouling after CIP
        this.sensorSimulator.resetFouling();
        this.molecularSimulator.resetMolecularState();
        this.kpiCalculator.resetBaseline({});
        
        lastCIPTime = timestamp.getTime();
        timeSinceLastCIP = 0;
        
        console.log(`📅 Baseline CIP at ${timestamp.toISOString()} (${economicImpact.toFixed(0)}€)`);
      } else {
        // Record normal production
        economicImpact = this.economicCalculator.recordProduction(
          timestamp, 
          this.config.timeStepMinutes / 60,
          normalizedKPI.NPF // Use NPF as efficiency factor
        );
      }
      
      steps.push({
        timestamp,
        sensorReading,
        molecularData,
        normalizedKPI,
        systemEvent,
        economicImpact,
        mhi: normalizedKPI.MHI,
        timeSinceLastCIP
      });
    }
    
    // Calculate metrics
    const metrics = this.economicCalculator.calculateStrategyMetrics('BASELINE');
    const cipEvents = this.economicCalculator.getCIPEvents().filter(e => e.strategy === 'BASELINE');
    
    const summary = this.calculateSummary(steps, cipEvents);
    
    console.log(`✅ Baseline completed: ${cipEvents.length} CIPs, ${metrics.totalOpex.toFixed(0)}€ OPEX`);
    
    return {
      config: this.config,
      strategy: 'BASELINE',
      steps,
      metrics,
      cipEvents,
      summary
    };
  }

  /**
   * Run PRISM scenario (consensus-based predictive CIP)
   */
  async runPRISMScenario(): Promise<SimulationResults> {
    console.log('🤖 Running PRISM scenario (consensus-based predictive)...');
    
    // Reset all simulators
    this.sensorSimulator = new SensorSimulator(this.config);
    this.molecularSimulator = new MolecularSimulator(this.config);
    this.kpiCalculator = new NormalizedKPICalculator();
    this.triggerAnalyzer = new CleaningTriggerAnalyzer(this.config.triggers);
    this.consensusEngine.reset();
    this.economicCalculator.reset();
    
    const startTime = new Date('2025-01-01T00:00:00Z');
    const steps: SimulationStep[] = [];
    let timeSinceLastCIP = 0; // hours
    let lastCIPTime = startTime.getTime();
    let recentCIPCount = 0; // CIPs in last 7 days
    
    // Generate time series data
    const totalMinutes = this.config.durationDays * 24 * 60;
    const totalSteps = Math.floor(totalMinutes / this.config.timeStepMinutes);
    
    for (let i = 0; i < totalSteps; i++) {
      const timestamp = new Date(startTime.getTime() + i * this.config.timeStepMinutes * 60 * 1000);
      timeSinceLastCIP = (timestamp.getTime() - lastCIPTime) / (1000 * 60 * 60);
      
      // Update recent CIP count (last 7 days)
      const sevenDaysAgo = timestamp.getTime() - (7 * 24 * 60 * 60 * 1000);
      recentCIPCount = this.economicCalculator.getCIPEvents()
        .filter(e => e.timestamp.getTime() > sevenDaysAgo && e.strategy === 'PRISM_IND')
        .length;
      
      // Generate sensor and molecular data
      const sensorReading = this.sensorSimulator.generateReading(timestamp);
      const molecularData = this.molecularSimulator.generateMolecularData(timestamp, sensorReading, timeSinceLastCIP);
      const normalizedKPI = this.kpiCalculator.calculateNormalizedKPI(sensorReading, molecularData);
      
      // Run consensus decision
      const consensusDecision = this.consensusEngine.executeConsensus(
        sensorReading,
        normalizedKPI,
        normalizedKPI.MHI,
        timeSinceLastCIP,
        recentCIPCount
      );
      
      let systemEvent: SystemEvent | undefined;
      let economicImpact = 0;
      
      // Execute consensus decision
      if (consensusDecision.finalRecommendation === 'SCHEDULE_CIP') {
        systemEvent = SystemEvent.SCHEDULE_CIP;
        const cipEvent: CIPEvent = {
          timestamp,
          duration: this.config.economics.downtime_CIP_h,
          reason: `PRISM consensus: ${consensusDecision.consensusType}`,
          strategy: 'PRISM_IND',
          triggered_by: consensusDecision.votes.map(v => v.agentId).join(', ')
        };
        
        economicImpact = this.economicCalculator.recordCIPEvent(cipEvent);
        
        // Reset fouling after CIP
        this.sensorSimulator.resetFouling();
        this.molecularSimulator.resetMolecularState();
        this.kpiCalculator.resetBaseline({});
        this.triggerAnalyzer.reset();
        
        lastCIPTime = timestamp.getTime();
        timeSinceLastCIP = 0;
        
        console.log(`🤖 PRISM CIP at ${timestamp.toISOString()} - ${consensusDecision.consensusType} (${economicImpact.toFixed(0)}€)`);
      } else if (consensusDecision.finalRecommendation === 'ADJUST_SETPOINTS') {
        systemEvent = SystemEvent.ADJUST_SETPOINTS;
        // Small operational cost for setpoint adjustment
        economicImpact = -25; // €25 cost for adjustment
      } else if (consensusDecision.finalRecommendation === 'INSPECT') {
        systemEvent = SystemEvent.INSPECT;
        // Small inspection cost
        economicImpact = -50; // €50 cost for inspection
      } else {
        // Record normal production
        economicImpact = this.economicCalculator.recordProduction(
          timestamp, 
          this.config.timeStepMinutes / 60,
          normalizedKPI.NPF // Use NPF as efficiency factor
        );
      }
      
      steps.push({
        timestamp,
        sensorReading,
        molecularData,
        normalizedKPI,
        consensusDecision,
        systemEvent,
        economicImpact,
        mhi: normalizedKPI.MHI,
        timeSinceLastCIP
      });
    }
    
    // Calculate metrics
    const metrics = this.economicCalculator.calculateStrategyMetrics('PRISM_IND');
    const cipEvents = this.economicCalculator.getCIPEvents().filter(e => e.strategy === 'PRISM_IND');
    
    const summary = this.calculateSummary(steps, cipEvents);
    
    console.log(`✅ PRISM completed: ${cipEvents.length} CIPs, ${metrics.totalOpex.toFixed(0)}€ OPEX`);
    
    return {
      config: this.config,
      strategy: 'PRISM',
      steps,
      metrics,
      cipEvents,
      summary
    };
  }

  /**
   * Run comparative analysis: Baseline vs PRISM
   */
  async runComparativeAnalysis(): Promise<{
    baseline: SimulationResults;
    prism: SimulationResults;
    comparison: {
      downtimeSaved: number;
      cipReduction: number;
      opexSavings: number;
      chemistrySavings: number;
      energySavings: number;
      productionGain: number;
      membraneLifeExtension: number;
      netROI: number;
      summary: string;
    };
  }> {
    console.log('📊 Running comparative analysis: Baseline vs PRISM...');
    
    // Run both scenarios
    const baseline = await this.runBaselineScenario();
    const prism = await this.runPRISMScenario();
    
    // Calculate comparison
    const comparison = {
      downtimeSaved: baseline.metrics.totalDowntime - prism.metrics.totalDowntime,
      cipReduction: baseline.metrics.cipCount - prism.metrics.cipCount,
      opexSavings: baseline.metrics.totalOpex - prism.metrics.totalOpex,
      chemistrySavings: baseline.metrics.chemistryCosts - prism.metrics.chemistryCosts,
      energySavings: baseline.metrics.energyCosts - prism.metrics.energyCosts,
      productionGain: baseline.metrics.productionLost - prism.metrics.productionLost,
      membraneLifeExtension: baseline.metrics.membraneLifeImpact - prism.metrics.membraneLifeImpact,
      netROI: prism.metrics.roi - baseline.metrics.roi,
      summary: ''
    };
    
    // Generate summary
    comparison.summary = `
PRISM vs Baseline (${this.config.durationDays} days):
• CIPs avoided: ${comparison.cipReduction} (${((comparison.cipReduction/baseline.metrics.cipCount)*100).toFixed(1)}%)
• Downtime saved: ${comparison.downtimeSaved.toFixed(1)}h
• OPEX savings: ${comparison.opexSavings.toFixed(0)}€
• Chemistry savings: ${comparison.chemistrySavings.toFixed(0)}€
• Production gain: ${comparison.productionGain.toFixed(0)}€
• Membrane life extension: ${comparison.membraneLifeExtension.toFixed(1)}%
• Net ROI: ${comparison.netROI.toFixed(0)}€
    `;
    
    console.log(comparison.summary);
    
    return { baseline, prism, comparison };
  }

  /**
   * Calculate simulation summary statistics
   */
  private calculateSummary(steps: SimulationStep[], cipEvents: CIPEvent[]): SimulationResults['summary'] {
    const mhiValues = steps.map(s => s.mhi);
    const npfDeclines = steps.map(s => Math.max(0, (1.0 - s.normalizedKPI.NPF) * 100));
    const ndpIncreases = steps.map(s => Math.max(0, (s.normalizedKPI.NDP - 1.0) * 100));
    
    return {
      totalSteps: steps.length,
      totalRuntime: steps.length * this.config.timeStepMinutes / 60,
      avgMHI: mhiValues.reduce((sum, v) => sum + v, 0) / mhiValues.length,
      minMHI: Math.min(...mhiValues),
      maxNPFDecline: Math.max(...npfDeclines),
      maxNDPIncrease: Math.max(...ndpIncreases),
      consensusDecisions: steps.filter(s => s.consensusDecision).length,
      automaticCIPs: cipEvents.length
    };
  }

  /**
   * Export simulation data to CSV
   */
  exportToCSV(results: SimulationResults): string {
    const header = [
      'timestamp',
      'turbidity_NTU',
      'conductivity_uScm',
      'pH',
      'tempC',
      'flow_m3h',
      'dP_bar',
      'SDI',
      'MFI',
      'NO3_feed_mgL',
      'SO4_feed_mgL',
      'TOC_feed_mgL',
      'NO3_permeate_mgL',
      'SO4_permeate_mgL',
      'TOC_permeate_mgL',
      'NPF',
      'NSP',
      'NDP',
      'MHI',
      'systemEvent',
      'economicImpact_EUR',
      'timeSinceLastCIP_h'
    ].join(',');
    
    const rows = results.steps.map(step => [
      step.timestamp.toISOString(),
      step.sensorReading.turbidity.toFixed(3),
      step.sensorReading.conductivity.toFixed(0),
      step.sensorReading.pH.toFixed(2),
      step.sensorReading.tempC.toFixed(1),
      step.sensorReading.flow_m3h.toFixed(1),
      step.sensorReading.dP_bar.toFixed(3),
      step.sensorReading.SDI.toFixed(2),
      step.sensorReading.MFI.toFixed(2),
      step.molecularData.feed.NO3_mgL.toFixed(1),
      step.molecularData.feed.SO4_mgL.toFixed(1),
      step.molecularData.feed.TOC_mgL.toFixed(2),
      step.molecularData.permeate.NO3_mgL.toFixed(2),
      step.molecularData.permeate.SO4_mgL.toFixed(2),
      step.molecularData.permeate.TOC_mgL.toFixed(3),
      step.normalizedKPI.NPF.toFixed(3),
      step.normalizedKPI.NSP.toFixed(3),
      step.normalizedKPI.NDP.toFixed(3),
      step.normalizedKPI.MHI.toFixed(3),
      step.systemEvent || '',
      step.economicImpact.toFixed(2),
      step.timeSinceLastCIP.toFixed(1)
    ].join(','));
    
    return [header, ...rows].join('\n');
  }
}

/**
 * Run predefined scenarios for validation
 */
export async function runValidationScenarios(): Promise<void> {
  console.log('🧪 Running validation scenarios...\n');
  
  // Scenario 1: Standard configuration
  console.log('=== Scenario 1: Standard Configuration ===');
  const runner1 = new ScenarioRunner(DEFAULT_CONFIG);
  const results1 = await runner1.runComparativeAnalysis();
  
  // Scenario 2: More aggressive fouling
  console.log('\n=== Scenario 2: Aggressive Fouling ===');
  const aggressiveConfig = {
    ...DEFAULT_CONFIG,
    triggers: {
      ...DEFAULT_CONFIG.triggers,
      npf_cip_pct: 12, // Lower threshold
      mhi_critical: 0.4 // Higher threshold
    }
  };
  const runner2 = new ScenarioRunner(aggressiveConfig);
  const results2 = await runner2.runComparativeAnalysis();
  
  // Scenario 3: Conservative approach
  console.log('\n=== Scenario 3: Conservative Approach ===');
  const conservativeConfig = {
    ...DEFAULT_CONFIG,
    triggers: {
      ...DEFAULT_CONFIG.triggers,
      npf_warning_pct: 8, // Earlier warning
      npf_cip_pct: 18, // Higher tolerance
      mhi_critical: 0.25 // Lower threshold
    }
  };
  const runner3 = new ScenarioRunner(conservativeConfig);
  const results3 = await runner3.runComparativeAnalysis();
  
  console.log('\n📋 Validation Summary:');
  console.log(`Standard ROI: ${results1.comparison.netROI.toFixed(0)}€`);
  console.log(`Aggressive ROI: ${results2.comparison.netROI.toFixed(0)}€`);
  console.log(`Conservative ROI: ${results3.comparison.netROI.toFixed(0)}€`);
}
