import { PrismAdaptiveCycler } from '../regulation/prismAdaptiveCycler.js';
import kernelBus from '../core/KernelBus.js';
import PrismStorage from '../prismStorage.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../prismBus.js', () => ({
  prismBus: {
    subscribe: jest.fn(),
    publish: jest.fn()
  }
}));

jest.mock('../prismStorage.js', () => {
  return jest.fn().mockImplementation(() => ({
    writeSafe: jest.fn(),
    readSafe: jest.fn(),
    clearExpired: jest.fn()
  }));
});

describe('PrismAdaptiveCycler Persistence', () => {
  let cycler;
  let mockStorage;
  const TEST_STORAGE_KEY = 'prism_adaptive_cycler_state';

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = new PrismStorage();
    cycler = new PrismAdaptiveCycler();
  });

  describe('State Persistence', () => {
    it('should save and restore state with identical interval and efficiency', async () => {
      // Setup initial state
      const testInterval = 8000;
      const testOutcomes = new Array(200).fill(1); // 100% efficiency
      
      cycler.currentCycleInterval = testInterval;
      testOutcomes.forEach(outcome => {
        cycler.outcomes.pushBack(outcome === 1);
      });
      
      // Save state
      cycler.saveState();
      
      // Verify storage call
      expect(mockStorage.writeSafe).toHaveBeenCalledWith(
        TEST_STORAGE_KEY,
        expect.objectContaining({
          currentInterval: testInterval,
          deque: testOutcomes
        })
      );
      
      // Simulate reboot by creating new instance
      const newCycler = new PrismAdaptiveCycler();
      
      // Mock storage read
      mockStorage.readSafe.mockReturnValue({
        currentInterval: testInterval,
        deque: testOutcomes
      });
      
      // Load state
      await newCycler.loadState();
      
      // Verify state restoration
      expect(newCycler.getCurrentCycleInterval()).toBe(testInterval);
      expect(newCycler.currentEfficiency).toBe(1);
    });

    it('should handle expired data', async () => {
      // Mock expired data
      mockStorage.readSafe.mockReturnValue(null);
      
      // Load state
      await cycler.loadState();
      
      // Verify default values
      expect(cycler.getCurrentCycleInterval()).toBe(5000); // default interval
      expect(cycler.currentEfficiency).toBe(0);
    });

    it('should complete save+load operations within 50ms', async () => {
      // Setup test data
      const testData = {
        currentInterval: 10000,
        deque: new Array(200).fill(1)
      };
      
      // Measure save operation
      const saveStart = performance.now();
      cycler.saveState();
      const saveEnd = performance.now();
      
      // Measure load operation
      mockStorage.readSafe.mockReturnValue(testData);
      const loadStart = performance.now();
      await cycler.loadState();
      const loadEnd = performance.now();
      
      // Calculate durations
      const saveDuration = saveEnd - saveStart;
      const loadDuration = loadEnd - loadStart;
      
      // Verify performance
      expect(saveDuration).toBeLessThan(50);
      expect(loadDuration).toBeLessThan(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid stored data gracefully', async () => {
      // Mock invalid data
      mockStorage.readSafe.mockReturnValue({
        currentInterval: 'invalid',
        deque: 'not an array'
      });
      
      // Load state
      await cycler.loadState();
      
      // Verify default values are maintained
      expect(cycler.getCurrentCycleInterval()).toBe(5000);
      expect(cycler.currentEfficiency).toBe(0);
    });

    it('should handle storage errors gracefully', async () => {
      // Mock storage error
      mockStorage.readSafe.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Load state
      await cycler.loadState();
      
      // Verify default values are maintained
      expect(cycler.getCurrentCycleInterval()).toBe(5000);
      expect(cycler.currentEfficiency).toBe(0);
    });
  });
}); 