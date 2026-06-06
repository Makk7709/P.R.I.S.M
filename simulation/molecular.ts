import { MolecularData, SimulationConfig, SensorReading, mgL } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// MOLECULAR SIGNATURE MODULE - PRISM-IND Water Treatment
// Simplified molecular model for NO3, SO4, TOC with typical RO rejections
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Pseudo-random number generator with seed for reproducible results
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }

  gaussian(mean: number = 0, stddev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stddev + mean;
  }
}

/**
 * Rejection rates for different species in brackish water RO
 */
interface RejectionRates {
  NO3: { baseline: number; variability: number }; // 90-96%
  SO4: { baseline: number; variability: number }; // 98-99.5%  
  TOC: { baseline: number; variability: number }; // 90-98%
}

const TYPICAL_RO_REJECTIONS: RejectionRates = {
  NO3: { baseline: 93, variability: 3 }, // 90-96%
  SO4: { baseline: 98.75, variability: 0.75 }, // 98-99.5%
  TOC: { baseline: 94, variability: 4 } // 90-98%
};

/**
 * Feed water concentration ranges for brackish water
 */
interface FeedConcentrations {
  NO3: { min: number; max: number }; // mg/L
  SO4: { min: number; max: number }; // mg/L  
  TOC: { min: number; max: number }; // mg/L
}

const BRACKISH_FEED_RANGES: FeedConcentrations = {
  NO3: { min: 10, max: 40 },  // mg/L
  SO4: { min: 100, max: 400 }, // mg/L
  TOC: { min: 1, max: 5 }     // mg/L
};

/**
 * Molecular simulator for water treatment analysis
 */
export class MolecularSimulator {
  private rng: SeededRandom;
  private config: SimulationConfig;
  private baselineRejections: RejectionRates;
  private feedBaseline: FeedConcentrations;
  private currentFeedState: {
    NO3_mgL: mgL;
    SO4_mgL: mgL;
    TOC_mgL: mgL;
  };

  constructor(config: SimulationConfig) {
    this.config = config;
    this.rng = new SeededRandom(config.seed + 1000); // Offset seed for molecular
    this.baselineRejections = TYPICAL_RO_REJECTIONS;
    this.feedBaseline = BRACKISH_FEED_RANGES;
    
    // Initialize baseline feed concentrations
    this.currentFeedState = {
      NO3_mgL: this.rng.gaussian(25, 8), // ~25 ± 8 mg/L
      SO4_mgL: this.rng.gaussian(250, 75), // ~250 ± 75 mg/L  
      TOC_mgL: this.rng.gaussian(3, 1) // ~3 ± 1 mg/L
    };
  }

  /**
   * Generate molecular data based on sensor conditions
   */
  generateMolecularData(
    timestamp: Date, 
    sensorReading: SensorReading,
    timeSinceClean: number
  ): MolecularData {
    
    // Update feed concentrations with daily/seasonal variations
    const feed = this.generateFeedConcentrations(timestamp);
    
    // Calculate rejection rates based on membrane condition
    const rejections = this.calculateRejectionRates(sensorReading, timeSinceClean);
    
    // Calculate permeate concentrations
    const permeate = this.calculatePermeateConcentrations(feed, rejections);
    
    return {
      feed,
      permeate,
      rejection_pct: {
        NO3: rejections.NO3,
        SO4: rejections.SO4,
        TOC: rejections.TOC
      },
      timestamp
    };
  }

  /**
   * Generate feed water concentrations with realistic variations
   */
  private generateFeedConcentrations(timestamp: Date): {
    NO3_mgL: mgL;
    SO4_mgL: mgL; 
    TOC_mgL: mgL;
  } {
    const hoursElapsed = timestamp.getTime() / (1000 * 60 * 60);
    
    // Daily variations (higher organics in morning, etc.)
    const dailyCycle = Math.sin(2 * Math.PI * hoursElapsed / 24);
    
    // Seasonal variations (lower organics in winter)
    const seasonalCycle = Math.sin(2 * Math.PI * hoursElapsed / (24 * 365));
    
    // Random spikes (storm events, upstream discharges)
    const spikeChance = this.rng.next();
    const spikeMultiplier = spikeChance < 0.05 ? 1 + this.rng.next() * 0.5 : 1; // 5% chance of +50% spike
    
    // NO3: agricultural runoff patterns
    const NO3_variation = 1 + dailyCycle * 0.1 + seasonalCycle * 0.2;
    const NO3_mgL = this.clamp(
      this.currentFeedState.NO3_mgL * NO3_variation * spikeMultiplier + this.rng.gaussian(0, 2),
      this.feedBaseline.NO3.min,
      this.feedBaseline.NO3.max
    );
    
    // SO4: more stable, geological sources
    const SO4_variation = 1 + seasonalCycle * 0.05;
    const SO4_mgL = this.clamp(
      this.currentFeedState.SO4_mgL * SO4_variation + this.rng.gaussian(0, 10),
      this.feedBaseline.SO4.min,
      this.feedBaseline.SO4.max
    );
    
    // TOC: organic matter, higher variability
    const TOC_variation = 1 + dailyCycle * 0.15 + seasonalCycle * 0.1;
    const TOC_mgL = this.clamp(
      this.currentFeedState.TOC_mgL * TOC_variation * spikeMultiplier + this.rng.gaussian(0, 0.3),
      this.feedBaseline.TOC.min,
      this.feedBaseline.TOC.max
    );
    
    // Slow drift in baseline concentrations
    this.currentFeedState.NO3_mgL += this.rng.gaussian(0, 0.1);
    this.currentFeedState.SO4_mgL += this.rng.gaussian(0, 0.5);
    this.currentFeedState.TOC_mgL += this.rng.gaussian(0, 0.05);
    
    return { NO3_mgL, SO4_mgL, TOC_mgL };
  }

