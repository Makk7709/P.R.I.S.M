import { config } from './config.js';
import { handleUserInstruction } from './backend/orchestrator.js';
// import { saveMemorySnapshot } from './backend/database.js';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Only use window.Conversation in browser environment
const _Conversation = isBrowser ? window.Conversation : null;

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.speaking = false;
    this.volume = 0;
    this.dataArray = null;
    this.sampleRate = config.AUDIO.SAMPLE_RATE;
    this.fftSize = config.AUDIO.FFT_SIZE;
    this.minVolume = config.AUDIO.MIN_VOLUME;
    this.maxVolume = config.AUDIO.MAX_VOLUME;
    this.noiseGate = config.AUDIO.PROCESSING.NOISE_GATE;
    this.compression = config.AUDIO.PROCESSING.COMPRESSION;
    this.equalizer = config.AUDIO.PROCESSING.EQUALIZER;
    this.conversation = null;
    this.retryCount = 0;
    this.isInitializing = false;
    this.audioQueue = [];
    this.isProcessing = false;
    this.ready = false;
    this.BYPASS_INIT = false;
    this.voiceSettings = {
      voiceId: config.ELEVENLABS.VOICE_ID,
      stability: config.ELEVENLABS.STABILITY,
      similarityBoost: config.ELEVENLABS.SIMILARITY_BOOST,
      style: config.ELEVENLABS.STYLE,
      useSpeakerBoost: config.ELEVENLABS.USE_SPEAKER_BOOST,
      speakingRate: config.ELEVENLABS.SPEAKING_RATE,
      pitch: config.ELEVENLABS.PITCH
    };
    this.openaiTimeout = 30000; // 30 seconds timeout for OpenAI calls
  }

  async init() {
    if (this.isInitializing) {
      return false;
    }
    this.isInitializing = true;
    try {
      if (this.BYPASS_INIT) {
        // In bypass mode, skip all initialization steps
        this.ready = true;
        this.isInitializing = false;
        console.log("[INIT] AudioManager ready (BYPASS mode)");
        return true;
      }

      // Initialize core audio features first
      try {
        await this.requestMicrophoneAccess();
        await this.initializeAudioContext();
      } catch (error) {
        console.warn("[INIT] Core audio initialization failed:", error);
        // Continue anyway to ensure basic functionality
      }

      // Try to initialize ElevenLabs with timeout
      try {
        await this.initializeElevenLabsAgent();
      } catch (error) {
        console.warn("[INIT] ElevenLabs initialization failed:", error);
        // Continue anyway - we'll fall back to standard TTS if needed
      }

      // Always mark as ready, even if some components failed
      this.ready = true;
      this.isInitializing = false;
      console.log("[INIT] AudioManager ready (with potential fallbacks)");
      return true;
    } catch (error) {
      this.isInitializing = false;
      console.error("[INIT] Critical initialization error:", error);
      // Still mark as ready to prevent UI blocking
      this.ready = true;
      return true;
    }
  }

  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      throw new Error('Web Audio API not supported');
    }
  }

  async requestMicrophoneAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after getting permission
    } catch {
      throw new Error(config.MESSAGES.ERROR.MICROPHONE);
    }
  }

  async initializeElevenLabsAgent() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.ELEVENLABS.ERROR_HANDLING.TIMEOUT);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/agents/${config.ELEVENLABS.AGENT_ID}`, {
        method: 'GET',
        headers: {
          'xi-api-key': config.ELEVENLABS.API_KEY
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to initialize ElevenLabs agent: ${response.statusText}`);
      }

      const agentData = await response.json();
      console.log("[INIT] ElevenLabs agent initialized:", agentData);
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.warn("[INIT] ElevenLabs agent initialization timed out");
      } else {
        console.warn("[INIT] ElevenLabs agent initialization failed:", error);
      }
      // Don't throw - let the caller handle the fallback
      return false;
    }
  }

  async generateSpeech(text) {
    if (!this.ready) {
      throw new Error('AudioManager not initialized');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.ELEVENLABS.ERROR_HANDLING.TIMEOUT);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceSettings.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': config.ELEVENLABS.API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: config.ELEVENLABS.MODEL_ID,
          voice_settings: this.voiceSettings
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Speech generation failed: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      this.audioQueue.push(audioUrl);
      
      if (!this.isProcessing) {
        this.processAudioQueue();
      }

      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Speech generation timeout');
      }
      if (config.ELEVENLABS.FALLBACK_TO_TTS) {
        console.warn('Falling back to standard TTS...');
        return this.generateStandardTTS(text);
      }
      throw error;
    }
  }

  // Fallback method for standard TTS
  async generateStandardTTS(text) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.ELEVENLABS.TIMEOUT);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${  this.voiceSettings.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': config.ELEVENLABS.API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: config.ELEVENLABS.MODEL_ID,
          voice_settings: {
            stability: config.ELEVENLABS.STABILITY,
            similarity_boost: config.ELEVENLABS.SIMILARITY_BOOST,
            style: config.ELEVENLABS.STYLE,
            use_speaker_boost: config.ELEVENLABS.USE_SPEAKER_BOOST,
            speaking_rate: this.voiceSettings.speakingRate,
            pitch: config.ELEVENLABS.PITCH
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erreur TTS standard (${response.status}): ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      this.audioQueue.push(audioUrl);
      
      if (!this.isProcessing) {
        this.processAudioQueue();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async processAudioQueue() {
    if (this.audioQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const audioUrl = this.audioQueue.shift();

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(
        await (await fetch(audioUrl)).arrayBuffer()
      );

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.processAudioQueue();
      };

      source.start(0);
    } catch (error) {
      console.error('Audio processing error:', error);
      this.processAudioQueue();
    }
  }

  getAnalyser() {
    return this.analyser;
  }

  getDataArray() {
    return this.dataArray;
  }

  handleError(error) {
    console.error('Audio error:', error);
    if (this.retryCount < config.ELEVENLABS.ERROR_HANDLING.MAX_RETRIES) {
      this.retryCount++;
      console.warn(`Retrying (${this.retryCount}/${config.ELEVENLABS.ERROR_HANDLING.MAX_RETRIES})...`);
      setTimeout(() => this.init(), config.ELEVENLABS.ERROR_HANDLING.RETRY_DELAY);
    } else {
      throw new Error(config.MESSAGES.ERROR.CONNECTION);
    }
  }

  async sendToWebhook(message) {
    try {
      const response = await fetch(config.WEBHOOK.URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Webhook error:', error);
      throw new Error(config.MESSAGES.ERROR.WEBHOOK);
    }
  }

  updateVoiceSettings(settings) {
    this.voiceSettings = {
      ...this.voiceSettings,
      ...settings
    };
  }

  async processUserInput(text) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.openaiTimeout);

      const response = await handleUserInstruction(text);
      clearTimeout(timeoutId);

      if (response.choices && response.choices[0].message.function_call) {
        const functionCall = response.choices[0].message.function_call;
        console.log(`[PRISM] Function selected: ${functionCall.name}`);
        console.log(`[PRISM] Arguments:`, JSON.parse(functionCall.arguments));

        // Process the function call
        const result = await this.processAction(response);
        return result;
      }

      return {
        type: 'message',
        content: response.choices[0].message.content
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('OpenAI API call timed out');
      }
      throw error;
    }
  }

  async processAction(response) {
    const message = response.choices[0].message;
    
    if (message.function_call) {
      const { name, arguments: argsJSON } = message.function_call;
      const args = JSON.parse(argsJSON || "{}");
      
      console.log("[PRISM] Fonction appelée:", name);
      console.log("[PRISM] Arguments:", args);

      try {
        switch (name) {
          case "generateMarketingCampaign":
            return await this.handleMarketingCampaign(args);
          case "analyzeFinancialStatus":
            return await this.handleFinancialAnalysis(args);
          case "composeClientEmail":
            return await this.handleEmailComposition(args);
          default:
            console.warn("[PRISM] Fonction inconnue reçue:", name);
            return {
              type: 'error',
              message: `Fonction non supportée: ${name}`
            };
        }
      } catch (error) {
        console.error("[PRISM] Erreur lors du traitement de l'action:", error);
        return {
          type: 'error',
          message: `Erreur lors du traitement de l'action: ${error.message}`
        };
      }
    }

    return {
      type: 'message',
      content: message.content
    };
  }

  async handleMarketingCampaign({ product, targetAudience }) {
    console.log(`[PRISM] Lancement campagne marketing pour ${product}...`);
    // Simuler une interaction avec le backend pour l'analyse
    const response = await handleUserInstruction(`Génère une campagne marketing pour ${product} ciblant ${targetAudience}.`);
    
    // Sauvegarder l'interaction dans la mémoire
    // await saveMemorySnapshot({
    //   type: "marketing_campaign",
    //   content: `Campagne pour ${product}`,
    //   metadata: {
    //     product,
    //     targetAudience,
    //     response,
    //     timestamp: new Date().toISOString()
    //   }
    // });
    
    return response;
  }

  async handleFinancialAnalysis({ revenue, expenses }) {
    console.log('[PRISM] Analyse financière en cours...');
    const response = await handleUserInstruction(`Analyse financière: revenus de ${revenue}, dépenses de ${expenses}.`);
    
    // Sauvegarder l'interaction
    // await saveMemorySnapshot({
    //   type: "financial_analysis",
    //   content: `Analyse: ${revenue} vs ${expenses}`,
    //   metadata: {
    //     revenue,
    //     expenses,
    //     response,
    //     timestamp: new Date().toISOString()
    //   }
    // });
    
    return response;
  }

  async handleEmailComposition({ clientName, product }) {
    console.log(`[PRISM] Rédaction d'email pour ${clientName}...`);
    const response = await handleUserInstruction(`Rédige un email pour ${clientName} concernant ${product}.`);
    
    // Sauvegarder l'interaction
    // await saveMemorySnapshot({
    //   type: "email_composition",
    //   content: `Email pour ${clientName}`,
    //   metadata: {
    //     clientName,
    //     product,
    //     response,
    //     timestamp: new Date().toISOString()
    //   }
    // });
    
    return response;
  }
}

export function initializeAudio() {
  const audioManager = new AudioManager();
  return audioManager.init();
} 