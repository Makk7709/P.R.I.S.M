import { describe, it, expect, beforeEach } from 'vitest';
import { MHICalculator, FoulingKineticsModel, calculateMHITimeSeries } from '../simulation/fouling_model.js';
import { SensorReading, MHI, DataQuality } from '../simulation/types.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// FOULING MODEL & MHI TESTS - PRISM-IND
// ═══════════════════════════════════════════════════════════════════════════════════

describe('MHICalculator', () => {
  let mhiCalculator: MHICalculator;
  let baseSensorReading: SensorReading;

  beforeEach(() => {
    mhiCalculator = new MHICalculator();
    baseSensorReading = {
      timestamp: new Date(),
      deltaPressure: 0.8, // Baseline pressure
      permeateFlux: 45,   // Baseline flux
      turbidity: 0.5,     // Low turbidity
      conductivity: 1200,
      pH: 7.2,           // Optimal pH
      temperature: 20,    // Optimal temperature
      flowRate: 100,
      quality: DataQuality.GOOD
    };
  });

  describe('MHI Calculation', () => {
    it('should calculate high MHI for optimal conditions', () => {
      const mhi = mhiCalculator.calculateMHI(baseSensorReading);
      
      expect(mhi.value).toBeGreaterThan(0.8);
      expect(mhi.value).toBeLessThanOrEqual(1.0);
      expect(mhi.timestamp).toEqual(baseSensorReading.timestamp);
      
      // All factors should be low for optimal conditions
      expect(mhi.factors.pressurePenalty).toBeLessThan(0.1);
      expect(mhi.factors.fluxPenalty).toBeLessThan(0.1);
      expect(mhi.factors.turbidityPenalty).toBeLessThan(0.1);
    });

    it('should penalize high pressure (fouling indicator)', () => {
      const highPressureReading: SensorReading = {
        ...baseSensorReading,
        deltaPressure: 1.6 // 2x baseline pressure
      };

      const mhi = mhiCalculator.calculateMHI(highPressureReading);
      
      expect(mhi.factors.pressurePenalty).toBeGreaterThan(0.15);
      expect(mhi.value).toBeLessThan(0.8);
    });

    it('should penalize low flux (reduced permeability)', () => {
      const lowFluxReading: SensorReading = {
        ...baseSensorReading,
        permeateFlux: 30 // ~67% of baseline flux
      };

      const mhi = mhiCalculator.calculateMHI(lowFluxReading);
      
      expect(mhi.factors.fluxPenalty).toBeGreaterThan(0.15);
      expect(mhi.value).toBeLessThan(0.8);
    });

    it('should penalize high turbidity (fouling potential)', () => {
      const highTurbidityReading: SensorReading = {
        ...baseSensorReading,
        turbidity: 1.5 // 3x baseline turbidity
      };

      const mhi = mhiCalculator.calculateMHI(highTurbidityReading);
      
      expect(mhi.factors.turbidityPenalty).toBeGreaterThan(0.05);
      expect(mhi.value).toBeLessThan(0.95);
    });

    it('should apply temperature correction', () => {
      const extremeTempReading: SensorReading = {
        ...baseSensorReading,
        temperature: 30 // 10°C above optimal
      };

      const mhi = mhiCalculator.calculateMHI(extremeTempReading);
      
      expect(mhi.factors.temperatureCorrection).toBeGreaterThan(0);
      expect(mhi.value).toBeLessThan(0.98);
    });

    it('should apply pH risk assessment', () => {
      const extremePHReading: SensorReading = {
        ...baseSensorReading,
        pH: 6.0 // Below optimal range
      };

      const mhi = mhiCalculator.calculateMHI(extremePHReading);
      
      expect(mhi.factors.pHRisk).toBeGreaterThan(0);
      expect(mhi.value).toBeLessThan(0.98);
    });

    it('should handle bad quality data appropriately', () => {
      const badQualityReading: SensorReading = {
        ...baseSensorReading,
        quality: DataQuality.BAD
      };

      const mhi = mhiCalculator.calculateMHI(badQualityReading);
      
      expect(mhi.value).toBe(0.5); // Default neutral value
      expect(Object.values(mhi.factors).every(f => f === 0)).toBe(true);
    });

    it('should handle missing data appropriately', () => {
      const missingDataReading: SensorReading = {
        ...baseSensorReading,
        quality: DataQuality.MISSING
      };

      const mhi = mhiCalculator.calculateMHI(missingDataReading);
      
      expect(mhi.value).toBe(0.5); // Default neutral value
    });
  });

  describe('MHI Bounds and Validation', () => {
    it('should always return MHI between 0 and 1', () => {
      // Test extreme conditions
      const extremeReading: SensorReading = {
        ...baseSensorReading,
        deltaPressure: 5.0,    // Very high pressure
        permeateFlux: 5,       // Very low flux
        turbidity: 10,         // Very high turbidity
        temperature: 50,       // Very high temperature
        pH: 4.0               // Very acidic
      };

      const mhi = mhiCalculator.calculateMHI(extremeReading);
      
      expect(mhi.value).toBeGreaterThanOrEqual(0);
      expect(mhi.value).toBeLessThanOrEqual(1);
    });

    it('should have consistent factor calculations', () => {
      const mhi = mhiCalculator.calculateMHI(baseSensorReading);
      
      // All factors should be non-negative
      Object.values(mhi.factors).forEach(factor => {
        expect(factor).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Weight Configuration', () => {
    it('should use provided weights correctly', () => {
      const customWeights = {
        pressure: 0.5,
        flux: 0.3,
        turbidity: 0.1,
        temperature: 0.05,
        pH: 0.05
      };

      const customCalculator = new MHICalculator(customWeights);
      const weights = customCalculator.getWeights();
      
      expect(weights.pressure).toBe(0.5);
      expect(weights.flux).toBe(0.3);
      expect(weights.turbidity).toBe(0.1);
    });

    it('should validate weight sum equals 1.0', () => {
      const invalidWeights = {
        pressure: 0.5,
        flux: 0.3,
        turbidity: 0.1,
        temperature: 0.1,
        pH: 0.2 // Sum = 1.2, invalid
      };

      expect(() => new MHICalculator(invalidWeights)).toThrow();
    });
  });

  describe('Historical Analysis', () => {
    it('should build historical data for trend analysis', () => {
      // Generate series of readings with deteriorating conditions
      const readings: SensorReading[] = [];
      for (let i = 0; i < 15; i++) {
        readings.push({
          ...baseSensorReading,
          timestamp: new Date(Date.now() + i * 60000), // 1 minute intervals
          deltaPressure: 0.8 + i * 0.05, // Gradually increasing pressure
          permeateFlux: 45 - i * 1        // Gradually decreasing flux
        });
      }

      const mhiValues = readings.map(reading => mhiCalculator.calculateMHI(reading));
      
      // MHI should generally decrease over time
      expect(mhiValues[0].value).toBeGreaterThan(mhiValues[mhiValues.length - 1].value);
    });

    it('should reset historical data correctly', () => {
      // Build some history
      for (let i = 0; i < 5; i++) {
        mhiCalculator.calculateMHI({
          ...baseSensorReading,
          timestamp: new Date(Date.now() + i * 60000)
        });
      }

      mhiCalculator.reset();

      // After reset, should not use historical trend
      const mhi = mhiCalculator.calculateMHI(baseSensorReading);
      expect(mhi.value).toBeGreaterThan(0.8); // Should be high for optimal conditions
    });
  });
});

describe('FoulingKineticsModel', () => {
  let foulingModel: FoulingKineticsModel;
  let baseSensorReading: SensorReading;

  beforeEach(() => {
    foulingModel = new FoulingKineticsModel();
    baseSensorReading = {
      timestamp: new Date(),
      deltaPressure: 0.8,
      permeateFlux: 45,
      turbidity: 0.5,
      conductivity: 1200,
      pH: 7.2,
      temperature: 20,
      flowRate: 100,
      quality: DataQuality.GOOD
    };
  });

  describe('Fouling Rate Prediction', () => {
    it('should predict higher fouling rate for high turbidity', () => {
      const lowTurbidityReading = { ...baseSensorReading, turbidity: 0.2 };
      const highTurbidityReading = { ...baseSensorReading, turbidity: 2.0 };

      const lowRate = foulingModel.predictFoulingRate(lowTurbidityReading);
      const highRate = foulingModel.predictFoulingRate(highTurbidityReading);

      expect(highRate).toBeGreaterThan(lowRate);
    });

    it('should predict higher fouling rate for lower temperature', () => {
      const lowTempReading = { ...baseSensorReading, temperature: 10 };
      const highTempReading = { ...baseSensorReading, temperature: 30 };

      const lowTempRate = foulingModel.predictFoulingRate(lowTempReading);
      const highTempRate = foulingModel.predictFoulingRate(highTempReading);

      expect(lowTempRate).toBeGreaterThan(highTempRate);
    });

    it('should return positive fouling rates', () => {
      const rate = foulingModel.predictFoulingRate(baseSensorReading);
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('Time to Threshold Prediction', () => {
    it('should predict reasonable time to reach critical threshold', () => {
      const currentMHI = 0.8;
      const targetMHI = 0.3;

      const timeToThreshold = foulingModel.predictTimeToThreshold(
        currentMHI,
        targetMHI,
        baseSensorReading
      );

      expect(timeToThreshold).toBeGreaterThan(0);
      expect(timeToThreshold).toBeLessThan(1000); // Should be reasonable (< 1000 hours)
    });

    it('should return 0 when current MHI is already below target', () => {
      const currentMHI = 0.2;
      const targetMHI = 0.3;

      const timeToThreshold = foulingModel.predictTimeToThreshold(
        currentMHI,
        targetMHI,
        baseSensorReading
      );

      expect(timeToThreshold).toBe(0);
    });

    it('should predict shorter time for worse conditions', () => {
      const goodConditions = { ...baseSensorReading, turbidity: 0.2 };
      const badConditions = { ...baseSensorReading, turbidity: 3.0 };

      const timeGoodConditions = foulingModel.predictTimeToThreshold(0.8, 0.3, goodConditions);
      const timeBadConditions = foulingModel.predictTimeToThreshold(0.8, 0.3, badConditions);

      expect(timeBadConditions).toBeLessThan(timeGoodConditions);
    });
  });
});

describe('MHI Time Series', () => {
  it('should calculate MHI series from sensor readings', () => {
    const readings: SensorReading[] = [];
    
    // Generate 10 sensor readings
    for (let i = 0; i < 10; i++) {
      readings.push({
        timestamp: new Date(Date.now() + i * 60000),
        deltaPressure: 0.8 + i * 0.02,
        permeateFlux: 45 - i * 0.5,
        turbidity: 0.5,
        conductivity: 1200,
        pH: 7.2,
        temperature: 20,
        flowRate: 100,
        quality: DataQuality.GOOD
      });
    }

    const mhiSeries = calculateMHITimeSeries(readings);

    expect(mhiSeries).toHaveLength(10);
    
    // Each MHI should have all required properties
    mhiSeries.forEach(mhi => {
      expect(mhi.value).toBeGreaterThanOrEqual(0);
      expect(mhi.value).toBeLessThanOrEqual(1);
      expect(mhi.timestamp).toBeInstanceOf(Date);
      expect(mhi.factors).toBeDefined();
    });

    // MHI should generally decrease as conditions worsen
    expect(mhiSeries[0].value).toBeGreaterThanOrEqual(mhiSeries[mhiSeries.length - 1].value);
  });

  it('should handle mixed quality data in time series', () => {
    const readings: SensorReading[] = [
      {
        timestamp: new Date(),
        deltaPressure: 0.8,
        permeateFlux: 45,
        turbidity: 0.5,
        conductivity: 1200,
        pH: 7.2,
        temperature: 20,
        flowRate: 100,
        quality: DataQuality.GOOD
      },
      {
        timestamp: new Date(Date.now() + 60000),
        deltaPressure: 0.9,
        permeateFlux: 43,
        turbidity: 0.6,
        conductivity: 1200,
        pH: 7.2,
        temperature: 20,
        flowRate: 100,
        quality: DataQuality.BAD // Bad quality data
      },
      {
        timestamp: new Date(Date.now() + 120000),
        deltaPressure: 1.0,
        permeateFlux: 40,
        turbidity: 0.8,
        conductivity: 1200,
        pH: 7.2,
        temperature: 20,
        flowRate: 100,
        quality: DataQuality.GOOD
      }
    ];

    const mhiSeries = calculateMHITimeSeries(readings);

    expect(mhiSeries).toHaveLength(3);
    expect(mhiSeries[1].value).toBe(0.5); // Default value for bad quality
    expect(mhiSeries[0].value).toBeGreaterThan(0.5);
    expect(mhiSeries[2].value).toBeGreaterThan(0.5);
  });
});
