// Mock de la configuration PRISM pour les tests
export const CONFIG = {
  audio: {
    sampleRate: 44100,
    bufferSize: 2048,
    channels: 1,
    bitDepth: 16,
    fftSize: 2048,
    elevenLabsApiKey: 'test-api-key'
  },
  ui: {
    adaptiveCycler: {
      defaultVisibility: true,
      compactMode: false,
      animationDuration: 300
    },
    insightCenter: {
      defaultVisibility: true,
      maxTimelineEvents: 100,
      refreshInterval: 1000
    }
  },
  performance: {
    maxResponseTime: 100,
    maxAudioLatency: 500,
    maxAnimationDuration: 300
  },
  ELEVENLABS: {
    API_KEY: 'test-api-key',
    VOICE_ID: 'test-voice-id',
    AGENT_ID: 'test-agent-id',
    SPEAKING_RATE: 1,
    STYLE: 'default',
    USE_SPEAKER_BOOST: true,
    RETRY_ATTEMPTS: 3,
    TIMEOUT: 1000,
    FALLBACK_TO_TTS: true
  },
  AGENT: {
    ID: 'test-agent',
    VOICE_ID: 'test-voice-id',
    STABILITY: 0.5,
    SIMILARITY_BOOST: 0.5
  },
  AUDIO: {
    FFT_SIZE: 2048,
    SAMPLE_RATE: 44100,
    BUFFER_SIZE: 2048,
    CHANNELS: 1
  },
  MESSAGES: {
    ERROR: {
      MICROPHONE: 'Erreur d\'accès au microphone',
      CONNECTION: 'Erreur de connexion',
      TIMEOUT: 'Délai d\'attente dépassé'
    }
  },
  WEBHOOK: {
    URL: 'http://localhost:3000/webhook'
  },
  PARTICLES: {
    COUNT: 1000,
    ANIMATION: {
      MOVEMENT_SPEED: 0.01,
      ROTATION_SPEED: 0.001
    }
  }
}; 