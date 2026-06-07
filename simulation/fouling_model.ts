import { SensorReading, MHI, DataQuality, NormalizedKPI, MolecularData, TriggerThresholds } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// MEMBRANE FOULING MODEL & NORMALIZED KPI - PRISM-IND Water Treatment
// Includes NPF, NSP, NDP calculations and trigger thresholds
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Baseline values for normalized KPI calculations
 */
interface BaselineKPI {
  /** Reference permeate flow at standard conditions (m³/h) */
  baselineFlow: number;
  /** Reference temperature for normalization (°C) */
  referenceTemp: number;
  /** Reference differential pressure (bar) */
  baselineDeltaP: number;
  /** Reference salt passage (%) */
  baselineSaltPassage: number;
  /** Initial feed conductivity (µS/cm) */
  referenceConductivity: number;
}

/**
 * MHI calculation weights (documented and tunable)
 */
interface MHIWeights {
  /** Weight for NPF penalty */
  npf: number;
  /** Weight for NDP penalty */
  ndp: number;
  /** Weight for NSP penalty */
  nsp: number;
  /** Weight for SDI penalty */
  sdi: number;
  /** Weight for MFI penalty */
  mfi: number;
}

/**
 * Normalized KPI Calculator for membrane systems
 */
export class NormalizedKPICalculator {
  private baseline: BaselineKPI;
  private weights: MHIWeights;
  
  constructor(
    baseline: BaselineKPI = {
      baselineFlow: 100, // m³/h
      referenceTemp: 25, // °C
      baselineDeltaP: 1.2, // bar
      baselineSaltPassage: 2, // %
      referenceConductivity: 2000 // µS/cm
    },
    weights: MHIWeights = {
      npf: 0.35,
      ndp: 0.25,
      nsp: 0.2,
      sdi: 0.1,
      mfi: 0.1
    }
  ) {
    this.baseline = baseline;
    this.weights = weights;
    
    // Validate weights sum to 1.0
    const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(weightSum - 1) > 0.01) {
      throw new Error(`MHI weights must sum to 1.0, got ${weightSum}`);
    }
  }

  /**
   * Calculate all normalized KPIs
   */
  calculateNormalizedKPI(
    sensorReading: SensorReading,
    molecularData: MolecularData
  ): NormalizedKPI {
    
    const npf = this.calculateNPF(sensorReading);
    const nsp = this.calculateNSP(sensorReading, molecularData);
    const ndp = this.calculateNDP(sensorReading);
    const mhi = this.calculateMHI(npf, ndp, nsp, sensorReading);

    return {
      NPF: npf,
      NSP: nsp,
      NDP: ndp,
      MHI: mhi,
      timestamp: sensorReading.timestamp
    };
  }

  /**
   * Calculate Normalized Permeate Flow (temperature corrected)
   * NPF = (Current Flow / Baseline Flow) × TCF
   * TCF = exp(2640 × (1/T_ref - 1/T_current)) where T in Kelvin
   */
  private calculateNPF(reading: SensorReading): number {
    const T_ref = this.baseline.referenceTemp + 273.15; // K
    const T_current = reading.tempC + 273.15; // K
    
    // Temperature correction factor (viscosity dependency)
    const TCF = Math.exp(2640 * (1/T_ref - 1/T_current));
    
    const normalizedFlow = reading.flow_m3h / this.baseline.baselineFlow;
    
    return normalizedFlow * TCF;
  }

  /**
   * Calculate Normalized Salt Passage
   * NSP = (Permeate Conductivity / Feed Conductivity) × 100%
   * Estimated from molecular rejection data
   */
  private calculateNSP(reading: SensorReading, molecular: MolecularData): number {
    // Estimate permeate conductivity from ionic species
    const permeateContribution = 
      molecular.permeate.NO3_mgL * 0.6 +  // NO3 conductivity factor
      molecular.permeate.SO4_mgL * 1;   // SO4 conductivity factor
    
    // Simple estimation (in practice would measure directly)
    const estimatedPermeateConc = permeateContribution * 2; // µS/cm
    
    const saltPassage = (estimatedPermeateConc / reading.conductivity) * 100;
    
    return Math.max(0.1, Math.min(10, saltPassage)); // Clamp to realistic range
  }

  /**
   * Calculate Normalized Differential Pressure
   * NDP = Current ΔP / Baseline ΔP
   */
  private calculateNDP(reading: SensorReading): number {
    return reading.dP_bar / this.baseline.baselineDeltaP;
  }

  /**
   * Calculate Membrane Health Index from normalized KPIs
   */
  private calculateMHI(npf: number, ndp: number, nsp: number, reading: SensorReading): number {
    // NPF penalty (lower is worse)
    const npfPenalty = Math.max(0, (1 - npf) * 2); // Penalty if NPF < 100%
    
    // NDP penalty (higher is worse)  
    const ndpPenalty = Math.max(0, (ndp - 1) * 1.5); // Penalty if NDP > 100%
    
    // NSP penalty (higher is worse)
    const nspPenalty = Math.max(0, (nsp - this.baseline.baselineSaltPassage) * 0.1);
    
    // SDI penalty
    const sdiPenalty = Math.max(0, (reading.SDI - 3) * 0.2); // Target SDI < 3
    
    // MFI penalty
    const mfiPenalty = Math.max(0, (reading.MFI - 5) * 0.1); // Target MFI < 5
    
    // Calculate weighted MHI
    const mhi = Math.max(0, 1 - (
      this.weights.npf * npfPenalty +
      this.weights.ndp * ndpPenalty +
      this.weights.nsp * nspPenalty +
      this.weights.sdi * sdiPenalty +
      this.weights.mfi * mfiPenalty
    ));
    
    return Math.min(1, mhi);
  }

  /**
   * Reset baseline values (after CIP or system restart)
   */
  resetBaseline(newBaseline: Partial<BaselineKPI>): void {
    this.baseline = { ...this.baseline, ...newBaseline };
  }
}

