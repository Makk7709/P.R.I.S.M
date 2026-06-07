import { chooseModel, handleUserInstruction } from '../prismModelRouter.js';
import { jest } from '@jest/globals';

// Mock fetch
global.fetch = jest.fn();

// Mock prismLogger
jest.mock('../monitoring/prismLogger.js', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

// Mock CONFIG
jest.mock('../config.js', () => ({
  config: {
    MODELS: {
      OPENAI: {
        API_KEY: 'test-key',
        MODEL: 'gpt-4.1',
        TIMEOUT: 30000
      },
      ANTHROPIC: {
        API_KEY: 'test-key',
        MODEL: 'claude-3-sonnet-20240229',
        TIMEOUT: 30000
      }
    }
  }
}));

describe('PRISM Model Router', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock successful API responses
    global.fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'test response' })
      })
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('chooseModel', () => {
    it('should return openai for marketing tasks', () => {
      expect(chooseModel('marketing')).toBe('openai');
    });

    it('should return claude for strategie tasks', () => {
      expect(chooseModel('strategie')).toBe('claude');
    });

    it('should return claude for analyse tasks', () => {
      expect(chooseModel('analyse')).toBe('claude');
    });

    it('should return openai for creation tasks', () => {
      expect(chooseModel('creation')).toBe('openai');
    });

    it('should return claude for recherche tasks', () => {
      expect(chooseModel('recherche')).toBe('claude');
    });

    it('should throw error for unknown tasks', () => {
      expect(() => chooseModel('unknown')).toThrow('[PRISM] Modèle inconnu sélectionné: unknown');
    });

    it('should throw error for invalid task type', () => {
      expect(() => chooseModel(null)).toThrow('[PRISM] Modèle inconnu sélectionné: null');
    });
  });

  describe('handleUserInstruction', () => {
    it('should handle marketing task with OpenAI', async () => {
      const result = await handleUserInstruction(
        'Créer une campagne marketing pour PRISM',
        'marketing'
      );
      expect(result).toEqual({ data: 'test response' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.openai.com'),
        expect.any(Object)
      );
    });

    it('should handle strategie task with Claude', async () => {
      const result = await handleUserInstruction(
        'Analyse complète de notre positionnement concurrentiel',
        'strategie'
      );
      expect(result).toEqual({ data: 'test response' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.anthropic.com'),
        expect.any(Object)
      );
    });

    it('should throw error for invalid task type', async () => {
      await expect(
        handleUserInstruction('Faire un café', 'cuisine')
      ).rejects.toThrow('[PRISM] Modèle inconnu sélectionné: cuisine');
    });

    it('should handle API errors', async () => {
      global.fetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          statusText: 'API Error'
        })
      );

      await expect(
        handleUserInstruction('Test error', 'marketing')
      ).rejects.toThrow('[PRISM] Erreur API OpenAI: API Error');
    });

    it('should handle OpenAI timeout', async () => {
      global.fetch.mockImplementationOnce(() => 
        Promise.reject(new Error('AbortError'))
      );

      const promise = handleUserInstruction('Test timeout', 'marketing');
      jest.advanceTimersByTime(30000);

      await expect(promise).rejects.toThrow('[PRISM] Timeout API OpenAI');
    });

    it('should handle Claude timeout', async () => {
      global.fetch.mockImplementationOnce(() => 
        Promise.reject(new Error('AbortError'))
      );

      const promise = handleUserInstruction('Test timeout', 'strategie');
      jest.advanceTimersByTime(30000);

      await expect(promise).rejects.toThrow('[PRISM] Timeout API Claude');
    });
  });
}); 