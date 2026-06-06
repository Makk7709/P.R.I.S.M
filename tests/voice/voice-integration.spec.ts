/**
 * Tests d'intégration pour VoiceIntegration
 * Teste l'intégration complète entre analyse vocale et système PRISM
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceIntegration } from '../../src/modules/voice/VoiceIntegration.js';

// Mock du VoicePersonalityEnhancer
vi.mock('../../backend/voicePersonalityEnhancer.js', () => ({
  VoicePersonalityEnhancer: vi.fn().mockImplementation(() => ({
    enhanceForVoice: vi.fn((response) => ({
      ...response,
      enhancedText: `${response.content  } [Enhanced]`,
      voiceConfig: { speaking_rate: 1.1 }
    }))
  }))
}));

describe('VoiceIntegration - Intégration Complète', () => {
  let voiceIntegration;
  
  beforeEach(() => {
    voiceIntegration = new VoiceIntegration({
      enableRealTimeAnalysis: true,
      enableSentimentDetection: true,
      enableProsodyAnalysis: true,
      enablePersonalityEnhancement: true,
      analysisInterval: 50
    });
  });

  afterEach(() => {
    if (voiceIntegration) {
      voiceIntegration.reset();
    }
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec configuration par défaut', async () => {
      const result = await voiceIntegration.initialize();
      
      expect(result).toBe(true);
      expect(voiceIntegration.analyzer).toBeDefined();
      expect(voiceIntegration.sentimentDetector).toBeDefined();
      expect(voiceIntegration.personalityEnhancer).toBeDefined();
    });

    it('DOIT initialiser avec configuration personnalisée', async () => {
      const customIntegration = new VoiceIntegration({
        enableRealTimeAnalysis: false,
        analysisInterval: 200,
        analyzerConfig: {
          sampleRate: 48000,
          pitchRange: { min: 100, max: 500 }
        }
      });
      
      const result = await customIntegration.initialize();
      
      expect(result).toBe(true);
      expect(customIntegration.config.enableRealTimeAnalysis).toBe(false);
      expect(customIntegration.config.analysisInterval).toBe(200);
    });

    it('DOIT gérer erreur d\'initialisation gracieusement', async () => {
      // Mock d'erreur
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const faultyIntegration = new VoiceIntegration();
      faultyIntegration.analyzer = null; // Simuler erreur
      
      const result = await faultyIntegration.initialize();
      
      expect(result).toBe(false);
    });
  });

  describe('Analyse Temps Réel', () => {
    it('DOIT démarrer analyse temps réel', async () => {
      await voiceIntegration.initialize();
      
      expect(voiceIntegration.isAnalyzing).toBe(true);
      expect(voiceIntegration.analysisTimer).toBeDefined();
    });

    it('DOIT arrêter analyse temps réel', async () => {
      await voiceIntegration.initialize();
      
      voiceIntegration.stopRealTimeAnalysis();
      
      expect(voiceIntegration.isAnalyzing).toBe(false);
      expect(voiceIntegration.analysisTimer).toBeNull();
    });

    it('DOIT traiter buffer d\'analyse', async () => {
      await voiceIntegration.initialize();
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      
      // Ajouter données au buffer
      voiceIntegration.addAudioData(audioData, { source: 'test' });
      
      expect(voiceIntegration.analysisBuffer.length).toBe(1);
      
      // Attendre traitement
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(voiceIntegration.lastAnalysis).toBeDefined();
      expect(voiceIntegration.lastAnalysis.prosody).toBeDefined();
      expect(voiceIntegration.lastAnalysis.emotion).toBeDefined();
    });

    it('DOIT limiter taille du buffer', async () => {
      await voiceIntegration.initialize();
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      
      // Ajouter plus de 100 échantillons
      for (let i = 0; i < 150; i++) {
        voiceIntegration.addAudioData(audioData, { index: i });
      }
      
      expect(voiceIntegration.analysisBuffer.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Analyse Complète', () => {
    it('DOIT analyser audio + texte complètement', async () => {
      await voiceIntegration.initialize();
      
      const audioData = new Float32Array(1024);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = 0.4 * Math.sin(2 * Math.PI * 200 * i / 44100);
      }
      const text = 'Je suis très content de ce résultat !';
      
      const analysis = voiceIntegration.analyzeComplete(audioData, text, { test: true });
      
      expect(analysis).toHaveProperty('timestamp');
      expect(analysis).toHaveProperty('prosody');
      expect(analysis).toHaveProperty('sentiment');
      expect(analysis).toHaveProperty('emotion');
      expect(analysis).toHaveProperty('enhancedResponse');
      expect(analysis).toHaveProperty('metadata');
      
      expect(analysis.prosody).toHaveProperty('pitch');
      expect(analysis.prosody).toHaveProperty('volume');
      expect(analysis.prosody).toHaveProperty('tempo');
      
      expect(analysis.emotion).toHaveProperty('emotion');
      expect(analysis.emotion).toHaveProperty('confidence');
    });

    it('DOIT gérer analyse sans données audio', async () => {
      await voiceIntegration.initialize();
      
      const text = 'Test sans audio';
      
      const analysis = voiceIntegration.analyzeComplete(null, text);
      
      expect(analysis.prosody).toBeNull();
      expect(analysis.emotion).toBeDefined();
      expect(analysis.emotion.emotion).toBe('joy'); // Détection textuelle
    });

    it('DOIT gérer analyse sans texte', async () => {
      await voiceIntegration.initialize();
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      
      const analysis = voiceIntegration.analyzeComplete(audioData, '');
      
      expect(analysis.prosody).toBeDefined();
      expect(analysis.sentiment).toBeNull();
      expect(analysis.emotion).toBeDefined();
    });
  });

  describe('Intégration PRISM', () => {
    it('DOIT intégrer avec réponse PRISM standard', async () => {
      await voiceIntegration.initialize();
      
      const prismResponse = {
        choices: [{
          message: {
            content: 'Voici ma réponse'
          }
        }]
      };
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      
      const enhancedResponse = voiceIntegration.integrateWithPrismResponse(prismResponse, audioData);
      
      expect(enhancedResponse).toHaveProperty('voiceAnalysis');
      expect(enhancedResponse.voiceAnalysis.integration).toBe(true);
      expect(enhancedResponse.voiceAnalysis.timestamp).toBeDefined();
    });

    it('DOIT adapter réponse selon émotion utilisateur', async () => {
      await voiceIntegration.initialize();
      
      const prismResponse = {
        content: 'Voici ma réponse'
      };
      
      // Simuler émotion de tristesse
      const sadAudioData = new Float32Array(1024);
      for (let i = 0; i < sadAudioData.length; i++) {
        sadAudioData[i] = 0.2 * Math.sin(2 * Math.PI * 120 * i / 44100);
      }
      
      const enhancedResponse = voiceIntegration.integrateWithPrismResponse(prismResponse, sadAudioData);
      
      expect(enhancedResponse).toHaveProperty('emotionAdaptation');
      expect(enhancedResponse.emotionAdaptation.tone).toBe('empathetic');
      expect(enhancedResponse.emotionAdaptation.modifiers).toContain('💙');
    });

    it('DOIT extraire texte de différents formats de réponse', async () => {
      await voiceIntegration.initialize();
      
      // Test format string
      const text1 = voiceIntegration.extractTextFromResponse('Texte simple');
      expect(text1).toBe('Texte simple');
      
      // Test format OpenAI
      const text2 = voiceIntegration.extractTextFromResponse({
        choices: [{ message: { content: 'Réponse OpenAI' } }]
      });
      expect(text2).toBe('Réponse OpenAI');
      
      // Test format Claude
      const text3 = voiceIntegration.extractTextFromResponse({
        content: [{ text: 'Réponse Claude' }]
      });
      expect(text3).toBe('Réponse Claude');
      
      // Test format direct
      const text4 = voiceIntegration.extractTextFromResponse({
        content: 'Réponse directe'
      });
      expect(text4).toBe('Réponse directe');
    });
  });

  describe('Gestion Événements', () => {
    it('DOIT émettre événements d\'analyse', async () => {
      await voiceIntegration.initialize();
      
      const analysisCallback = vi.fn();
      const emotionCallback = vi.fn();
      
      voiceIntegration.on('analysis', analysisCallback);
      voiceIntegration.on('emotion', emotionCallback);
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      
      voiceIntegration.addAudioData(audioData);
      
      // Attendre traitement
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(analysisCallback).toHaveBeenCalled();
      expect(emotionCallback).toHaveBeenCalled();
    });

    it('DOIT gérer erreurs dans callbacks', async () => {
      await voiceIntegration.initialize();
      
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      
      voiceIntegration.on('analysis', errorCallback);
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      
      // Ne devrait pas planter
      expect(() => {
        voiceIntegration.addAudioData(audioData);
      }).not.toThrow();
    });
  });

  describe('Statistiques et Monitoring', () => {
    it('DOIT fournir statistiques complètes', async () => {
      await voiceIntegration.initialize();
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      
      voiceIntegration.addAudioData(audioData);
      
      // Attendre traitement
      await new Promise(resolve => setTimeout(resolve, 60));
      
      const stats = voiceIntegration.getAnalysisStats();
      
      expect(stats).toHaveProperty('timestamp');
      expect(stats).toHaveProperty('isAnalyzing');
      expect(stats).toHaveProperty('bufferSize');
      expect(stats).toHaveProperty('lastAnalysis');
      expect(stats).toHaveProperty('analyzerStats');
      expect(stats).toHaveProperty('emotionStats');
      expect(stats).toHaveProperty('config');
      
      expect(stats.analyzerStats.pitchHistoryLength).toBeGreaterThanOrEqual(0);
      expect(stats.emotionStats.emotionHistoryLength).toBeGreaterThanOrEqual(0);
    });

    it('DOIT exporter données d\'analyse', async () => {
      await voiceIntegration.initialize();
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      
      voiceIntegration.addAudioData(audioData);
      
      // Attendre traitement
      await new Promise(resolve => setTimeout(resolve, 60));
      
      const exportedData = voiceIntegration.exportAnalysisData();
      
      expect(exportedData).toHaveProperty('timestamp');
      expect(exportedData).toHaveProperty('config');
      expect(exportedData).toHaveProperty('analyzerHistory');
      expect(exportedData).toHaveProperty('emotionHistory');
      expect(exportedData).toHaveProperty('lastAnalysis');
      expect(exportedData).toHaveProperty('stats');
    });
  });

  describe('Configuration Dynamique', () => {
    it('DOIT mettre à jour configuration', async () => {
      await voiceIntegration.initialize();
      
      const newConfig = {
        enableRealTimeAnalysis: false,
        analysisInterval: 300,
        enableSentimentDetection: false
      };
      
      voiceIntegration.updateConfig(newConfig);
      
      expect(voiceIntegration.config.enableRealTimeAnalysis).toBe(false);
      expect(voiceIntegration.config.analysisInterval).toBe(300);
      expect(voiceIntegration.config.enableSentimentDetection).toBe(false);
    });

    it('DOIT redémarrer analyse selon nouvelle config', async () => {
      await voiceIntegration.initialize();
      
      // Arrêter analyse
      voiceIntegration.updateConfig({ enableRealTimeAnalysis: false });
      expect(voiceIntegration.isAnalyzing).toBe(false);
      
      // Redémarrer analyse
      voiceIntegration.updateConfig({ enableRealTimeAnalysis: true });
      expect(voiceIntegration.isAnalyzing).toBe(true);
    });
  });

  describe('Réinitialisation', () => {
    it('DOIT réinitialiser complètement', async () => {
      await voiceIntegration.initialize();
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      
      voiceIntegration.addAudioData(audioData);
      
      // Attendre traitement
      await new Promise(resolve => setTimeout(resolve, 60));
      
      // Vérifier état avant reset
      expect(voiceIntegration.isAnalyzing).toBe(true);
      expect(voiceIntegration.analysisBuffer.length).toBeGreaterThan(0);
      expect(voiceIntegration.lastAnalysis).toBeDefined();
      
      // Reset
      voiceIntegration.reset();
      
      // Vérifier état après reset
      expect(voiceIntegration.isAnalyzing).toBe(false);
      expect(voiceIntegration.analysisBuffer.length).toBe(0);
      expect(voiceIntegration.lastAnalysis).toBeNull();
    });
  });

  describe('Performance', () => {
    it('DOIT traiter analyse complète rapidement (< 100ms)', async () => {
      await voiceIntegration.initialize();
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      const text = 'Test de performance';
      
      const startTime = performance.now();
      voiceIntegration.analyzeComplete(audioData, text);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(100);
    });

    it('DOIT gérer signaux audio volumineux', async () => {
      await voiceIntegration.initialize();
      
      const largeAudioData = new Float32Array(44100); // 1 seconde
      largeAudioData.fill(0.2);
      
      expect(() => {
        voiceIntegration.analyzeComplete(largeAudioData, 'Test volumineux');
      }).not.toThrow();
    });
  });

  describe('Robustesse', () => {
    it('DOIT gérer erreurs d\'analyse gracieusement', async () => {
      await voiceIntegration.initialize();
      
      // Simuler erreur dans l'analyzer
      vi.spyOn(voiceIntegration.analyzer, 'analyzeProsody').mockImplementation(() => {
        throw new Error('Analyzer error');
      });
      
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      
      const analysis = voiceIntegration.analyzeComplete(audioData, 'Test erreur');
      
      expect(analysis).toHaveProperty('error');
      expect(analysis.error).toBe('Analyzer error');
    });

    it('DOIT gérer intégration PRISM avec données corrompues', async () => {
      await voiceIntegration.initialize();
      
      const corruptedResponse = null;
      const corruptedAudio = new Float32Array(0);
      
      const result = voiceIntegration.integrateWithPrismResponse(corruptedResponse, corruptedAudio);
      
      expect(result).toBeNull();
    });
  });
});
