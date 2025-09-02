#!/usr/bin/env tsx

import { 
  DEFAULT_CONFIG, 
  DEFAULT_BASELINE, 
  SimulationConfig, 
  BaselineStrategy,
  SensorReading,
  MHI,
  Recommendation,
  ConsensusDecision
} from './types.js';
import { SensorSimulator, generateSensorTimeSeries } from './sensors.js';
import { MHICalculator, calculateMHITimeSeries } from './fouling_model.js';
import { EconomicCalculator, CIPEvent } from './economics.js';
import { ConsensusEngine } from './consensus.js';
import { generateMarkdownReport, generateHTMLReport } from './report_generator.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ═══════════════════════════════════════════════════════════════════════════════════
// PRISM-IND WATER TREATMENT SIMULATION - MAIN CLI
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Simulation state tracking
 */
interface SimulationState {
  sensorReadings: SensorReading[];
  mhiValues: MHI[];
  consensusDecisions: ConsensusDecision[];
  baselineCIPs: CIPEvent[];
  prismCIPs: CIPEvent[];
  currentTime: Date;
  lastCIPTime: Date;
  simulationStep: number;
}

/**
 * Main PRISM-IND simulation orchestrator
 */
class PRISMIndSimulation {
  private config: SimulationConfig;
  private baselineStrategy: BaselineStrategy;
  private sensorSimulator: SensorSimulator;
  private mhiCalculator: MHICalculator;
  private economicCalculator: EconomicCalculator;
  private consensusEngine: ConsensusEngine;
  private state: SimulationState;

  constructor(config: SimulationConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.baselineStrategy = DEFAULT_BASELINE;
    
    // Initialize components
    this.sensorSimulator = new SensorSimulator(config);
    this.mhiCalculator = new MHICalculator();
    this.economicCalculator = new EconomicCalculator(config.economics);
    this.consensusEngine = new ConsensusEngine();
    
    // Initialize simulation state
    const startTime = new Date();
    this.state = {
      sensorReadings: [],
      mhiValues: [],
      consensusDecisions: [],
      baselineCIPs: [],
      prismCIPs: [],
      currentTime: startTime,
      lastCIPTime: new Date(startTime.getTime() - 24 * 60 * 60 * 1000), // 24h ago
      simulationStep: 0
    };
  }

  /**
   * Execute complete simulation scenario
   */
  async runSimulation(): Promise<void> {
    console.log('🎯 PRISM-IND Water Treatment Simulation Starting...\n');
    console.log(`📊 Configuration: ${this.config.durationDays} days, ${this.config.timeStepMinutes}min steps`);
    console.log(`🌱 Random seed: ${this.config.seed}\n`);

    const totalSteps = (this.config.durationDays * 24 * 60) / this.config.timeStepMinutes;
    const reportInterval = Math.floor(totalSteps / 20); // Report every 5%

    for (let step = 0; step < totalSteps; step++) {
      await this.executeSimulationStep(step);
      
      // Progress reporting
      if (step % reportInterval === 0 || step === totalSteps - 1) {
        const progress = ((step + 1) / totalSteps * 100).toFixed(1);
        console.log(`⏳ Progress: ${progress}% (Step ${step + 1}/${totalSteps})`);
      }
    }

    console.log('\n✅ Simulation completed successfully');
    await this.generateReports();
  }

  /**
   * Execute single simulation time step
   */
  private async executeSimulationStep(step: number): Promise<void> {
    const stepTime = new Date(this.state.currentTime.getTime() + step * this.config.timeStepMinutes * 60 * 1000);
    
    // Generate sensor reading
    const sensorReading = this.sensorSimulator.generateReading(stepTime);
    this.state.sensorReadings.push(sensorReading);
    
    // Calculate MHI
    const mhi = this.mhiCalculator.calculateMHI(sensorReading);
    this.state.mhiValues.push(mhi);
    
    // Check baseline strategy (calendar-based CIP)
    await this.checkBaselineStrategy(stepTime, mhi);
    
    // Execute PRISM-IND consensus decision
    await this.executePRISMDecision(stepTime, sensorReading, mhi);
    
    // Record production for both strategies
    this.recordProduction(stepTime);
    
    this.state.simulationStep = step;
  }