/**
 * Cleaning trigger analysis based on normalized KPIs
 */
export class CleaningTriggerAnalyzer {
  private thresholds: TriggerThresholds;
  private kpiHistory: NormalizedKPI[] = [];
  private readonly maxHistoryLength = 60; // 5 hours at 5-min intervals

  constructor(thresholds: TriggerThresholds) {
    this.thresholds = thresholds;
  }

  /**
   * Analyze cleaning triggers based on current and historical KPIs
   */
  analyzeTriggers(
    currentKPI: NormalizedKPI,
    sensorReading: SensorReading
  ): {
    triggersActive: string[];
    npfDeclinePercent: number;
    ndpIncreasePercent: number;
    sdiPersistent: boolean;
    mfiElevated: boolean;
    mhiCritical: boolean;
    recommendAction: 'ADJUST_SETPOINTS' | 'SCHEDULE_CIP' | 'INSPECT' | 'CONTINUE';
  } {
    
    // Add to history
    this.addToHistory(currentKPI);
    
    const triggers: string[] = [];
    
    // NPF decline analysis
    const npfDecline = this.calculateNPFDecline();
    if (npfDecline >= this.thresholds.npf_warning_pct) {
      triggers.push(`NPF declined ${npfDecline.toFixed(1)}%`);
    }
    
    // NDP increase analysis  
    const ndpIncrease = this.calculateNDPIncrease();
    if (ndpIncrease >= this.thresholds.ndp_cip_pct) {
      triggers.push(`NDP increased ${ndpIncrease.toFixed(1)}%`);
    }
    
    // SDI persistent high
    const sdiPersistent = this.isSDIPersistentHigh(sensorReading);
    if (sdiPersistent) {
      triggers.push('SDI persistently high >24h');
    }
    
    // MFI elevated
    const mfiElevated = sensorReading.MFI > this.thresholds.mfi_high_threshold;
    if (mfiElevated) {
      triggers.push(`MFI elevated: ${sensorReading.MFI.toFixed(1)}`);
    }
    
    // MHI critical
    const mhiCritical = currentKPI.MHI < this.thresholds.mhi_critical;
    if (mhiCritical) {
      triggers.push(`MHI critical: ${(currentKPI.MHI * 100).toFixed(1)}%`);
    }
    
    // Determine recommended action
    const recommendAction = this.determineRecommendedAction(
      npfDecline, ndpIncrease, sdiPersistent, mfiElevated, mhiCritical
    );
    
    return {
      triggersActive: triggers,
      npfDeclinePercent: npfDecline,
      ndpIncreasePercent: ndpIncrease,
      sdiPersistent,
      mfiElevated,
      mhiCritical,
      recommendAction
    };
  }

  /**
   * Calculate NPF decline percentage from baseline
   */
  private calculateNPFDecline(): number {
    if (this.kpiHistory.length < 2) return 0;
    
    const current = this.kpiHistory[this.kpiHistory.length - 1];
    const baseline = 1; // 100% baseline
    
    return Math.max(0, (baseline - current.NPF) * 100);
  }

