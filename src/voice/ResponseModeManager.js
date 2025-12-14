/**
 * ResponseModeManager - Gestion intelligente du mode de réponse
 * 
 * Logique:
 * - Input écrit → Réponse écrite uniquement (pas d'appel ElevenLabs)
 * - Input vocal → Réponse vocale avec ElevenLabs + texte
 * - Mode hybride → Résumé vocal + texte détaillé
 * 
 * @module src/voice/ResponseModeManager
 */

/**
 * Modes d'entrée possibles
 */
export const InputMode = {
  TEXT: 'text',
  VOICE: 'voice',
  HYBRID: 'hybrid'
};

/**
 * Modes de réponse possibles
 */
export const ResponseMode = {
  TEXT_ONLY: 'text_only',
  VOICE_ONLY: 'voice_only',
  VOICE_WITH_TEXT: 'voice_with_text',
  HYBRID: 'hybrid'
};

/**
 * VoiceOptimizer - Optimise le texte pour la synthèse vocale
 */
export class VoiceOptimizer {
  constructor(options = {}) {
    this.options = {
      maxLength: options.maxLength || 4000,
      addPauses: options.addPauses || false,
      preserveKeyInfo: options.preserveKeyInfo || true,
      ...options
    };
  }

  /**
   * Nettoie le texte pour la synthèse vocale
   * @param {string} text - Texte à nettoyer
   * @param {Object} options - Options de nettoyage
   * @returns {string} Texte nettoyé
   */
  cleanForSpeech(text, options = {}) {
    let result = text;
    
    // 1. Supprimer le markdown bold/italic
    result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
    result = result.replace(/\*([^*]+)\*/g, '$1');
    result = result.replace(/__([^_]+)__/g, '$1');
    result = result.replace(/_([^_]+)_/g, '$1');
    
    // 2. Supprimer les headers markdown
    result = result.replace(/^#{1,6}\s+/gm, '');
    
    // 3. Supprimer les emojis tout en gardant le texte
    result = result.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    
    // 4. Convertir les listes à puces en texte naturel
    const bulletMatches = result.match(/^[•\-\*]\s+(.+)$/gm);
    if (bulletMatches) {
      const ordinals = ['Premièrement', 'Deuxièmement', 'Troisièmement', 'Quatrièmement', 'Cinquièmement'];
      let bulletIndex = 0;
      result = result.replace(/^[•\-\*]\s+(.+)$/gm, (match, content) => {
        const ordinal = ordinals[bulletIndex] || `Point ${bulletIndex + 1}`;
        bulletIndex++;
        return `${ordinal}, ${content}.`;
      });
    }
    
    // 5. Convertir les tableaux markdown en phrases
    if (result.includes('|')) {
      result = this._convertTableToSpeech(result);
    }
    
    // 6. Supprimer les liens markdown
    result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // 7. Supprimer les backticks de code
    result = result.replace(/`([^`]+)`/g, '$1');
    result = result.replace(/```[\s\S]*?```/g, '');
    
    // 8. Nettoyer les espaces multiples
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/\n{3,}/g, '\n\n');
    
    // 9. Ajouter des pauses naturelles si demandé
    if (options.addPauses) {
      result = result.replace(/\.\s+/g, '... ');
      result = result.replace(/:\s+/g, '... ');
    }
    
    return result.trim();
  }

  /**
   * Convertit un tableau markdown en texte parlé
   * @private
   */
  _convertTableToSpeech(text) {
    const lines = text.split('\n');
    const result = [];
    let inTable = false;
    let headers = [];
    
    for (const line of lines) {
      if (line.includes('|') && !line.match(/^\|[-:]+\|/)) {
        const cells = line.split('|').filter(c => c.trim());
        
        if (!inTable) {
          // C'est la ligne des headers
          headers = cells.map(c => c.trim());
          inTable = true;
        } else if (cells.length > 0) {
          // C'est une ligne de données
          const parts = cells.map((c, i) => {
            const header = headers[i] || `Colonne ${i + 1}`;
            return `${header}: ${c.trim()}`;
          });
          result.push(parts.join(', '));
        }
      } else if (line.match(/^\|[-:]+\|/)) {
        // Ligne de séparation, ignorer
        continue;
      } else {
        if (inTable) {
          inTable = false;
          headers = [];
        }
        result.push(line);
      }
    }
    
    return result.join('\n');
  }

  /**
   * Tronque le texte intelligemment pour la synthèse vocale
   * @param {string} text - Texte à tronquer
   * @param {Object} options - Options de troncature
   * @returns {string} Texte tronqué
   */
  truncateForVoice(text, options = {}) {
    const maxLength = options.maxLength || this.options.maxLength;
    
    if (text.length <= maxLength) {
      return text;
    }
    
    // Priorité aux informations clés si demandé
    if (options.preserveKeyInfo) {
      const keyInfo = this._extractKeyInfo(text);
      if (keyInfo && keyInfo.length <= maxLength) {
        return keyInfo;
      }
    }
    
    // Couper à la fin d'une phrase
    let truncated = text.substring(0, maxLength);
    
    // Trouver la dernière phrase complète
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > maxLength * 0.5) {
      truncated = truncated.substring(0, lastSentenceEnd + 1);
    }
    
    // Ajouter un indicateur de continuation si demandé
    if (options.addContinuationHint) {
      truncated += ' Consultez le texte pour plus de détails.';
    }
    
    return truncated;
  }

  /**
   * Extrait les informations clés d'un texte
   * @private
   */
  _extractKeyInfo(text) {
    const keyPatterns = [
      /\*\*[^*]+\*\*[^.]*\./g, // Texte en gras avec contexte
      /\d+[\s,.]?\d*\s*[€$%]/g, // Montants et pourcentages
      /Le CA|La moyenne|Le total|En résumé/gi // Phrases clés
    ];
    
    const keyParts = [];
    for (const pattern of keyPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        keyParts.push(...matches);
      }
    }
    
    return keyParts.length > 0 ? keyParts.join(' ') : null;
  }

  /**
   * Génère un résumé vocal pour une analyse
   * @param {Object} analysis - Données d'analyse
   * @returns {string} Résumé vocal
   */
  generateVoiceSummary(analysis) {
    const parts = [];
    
    // Introduction naturelle
    if (analysis.totalRows && analysis.totalColumns) {
      parts.push(`J'ai analysé un fichier contenant ${analysis.totalRows} lignes et ${analysis.totalColumns} colonnes.`);
    } else if (analysis.totalRows) {
      parts.push(`L'analyse porte sur ${analysis.totalRows} entrées.`);
    } else {
      parts.push(`Voici les résultats de l'analyse.`);
    }
    
