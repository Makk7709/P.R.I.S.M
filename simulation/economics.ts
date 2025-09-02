import { EconomicParams, StrategyMetrics, Recommendation, DEFAULT_SITE_CONFIG } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// ECONOMIC MODEL & ROI CALCULATION - PRISM-IND Water Treatment
// Baseline vs PRISM: OPEX (downtime, chemistry, energy), membrane lifespan impact
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * CIP event record for economic tracking
 */
export interface CIPEvent {
  timestamp: Date;
  duration: number; // hours
  reason: string;
  strategy: 'BASELINE' | 'PRISM_IND';
  triggered_by?: string; // Agent ID for PRISM-IND
}

/**
 * Production event record
 */
export interface ProductionEvent {
  timestamp: Date;
  duration: number; // hours
  volume: number; // m³
  value: number; // €
  lost_due_to: 'CIP' | 'FOULING' | 'MAINTENANCE' | null;
}

/**
 * Membrane lifecycle tracking
 */
export interface MembraneLifecycle {
  installDate: Date;
  initialCost: number; // €
  nominalLifeMonths: number;
  currentLifeReduction: number; // % lost due to CIPs
  replacementCost: number; // €
  residualValue: number; // €
}

/**
 * Economic calculator for water treatment operations
 */
export class EconomicCalculator {
  private params: EconomicParams;
  private cipEvents: CIPEvent[] = [];
  private productionEvents: ProductionEvent[] = [];
  private membraneLifecycle: MembraneLifecycle;

  constructor(params: EconomicParams) {
    this.params = params;
    this.membraneLifecycle = {
      installDate: new Date(),
      initialCost: params.membrane_8inch_cost_EUR * DEFAULT_SITE_CONFIG.train.vessels * DEFAULT_SITE_CONFIG.train.elements_per_vessel,
      nominalLifeMonths: 24, // Typical 2 years for brackish RO
      currentLifeReduction: 0,
      replacementCost: params.membrane_8inch_cost_EUR * DEFAULT_SITE_CONFIG.train.vessels * DEFAULT_SITE_CONFIG.train.elements_per_vessel,
      residualValue: params.membrane_8inch_cost_EUR * DEFAULT_SITE_CONFIG.train.vessels * DEFAULT_SITE_CONFIG.train.elements_per_vessel
    };
  }

  /**
   * Record a CIP event and calculate its economic impact
   */
  recordCIPEvent(event: CIPEvent): number {
    this.cipEvents.push(event);

    // Calculate direct CIP costs
    const totalElements = DEFAULT_SITE_CONFIG.train.vessels * DEFAULT_SITE_CONFIG.train.elements_per_vessel;
    const chemistryCost = this.params.chemistry_cost_per_element_EUR * totalElements;
    const energyCost = this.params.cip_energy_cost_EUR;
    const directCost = chemistryCost + energyCost;

    // Calculate production loss during CIP downtime
    const volumeLost = event.duration * DEFAULT_SITE_CONFIG.flow_nominal_m3h;
    const productionLoss = volumeLost * this.params.production_value_EUR_per_m3;

    // Update membrane lifecycle
    this.updateMembraneLifecycle();

    // Record production loss event
    this.productionEvents.push({
      timestamp: event.timestamp,
      duration: event.duration,
      volume: -volumeLost,
      value: -productionLoss,
      lost_due_to: 'CIP'
    });

    return directCost + productionLoss;
  }

  /**
   * Record production during normal operation
   */
  recordProduction(timestamp: Date, duration: number, efficiency: number = 1.0): number {
    const nominalVolume = DEFAULT_SITE_CONFIG.flow_nominal_m3h * duration;
    const actualVolume = nominalVolume * efficiency;
    const value = actualVolume * this.params.production_value_EUR_per_m3;

    this.productionEvents.push({
      timestamp,
      duration,
      volume: actualVolume,
      value,
      lost_due_to: null
    });

    return value;
  }

  /**
   * Calculate ROI for a proposed action
   */
  calculateActionROI(
    action: Recommendation,
    currentMHI: number,
    hoursUntilScheduledCIP: number
  ): number {
    switch (action) {
      case Recommendation.SCHEDULE_CIP:
        return this.calculateCIPROI(0, currentMHI);
      
      case Recommendation.INSPECT:
        return this.calculateInspectROI(currentMHI);
      
      case Recommendation.ADJUST_SETPOINTS:
        return this.calculateSetpointAdjustmentROI(currentMHI);
      
      default:
        return 0;
    }
  }

