import { jest } from '@jest/globals';
import { OpenAI } from 'openai';
import { evaluateSuggestion } from './decisionFirewall.js';

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

describe('Decision Firewall Tests', () => {
  let mockOpenAI;

  beforeEach(() => {
    mockOpenAI = new OpenAI();
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-4-turbo-preview';
    // Mock the create method for each test
    mockOpenAI.chat.completions.create = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should reject invalid input', async () => {
    const result = await evaluateSuggestion(null);
    expect(result).toEqual({
      decision: 'reject',
      reason: 'Suggestion invalide ou manquante.'
    });

    const result2 = await evaluateSuggestion(123);
    expect(result2).toEqual({
      decision: 'reject',
      reason: 'Suggestion invalide ou manquante.'
    });
  });

  test('should accept valid suggestion', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            decision: 'accept',
            reason: 'Suggestion alignée avec les objectifs stratégiques.'
          })
        }
      }]
    });

    const result = await evaluateSuggestion('Améliorer la rapidité d\'analyse mémoire');
    expect(result).toEqual({
      decision: 'accept',
      reason: 'Suggestion alignée avec les objectifs stratégiques.'
    });
  });

  test('should reject risky suggestion', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            decision: 'reject',
            reason: 'Suggestion présente des risques pour la sécurité.'
          })
        }
      }]
    });

    const result = await evaluateSuggestion('Supprimer la validation humaine');
    expect(result).toEqual({
      decision: 'reject',
      reason: 'Suggestion présente des risques pour la sécurité.'
    });
  });

  test('should handle API errors gracefully', async () => {
    mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

    const result = await evaluateSuggestion('Test suggestion');
    expect(result).toEqual({
      decision: 'reject',
      reason: 'Erreur d\'évaluation automatique.'
    });
  });

  test('should handle empty API response', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: ''
        }
      }]
    });

    const result = await evaluateSuggestion('Test suggestion');
    expect(result).toEqual({
      decision: 'reject',
      reason: 'Erreur d\'évaluation automatique.'
    });
  });

  test('should handle invalid JSON response', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: 'Invalid JSON'
        }
      }]
    });

    const result = await evaluateSuggestion('Test suggestion');
    expect(result).toEqual({
      decision: 'reject',
      reason: 'Format de réponse invalide.'
    });
  });

  test('should handle invalid decision format', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            decision: 'maybe',
            reason: 'Invalid decision'
          })
        }
      }]
    });

    const result = await evaluateSuggestion('Test suggestion');
    expect(result).toEqual({
      decision: 'reject',
      reason: 'Format de décision invalide.'
    });
  });
}); 