    // Insights clés
    if (analysis.keyInsights && analysis.keyInsights.length > 0) {
      parts.push('Voici les points principaux:');
      const topInsights = analysis.keyInsights.slice(0, 3);
      topInsights.forEach((insight, index) => {
        const ordinal = ['Premièrement', 'Deuxièmement', 'Troisièmement'][index];
        parts.push(`${ordinal}, ${insight}.`);
      });
    }
    
    // Conclusion
    parts.push('Consultez le texte détaillé pour plus d\'informations.');
    
    return parts.join(' ');
  }
}

/**
 * ResponseModeManager - Classe principale de gestion des modes
 */
export class ResponseModeManager {
  /**
   * @param {Object} options - Options de configuration
   */
  constructor(options = {}) {
    this.options = {
      voiceConfidenceThreshold: options.voiceConfidenceThreshold || 0.6,
      enableElevenLabs: options.enableElevenLabs !== false,
      elevenLabsApiKey: options.elevenLabsApiKey || null,
      defaultVoiceId: options.defaultVoiceId || 'm5SBIR8kR76fbA5dP2rU',
      maxAudioLength: options.maxAudioLength || 4000,
      ...options
    };
    
    this.voiceOptimizer = new VoiceOptimizer({
      maxLength: this.options.maxAudioLength
    });
    
    // Historique des modes pour analytics
    this.modeHistory = [];
  }

