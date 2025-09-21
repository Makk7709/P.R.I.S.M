/**
 * PRISM Voice Integration - Module d'intégration analyse vocale
 * Intègre l'analyse prosodique et sentimentale avec le système PRISM existant
 */

import { VoiceAnalyzer } from './VoiceAnalyzer.js';
import { VoiceSentimentDetector } from './VoiceSentimentDetector.js';
import { VoicePersonalityEnhancer } from '../../../backend/voicePersonalityEnhancer.js';

export class VoiceIntegration {
  constructor(config = {}) {
    this.config = {
      enableRealTimeAnalysis: config.enableRealTimeAnalysis || true,
      analysisInterval: config.analysisInterval || 100, // ms
      enableSentimentDetection: config.enableSentimentDetection || true,
      enableProsodyAnalysis: config.enableProsodyAnalysis || true,
      enablePersonalityEnhancement: config.enablePersonalityEnhancement || true,
      ...config
    };
    
    this.analyzer = new VoiceAnalyzer(config.analyzerConfig);
    this.sentimentDetector = new VoiceSentimentDetector(config.sentimentConfig);
    this.personalityEnhancer = new VoicePersonalityEnhancer();
    
    this.isAnalyzing = false;
    this.analysisTimer = null;
    this.lastAnalysis = null;
    this.analysisBuffer = [];
    
    this.eventListeners = new Map();
  }

  /**
   * Initialise l'intégration vocale
   * @returns {Promise<boolean>} Succès de l'initialisation
   */
  async initialize() {
    try {
      console.log('[VoiceIntegration] Initialisation...');
      
      // Vérifier les dépendances
      if (!this.analyzer || !this.sentimentDetector) {
        throw new Error('Modules d\'analyse vocale non disponibles');
      }
      
      // Initialiser l'analyse en temps réel si activée
      if (this.config.enableRealTimeAnalysis) {
        await this.startRealTimeAnalysis();
      }
      
      console.log('[VoiceIntegration] Initialisation terminée');
      return true;
    } catch (error) {
      console.error('[VoiceIntegration] Erreur initialisation:', error);
      return false;
    }
  }

  /**
   * Démarre l'analyse en temps réel
   */
  async startRealTimeAnalysis() {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    console.log('[VoiceIntegration] Démarrage analyse temps réel');
    
    this.analysisTimer = setInterval(() => {
      this.processAnalysisBuffer();
    }, this.config.analysisInterval);
  }

  /**
   * Arrête l'analyse en temps réel
   */
  stopRealTimeAnalysis() {
    if (!this.isAnalyzing) return;
    
    this.isAnalyzing = false;
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    
    console.log('[VoiceIntegration] Arrêt analyse temps réel');
  }

  /**
   * Ajoute des données audio au buffer d'analyse
   * @param {Float32Array} audioData - Données audio
   * @param {Object} metadata - Métadonnées associées
   */
  addAudioData(audioData, metadata = {}) {
    if (!this.config.enableRealTimeAnalysis) return;
    
    this.analysisBuffer.push({
      data: audioData,
      metadata: {
        timestamp: Date.now(),
        ...metadata
      }
    });
    
    // Limiter la taille du buffer
    if (this.analysisBuffer.length > 100) {
      this.analysisBuffer.shift();
    }
  }

  /**
   * Traite le buffer d'analyse
   */
  processAnalysisBuffer() {
    if (this.analysisBuffer.length === 0) return;
    
    try {
      // Prendre le dernier échantillon
      const sample = this.analysisBuffer.pop();
      
      // Analyser les caractéristiques prosodiques
      let prosody = null;
      if (this.config.enableProsodyAnalysis) {
        prosody = this.analyzer.analyzeProsody(sample.data);
      }
      
      // Détecter l'émotion
      let emotion = null;
      if (this.config.enableSentimentDetection && prosody) {
        emotion = this.sentimentDetector.detectEmotionFromProsody(prosody);
      }
      
      // Créer l'analyse complète
      const analysis = {
        timestamp: Date.now(),
        prosody,
        emotion,
        metadata: sample.metadata
      };
      
      this.lastAnalysis = analysis;
      
      // Déclencher les événements
      this.emit('analysis', analysis);
      
      if (emotion) {
        this.emit('emotion', emotion);
      }
      
    } catch (error) {
      console.warn('[VoiceIntegration] Erreur traitement buffer:', error);
    }
  }

