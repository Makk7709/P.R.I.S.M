import { PrismAdaptiveCycler } from '../regulation/prismAdaptiveCycler.js';
import { jest } from '@jest/globals';

// Mock prismBus
jest.mock('../prismBus.js', () => ({
  prismBus: {
    subscribe: jest.fn(),
    publish: jest.fn()
  }
}));

describe('PrismAdaptiveCycler', () => {
  let cycler;
  let mockPerformance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock performance.now
    mockPerformance = {
      now: jest.fn().mockReturnValue(0)
    };
    global.performance = mockPerformance;
    
    cycler = new PrismAdaptiveCycler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', async () => {
      await cycler.initialize();
      expect(prismBus.subscribe).toHaveBeenCalledWith(
        'prism:strategy:directiveOutcome',
        expect.any(Function)
      );
      expect(cycler.getCurrentCycleInterval()).toBe(5000);
      expect(cycler.getCurrentEfficiency()).toBe(0);
    });
  });

  describe('Efficiency Calculation', () => {
    it('should calculate efficiency correctly with sliding window', () => {
      // Add 200 successful outcomes
      for (let i = 0; i < 200; i++) {
        cycler.handleDirectiveOutcome({ success: true });
      }
      expect(cycler.getCurrentEfficiency()).toBe(1);

      // Add 100 failed outcomes
      for (let i = 0; i < 100; i++) {
        cycler.handleDirectiveOutcome({ success: false });
      }
      expect(cycler.getCurrentEfficiency()).toBe(0.5);
    });

    it('should maintain window size of 200', () => {
      // Add 300 successful outcomes
      for (let i = 0; i < 300; i++) {
        cycler.handleDirectiveOutcome({ success: true });
      }
      expect(cycler.outcomes.length).toBe(200);
    });
  });

  describe('Cycle Interval Adjustment', () => {
    it('should reduce interval by 20% when efficiency > 80%', () => {
      // Set high efficiency
      for (let i = 0; i < 200; i++) {
        cycler.handleDirectiveOutcome({ success: true });
      }
      
      const oldInterval = cycler.getCurrentCycleInterval();
      cycler.adjustCycles();
      const newInterval = cycler.getCurrentCycleInterval();
      
      expect(newInterval).toBe(oldInterval * 0.8);
      expect(prismBus.publish).toHaveBeenCalledWith(
        'prism:adaptiveCycler:cycleTuned',
        expect.objectContaining({
          efficiency: 1,
          adjustment: -0.2
        })
      );
    });

    it('should increase interval by 30% when efficiency < 50%', () => {
      // Set low efficiency
      for (let i = 0; i < 200; i++) {
        cycler.handleDirectiveOutcome({ success: false });
      }
      
      const oldInterval = cycler.getCurrentCycleInterval();
      cycler.adjustCycles();
      const newInterval = cycler.getCurrentCycleInterval();
      
      expect(newInterval).toBe(oldInterval * 1.3);
      expect(prismBus.publish).toHaveBeenCalledWith(
        'prism:adaptiveCycler:cycleTuned',
        expect.objectContaining({
          efficiency: 0,
          adjustment: 0.3
        })
      );
    });

    it('should respect minimum interval of 1 second', () => {
      cycler.currentCycleInterval = 1000;
      for (let i = 0; i < 200; i++) {
        cycler.handleDirectiveOutcome({ success: true });
      }
      cycler.adjustCycles();
      expect(cycler.getCurrentCycleInterval()).toBe(1000);
    });

    it('should respect maximum interval of 30 seconds', () => {
      cycler.currentCycleInterval = 30000;
      for (let i = 0; i < 200; i++) {
        cycler.handleDirectiveOutcome({ success: false });
      }
      cycler.adjustCycles();
      expect(cycler.getCurrentCycleInterval()).toBe(30000);
    });
  });

  describe('Performance', () => {
    it('should process 200 outcomes within 200ms', () => {
      const startTime = 0;
      mockPerformance.now.mockReturnValue(startTime);
      
      // Process 200 outcomes
      for (let i = 0; i < 200; i++) {
        cycler.handleDirectiveOutcome({ success: true });
      }
      
      const endTime = 150; // Simulate 150ms processing time
      mockPerformance.now.mockReturnValue(endTime);
      
      // Trigger one more outcome to check performance
      cycler.handleDirectiveOutcome({ success: true });
      
      // No warning should be logged
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should log warning when processing takes more than 200ms', () => {
      const startTime = 0;
      mockPerformance.now.mockReturnValue(startTime);
      
      // Process 200 outcomes
      for (let i = 0; i < 200; i++) {
        cycler.handleDirectiveOutcome({ success: true });
      }
      
      const endTime = 250; // Simulate 250ms processing time
      mockPerformance.now.mockReturnValue(endTime);
      
      // Trigger one more outcome to check performance
      cycler.handleDirectiveOutcome({ success: true });
      
      // Warning should be logged
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ PrismAdaptiveCycler: Performance critique détectée'
      );
    });
  });

  describe('Event Emission', () => {
    it('should emit cycleTuned event with correct data', () => {
      // Set high efficiency
      for (let i = 0; i < 200; i++) {
        cycler.handleDirectiveOutcome({ success: true });
      }
      
      const oldInterval = cycler.getCurrentCycleInterval();
      cycler.adjustCycles();
      
      expect(prismBus.publish).toHaveBeenCalledWith(
        'prism:adaptiveCycler:cycleTuned',
        expect.objectContaining({
          efficiency: 1,
          newInterval: expect.any(Number),
          adjustment: -0.2
        })
      );
    });

    it('should not emit event when no adjustment is needed', () => {
      // Set efficiency between thresholds
      for (let i = 0; i < 100; i++) {
        cycler.handleDirectiveOutcome({ success: true });
      }
      for (let i = 0; i < 100; i++) {
        cycler.handleDirectiveOutcome({ success: false });
      }
      
      cycler.adjustCycles();
      expect(prismBus.publish).not.toHaveBeenCalled();
    });
  });
}); 