  /**
   * Détecte le mode d'entrée
   * @param {Object} input - Données d'entrée
   * @returns {string} Mode détecté (InputMode)
   */
  detectInputMode(input) {
    const { source, confidence, hasAttachment, transcript } = input;
    
    // Stockage pour historique
    let mode = InputMode.TEXT;
    
    // Détection vocale
    const isVoiceSource = source === 'voice' || source === 'speech_recognition';
    const providedConfidence = confidence ?? transcript?.confidence ?? null;
    
    // Si source vocale:
    // - Si confidence fournie: vérifier le seuil
    // - Si pas de confidence: considérer comme vocal (cas du toggle hasAttachment)
    const hasGoodConfidence = providedConfidence === null || providedConfidence >= this.options.voiceConfidenceThreshold;
    
    if (isVoiceSource && hasGoodConfidence) {
      mode = InputMode.VOICE;
    }
    
    // Mode hybride (vocal + fichier)
    if (isVoiceSource && hasAttachment) {
      mode = InputMode.HYBRID;
    }
    
    // Enregistrer dans l'historique
    this.modeHistory.push({
      mode,
      timestamp: Date.now(),
      source,
      confidence: confidence || transcript?.confidence
    });
    
    return mode;
  }

  /**
   * Détermine le mode de réponse approprié
   * @param {Object} params - Paramètres
   * @returns {Object} Configuration du mode de réponse
   */
  determineResponseMode(params) {
    const { inputMode, userPreferences = {}, context = {} } = params;
    
    // Vérifier les préférences utilisateur
    if (userPreferences.forceVoice) {
      return this._createVoiceResponse(true);
    }
    
    if (userPreferences.forceText || userPreferences.disableAudio) {
      return this._createTextOnlyResponse();
    }
    
    // Logique basée sur le mode d'entrée
    switch (inputMode) {
      case InputMode.TEXT:
        return this._createTextOnlyResponse();
        
      case InputMode.VOICE:
        return this._createVoiceResponse();
        
      case InputMode.HYBRID:
        return this._createHybridResponse(context);
        
      default:
        return this._createTextOnlyResponse();
    }
  }

  /**
   * Crée une configuration de réponse texte uniquement
   * @private
   */
  _createTextOnlyResponse() {
    return {
      mode: ResponseMode.TEXT_ONLY,
      generateAudio: false,
      useElevenLabs: false,
      useBrowserTTS: false,
      includeTextResponse: true,
      formatOptions: {
        includeMarkdown: true,
        includeEmojis: true,
        includeTables: true,
        optimizeForSpeech: false
      }
    };
  }

  /**
   * Crée une configuration de réponse vocale
   * @private
   */
  _createVoiceResponse(forced = false) {
    const useElevenLabs = this.options.enableElevenLabs && !!this.options.elevenLabsApiKey;
    
    return {
      mode: ResponseMode.VOICE_WITH_TEXT,
      generateAudio: true,
      useElevenLabs,
      useBrowserTTS: !useElevenLabs,
      includeTextResponse: true,
      formatOptions: {
        includeMarkdown: true,
        includeEmojis: true,
        includeTables: true,
        optimizeForSpeech: true,
        maxAudioLength: this.options.maxAudioLength
      },
      forced
    };
  }

  /**
   * Crée une configuration de réponse hybride
   * @private
   */
  _createHybridResponse(context) {
    const useElevenLabs = this.options.enableElevenLabs && !!this.options.elevenLabsApiKey;
    
    return {
      mode: ResponseMode.HYBRID,
      generateAudio: true,
      useElevenLabs,
      useBrowserTTS: !useElevenLabs,
      includeTextResponse: true,
      audioSummaryOnly: context.hasFileAttachment, // Juste résumé si fichier
      formatOptions: {
        includeMarkdown: true,
        includeEmojis: true,
        includeTables: true,
        optimizeForSpeech: true,
        maxAudioLength: 1000 // Plus court pour les résumés
      }
    };
  }

