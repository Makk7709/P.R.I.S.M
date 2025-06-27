import { AgentRouter, TaskType, AIProvider } from '../../orchestration/agentRouter.js';

describe('AgentRouter', () => {
  let router;
  const mockConfig = {
    openai: { apiKey: 'test-openai-key' },
    anthropic: { apiKey: 'test-anthropic-key' },
    perplexity: { apiKey: 'test-perplexity-key' }
  };

  beforeEach(() => {
    router = new AgentRouter(mockConfig);
  });

  describe('determineTaskType', () => {
    it('should correctly identify research tasks', () => {
      const taskType = router.determineTaskType('research about AI');
      expect(taskType).toBe(TaskType.RESEARCH);
    });

    it('should correctly identify analysis tasks', () => {
      const taskType = router.determineTaskType('analyze this data');
      expect(taskType).toBe(TaskType.ANALYSIS);
    });

    it('should correctly identify generation tasks', () => {
      const taskType = router.determineTaskType('generate a report');
      expect(taskType).toBe(TaskType.GENERATION);
    });

    it('should correctly identify ethical tasks', () => {
      const taskType = router.determineTaskType('ethical implications of AI');
      expect(taskType).toBe(TaskType.ETHICAL);
    });

    it('should correctly identify strategic tasks', () => {
      const taskType = router.determineTaskType('strategic planning for next quarter');
      expect(taskType).toBe(TaskType.STRATEGIC);
    });

    it('should default to analysis for unknown tasks', () => {
      const taskType = router.determineTaskType('random task');
      expect(taskType).toBe(TaskType.ANALYSIS);
    });
  });

  describe('calculateProviderScore', () => {
    it('should calculate correct score for research task with Perplexity', () => {
      const context = {
        taskType: TaskType.RESEARCH,
        costSensitivity: 'high',
        responseTimeRequirement: 'standard',
        truthfulnessRequirement: 'standard'
      };
      const score = router.calculateProviderScore(AIProvider.PERPLEXITY, context);
      expect(score).toBeGreaterThan(0);
    });

    it('should calculate correct score for generation task with OpenAI', () => {
      const context = {
        taskType: TaskType.GENERATION,
        costSensitivity: 'medium',
        responseTimeRequirement: 'fast',
        truthfulnessRequirement: 'standard'
      };
      const score = router.calculateProviderScore(AIProvider.OPENAI, context);
      expect(score).toBeGreaterThan(0);
    });

    it('should calculate correct score for ethical task with Claude', () => {
      const context = {
        taskType: TaskType.ETHICAL,
        costSensitivity: 'low',
        responseTimeRequirement: 'standard',
        truthfulnessRequirement: 'high'
      };
      const score = router.calculateProviderScore(AIProvider.CLAUDE, context);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('selectProvider', () => {
    it('should select appropriate provider for research task', async () => {
      const context = {
        taskType: TaskType.RESEARCH,
        costSensitivity: 'high',
        responseTimeRequirement: 'standard',
        truthfulnessRequirement: 'standard'
      };
      const provider = await router.selectProvider(context);
      expect(Object.values(AIProvider)).toContain(provider);
    });

    it('should select appropriate provider for generation task', async () => {
      const context = {
        taskType: TaskType.GENERATION,
        costSensitivity: 'medium',
        responseTimeRequirement: 'fast',
        truthfulnessRequirement: 'standard'
      };
      const provider = await router.selectProvider(context);
      expect(Object.values(AIProvider)).toContain(provider);
    });
  });

  describe('routeTask', () => {
    it('should successfully route a research task', async () => {
      const result = await router.routeTask('research about AI', {
        requiresAccuracy: true,
        costSensitivity: 'high',
        responseTimeRequirement: 'standard'
      });
      expect(result).toBeDefined();
    });

    it('should handle task routing with fallback', async () => {
      // Mock a failed primary provider
      router.providers[AIProvider.PERPLEXITY].complete = jest.fn().mockRejectedValue(new Error('API Error'));
      
      const result = await router.routeTask('research about AI', {
        requiresAccuracy: true,
        costSensitivity: 'high',
        responseTimeRequirement: 'standard'
      });
      expect(result).toBeDefined();
    });
  });

  describe('getProviderMetrics', () => {
    it('should return metrics for all providers', () => {
      const metrics = router.getProviderMetrics();
      expect(metrics).toHaveProperty(AIProvider.PERPLEXITY);
      expect(metrics).toHaveProperty(AIProvider.OPENAI);
      expect(metrics).toHaveProperty(AIProvider.CLAUDE);
    });
  });
}); 