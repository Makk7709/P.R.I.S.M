// Mock OpenAI module
import { OpenAI } from 'openai';

// Store original OpenAI
const RealOpenAI = OpenAI;

// Mock OpenAI class
class MockOpenAI {
  constructor() {
    this.chat = {
      completions: {
        create: async ({ messages }) => {
          const suggestion = messages[0].content.split('"')[1];
          
          // Test different scenarios
          if (suggestion === 'Améliorer la rapidité d\'analyse mémoire') {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    decision: 'accept',
                    reason: 'Suggestion alignée avec les objectifs stratégiques.'
                  })
                }
              }]
            };
          } else if (suggestion === 'Supprimer la validation humaine') {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    decision: 'reject',
                    reason: 'Suggestion présente des risques pour la sécurité.'
                  })
                }
              }]
            };
          } else if (suggestion === 'invalid_json') {
            return {
              choices: [{
                message: {
                  content: 'Invalid JSON'
                }
              }]
            };
          } else if (suggestion === 'invalid_decision') {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    decision: 'maybe',
                    reason: 'Invalid decision'
                  })
                }
              }]
            };
          } else if (suggestion === 'api_error') {
            throw new Error('API Error');
          }
          
          return {
            choices: [{
              message: {
                content: ''
              }
            }]
          };
        }
      }
    };
  }
}

// Replace OpenAI with mock
globalThis.OpenAI = MockOpenAI;

// Import the module to test
const { evaluateSuggestion, configureOpenAI } = await import('./decisionFirewall.js');

// Mock environment
process.env.OPENAI_API_KEY = 'test-key';
process.env.OPENAI_MODEL = 'gpt-4-turbo-preview';

// Create mock OpenAI instance
const mockOpenAI = {
  chat: {
    completions: {
      create: async ({ messages }) => {
        const suggestion = messages[0].content.split('"')[1];
        
        // Test different scenarios
        if (suggestion === 'Améliorer la rapidité d\'analyse mémoire') {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  decision: 'accept',
                  reason: 'Suggestion alignée avec les objectifs stratégiques.'
                })
              }
            }]
          };
        } else if (suggestion === 'Supprimer la validation humaine') {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  decision: 'reject',
                  reason: 'Suggestion présente des risques pour la sécurité.'
                })
              }
            }]
          };
        } else if (suggestion === 'invalid_json') {
          return {
            choices: [{
              message: {
                content: 'Invalid JSON'
              }
            }]
          };
        } else if (suggestion === 'invalid_decision') {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  decision: 'maybe',
                  reason: 'Invalid decision'
                })
              }
            }]
          };
        } else if (suggestion === 'api_error') {
          throw new Error('API Error');
        }
        
        return {
          choices: [{
            message: {
              content: ''
            }
          }]
        };
      }
    }
  }
};

// Configure OpenAI with mock instance
configureOpenAI(mockOpenAI);

// Test helper
async function runTest(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name} passed`);
  } catch (error) {
    console.error(`❌ ${name} failed:`, error);
  }
}

// Run tests
console.log('🔥 Running Decision Firewall Tests...\n');

await runTest('Should reject invalid input', async () => {
  const result = await evaluateSuggestion(null);
  const expected = { decision: 'reject', reason: 'Suggestion invalide ou manquante.' };
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

await runTest('Should accept valid suggestion', async () => {
  const result = await evaluateSuggestion('Améliorer la rapidité d\'analyse mémoire');
  const expected = { decision: 'accept', reason: 'Suggestion alignée avec les objectifs stratégiques.' };
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

await runTest('Should reject risky suggestion', async () => {
  const result = await evaluateSuggestion('Supprimer la validation humaine');
  const expected = { decision: 'reject', reason: 'Suggestion présente des risques pour la sécurité.' };
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

await runTest('Should handle API errors gracefully', async () => {
  const result = await evaluateSuggestion('api_error');
  const expected = { decision: 'reject', reason: 'Erreur d\'évaluation automatique.' };
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

await runTest('Should handle invalid JSON response', async () => {
  const result = await evaluateSuggestion('invalid_json');
  const expected = { decision: 'reject', reason: 'Format de réponse invalide.' };
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

await runTest('Should handle invalid decision format', async () => {
  const result = await evaluateSuggestion('invalid_decision');
  const expected = { decision: 'reject', reason: 'Format de décision invalide.' };
  
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
  }
});

console.log('\n🎉 All tests completed!');

// Restore original OpenAI
globalThis.OpenAI = RealOpenAI; 