  /**
   * Check if baseline strategy triggers CIP
   */
  private async checkBaselineStrategy(currentTime: Date, mhi: MHI): Promise<void> {
    const hoursSinceLastCIP = (currentTime.getTime() - this.state.lastCIPTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastCIP >= this.baselineStrategy.cipIntervalHours) {
      // Trigger baseline CIP
      const cipEvent: CIPEvent = {
        timestamp: currentTime,
        duration: this.baselineStrategy.cipDuration,
        reason: 'Calendar-based maintenance',
        strategy: 'BASELINE'
      };
      
      this.state.baselineCIPs.push(cipEvent);
      this.economicCalculator.recordCIPEvent(cipEvent);
      
      // Reset sensor simulator fouling state
      this.sensorSimulator.resetFouling();
      this.mhiCalculator.reset();
      
      this.state.lastCIPTime = currentTime;
      
      console.log(`🧹 Baseline CIP executed at ${currentTime.toISOString()} (MHI: ${mhi.value.toFixed(3)})`);
    }
  }

  /**
   * Execute PRISM-IND consensus decision process
   */
  private async executePRISMDecision(
    currentTime: Date, 
    sensorReading: SensorReading, 
    mhi: MHI
  ): Promise<void> {
    const hoursUntilScheduledCIP = this.getHoursUntilScheduledCIP(currentTime);
    
    // Only make decisions every hour to avoid excessive processing
    if (this.state.simulationStep % Math.floor(60 / this.config.timeStepMinutes) !== 0) {
      return;
    }
    
    // Execute consensus
    const decision = await this.consensusEngine.executeConsensus(
      sensorReading,
      mhi,
      this.economicCalculator,
      hoursUntilScheduledCIP
    );
    
    this.state.consensusDecisions.push(decision);
    
    // Execute the decided action
    await this.executeRecommendation(decision.finalRecommendation, currentTime, mhi);
  }

  /**
   * Execute the consensus recommendation
   */
  private async executeRecommendation(
    recommendation: Recommendation,
    currentTime: Date,
    mhi: MHI
  ): Promise<void> {
    switch (recommendation) {
      case Recommendation.CLEAN_NOW:
        const cipEvent: CIPEvent = {
          timestamp: currentTime,
          duration: this.config.economics.cipDuration,
          reason: `PRISM-IND Consensus: Clean now (MHI: ${mhi.value.toFixed(3)})`,
          strategy: 'PRISM_IND',
          triggered_by: 'CONSENSUS_ENGINE'
        };
        
        this.state.prismCIPs.push(cipEvent);
        this.economicCalculator.recordCIPEvent(cipEvent);
        
        // Reset fouling state
        this.sensorSimulator.resetFouling();
        this.mhiCalculator.reset();
        
        console.log(`🤖 PRISM-IND CIP executed at ${currentTime.toISOString()} (MHI: ${mhi.value.toFixed(3)})`);
        break;
        
      case Recommendation.ADJUST_SETPOINTS:
        // Simulate setpoint adjustment - slight efficiency reduction but membrane preservation
        console.log(`⚙️  PRISM-IND Setpoint adjustment at ${currentTime.toISOString()} (MHI: ${mhi.value.toFixed(3)})`);
        break;
        
      case Recommendation.DELAY_12H:
      case Recommendation.DELAY_24H:
        // Just continue monitoring - no immediate action
        const delayHours = recommendation === Recommendation.DELAY_12H ? 12 : 24;
        console.log(`⏸️  PRISM-IND Delay ${delayHours}h at ${currentTime.toISOString()} (MHI: ${mhi.value.toFixed(3)})`);
        break;
    }
  }

  /**
   * Record production for economic analysis
   */
  private recordProduction(currentTime: Date): void {
    const stepHours = this.config.timeStepMinutes / 60;
    
    // Check if currently in CIP downtime
    const isInCIP = this.isCurrentlyInCIP(currentTime);
    
    if (!isInCIP) {
      // Normal production
      const efficiency = this.calculateCurrentEfficiency();
      this.economicCalculator.recordProduction(currentTime, stepHours, efficiency);
    }
  }

  /**
   * Check if currently in CIP downtime
   */
  private isCurrentlyInCIP(currentTime: Date): boolean {
    const allCIPs = [...this.state.baselineCIPs, ...this.state.prismCIPs];
    
    return allCIPs.some(cip => {
      const cipEnd = new Date(cip.timestamp.getTime() + cip.duration * 60 * 60 * 1000);
      return currentTime >= cip.timestamp && currentTime <= cipEnd;
    });
  }

  /**
   * Calculate current production efficiency based on MHI
   */
  private calculateCurrentEfficiency(): number {
    if (this.state.mhiValues.length === 0) return 1.0;
    
    const latestMHI = this.state.mhiValues[this.state.mhiValues.length - 1];
    
    // Efficiency correlates with MHI
    if (latestMHI.value > 0.8) return 1.0;
    if (latestMHI.value > 0.6) return 0.95;
    if (latestMHI.value > 0.4) return 0.85;
    if (latestMHI.value > 0.2) return 0.70;
    return 0.50; // Severe fouling
  }

