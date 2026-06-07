import PrismStateStore from '../persistence/prismStateStore';

describe('PrismStateStore', () => {
  let store;
  const testKey = 'testModule';
  const testData = { value: 42, timestamp: Date.now() };

  beforeEach(() => {
    store = new PrismStateStore();
    // Nettoyer le localStorage avant chaque test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('saveState', () => {
    it('should save state successfully', async () => {
      await expect(store.saveState(testKey, testData)).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      // Simuler une erreur en rendant localStorage inaccessible
      if (typeof localStorage !== 'undefined') {
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = () => { throw new Error('Storage error'); };
        
        await expect(store.saveState(testKey, testData)).rejects.toThrow('Storage error');
        
        localStorage.setItem = originalSetItem;
      }
    });
  });

  describe('loadState', () => {
    it('should load saved state correctly', async () => {
      await store.saveState(testKey, testData);
      const loadedData = await store.loadState(testKey);
      expect(loadedData).toEqual(testData);
    });

    it('should return null for non-existent state', async () => {
      const loadedData = await store.loadState('nonExistentKey');
      expect(loadedData).toBeNull();
    });

    it('should handle expired state', async () => {
      const expiredData = {
        data: testData,
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 heures
        ttl: 24 * 60 * 60 * 1000 // 24 heures
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          `prism_state_${testKey}`,
          btoa(JSON.stringify(expiredData))
        );
      }

      const loadedData = await store.loadState(testKey);
      expect(loadedData).toBeNull();
    });
  });

  describe('clearExpired', () => {
    it('should clear expired states', async () => {
      const expiredData = {
        data: testData,
        timestamp: Date.now() - (25 * 60 * 60 * 1000),
        ttl: 24 * 60 * 60 * 1000
      };

      const validData = {
        data: testData,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          `prism_state_expired`,
          btoa(JSON.stringify(expiredData))
        );
        localStorage.setItem(
          `prism_state_valid`,
          btoa(JSON.stringify(validData))
        );
      }

      await store.clearExpired();

      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('prism_state_expired')).toBeNull();
        expect(localStorage.getItem('prism_state_valid')).not.toBeNull();
      }
    });
  });

  describe('Performance', () => {
    it('should handle large state data within 50ms', async () => {
      const largeData = {
        array: new Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() })),
        timestamp: Date.now()
      };

      const startTime = performance.now();
      await store.saveState('largeData', largeData);
      const saveTime = performance.now() - startTime;

      const loadStartTime = performance.now();
      await store.loadState('largeData');
      const loadTime = performance.now() - loadStartTime;

      expect(saveTime).toBeLessThan(50);
      expect(loadTime).toBeLessThan(50);
    });
  });
}); 