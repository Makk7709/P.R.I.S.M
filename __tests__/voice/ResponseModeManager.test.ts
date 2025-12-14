/**
 * Tests TDD pour le ResponseModeManager
 * 
 * Logique intelligente: 
 * - Input écrit → Réponse écrite uniquement
 * - Input vocal → Réponse vocale avec ElevenLabs
 * 
 * @module __tests__/voice/ResponseModeManager.test.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock de fetch pour ElevenLabs
global.fetch = vi.fn();

// Import après les mocks
import { 
  ResponseModeManager, 
  InputMode, 
  ResponseMode,
  VoiceOptimizer 
} from '../../src/voice/ResponseModeManager.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS POUR InputMode - Détection du mode d'entrée
// ═══════════════════════════════════════════════════════════════════════════════

describe('InputMode Detection', () => {
  let manager: ResponseModeManager;

  beforeEach(() => {
    manager = new ResponseModeManager();
  });

  describe('Text Input Detection', () => {
    it('should detect typed text input', () => {
      const mode = manager.detectInputMode({
        message: 'Bonjour, comment ça va ?',
        source: 'keyboard'
      });
      
      expect(mode).toBe(InputMode.TEXT);
    });

    it('should detect text input from paste', () => {
      const mode = manager.detectInputMode({
        message: 'Un long texte collé...',
        source: 'paste'
      });
      
      expect(mode).toBe(InputMode.TEXT);
    });

    it('should detect text input when no source specified', () => {
      const mode = manager.detectInputMode({
        message: 'Message simple'
      });
      
      expect(mode).toBe(InputMode.TEXT);
    });
  });

  describe('Voice Input Detection', () => {
    it('should detect voice input from speech recognition', () => {
      const mode = manager.detectInputMode({
        message: 'Bonjour PRISM',
        source: 'voice',
        confidence: 0.95
      });
      
      expect(mode).toBe(InputMode.VOICE);
    });

    it('should detect voice input with transcript data', () => {
      const mode = manager.detectInputMode({
        message: 'Analyse ce fichier',
        source: 'speech_recognition',
        transcript: {
          text: 'Analyse ce fichier',
          confidence: 0.92
        }
      });
      
      expect(mode).toBe(InputMode.VOICE);
    });

    it('should mark low confidence voice as text', () => {
      const mode = manager.detectInputMode({
        message: 'mmm oui peut-être',
        source: 'voice',
        confidence: 0.4 // Trop faible
      });
      
      // Confiance trop faible = traiter comme texte pour éviter les erreurs
      expect(mode).toBe(InputMode.TEXT);
    });
  });

  describe('Hybrid Detection', () => {
    it('should detect hybrid mode when both present', () => {
      const mode = manager.detectInputMode({
        message: 'Analyse ce fichier Excel',
        source: 'voice',
        hasAttachment: true // Fichier attaché = contexte hybride
      });
      
      expect(mode).toBe(InputMode.HYBRID);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS POUR ResponseMode - Détermination du mode de réponse
// ═══════════════════════════════════════════════════════════════════════════════

describe('ResponseMode Selection', () => {
  let manager: ResponseModeManager;

  beforeEach(() => {
    // Configuration avec API key pour activer ElevenLabs
    manager = new ResponseModeManager({
      elevenLabsApiKey: 'test-api-key'
    });
  });

  describe('Text-only Response', () => {
    it('should return TEXT_ONLY for text input', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.TEXT,
        userPreferences: {}
      });
      
      expect(responseMode.mode).toBe(ResponseMode.TEXT_ONLY);
      expect(responseMode.generateAudio).toBe(false);
    });

    it('should NOT call ElevenLabs for text input', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.TEXT,
        userPreferences: {}
      });
      
      expect(responseMode.useElevenLabs).toBe(false);
    });

    it('should include full formatted response for text', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.TEXT,
        userPreferences: {}
      });
      
      expect(responseMode.formatOptions.includeMarkdown).toBe(true);
      expect(responseMode.formatOptions.includeEmojis).toBe(true);
      expect(responseMode.formatOptions.includeTables).toBe(true);
    });
  });

  describe('Voice Response', () => {
    it('should return VOICE_WITH_TEXT for voice input', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.VOICE,
        userPreferences: {}
      });
      
      expect(responseMode.mode).toBe(ResponseMode.VOICE_WITH_TEXT);
      expect(responseMode.generateAudio).toBe(true);
    });

    it('should use ElevenLabs for voice input', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.VOICE,
        userPreferences: {}
      });
      
      expect(responseMode.useElevenLabs).toBe(true);
    });

    it('should optimize response for voice synthesis', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.VOICE,
        userPreferences: {}
      });
      
      expect(responseMode.formatOptions.optimizeForSpeech).toBe(true);
      expect(responseMode.formatOptions.maxAudioLength).toBeDefined();
    });

    it('should still provide text version', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.VOICE,
        userPreferences: {}
      });
      
      expect(responseMode.includeTextResponse).toBe(true);
    });
  });

  describe('User Preferences Override', () => {
    it('should respect forceVoice preference', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.TEXT,
        userPreferences: { forceVoice: true }
      });
      
      expect(responseMode.generateAudio).toBe(true);
      expect(responseMode.useElevenLabs).toBe(true);
    });

    it('should respect forceText preference', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.VOICE,
        userPreferences: { forceText: true }
      });
      
      expect(responseMode.generateAudio).toBe(false);
      expect(responseMode.useElevenLabs).toBe(false);
    });

    it('should respect disableAudio preference', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.VOICE,
        userPreferences: { disableAudio: true }
      });
      
      expect(responseMode.generateAudio).toBe(false);
    });
  });

  describe('Hybrid Mode Response', () => {
    it('should return hybrid response for file analysis', () => {
      const responseMode = manager.determineResponseMode({
        inputMode: InputMode.HYBRID,
        userPreferences: {},
        context: { hasFileAttachment: true }
      });
      
      // Fichiers = beaucoup de données = texte détaillé + audio résumé
      expect(responseMode.mode).toBe(ResponseMode.HYBRID);
      expect(responseMode.generateAudio).toBe(true);
      expect(responseMode.audioSummaryOnly).toBe(true); // Juste un résumé vocal
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS POUR VoiceOptimizer - Optimisation du texte pour ElevenLabs
// ═══════════════════════════════════════════════════════════════════════════════

describe('VoiceOptimizer', () => {
  let optimizer: VoiceOptimizer;

  beforeEach(() => {
    optimizer = new VoiceOptimizer();
  });

  describe('Text Cleaning for Speech', () => {
    it('should remove markdown formatting', () => {
      const input = '**Bonjour** comment *ça* va ?';
      const result = optimizer.cleanForSpeech(input);
      
      expect(result).toBe('Bonjour comment ça va ?');
    });

    it('should convert bullet points to natural speech', () => {
      const input = '• Premier point\n• Deuxième point\n• Troisième point';
      const result = optimizer.cleanForSpeech(input);
      
      expect(result).toContain('Premièrement');
      expect(result).toContain('Deuxièmement');
      expect(result).toContain('Troisièmement');
    });

    it('should remove emoji but keep meaning', () => {
      const input = '📊 Voici les statistiques';
      const result = optimizer.cleanForSpeech(input);
      
      expect(result).not.toContain('📊');
      expect(result).toContain('statistiques');
    });

    it('should handle tables gracefully', () => {
      const input = '| Col1 | Col2 |\n|---|---|\n| A | B |';
      const result = optimizer.cleanForSpeech(input);
      
      // Les tableaux doivent être convertis en phrase
      expect(result).not.toContain('|');
      expect(result).toContain('A');
      expect(result).toContain('B');
    });

    it('should preserve numbers and dates', () => {
      const input = 'Le 15 janvier 2024, le CA était de 45 060,65€';
      const result = optimizer.cleanForSpeech(input);
      
      expect(result).toContain('15 janvier 2024');
      expect(result).toContain('45 060');
    });

    it('should add natural pauses', () => {
      const input = 'Point 1. Point 2. Point 3.';
      const result = optimizer.cleanForSpeech(input, { addPauses: true });
      
      // ElevenLabs utilise ... ou <break> pour les pauses
      expect(result).toMatch(/\.\.\.|<break/);
    });
  });

  describe('Smart Truncation for Voice', () => {
    it('should truncate long text for voice', () => {
      const longText = 'A'.repeat(5000);
      const result = optimizer.truncateForVoice(longText, { maxLength: 1000 });
      
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('should preserve sentence boundaries when truncating', () => {
      const text = 'Première phrase complète. Deuxième phrase. Troisième phrase très longue qui dépasse la limite.';
      const result = optimizer.truncateForVoice(text, { maxLength: 60 });
      
      // Doit couper à la fin d'une phrase
      expect(result).toMatch(/\.$/);
    });

    it('should add continuation indicator', () => {
      const longText = 'Texte très long. '.repeat(100);
      const result = optimizer.truncateForVoice(longText, { 
        maxLength: 200,
        addContinuationHint: true 
      });
      
      expect(result).toMatch(/suite|détails|complet/i);
    });

    it('should prioritize key information', () => {
      const text = `
        Introduction sans importance.
        **Point clé important**: Le CA est de 45000€.
        Détails supplémentaires...
        Conclusion.
      `;
      const result = optimizer.truncateForVoice(text, { 
        maxLength: 100,
        preserveKeyInfo: true 
      });
      
      expect(result).toContain('45000');
    });
  });

  describe('Voice Summary Generation', () => {
    it('should generate concise summary for long analysis', () => {
      const analysis = {
        totalRows: 467,
        totalColumns: 13,
        keyInsights: [
          'Le CA moyen est de 4500€',
          'Electronics représente 60% des ventes',
          '3 outliers détectés'
        ]
      };
      
      const summary = optimizer.generateVoiceSummary(analysis);
      
      expect(summary.length).toBeLessThan(500);
      expect(summary).toContain('467');
      expect(summary).toContain('13');
      expect(summary).toContain('4500');
    });

    it('should be natural and conversational', () => {
      const analysis = {
        totalRows: 100,
        keyInsights: ['Insight 1', 'Insight 2']
      };
      
      const summary = optimizer.generateVoiceSummary(analysis);
      
      // Doit commencer par une phrase d'introduction naturelle
      expect(summary).toMatch(/^(J'ai|Voici|L'analyse|Le fichier)/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS POUR ElevenLabs Integration
// ═══════════════════════════════════════════════════════════════════════════════

describe('ElevenLabs Integration', () => {
  let manager: ResponseModeManager;

  beforeEach(() => {
    manager = new ResponseModeManager({
      elevenLabsApiKey: 'test-api-key',
      defaultVoiceId: 'm5SBIR8kR76fbA5dP2rU' // Jean
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Call Optimization', () => {
    it('should NOT call ElevenLabs for text-only mode', async () => {
      const response = await manager.processResponse({
        content: 'Une réponse simple',
        inputMode: InputMode.TEXT
      });
      
      expect(fetch).not.toHaveBeenCalled();
      expect(response.audioUrl).toBeUndefined();
    });

    it('should call ElevenLabs for voice mode', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      });

      const response = await manager.processResponse({
        content: 'Une réponse vocale',
        inputMode: InputMode.VOICE
      });
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.elevenlabs.io'),
        expect.any(Object)
      );
      expect(response.audioUrl).toBeDefined();
    });

    it('should use optimized text for voice synthesis', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      });

      await manager.processResponse({
        content: '**Texte** avec *markdown* et 📊 emoji',
        inputMode: InputMode.VOICE
      });
      
      // Le texte envoyé à ElevenLabs doit être nettoyé
      const fetchCall = (fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.text).not.toContain('**');
      expect(body.text).not.toContain('*');
      expect(body.text).not.toContain('📊');
    });
  });

  describe('Error Handling', () => {
    it('should fallback gracefully on ElevenLabs error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const response = await manager.processResponse({
        content: 'Une réponse',
        inputMode: InputMode.VOICE
      });
      
      expect(response.audioUrl).toBeUndefined();
      expect(response.fallbackToTTS).toBe(true);
      expect(response.error).toBeDefined();
    });

    it('should still return text response on audio failure', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const response = await manager.processResponse({
        content: 'Une réponse importante',
        inputMode: InputMode.VOICE
      });
      
      expect(response.textContent).toBe('Une réponse importante');
    });
  });

  describe('Voice Settings', () => {
    it('should use selected voice ID', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      });

      await manager.processResponse({
        content: 'Test',
        inputMode: InputMode.VOICE,
        voiceConfig: {
          id: 'custom-voice-id',
          name: 'Custom Voice'
        }
      });
      
      const fetchCall = (fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('custom-voice-id');
    });

    it('should apply voice settings', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      });

      await manager.processResponse({
        content: 'Test',
        inputMode: InputMode.VOICE,
        voiceConfig: {
          stability: 0.7,
          similarityBoost: 0.8
        }
      });
      
      const fetchCall = (fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.voice_settings.stability).toBe(0.7);
      expect(body.voice_settings.similarity_boost).toBe(0.8);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS POUR L'intégration complète
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full Response Flow Integration', () => {
  let manager: ResponseModeManager;

  beforeEach(() => {
    manager = new ResponseModeManager({
      elevenLabsApiKey: 'test-key'
    });
    vi.clearAllMocks();
  });

  it('should handle complete text flow', async () => {
    const result = await manager.handleUserMessage({
      message: 'Quelle est la météo ?',
      source: 'keyboard'
    }, 'Il fait beau avec 22°C');
    
    expect(result.inputMode).toBe(InputMode.TEXT);
    expect(result.responseMode).toBe(ResponseMode.TEXT_ONLY);
    expect(result.response.textContent).toBe('Il fait beau avec 22°C');
    expect(result.response.audioUrl).toBeUndefined();
  });

  it('should handle complete voice flow', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
    });

    const result = await manager.handleUserMessage({
      message: 'Bonjour PRISM',
      source: 'voice',
      confidence: 0.95
    }, 'Bonjour ! Comment puis-je vous aider ?');
    
    expect(result.inputMode).toBe(InputMode.VOICE);
    expect(result.responseMode).toBe(ResponseMode.VOICE_WITH_TEXT);
    expect(result.response.textContent).toBeDefined();
    expect(result.response.audioUrl).toBeDefined();
  });

  it('should track mode transitions', () => {
    // Premier message écrit
    manager.detectInputMode({ message: 'Hello', source: 'keyboard' });
    
    // Deuxième message vocal
    manager.detectInputMode({ message: 'Hello', source: 'voice', confidence: 0.9 });
    
    const history = manager.getModeHistory();
    
    expect(history).toHaveLength(2);
    expect(history[0].mode).toBe(InputMode.TEXT);
    expect(history[1].mode).toBe(InputMode.VOICE);
  });

  it('should provide mode consistency stats', () => {
    manager.detectInputMode({ message: 'A', source: 'keyboard' });
    manager.detectInputMode({ message: 'B', source: 'keyboard' });
    manager.detectInputMode({ message: 'C', source: 'voice', confidence: 0.9 });
    
    const stats = manager.getModeStats();
    
    expect(stats.textCount).toBe(2);
    expect(stats.voiceCount).toBe(1);
    expect(stats.dominantMode).toBe(InputMode.TEXT);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS POUR la configuration Vitest
// ═══════════════════════════════════════════════════════════════════════════════

describe('Configuration', () => {
  it('should allow custom confidence threshold', () => {
    const manager = new ResponseModeManager({
      voiceConfidenceThreshold: 0.8
    });
    
    // Confiance 0.75 < 0.8 = TEXT
    const mode = manager.detectInputMode({
      message: 'Test',
      source: 'voice',
      confidence: 0.75
    });
    
    expect(mode).toBe(InputMode.TEXT);
  });

  it('should allow disabling ElevenLabs', () => {
    const manager = new ResponseModeManager({
      enableElevenLabs: false
    });
    
    const responseMode = manager.determineResponseMode({
      inputMode: InputMode.VOICE,
      userPreferences: {}
    });
    
    expect(responseMode.useElevenLabs).toBe(false);
    expect(responseMode.useBrowserTTS).toBe(true);
  });
});