  /**
   * Analyse un échantillon audio complet avec texte associé
   * @param {Float32Array} audioData - Données audio
   * @param {string} text - Texte associé
   * @param {Object} metadata - Métadonnées
   * @returns {Object} Analyse complète
   */
  analyzeComplete(audioData, text = '', metadata = {}) {
    try {
      let prosody = null;
      let sentiment = null;
      let emotion = null;
      
      // Analyse prosodique
      if (this.config.enableProsodyAnalysis) {
        prosody = this.analyzer.analyzeProsody(audioData);
      }
      
      // Analyse sentimentale
      if (this.config.enableSentimentDetection) {
        if (prosody && text) {
          sentiment = this.analyzer.analyzeSentiment(prosody, text);
          emotion = this.sentimentDetector.detectHybridEmotion(prosody, text);
        } else if (prosody) {
          emotion = this.sentimentDetector.detectEmotionFromProsody(prosody);
        } else if (text) {
          emotion = this.sentimentDetector.detectEmotionFromText(text);
        }
      }
      
      // Amélioration de personnalité
      let enhancedResponse = null;
      if (this.config.enablePersonalityEnhancement && text) {
        enhancedResponse = this.personalityEnhancer.enhanceForVoice({
          content: text
        }, 'general', {
          emotion: emotion?.emotion,
          prosody,
          sentiment: sentiment?.score
        });
      }
      
      const completeAnalysis = {
        timestamp: Date.now(),
        prosody,
        sentiment,
        emotion,
        enhancedResponse,
        metadata: {
          audioLength: audioData ? audioData.length : 0,
          textLength: text.length,
          ...metadata
        }
      };
      
      // Déclencher événement
      this.emit('completeAnalysis', completeAnalysis);
      
      return completeAnalysis;
    } catch (error) {
      console.error('[VoiceIntegration] Erreur analyse complète:', error);
      return {
        timestamp: Date.now(),
        error: error.message,
        metadata
      };
    }
  }

  /**
   * Intègre l'analyse vocale avec une réponse PRISM
   * @param {Object} prismResponse - Réponse du système PRISM
   * @param {Float32Array} audioData - Données audio associées (optionnel)
   * @returns {Object} Réponse enrichie
   */
  integrateWithPrismResponse(prismResponse, audioData = null) {
    try {
      let enhancedResponse = prismResponse;
      
      // Extraire le texte de la réponse
      const text = this.extractTextFromResponse(prismResponse);
      
      // Analyser si données audio disponibles
      if (audioData && this.config.enableProsodyAnalysis) {
        const prosody = this.analyzer.analyzeProsody(audioData);
        
        // Détecter émotion utilisateur
        const userEmotion = this.sentimentDetector.detectEmotionFromProsody(prosody);
        
        // Adapter la réponse selon l'émotion détectée
        enhancedResponse = this.adaptResponseToEmotion(prismResponse, userEmotion);
      }
      
      // Améliorer avec personnalité vocale
      if (this.config.enablePersonalityEnhancement) {
        enhancedResponse = this.personalityEnhancer.enhanceForVoice(
          enhancedResponse, 
          'general',
          {
            userEmotion: audioData ? this.lastAnalysis?.emotion : null,
            originalResponse: prismResponse
          }
        );
      }
      
      // Ajouter métadonnées d'analyse vocale
      enhancedResponse.voiceAnalysis = {
        timestamp: Date.now(),
        prosody: audioData ? this.lastAnalysis?.prosody : null,
        emotion: audioData ? this.lastAnalysis?.emotion : null,
        integration: true
      };
      
      return enhancedResponse;
    } catch (error) {
      console.warn('[VoiceIntegration] Erreur intégration PRISM:', error);
      return prismResponse;
    }
  }

