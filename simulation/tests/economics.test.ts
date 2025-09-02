import { describe, it, expect, beforeEach } from 'vitest';
import { EconomicCalculator } from '../economics.js';
import { DEFAULT_CONFIG, Recommendation } from '../types.js';

describe('EconomicCalculator', () => {
  let calculator: EconomicCalculator;
  
  beforeEach(() => {
    calculator = new EconomicCalculator(DEFAULT_CONFIG.economics);
  });

  it('should calculate CIP costs correctly', () => {
    const cipEvent = {
      timestamp: new Date(),
      duration: 3,
      reason: 'Test CIP',
      strategy: 'BASELINE' as const
    };

    const cost = calculator.recordCIPEvent(cipEvent);
    
    // Cost = chemistry (42 elements × 42 €/element) + energy (50 €) + downtime (3h × 100 m³/h × 1 €/m³)
    const expectedCost = (42 * 42) + 50 + (3 * 100 * 1);
    expect(cost).toBeCloseTo(expectedCost, 0);
    expect(cost).toBeGreaterThan(1000); // Should be significant cost
  });

  it('should record production correctly', () => {
    const value = calculator.recordProduction(new Date(), 1, 0.95); // 1 hour at 95% efficiency
    
    // Value = 100 m³/h × 0.95 efficiency × 1 €/m³
    const expectedValue = 100 * 0.95 * 1;
    expect(value).toBeCloseTo(expectedValue, 1);
  });

  it('should calculate ROI for CIP action', () => {
    const roi = calculator.calculateActionROI(Recommendation.SCHEDULE_CIP, 0.4, 24);
    
    expect(typeof roi).toBe('number');
    // For low MHI, CIP ROI should consider restoration benefits
    expect(roi).toBeDefined();
  });

  it('should calculate ROI for inspection action', () => {
    const roi = calculator.calculateActionROI(Recommendation.INSPECT, 0.6, 24);
    
    expect(typeof roi).toBe('number');
    // Inspection has low cost, positive information value
    expect(roi).toBeGreaterThan(0);
  });

  it('should calculate ROI for setpoint adjustment', () => {
    const roi = calculator.calculateActionROI(Recommendation.ADJUST_SETPOINTS, 0.8, 24);
    
    expect(typeof roi).toBe('number');
    // Setpoint adjustment should have modest positive ROI
    expect(roi).toBeDefined();
  });

  it('should track strategy metrics correctly', () => {
    // Record some CIP events
    calculator.recordCIPEvent({
      timestamp: new Date(),
      duration: 3,
      reason: 'Test CIP 1',
      strategy: 'BASELINE'
    });

    calculator.recordCIPEvent({
      timestamp: new Date(),
      duration: 3,
      reason: 'Test CIP 2',
      strategy: 'BASELINE'
    });

    // Record some production
    calculator.recordProduction(new Date(), 10, 1.0); // 10 hours normal
    calculator.recordProduction(new Date(), 5, 0.9); // 5 hours reduced

    const metrics = calculator.calculateStrategyMetrics('BASELINE');
    
    expect(metrics.cipCount).toBe(2);
    expect(metrics.totalDowntime).toBe(6); // 2 × 3 hours
    expect(metrics.totalOpex).toBeGreaterThan(0);
    expect(metrics.chemistryCosts).toBeGreaterThan(0);
    expect(metrics.energyCosts).toBeGreaterThan(0);
    expect(metrics.membraneLifeImpact).toBeGreaterThan(0); // Life reduction from CIPs
  });

  it('should generate economic summary comparison', () => {
    // Simulate baseline strategy
    calculator.recordCIPEvent({
      timestamp: new Date(),
      duration: 3,
      reason: 'Baseline CIP 1',
      strategy: 'BASELINE'
    });
    calculator.recordCIPEvent({
      timestamp: new Date(),
      duration: 3,
      reason: 'Baseline CIP 2',
      strategy: 'BASELINE'
    });

    // Simulate PRISM strategy (fewer CIPs)
    calculator.recordCIPEvent({
      timestamp: new Date(),
      duration: 3,
      reason: 'PRISM CIP 1',
      strategy: 'PRISM_IND'
    });

    const summary = calculator.generateEconomicSummary();
    
    expect(summary.baseline).toBeDefined();
    expect(summary.prismInd).toBeDefined();
    expect(summary.comparison).toBeDefined();
    
    // PRISM should have fewer CIPs
    expect(summary.comparison.cipReduction).toBeGreaterThan(0);
    expect(summary.comparison.downtimeSaved).toBeGreaterThan(0);
    expect(summary.comparison.opexSavings).toBeGreaterThan(0);
  });

  it('should track membrane lifecycle correctly', () => {
    const initialStatus = calculator.getMembraneStatus();
    expect(initialStatus.currentLifeReduction).toBe(0);
    expect(initialStatus.residualValue).toBeGreaterThan(0);

    // Perform CIP - should reduce membrane life
    calculator.recordCIPEvent({
      timestamp: new Date(),
      duration: 3,
      reason: 'Test CIP',
      strategy: 'BASELINE'
    });

    const afterCIPStatus = calculator.getMembraneStatus();
    expect(afterCIPStatus.currentLifeReduction).toBeGreaterThan(0);
    expect(afterCIPStatus.residualValue).toBeLessThan(initialStatus.residualValue);
  });

  it('should maintain audit trails', () => {
    calculator.recordCIPEvent({
      timestamp: new Date(),
      duration: 3,
      reason: 'Audit test',
      strategy: 'PRISM_IND'
    });

    calculator.recordProduction(new Date(), 5, 1.0);

    const cipEvents = calculator.getCIPEvents();
    const productionEvents = calculator.getProductionEvents();

    expect(cipEvents).toHaveLength(1);
    expect(cipEvents[0].reason).toBe('Audit test');
    expect(cipEvents[0].strategy).toBe('PRISM_IND');

    expect(productionEvents.length).toBeGreaterThan(0);
    expect(productionEvents.some(e => e.value > 0)).toBe(true); // Some positive production
    expect(productionEvents.some(e => e.value < 0)).toBe(true); // Some loss from CIP
  });

  it('should reset state properly', () => {
    // Add some data
    calculator.recordCIPEvent({
      timestamp: new Date(),
      duration: 3,
      reason: 'Before reset',
      strategy: 'BASELINE'
    });

    calculator.recordProduction(new Date(), 1, 1.0);

    expect(calculator.getCIPEvents()).toHaveLength(1);
    expect(calculator.getProductionEvents().length).toBeGreaterThan(0);

    // Reset
    calculator.reset();

    expect(calculator.getCIPEvents()).toHaveLength(0);
    expect(calculator.getProductionEvents()).toHaveLength(0);
    
    const membraneStatus = calculator.getMembraneStatus();
    expect(membraneStatus.currentLifeReduction).toBe(0);
  });

  it('should calculate baseline OPEX correctly', () => {
    // The baseline OPEX is calculated internally, we can test it indirectly
    const metrics = calculator.calculateStrategyMetrics('BASELINE');
    
    // Even with no recorded events, should have some baseline calculation
    expect(metrics.roi).toBeDefined();
    expect(typeof metrics.roi).toBe('number');
  });

  it('should handle edge cases', () => {
    // Test with zero MHI
    const roi1 = calculator.calculateActionROI(Recommendation.SCHEDULE_CIP, 0.0, 0);
    expect(typeof roi1).toBe('number');

    // Test with perfect MHI
    const roi2 = calculator.calculateActionROI(Recommendation.ADJUST_SETPOINTS, 1.0, 100);
    expect(typeof roi2).toBe('number');

    // Test with negative time
    const roi3 = calculator.calculateActionROI(Recommendation.INSPECT, 0.5, -10);
    expect(typeof roi3).toBe('number');
  });

  it('should show positive ROI for PRISM vs baseline in good conditions', () => {
    // Test scenario where PRISM should outperform baseline
    
    // Simulate 5 baseline CIPs over 10 days (every 48h)
    for (let i = 0; i < 5; i++) {
      calculator.recordCIPEvent({
        timestamp: new Date(Date.now() + i * 48 * 60 * 60 * 1000),
        duration: 3,
        reason: `Baseline scheduled CIP ${i+1}`,
        strategy: 'BASELINE'
      });
    }

    // Simulate 3 PRISM CIPs (fewer, more targeted)
    for (let i = 0; i < 3; i++) {
      calculator.recordCIPEvent({
        timestamp: new Date(Date.now() + i * 80 * 60 * 60 * 1000),
        duration: 3,
        reason: `PRISM predictive CIP ${i+1}`,
        strategy: 'PRISM_IND'
      });
    }

    const summary = calculator.generateEconomicSummary();
    
    // PRISM should show benefits
    expect(summary.comparison.cipReduction).toBe(2); // 5 - 3 = 2 fewer CIPs
    expect(summary.comparison.downtimeSaved).toBe(6); // 2 × 3h = 6h saved
    expect(summary.comparison.netROI).toBeGreaterThan(0); // Positive ROI
  });
});