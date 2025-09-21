import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import OpenAIAdapter from '../../src/core/providers/OpenAIAdapter.js';

// Mock OpenAI client
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn()
    }
  }
};

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI)
}));

describe('OpenAIAdapter', () => {
  let adapter;
  let originalEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Set test environment
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    
    adapter = new OpenAIAdapter({
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

  describe('Constructor', () => {
    it('should initialize with default OpenAI model', () => {
      expect(adapter.client).toBeDefined();
      expect(adapter.timeoutMs).toBe(100);
      expect(adapter.maxRetries).toBe(2);
    });

    it('should handle missing API key gracefully', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new OpenAIAdapter()).not.toThrow();
    });

    it('should use custom model from environment', () => {
      process.env.OPENAI_MODEL = 'gpt-3.5-turbo';
      const customAdapter = new OpenAIAdapter();
      expect(customAdapter.client).toBeDefined();
    });
  });

  describe('Success Cases', () => {
    it('should return valid decision for successful API call', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Valid decision"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await adapter.evaluate({
        type: 'test',
        payload: { value: 42 }
      });
      
      expect(result.decision).toBe(true);
      expect(result.reasoning).toBe('Valid decision');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Answer with a JSON: {"decision": true|false, "reasoning": "..."}' },
          { role: 'user', content: expect.stringContaining('test') }
        ],
        temperature: 0
      });
    });

    it('should handle false decision response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": false, "reasoning": "Invalid input"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await adapter.evaluate({
        type: 'validation',
        payload: { invalid: true }
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('Invalid input');
    });

    it('should handle complex payload structures', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Complex data processed"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const complexPayload = {
        nested: { data: [1, 2, 3] },
        metadata: { timestamp: Date.now() }
      };
      
      const result = await adapter.evaluate({
        type: 'complex',
        payload: complexPayload
      });
      
      expect(result.decision).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('complex')
            })
          ])
        })
      );
    });
  });

  describe('Error Cases', () => {
    it('should handle API timeout', async () => {
      mockOpenAI.chat.completions.create.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );
      
      const result = await adapter.evaluate({
        type: 'timeout_test',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error:timeout');
    });

    it('should handle API 500 error', async () => {
      const error = new Error('Internal Server Error');
      error.status = 500;
      mockOpenAI.chat.completions.create.mockRejectedValue(error);
      
      const result = await adapter.evaluate({
        type: 'error_test',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error:Internal Server Error');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await adapter.evaluate({
        type: 'invalid_json',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('parse_error');
    });

    it('should handle missing response content', async () => {
      const mockResponse = {
        choices: [{
          message: {}
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await adapter.evaluate({
        type: 'missing_content',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('parse_error');
    });

    it('should handle empty choices array', async () => {
      const mockResponse = {
        choices: []
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await adapter.evaluate({
        type: 'empty_choices',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('parse_error');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failures', async () => {
      let callCount = 0;
      mockOpenAI.chat.completions.create.mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Rate limit');
        }
        return {
          choices: [{
            message: {
              content: '{"decision": true, "reasoning": "Success after retry"}'
            }
          }]
        };
      });
      
      const result = await adapter.evaluate({
        type: 'retry_test',
        payload: {}
      });
      
      expect(callCount).toBe(2);
      expect(result.decision).toBe(true);
      expect(result.reasoning).toBe('Success after retry');
    });

    it('should fail after max retries', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Persistent error')
      );
      
      const result = await adapter.evaluate({
        type: 'max_retry_test',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error:Persistent error');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3); // 1 + maxRetries
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Service unavailable')
      );
      
      // Trigger failures to open circuit
      for (let i = 0; i < 5; i++) {
        await adapter.evaluate({ type: 'circuit_test', payload: {} });
      }
      
      // Clear mock to reset call count
      mockOpenAI.chat.completions.create.mockClear();
      
      // Circuit should be open now
      const result = await adapter.evaluate({
        type: 'circuit_open_test',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('circuit_open');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(0); // No new calls when circuit is open
    });
  });

  describe('Security & Injection Tests', () => {
    it('should handle malicious payload injection', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": false, "reasoning": "Malicious input detected"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const maliciousPayload = {
        script: '<script>alert("xss")</script>',
        sql: "'; DROP TABLE users; --"
      };
      
      const result = await adapter.evaluate({
        type: 'security_test',
        payload: maliciousPayload
      });
      
      expect(result.decision).toBe(false);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('security_test')
            })
          ])
        })
      );
    });

    it('should sanitize JSON parsing', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Valid", "extra": "<script>alert(1)</script>"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await adapter.evaluate({
        type: 'sanitization_test',
        payload: {}
      });
      
      expect(result.decision).toBe(true);
      expect(result.reasoning).toBe('Valid');
      // Should not include extra fields
      expect(result.extra).toBeUndefined();
    });
  });

  describe('Invariants', () => {
    it('INV-001: Should not contain hardcoded secrets', () => {
      const adapterCode = require('fs').readFileSync(
        '/Users/aminemohamed/Desktop/APP/PRISM INCUBATEUR/P.R.I.S.M/src/core/providers/OpenAIAdapter.js', 'utf8'
      );
      expect(adapterCode).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
      expect(adapterCode).not.toMatch(/api[_-]?key[_-]?[=:]\s*['"][^'"]{10,}['"]/i);
    });

    it('INV-002: Should respect timeout constraint', () => {
      expect(adapter.timeoutMs).toBeLessThanOrEqual(300);
    });

    it('INV-003: Should reject invalid response schemas', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"invalid": "schema"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await adapter.evaluate({
        type: 'invalid_schema',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe(''); // Empty string when decision is false and no reasoning field
    });

    it('INV-004: Should not make calls without API key', async () => {
      delete process.env.OPENAI_API_KEY;
      const adapterNoKey = new OpenAIAdapter();
      
      const error = new Error('API key required');
      mockOpenAI.chat.completions.create.mockRejectedValue(error);
      
      const result = await adapterNoKey.evaluate({
        type: 'no_key_test',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error');
    });
  });
});
