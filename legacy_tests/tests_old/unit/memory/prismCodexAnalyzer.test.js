const { PrismCodexAnalyzer } = require('../../../__mocks__/prismCodexAnalyzer');

describe('PrismCodexAnalyzer', () => {
  let analyzer;
  let mockPrismBus;

  beforeEach(() => {
    mockPrismBus = {
      emit: jest.fn(),
      subscribe: jest.fn()
    };
    global.prismBus = mockPrismBus;

    analyzer = new PrismCodexAnalyzer({
      analysisWindow: 1000,
      temporalWeight: 0.8,
      patternSensitivity: 3
    });
  });

  describe('subscribeExternalMetrics', () => {
    test('should register a new module with default options', () => {
      const moduleName = 'testModule';
      analyzer.subscribeExternalMetrics(moduleName);
      expect(mockPrismBus.subscribe).toHaveBeenCalled();
    });

    test('should register a module with custom options', () => {
      const moduleName = 'testModule';
      const options = { updateInterval: 500 };
      analyzer.subscribeExternalMetrics(moduleName, options);
      expect(mockPrismBus.subscribe).toHaveBeenCalled();
    });

    test('should normalize metrics values between 0 and 1', () => {
      const moduleName = 'testModule';
      analyzer.subscribeExternalMetrics(moduleName);
      const callback = mockPrismBus.subscribe.mock.calls[0][1];
      callback({ value: 200 });
      expect(analyzer.getMetrics()[moduleName]).toBeLessThanOrEqual(1);
    });

    test('should respect update interval', async () => {
      const moduleName = 'testModule';
      const options = { updateInterval: 100 };
      analyzer.subscribeExternalMetrics(moduleName, options);
      const callback = mockPrismBus.subscribe.mock.calls[0][1];
      
      callback({ value: 0.5 });
      callback({ value: 0.6 });
      
      expect(mockPrismBus.emit).toHaveBeenCalledTimes(1);
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockPrismBus.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('predictSystemState', () => {
    test('should generate a system prediction with all required fields', () => {
      const prediction = analyzer.predictNextState([]);
      expect(prediction).toHaveProperty('riskLevel');
      expect(prediction).toHaveProperty('probability');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('metrics');
    });

    test('should calculate system risk correctly', () => {
      const events = [
        { type: 'error', severity: 'high' },
        { type: 'warning', severity: 'medium' }
      ];
      const prediction = analyzer.predictNextState(events);
      expect(prediction.riskLevel).toBe('high');
      expect(prediction.probability).toBeGreaterThan(0.5);
    });

    test('should emit system prediction event', () => {
      analyzer.predictNextState([]);
      expect(mockPrismBus.emit).toHaveBeenCalledWith(
        'prism:codex:prediction',
        expect.any(Object)
      );
    });
  });

  describe('metric impact calculation', () => {
    test('should calculate correct impact for awake level', () => {
      const metrics = analyzer.calculateMetricImpact('awakeLevel', 0.8);
      expect(metrics).toHaveProperty('stability');
      expect(metrics.stability).toBeGreaterThan(0.7);
    });

    test('should calculate correct impact for cognitive vitality', () => {
      const metrics = analyzer.calculateMetricImpact('cognitiveVitality', 0.9);
      expect(metrics).toHaveProperty('adaptability');
      expect(metrics.adaptability).toBeGreaterThan(0.8);
    });

    test('should calculate correct impact for adaptive inertia', () => {
      const metrics = analyzer.calculateMetricImpact('adaptiveInertia', 0.6);
      expect(metrics).toHaveProperty('efficiency');
      expect(metrics.efficiency).toBeLessThan(0.7);
    });
  });

  describe('system recommendations', () => {
    test('should generate high priority recommendations for critical risk', () => {
      const events = [
        { type: 'error', severity: 'critical' },
        { type: 'error', severity: 'critical' }
      ];
      const recommendations = analyzer.generateRecommendations(events);
      expect(recommendations[0].priority).toBe('high');
    });

    test('should generate medium priority recommendations for moderate risk', () => {
      const events = [
        { type: 'warning', severity: 'medium' }
      ];
      const recommendations = analyzer.generateRecommendations(events);
      expect(recommendations[0].priority).toBe('medium');
    });
  });

  describe('performance constraints', () => {
    test('should process 10000 events and 100 metrics within 750ms', () => {
      const events = Array(10000).fill(null).map(() => ({
        type: 'test',
        timestamp: Date.now()
      }));
      const metrics = Array(100).fill(null).map(() => ({
        name: 'test',
        value: Math.random()
      }));

      const start = performance.now();
      analyzer.processEvents(events);
      analyzer.processMetrics(metrics);
      const end = performance.now();

      expect(end - start).toBeLessThan(750);
    });
  });
}); 