  /**
   * Get hours until next scheduled baseline CIP
   */
  private getHoursUntilScheduledCIP(currentTime: Date): number {
    const hoursSinceLastCIP = (currentTime.getTime() - this.state.lastCIPTime.getTime()) / (1000 * 60 * 60);
    return Math.max(0, this.baselineStrategy.cipIntervalHours - hoursSinceLastCIP);
  }

  /**
   * Generate comprehensive reports
   */
  private async generateReports(): Promise<void> {
    console.log('\n📊 Generating reports...');
    
    // Ensure reports directory exists
    const reportsDir = join(process.cwd(), 'reports');
    mkdirSync(reportsDir, { recursive: true });
    
    // Calculate final metrics
    const economicSummary = this.economicCalculator.generateEconomicSummary();
    
    // Generate simulation summary
    const summary = this.generateSimulationSummary(economicSummary);
    
    console.log('\n📈 SIMULATION RESULTS SUMMARY');
    console.log('═'.repeat(50));
    console.log(`⏱️  Total simulation time: ${this.config.durationDays} days`);
    console.log(`📊 Total sensor readings: ${this.state.sensorReadings.length}`);
    console.log(`🤖 Consensus decisions: ${this.state.consensusDecisions.length}`);
    console.log(`🧹 Baseline CIPs: ${this.state.baselineCIPs.length}`);
    console.log(`🤖 PRISM-IND CIPs: ${this.state.prismCIPs.length}`);
    
    console.log('\n💰 ECONOMIC COMPARISON');
    console.log('─'.repeat(50));
    console.log(`💵 Baseline OPEX: €${economicSummary.baseline.totalOpex.toFixed(0)}`);
    console.log(`💵 PRISM-IND OPEX: €${economicSummary.prismInd.totalOpex.toFixed(0)}`);
    console.log(`💰 OPEX Savings: €${economicSummary.comparison.opexSavings.toFixed(0)}`);
    console.log(`⏱️  Downtime Saved: ${economicSummary.comparison.downtimeSaved.toFixed(1)}h`);
    console.log(`🏭 Production Gain: €${economicSummary.comparison.productionGain.toFixed(0)}`);
    console.log(`📊 Net ROI: €${economicSummary.comparison.netROI.toFixed(0)}`);
    
    // Generate markdown report
    const markdownReport = await generateMarkdownReport(summary, this.state, economicSummary, this.config);
    const markdownPath = join(reportsDir, 'Scenario_SOCRATE_PRISM_Industrie.md');
    writeFileSync(markdownPath, markdownReport, 'utf8');
    console.log(`📝 Markdown report: ${markdownPath}`);
    
    // Generate HTML report
    const htmlReport = await generateHTMLReport(markdownReport);
    const htmlPath = join(reportsDir, 'Scenario_SOCRATE_PRISM_Industrie.html');
    writeFileSync(htmlPath, htmlReport, 'utf8');
    console.log(`🌐 HTML report: ${htmlPath}`);
    
    console.log('\n✅ Reports generated successfully!');
  }

  /**
   * Generate simulation summary object
   */
  private generateSimulationSummary(economicSummary: any) {
    return {
      config: this.config,
      duration: this.config.durationDays,
      totalSteps: this.state.simulationStep,
      sensorReadingsCount: this.state.sensorReadings.length,
      consensusDecisionsCount: this.state.consensusDecisions.length,
      baselineCIPsCount: this.state.baselineCIPs.length,
      prismCIPsCount: this.state.prismCIPs.length,
      averageMHI: this.state.mhiValues.reduce((sum, mhi) => sum + mhi.value, 0) / this.state.mhiValues.length,
      finalMHI: this.state.mhiValues[this.state.mhiValues.length - 1]?.value || 0,
      economicSummary,
      agentProfiles: this.consensusEngine.getAgentProfiles(),
      mhiWeights: this.mhiCalculator.getWeights(),
      mhiReferences: this.mhiCalculator.getReferences()
    };
  }
}

/**
 * CLI Entry Point
 */
async function main() {
  try {
    const simulation = new PRISMIndSimulation();
    await simulation.runSimulation();
    
    console.log('\n🎉 PRISM-IND simulation completed successfully!');
    console.log('📄 Check the /reports directory for detailed analysis.');
    
  } catch (error) {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PRISMIndSimulation };
