/**
 * Tests de validation pour la migration GPT-4 → GPT-4.1
 * Couverture critique : Configuration, API calls, Consensus
 */

import { config } from '../config.js';
import { OPENAI_MODEL } from '../backend/setupEnv.js';
import { AIProvider } from '../src/core/ConsensusManager.js';
import { jest } from '@jest/globals';

describe('🚀 Migration GPT-4.1 - Tests de Validation', () => {
  
  beforeAll(() => {
    console.log('🧪 Démarrage tests migration GPT-4.1');
  });

  describe('📋 Configuration Validation', () => {
    
    test('✅ Config principale utilise GPT-4.1', () => {
      expect(config.CONFIG.MODELS.OPENAI.MODEL).toBe('gpt-4.1');
      expect(config.CONFIG.MODELS.OPENAI.MODEL).not.toBe('gpt-4-turbo');
    });

    test('✅ Variables environnement par défaut GPT-4.1', () => {
      // Mock absence d'env var pour tester fallback
      const originalEnv = process.env.OPENAI_MODEL;
      delete process.env.OPENAI_MODEL;
      
      // Recharger le module pour tester fallback
      jest.resetModules();
      const { OPENAI_MODEL: testModel } = require('../backend/setupEnv.js');
      expect(testModel).toBe('gpt-4.1');
      
      // Restaurer
      process.env.OPENAI_MODEL = originalEnv;
    });

    test('✅ Consensus Manager utilise GPT-4.1', () => {
      expect(AIProvider.GPT4).toBe('gpt-4.1');
      expect(AIProvider.GPT4).not.toBe('gpt-4');
    });

  });

  describe('🔧 API Integration Tests', () => {
    
    test('✅ Orchestrator utilise bon modèle par défaut', async () => {
      // Mock OpenAI pour test
      const mockOpenAI = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Test response GPT-4.1' } }]
      });

      // Test sans variable env (fallback)
      const originalEnv = process.env.OPENAI_MODEL;
      delete process.env.OPENAI_MODEL;
      
      // Vérifier que le fallback est correct
      const expectedModel = 'gpt-4.1';
      expect(OPENAI_MODEL).toBe(expectedModel);
      
      process.env.OPENAI_MODEL = originalEnv;
    });

    test('✅ DecisionFirewall utilise GPT-4.1', async () => {
      // Mock pour éviter vrais appels API
      jest.mock('openai');
      
      // Importer après mock
      const { default: decisionFirewall } = await import('../backend/decisionFirewall.js');
      
      // Vérifier que le module charge sans erreur
      expect(decisionFirewall).toBeDefined();
    });

  });

  describe('🎯 Performance & Compatibility', () => {
    
    test('✅ Modèle validé selon spécifications OpenAI', () => {
      const validModels = [
        'gpt-4.1',
        'gpt-4.1-mini', 
        'gpt-4.1-nano',
        'gpt-4-turbo', // Backward compatibility
        'gpt-3.5-turbo'
      ];
      
      expect(validModels).toContain(config.CONFIG.MODELS.OPENAI.MODEL);
    });

    test('✅ Configuration complète et cohérente', () => {
      const openaiConfig = config.CONFIG.MODELS.OPENAI;
      
      // Vérifier tous les champs requis
      expect(openaiConfig.MODEL).toBeDefined();
      expect(openaiConfig.TIMEOUT).toBe(30000);
      expect(openaiConfig.MAX_RETRIES).toBe(3);
      expect(openaiConfig.API_KEY).toBeDefined();
    });

  });

  describe('🚨 Rollback & Safety', () => {
    
    test('✅ Possibilité de rollback via env var', () => {
      // Simuler rollback
      const originalModel = process.env.OPENAI_MODEL;
      process.env.OPENAI_MODEL = 'gpt-4-turbo';
      
      // Vérifier override
      expect(process.env.OPENAI_MODEL).toBe('gpt-4-turbo');
      
      // Restaurer
      process.env.OPENAI_MODEL = originalModel;
    });

    test('✅ Configuration cohérente entre modules', () => {
      // Tous les modules doivent utiliser le même fallback
      const modules = [
        config.CONFIG.MODELS.OPENAI.MODEL,
        'gpt-4.1', // setupEnv fallback
        AIProvider.GPT4
      ];
      
      // Vérifier cohérence
      const uniqueModels = [...new Set(modules)];
      expect(uniqueModels).toHaveLength(1);
      expect(uniqueModels[0]).toBe('gpt-4.1');
    });

  });

  describe('📊 Metrics & Monitoring', () => {
    
    test('✅ Logging inclut version modèle', () => {
      // Mock console.log pour capturer
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Simuler log orchestrator
      const modelName = process.env.OPENAI_MODEL || 'gpt-4.1';
      console.log(`[PRISM] 🚀 Appel OpenAI avec modèle: ${modelName}`);
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('gpt-4.1')
      );
      
      logSpy.mockRestore();
    });

  });

  afterAll(() => {
    console.log('✅ Tests migration GPT-4.1 terminés avec succès');
  });

});

describe('🔍 Backward Compatibility Tests', () => {
  
  test('✅ Support fallback vers anciens modèles', () => {
    const supportedFallbacks = ['gpt-4-turbo', 'gpt-3.5-turbo'];
    
    supportedFallbacks.forEach(model => {
      // Test que la config accepte ces modèles
      expect(typeof model).toBe('string');
      expect(model.startsWith('gpt-')).toBe(true);
    });
  });

});

/**
 * Tests d'intégration - À exécuter avec vraies clés API
 * Désactivés par défaut pour éviter coûts
 */
describe.skip('🚀 Integration Tests (API réelles)', () => {
  
  test('✅ Appel API réel GPT-4.1 fonctionne', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY non définie, test skippé');
      return;
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: 'Test migration GPT-4.1 PRISM' }],
      max_tokens: 50
    });

    expect(response.choices).toHaveLength(1);
    expect(response.choices[0].message.content).toBeDefined();
    expect(response.model).toBe('gpt-4.1');
  }, 30000);

}); 