  /**
   * Calculate NDP increase percentage from baseline
   */
  private calculateNDPIncrease(): number {
    if (this.kpiHistory.length < 2) return 0;
    
    const current = this.kpiHistory[this.kpiHistory.length - 1];
    const baseline = 1; // 100% baseline
    
    return Math.max(0, (current.NDP - baseline) * 100);
  }

  /**
   * Check if SDI has been persistently high (>24h)
   */
  private isSDIPersistentHigh(reading: SensorReading): boolean {
    // Simplified: would need 24h of readings to check properly
    // For simulation, check if SDI > threshold
    return reading.SDI > this.thresholds.sdi_high_threshold;
  }

  /**
   * Determine recommended action based on trigger analysis
   */
  private determineRecommendedAction(
    npfDecline: number,
    ndpIncrease: number,
    sdiPersistent: boolean,
    mfiElevated: boolean,
    mhiCritical: boolean
  ): 'ADJUST_SETPOINTS' | 'SCHEDULE_CIP' | 'INSPECT' | 'CONTINUE' {
    
    // Critical conditions - immediate CIP
    if (mhiCritical || npfDecline >= this.thresholds.npf_cip_pct || ndpIncrease >= this.thresholds.ndp_cip_pct) {
      return 'SCHEDULE_CIP';
    }
    
    // Warning conditions - inspect or adjust
    if (npfDecline >= this.thresholds.npf_warning_pct || sdiPersistent || mfiElevated) {
      if (npfDecline >= 12 || sdiPersistent) {
        return 'INSPECT';
      } else {
        return 'ADJUST_SETPOINTS';
      }
    }
    
    return 'CONTINUE';
  }

  /**
   * Add KPI reading to history
   */
  private addToHistory(kpi: NormalizedKPI): void {
    this.kpiHistory.push(kpi);
    
    if (this.kpiHistory.length > this.maxHistoryLength) {
      this.kpiHistory.shift();
    }
  }

  /**
   * Reset trigger history (after CIP)
   */
  reset(): void {
    this.kpiHistory = [];
  }

  /**
   * Get trigger thresholds for reporting
   */
  getThresholds(): TriggerThresholds {
    return { ...this.thresholds };
  }
}

/**
 * Membrane Health Index Calculator
 */
export class MHICalculator {
  private weights: MHIWeights;
  private references: ReferenceValues;
  private historicalReadings: SensorReading[] = [];
  private readonly maxHistoryLength = 60; // Keep last 60 readings for trend analysis

