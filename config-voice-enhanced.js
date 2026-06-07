/**
 * Configuration vocale optimisée pour PRISM - Plus expressive et personnalisée
 */

export const ENHANCED_VOICE_CONFIG = {
  // Configuration ElevenLabs optimisée pour l'expressivité
  ELEVENLABS: {
    // Voix recommandées pour plus de personnalité
    VOICES: {
      // Voix masculine professionnelle mais chaleureuse
      PROFESSIONAL_MALE: {
        VOICE_ID: 'm5SBIR8kR76fbA5dP2rU', // Jean - Voix masculine française
        NAME: 'Jean Narration'
      },
      // Voix féminine énergique et engageante  
      ENERGETIC_FEMALE: {
        VOICE_ID: '21m00Tcm4TlvDq8ikWAM', // Rachel - Voix expressive
        NAME: 'Rachel Expressive'
      },
      // Voix masculine jeune et dynamique
      DYNAMIC_MALE: {
        VOICE_ID: 'ErXwobaYiN019PkySvjV', // Antoni - Voix dynamique
        NAME: 'Antoni Dynamic'
      },
      // Voix féminine douce mais confiante
      CONFIDENT_FEMALE: {
        VOICE_ID: 'EXAVITQu4vr4xnSDxMaL', // Bella - Voix confiante
        NAME: 'Bella Confident'
      }
    },

    // Paramètres optimisés pour l'expressivité
    VOICE_SETTINGS: {
      // Configuration par défaut - Plus expressive
      DEFAULT: {
        STABILITY: 0.35,           // Réduit pour plus de variabilité (0.5 → 0.35)
        SIMILARITY_BOOST: 0.85,    // Augmenté pour plus de fidélité (0.75 → 0.85)
        STYLE: 0.65,              // Augmenté pour plus d'expressivité (0.0 → 0.65)
        USE_SPEAKER_BOOST: true,   
        SPEAKING_RATE: 1.15,       // Légèrement plus rapide (1.0 → 1.15)
        PITCH: 0.1                 // Légère variation de pitch (0.0 → 0.1)
      },

      // Configuration pour mode énergique
      ENERGETIC: {
        STABILITY: 0.25,
        SIMILARITY_BOOST: 0.90,
        STYLE: 0.85,
        USE_SPEAKER_BOOST: true,
        SPEAKING_RATE: 1.25,
        PITCH: 0.15
      },

      // Configuration pour mode calme/réfléchi
      CONTEMPLATIVE: {
        STABILITY: 0.45,
        SIMILARITY_BOOST: 0.80,
        STYLE: 0.45,
        USE_SPEAKER_BOOST: true,
        SPEAKING_RATE: 0.95,
        PITCH: -0.05
      },

      // Configuration pour mode urgent/important
      URGENT: {
        STABILITY: 0.20,
        SIMILARITY_BOOST: 0.95,
        STYLE: 0.90,
        USE_SPEAKER_BOOST: true,
        SPEAKING_RATE: 1.35,
        PITCH: 0.20
      }
    },

    // Modèles vocaux pour différents types de contenu
    MODELS: {
      // Modèle multilingue pour plus de naturalité
      MULTILINGUAL: 'eleven_multilingual_v2',
      // Modèle turbo pour la rapidité
      TURBO: 'eleven_turbo_v2', 
      // Modèle monolingual original
      MONOLINGUAL: 'eleven_monolingual_v1'
    }
  },

  // Adaptation du contenu pour plus d'expressivité
  TEXT_ENHANCEMENT: {
    // Ajout d'émotions contextuelle
    EMOTIONS: {
      EXCITED: ['🎉', '✨', '🚀', '💫'],
      CONFIDENT: ['💪', '🎯', '✅', '🔥'],
      THOUGHTFUL: ['🤔', '💭', '🧠', '📊'],
      FRIENDLY: ['😊', '👋', '💡', '🌟'],
      URGENT: ['⚠️', '🚨', '⏰', '❗']
    },

    // Marqueurs de pause pour plus de naturel
    PAUSES: {
      SHORT: '...',           // Pause courte
      MEDIUM: '. . .',        // Pause moyenne  
      LONG: '. . . . .',      // Pause longue
      DRAMATIC: '... ... ...' // Pause dramatique
    },

    // Emphases vocales
    EMPHASIS: {
      STRONG: '**',           // Texte important
      WHISPER: '*',           // Texte en chuchotement
      LOUD: '***'             // Texte fort
    }
  },

  // Modulation selon le contexte de PRISM
  PRISM_MODES: {
    TECHNICAL: {
      voice: 'PROFESSIONAL_MALE',
      setting: 'DEFAULT',
      prefix: '🔧 ',
      style: 'précis et méthodique'
    },
    CREATIVE: {
      voice: 'ENERGETIC_FEMALE', 
      setting: 'ENERGETIC',
      prefix: '💡 ',
      style: 'inspiré et dynamique'
    },
    ANALYTICAL: {
      voice: 'CONFIDENT_FEMALE',
      setting: 'CONTEMPLATIVE', 
      prefix: '📊 ',
      style: 'réfléchi et structuré'
    },
    EMERGENCY: {
      voice: 'DYNAMIC_MALE',
      setting: 'URGENT',
      prefix: '🚨 ',
      style: 'urgent et direct'
    },
    FRIENDLY: {
      voice: 'PROFESSIONAL_MALE',
      setting: 'DEFAULT',
      prefix: '😊 ',
      style: 'chaleureux et accessible'
    }
  }
};

