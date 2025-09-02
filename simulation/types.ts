import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════════
// SIMULATION TYPES - PRISM-IND Water Treatment (UF→RO 100 m³/h)
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Site configuration for 100 m³/h UF→RO system
 */
export interface SiteConfig {
  /** Nominal flow rate (m³/h) */
  flow_nominal_m3h: number;
  /** RO train configuration */
  train: {
    vessels: number;
    elements_per_vessel: number;
  };
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  flow_nominal_m3h: 100,
  train: {
    vessels: 7,
    elements_per_vessel: 6
  }
};

/**
 * Unit types for proper type safety
 */
export type NTU = number;      // Nephelometric Turbidity Units
export type µScm = number;     // microSiemens per cm  
export type Celsius = number;  // Temperature in °C
export type Bar = number;      // Pressure in bar
export type mgL = number;      // milligrams per Liter

/**
 * Sensor data point with timestamp and quality indicators
 */
export interface SensorReading {
  timestamp: Date;
  /** Turbidity (NTU) - after pretreatment */
  turbidity: NTU;
  /** Conductivity (µS/cm) */
  conductivity: µScm;
  /** pH value */
  pH: number;
  /** Temperature (°C) */
  tempC: Celsius;
  /** Flow rate (m³/h) */
  flow_m3h: number;
  /** Differential pressure (bar) */
  dP_bar: Bar;
  /** Silt Density Index */
  SDI: number;
  /** Modified Fouling Index (slope) */
  MFI: number;
  /** Data quality flag */
  quality: DataQuality;
}

export enum DataQuality {
  GOOD = 'GOOD',
  UNCERTAIN = 'UNCERTAIN',
  BAD = 'BAD',
  MISSING = 'MISSING'
}

/**
 * Molecular signature data (feed and permeate)
 */
export interface MolecularData {
  /** Feed concentrations */
  feed: {
    NO3_mgL: mgL;
    SO4_mgL: mgL;
    TOC_mgL: mgL;
  };
  /** Permeate concentrations */
  permeate: {
    NO3_mgL: mgL;
    SO4_mgL: mgL;
    TOC_mgL: mgL;
  };
  /** Rejection percentages */
  rejection_pct: {
    NO3: number;
    SO4: number;
    TOC: number;
  };
  timestamp: Date;
}

/**
 * Normalized KPI indicators
 */
export interface NormalizedKPI {
  /** Normalized Permeate Flow (temperature corrected) */
  NPF: number;
  /** Normalized Salt Passage */
  NSP: number;
  /** Normalized Differential Pressure */
  NDP: number;
  /** Membrane Health Index [0,1] */
  MHI: number;
  timestamp: Date;
}

/**
 * Membrane Health Index calculation result
 */
export interface MHI {
  /** Overall health index [0,1] */
  value: number;
  /** Contributing factors */
  factors: {
    npfPenalty: number;
    ndpPenalty: number;
    nspPenalty: number;
    sdiPenalty: number;
    mfiPenalty: number;
  };
  timestamp: Date;
}

/**
 * System events and actions
 */
export enum SystemEvent {
  ADJUST_SETPOINTS = 'ADJUST_SETPOINTS',
  SCHEDULE_CIP = 'SCHEDULE_CIP', 
  INSPECT = 'INSPECT'
}

/**
 * AI Agent recommendation types
 */
export enum Recommendation {
  ADJUST_SETPOINTS = 'ADJUST_SETPOINTS',
  SCHEDULE_CIP = 'SCHEDULE_CIP',
  INSPECT = 'INSPECT'
}

/**
 * Agent vote in consensus process  
 */
export interface AgentVote {
  agentId: 'MembraneGuardian' | 'EconomicOptimizer' | 'OperationalBalancer';
  recommendation: Recommendation;
  score: number; // [0,1]
  justification: string;
}

/**
 * Consensus decision result
 */
export interface ConsensusDecision {
  timestamp: Date;
  finalRecommendation: Recommendation;
  votes: AgentVote[];
  consensusType: 'MAJORITY_2_3' | 'UNANIMOUS_CRITICAL' | 'TIE_BREAK';
  mhi_below_critical: boolean;
  auditTrail: string;
}

/**
 * Economic parameters for ROI calculation
 */
