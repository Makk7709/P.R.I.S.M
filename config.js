/**
 * Configuration globale de PRISM
 */

export const config = {
  // Modes d'exécution
  modes: {
    TEST: 'TEST',
    PROD: 'PROD'
  },

  // Configuration du Self-Improvement Engine
  selfImprovement: {
    batchSize: 50,
    responseTimeThreshold: 5000,
    errorRateThreshold: 0.1,
    successRateThreshold: 0.9,
    maxRecoveryAttempts: 3
  },

  // Configuration des modèles
  models: {
    default: 'gpt-3.5-turbo',
    fallback: 'claude-3-opus',
    alternatives: ['perplexity']
  },

  // Configuration des logs
  logging: {
    level: 'info',
    directory: 'logs',
    selfImprovementDir: 'selfimprovement',
    files: {
      analysis: 'analysis.log',
      batchAnalysis: 'batch_analysis.log',
      adjustments: 'adjustments.log',
      errors: 'errors.log'
    }
  },

  // Configuration de la sécurité
  security: {
    maxRetries: 3,
    timeoutMs: 30000,
    rateLimitPerMinute: 100
  },

  // Configuration de l'application P.R.I.S.M
  CONFIG: {
    // Configuration de l'agent
    AGENT: {
      ID: 'PH3zu8YoKkawQT5H3tB8',
      VOICE_ID: 'default',
      STABILITY: 0.5,
      SIMILARITY_BOOST: 0.75
    },

    // Configuration des modèles IA
    MODELS: {
      OPENAI: {
        API_KEY: process.env.OPENAI_API_KEY,
        MODEL: 'gpt-4.1',
        TIMEOUT: 30000,
        MAX_RETRIES: 3
      },
      ANTHROPIC: {
        API_KEY: process.env.ANTHROPIC_API_KEY,
        MODEL: 'claude-3-sonnet-20240229',
        TIMEOUT: 30000,
        MAX_RETRIES: 3
      },
      PERPLEXITY: {
        API_KEY: process.env.PERPLEXITY_API_KEY,
        MODEL: 'mixtral-8x7b-instruct',
        TIMEOUT: 30000,
        MAX_RETRIES: 3
      }
    },

    // Configuration ElevenLabs
    ELEVENLABS: {
      API_KEY: process.env.ELEVENLABS_API_KEY || 'ta_clef_api_ici', // ✨ Utilise la vraie clé d'environnement
      VOICE_ID: 'm5SBIR8kR76fbA5dP2rU', // Jean - Voix masculine française (fonctionne)
      AGENT_ID: 'PH3zu8YoKkawQT5H3tB8', // ID de votre agent vocal
      MODEL_ID: 'eleven_multilingual_v2', // ✨ CORRECTION: Revenir au modèle original
      STABILITY: 0.35, // ✨ CORRECTION: Paramètres originaux pour Jean
      SIMILARITY_BOOST: 0.85, // ✨ CORRECTION: Paramètres originaux
      STYLE: 0.0, // ✨ Désactivé pour éviter les erreurs 500
      USE_SPEAKER_BOOST: true,
      SPEAKING_RATE: 1.0, // ✨ Vitesse normale pour Jean
      PITCH: 0.0, // ✨ Pitch normal
      RETRY_ATTEMPTS: 3,
      TIMEOUT: 15000, // ✨ CORRECTION: Augmenté de 8s à 15s pour éviter les timeouts
      MAX_TEXT_LENGTH: 1000, // ✨ GARDER: Limite augmentée pour texte complet
      FALLBACK_TO_TTS: true,
      // ✨ Vraies voix ElevenLabs disponibles dans notre tier (premade)
      VOICES: {
        BILL: 'pqHfZKP75CvOlQylNhV4',       // Voix masculine principale (multilingue)
        BRIAN: 'nPczCjzI2devNBz1zQrb',      // Voix masculine alternative
        ARIA: '9BWtsMINqrJLrRacOk9x',       // Féminine multilingue
        SARAH: 'EXAVITQu4vr4xnSDxMaL',      // Féminine professionnelle
        CHARLOTTE: 'XB0fDUnXU5powFXDhCwa',  // Féminine énergique
        ALICE: 'Xb7hH8MSUJpSbSDYk0k2',      // Féminine britannique
        DANIEL: 'onwK4e9ZLuTAKqWW03F9',     // Masculine britannique
        CHRIS: 'iP95p4xoKVk53GoZ742B'       // Masculine décontractée
      },
      // ✨ Paramètres adaptatifs selon le contexte
      ADAPTIVE_SETTINGS: {
        ENERGETIC: { STABILITY: 0.25, STYLE: 0.85, SPEAKING_RATE: 1.25 },
        CONTEMPLATIVE: { STABILITY: 0.45, STYLE: 0.45, SPEAKING_RATE: 0.95 },
        URGENT: { STABILITY: 0.20, STYLE: 0.90, SPEAKING_RATE: 1.35 }
      },
      ERROR_HANDLING: {
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        TIMEOUT: 15000
      }
    },

    // Configuration du webhook
    WEBHOOK: {
      URL: 'http://ec2-13-61-142-218.eu-north-1.compute.amazonaws.com:5678/webhook/prism-agent',
      TIMEOUT: 5000,
      RETRY_ATTEMPTS: 3
    },

    // Configuration des particules
    PARTICLES: {
      COUNT: 3000,
      MOUTH_THRESHOLD: 1,
      MOUTH_DEPTH: -2,
      MOUTH_OPENING_FACTOR: 1.5,
      LERP_SPEED: {
        SPEAKING: 0.08,
        IDLE: 0.04
      },
      ANIMATION: {
        ROTATION_SPEED: 6e-4,
        MOVEMENT_SPEED: 4e-4
      },
      EFFECTS: {
        WAVE: {
          AMPLITUDE: 1.0,
          FREQUENCY: 1.0
        },
        PULSE: {
          INTENSITY: 1.0,
          SPEED: 1.0
        },
        SPIRAL: {
          RADIUS: 1.0,
          SPEED: 1.0
        }
      }
    },

    // Configuration de l'interface
    UI: {
      FADE_DURATION: 300,
      STATUS_DURATION: 3000,
      ERROR_DURATION: 5000,
      LOADING_DURATION: 2000,
      THEMES: {
        LIGHT: {
          PRIMARY: '#3B82F6',
          ACCENT: '#60A5FA',
          BG: '#F3F4F6',
          TEXT: '#1F2937'
        },
        DARK: {
          PRIMARY: '#60A5FA',
          ACCENT: '#93C5FD',
          BG: '#1F2937',
          TEXT: '#F3F4F6'
        }
      },
      ANIMATIONS: {
        HEARTBEAT: {
          DURATION: 5000,
          OPACITY: [0.8, 1]
        },
        TRANSITIONS: {
          DURATION: 300,
          EASING: 'ease-in-out'
        },
        FEEDBACK: {
          DURATION: 200,
          SCALE: [1, 1.1, 1]
        }
      },
      UI_MODE: process.env.PRISM_UI_MODE || 'standard', // 'standard' ou 'corporate'
      INTERFACE: {
        EMOJIS_ENABLED: process.env.PRISM_UI_MODE !== 'corporate', // Désactivés en mode corporate
        PROFESSIONAL_BRANDING: process.env.PRISM_UI_MODE === 'corporate',
        DEFAULT_WELCOME_MESSAGE: process.env.PRISM_UI_MODE === 'corporate' 
          ? "Welcome! I am PRISM, your professional AI assistant. How may I assist you with your business needs today?"
          : "Bonjour ! Je suis Prism, votre assistant intelligent. Comment puis-je vous aider aujourd'hui ?",
        CORPORATE_LANDING_PAGE: process.env.PRISM_UI_MODE === 'corporate' ? '/index-corporate.html' : '/index.html',
        MAIN_INTERFACE: process.env.PRISM_UI_MODE === 'corporate' 
          ? '/ui/prismVoiceChatV2-Corporate.html' 
          : '/ui/prismVoiceChatV2.html'
      }
    },

    // Configuration de l'audio
    AUDIO: {
      SAMPLE_RATE: 44100,
      FFT_SIZE: 256,
      MIN_VOLUME: 0.1,
      MAX_VOLUME: 1.0,
      PROCESSING: {
        NOISE_GATE: {
          THRESHOLD: -50,
          ATTACK: 0.01,
          RELEASE: 0.1
        },
        COMPRESSION: {
          THRESHOLD: -20,
          RATIO: 4,
          ATTACK: 0.003,
          RELEASE: 0.25
        },
        EQUALIZER: {
          BANDS: [
            { FREQUENCY: 60, GAIN: 0 },
            { FREQUENCY: 170, GAIN: 0 },
            { FREQUENCY: 310, GAIN: 0 },
            { FREQUENCY: 600, GAIN: 0 },
            { FREQUENCY: 1000, GAIN: 0 },
            { FREQUENCY: 3000, GAIN: 0 },
            { FREQUENCY: 6000, GAIN: 0 },
            { FREQUENCY: 12000, GAIN: 0 },
            { FREQUENCY: 14000, GAIN: 0 },
            { FREQUENCY: 16000, GAIN: 0 }
          ]
        }
      }
    },

    // Configuration des assets
    ASSETS: {
      FACE_MODEL: './assets/face_lowpoly.ply',
      FACE_MODEL_FALLBACK: 'https://threejs.org/examples/models/ply/ascii/dolphins.ply',
      PARTICLE_TEXTURE: 'https://threejs.org/examples/textures/sprites/disc.png',
      FONTS: {
        PRIMARY: 'Orbitron',
        WEIGHTS: [400, 500, 600, 700, 800, 900]
      }
    },

    // Configuration des messages
    MESSAGES: {
      LOADING: {
        INIT: 'Initialisation de l\'application...',
        FACE: 'Chargement du modèle facial...',
        MICROPHONE: 'Demande d\'accès au microphone...',
        CONNECTION: 'Connexion à P.R.I.S.M...',
        READY: 'Application prête'
      },
      ERROR: {
        MICROPHONE: "Permission micro refusée. Autorisez l'accès au micro dans vos paramètres.",
        FACE: 'Erreur lors du chargement du modèle facial',
        CONNECTION: 'Erreur de connexion à P.R.I.S.M',
        WEBHOOK: 'Erreur de communication avec le serveur'
      },
      STATUS: {
        WAITING: 'En attente de votre message...',
        SPEAKING: 'P.R.I.S.M parle...',
        SENDING: 'Envoi du message...',
        SENT: 'Message envoyé'
      }
    }
  }
};

export const CONFIG = config.CONFIG; 