/**
 * Classe pour améliorer l'expressivité vocale de PRISM
 */
export class PRISMVoiceEnhancer {
  constructor() {
    this.currentMode = 'FRIENDLY';
    this.currentVoice = ENHANCED_VOICE_CONFIG.ELEVENLABS.VOICES.PROFESSIONAL_MALE;
    this.currentSettings = ENHANCED_VOICE_CONFIG.ELEVENLABS.VOICE_SETTINGS.DEFAULT;
  }

  /**
   * Analyse le contenu pour déterminer le mode vocal approprié
   */
  analyzeContentForMode(text, taskType = 'general') {
    const content = text.toLowerCase();

    // Détection d'urgence
    if (content.includes('urgent') || content.includes('erreur') || content.includes('problème')) {
      return 'EMERGENCY';
    }

    // Détection technique
    if (content.includes('code') || content.includes('API') || content.includes('config') || taskType === 'technical') {
      return 'TECHNICAL';
    }

    // Détection analytique
    if (content.includes('analyse') || content.includes('données') || content.includes('métrique') || taskType === 'analytics') {
      return 'ANALYTICAL';
    }

    // Détection créative
    if (content.includes('idée') || content.includes('innovation') || content.includes('créatif') || taskType === 'creative') {
      return 'CREATIVE';
    }

    // Mode amical par défaut
    return 'FRIENDLY';
  }

  /**
   * Améliore le texte pour plus d'expressivité
   */
  enhanceText(text, mode = null) {
    if (!mode) {
      mode = this.analyzeContentForMode(text);
    }

    const modeConfig = ENHANCED_VOICE_CONFIG.PRISM_MODES[mode];
    let enhancedText = text;

    // Ajouter le préfixe émotionnel
    enhancedText = modeConfig.prefix + enhancedText;

    // Ajouter des pauses naturelles
    enhancedText = enhancedText.replaceAll(/\. /g, '. ... ');
    enhancedText = enhancedText.replaceAll(/! /g, '! .. ');
    enhancedText = enhancedText.replaceAll(/\? /g, '? .. ');

    // Ajouter de l'emphase pour les mots importants
    enhancedText = enhancedText.replaceAll(/PRISM/g, '**PRISM**');
    enhancedText = enhancedText.replaceAll(/important/gi, '**important**');
    enhancedText = enhancedText.replaceAll(/critiq/gi, '**critiq**');

    return {
      text: enhancedText,
      mode: mode,
      voice: ENHANCED_VOICE_CONFIG.ELEVENLABS.VOICES[modeConfig.voice],
      settings: ENHANCED_VOICE_CONFIG.ELEVENLABS.VOICE_SETTINGS[modeConfig.setting]
    };
  }

  /**
   * Génère la configuration ElevenLabs optimisée
   */
  getOptimizedVoiceConfig(text, _taskType = 'general') {
    const enhanced = this.enhanceText(text, null);
    
    return {
      voiceId: enhanced.voice.VOICE_ID,
      text: enhanced.text,
      voice_settings: {
        stability: enhanced.settings.STABILITY,
        similarity_boost: enhanced.settings.SIMILARITY_BOOST,
        style: enhanced.settings.STYLE,
        use_speaker_boost: enhanced.settings.USE_SPEAKER_BOOST,
        speaking_rate: enhanced.settings.SPEAKING_RATE,
        pitch: enhanced.settings.PITCH
      },
      model_id: ENHANCED_VOICE_CONFIG.ELEVENLABS.MODELS.MULTILINGUAL,
      metadata: {
        mode: enhanced.mode,
        voiceName: enhanced.voice.NAME
      }
    };
  }
}

export default ENHANCED_VOICE_CONFIG; 