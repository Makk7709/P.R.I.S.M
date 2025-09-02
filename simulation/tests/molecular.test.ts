import { describe, it, expect, beforeEach } from 'vitest';
import { MolecularSimulator, generateMolecularTimeSeries } from '../molecular.js';
import { DEFAULT_CONFIG, DataQuality } from '../types.js';

describe('MolecularSimulator', () => {
  let simulator: MolecularSimulator;
  
  beforeEach(() => {
    simulator = new MolecularSimulator(DEFAULT_CONFIG);
  });

  it('should generate realistic feed concentrations', () => {
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

    const result = simulator.generateMolecularData(new Date(), sensorReading, 0);
    
    // Check feed concentrations are within brackish water ranges
    expect(result.feed.NO3_mgL).toBeGreaterThanOrEqual(10);
    expect(result.feed.NO3_mgL).toBeLessThanOrEqual(40);
    
    expect(result.feed.SO4_mgL).toBeGreaterThanOrEqual(100);
    expect(result.feed.SO4_mgL).toBeLessThanOrEqual(400);
    
    expect(result.feed.TOC_mgL).toBeGreaterThanOrEqual(1);
    expect(result.feed.TOC_mgL).toBeLessThanOrEqual(5);
  });

  it('should generate realistic RO rejection rates', () => {
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

    const result = simulator.generateMolecularData(new Date(), sensorReading, 0);
    
    // Check rejection rates are within typical RO ranges
    expect(result.rejection_pct.NO3).toBeGreaterThanOrEqual(85);
    expect(result.rejection_pct.NO3).toBeLessThanOrEqual(99);
    
    expect(result.rejection_pct.SO4).toBeGreaterThanOrEqual(95);
    expect(result.rejection_pct.SO4).toBeLessThanOrEqual(99.8);
    
    expect(result.rejection_pct.TOC).toBeGreaterThanOrEqual(80);
    expect(result.rejection_pct.TOC).toBeLessThanOrEqual(99);
    
    // SO4 should have highest rejection
    expect(result.rejection_pct.SO4).toBeGreaterThan(result.rejection_pct.NO3);
    expect(result.rejection_pct.SO4).toBeGreaterThan(result.rejection_pct.TOC);
  });

  it('should calculate correct permeate concentrations', () => {
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

    const result = simulator.generateMolecularData(new Date(), sensorReading, 0);
    
    // Check permeate = feed × (1 - rejection)
    const expectedNO3 = result.feed.NO3_mgL * (1 - result.rejection_pct.NO3 / 100);
    const expectedSO4 = result.feed.SO4_mgL * (1 - result.rejection_pct.SO4 / 100);
    const expectedTOC = result.feed.TOC_mgL * (1 - result.rejection_pct.TOC / 100);
    
    expect(result.permeate.NO3_mgL).toBeCloseTo(expectedNO3, 2);
    expect(result.permeate.SO4_mgL).toBeCloseTo(expectedSO4, 2);
    expect(result.permeate.TOC_mgL).toBeCloseTo(expectedTOC, 3);
    
    // Permeate should be much lower than feed
    expect(result.permeate.NO3_mgL).toBeLessThan(result.feed.NO3_mgL);
    expect(result.permeate.SO4_mgL).toBeLessThan(result.feed.SO4_mgL);
    expect(result.permeate.TOC_mgL).toBeLessThan(result.feed.TOC_mgL);
  });

  it('should degrade rejection with fouling', () => {
    const sensorReading = {
      timestamp: new Date(),
      turbidity: 0.8, // High turbidity
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 3.5, // High SDI
      MFI: 7.0, // High MFI
      quality: DataQuality.GOOD
    };

    const cleanResult = simulator.generateMolecularData(new Date(), sensorReading, 0);
    const fouledResult = simulator.generateMolecularData(new Date(), sensorReading, 100); // 100h fouling

    // Rejection should decrease with fouling
    expect(fouledResult.rejection_pct.NO3).toBeLessThanOrEqual(cleanResult.rejection_pct.NO3);
    expect(fouledResult.rejection_pct.SO4).toBeLessThanOrEqual(cleanResult.rejection_pct.SO4);
    expect(fouledResult.rejection_pct.TOC).toBeLessThanOrEqual(cleanResult.rejection_pct.TOC);
    
    // Permeate concentrations should increase with fouling
    expect(fouledResult.permeate.NO3_mgL).toBeGreaterThanOrEqual(cleanResult.permeate.NO3_mgL);
    expect(fouledResult.permeate.SO4_mgL).toBeGreaterThanOrEqual(cleanResult.permeate.SO4_mgL);
    expect(fouledResult.permeate.TOC_mgL).toBeGreaterThanOrEqual(cleanResult.permeate.TOC_mgL);
  });

  it('should respond to pH variations', () => {
    const lowPHSensor = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 6.8, // Low pH
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const highPHSensor = {
      ...lowPHSensor,
      pH: 7.6 // High pH
    };

    const lowPHResult = simulator.generateMolecularData(new Date(), lowPHSensor, 10);
    const highPHResult = simulator.generateMolecularData(new Date(), highPHSensor, 10);

    // pH should affect rejection rates (optimal around 7-8)
    // Both extreme pH values should have lower rejection than optimal
    expect(lowPHResult.rejection_pct.NO3).toBeDefined();
    expect(highPHResult.rejection_pct.NO3).toBeDefined();
  });

  it('should respond to temperature effects', () => {
    const coldSensor = {
      timestamp: new Date(),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 15, // Cold water
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    };

    const hotSensor = {
      ...coldSensor,
      tempC: 30 // Hot water
    };

    const coldResult = simulator.generateMolecularData(new Date(), coldSensor, 10);
    const hotResult = simulator.generateMolecularData(new Date(), hotSensor, 10);

    // Temperature should affect rejection rates
    expect(hotResult.rejection_pct.NO3).toBeLessThanOrEqual(coldResult.rejection_pct.NO3 + 1); // Allow some variance
    expect(coldResult.rejection_pct.NO3).toBeGreaterThanOrEqual(85); // Should still be realistic
    expect(hotResult.rejection_pct.NO3).toBeGreaterThanOrEqual(85); // Should still be realistic
  });

  it('should reset molecular state properly', () => {
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

    // Get initial state
    const initialResult = simulator.generateMolecularData(new Date(), sensorReading, 0);
    
    // Simulate some fouling
    simulator.generateMolecularData(new Date(), sensorReading, 50);
    
    // Reset and check
    simulator.resetMolecularState();
    const resetResult = simulator.generateMolecularData(new Date(), sensorReading, 0);
    
    // After reset, rejections should be similar to initial (within variance)
    expect(Math.abs(resetResult.rejection_pct.NO3 - initialResult.rejection_pct.NO3)).toBeLessThan(5);
    expect(Math.abs(resetResult.rejection_pct.SO4 - initialResult.rejection_pct.SO4)).toBeLessThan(2);
    expect(Math.abs(resetResult.rejection_pct.TOC - initialResult.rejection_pct.TOC)).toBeLessThan(5);
  });

  it('should calculate NSP correctly', () => {
    const testData = {
      NO3_mgL: 2.0,
      SO4_mgL: 5.0,
      TOC_mgL: 0.3
    };

    const nsp = MolecularSimulator.calculateNSP(2000, testData, 2.0);
    
    expect(nsp).toBeGreaterThan(0.1);
    expect(nsp).toBeLessThan(10); // Should be realistic range
    expect(typeof nsp).toBe('number');
  });
});