  /**
   * Calculate rejection rates based on membrane condition and fouling
   */
  private calculateRejectionRates(
    sensorReading: SensorReading,
    timeSinceClean: number
  ): { NO3: number; SO4: number; TOC: number } {
    
    // Base rejection rates
    let NO3_rejection = this.baselineRejections.NO3.baseline;
    let SO4_rejection = this.baselineRejections.SO4.baseline;
    let TOC_rejection = this.baselineRejections.TOC.baseline;
    
    // Fouling effects on rejection (simplified model)
    const foulingFactor = 1 + timeSinceClean * 0.001; // Gradual fouling
    
    // High SDI/MFI indicates colloidal fouling → affects organic rejection more
    const sdiImpact = Math.max(0, (sensorReading.SDI - 3) * 0.1); // Above SDI=3
    const mfiImpact = Math.max(0, (sensorReading.MFI - 5) * 0.05); // Above MFI=5
    
    // High turbidity → more fouling → lower rejection
    const turbidityImpact = Math.max(0, (sensorReading.turbidity - 0.5) * 0.2);
    
    // pH effects (optimal around 7-8 for RO)
    const pHImpact = Math.abs(sensorReading.pH - 7.5) * 0.1;
    
    // Temperature effects (higher temp → slightly lower rejection)
    const tempImpact = Math.max(0, (sensorReading.tempC - 25) * 0.05);
    
    // Apply fouling degradation
    const totalImpact = (sdiImpact + mfiImpact + turbidityImpact + pHImpact + tempImpact) / foulingFactor;
    
    // NO3: most sensitive to fouling and pH
    NO3_rejection -= totalImpact * 1.5;
    NO3_rejection += this.rng.gaussian(0, this.baselineRejections.NO3.variability);
    
    // SO4: very stable, least affected
    SO4_rejection -= totalImpact * 0.3;
    SO4_rejection += this.rng.gaussian(0, this.baselineRejections.SO4.variability);
    
    // TOC: moderately sensitive, depends on molecular size distribution
    TOC_rejection -= totalImpact * 1.0;
    TOC_rejection += this.rng.gaussian(0, this.baselineRejections.TOC.variability);
    
    return {
      NO3: this.clamp(NO3_rejection, 85, 99),
      SO4: this.clamp(SO4_rejection, 95, 99.8),
      TOC: this.clamp(TOC_rejection, 80, 99)
    };
  }

  /**
   * Calculate permeate concentrations from feed and rejection rates
   */
  private calculatePermeateConcentrations(
    feed: { NO3_mgL: mgL; SO4_mgL: mgL; TOC_mgL: mgL },
    rejections: { NO3: number; SO4: number; TOC: number }
  ): { NO3_mgL: mgL; SO4_mgL: mgL; TOC_mgL: mgL } {
    
    return {
      NO3_mgL: feed.NO3_mgL * (1 - rejections.NO3 / 100),
      SO4_mgL: feed.SO4_mgL * (1 - rejections.SO4 / 100),
      TOC_mgL: feed.TOC_mgL * (1 - rejections.TOC / 100)
    };
  }

  /**
   * Reset molecular state (after CIP or system restart)
   */
  resetMolecularState(): void {
    // Rejections return to baseline after cleaning
    this.baselineRejections = TYPICAL_RO_REJECTIONS;
  }

  /**
   * Calculate Normalized Salt Passage (NSP) from conductivity and molecular data
   */
  static calculateNSP(
    feedConductivity: µScm,
    permeateData: { NO3_mgL: mgL; SO4_mgL: mgL; TOC_mgL: mgL },
    _baselineNSP: number = 2.0 // Typical baseline NSP %
  ): number {
    
    // Simplified NSP calculation
    // In reality, would need permeate conductivity measurement
    // Here we estimate from major ionic species
    
    const estimatedPermeateContribution = 
      permeateData.NO3_mgL * 0.8 + // NO3 contribution to conductivity
      permeateData.SO4_mgL * 1.2;   // SO4 contribution to conductivity
    
    const estimatedSaltPassage = (estimatedPermeateContribution / feedConductivity) * 100;
    
    return Math.max(0.1, estimatedSaltPassage);
  }

  /**
   * Utility function to clamp values within bounds
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

/**
 * Generate time series of molecular data
 */
export function generateMolecularTimeSeries(
  config: SimulationConfig,
  sensorReadings: SensorReading[],
  _startTime: Date = new Date()
): MolecularData[] {
  
  const simulator = new MolecularSimulator(config);
  const molecularData: MolecularData[] = [];
  
  let timeSinceClean = 0;
  
  for (let i = 0; i < sensorReadings.length; i++) {
    const sensorReading = sensorReadings[i];
    const data = simulator.generateMolecularData(
      sensorReading.timestamp,
      sensorReading,
      timeSinceClean
    );
    
    molecularData.push(data);
    timeSinceClean += config.timeStepMinutes / 60; // Convert to hours
  }
  
  return molecularData;
}

/**
 * Type definitions for molecular analysis
 */
export type µScm = number; // microSiemens per cm (re-export for convenience)
