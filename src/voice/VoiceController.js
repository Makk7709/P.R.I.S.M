/**
 * PRISM VoiceController - Contrôleur Audio Centralisé
 * 
 * Machine à états pour la gestion audio complète.
 * Intègre queue, mutex, tracking des messages.
 * Point d'entrée unique pour toutes les opérations audio.
 * 
 * @author PRISM Team
 * @version 1.0.0
 */

import { AudioMutex } from './AudioMutex.js';
import { MessageTracker } from './MessageTracker.js';
import { AudioQueue } from './AudioQueue.js';

/**
 * États possibles du contrôleur audio
 * @enum {string}
 */
export const AudioState = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  ERROR: 'ERROR'
};

/**
 * Événements émis par le contrôleur
 * @enum {string}
 */
export const AudioEvent = {
  STATE_CHANGE: 'stateChange',
  PLAY_START: 'playStart',
  PLAY_END: 'playEnd',
  PAUSE: 'pause',
  RESUME: 'resume',
  STOP: 'stop',
  SKIP: 'skip',
  ERROR: 'error',
  QUEUE_CHANGE: 'queueChange'
};

/**
 * @typedef {Object} VoiceControllerConfig
 * @property {boolean} [enableQueue=true] - Activer la file d'attente
 * @property {number} [maxQueueSize=20] - Taille max de la queue
 * @property {boolean} [autoPlay=true] - Lecture automatique
 * @property {number} [errorRecoveryDelay=2000] - Délai avant retour à IDLE après erreur
 * @property {MessageTracker} [messageTracker] - Instance de MessageTracker existante
 */

export class VoiceController {
  /**
   * @param {VoiceControllerConfig} config
   */
  constructor(config = {}) {
    this.config = {
      enableQueue: config.enableQueue !== false,
      maxQueueSize: config.maxQueueSize || 20,
      autoPlay: config.autoPlay !== false,
      errorRecoveryDelay: config.errorRecoveryDelay || 2000
    };
    
    /** @type {AudioState} */
    this._state = AudioState.IDLE;
    
    /** @type {string|null} */
    this._currentMessageId = null;
    
    /** @type {HTMLAudioElement|null} */
    this._currentAudio = null;
    
    /** @type {boolean} */
    this._destroyed = false;
    
    // Composants internes
    this._mutex = new AudioMutex({ timeout: 60000 });
    this._tracker = config.messageTracker || new MessageTracker();
    this._queue = new AudioQueue({ 
      maxSize: this.config.maxQueueSize,
      enablePriority: true
    });
    
    /** @type {Map<string, Function[]>} */
    this._listeners = new Map();
    
    /** @type {Map<string, Function>} */
    this._onceListeners = new Map();
    
    /** @type {NodeJS.Timeout|null} */
    this._errorRecoveryTimeout = null;
    
    // Bind des méthodes pour les event handlers
    this._handleAudioEnded = this._handleAudioEnded.bind(this);
    this._handleAudioError = this._handleAudioError.bind(this);
    this._handleAudioPlay = this._handleAudioPlay.bind(this);
    this._handleAudioLoadStart = this._handleAudioLoadStart.bind(this);
  }

  // ============ API PUBLIQUE ============

  /**
   * Retourne l'état actuel
   * @returns {AudioState}
   */
  getState() {
    return this._state;
  }

  /**
   * Retourne l'ID du message en cours de lecture
   * @returns {string|null}
   */
  getCurrentMessageId() {
    return this._currentMessageId;
  }

  /**
   * Retourne la taille de la queue
   * @returns {number}
   */
  getQueueLength() {
    return this._queue.size();
  }

  /**
   * Vérifie si autoPlay est activé
   * @returns {boolean}
   */
  isAutoPlayEnabled() {
    return this.config.autoPlay;
  }

  /**
   * Retourne la taille max de la queue
   * @returns {number}
   */
  getMaxQueueSize() {
    return this.config.maxQueueSize;
  }

