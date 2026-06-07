/**
 * PRISM Voice Tests - Setup
 * 
 * Configuration de l'environnement de test pour les modules audio.
 * Implémentation Audio complète pour tests TDD sans mocks.
 * 
 * Note: jsdom ne supporte pas HTMLMediaElement.play/pause
 * Nous fournissons donc une implémentation fonctionnelle complète.
 */

// Implémentation Audio fonctionnelle complète pour les tests
class TestAudio extends EventTarget {
  constructor(src) {
    super();
    this._src = src || '';
    this.currentTime = 0;
    this.duration = 1;
    this.paused = true;
    this.volume = 1;
    this.muted = false;
    this.playbackRate = 1;
    this.ended = false;
    this.readyState = 0;
    this.error = null;
    this._playTimeout = null;
    this._loadTimeout = null;
    
    // Simuler le chargement après construction
    if (src) {
      this._simulateLoad();
    }
  }
  
  get src() {
    return this._src;
  }
  
  set src(value) {
    this._src = value;
    // Reset state
    this.currentTime = 0;
    this.paused = true;
    this.ended = false;
    this.error = null;
    this.readyState = 0;
    
    // Annuler les timeouts précédents
    if (this._playTimeout) clearTimeout(this._playTimeout);
    if (this._loadTimeout) clearTimeout(this._loadTimeout);
  }
  
  play() {
    return new Promise((resolve, reject) => {
      // Vérifier si URL invalide
      if (!this._src || 
          this._src.startsWith('invalid://') || 
          this._src === 'invalid://not-a-valid-url' ||
          this._src === 'invalid://bad') {
        const error = new Error('Failed to load audio: invalid URL');
        this.error = error;
        setTimeout(() => {
          this.dispatchEvent(new Event('error'));
        }, 5);
        reject(error);
        return;
      }
      
      this.paused = false;
      this.ended = false;
      
      // Émettre événement play
      setTimeout(() => {
        this.dispatchEvent(new Event('play'));
      }, 5);
      
      // Calculer durée basée sur URL (pour tests)
      let playDuration = 100; // 100ms par défaut
      
      // Extraire durée si encodée dans l'URL (blob:test-audio-DURATION)
      const durationMatch = this._src.match(/duration[:-]?(\d+)/i);
      if (durationMatch) {
        playDuration = Number.parseInt(durationMatch[1], 10);
      }
      
      this.duration = playDuration / 1000;
      
      // Simuler la fin de lecture
      this._playTimeout = setTimeout(() => {
        if (!this.paused) {
          this.ended = true;
          this.paused = true;
          this.currentTime = this.duration;
          this.dispatchEvent(new Event('ended'));
        }
      }, playDuration);
      
      resolve();
    });
  }
  
  pause() {
    this.paused = true;
    if (this._playTimeout) {
      clearTimeout(this._playTimeout);
      this._playTimeout = null;
    }
    this.dispatchEvent(new Event('pause'));
  }
  
  load() {
    this._simulateLoad();
  }
  
  _simulateLoad() {
    // Annuler timeout précédent
    if (this._loadTimeout) clearTimeout(this._loadTimeout);
    
    // Simuler loadstart
    this._loadTimeout = setTimeout(() => {
      this.dispatchEvent(new Event('loadstart'));
      
      if (this._src && !this._src.startsWith('invalid://')) {
        // Simuler loadeddata après un court délai
        setTimeout(() => {
          this.readyState = 4; // HAVE_ENOUGH_DATA
          this.dispatchEvent(new Event('loadeddata'));
          this.dispatchEvent(new Event('canplay'));
          this.dispatchEvent(new Event('canplaythrough'));
        }, 10);
      }
    }, 5);
  }
  
  // Méthodes supplémentaires pour compatibilité
  canPlayType(_type) {
    return 'probably';
  }
  
  fastSeek(time) {
    this.currentTime = time;
  }
}

// Remplacer Audio globalement AVANT que jsdom ne soit utilisé
globalThis.Audio = TestAudio;
window.Audio = TestAudio;

// Polyfill pour URL.createObjectURL si nécessaire
const originalCreateObjectURL = URL.createObjectURL;
URL.createObjectURL = (blob) => {
  if (originalCreateObjectURL && blob instanceof Blob) {
    try {
      return originalCreateObjectURL(blob);
    } catch (_e) {
      // Fallback si échoue
    }
  }
  return `blob:test-${Date.now()}-${Math.random().toString(36).substring(2)}`;
};

const originalRevokeObjectURL = URL.revokeObjectURL;
URL.revokeObjectURL = (url) => {
  if (originalRevokeObjectURL) {
    try {
      return originalRevokeObjectURL(url);
    } catch (_e) {
      // Ignore
    }
  }
};

// Polyfill pour performance.now() si nécessaire
if (typeof performance === 'undefined') {
  globalThis.performance = {
    now: () => Date.now()
  };
}

// Polyfill setImmediate pour Node
if (typeof setImmediate === 'undefined') {
  globalThis.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

// Configuration console pour les tests
console.log('[Voice Test Setup] Environment configured');
console.log(`[Voice Test Setup] Audio available: ${typeof Audio !== 'undefined'}`);
console.log(`[Voice Test Setup] Audio is TestAudio: ${Audio === TestAudio}`);
console.log(`[Voice Test Setup] Blob available: ${typeof Blob !== 'undefined'}`);
console.log(`[Voice Test Setup] URL.createObjectURL available: ${typeof URL.createObjectURL !== 'undefined'}`);
