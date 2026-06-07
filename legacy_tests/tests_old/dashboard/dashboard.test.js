import Dashboard from '../../dashboard/dashboard.js';

describe('Dashboard', () => {
  let dashboard;
  const mockConfig = {
    openai: { apiKey: 'test-openai-key' },
    anthropic: { apiKey: 'test-anthropic-key' },
    perplexity: { apiKey: 'test-perplexity-key' }
  };

  beforeEach(() => {
    dashboard = new Dashboard(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(dashboard).toHaveProperty('app');
      expect(dashboard).toHaveProperty('server');
      expect(dashboard).toHaveProperty('io');
      expect(dashboard).toHaveProperty('agentRouter');
      expect(dashboard).toHaveProperty('metrics');
    });

    it('should initialize metrics with correct structure', () => {
      expect(dashboard.metrics).toHaveProperty('prompts');
      expect(dashboard.metrics).toHaveProperty('models');
      expect(dashboard.metrics).toHaveProperty('qualityScores');
      expect(dashboard.metrics).toHaveProperty('executionTimes');
      expect(dashboard.metrics).toHaveProperty('alerts');
    });
  });

  describe('setupRoutes', () => {
    it('should set up API routes', () => {
      const routes = dashboard.app._router.stack
        .filter(layer => layer.route)
        .map(layer => layer.route.path);
      
      expect(routes).toContain('/api/metrics');
      expect(routes).toContain('/api/provider-metrics');
    });
  });

  describe('setupWebSocket', () => {
    it('should handle client connections', (done) => {
      const mockSocket = {
        on: jest.fn((event, callback) => {
          if (event === 'disconnect') {
            callback();
          }
        })
      };

      dashboard.io.emit = jest.fn();
      dashboard.setupWebSocket();
      dashboard.io.emit('connection', mockSocket);
      
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      done();
    });
  });

  describe('updateMetrics', () => {
    it('should update prompts history', () => {
      const data = {
        taskType: 'analysis',
        provider: 'openai',
        responseTime: 1000,
        success: true
      };

      dashboard.updateMetrics(data);
      expect(dashboard.metrics.prompts.length).toBe(1);
      expect(dashboard.metrics.prompts[0]).toMatchObject({
        taskType: 'analysis',
        provider: 'openai'
      });
    });

    it('should update model usage', () => {
      const data = {
        provider: 'openai',
        responseTime: 1000,
        success: true
      };

      dashboard.updateMetrics(data);
      expect(dashboard.metrics.models.openai).toBe(1);
    });

    it('should update execution times', () => {
      const data = {
        provider: 'openai',
        responseTime: 1000,
        success: true
      };

      dashboard.updateMetrics(data);
      expect(dashboard.metrics.executionTimes.length).toBe(1);
      expect(dashboard.metrics.executionTimes[0]).toMatchObject({
        provider: 'openai',
        duration: 1000
      });
    });

    it('should update quality scores', () => {
      const data = {
        provider: 'openai',
        responseTime: 1000,
        success: true
      };

      dashboard.updateMetrics(data);
      expect(dashboard.metrics.qualityScores.openai).toBeDefined();
      expect(dashboard.metrics.qualityScores.openai.length).toBe(1);
    });
  });

  describe('calculateQualityScore', () => {
    it('should calculate correct score for successful response', () => {
      const data = {
        responseTime: 1000,
        success: true
      };
      const score = dashboard.calculateQualityScore(data);
      expect(score).toBeGreaterThan(0);
    });

    it('should calculate correct score for failed response', () => {
      const data = {
        responseTime: 1000,
        success: false
      };
      const score = dashboard.calculateQualityScore(data);
      expect(score).toBeLessThan(100);
    });
  });

  describe('checkAlerts', () => {
    it('should create performance alert for slow response', () => {
      const data = {
        provider: 'openai',
        responseTime: 6000,
        success: true
      };

      dashboard.checkAlerts(data);
      expect(dashboard.metrics.alerts.length).toBe(1);
      expect(dashboard.metrics.alerts[0].type).toBe('performance');
    });

    it('should create error alert for failed response', () => {
      const data = {
        provider: 'openai',
        responseTime: 1000,
        success: false
      };

      dashboard.checkAlerts(data);
      expect(dashboard.metrics.alerts.length).toBe(1);
      expect(dashboard.metrics.alerts[0].type).toBe('error');
    });
  });

  describe('trimMetrics', () => {
    it('should trim metrics to max entries', () => {
      const maxEntries = 1000;
      
      // Add more entries than max
      for (let i = 0; i < maxEntries + 100; i++) {
        dashboard.metrics.prompts.push({ timestamp: new Date() });
        dashboard.metrics.executionTimes.push({ timestamp: new Date() });
        dashboard.metrics.qualityScores.openai = new Array(maxEntries + 100).fill(0);
        dashboard.metrics.alerts.push({ timestamp: new Date() });
      }

      dashboard.trimMetrics();
      
      expect(dashboard.metrics.prompts.length).toBe(maxEntries);
      expect(dashboard.metrics.executionTimes.length).toBe(maxEntries);
      expect(dashboard.metrics.qualityScores.openai.length).toBe(maxEntries);
      expect(dashboard.metrics.alerts.length).toBe(maxEntries);
    });
  });

  describe('start', () => {
    it('should start server on specified port', () => {
      const port = 3000;
      dashboard.server.listen = jest.fn((p, callback) => {
        expect(p).toBe(port);
        callback();
      });

      dashboard.start(port);
      expect(dashboard.server.listen).toHaveBeenCalledWith(port, expect.any(Function));
    });
  });
}); 