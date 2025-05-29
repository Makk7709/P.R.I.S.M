const { MoralLayer } = require('./moralLayer');
const { createLoggerInstance } = require('./logger');

jest.mock('./logger');

describe('MoralLayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('constructor should handle null logger correctly', () => {
    createLoggerInstance.mockReturnValue(null);
    const moralLayer = new MoralLayer();
    expect(moralLayer.logger).toBeNull();
  });

  test('constructor should set logger when creation succeeds', () => {
    const mockLogger = { info: jest.fn(), error: jest.fn() };
    createLoggerInstance.mockReturnValue(mockLogger);
    const moralLayer = new MoralLayer();
    expect(moralLayer.logger).toBe(mockLogger);
  });
}); 