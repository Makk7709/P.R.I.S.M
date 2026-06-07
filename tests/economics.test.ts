import { describe, it, expect, beforeEach } from 'vitest';
import { EconomicCalculator, CIPEvent } from '../simulation/economics.js';
import { EconomicParams, Recommendation, DEFAULT_CONFIG } from '../simulation/types.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// ECONOMIC CALCULATOR TESTS - PRISM-IND
// ═══════════════════════════════════════════════════════════════════════════════════

describe('EconomicCalculator', () => {
  let economicCalculator: EconomicCalculator;
  let economicParams: EconomicParams;

  beforeEach(() => {
    economicParams = DEFAULT_CONFIG.economics;
    economicCalculator = new EconomicCalculator(economicParams);
  });

  describe('CIP Event Recording', () => {
    it('should record CIP event and calculate costs correctly', () => {
      const cipEvent: CIPEvent = {
        timestamp: new Date(),
        duration: 3, // 3 hours
        reason: 'Test CIP',
        strategy: 'BASELINE'
      };

      const totalCost = economicCalculator.recordCIPEvent(cipEvent);

      const expectedChemistryCost = economicParams.cipChemistryCost;
      const expectedEnergyCost = economicParams.cipEnergyConsumption * economicParams.energyCost;
      const expectedProductionLoss = cipEvent.duration * economicParams.productionValue;
      const expectedTotalCost = expectedChemistryCost + expectedEnergyCost + expectedProductionLoss;

      expect(totalCost).toBe(expectedTotalCost);
    });

    it('should track multiple CIP events', () => {
      const cipEvent1: CIPEvent = {
        timestamp: new Date(),
        duration: 3,
        reason: 'First CIP',
        strategy: 'BASELINE'
      };

      const cipEvent2: CIPEvent = {
        timestamp: new Date(Date.now() + 86400000), // Next day
        duration: 2.5,
        reason: 'Second CIP',
        strategy: 'PRISM_IND'
      };

      economicCalculator.recordCIPEvent(cipEvent1);
      economicCalculator.recordCIPEvent(cipEvent2);

      const cipEvents = economicCalculator.getCIPEvents();
      expect(cipEvents).toHaveLength(2);
      expect(cipEvents[0].strategy).toBe('BASELINE');
      expect(cipEvents[1].strategy).toBe('PRISM_IND');
    });

    it('should update membrane lifecycle after CIP', () => {
      const cipEvent: CIPEvent = {
        timestamp: new Date(),
        duration: 3,
        reason: 'Test CIP',
        strategy: 'BASELINE'
      };

      const initialMembraneStatus = economicCalculator.getMembraneStatus();
      economicCalculator.recordCIPEvent(cipEvent);
      const updatedMembraneStatus = economicCalculator.getMembraneStatus();

      expect(updatedMembraneStatus.currentLifeReduction).toBe(
        initialMembraneStatus.currentLifeReduction + economicParams.lifeReductionPerCip
      );
      expect(updatedMembraneStatus.residualValue).toBeLessThan(initialMembraneStatus.residualValue);
    });
  });

  describe('Production Recording', () => {
    it('should record normal production correctly', () => {
      const timestamp = new Date();
      const duration = 2; // 2 hours
      const efficiency = 0.95; // 95% efficiency

      const value = economicCalculator.recordProduction(timestamp, duration, efficiency);

      const expectedValue = duration * economicParams.productionValue * efficiency;
      expect(value).toBe(expectedValue);

      const productionEvents = economicCalculator.getProductionEvents();
      expect(productionEvents).toHaveLength(1);
      expect(productionEvents[0].value).toBe(expectedValue);
      expect(productionEvents[0].lost_due_to).toBeNull();
    });

    it('should handle production at different efficiency levels', () => {
      const fullEfficiencyValue = economicCalculator.recordProduction(new Date(), 1, 1);
      const reducedEfficiencyValue = economicCalculator.recordProduction(new Date(), 1, 0.8);

      expect(fullEfficiencyValue).toBe(economicParams.productionValue);
      expect(reducedEfficiencyValue).toBe(economicParams.productionValue * 0.8);
    });
  });

  describe('ROI Calculations', () => {
    it('should calculate positive ROI for CLEAN_NOW when MHI is critical', () => {
      const currentMHI = 0.2; // Critical MHI
      const hoursUntilScheduledCIP = 24;

      const roi = economicCalculator.calculateActionROI(
        Recommendation.CLEAN_NOW,
        currentMHI,
        hoursUntilScheduledCIP
      );

      // Should be positive due to avoiding production loss from severe fouling
      expect(roi).toBeGreaterThan(0);
    });

    it('should calculate ROI for delay recommendations', () => {
      const currentMHI = 0.7; // Good MHI
      const hoursUntilScheduledCIP = 6;

      const delay12hROI = economicCalculator.calculateActionROI(
        Recommendation.DELAY_12H,
        currentMHI,
        hoursUntilScheduledCIP
      );

      const delay24hROI = economicCalculator.calculateActionROI(
        Recommendation.DELAY_24H,
        currentMHI,
        hoursUntilScheduledCIP
      );

      // Both should be defined numbers
      expect(typeof delay12hROI).toBe('number');
      expect(typeof delay24hROI).toBe('number');
      
      // 24h delay should typically have higher value (more production time)
      expect(delay24hROI).toBeGreaterThan(delay12hROI);
    });

    it('should calculate ROI for setpoint adjustments', () => {
      const currentMHI = 0.6;
      const hoursUntilScheduledCIP = 12;

      const adjustROI = economicCalculator.calculateActionROI(
        Recommendation.ADJUST_SETPOINTS,
        currentMHI,
        hoursUntilScheduledCIP
      );

      expect(typeof adjustROI).toBe('number');
      // Should typically be positive due to life extension benefits
      expect(adjustROI).toBeGreaterThan(-1000); // Reasonable bound
    });

    it('should return 0 ROI for invalid recommendations', () => {
      const roi = economicCalculator.calculateActionROI(
        'INVALID_RECOMMENDATION' as Recommendation,
        0.5,
        12
      );

      expect(roi).toBe(0);
    });
  });

  describe('Strategy Metrics Comparison', () => {
    it('should calculate baseline strategy metrics', () => {
      // Simulate baseline strategy: CIP every 48 hours
      const cipEvents: CIPEvent[] = [
        {
          timestamp: new Date(Date.now()),
          duration: 3,
          reason: 'Calendar CIP 1',
          strategy: 'BASELINE'
        },
        {
          timestamp: new Date(Date.now() + 48 * 3600000),
          duration: 3,
          reason: 'Calendar CIP 2',
          strategy: 'BASELINE'
        },
        {
          timestamp: new Date(Date.now() + 96 * 3600000),
          duration: 3,
          reason: 'Calendar CIP 3',
          strategy: 'BASELINE'
        }
      ];

      cipEvents.forEach(event => economicCalculator.recordCIPEvent(event));

      const metrics = economicCalculator.calculateStrategyMetrics('BASELINE');

      expect(metrics.cipCount).toBe(3);
      expect(metrics.totalDowntime).toBe(9); // 3 CIPs × 3 hours each
      expect(metrics.totalOpex).toBeGreaterThan(0);
      expect(metrics.remainingMembraneLife).toBeLessThan(100);
    });

    it('should calculate PRISM-IND strategy metrics', () => {
      // Simulate PRISM-IND strategy: fewer, optimized CIPs
      const cipEvents: CIPEvent[] = [
        {
          timestamp: new Date(Date.now()),
          duration: 3,
          reason: 'PRISM-IND optimized CIP 1',
          strategy: 'PRISM_IND'
        },
        {
          timestamp: new Date(Date.now() + 72 * 3600000),
          duration: 3,
          reason: 'PRISM-IND optimized CIP 2',
          strategy: 'PRISM_IND'
        }
      ];

      cipEvents.forEach(event => economicCalculator.recordCIPEvent(event));

      const metrics = economicCalculator.calculateStrategyMetrics('PRISM_IND');

      expect(metrics.cipCount).toBe(2);
      expect(metrics.totalDowntime).toBe(6); // 2 CIPs × 3 hours each
      expect(metrics.totalOpex).toBeGreaterThan(0);
      expect(metrics.remainingMembraneLife).toBeGreaterThan(0);
    });

    it('should generate comprehensive economic summary', () => {
      // Setup baseline strategy
      const baselineCIP: CIPEvent = {
        timestamp: new Date(),
        duration: 3,
        reason: 'Baseline CIP',
        strategy: 'BASELINE'
      };
      economicCalculator.recordCIPEvent(baselineCIP);

      // Setup PRISM-IND strategy  
      const prismCIP: CIPEvent = {
        timestamp: new Date(Date.now() + 86400000),
        duration: 3,
        reason: 'PRISM-IND CIP',
        strategy: 'PRISM_IND'
      };
      economicCalculator.recordCIPEvent(prismCIP);

      const summary = economicCalculator.generateEconomicSummary();

      expect(summary.baseline).toBeDefined();
      expect(summary.prismInd).toBeDefined();
      expect(summary.comparison).toBeDefined();

      // Comparison should have all required fields
      expect(summary.comparison.downtimeSaved).toBeDefined();
      expect(summary.comparison.cipReduction).toBeDefined();
      expect(summary.comparison.opexSavings).toBeDefined();
      expect(summary.comparison.productionGain).toBeDefined();
      expect(summary.comparison.membraneLifeExtension).toBeDefined();
      expect(summary.comparison.netROI).toBeDefined();
    });
  });

  describe('Membrane Lifecycle Management', () => {
    it('should initialize membrane lifecycle correctly', () => {
      const membraneStatus = economicCalculator.getMembraneStatus();

      expect(membraneStatus.initialCost).toBe(economicParams.membraneCost);
      expect(membraneStatus.nominalLifeMonths).toBe(economicParams.nominalMembraneLife);
      expect(membraneStatus.currentLifeReduction).toBe(0);
      expect(membraneStatus.residualValue).toBe(economicParams.membraneCost);
    });

    it('should track membrane degradation over multiple CIPs', () => {
      const initialStatus = economicCalculator.getMembraneStatus();

      // Perform multiple CIPs
      for (let i = 0; i < 5; i++) {
        const cipEvent: CIPEvent = {
          timestamp: new Date(Date.now() + i * 86400000),
          duration: 3,
          reason: `CIP ${i + 1}`,
          strategy: 'BASELINE'
        };
        economicCalculator.recordCIPEvent(cipEvent);
      }

      const finalStatus = economicCalculator.getMembraneStatus();

      const expectedLifeReduction = 5 * economicParams.lifeReductionPerCip;
      expect(finalStatus.currentLifeReduction).toBe(expectedLifeReduction);
      expect(finalStatus.residualValue).toBeLessThan(initialStatus.residualValue);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle zero duration CIP events', () => {
      const zeroDurationCIP: CIPEvent = {
        timestamp: new Date(),
        duration: 0,
        reason: 'Zero duration test',
        strategy: 'BASELINE'
      };

      const cost = economicCalculator.recordCIPEvent(zeroDurationCIP);
      
      // Should still have chemistry and energy costs, but no production loss
      const expectedCost = economicParams.cipChemistryCost + 
                          (economicParams.cipEnergyConsumption * economicParams.energyCost);
      expect(cost).toBe(expectedCost);
    });

    it('should handle negative efficiency in production recording', () => {
      const negativeEfficiencyValue = economicCalculator.recordProduction(
        new Date(), 
        1, 
        -0.1 // Negative efficiency
      );

      // Should handle gracefully (could clamp to 0 or handle as error)
      expect(typeof negativeEfficiencyValue).toBe('number');
    });

    it('should reset calculator state correctly', () => {
      // Add some events
      const cipEvent: CIPEvent = {
        timestamp: new Date(),
        duration: 3,
        reason: 'Test CIP',
        strategy: 'BASELINE'
      };
      economicCalculator.recordCIPEvent(cipEvent);
      economicCalculator.recordProduction(new Date(), 1, 1);

      // Reset
      economicCalculator.reset();

      // Verify reset
      expect(economicCalculator.getCIPEvents()).toHaveLength(0);
      expect(economicCalculator.getProductionEvents()).toHaveLength(0);
      
      const membraneStatus = economicCalculator.getMembraneStatus();
      expect(membraneStatus.currentLifeReduction).toBe(0);
      expect(membraneStatus.residualValue).toBe(economicParams.membraneCost);
    });
  });

  describe('Economic Parameter Sensitivity', () => {
    it('should be sensitive to production value changes', () => {
      const highValueParams = { ...economicParams, productionValue: 2000 };
      const highValueCalculator = new EconomicCalculator(highValueParams);

      const currentMHI = 0.3;
      const hoursUntilCIP = 24;

      const normalROI = economicCalculator.calculateActionROI(
        Recommendation.DELAY_24H, currentMHI, hoursUntilCIP
      );
      const highValueROI = highValueCalculator.calculateActionROI(
        Recommendation.DELAY_24H, currentMHI, hoursUntilCIP
      );

      // Higher production value should generally increase ROI for delays
      expect(highValueROI).toBeGreaterThan(normalROI);
    });

    it('should be sensitive to CIP cost changes', () => {
      const highCostParams = { ...economicParams, cipChemistryCost: 1000 };
      const highCostCalculator = new EconomicCalculator(highCostParams);

      const currentMHI = 0.5;
      const hoursUntilCIP = 12;

      const normalROI = economicCalculator.calculateActionROI(
        Recommendation.CLEAN_NOW, currentMHI, hoursUntilCIP
      );
      const highCostROI = highCostCalculator.calculateActionROI(
        Recommendation.CLEAN_NOW, currentMHI, hoursUntilCIP
      );

      // Higher CIP costs should reduce ROI for immediate cleaning
      expect(highCostROI).toBeLessThan(normalROI);
    });
  });
});
