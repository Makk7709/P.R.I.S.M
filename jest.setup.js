import { expect, jest } from '@jest/globals';

// Mock for crypto
const mockSubtle = {
  digest: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
};

global.crypto = {
  subtle: mockSubtle,
  getRandomValues: jest.fn(arr => {
    return arr.map(() => Math.floor(Math.random() * 256));
  }),
};

// Mock for performance.now()
global.performance = {
  now: jest.fn(() => Date.now()),
};

// Add TextEncoder and TextDecoder
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add crypto with subtle API
const crypto = require('crypto');
const { webcrypto } = require('crypto');
global.crypto = {
  ...crypto,
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  subtle: {
    digest: async (algorithm, data) => {
      const encoder = new TextEncoder();
      const message = encoder.encode(data);
      return new Uint8Array(message);
    }
  }
};

// Add window
global.window = {
  onerror: null,
  addEventListener: () => {},
  onunhandledrejection: null,
  performance: {
    memory: null
  }
};

// Add document
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    setAttribute: () => {},
    appendChild: () => {}
  })
};

// Add localStorage
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

// Add sessionStorage
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

// Add console.assert that doesn't throw
const originalAssert = console.assert;
console.assert = (condition, message) => {
  if (!condition) {
    console.warn(`Assertion failed: ${message}`);
  }
};

// Add performance
global.performance = {
  now: () => Date.now(),
  memory: {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0
  }
}; 