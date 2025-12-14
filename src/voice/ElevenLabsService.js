/**
 * ElevenLabsService - Service de synthèse vocale ElevenLabs
 * 
 * Centralise la génération audio pour éviter la duplication de code.
 * 
 * @module src/voice/ElevenLabsService
 */

import { VoiceOptimizer } from './ResponseModeManager.js';

/**
 * Service ElevenLabs
 */
export class ElevenLabsService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ELEVENLABS_API_KEY;
    this.defaultVoiceId = config.voiceId || 'm5SBIR8kR76fbA5dP2rU'; // Jean
    this.voiceOptimizer = new VoiceOptimizer();
    
    console.log('[ElevenLabsService] Initialized, API key:', this.apiKey ? '✓ configured' : '✗ missing');
  }
  
  /**
   * Vérifie si le service est configuré
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.apiKey && this.apiKey !== 'ta_clef_api_ici';
  }
  
  /**
   * Génère l'audio pour un texte
   * @param {string} text - Texte à synthétiser
   * @param {Object} options - Options
   * @returns {Promise<string|null>} URL audio en base64 ou null
   */
  async generateAudio(text, options = {}) {
    if (!this.isConfigured()) {
      console.warn('[ElevenLabsService] Not configured, skipping audio generation');
      return null;
    }
    
    const startTime = Date.now();
    const voiceId = options.voiceId || this.defaultVoiceId;
    
    try {
      // Nettoyer et optimiser le texte pour la voix
      let cleanText = this.voiceOptimizer.cleanForSpeech(text);
      cleanText = this.voiceOptimizer.truncateForVoice(cleanText, {
        maxLength: options.maxLength || 4000,
        addContinuationHint: true
      });
      
      console.log(`[ElevenLabsService] Generating audio for ${cleanText.length} chars...`);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75,
            style: options.style || 0.0,
            use_speaker_boost: true
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ElevenLabsService] API Error ${response.status}:`, errorText);
        throw new Error(`ElevenLabs API Error: ${response.status}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      const duration = Date.now() - startTime;
      
      console.log(`[ElevenLabsService] ✅ Audio generated in ${duration}ms`);
      
      return `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`;
      
    } catch (error) {
      console.error(`[ElevenLabsService] Error:`, error.message);
      return null;
    }
  }
  
  /**
   * Génère un résumé vocal court pour une analyse
   * @param {Object} analysis - Résultat d'analyse
   * @param {string} userQuery - Question de l'utilisateur
   * @returns {Promise<string|null>} URL audio ou null
   */
  async generateAnalysisSummary(analysis, userQuery, options = {}) {
    // Générer un résumé court pour la voix
    const summary = this.voiceOptimizer.generateVoiceSummary({
      totalRows: analysis.metadata?.totalRows,
      totalColumns: analysis.metadata?.totalColumns,
      keyInsights: analysis.summary?.keyInsights?.slice(0, 3) || []
    });
    
    // Ajouter un contexte sur la question
    const voiceText = `Votre question était : "${userQuery}". ${summary}`;
    
    return this.generateAudio(voiceText, {
      ...options,
      maxLength: 1000 // Court pour les résumés
    });
  }
}

// Singleton pour réutilisation
let instance = null;

export function getElevenLabsService(config) {
  if (!instance) {
    instance = new ElevenLabsService(config);
  }
  return instance;
}

export default ElevenLabsService;
