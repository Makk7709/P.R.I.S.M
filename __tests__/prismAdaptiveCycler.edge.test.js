import { PrismAdaptiveCycler } from '../regulation/prismAdaptiveCycler.js';
import kernelBus from '../core/KernelBus.js';

// Mock prismBus
jest.mock('../prismBus.js', () => ({
  prismBus: {
    subscribe: jest.fn(),
    publish: jest.fn()
  }
}));

// Désactiver les logs pendant les tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('PrismAdaptiveCycler Edge Cases', () => {
  let cycler;
  let mockPerformance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockPerformance = {
      now: jest.fn().mockReturnValue(0)
    };
    global.performance = mockPerformance;
    
    cycler = new PrismAdaptiveCycler();
    cycler.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Threshold Edge Cases', () => {
    beforeEach(() => {
      cycler = new PrismAdaptiveCycler();
      cycler.initialize();
    });

    it('should reduce interval when efficiency is high', () => {
      // Simuler une haute efficacité avec une série de succès
      for (let i = 0; i < 200; i++) {
        cycler.handleDirectiveOutcome({ success: true });
      }
      
      const initialInterval = cycler.getCurrentCycleInterval();
      const efficiency = cycler.getCurrentEfficiency();
      
      // Vérifier que l'efficacité est supérieure à 80%
      expect(efficiency).toBeGreaterThan(0.8);
      
      // Vérifier que l'intervalle a été réduit
      const finalInterval = cycler.getCurrentCycleInterval();
      expect(finalInterval).toBe(Math.max(1000, initialInterval * 0.8));
      
      // Vérifier que l'événement a été publié avec le bon ajustement
      expect(prismBus.publish).toHaveBeenCalledWith(
        'prism:adaptiveCycler:cycleTuned',
        expect.objectContaining({
          adjustment: -0.2
        })
      );
    });

    it('should increase interval when efficiency is low', () => {
      // Simuler une basse efficacité avec une série d'échecs
      for (let i = 0; i < 200; i++) {
        cycler.handleDirectiveOutcome({ success: false });
      }
      
      const initialInterval = cycler.getCurrentCycleInterval();
      const efficiency = cycler.getCurrentEfficiency();
      
      // Vérifier que l'efficacité est inférieure à 50%
      expect(efficiency).toBeLessThan(0.5);
      
      // Vérifier que l'intervalle a été augmenté
      const finalInterval = cycler.getCurrentCycleInterval();
      expect(finalInterval).toBe(Math.min(30000, initialInterval * 1.3));
      
      // Vérifier que l'événement a été publié avec le bon ajustement
      expect(prismBus.publish).toHaveBeenCalledWith(
        'prism:adaptiveCycler:cycleTuned',
        expect.objectContaining({
          adjustment: 0.3
        })
      );
    });
  });

  describe('Stress Test', () => {
    it('should handle 50,000 outcomes within 2 seconds CPU time', () => {
      const startTime = performance.now();
      
      // Generate 50,000 mixed outcomes
      for (let i = 0; i < 50000; i++) {
        cycler.handleDirectiveOutcome({ success: Math.random() > 0.5 });
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(2000); // 2 seconds
      expect(cycler.outcomes.length).toBe(200); // Window size maintained
      expect(cycler.getCurrentEfficiency()).toBeGreaterThanOrEqual(0);
      expect(cycler.getCurrentEfficiency()).toBeLessThanOrEqual(1);
    });
  });

  describe('Regression Interval Test', () => {
    it('should maintain interval within bounds during alternating success/failure sequence', () => {
      const initialInterval = cycler.getCurrentCycleInterval();
      const minInterval = 1000; // 1 second
      const maxInterval = 30000; // 30 seconds
      
      // Generate alternating sequence
      for (let i = 0; i < 1000; i++) {
        cycler.handleDirectiveOutcome({ success: i % 2 === 0 });
        cycler.adjustCycles();
        
        const currentInterval = cycler.getCurrentCycleInterval();
        expect(currentInterval).toBeGreaterThanOrEqual(minInterval);
        expect(currentInterval).toBeLessThanOrEqual(maxInterval);
      }
      
      // Verify final interval is within bounds
      const finalInterval = cycler.getCurrentCycleInterval();
      expect(finalInterval).toBeGreaterThanOrEqual(minInterval);
      expect(finalInterval).toBeLessThanOrEqual(maxInterval);
    });
  });
}); 