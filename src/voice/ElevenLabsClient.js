/**
 * PRISM ElevenLabsClient - Client API ElevenLabs Isolé
 * 
 * Gère les appels à l'API ElevenLabs de manière isolée.
 * Responsable uniquement de la transformation texte → audio.
 * Pas de logique UI.
 * 
 * @author PRISM Team
 * @version 1.0.0
 */

/**
 * @typedef {Object} ElevenLabsClientConfig
 * @property {string} apiKey - Clé API ElevenLabs
 * @property {string} [defaultVoiceId] - ID de voix par défaut
 * @property {number} [timeout=30000] - Timeout en ms
 * @property {string} [modelId='eleven_multilingual_v2'] - Modèle TTS
 */

/**
 * @typedef {Object} VoiceSettings
 * @property {number} stability - Stabilité (0-1)
 * @property {number} similarity_boost - Boost de similarité (0-1)
 * @property {number} style - Style (0-1)
 * @property {boolean} use_speaker_boost - Utiliser speaker boost
 */

/**
 * @typedef {Object} AudioGenerationResult
 * @property {string} requestId - ID de la requête
 * @property {Blob} audioBlob - Blob audio généré
 * @property {number} duration - Durée estimée en ms
 * @property {Object} metadata - Métadonnées
 */

export class ElevenLabsClient {
  /**
   * @param {ElevenLabsClientConfig} config
   */
  constructor(config) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    
    this.config = {
      apiKey: config.apiKey,
      defaultVoiceId: config.defaultVoiceId || 'm5SBIR8kR76fbA5dP2rU', // Jean
      timeout: config.timeout || 30000,
      modelId: config.modelId || 'eleven_multilingual_v2'
    };
    
    /** @type {VoiceSettings} */
    this._voiceSettings = {
      stability: 0.35,
      similarity_boost: 0.85,
      style: 0.65,
      use_speaker_boost: true
    };
    
    /** @type {Map<string, AbortController>} */
    this._pendingRequests = new Map();
    