  constructor(
    weights: MHIWeights = {
      pressure: 0.35,
      flux: 0.3,
      turbidity: 0.15,
      temperature: 0.1,
      pH: 0.1
    },
    references: ReferenceValues = {
      baselinePressure: 0.8,
      baselineFlux: 45,
      maxTurbidity: 2,
      optimalTemperature: 20,
      optimalPH: { min: 6.8, max: 7.4 }
    }
  ) {
    this.weights = weights;
    this.references = references;
    
    // Validate weights sum to 1.0
    const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(weightSum - 1) > 0.01) {
      throw new Error(`MHI weights must sum to 1.0, got ${weightSum}`);
    }
  }

  /**
   * Calculate Membrane Health Index from sensor reading
   */
  calculateMHI(reading: SensorReading): MHI {
    // Skip calculation for bad quality data
    if (reading.quality === DataQuality.BAD || reading.quality === DataQuality.MISSING) {
      return this.getDefaultMHI(reading.timestamp);
    }

    // Add to historical data
    this.addToHistory(reading);

    // Calculate individual factor penalties/corrections
    const pressurePenalty = this.calculatePressurePenalty(reading);
    const fluxPenalty = this.calculateFluxPenalty(reading);
    const turbidityPenalty = this.calculateTurbidityPenalty(reading);
    const temperatureCorrection = this.calculateTemperatureCorrection(reading);
    const pHRisk = this.calculatePHRisk(reading);

    // Calculate weighted MHI score
    const mhiValue = this.clamp(
      1 - 
      (this.weights.pressure * pressurePenalty) -
      (this.weights.flux * fluxPenalty) -
      (this.weights.turbidity * turbidityPenalty) -
      (this.weights.temperature * temperatureCorrection) -
      (this.weights.pH * pHRisk),
      0,
      1
    );

    return {
      value: mhiValue,
      factors: {
        pressurePenalty,
        fluxPenalty,
        turbidityPenalty,
        temperatureCorrection,
        pHRisk
      },
      timestamp: reading.timestamp
    };
  }

  /**
   * Calculate pressure penalty factor [0,1]
   * Higher pressure indicates more fouling resistance
   */
  private calculatePressurePenalty(reading: SensorReading): number {
    const normalizedPressure = reading.deltaPressure / this.references.baselinePressure;
    
    // Penalty increases exponentially above baseline
    if (normalizedPressure <= 1) {
      return 0;
    } else if (normalizedPressure <= 1.5) {
      // Linear increase for mild fouling
      return (normalizedPressure - 1) * 0.4; // Max 0.2 penalty at 1.5x
    } else {
      // Exponential increase for severe fouling
      const excessPressure = normalizedPressure - 1.5;
      return 0.2 + Math.min(0.8, Math.pow(excessPressure, 1.5));
    }
  }

  /**
   * Calculate flux penalty factor [0,1]
   * Lower flux indicates reduced membrane permeability
   */
  private calculateFluxPenalty(reading: SensorReading): number {
    const normalizedFlux = reading.permeateFlux / this.references.baselineFlux;
    
    // Penalty increases as flux drops below baseline
    if (normalizedFlux >= 1) {
      return 0;
    } else if (normalizedFlux >= 0.8) {
      // Linear increase for mild flux reduction
      return (1 - normalizedFlux) * 1; // Max 0.2 penalty at 80% flux
    } else {
      // Exponential increase for severe flux reduction
      const fluxDeficit = 0.8 - normalizedFlux;
      return 0.2 + Math.min(0.8, Math.pow(fluxDeficit * 2.5, 1.2));
    }
  }

  /**
   * Calculate turbidity penalty factor [0,1]
   * Higher turbidity indicates fouling potential
   */
  private calculateTurbidityPenalty(reading: SensorReading): number {
    const normalizedTurbidity = reading.turbidity / this.references.maxTurbidity;
    
    if (normalizedTurbidity <= 0.5) {
      return 0; // Very low turbidity, no penalty
    } else if (normalizedTurbidity <= 1) {
      // Linear increase for moderate turbidity
      return (normalizedTurbidity - 0.5) * 0.4; // Max 0.2 penalty at max turbidity
    } else {
      // Severe turbidity conditions
      return 0.2 + Math.min(0.8, (normalizedTurbidity - 1) * 0.8);
    }
  }

  /**
   * Calculate temperature correction factor [0,1]
   * Temperature affects viscosity and fouling kinetics
   */
  private calculateTemperatureCorrection(reading: SensorReading): number {
    const tempDiff = Math.abs(reading.temperature - this.references.optimalTemperature);
    
    if (tempDiff <= 2) {
      return 0; // Within optimal range
    } else if (tempDiff <= 5) {
      // Minor temperature deviation
      return (tempDiff - 2) * 0.03; // Max 0.09 penalty at ±5°C
    } else {
      // Significant temperature deviation
      return 0.09 + Math.min(0.21, (tempDiff - 5) * 0.03);
    }
  }

  /**
   * Calculate pH risk factor [0,1]
   * pH outside optimal range can damage membrane or affect fouling
   */
  private calculatePHRisk(reading: SensorReading): number {
    const { min, max } = this.references.optimalPH;
    
    if (reading.pH >= min && reading.pH <= max) {
      return 0; // Within optimal range
    }
    
    const deviation = Math.max(
      min - reading.pH,
      reading.pH - max
    );
    
    if (deviation <= 0.3) {
      // Minor pH deviation
      return deviation * 0.2; // Max 0.06 penalty at ±0.3 pH
    } else {
      // Significant pH deviation - chemical risk
      return 0.06 + Math.min(0.24, (deviation - 0.3) * 0.4);
    }
  }

  /**
   * Get trend-based MHI adjustment
   * Analyzes recent trends to predict deterioration
   */
  getTrendAdjustment(): number {
    if (this.historicalReadings.length < 10) {
      return 0; // Insufficient data for trend analysis
    }

    const recent = this.historicalReadings.slice(-10);
    const older = this.historicalReadings.slice(-20, -10);
    
    if (older.length === 0) return 0;

    // Calculate average pressure and flux trends
    const recentAvgPressure = recent.reduce((sum, r) => sum + r.deltaPressure, 0) / recent.length;
    const olderAvgPressure = older.reduce((sum, r) => sum + r.deltaPressure, 0) / older.length;
    
    const recentAvgFlux = recent.reduce((sum, r) => sum + r.permeateFlux, 0) / recent.length;
    const olderAvgFlux = older.reduce((sum, r) => sum + r.permeateFlux, 0) / older.length;

    // Calculate trend rates
    const pressureTrend = (recentAvgPressure - olderAvgPressure) / this.references.baselinePressure;
    const fluxTrend = (olderAvgFlux - recentAvgFlux) / this.references.baselineFlux; // Positive when flux decreasing

    // Combine trends with weights
    const trendPenalty = Math.max(0, pressureTrend * 0.3 + fluxTrend * 0.3);
    
    return Math.min(0.1, trendPenalty); // Cap trend penalty at 0.1
  }

  /**
   * Add reading to historical data
   */
  private addToHistory(reading: SensorReading): void {
    this.historicalReadings.push(reading);
    
    // Maintain maximum history length
    if (this.historicalReadings.length > this.maxHistoryLength) {
      this.historicalReadings.shift();
    }
  }

  /**
   * Get default MHI for bad/missing data
   */
  private getDefaultMHI(timestamp: Date): MHI {
    return {
      value: 0.5, // Neutral value when data unavailable
      factors: {
        pressurePenalty: 0,
        fluxPenalty: 0,
        turbidityPenalty: 0,
        temperatureCorrection: 0,
        pHRisk: 0
      },
      timestamp
    };
  }

  /**
   * Reset historical data (e.g., after CIP)
   */
  reset(): void {
    this.historicalReadings = [];
  }

  /**
   * Get current MHI weights (for reporting)
   */
  getWeights(): MHIWeights {
    return { ...this.weights };
  }

  /**
   * Get reference values (for reporting)
   */
  getReferences(): ReferenceValues {
    return { ...this.references };
  }

  /**
   * Utility function to clamp values
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

/**
 * Fouling kinetics model for predictive analysis
 */
