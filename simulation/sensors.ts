import { SensorReading, DataQuality, SimulationConfig, NTU, µScm, Celsius, Bar } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// SENSOR SIMULATION MODULE - PRISM-IND Water Treatment
// Generates 5-min data: turbidity, conductivity, pH, tempC, flow_m3h, dP_bar, SDI, MFI
// Includes quality flags: 2% MISSING, 5% BAD, 10% UNCERTAIN  
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Pseudo-random number generator with seed for reproducible results
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generate next random number [0,1)
   */
  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }

  /**
   * Generate Gaussian random number (Box-Muller transform)
   */
  gaussian(mean: number = 0, stddev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stddev + mean;
  }
}

/**
 * Membrane fouling dynamics model
 */
interface FoulingState {
  /** Accumulated fouling factor [0,∞) */
  foulingFactor: number;
  /** Base resistance factor */
  baseResistance: number;
  /** Time since last CIP (hours) */
  timeSinceClean: number;
}

/**
 * Sensor simulator with realistic behavior patterns
 */
export class SensorSimulator {
  private rng: SeededRandom;
  private config: SimulationConfig;
  private foulingState: FoulingState;
  private previousReading?: SensorReading;

  // Baseline operating conditions for 100 m³/h UF→RO system
  private readonly baselines = {
    turbidity: 0.35,       // NTU - after pretreatment (0.1-0.6 range)
    conductivity: 2200,    // µS/cm - brackish water (1500-3500 range)
    pH: 7.2,              // neutral (6.8-7.6 range)
    tempC: 20,             // °C - ambient (12-28 range)
    flow_m3h: 100,         // m³/h - nominal capacity (94-106 range)
    dP_bar: 1.2,           // bar - initial ΔP (0.9-1.6 range)
    SDI: 2.8,              // target <3.0 (2.2-3.5 range)
    MFI: 4.0               // slope indicator (2-6 range)
  };

  // Physical constraints for sensor validation
  private readonly constraints = {
    turbidity: { min: 0.05, max: 1.0 },    // NTU - spikes up to 1.0
    conductivity: { min: 1500, max: 3500 }, // µS/cm - brackish range
    pH: { min: 6.8, max: 7.6 },            // normal operation
    tempC: { min: 12, max: 28 },           // seasonal variation
    flow_m3h: { min: 94, max: 106 },       // ±6% around nominal
    dP_bar: { min: 0.9, max: 1.6 },        // operational range
    SDI: { min: 2.0, max: 4.5 },           // spikes to 4.5 during events
    MFI: { min: 2, max: 8 }                // more sensitive than SDI
  };

  constructor(config: SimulationConfig) {
    this.config = config;
    this.rng = new SeededRandom(config.seed);
    this.foulingState = {
      foulingFactor: 1.0,
      baseResistance: 1.0,
      timeSinceClean: 0
    };
  }

  /**
   * Generate sensor reading for given timestamp
   */
  generateReading(timestamp: Date): SensorReading {
    const hoursElapsed = this.foulingState.timeSinceClean;

    // Update fouling dynamics
    this.updateFoulingDynamics(hoursElapsed);

    // Generate base values with fouling effects
    const baseValues = this.generateBaseValues(hoursElapsed);

    // Add realistic noise
    const noisyValues = this.addSensorNoise(baseValues);

    // Apply physical constraints
    const constrainedValues = this.applyConstraints(noisyValues);

    // Determine data quality
    const quality = this.determineDataQuality(timestamp);

    // Create sensor reading with new structure
    const reading: SensorReading = {
      timestamp,
      turbidity: constrainedValues.turbidity,
      conductivity: constrainedValues.conductivity,
      pH: constrainedValues.pH,
      tempC: constrainedValues.tempC,
      flow_m3h: constrainedValues.flow_m3h,
      dP_bar: constrainedValues.dP_bar,
      SDI: constrainedValues.SDI,
      MFI: constrainedValues.MFI,
      quality
    };

    // Apply preprocessing (forward fill for missing data)
    const processedReading = this.preprocessReading(reading);

    this.previousReading = processedReading;
    this.foulingState.timeSinceClean += this.config.timeStepMinutes / 60;

    return processedReading;
  }