  /**
   * Traite une réponse selon le mode détecté
   * @param {Object} params - Paramètres de la réponse
   * @returns {Promise<Object>} Réponse traitée
   */
  async processResponse(params) {
    const { content, inputMode, voiceConfig = {} } = params;
    
    const responseMode = this.determineResponseMode({
      inputMode,
      userPreferences: params.userPreferences || {}
    });
    
    const result = {
      textContent: content,
      audioUrl: undefined,
      fallbackToTTS: false,
      error: undefined,
      mode: responseMode.mode
    };
    
    // Si pas de génération audio, retourner directement
    if (!responseMode.generateAudio) {
      return result;
    }
    
    // Générer l'audio avec ElevenLabs
    if (responseMode.useElevenLabs) {
      try {
        // Optimiser le texte pour la voix
        const cleanedText = this.voiceOptimizer.cleanForSpeech(content);
        const truncatedText = this.voiceOptimizer.truncateForVoice(cleanedText, {
          maxLength: responseMode.formatOptions.maxAudioLength,
          addContinuationHint: cleanedText.length > responseMode.formatOptions.maxAudioLength
        });
        
        // Appeler ElevenLabs
        result.audioUrl = await this._callElevenLabs(truncatedText, voiceConfig);
        
      } catch (error) {
        console.error('[ResponseModeManager] ElevenLabs error:', error);
        result.fallbackToTTS = true;
        result.error = error.message;
      }
    } else {
      result.fallbackToTTS = true;
    }
    
    return result;
  }

  /**
   * Appelle l'API ElevenLabs
   * @private
   */
  async _callElevenLabs(text, voiceConfig = {}) {
    const voiceId = voiceConfig.id || this.options.defaultVoiceId;
    const apiKey = this.options.elevenLabsApiKey;
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: voiceConfig.stability || 0.5,
          similarity_boost: voiceConfig.similarityBoost || 0.75,
          style: voiceConfig.style || 0.0,
          use_speaker_boost: true
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API Error: ${response.status}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    return `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`;
  }

  /**
   * Gère un message utilisateur complet
   * @param {Object} input - Input utilisateur
   * @param {string} responseContent - Contenu de la réponse
   * @returns {Promise<Object>} Résultat complet
   */
  async handleUserMessage(input, responseContent) {
    const inputMode = this.detectInputMode(input);
    const responseModeConfig = this.determineResponseMode({ inputMode });
    
    const response = await this.processResponse({
      content: responseContent,
      inputMode,
      voiceConfig: input.voiceConfig
    });
    
    return {
      inputMode,
      responseMode: responseModeConfig.mode,
      response
    };
  }

  /**
   * Retourne l'historique des modes
   * @returns {Array} Historique
   */
  getModeHistory() {
    return [...this.modeHistory];
  }

  /**
   * Retourne les statistiques de mode
   * @returns {Object} Statistiques
   */
  getModeStats() {
    const textCount = this.modeHistory.filter(h => h.mode === InputMode.TEXT).length;
    const voiceCount = this.modeHistory.filter(h => h.mode === InputMode.VOICE).length;
    const hybridCount = this.modeHistory.filter(h => h.mode === InputMode.HYBRID).length;
    
    return {
      textCount,
      voiceCount,
      hybridCount,
      total: this.modeHistory.length,
      dominantMode: textCount >= voiceCount ? InputMode.TEXT : InputMode.VOICE
    };
  }

  /**
   * Réinitialise l'historique
   */
  resetHistory() {
    this.modeHistory = [];
  }
}

export default ResponseModeManager;
