/**
 * PRISM VoiceController - Bundle Navigateur
 * 
 * Système anti-répétition audio pour l'interface PRISM Corporate
 * Compatible avec le chargement direct en navigateur (pas de bundler requis)
 * 
 * @version 1.0.0
 * @author PRISM Team
 */

(function(global) {
  'use strict';

  // ============================================================================
  // AUDIO MUTEX - Verrouillage Anti-Répétition
  // ============================================================================
  
  class AudioMutex {
    constructor(config = {}) {
      this.config = {
        strictRelease: config.strictRelease || false,
        timeout: config.timeout || 0
      };
      this._locked = false;
      this._holder = null;
      this._acquiredAt = 0;
      this._timeoutHandle = null;
      this._listeners = new Map();
      this._waitQueue = [];
    }

    acquire(holderId) {
      if (!holderId) throw new Error('Holder ID is required');
      if (this._locked && this._holder !== holderId) return false;
      
      this._locked = true;
      this._holder = holderId;
      this._acquiredAt = Date.now();
      
      if (this.config.timeout > 0) {
        this._clearTimeout();
        this._timeoutHandle = setTimeout(() => this._handleTimeout(), this.config.timeout);
      }
      
      this._emit('acquire', { holderId, timestamp: this._acquiredAt });
      return true;
    }

    release() {
      if (!this._locked) return true;
      this._clearTimeout();
      const previousHolder = this._holder;
      this._locked = false;
      this._holder = null;
      this._acquiredAt = 0;
      this._emit('release', { previousHolder, timestamp: Date.now() });
      this._processWaitQueue();
      return true;
    }

    forceRelease() {
      const previousHolder = this._holder;
      this._clearTimeout();
      this._locked = false;
      this._holder = null;
      this._acquiredAt = 0;
      this._emit('forceRelease', { previousHolder, timestamp: Date.now() });
      this._processWaitQueue();
    }

    isLocked() { return this._locked; }
    getCurrentHolder() { return this._holder; }

    on(event, callback) {
      if (!this._listeners.has(event)) this._listeners.set(event, []);
      this._listeners.get(event).push(callback);
    }

    _emit(event, data) {
      const listeners = this._listeners.get(event);
      if (listeners) listeners.forEach(cb => { try { cb(data); } catch(e) { console.error(e); } });
    }

    _clearTimeout() {
      if (this._timeoutHandle) { clearTimeout(this._timeoutHandle); this._timeoutHandle = null; }
    }

    _handleTimeout() {
      if (this._locked) {
        this._emit('timeout', { holder: this._holder });
        this.forceRelease();
      }
    }

    _processWaitQueue() {
      if (this._waitQueue.length === 0) return;
      const next = this._waitQueue.shift();
      if (next) { this.acquire(next.id); setTimeout(() => next.callback(), 0); }
    }
  }

  // ============================================================================
  // MESSAGE TRACKER - Suivi Anti-Répétition
  // ============================================================================

  class MessageTracker {
    constructor(config = {}) {
      this.config = {
        maxTrackedMessages: config.maxTrackedMessages || 100,
        deduplicationWindow: config.deduplicationWindow || 5000
      };
      this._messages = new Map();
      this._contentHashes = new Map();
      this._activeMessageId = null;
      this._stats = { duplicatesRejected: 0, uniquePlayed: 0, totalChecks: 0, deduplicationRate: 0 };
    }

    generateMessageId() {
      return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${this._messages.size}`;
    }

    track(messageId, metadata = {}) {
      this._messages.set(messageId, { messageId, metadata: { ...metadata }, trackedAt: Date.now() });
      this._enforceMaxSize();
      return messageId;
    }

    shouldPlay(messageId) {
      this._stats.totalChecks++;
      if (this._messages.has(messageId)) {
        this._stats.duplicatesRejected++;
        this._updateRate();
        console.log(`[MessageTracker] ⛔ Doublon rejeté: ${messageId}`);
        return false;
      }
      this._stats.uniquePlayed++;
      this._updateRate();
      return true;
    }

    trackContent(content, messageId) {
      const hash = this._hashContent(content);
      this._contentHashes.set(hash, { messageId, timestamp: Date.now() });
      this._cleanExpiredHashes();
    }

    shouldPlayContent(content) {
      const hash = this._hashContent(content);
      this._cleanExpiredHashes();
      if (this._contentHashes.has(hash)) {
        const entry = this._contentHashes.get(hash);
        if (Date.now() - entry.timestamp < this.config.deduplicationWindow) {
          console.log(`[MessageTracker] ⛔ Contenu déjà joué récemment`);
          return false;
        }
      }
      return true;
    }

    setActive(messageId) { 
      this._activeMessageId = messageId; 
      if (!this._messages.has(messageId)) this.track(messageId, { activatedAt: Date.now() });
    }
    
    getActiveMessageId() { return this._activeMessageId; }
    isActive(messageId) { return this._activeMessageId === messageId; }
    clearActive() { this._activeMessageId = null; }
    size() { return this._messages.size; }
    clear() { this._messages.clear(); this._contentHashes.clear(); this._activeMessageId = null; }
    getStats() { return { ...this._stats }; }

    _hashContent(content) {
      const normalized = (content || '').trim().toLowerCase();
      const str = `${normalized.length}-${normalized.substring(0, 50)}-${normalized.substring(Math.max(0, normalized.length - 50))}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
      return `ch-${Math.abs(hash).toString(36)}`;
    }

    _enforceMaxSize() {
      while (this._messages.size > this.config.maxTrackedMessages) {
        const firstKey = this._messages.keys().next().value;
        this._messages.delete(firstKey);
      }
    }

    _cleanExpiredHashes() {
      const now = Date.now();
      for (const [hash, entry] of this._contentHashes) {
        if (now - entry.timestamp > this.config.deduplicationWindow) this._contentHashes.delete(hash);
      }
    }

    _updateRate() {
      this._stats.deduplicationRate = this._stats.totalChecks === 0 ? 0 : 
        this._stats.duplicatesRejected / this._stats.totalChecks;
    }
  }

  // ============================================================================
  // AUDIO QUEUE - File d'Attente
  // ============================================================================

  class AudioQueue {
    constructor(config = {}) {
      this.config = { maxSize: config.maxSize || 20, enablePriority: config.enablePriority || false };
      this._items = [];
    }

    enqueue(item) {
      if (!item || !item.messageId || !item.audioUrl) throw new Error('Invalid queue item');
      const fullItem = { ...item, enqueuedAt: item.enqueuedAt || Date.now(), priority: item.priority ?? 0 };
      if (this._items.length >= this.config.maxSize) this._items.shift();
      this._items.push(fullItem);
      if (this.config.enablePriority) this._sortByPriority();
      return true;
    }

    dequeue() { return this._items.length === 0 ? null : this._items.shift(); }
    peek() { return this._items.length === 0 ? null : this._items[0]; }
    isEmpty() { return this._items.length === 0; }
    size() { return this._items.length; }
    clear() { this._items = []; }
    toArray() { return [...this._items]; }

    _sortByPriority() {
      this._items.sort((a, b) => b.priority !== a.priority ? b.priority - a.priority : a.enqueuedAt - b.enqueuedAt);
    }
  }

  // ============================================================================
  // VOICE CONTROLLER - Machine à États Centrale
  // ============================================================================

  const AudioState = { IDLE: 'IDLE', LOADING: 'LOADING', PLAYING: 'PLAYING', PAUSED: 'PAUSED', ERROR: 'ERROR' };
  const AudioEvent = { STATE_CHANGE: 'stateChange', PLAY_START: 'playStart', PLAY_END: 'playEnd', PAUSE: 'pause', RESUME: 'resume', STOP: 'stop', SKIP: 'skip', ERROR: 'error' };

  class VoiceController {
    constructor(config = {}) {
      this.config = {
        enableQueue: config.enableQueue !== false,
        maxQueueSize: config.maxQueueSize || 20,
        autoPlay: config.autoPlay !== false,
        errorRecoveryDelay: config.errorRecoveryDelay || 2000
      };
      
      this._state = AudioState.IDLE;
      this._currentMessageId = null;
      this._currentAudio = null;
      this._destroyed = false;
      
      this._mutex = new AudioMutex({ timeout: 60000 });
      this._tracker = config.messageTracker || new MessageTracker();
      this._queue = new AudioQueue({ maxSize: this.config.maxQueueSize, enablePriority: true });
      this._listeners = new Map();
      this._errorRecoveryTimeout = null;

      console.log('[VoiceController] ✅ Initialisé avec protection anti-répétition');
    }

    // API Publique
    getState() { return this._state; }
    getCurrentMessageId() { return this._currentMessageId; }
    getQueueLength() { return this._queue.size(); }
    getTracker() { return this._tracker; }
    
    async enqueue(audioUrl, messageId, metadata = {}) {
      if (this._destroyed) {
        console.warn('[VoiceController] ⚠️ Controller destroyed');
        return false;
      }
      
      // VÉRIFICATION ANTI-RÉPÉTITION
      if (!this._tracker.shouldPlay(messageId)) {
        console.log(`[VoiceController] ⛔ Message ${messageId} déjà joué, ignoré`);
        return false;
      }
      
      console.log(`[VoiceController] ✅ Enqueue message: ${messageId}`);
      
      this._queue.enqueue({ messageId, audioUrl, priority: metadata.priority || 0, metadata });
      
      if (this.config.autoPlay && this._state === AudioState.IDLE) {
        await this._playNext();
      }
      
      return true;
    }

    async enqueuePriority(audioUrl, messageId, priority = 10) {
      if (this._destroyed) return false;
      if (this._state === AudioState.PLAYING) this._stopCurrentAudio();
      this._queue.enqueue({ messageId, audioUrl, priority });
      await this._playNext();
      return true;
    }

    pause() {
      if (this._state === AudioState.PLAYING && this._currentAudio) {
        this._currentAudio.pause();
        this._setState(AudioState.PAUSED);
        this._emit(AudioEvent.PAUSE);
      }
    }

    resume() {
      if (this._state === AudioState.PAUSED && this._currentAudio) {
        this._currentAudio.play();
        this._setState(AudioState.PLAYING);
        this._emit(AudioEvent.RESUME);
      }
    }

    stop() {
      this._stopCurrentAudio();
      this._queue.clear();
      this._currentMessageId = null;
      this._setState(AudioState.IDLE);
      this._emit(AudioEvent.STOP);
    }

    skip() {
      this._emit(AudioEvent.SKIP, { skippedId: this._currentMessageId });
      this._stopCurrentAudio();
      this._playNext();
    }

    on(event, callback) {
      if (!this._listeners.has(event)) this._listeners.set(event, []);
      this._listeners.get(event).push(callback);
    }

    off(event, callback) {
      if (!this._listeners.has(event)) return;
      const listeners = this._listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }

    destroy() {
      this._destroyed = true;
      this._stopCurrentAudio();
      if (this._errorRecoveryTimeout) clearTimeout(this._errorRecoveryTimeout);
      this._queue.clear();
      this._mutex.release();
      this._listeners.clear();
      this._state = AudioState.IDLE;
      this._currentMessageId = null;
    }

    // Méthodes Privées
    _setState(newState) {
      const oldState = this._state;
      this._state = newState;
      if (oldState !== newState) this._emit(AudioEvent.STATE_CHANGE, newState);
    }

    _emit(event, data) {
      const listeners = this._listeners.get(event);
      if (listeners) listeners.forEach(cb => { try { cb(data); } catch(e) { console.error(e); } });
    }

    async _playNext() {
      if (this._destroyed) return;
      
      const nextItem = this._queue.dequeue();
      if (!nextItem) {
        this._setState(AudioState.IDLE);
        return;
      }
      
      if (!this._mutex.acquire(nextItem.messageId)) {
        console.warn('[VoiceController] ⚠️ Mutex non acquis');
        return;
      }
      
      this._currentMessageId = nextItem.messageId;
      this._tracker.setActive(nextItem.messageId);
      this._tracker.track(nextItem.messageId, nextItem.metadata);
      
      this._setState(AudioState.LOADING);
      console.log(`[VoiceController] 🎵 Lecture: ${nextItem.messageId}`);
      
      try {
        await this._loadAndPlayAudio(nextItem.audioUrl, nextItem.metadata);
      } catch (error) {
        this._handleAudioError(error);
      }
    }

    async _loadAndPlayAudio(audioUrl, _metadata = {}) {
      return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        this._currentAudio = audio;
        
        audio.onloadstart = () => {
          console.log('[VoiceController] 📦 Chargement audio...');
        };
        
        audio.onplay = () => {
          this._setState(AudioState.PLAYING);
          this._emit(AudioEvent.PLAY_START, { messageId: this._currentMessageId });
          console.log('[VoiceController] ▶️ Lecture en cours');
        };
        
        audio.onended = () => {
          console.log('[VoiceController] ✅ Lecture terminée');
          this._handleAudioEnded();
          resolve();
        };
        
        audio.onerror = (e) => {
          console.error('[VoiceController] ❌ Erreur audio:', e);
          this._handleAudioError(e);
          reject(e);
        };
        
        audio.play().catch(reject);
      });
    }

    _stopCurrentAudio() {
      if (this._currentAudio) {
        this._currentAudio.pause();
        this._currentAudio.onended = null;
        this._currentAudio.onerror = null;
        this._currentAudio.onplay = null;
        this._currentAudio.src = '';
        this._currentAudio = null;
      }
      this._mutex.release();
      this._tracker.clearActive();
    }

    _handleAudioEnded() {
      const endedMessageId = this._currentMessageId;
      this._stopCurrentAudio();
      this._currentMessageId = null;
      this._emit(AudioEvent.PLAY_END, { messageId: endedMessageId });
      
      if (!this._queue.isEmpty()) {
        this._playNext();
      } else {
        this._setState(AudioState.IDLE);
      }
    }

    _handleAudioError(error) {
      console.error('[VoiceController] ❌ Erreur:', error);
      this._stopCurrentAudio();
      this._setState(AudioState.ERROR);
      this._emit(AudioEvent.ERROR, error);
      
      this._errorRecoveryTimeout = setTimeout(() => {
        if (this._state === AudioState.ERROR) {
          if (!this._queue.isEmpty()) this._playNext();
          else this._setState(AudioState.IDLE);
        }
      }, this.config.errorRecoveryDelay);
    }
  }

  // ============================================================================
  // PRISM VOICE INTEGRATION - Intégration avec l'Interface Existante
  // ============================================================================

  class PrismVoiceIntegration {
    constructor(prismChatInstance) {
      this.chat = prismChatInstance;
      this.controller = new VoiceController();
      this._originalPlayElevenLabsAudio = null;
      this._originalAddPrismMessage = null;
      this._audioUrlToMessageId = new Map();
      
      this._setupIntegration();
      console.log('[PrismVoiceIntegration] ✅ Intégration activée');
    }

    _setupIntegration() {
      // Sauvegarder les méthodes originales
      this._originalPlayElevenLabsAudio = this.chat.playElevenLabsAudio.bind(this.chat);
      this._originalAddPrismMessage = this.chat.addPrismMessage.bind(this.chat);
      
      // Patch playElevenLabsAudio pour passer par le VoiceController
      this.chat.playElevenLabsAudio = async (audioUrl, originalText = null) => {
        // Générer un ID unique pour cet audio
        const messageId = this.controller.getTracker().generateMessageId();
        
        // Stocker l'association URL → ID pour tracking
        this._audioUrlToMessageId.set(audioUrl, messageId);
        
        // Enqueue via VoiceController (avec vérification anti-répétition)
        const enqueued = await this.controller.enqueue(audioUrl, messageId, { originalText });
        
        if (!enqueued) {
          console.log('[PrismVoiceIntegration] ⛔ Audio déjà joué, ignoré par VoiceController');
          return Promise.resolve(); // Résoudre silencieusement sans erreur
        }
        
        // Retourner une promesse qui se résout quand la lecture est terminée
        return new Promise((resolve) => {
          const onPlayEnd = ({ messageId: endedId }) => {
            if (endedId === messageId) {
              this.controller.off('playEnd', onPlayEnd);
              this.controller.off('error', onError);
              resolve();
            }
          };
          
          const onError = () => {
            this.controller.off('playEnd', onPlayEnd);
            this.controller.off('error', onError);
            // Fallback TTS si erreur
            if (originalText && this.chat.speak) {
              console.log('[PrismVoiceIntegration] 🔄 Fallback TTS navigateur');
              this.chat.speak(this.chat.cleanTextForSpeech ? this.chat.cleanTextForSpeech(originalText) : originalText);
            }
            resolve();
          };
          
          this.controller.on('playEnd', onPlayEnd);
          this.controller.on('error', onError);
        });
      };
      
      // Patch addPrismMessage pour SUPPRIMER l'appel audio (éviter le double)
      this.chat.addPrismMessage = (message, options = {}) => {
        // Appeler la méthode originale mais intercepter l'audio
        const savedSpeechEnabled = this.chat.speechEnabled;
        
        // Temporairement désactiver la lecture vocale dans addPrismMessage
        // car elle sera gérée par sendMessage
        this.chat.speechEnabled = false;
        
        try {
          this._originalAddPrismMessage(message, options);
        } finally {
          // Restaurer
          this.chat.speechEnabled = savedSpeechEnabled;
        }
      };
      
      // Écouter les événements du VoiceController pour mettre à jour l'UI
      this.controller.on('stateChange', (state) => {
        this._updateUI(state);
      });
      
      this.controller.on('playStart', () => {
        if (this.chat.speechStatus) {
          this.chat.speechStatus.classList.remove('inactive');
          this.chat.speechText.textContent = 'VoiceController: Playing';
        }
        if (this.chat.showStopButton) this.chat.showStopButton();
      });
      
      this.controller.on('playEnd', () => {
        if (this.chat.speechStatus) {
          this.chat.speechText.textContent = 'VoiceController: Ready';
        }
        if (this.chat.hideStopButton) this.chat.hideStopButton();
      });
      
      this.controller.on('error', () => {
        if (this.chat.speechStatus) {
          this.chat.speechText.textContent = 'VoiceController: Error';
        }
        if (this.chat.hideStopButton) this.chat.hideStopButton();
      });
      
      // Patcher le bouton stop pour utiliser VoiceController
      if (this.chat.stopAllSpeech) {
        const originalStopAllSpeech = this.chat.stopAllSpeech.bind(this.chat);
        this.chat.stopAllSpeech = () => {
          this.controller.stop();
          originalStopAllSpeech();
        };
      }
    }

    _updateUI(state) {
      if (!this.chat.speechStatus) return;
      
      switch (state) {
        case AudioState.IDLE:
          this.chat.speechText.textContent = 'Voice: Ready';
          this.chat.speechStatus.classList.add('inactive');
          break;
        case AudioState.LOADING:
          this.chat.speechText.textContent = 'Voice: Loading...';
          this.chat.speechStatus.classList.remove('inactive');
          break;
        case AudioState.PLAYING:
          this.chat.speechText.textContent = 'Voice: Playing';
          this.chat.speechStatus.classList.remove('inactive');
          break;
        case AudioState.PAUSED:
          this.chat.speechText.textContent = 'Voice: Paused';
          break;
        case AudioState.ERROR:
          this.chat.speechText.textContent = 'Voice: Error';
          break;
      }
    }

    getController() {
      return this.controller;
    }

    getStats() {
      return {
        trackerStats: this.controller.getTracker().getStats(),
        queueLength: this.controller.getQueueLength(),
        currentState: this.controller.getState(),
        currentMessageId: this.controller.getCurrentMessageId()
      };
    }

    destroy() {
      // Restaurer les méthodes originales
      if (this._originalPlayElevenLabsAudio) {
        this.chat.playElevenLabsAudio = this._originalPlayElevenLabsAudio;
      }
      if (this._originalAddPrismMessage) {
        this.chat.addPrismMessage = this._originalAddPrismMessage;
      }
      this.controller.destroy();
    }
  }

  // ============================================================================
  // EXPORTS GLOBAUX
  // ============================================================================

  global.PRISM = global.PRISM || {};
  global.PRISM.Voice = {
    AudioMutex,
    MessageTracker,
    AudioQueue,
    VoiceController,
    AudioState,
    AudioEvent,
    PrismVoiceIntegration
  };

  // Auto-initialisation si PRISMChat existe
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      // Attendre que PRISMChat soit initialisé
      const checkAndInit = () => {
        if (window.prismChat) {
          console.log('[PRISM Voice] 🚀 Auto-initialisation de l\'intégration vocale...');
          window.prismVoiceIntegration = new PrismVoiceIntegration(window.prismChat);
          console.log('[PRISM Voice] ✅ Intégration vocale activée avec protection anti-répétition');
        } else {
          console.log('[PRISM Voice] ⏳ En attente de PRISMChat...');
          setTimeout(checkAndInit, 500);
        }
      };
      
      // Démarrer la vérification après un court délai
      setTimeout(checkAndInit, 1000);
    });
  }

  console.log('[PRISM Voice] 📦 Module chargé - v1.0.0');

})(typeof window !== 'undefined' ? window : global);