  /**
   * Update membrane fouling dynamics with realistic UF→RO progression
   */
  private updateFoulingDynamics(hoursElapsed: number): void {
    // Fouling rate increases with turbidity and decreases with temperature
    const turbidityFactor = 1 + (this.baselines.turbidity - 0.2) * 0.15;
    const temperatureFactor = Math.max(0.7, 1 - (this.baselines.tempC - 20) * 0.02);
    
    const foulingRate = 0.003 * turbidityFactor * temperatureFactor; // per hour
    
    // Gradual fouling accumulation with realistic progression
    this.foulingState.foulingFactor = 1 + foulingRate * Math.pow(hoursElapsed, 1.1);
  }

  /**
   * Generate base sensor values with fouling effects
   */
  private generateBaseValues(hoursElapsed: number) {
    const fouling = this.foulingState.foulingFactor;

    // Turbidity: daily variations + random spikes (2% chance)
    const dailyCycle = Math.sin(2 * Math.PI * hoursElapsed / 24) * 0.05;
    const turbiditySpike = this.rng.next() < 0.02 ? this.rng.next() * 0.4 : 0; // Spikes up to 1.0 NTU
    const turbidity = this.baselines.turbidity + dailyCycle + turbiditySpike;

    // Conductivity: relatively stable brackish water
    const conductivity = this.baselines.conductivity + this.rng.gaussian(0, 100);

    // pH: slight variations around neutral
    const pH = this.baselines.pH + this.rng.gaussian(0, 0.05);

    // Temperature: daily cycle with seasonal variation
    const temperatureCycle = Math.sin(2 * Math.PI * hoursElapsed / 24 - Math.PI/4) * 4;
    const seasonalVariation = Math.sin(2 * Math.PI * hoursElapsed / (24 * 30)) * 3; // Monthly
    const tempC = this.baselines.tempC + temperatureCycle + seasonalVariation;

    // Flow rate: operational variations around 100 m³/h
    const flow_m3h = this.baselines.flow_m3h + this.rng.gaussian(0, 2);

    // Differential pressure: increases with fouling
    const dP_bar = this.baselines.dP_bar * fouling;

    // SDI: increases with fouling and turbidity spikes
    const sdiIncrease = (fouling - 1) * 0.5 + (turbiditySpike > 0 ? 0.3 : 0);
    const SDI = this.baselines.SDI + sdiIncrease + this.rng.gaussian(0, 0.1);

    // MFI: more sensitive than SDI to colloidal fouling
    const mfiIncrease = (fouling - 1) * 0.8 + (turbiditySpike > 0 ? 0.5 : 0);
    const MFI = this.baselines.MFI + mfiIncrease + this.rng.gaussian(0, 0.2);

    return {
      turbidity,
      conductivity,
      pH,
      tempC,
      flow_m3h,
      dP_bar,
      SDI,
      MFI
    };
  }

  /**
   * Add realistic sensor noise
   */
  private addSensorNoise(values: any) {
    return {
      turbidity: values.turbidity * (1 + this.rng.gaussian(0, 0.10)),       // ±10%
      conductivity: values.conductivity * (1 + this.rng.gaussian(0, 0.05)), // ±5%
      pH: values.pH + this.rng.gaussian(0, 0.02),                           // ±0.02 pH units
      tempC: values.tempC + this.rng.gaussian(0, 0.5),                      // ±0.5°C
      flow_m3h: values.flow_m3h * (1 + this.rng.gaussian(0, 0.02)),         // ±2%
      dP_bar: values.dP_bar * (1 + this.rng.gaussian(0, 0.02)),             // ±2%
      SDI: values.SDI * (1 + this.rng.gaussian(0, 0.05)),                   // ±5%
      MFI: values.MFI * (1 + this.rng.gaussian(0, 0.08))                    // ±8%
    };
  }