  /**
   * Retourne le nombre de listeners pour un événement
   * @param {string} event
   * @returns {number}
   */
  getListenerCount(event) {
    const listeners = this._listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Retourne la queue courante
   * @returns {Array}
   */
  getQueue() {
    return this._queue.toArray();
  }

  /**
   * Ajoute un audio à la queue
   * @param {string} audioUrl - URL du blob audio
   * @param {string} messageId - ID unique du message
   * @param {Object} [metadata] - Métadonnées additionnelles
   * @returns {Promise<boolean>}
   */
  async enqueue(audioUrl, messageId, metadata = {}) {
    if (this._destroyed) {
      console.warn('[VoiceController] Controller is destroyed');
      return false;
    }
    
    // Vérifier déduplication
    if (!this._tracker.shouldPlay(messageId)) {
      console.log(`[VoiceController] Message ${messageId} already played, skipping`);
      return false;
    }
    
    // Ajouter à la queue
    this._queue.enqueue({
      messageId,
      audioUrl,
      priority: metadata.priority || 0,
      metadata
    });
    
    this._emit(AudioEvent.QUEUE_CHANGE, { action: 'enqueue', messageId });
    
    // Démarrer la lecture si autoPlay et rien en cours
    if (this.config.autoPlay && this._state === AudioState.IDLE) {
      await this._playNext();
    }
    
    return true;
  }

  /**
   * Ajoute un audio prioritaire (interrompt l'actuel)
   * @param {string} audioUrl
   * @param {string} messageId
   * @param {number} priority
   * @returns {Promise<boolean>}
   */
  async enqueuePriority(audioUrl, messageId, priority = 10) {
    if (this._destroyed) return false;
    
    // Arrêter la lecture actuelle
    if (this._state === AudioState.PLAYING) {
      this._stopCurrentAudio();
    }
    
    // Insérer en priorité
    this._queue.enqueue({
      messageId,
      audioUrl,
      priority
    });
    
    // Démarrer immédiatement
    await this._playNext();
    
    return true;
  }

  /**
   * Démarre ou reprend la lecture
   */
  play() {
    if (this._destroyed) return;
    
    if (this._state === AudioState.PAUSED && this._currentAudio) {
      this._currentAudio.play();
      this._setState(AudioState.PLAYING);
      this._emit(AudioEvent.RESUME);
    } else if (this._state === AudioState.IDLE) {
      this._playNext();
    }
  }

  /**
   * Met en pause la lecture
   */
  pause() {
    if (this._destroyed) return;
    
    if (this._state === AudioState.PLAYING && this._currentAudio) {
      this._currentAudio.pause();
      this._setState(AudioState.PAUSED);
      this._emit(AudioEvent.PAUSE);
    }
  }

  /**
   * Reprend la lecture après pause
   */
  resume() {
    if (this._destroyed) return;
    
    if (this._state === AudioState.PAUSED && this._currentAudio) {
      this._currentAudio.play();
      this._setState(AudioState.PLAYING);
      this._emit(AudioEvent.RESUME);
    }
  }

  /**
   * Arrête la lecture et vide la queue
   */
  stop() {
    if (this._destroyed) return;
    
    this._stopCurrentAudio();
    this._queue.clear();
    this._currentMessageId = null;
    this._setState(AudioState.IDLE);
    this._emit(AudioEvent.STOP);
  }

  /**
   * Passe au message suivant dans la queue
   */
  skip() {
    if (this._destroyed) return;
    
    this._emit(AudioEvent.SKIP, { skippedId: this._currentMessageId });
    this._stopCurrentAudio();
    this._playNext();
  }

  /**
   * Vide la queue sans affecter la lecture en cours
   */
  clearQueue() {
    this._queue.clear();
    this._emit(AudioEvent.QUEUE_CHANGE, { action: 'clear' });
  }

  /**
   * Enregistre un listener d'événement
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  /**
   * Supprime un listener d'événement
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (!this._listeners.has(event)) return;
    
    const listeners = this._listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Enregistre un listener qui ne sera appelé qu'une fois
   * @param {string} event
   * @param {Function} callback
   */
  once(event, callback) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      callback(...args);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Détruit le contrôleur et libère les ressources
   */
  destroy() {
    this._destroyed = true;
    
    // Arrêter tout
    this._stopCurrentAudio();
    
    // Nettoyer les timeouts
    if (this._errorRecoveryTimeout) {
      clearTimeout(this._errorRecoveryTimeout);
    }
    
    // Vider les composants
    this._queue.clear();
    this._mutex.release();
    
    // Supprimer tous les listeners
    this._listeners.clear();
    
    // Reset état
    this._state = AudioState.IDLE;
    this._currentMessageId = null;
  }

  // ============ MÉTHODES PRIVÉES ============

  /**
   * Change l'état et émet l'événement
   * @private
   */
  _setState(newState) {
    const oldState = this._state;
    this._state = newState;
    
    if (oldState !== newState) {
      this._emit(AudioEvent.STATE_CHANGE, newState);
    }
  }

  /**
   * Émet un événement
   * @private
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[VoiceController] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Joue le prochain élément de la queue
   * @private
   */
  async _playNext() {
    if (this._destroyed) return;
    
    const nextItem = this._queue.dequeue();
    if (!nextItem) {
      this._setState(AudioState.IDLE);
      return;
    }
    
    // Acquérir le mutex
    if (!this._mutex.acquire(nextItem.messageId)) {
      console.warn('[VoiceController] Could not acquire mutex');
      return;
    }
    
    this._currentMessageId = nextItem.messageId;
    this._tracker.setActive(nextItem.messageId);
    this._tracker.track(nextItem.messageId, nextItem.metadata);
    
    this._setState(AudioState.LOADING);
    
    try {
      await this._loadAndPlayAudio(nextItem.audioUrl);
    } catch (error) {
      this._handleAudioError(error);
    }
  }

  /**
   * Charge et joue un audio
   * @private
   */
  async _loadAndPlayAudio(audioUrl) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      this._currentAudio = audio;
      
      // Configurer les listeners
      audio.addEventListener('loadstart', this._handleAudioLoadStart);
      audio.addEventListener('play', this._handleAudioPlay);
      audio.addEventListener('ended', () => {
        this._handleAudioEnded();
        resolve();
      });
      audio.addEventListener('error', (e) => {
        this._handleAudioError(e);
        reject(e);
      });
      
      // Lancer la lecture
      audio.play().catch(reject);
    });
  }

  /**
   * Arrête l'audio actuel proprement
   * @private
   */
  _stopCurrentAudio() {
    if (this._currentAudio) {
      this._currentAudio.pause();
      this._currentAudio.removeEventListener('loadstart', this._handleAudioLoadStart);
      this._currentAudio.removeEventListener('play', this._handleAudioPlay);
      this._currentAudio.removeEventListener('ended', this._handleAudioEnded);
      this._currentAudio.removeEventListener('error', this._handleAudioError);
      this._currentAudio.src = '';
      this._currentAudio = null;
    }
    
    this._mutex.release();
    this._tracker.clearActive();
  }

  /**
   * Handler pour loadstart
   * @private
   */
  _handleAudioLoadStart() {
    // Déjà en LOADING, rien à faire
  }

  /**
   * Handler pour play
   * @private
   */
  _handleAudioPlay() {
    this._setState(AudioState.PLAYING);
    this._emit(AudioEvent.PLAY_START, { messageId: this._currentMessageId });
  }

  /**
   * Handler pour ended
   * @private
   */
  _handleAudioEnded() {
    const endedMessageId = this._currentMessageId;
    
    this._stopCurrentAudio();
    this._currentMessageId = null;
    
    this._emit(AudioEvent.PLAY_END, { messageId: endedMessageId });
    
    // Jouer le suivant si disponible
    if (!this._queue.isEmpty()) {
      this._playNext();
    } else {
      this._setState(AudioState.IDLE);
    }
  }

  /**
   * Handler pour error
   * @private
   */
  _handleAudioError(error) {
    console.error('[VoiceController] Audio error:', error);
    
    this._stopCurrentAudio();
    this._setState(AudioState.ERROR);
    this._emit(AudioEvent.ERROR, error);
    
    // Récupération automatique après délai
    this._errorRecoveryTimeout = setTimeout(() => {
      if (this._state === AudioState.ERROR) {
        if (!this._queue.isEmpty()) {
          this._playNext();
        } else {
          this._setState(AudioState.IDLE);
        }
      }
    }, this.config.errorRecoveryDelay);
  }
}

export default VoiceController;

