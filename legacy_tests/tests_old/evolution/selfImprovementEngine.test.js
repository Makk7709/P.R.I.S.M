const { SelfImprovementEngine, ImprovementArea } = require('../../evolution/selfImprovementEngine');

describe('SelfImprovementEngine', () => {
  let engine;
  const mockConfig = {
    maxResponseTime: 5000,
    minQualityScore: 80,
    maxCost: 0.1,
    minImprovementInterval: 1000
  };

  beforeEach(() => {
    engine = new SelfImprovementEngine(mockConfig);
  });

  describe('analyzeTaskResult', () => {
    it('should analyze task result and identify improvement areas', async () => {
      const taskResult = {
        taskId: 'task123',
        taskDescription: 'analyze this data',
        response: 'Analysis result',
        responseTime: 6000,
        success: true,
        model: 'gpt-4'
      };

      const analysis = await engine.analyzeTaskResult(taskResult);
      expect(analysis).toHaveProperty('areas');
      expect(analysis).toHaveProperty('suggestions');
      expect(analysis).toHaveProperty('metrics');
    });

    it('should identify response time improvements', async () => {
      const taskResult = {
        taskId: 'task123',
        taskDescription: 'analyze this data',
        response: 'Analysis result',
        responseTime: 6000,
        success: true,
        model: 'gpt-4'
      };

      const analysis = await engine.analyzeTaskResult(taskResult);
      expect(analysis.areas).toContain(ImprovementArea.RESPONSE_TIME);
    });

    it('should identify quality improvements', async () => {
      const taskResult = {
        taskId: 'task123',
        taskDescription: 'analyze this data',
        response: 'Analysis result',
        responseTime: 1000,
        success: false,
        model: 'gpt-4'
      };

      const analysis = await engine.analyzeTaskResult(taskResult);
      expect(analysis.areas).toContain(ImprovementArea.QUALITY);
    });
  });

  describe('calculateQualityScore', () => {
    it('should calculate correct quality score for successful task', () => {
      const taskResult = {
        responseTime: 1000,
        success: true
      };
      const score = engine.calculateQualityScore(taskResult);
      expect(score).toBeGreaterThan(0);
    });

    it('should calculate correct quality score for failed task', () => {
      const taskResult = {
        responseTime: 1000,
        success: false
      };
      const score = engine.calculateQualityScore(taskResult);
      expect(score).toBeLessThan(100);
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for GPT-4 model', () => {
      const taskResult = {
        taskDescription: 'analyze this data',
        response: 'Analysis result',
        model: 'gpt-4'
      };
      const cost = engine.estimateCost(taskResult);
      expect(cost).toBeGreaterThan(0);
    });

    it('should estimate cost for GPT-3.5 model', () => {
      const taskResult = {
        taskDescription: 'analyze this data',
        response: 'Analysis result',
        model: 'gpt-3.5-turbo'
      };
      const cost = engine.estimateCost(taskResult);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('generateSuggestions', () => {
    it('should generate response time suggestion', () => {
      const taskResult = {
        responseTime: 6000,
        model: 'gpt-4'
      };
      const suggestion = engine.generateResponseTimeSuggestion(taskResult);
      expect(suggestion.area).toBe(ImprovementArea.RESPONSE_TIME);
      expect(suggestion.suggestion).toContain('faster model');
    });

    it('should generate quality suggestion', () => {
      const taskResult = {
        success: false,
        model: 'gpt-4'
      };
      const suggestion = engine.generateQualitySuggestion(taskResult);
      expect(suggestion.area).toBe(ImprovementArea.QUALITY);
      expect(suggestion.suggestion).toContain('Enhance prompt');
    });

    it('should generate cost suggestion', () => {
      const taskResult = {
        model: 'gpt-4',
        maxTokens: 1000
      };
      const suggestion = engine.generateCostSuggestion(taskResult);
      expect(suggestion.area).toBe(ImprovementArea.COST);
      expect(suggestion.suggestion).toContain('cost-effective');
    });
  });

  describe('applyImprovements', () => {
    it('should apply valid improvements', async () => {
      const suggestions = [
        {
          area: ImprovementArea.RESPONSE_TIME,
          action: {
            type: 'model_selection',
            params: { maxResponseTime: 4000 }
          }
        }
      ];

      const applied = await engine.applyImprovements(suggestions);
      expect(applied.length).toBe(1);
    });

    it('should not apply improvements too frequently', async () => {
      const suggestions = [
        {
          area: ImprovementArea.RESPONSE_TIME,
          action: {
            type: 'model_selection',
            params: { maxResponseTime: 4000 }
          }
        }
      ];

      // Apply first improvement
      await engine.applyImprovements(suggestions);
      
      // Try to apply again immediately
      const applied = await engine.applyImprovements(suggestions);
      expect(applied.length).toBe(0);
    });
  });

  describe('getImprovementMetrics', () => {
    it('should return metrics for recent history', async () => {
      const taskResult = {
        taskId: 'task123',
        responseTime: 1000,
        success: true,
        model: 'gpt-4'
      };

      await engine.analyzeTaskResult(taskResult);
      const metrics = engine.getImprovementMetrics();
      
      expect(metrics).toHaveProperty('totalTasks');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('averageQuality');
      expect(metrics).toHaveProperty('averageCost');
    });
  });

  describe('Event emission', () => {
    it('should emit improvementSuggestions event', (done) => {
      engine.on('improvementSuggestions', ({ taskId, suggestions }) => {
        expect(taskId).toBe('task123');
        expect(suggestions.length).toBeGreaterThan(0);
        done();
      });

      const taskResult = {
        taskId: 'task123',
        responseTime: 6000,
        success: true,
        model: 'gpt-4'
      };
      engine.analyzeTaskResult(taskResult);
    });
  });
}); 