  /**
   * Apply physical constraints to sensor values
   */
  private applyConstraints(values: any) {
    return {
      turbidity: this.clamp(values.turbidity, this.constraints.turbidity.min, this.constraints.turbidity.max),
      conductivity: this.clamp(values.conductivity, this.constraints.conductivity.min, this.constraints.conductivity.max),
      pH: this.clamp(values.pH, this.constraints.pH.min, this.constraints.pH.max),
      tempC: this.clamp(values.tempC, this.constraints.tempC.min, this.constraints.tempC.max),
      flow_m3h: this.clamp(values.flow_m3h, this.constraints.flow_m3h.min, this.constraints.flow_m3h.max),
      dP_bar: this.clamp(values.dP_bar, this.constraints.dP_bar.min, this.constraints.dP_bar.max),
      SDI: this.clamp(values.SDI, this.constraints.SDI.min, this.constraints.SDI.max),
      MFI: this.clamp(values.MFI, this.constraints.MFI.min, this.constraints.MFI.max)
    };
  }

  /**
   * Determine data quality based on various factors
   */
  private determineDataQuality(timestamp: Date): DataQuality {
    const random = this.rng.next();
    
    // 2% chance of sensor dropout
    if (random < 0.02) return DataQuality.MISSING;
    
    // 5% chance of bad data (outliers, communication errors)
    if (random < 0.07) return DataQuality.BAD;
    
    // 10% chance of uncertain data (marginal sensor performance)
    if (random < 0.17) return DataQuality.UNCERTAIN;
    
    return DataQuality.GOOD;
  }

  /**
   * Preprocess sensor reading (handle missing data, outliers)
   */
  private preprocessReading(reading: SensorReading): SensorReading {
    if (reading.quality === DataQuality.MISSING && this.previousReading) {
      // Forward fill missing values (limited to prevent drift)
      return {
        ...reading,
        turbidity: this.previousReading.turbidity,
        conductivity: this.previousReading.conductivity,
        pH: this.previousReading.pH,
        tempC: this.previousReading.tempC,
        flow_m3h: this.previousReading.flow_m3h,
        dP_bar: this.previousReading.dP_bar,
        SDI: this.previousReading.SDI,
        MFI: this.previousReading.MFI,
        quality: DataQuality.UNCERTAIN // Downgrade quality
      };
    }

    // Apply Hampel filter for outlier detection (simplified)
    if (reading.quality === DataQuality.BAD) {
      return this.applyHampelFilter(reading);
    }

    return reading;
  }

  /**
   * Simplified Hampel filter for outlier detection
   */
  private applyHampelFilter(reading: SensorReading): SensorReading {
    if (!this.previousReading) return reading;

    // If value deviates more than 3 sigma from previous, use median filter
    const threshold = 3.0;
    
    const checkAndCorrect = (current: number, previous: number, noise: number): number => {
      const expectedStdev = previous * noise;
      if (Math.abs(current - previous) > threshold * expectedStdev) {
        return previous; // Use previous value as rough median
      }
      return current;
    };

    return {
      ...reading,
      turbidity: checkAndCorrect(reading.turbidity, this.previousReading.turbidity, 0.10),
      conductivity: checkAndCorrect(reading.conductivity, this.previousReading.conductivity, 0.05),
      dP_bar: checkAndCorrect(reading.dP_bar, this.previousReading.dP_bar, 0.02),
      SDI: checkAndCorrect(reading.SDI, this.previousReading.SDI, 0.05),
      MFI: checkAndCorrect(reading.MFI, this.previousReading.MFI, 0.08),
      quality: DataQuality.UNCERTAIN
    };
  }

  /**
   * Reset fouling state (after CIP)
   */
  resetFouling(): void {
    this.foulingState = {
      foulingFactor: 1.0,
      baseResistance: 1.0,
      timeSinceClean: 0
    };
  }

  /**
   * Get current fouling factor
   */
  getFoulingFactor(): number {
    return this.foulingState.foulingFactor;
  }

  /**
   * Utility function to clamp values
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

/**
 * Generate time series of sensor readings
 */
export function generateSensorTimeSeries(
  config: SimulationConfig,
  startTime: Date = new Date()
): SensorReading[] {
  const simulator = new SensorSimulator(config);
  const readings: SensorReading[] = [];
  
  const totalMinutes = config.durationDays * 24 * 60;
  const steps = Math.floor(totalMinutes / config.timeStepMinutes);

  for (let i = 0; i < steps; i++) {
    const timestamp = new Date(startTime.getTime() + i * config.timeStepMinutes * 60 * 1000);
    const reading = simulator.generateReading(timestamp);
    readings.push(reading);
  }

  return readings;
}
