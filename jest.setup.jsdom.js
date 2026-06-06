const { _PrismEvents } = require('./__mocks__/prismEvents');

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock global prismBus
global.prismBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  clear: jest.fn(),
  validateEventName: jest.fn(name => name),
  validateEventData: jest.fn(data => data)
};

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock performance
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn()
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset prismBus mock
  global.prismBus.emit.mockClear();
  global.prismBus.on.mockClear();
  global.prismBus.off.mockClear();
  global.prismBus.clear.mockClear();
  
  // Reset fetch mock
  global.fetch.mockClear();
  
  // Reset console mocks
  global.console.error.mockClear();
  global.console.warn.mockClear();
  global.console.log.mockClear();
  global.console.info.mockClear();
  global.console.debug.mockClear();
  
  // Clean up DOM
  document.body.innerHTML = '';
}); 