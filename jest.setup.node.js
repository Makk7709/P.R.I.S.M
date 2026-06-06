const { _PrismEvents } = require('./__mocks__/prismEvents');

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
}); 