export interface EconomicParams {
  /** CIP downtime (hours) */
  downtime_CIP_h: number;
  /** Chemistry cost per element (€) */
  chemistry_cost_per_element_EUR: number;
  /** CIP energy cost (€) */
  cip_energy_cost_EUR: number;
  /** Production value (€/m³) */
  production_value_EUR_per_m3: number;
  /** 8" membrane element cost (€) */
  membrane_8inch_cost_EUR: number;
  /** Membrane lifespan reduction per CIP (%) */
  membrane_life_reduction_per_cip_pct: number;
}

/**
 * Strategy performance metrics
 */
export interface StrategyMetrics {
  /** Total downtime (hours) */
  totalDowntime: number;
  /** Number of CIP cycles */
  cipCount: number;
  /** Total OPEX (€) */
  totalOpex: number;
  /** Chemistry costs (€) */
  chemistryCosts: number;
  /** Energy costs (€) */
  energyCosts: number;
  /** Production lost (€) */
  productionLost: number;
  /** Membrane lifespan impact (%) */
  membraneLifeImpact: number;
  /** Return on Investment (€) */
  roi: number;
}

/**
 * Trigger thresholds for cleaning decisions
 */
export interface TriggerThresholds {
  /** NPF decrease threshold for warning (%) */
  npf_warning_pct: number;
  /** NPF decrease threshold for CIP (%) */
  npf_cip_pct: number;
  /** NDP increase threshold for CIP (%) */
  ndp_cip_pct: number;
  /** SDI threshold for persistent high */
  sdi_high_threshold: number;
  /** MFI threshold for elevated fouling */
  mfi_high_threshold: number;
  /** MHI critical threshold */
  mhi_critical: number;
}

/**
 * Simulation configuration schema
 */
export const SimulationConfigSchema = z.object({
  /** Simulation duration (days) */
  durationDays: z.number().min(7).max(14),
  /** Time step (minutes) */
  timeStepMinutes: z.number().min(5).max(5),
  /** Random seed for reproducibility */
  seed: z.number().int(),
  /** Economic parameters */
  economics: z.object({
    downtime_CIP_h: z.number().min(2.5).max(3.5),
    chemistry_cost_per_element_EUR: z.number().min(35).max(50),
    cip_energy_cost_EUR: z.number().positive(),
    production_value_EUR_per_m3: z.number().min(0.5).max(2.0),
    membrane_8inch_cost_EUR: z.number().min(300).max(800),
    membrane_life_reduction_per_cip_pct: z.number().min(0.3).max(0.7)
  }),
  /** Cleaning trigger thresholds */
  triggers: z.object({
    npf_warning_pct: z.number().min(10).max(15),
    npf_cip_pct: z.number().min(15).max(20),
    ndp_cip_pct: z.number().min(15).max(20),
    sdi_high_threshold: z.number().min(3).max(4),
    mfi_high_threshold: z.number().min(5).max(8),
    mhi_critical: z.number().min(0.3).max(0.4)
  })
});

export type SimulationConfig = z.infer<typeof SimulationConfigSchema>;

/**
 * Default simulation configuration
 */
export const DEFAULT_CONFIG: SimulationConfig = {
  durationDays: 10,
  timeStepMinutes: 5,
  seed: 42,
  economics: {
    downtime_CIP_h: 3.0,
    chemistry_cost_per_element_EUR: 42, // ~42 elements total
    cip_energy_cost_EUR: 50,
    production_value_EUR_per_m3: 1.0,
    membrane_8inch_cost_EUR: 500,
    membrane_life_reduction_per_cip_pct: 0.5
  },
  triggers: {
    npf_warning_pct: 10,
    npf_cip_pct: 15,
    ndp_cip_pct: 15,
    sdi_high_threshold: 3.0,
    mfi_high_threshold: 6.0,
    mhi_critical: 0.35
  }
};

/**
 * Baseline strategy (calendar-based CIP every 48h)
 */
export interface BaselineStrategy {
  cipIntervalHours: number;
  cipDuration: number;
}

export const DEFAULT_BASELINE: BaselineStrategy = {
  cipIntervalHours: 48, // CIP every 48 hours
  cipDuration: 3 // 3 hours duration
};
