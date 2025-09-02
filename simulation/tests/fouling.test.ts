import { describe, it, expect, beforeEach } from 'vitest';
import { NormalizedKPICalculator, CleaningTriggerAnalyzer } from '../fouling_model.js';
import { DEFAULT_CONFIG, DataQuality } from '../types.js';

describe('Normalized KPI Calculator', () => {
  let calculator: NormalizedKPICalculator;
  
  beforeEach(() => {
    calculator = new NormalizedKPICalculator();
  });

  it('should calculate NPF with temperature correction', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 25, // 5°C above reference (20°C)
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const molecularData = {
      feed: { NO3_mgL: 25, SO4_mgL: 250, TOC_mgL: 3 },
      permeate: { NO3_mgL: 2, SO4_mgL: 5, TOC_mgL: 0.3 },
      rejection_pct: { NO3: 92, SO4: 98, TOC: 90 },
      timestamp: new Date()
    };

    const result = calculator.calculateNormalizedKPI(sensorReading, molecularData);
    
    // NPF should be around 1.0 for nominal flow, adjusted for temperature
    expect(result.NPF).toBeGreaterThan(0.9);
    expect(result.NPF).toBeLessThan(1.1);
    expect(result.NSP).toBeGreaterThan(0);
    expect(result.NDP).toBeCloseTo(1.0, 1); // dP_bar = baseline
    expect(result.MHI).toBeGreaterThan(0.8); // Good conditions
  });

  it('should calculate proper NPF decline', () => {
    const baseSensor = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 85, // 15% reduction in flow
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const molecularData = {
      feed: { NO3_mgL: 25, SO4_mgL: 250, TOC_mgL: 3 },
      permeate: { NO3_mgL: 2, SO4_mgL: 5, TOC_mgL: 0.3 },
      rejection_pct: { NO3: 92, SO4: 98, TOC: 90 },
      timestamp: new Date()
    };

    const result = calculator.calculateNormalizedKPI(baseSensor, molecularData);
    
    // NPF should be around 0.85 (15% decline)
    expect(result.NPF).toBeCloseTo(0.85, 1);
  });

  it('should calculate NDP increase with higher pressure', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.5, // 25% increase from baseline (1.2)
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const molecularData = {
      feed: { NO3_mgL: 25, SO4_mgL: 250, TOC_mgL: 3 },
      permeate: { NO3_mgL: 2, SO4_mgL: 5, TOC_mgL: 0.3 },
      rejection_pct: { NO3: 92, SO4: 98, TOC: 90 },
      timestamp: new Date()
    };

    const result = calculator.calculateNormalizedKPI(sensorReading, molecularData);
    
    // NDP should be 1.5/1.2 = 1.25 (25% increase)
    expect(result.NDP).toBeCloseTo(1.25, 2);
  });

  it('should penalize MHI for poor conditions', () => {
    const poorSensor = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 80, // 20% flow reduction
      dP_bar: 1.8, // 50% pressure increase
      SDI: 3.5, // Above target
      MFI: 7.0, // Elevated
      quality: DataQuality.GOOD
    };

    const molecularData = {
      feed: { NO3_mgL: 25, SO4_mgL: 250, TOC_mgL: 3 },
      permeate: { NO3_mgL: 2, SO4_mgL: 5, TOC_mgL: 0.3 },
      rejection_pct: { NO3: 92, SO4: 98, TOC: 90 },
      timestamp: new Date()
    };

    const result = calculator.calculateNormalizedKPI(poorSensor, molecularData);
    
    expect(result.MHI).toBeLessThan(0.6); // Should be penalized
    expect(result.NPF).toBeLessThan(0.85); // Flow reduction
    expect(result.NDP).toBeGreaterThan(1.4); // Pressure increase
  });
});

describe('Cleaning Trigger Analyzer', () => {
  let analyzer: CleaningTriggerAnalyzer;
  
  beforeEach(() => {
    analyzer = new CleaningTriggerAnalyzer(DEFAULT_CONFIG.triggers);
  });

  it('should trigger CIP for 15% NPF decline', () => {
    const kpiReading = {
      NPF: 0.84, // 16% decline from baseline (1.0)
      NSP: 2.0,
      NDP: 1.1,
      MHI: 0.6,
      timestamp: new Date()
    };

    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 84,
      dP_bar: 1.3,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const result = analyzer.analyzeTriggers(kpiReading, sensorReading);
    
    expect(result.npfDeclinePercent).toBeCloseTo(16, 0);
    expect(result.triggersActive.length).toBeGreaterThan(0);
    expect(result.recommendAction).toBe('SCHEDULE_CIP');
  });

  it('should trigger CIP for 15% NDP increase', () => {
    const kpiReading = {
      NPF: 0.95,
      NSP: 2.0,
      NDP: 1.16, // 16% increase from baseline (1.0)
      MHI: 0.6,
      timestamp: new Date()
    };

    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 95,
      dP_bar: 1.4,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const result = analyzer.analyzeTriggers(kpiReading, sensorReading);
    
    expect(result.ndpIncreasePercent).toBeCloseTo(16, 0);
    expect(result.recommendAction).toBe('SCHEDULE_CIP');
  });

  it('should trigger INSPECT for elevated SDI', () => {
    const kpiReading = {
      NPF: 0.93, // 7% decline - below CIP threshold
      NSP: 2.0,
      NDP: 1.08,
      MHI: 0.7,
      timestamp: new Date()
    };

    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 93,
      dP_bar: 1.3,
      SDI: 3.2, // Above threshold (3.0)
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const result = analyzer.analyzeTriggers(kpiReading, sensorReading);
    
    expect(result.sdiPersistent).toBe(true);
    expect(result.recommendAction).toBe('INSPECT');
  });

  it('should trigger ADJUST_SETPOINTS for minor NPF decline', () => {
    const kpiReading = {
      NPF: 0.89, // 11% decline - warning level
      NSP: 2.0,
      NDP: 1.05,
      MHI: 0.75,
      timestamp: new Date()
    };

    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 89,
      dP_bar: 1.26,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const result = analyzer.analyzeTriggers(kpiReading, sensorReading);
    
    expect(result.npfDeclinePercent).toBeCloseTo(11, 0);
    expect(result.recommendAction).toBe('ADJUST_SETPOINTS');
  });

  it('should not trigger for good conditions', () => {
    const kpiReading = {
      NPF: 0.97, // Only 3% decline
      NSP: 2.0,
      NDP: 1.02,
      MHI: 0.85,
      timestamp: new Date()
    };

    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 97,
      dP_bar: 1.22,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const result = analyzer.analyzeTriggers(kpiReading, sensorReading);
    
    expect(result.triggersActive.length).toBe(0);
    expect(result.recommendAction).toBe('CONTINUE');
  });
});
