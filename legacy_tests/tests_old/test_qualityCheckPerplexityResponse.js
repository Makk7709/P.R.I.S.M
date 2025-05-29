const { qualityCheckPerplexityResponse } = require('../src/qualityCheckPerplexityResponse');

describe('qualityCheckPerplexityResponse', () => {
  // Test 1: Réponse valide avec mot-clé trouvé
  test('should validate response with found keyword', () => {
    const response = {
      text: 'This is a valid response with the required keyword',
      keywords: ['required']
    };
    const result = qualityCheckPerplexityResponse(response);
    expect(result.isValid).toBe(true);
    expect(result.foundKeywords).toContain('required');
  });

  // Test 2: Réponse valide sans mot-clé
  test('should validate response without keyword', () => {
    const response = {
      text: 'This is a valid response without any keywords',
      keywords: []
    };
    const result = qualityCheckPerplexityResponse(response);
    expect(result.isValid).toBe(true);
    expect(result.foundKeywords).toHaveLength(0);
  });

  // Test 3: Réponse vide ou inexistante
  test('should handle empty or null response', () => {
    const emptyResponse = {
      text: '',
      keywords: []
    };
    const nullResponse = null;
    
    expect(qualityCheckPerplexityResponse(emptyResponse).isValid).toBe(false);
    expect(qualityCheckPerplexityResponse(nullResponse).isValid).toBe(false);
  });

  // Test 4: Réponse avec mots interdits ou erreurs
  test('should detect forbidden words and errors', () => {
    const response = {
      text: 'This response contains an error and forbidden word',
      keywords: ['error', 'forbidden'],
      forbiddenWords: ['forbidden']
    };
    const result = qualityCheckPerplexityResponse(response);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('forbidden_word_detected');
  });

  // Test 5: Réponse avec structure invalide
  test('should handle invalid response structure', () => {
    const invalidResponse = {
      text: 'Missing keywords property'
    };
    const result = qualityCheckPerplexityResponse(invalidResponse);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('invalid_structure');
  });
}); 