    /** @type {number} */
    this._requestCounter = 0;
  }

  /**
   * Génère un ID de requête unique
   * @returns {string}
   */
  generateRequestId() {
    this._requestCounter++;
    return `el-${Date.now()}-${this._requestCounter}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Retourne l'ID de voix par défaut
   * @returns {string}
   */
  getDefaultVoiceId() {
    return this.config.defaultVoiceId;
  }

  /**
   * Définit l'ID de voix par défaut
   * @param {string} voiceId
   */
  setVoiceId(voiceId) {
    this.config.defaultVoiceId = voiceId;
  }

  /**
   * Retourne le timeout configuré
   * @returns {number}
   */
  getTimeout() {
    return this.config.timeout;
  }

  /**
   * Retourne les paramètres vocaux actuels
   * @returns {VoiceSettings}
   */
  getVoiceSettings() {
    return { ...this._voiceSettings };
  }

  /**
   * Met à jour les paramètres vocaux
   * @param {Partial<VoiceSettings>} settings
   */
  setVoiceSettings(settings) {
    this._voiceSettings = {
      ...this._voiceSettings,
      ...settings
    };
  }

  /**
   * Prépare le texte pour l'envoi à ElevenLabs
   * @param {string} text - Texte brut
   * @param {Object} [options] - Options de préparation
   * @param {number} [options.maxLength=4500] - Longueur maximale
   * @returns {string} Texte nettoyé
   */
  prepareText(text, options = {}) {
    const maxLength = options.maxLength || 4500;
    
    let cleanText = text
      // Supprimer les émojis
      .replaceAll(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      // Supprimer les caractères de contrôle (sanitization intentionnelle avant TTS)
      // eslint-disable-next-line no-control-regex -- suppression volontaire des caractères de contrôle du texte TTS
      .replaceAll(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // Nettoyer markdown
      .replaceAll(/\*\*(.*?)\*\*/g, '$1')
      .replaceAll(/\*(.*?)\*/g, '$1')
      .replaceAll(/#{1,6}\s*/g, '')
      // Normaliser les espaces
      .replaceAll(/\n+/g, ' ')
      .replaceAll(/\s+/g, ' ')
      .trim();
    
    // Tronquer si nécessaire
    if (cleanText.length > maxLength) {
      cleanText = this._smartTruncate(cleanText, maxLength);
    }
    
    return cleanText;
  }

  /**
   * Valide le texte avant envoi
   * @param {string} text
   * @throws {Error} Si texte invalide
   */
  validateText(text) {
    if (!text) {
      throw new Error('Text cannot be empty');
    }
    
    const cleaned = text.trim();
    if (cleaned.length < 3) {
      throw new Error('Text too short after cleaning');
    }
  }

  /**
   * Estime le temps de génération
   * @param {string} text
   * @returns {number} Temps estimé en ms
   */
  estimateGenerationTime(text) {
    // Environ 50ms par caractère en moyenne
    const baseTime = 2000; // 2s minimum
    const perCharTime = 20; // 20ms par caractère
    
    return baseTime + (text.length * perCharTime);
  }

  /**
   * Retourne un timeout adaptatif basé sur la longueur du texte
   * @param {string} text
   * @returns {number} Timeout en ms
   */
  getAdaptiveTimeout(text) {
    const estimated = this.estimateGenerationTime(text);
    const minTimeout = 30000; // 30s minimum
    const buffer = 1.5; // 50% de marge
    
    return Math.max(minTimeout, Math.ceil(estimated * buffer));
  }

  /**
   * Track une requête en cours
   * @param {string} requestId
   * @param {AbortController} [controller]
   */
  trackRequest(requestId, controller = new AbortController()) {
    this._pendingRequests.set(requestId, controller);
  }

  /**
   * Retourne le nombre de requêtes en cours
   * @returns {number}
   */
  getPendingRequestsCount() {
    return this._pendingRequests.size;
  }

  /**
   * Annule une requête spécifique
   * @param {string} requestId
   */
  cancelRequest(requestId) {
    const controller = this._pendingRequests.get(requestId);
    if (controller) {
      controller.abort();
      this._pendingRequests.delete(requestId);
    }
  }

  /**
   * Annule toutes les requêtes en cours
   */
  cancelAllRequests() {
    for (const [_requestId, controller] of this._pendingRequests) {
      controller.abort();
    }
    this._pendingRequests.clear();
  }

  /**
   * Génère l'audio à partir du texte
   * @param {string} text - Texte à convertir
   * @param {Object} [options] - Options de génération
   * @param {string} [options.voiceId] - ID de voix à utiliser
   * @returns {Promise<AudioGenerationResult>}
   */
  async generateAudio(text, options = {}) {
    // Valider et préparer le texte
    this.validateText(text);
    const cleanText = this.prepareText(text);
    
    const requestId = this.generateRequestId();
    const controller = new AbortController();
    this.trackRequest(requestId, controller);
    
    const voiceId = options.voiceId || this.config.defaultVoiceId;
    const timeout = this.getAdaptiveTimeout(cleanText);
    
    // Configurer le timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.config.apiKey
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: this.config.modelId,
            voice_settings: this._voiceSettings
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }
      
      const audioBlob = await response.blob();
      
      return {
        requestId,
        audioBlob,
        duration: this._estimateAudioDuration(audioBlob.size),
        metadata: {
          voiceId,
          textLength: cleanText.length,
          modelId: this.config.modelId
        }
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout or cancelled');
      }
      
      throw error;
      
    } finally {
      this._pendingRequests.delete(requestId);
    }
  }

  // ============ MÉTHODES PRIVÉES ============

  /**
   * Tronque intelligemment le texte
   * @private
   */
  _smartTruncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // Essayer de couper à la fin d'une phrase
    const sentences = text.split(/[.!?]+\s+/);
    let result = '';
    
    for (const sentence of sentences) {
      if ((result + sentence).length <= maxLength - 20) {
        result += `${sentence  }. `;
      } else {
        break;
      }
    }
    
    // Si pas assez de contenu, couper au mot
    if (result.length < maxLength * 0.3) {
      const words = text.split(' ');
      result = '';
      
      for (const word of words) {
        if ((result + word).length <= maxLength - 10) {
          result += `${word  } `;
        } else {
          break;
        }
      }
    }
    
    result = result.trim();
    
    // Ajouter ellipsis si tronqué
    if (!result.match(/[.!?]$/)) {
      result += '...';
    }
    
    return result;
  }

  /**
   * Estime la durée audio basée sur la taille du blob
   * @private
   */
  _estimateAudioDuration(blobSize) {
    // Pour MP3 ~128kbps: 1 seconde ≈ 16KB
    const bytesPerSecond = 16000;
    return Math.ceil((blobSize / bytesPerSecond) * 1000);
  }
}

export default ElevenLabsClient;