  /**
   * Adapte une réponse selon l'émotion détectée
   * @param {Object} response - Réponse originale
   * @param {Object} emotion - Émotion détectée
   * @returns {Object} Réponse adaptée
   */
  adaptResponseToEmotion(response, emotion) {
    if (!emotion || emotion.confidence < 0.3) return response;
    
    try {
      const adaptedResponse = { ...response };
      const text = this.extractTextFromResponse(response);
      
      switch (emotion.emotion) {
        case 'joy':
          adaptedResponse.emotionAdaptation = {
            tone: 'enthusiastic',
            modifiers: ['🎉', '✨'],
            energy: 'high'
          };
          break;
          
        case 'sadness':
          adaptedResponse.emotionAdaptation = {
            tone: 'empathetic',
            modifiers: ['💙', '🤗'],
            energy: 'calm'
          };
          break;
          
        case 'anger':
          adaptedResponse.emotionAdaptation = {
            tone: 'calming',
            modifiers: ['🕊️', '💙'],
            energy: 'steady'
          };
          break;
          
        case 'fear':
          adaptedResponse.emotionAdaptation = {
            tone: 'reassuring',
            modifiers: ['🛡️', '💪'],
            energy: 'stable'
          };
          break;
          
        case 'surprise':
          adaptedResponse.emotionAdaptation = {
            tone: 'engaging',
            modifiers: ['🤩', '💡'],
            energy: 'dynamic'
          };
          break;
          
        default:
          adaptedResponse.emotionAdaptation = {
            tone: 'neutral',
            modifiers: ['💡'],
            energy: 'balanced'
          };
      }
      
      return adaptedResponse;
    } catch (error) {
      console.warn('[VoiceIntegration] Erreur adaptation émotion:', error);
      return response;
    }
  }

  /**
   * Extrait le texte d'une réponse PRISM
   * @param {Object} response - Réponse PRISM
   * @returns {string} Texte extrait
   */
  extractTextFromResponse(response) {
    if (typeof response === 'string') return response;
    if (response.choices?.[0]?.message?.content) return response.choices[0].message.content;
    if (response.content?.[0]?.text) return response.content[0].text;
    if (response.content) return response.content;
    if (response.enhancedText) return response.enhancedText;
    return '';
  }

  /**
   * Obtient les statistiques d'analyse
   * @returns {Object} Statistiques complètes
   */
  getAnalysisStats() {
    const analyzerHistory = this.analyzer.getHistory();
    const emotionHistory = this.sentimentDetector.getEmotionHistory();
    
    return {
      timestamp: Date.now(),
      isAnalyzing: this.isAnalyzing,
      bufferSize: this.analysisBuffer.length,
      lastAnalysis: this.lastAnalysis,
      analyzerStats: {
        pitchHistoryLength: analyzerHistory.pitchHistory.length,
        volumeHistoryLength: analyzerHistory.volumeHistory.length,
        sentimentHistoryLength: analyzerHistory.sentimentHistory.length
      },
      emotionStats: {
        emotionHistoryLength: emotionHistory.length,
        recentEmotions: emotionHistory.slice(-10).map(e => e.emotion)
      },
      config: this.config
    };
  }

  /**
   * Réinitialise tous les modules
   */
  reset() {
    this.stopRealTimeAnalysis();
    this.analyzer.resetHistory();
    this.sentimentDetector.resetHistory();
    this.analysisBuffer = [];
    this.lastAnalysis = null;
    console.log('[VoiceIntegration] Réinitialisation terminée');
  }

  /**
   * Ajoute un écouteur d'événement
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction de callback
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Supprime un écouteur d'événement
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction de callback
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Déclenche un événement
   * @param {string} event - Nom de l'événement
   * @param {*} data - Données à passer
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn(`[VoiceIntegration] Erreur callback ${event}:`, error);
        }
      });
    }
  }

  /**
   * Configure les paramètres d'analyse
   * @param {Object} newConfig - Nouvelle configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Redémarrer l'analyse si nécessaire
    if (newConfig.enableRealTimeAnalysis !== undefined) {
      if (newConfig.enableRealTimeAnalysis && !this.isAnalyzing) {
        this.startRealTimeAnalysis();
      } else if (!newConfig.enableRealTimeAnalysis && this.isAnalyzing) {
        this.stopRealTimeAnalysis();
      }
    }
    
    console.log('[VoiceIntegration] Configuration mise à jour:', this.config);
  }

  /**
   * Exporte les données d'analyse pour debugging
   * @returns {Object} Données exportées
   */
  exportAnalysisData() {
    return {
      timestamp: Date.now(),
      config: this.config,
      analyzerHistory: this.analyzer.getHistory(),
      emotionHistory: this.sentimentDetector.getEmotionHistory(),
      lastAnalysis: this.lastAnalysis,
      stats: this.getAnalysisStats()
    };
  }
}

export default VoiceIntegration;