  /**
   * Calculate ROI for immediate CIP
   */
  private calculateCIPROI(delayHours: number, currentMHI: number): number {
    // Cost of CIP
    const totalElements = DEFAULT_SITE_CONFIG.train.vessels * DEFAULT_SITE_CONFIG.train.elements_per_vessel;
    const cipCost = this.params.chemistry_cost_per_element_EUR * totalElements + this.params.cip_energy_cost_EUR;
    const productionLoss = this.params.downtime_CIP_h * DEFAULT_SITE_CONFIG.flow_nominal_m3h * this.params.production_value_EUR_per_m3;
    const totalCost = cipCost + productionLoss;

    // Benefits: restore membrane performance
    const performanceRestoration = currentMHI < 0.8 ? (0.95 - currentMHI) * 1000 : 100; // €
    
    // Membrane life preservation (avoided fouling damage)
    const membraneLifeValue = this.calculateMembraneLifeValue(0.2); // 0.2% life saved by cleaning

    return performanceRestoration + membraneLifeValue - totalCost;
  }

  /**
   * Calculate ROI for inspection
   */
  private calculateInspectROI(currentMHI: number): number {
    // Cost: 1 hour of operator time (minimal cost)
    const inspectionCost = 50; // €
    
    // Benefit: better decision making, avoid unnecessary CIPs
    const informationValue = currentMHI > 0.6 ? 200 : 100; // €
    
    return informationValue - inspectionCost;
  }

  /**
   * Calculate ROI for delaying CIP
   */
  private calculateDelayROI(
    delayHours: number, 
    currentMHI: number, 
    hoursUntilScheduled: number
  ): number {
    // If already scheduled later, no benefit from delay
    if (hoursUntilScheduled > delayHours) return 0;

    // Cost of delay: potential production loss due to fouling
    const deteriorationRate = this.estimateDeterioration(currentMHI);
    const productionLossFromFouling = delayHours * this.params.productionValue * 
                                     deteriorationRate * delayHours * 0.01; // Quadratic deterioration

    // Benefit: continued production without CIP downtime
    const continuedProduction = delayHours * this.params.productionValue * 
                               Math.max(0.5, currentMHI); // Minimum 50% efficiency

    // Risk: potential membrane damage if MHI drops too low
    const membraneRisk = currentMHI < 0.3 ? 
                        this.calculateMembraneLifeValue(-1.0) : 0; // 1% life risk

    return continuedProduction - productionLossFromFouling - membraneRisk;
  }

  /**
   * Calculate ROI for setpoint adjustments
   */
  private calculateSetpointAdjustmentROI(currentMHI: number): number {
    // Cost: slightly reduced production efficiency
    const efficiencyReduction = 0.05; // 5% efficiency loss
    const productionLoss = 24 * this.params.productionValue * efficiencyReduction;

    // Benefit: extended membrane life by reducing stress
    const mhiImprovement = 0.02; // 2% MHI improvement
    const extendedProduction = 48 * this.params.productionValue * mhiImprovement;
    const membraneLifeValue = this.calculateMembraneLifeValue(0.5); // 0.5% life extension

    return extendedProduction + membraneLifeValue - productionLoss;
  }

  /**
   * Estimate deterioration rate based on current MHI
   */
  private estimateDeterioration(currentMHI: number): number {
    // Higher deterioration rate for lower MHI
    if (currentMHI > 0.7) return 0.001; // 0.1% per hour
    if (currentMHI > 0.5) return 0.002; // 0.2% per hour
    if (currentMHI > 0.3) return 0.005; // 0.5% per hour
    return 0.01; // 1% per hour for critical conditions
  }

  /**
   * Calculate membrane life value change
   */
  private calculateMembraneLifeValue(lifeChangePercent: number): number {
    const totalValue = this.params.membraneCost;
    const monthlyValue = totalValue / this.params.nominalMembraneLife;
    const dailyValue = monthlyValue / 30;
    
    return (lifeChangePercent / 100) * dailyValue * 30; // Value of 1 month of life
  }

  /**
   * Update membrane lifecycle after CIP
   */
  private updateMembraneLifecycle(): void {
    this.membraneLifecycle.currentLifeReduction += this.params.membrane_life_reduction_per_cip_pct;
    
    const remainingLife = 1 - (this.membraneLifecycle.currentLifeReduction / 100);
    this.membraneLifecycle.residualValue = 
      this.membraneLifecycle.initialCost * Math.max(0, remainingLife);
  }