export class FoulingKineticsModel {
  private k0: number; // Base fouling rate constant
  private tempFactor: number; // Temperature dependency factor
  private turbidityFactor: number; // Turbidity dependency factor

  constructor(
    k0: number = 0.001, // 1/hour base rate
    tempFactor: number = 0.02, // Temperature coefficient
    turbidityFactor: number = 0.1 // Turbidity coefficient
  ) {
    this.k0 = k0;
    this.tempFactor = tempFactor;
    this.turbidityFactor = turbidityFactor;
  }

  /**
   * Predict fouling rate based on current conditions
   */
  predictFoulingRate(reading: SensorReading): number {
    // Temperature effect (Arrhenius-like)
    const tempEffect = Math.exp(-this.tempFactor * (reading.temperature - 20));
    
    // Turbidity effect (linear)
    const turbidityEffect = 1 + this.turbidityFactor * reading.turbidity;
    
    return this.k0 * tempEffect * turbidityEffect;
  }

  /**
   * Predict time to critical MHI threshold
   */
  predictTimeToThreshold(
    currentMHI: number,
    targetMHI: number,
    currentConditions: SensorReading
  ): number {
    if (currentMHI <= targetMHI) return 0;
    
    const foulingRate = this.predictFoulingRate(currentConditions);
    const mhiDeclineRate = foulingRate * 0.1; // Empirical correlation
    
    return (currentMHI - targetMHI) / mhiDeclineRate;
  }
}

/**
 * Create time series of normalized KPIs from sensor and molecular data
 */
export function calculateNormalizedKPITimeSeries(
  sensorReadings: SensorReading[],
  molecularData: MolecularData[],
  calculator?: NormalizedKPICalculator
): NormalizedKPI[] {
  const kpiCalc = calculator || new NormalizedKPICalculator();
  const kpiSeries: NormalizedKPI[] = [];

  for (let i = 0; i < sensorReadings.length && i < molecularData.length; i++) {
    const kpi = kpiCalc.calculateNormalizedKPI(sensorReadings[i], molecularData[i]);
    kpiSeries.push(kpi);
  }

  return kpiSeries;
}

/**
 * Create time series of MHI values from sensor readings (legacy)
 */
export function calculateMHITimeSeries(
  readings: SensorReading[],
  calculator?: MHICalculator
): MHI[] {
  const mhiCalc = calculator || new MHICalculator();
  const mhiSeries: MHI[] = [];

  for (const reading of readings) {
    const mhi = mhiCalc.calculateMHI(reading);
    mhiSeries.push(mhi);
  }

  return mhiSeries;
}
