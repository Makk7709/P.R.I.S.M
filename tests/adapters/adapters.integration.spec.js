import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import OpenAIAdapter from '../../src/core/providers/OpenAIAdapter.js';
import AnthropicAdapter from '../../src/core/providers/AnthropicAdapter.js';
import PerplexityAdapter from '../../src/core/providers/PerplexityAdapter.js';

// Mock all providers
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn()
    }
  }
};

const mockAnthropic = {
  messages: {
    create: vi.fn()
  }
};

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI)
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropic)
}));

describe('Adapters Integration Tests', () => {
  let openaiAdapter;
  let anthropicAdapter;
  let perplexityAdapter;
  let originalEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Set test environment
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    process.env.ANTHROPIC_MODEL = 'claude-3-5-sonnet-20240620';
    process.env.PERPLEXITY_MODEL = 'pplx-7b-online';
    process.env.PERPLEXITY_BASE_URL = 'https://api.perplexity.ai';
    
    // Initialize adapters
    openaiAdapter = new OpenAIAdapter({
      timeoutMs: 100,
      maxRetries: 2,
      backoffBaseMs: 10
    });
    
    anthropicAdapter = new AnthropicAdapter({
      timeoutMs: 100,
      maxRetries: 2,
      backoffBaseMs: 10
    });
    
    perplexityAdapter = new PerplexityAdapter({
      timeoutMs: 100,
      maxRetries: 2,
      backoffBaseMs: 10
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Consensus Decision Making', () => {
    it('should handle unanimous approval from all adapters', async () => {
      // Mock successful responses from all adapters
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "OpenAI approves"}'
          }
        }]
      });
      
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{
          text: '{"decision": true, "reasoning": "Anthropic approves"}'
        }]
      });
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Perplexity approves"}'
          }
        }]
      });
      
      const testDecision = {
        type: 'unanimous_approval',
        payload: { value: 42 }
      };
      
      const [openaiResult, anthropicResult, perplexityResult] = await Promise.all([
        openaiAdapter.evaluate(testDecision),
        anthropicAdapter.evaluate(testDecision),
        perplexityAdapter.evaluate(testDecision)
      ]);
      
      expect(openaiResult.decision).toBe(true);
      expect(anthropicResult.decision).toBe(true);
      expect(perplexityResult.decision).toBe(true);
    });

    it('should handle mixed decisions from adapters', async () => {
      // Mock mixed responses
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "OpenAI approves"}'
          }
        }]
      });
      
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{
          text: '{"decision": false, "reasoning": "Anthropic rejects"}'
        }]
      });
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Perplexity approves"}'
          }
        }]
      });
      
      const testDecision = {
        type: 'mixed_decisions',
        payload: { value: 42 }
      };
      
      const [openaiResult, anthropicResult, perplexityResult] = await Promise.all([
        openaiAdapter.evaluate(testDecision),
        anthropicAdapter.evaluate(testDecision),
        perplexityAdapter.evaluate(testDecision)
      ]);
      
      expect(openaiResult.decision).toBe(true);
      expect(anthropicResult.decision).toBe(false);
      expect(perplexityResult.decision).toBe(true);
    });

    it('should handle unanimous rejection from all adapters', async () => {
      // Mock rejection responses from all adapters
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"decision": false, "reasoning": "OpenAI rejects"}'
          }
        }]
      });
      
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{
          text: '{"decision": false, "reasoning": "Anthropic rejects"}'
        }]
      });
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"decision": false, "reasoning": "Perplexity rejects"}'
          }
        }]
      });
      
      const testDecision = {
        type: 'unanimous_rejection',
        payload: { value: -1 }
      };
      
      const [openaiResult, anthropicResult, perplexityResult] = await Promise.all([
        openaiAdapter.evaluate(testDecision),
        anthropicAdapter.evaluate(testDecision),
        perplexityAdapter.evaluate(testDecision)
      ]);
      
      expect(openaiResult.decision).toBe(false);
      expect(anthropicResult.decision).toBe(false);
      expect(perplexityResult.decision).toBe(false);
    });
  });

  describe('Circuit Breaker Coordination', () => {
    it('should handle circuit breaker activation across adapters', async () => {
      // Mock failures for all adapters
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Service unavailable')
      );
      
      mockAnthropic.messages.create.mockRejectedValue(
        new Error('Service unavailable')
      );
      
      const testDecision = {
        type: 'circuit_breaker_test',
        payload: {}
      };
      
      // Trigger failures to open circuits
      for (let i = 0; i < 5; i++) {
        await Promise.all([
          openaiAdapter.evaluate(testDecision),
          anthropicAdapter.evaluate(testDecision),
          perplexityAdapter.evaluate(testDecision)
        ]);
      }
      
      // All circuits should be open now
      const [openaiResult, anthropicResult, perplexityResult] = await Promise.all([
        openaiAdapter.evaluate({ type: 'circuit_open', payload: {} }),
        anthropicAdapter.evaluate({ type: 'circuit_open', payload: {} }),
        perplexityAdapter.evaluate({ type: 'circuit_open', payload: {} })
      ]);
      
      expect(openaiResult.decision).toBe(false);
      expect(openaiResult.reasoning).toBe('circuit_open');
      expect(anthropicResult.decision).toBe(false);
      expect(anthropicResult.reasoning).toBe('circuit_open');
      expect(perplexityResult.decision).toBe(false);
      expect(perplexityResult.reasoning).toBe('circuit_open');
    });
  });

  describe('Timeout Handling', () => {
    it('should handle timeout scenarios across adapters', async () => {
      // Mock timeout responses
      mockOpenAI.chat.completions.create.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );
      
      mockAnthropic.messages.create.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );
      
      const testDecision = {
        type: 'timeout_test',
        payload: {}
      };
      
      const [openaiResult, anthropicResult, perplexityResult] = await Promise.all([
        openaiAdapter.evaluate(testDecision),
        anthropicAdapter.evaluate(testDecision),
        perplexityAdapter.evaluate(testDecision)
      ]);
      
      expect(openaiResult.decision).toBe(false);
      expect(openaiResult.reasoning).toContain('provider_error:timeout');
      expect(anthropicResult.decision).toBe(false);
      expect(anthropicResult.reasoning).toContain('provider_error:timeout');
      expect(perplexityResult.decision).toBe(false);
      expect(perplexityResult.reasoning).toContain('provider_error:timeout');
    });
  });

  describe('Error Handling Coordination', () => {
    it('should handle different error types across adapters', async () => {
      // Mock different error types
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Rate limit exceeded')
      );
      
      mockAnthropic.messages.create.mockRejectedValue(
        new Error('Authentication failed')
      );
      
      // Perplexity uses the same mockOpenAI, so we need to handle this differently
      const testDecision = {
        type: 'error_coordination_test',
        payload: {}
      };
      
      // Test OpenAI and Anthropic separately
      const [openaiResult, anthropicResult] = await Promise.all([
        openaiAdapter.evaluate(testDecision),
        anthropicAdapter.evaluate(testDecision)
      ]);
      
      expect(openaiResult.decision).toBe(false);
      expect(openaiResult.reasoning).toContain('provider_error:Rate limit exceeded');
      expect(anthropicResult.decision).toBe(false);
      expect(anthropicResult.reasoning).toContain('provider_error:Authentication failed');
      
      // Test Perplexity separately with network error
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Network error')
      );
      
      const perplexityResult = await perplexityAdapter.evaluate(testDecision);
      expect(perplexityResult.decision).toBe(false);
      expect(perplexityResult.reasoning).toContain('provider_error:Network error');
    });
  });

  describe('Performance Consistency', () => {
    it('should maintain consistent performance across adapters', async () => {
      const startTime = Date.now();
      
      // Mock fast responses
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Fast response"}'
          }
        }]
      });
      
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{
          text: '{"decision": true, "reasoning": "Fast response"}'
        }]
      });
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Fast response"}'
          }
        }]
      });
      
      const testDecision = {
        type: 'performance_test',
        payload: {}
      };
      
      const results = await Promise.all([
        openaiAdapter.evaluate(testDecision),
        anthropicAdapter.evaluate(testDecision),
        perplexityAdapter.evaluate(testDecision)
      ]);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All should complete within reasonable time
      expect(totalTime).toBeLessThan(500); // 500ms max for all three
      
      // All should return valid results
      results.forEach(result => {
        expect(result.decision).toBeDefined();
        expect(result.reasoning).toBeDefined();
      });
    });
  });

  describe('Invariants Across Adapters', () => {
    it('INV-INTEGRATION-001: All adapters should respect timeout constraints', () => {
      expect(openaiAdapter.timeoutMs).toBeLessThanOrEqual(300);
      expect(anthropicAdapter.timeoutMs).toBeLessThanOrEqual(300);
      expect(perplexityAdapter.timeoutMs).toBeLessThanOrEqual(300);
    });

    it('INV-INTEGRATION-002: All adapters should have consistent retry configuration', () => {
      expect(openaiAdapter.maxRetries).toBe(anthropicAdapter.maxRetries);
      expect(anthropicAdapter.maxRetries).toBe(perplexityAdapter.maxRetries);
    });

    it('INV-INTEGRATION-003: All adapters should return consistent response format', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Test"}'
          }
        }]
      });
      
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{
          text: '{"decision": true, "reasoning": "Test"}'
        }]
      });
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Test"}'
          }
        }]
      });
      
      const testDecision = { type: 'format_test', payload: {} };
      
      const [openaiResult, anthropicResult, perplexityResult] = await Promise.all([
        openaiAdapter.evaluate(testDecision),
        anthropicAdapter.evaluate(testDecision),
        perplexityAdapter.evaluate(testDecision)
      ]);
      
      // All should have same response structure
      [openaiResult, anthropicResult, perplexityResult].forEach(result => {
        expect(result).toHaveProperty('decision');
        expect(result).toHaveProperty('reasoning');
        expect(typeof result.decision).toBe('boolean');
        expect(typeof result.reasoning).toBe('string');
      });
    });

    it('INV-INTEGRATION-004: All adapters should handle circuit breaker consistently', async () => {
      // Test circuit breaker behavior consistency
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Service error')
      );
      
      mockAnthropic.messages.create.mockRejectedValue(
        new Error('Service error')
      );
      
      // Trigger failures to open circuits
      for (let i = 0; i < 5; i++) {
        await Promise.all([
          openaiAdapter.evaluate({ type: 'circuit_test', payload: {} }),
          anthropicAdapter.evaluate({ type: 'circuit_test', payload: {} }),
          perplexityAdapter.evaluate({ type: 'circuit_test', payload: {} })
        ]);
      }
      
      // All should have circuit breaker state
      expect(openaiAdapter.breaker.state).toBe('OPEN');
      expect(anthropicAdapter.breaker.state).toBe('OPEN');
      expect(perplexityAdapter.breaker.state).toBe('OPEN');
    });
  });
});