  /**
   * Calculate comprehensive strategy metrics
   */
  calculateStrategyMetrics(strategy: 'BASELINE' | 'PRISM_IND'): StrategyMetrics {
    const strategyEvents = this.cipEvents.filter(e => e.strategy === strategy);
    const strategyProduction = this.productionEvents.filter(e => 
      e.lost_due_to === null || 
      (e.lost_due_to === 'CIP' && 
       this.cipEvents.some(c => c.strategy === strategy && c.timestamp === e.timestamp))
    );

    // Calculate total downtime
    const totalDowntime = strategyEvents.reduce((sum, e) => sum + e.duration, 0);

    // Calculate total OPEX components
    const totalElements = DEFAULT_SITE_CONFIG.train.vessels * DEFAULT_SITE_CONFIG.train.elements_per_vessel;
    const chemistryCosts = strategyEvents.length * this.params.chemistry_cost_per_element_EUR * totalElements;
    const energyCosts = strategyEvents.length * this.params.cip_energy_cost_EUR;
    const totalOpex = chemistryCosts + energyCosts;

    // Calculate production impact
    const totalProduction = strategyProduction.reduce((sum, e) => sum + e.value, 0);
    const lostProduction = strategyProduction
      .filter(e => e.value < 0)
      .reduce((sum, e) => sum + Math.abs(e.value), 0);
    const productionImpact = totalProduction - lostProduction;

    // Calculate remaining membrane life
    const cipCount = strategyEvents.length;
    const lifeReduction = cipCount * this.params.membrane_life_reduction_per_cip_pct;
    const membraneLifeImpact = lifeReduction;

    // Calculate ROI vs baseline
    const baselineOpex = this.calculateBaselineOpex();
    const costSavings = baselineOpex - totalOpex;
    const roi = costSavings + (totalProduction - lostProduction);

    return {
      totalDowntime,
      cipCount,
      totalOpex,
      chemistryCosts,
      energyCosts,
      productionLost: lostProduction,
      membraneLifeImpact,
      roi
    };
  }

  /**
   * Calculate baseline OPEX for comparison (CIP every 48h)
   */
  private calculateBaselineOpex(): number {
    // Baseline strategy: CIP every 48 hours for simulation period
    const cipCount = Math.floor(10 * 24 / 48); // 10 days simulation
    const totalElements = DEFAULT_SITE_CONFIG.train.vessels * DEFAULT_SITE_CONFIG.train.elements_per_vessel;
    return cipCount * (
      this.params.chemistry_cost_per_element_EUR * totalElements + 
      this.params.cip_energy_cost_EUR
    );
  }

  /**
   * Generate economic summary report
   */
  generateEconomicSummary(): {
    baseline: StrategyMetrics;
    prismInd: StrategyMetrics;
    comparison: {
      downtimeSaved: number;
      cipReduction: number;
      opexSavings: number;
      productionGain: number;
      membraneLifeExtension: number;
      netROI: number;
    };
  } {
    const baseline = this.calculateStrategyMetrics('BASELINE');
    const prismInd = this.calculateStrategyMetrics('PRISM_IND');

    const comparison = {
      downtimeSaved: baseline.totalDowntime - prismInd.totalDowntime,
      cipReduction: baseline.cipCount - prismInd.cipCount,
      opexSavings: baseline.totalOpex - prismInd.totalOpex,
      chemistrySavings: baseline.chemistryCosts - prismInd.chemistryCosts,
      energySavings: baseline.energyCosts - prismInd.energyCosts,
      productionGain: prismInd.productionLost - baseline.productionLost,
      membraneLifeExtension: baseline.membraneLifeImpact - prismInd.membraneLifeImpact,
      netROI: prismInd.roi - baseline.roi
    };

    return { baseline, prismInd, comparison };
  }

  /**
   * Get CIP events for audit trail
   */
  getCIPEvents(): CIPEvent[] {
    return [...this.cipEvents];
  }

  /**
   * Get production events for analysis
   */
  getProductionEvents(): ProductionEvent[] {
    return [...this.productionEvents];
  }

  /**
   * Get current membrane status
   */
  getMembraneStatus(): MembraneLifecycle {
    return { ...this.membraneLifecycle };
  }

  /**
   * Reset calculator state
   */
  reset(): void {
    this.cipEvents = [];
    this.productionEvents = [];
    this.membraneLifecycle = {
      installDate: new Date(),
      initialCost: this.params.membrane_8inch_cost_EUR * DEFAULT_SITE_CONFIG.train.vessels * DEFAULT_SITE_CONFIG.train.elements_per_vessel,
      nominalLifeMonths: 24, // Typical 2 years for brackish RO
      currentLifeReduction: 0,
      replacementCost: this.params.membrane_8inch_cost_EUR * DEFAULT_SITE_CONFIG.train.vessels * DEFAULT_SITE_CONFIG.train.elements_per_vessel,
      residualValue: this.params.membrane_8inch_cost_EUR * DEFAULT_SITE_CONFIG.train.vessels * DEFAULT_SITE_CONFIG.train.elements_per_vessel
    };
  }
}
