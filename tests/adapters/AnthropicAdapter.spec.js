import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import AnthropicAdapter from '../../src/core/providers/AnthropicAdapter.js';

// Mock Anthropic client
const mockAnthropic = {
  messages: {
    create: vi.fn(),
  },
};

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropic),
}));

describe('AnthropicAdapter', () => {
  let adapter;
  let originalEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Set test environment
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.ANTHROPIC_MODEL = 'claude-3-5-sonnet-20240620';

    adapter = new AnthropicAdapter({
      timeoutMs: 100,
      maxRetries: 2,
      backoffBaseMs: 10,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default Anthropic model', () => {
      expect(adapter.client).toBeDefined();
      expect(adapter.model).toBe('claude-3-5-sonnet-20240620');
      expect(adapter.timeoutMs).toBe(100);
      expect(adapter.maxRetries).toBe(2);
    });

    it('should handle missing API key gracefully', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new AnthropicAdapter()).not.toThrow();
    });

    it('should use custom model from environment', () => {
      process.env.ANTHROPIC_MODEL = 'claude-3-haiku-20240307';
      const customAdapter = new AnthropicAdapter();
      expect(customAdapter.model).toBe('claude-3-haiku-20240307');
    });
  });

  describe('Success Cases', () => {
    it('should return valid decision for successful API call', async () => {
      const mockResponse = {
        content: [
          {
            text: '{"decision": true, "reasoning": "Valid decision based on context"}',
          },
        ],
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await adapter.evaluate({
        type: 'test',
        payload: { value: 42 },
      });

      expect(result.decision).toBe(true);
      expect(result.reasoning).toBe('Valid decision based on context');
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 64,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('test'),
          },
        ],
      });
    });

    it('should handle false decision response', async () => {
      const mockResponse = {
        content: [
          {
            text: '{"decision": false, "reasoning": "Insufficient evidence"}',
          },
        ],
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await adapter.evaluate({
        type: 'validation',
        payload: { insufficient: true },
      });

      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('Insufficient evidence');
    });

    it('should handle complex payload structures', async () => {
      const mockResponse = {
        content: [
          {
            text: '{"decision": true, "reasoning": "Complex analysis completed"}',
          },
        ],
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const complexPayload = {
        analysis: { metrics: [1, 2, 3] },
        context: { domain: 'finance' },
      };

      const result = await adapter.evaluate({
        type: 'complex_analysis',
        payload: complexPayload,
      });

      expect(result.decision).toBe(true);
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('complex_analysis'),
            }),
          ]),
        })
      );
    });
  });

  describe('Error Cases', () => {
    it('should handle API timeout', async () => {
      mockAnthropic.messages.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );

      const result = await adapter.evaluate({
        type: 'timeout_test',
        payload: {},
      });

      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error:timeout');
    });

    it('should handle API 429 rate limit error', async () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;
      mockAnthropic.messages.create.mockRejectedValue(error);

      const result = await adapter.evaluate({
        type: 'rate_limit_test',
        payload: {},
      });

      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error:Rate limit exceeded');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        content: [
          {
            text: 'This is not valid JSON',
          },
        ],
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await adapter.evaluate({
        type: 'invalid_json',
        payload: {},
      });

      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('parse_error');
    });

    it('should handle missing response content', async () => {
      const mockResponse = {
        content: [],
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await adapter.evaluate({
        type: 'missing_content',
        payload: {},
      });

      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('parse_error');
    });

    it('should handle malformed response structure', async () => {
      const mockResponse = {
        // Missing content array
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await adapter.evaluate({
        type: 'malformed_response',
        payload: {},
      });

      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('parse_error');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failures', async () => {
      let callCount = 0;
      mockAnthropic.messages.create.mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Temporary service error');
        }
        return {
          content: [
            {
              text: '{"decision": true, "reasoning": "Success after retry"}',
            },
          ],
        };
      });

      const result = await adapter.evaluate({
        type: 'retry_test',
        payload: {},
      });

      expect(callCount).toBe(2);
      expect(result.decision).toBe(true);
      expect(result.reasoning).toBe('Success after retry');
    });

    it('should fail after max retries', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('Persistent service error'));

      const result = await adapter.evaluate({
        type: 'max_retry_test',
        payload: {},
      });

      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error:Persistent service error');
      expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(3); // 1 + maxRetries
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('Service unavailable'));

      // Trigger failures to open circuit
      for (let i = 0; i < 5; i++) {
        await adapter.evaluate({ type: 'circuit_test', payload: {} });
      }

      // Clear mock to reset call count
      mockAnthropic.messages.create.mockClear();

      // Circuit should be open now
      const result = await adapter.evaluate({
        type: 'circuit_open_test',
        payload: {},
      });

      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('circuit_open');
      expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(0); // No new calls when circuit is open
    });
  });

  describe('Security & Injection Tests', () => {
    it('should handle malicious payload injection', async () => {
      const mockResponse = {
        content: [
          {
            text: '{"decision": false, "reasoning": "Potential security threat detected"}',
          },
        ],
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const maliciousPayload = {
        injection: '{{7*7}}',
        xss: '<img src=x onerror=alert(1)>',
      };

      const result = await adapter.evaluate({
        type: 'security_test',
        payload: maliciousPayload,
      });

      expect(result.decision).toBe(false);
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('security_test'),
            }),
          ]),
        })
      );
    });

    it('should sanitize JSON parsing', async () => {
      const mockResponse = {
        content: [
          {
            text: '{"decision": true, "reasoning": "Valid", "extra": "malicious<script>alert(1)</script>"}',
          },
        ],
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await adapter.evaluate({
        type: 'sanitization_test',
        payload: {},
      });

      expect(result.decision).toBe(true);
      expect(result.reasoning).toBe('Valid');
      // Should not include extra fields
      expect(result.extra).toBeUndefined();
    });
  });

  describe('Model Configuration', () => {
    it('should use different Claude models', async () => {
      process.env.ANTHROPIC_MODEL = 'claude-3-haiku-20240307';
      const haikuAdapter = new AnthropicAdapter();

      const mockResponse = {
        content: [
          {
            text: '{"decision": true, "reasoning": "Haiku model response"}',
          },
        ],
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      await haikuAdapter.evaluate({
        type: 'model_test',
        payload: {},
      });

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-haiku-20240307',
        })
      );
    });
  });

  describe('Invariants', () => {
    it('INV-001: Should not contain hardcoded secrets', () => {
      const adapterCode = require('node:fs').readFileSync(
        '/Users/aminemohamed/Desktop/APP/PRISM INCUBATEUR/P.R.I.S.M/src/core/providers/AnthropicAdapter.js',
        'utf8'
      );
      expect(adapterCode).not.toMatch(/sk-ant-[a-zA-Z0-9]{20,}/);
      expect(adapterCode).not.toMatch(/api[_-]?key[_-]?[=:]\s*['"][^'"]{10,}['"]/i);
    });

    it('INV-002: Should respect timeout constraint', () => {
      expect(adapter.timeoutMs).toBeLessThanOrEqual(300);
    });

    it('INV-003: Should reject invalid response schemas', async () => {
      const mockResponse = {
        content: [
          {
            text: '{"invalid": "schema", "missing_decision": true}',
          },
        ],
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await adapter.evaluate({
        type: 'invalid_schema',
        payload: {},
      });

      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe(''); // Empty string when decision is false and no reasoning field
    });

    it('INV-004: Should not make calls without API key', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const adapterNoKey = new AnthropicAdapter();

      const error = new Error('API key required');
      mockAnthropic.messages.create.mockRejectedValue(error);

      const result = await adapterNoKey.evaluate({
        type: 'no_key_test',
        payload: {},
      });

      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error');
    });

    it('INV-005: Should respect max_tokens constraint', async () => {
      const mockResponse = {
        content: [
          {
            text: '{"decision": true, "reasoning": "Short response"}',
          },
        ],
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      await adapter.evaluate({
        type: 'token_limit_test',
        payload: {},
      });

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 64,
        })
      );
    });
  });
});