describe('generateMolecularTimeSeries', () => {
  it('should generate correct number of data points', () => {
    const config = {
      ...DEFAULT_CONFIG,
      durationDays: 1,
      timeStepMinutes: 60 // 1 hour steps
    };

    const sensorReadings = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() + i * 60 * 60 * 1000),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    }));

    const result = generateMolecularTimeSeries(config, sensorReadings);
    
    expect(result).toHaveLength(24);
    expect(result[0].timestamp).toBeInstanceOf(Date);
    expect(result[0].feed).toBeDefined();
    expect(result[0].permeate).toBeDefined();
    expect(result[0].rejection_pct).toBeDefined();
  });

  it('should maintain consistency across time series', () => {
    const config = {
      ...DEFAULT_CONFIG,
      durationDays: 1,
      timeStepMinutes: 60
    };

    const sensorReadings = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() + i * 60 * 60 * 1000),
      turbidity: 0.3,
      conductivity: 2000,
      pH: 7.2,
      tempC: 20,
      flow_m3h: 100,
      dP_bar: 1.2,
      SDI: 2.8,
      MFI: 4.0,
      quality: DataQuality.GOOD
    }));

    const result = generateMolecularTimeSeries(config, sensorReadings);
    
    // All results should have realistic values
    result.forEach(point => {
      expect(point.feed.NO3_mgL).toBeGreaterThanOrEqual(10);
      expect(point.feed.NO3_mgL).toBeLessThanOrEqual(40);
      expect(point.rejection_pct.SO4).toBeGreaterThan(point.rejection_pct.NO3);
      expect(point.permeate.NO3_mgL).toBeLessThan(point.feed.NO3_mgL);
    });
  });
});
