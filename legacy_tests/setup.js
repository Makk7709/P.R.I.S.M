import { jest } from '@jest/globals';

// Mock browser environment
globalThis.window = {
  performance: {
    now: () => Date.now(),
    memory: {
      usedJSHeapSize: 100000000,
      jsHeapSizeLimit: 200000000
    }
  },
  navigator: {
    hardwareConcurrency: 8
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  requestAnimationFrame: callback => setTimeout(callback, 0)
};

globalThis.document = {
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  createElement: jest.fn().mockImplementation(tag => ({
    className: '',
    style: {},
    innerHTML: '',
    appendChild: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }))
};

globalThis.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock PrismBus
globalThis.prismBus = {
  subscribe: jest.fn(),
  publish: jest.fn(),
  unsubscribe: jest.fn()
};

// Mock PrismCompression
class MockPrismCompression {
  optimize(data) {
    return {
      data: data.slice(-1000),
      compressionRatio: data.length > 1000 ? data.length / 1000 : 1
    };
  }
}

// Mock PrismPurgeScheduler
class MockPrismPurgeScheduler {
  constructor() {
    this.strategies = new Map();
  }

  activateStrategy(name, config) {
    this.strategies.set(name, config);
    if (config.callback) {
      setInterval(config.callback, 1000); // Run every second for testing
    }
    return Promise.resolve(true);
  }

  deactivateStrategy(name) {
    this.strategies.delete(name);
  }

  getStrategy(name) {
    return this.strategies.get(name);
  }
}

// Export mocks
globalThis.PrismCompression = MockPrismCompression;
globalThis.PrismPurgeScheduler = MockPrismPurgeScheduler; 