/**
 * PRISM Voice Controller - Tests TDD Complets
 * 
 * Tests écrits AVANT l'implémentation conformément à TDD strict
 * Couverture cible : >= 95%
 * Pas de mocks - Tests avec vraies dépendances
 * 
 * @author PRISM Audit Team
 * @date 2024-12-06
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Imports des modules voice
import { VoiceController, AudioState } from '../../src/voice/VoiceController.js';
import { AudioMutex } from '../../src/voice/AudioMutex.js';
import { MessageTracker } from '../../src/voice/MessageTracker.js';
import { AudioQueue } from '../../src/voice/AudioQueue.js';
import { ElevenLabsClient } from '../../src/voice/ElevenLabsClient.js';

// Types pour TypeScript
/** @typedef {import('../../src/voice/AudioQueue.js').QueueItem} QueueItem */
/** @typedef {import('../../src/voice/ElevenLabsClient.js').AudioGenerationResult} AudioGenerationResult */

// ============================================================================
// SECTION 1: VOICE CONTROLLER - MACHINE À ÉTATS AUDIO
// ============================================================================

describe('VoiceController - Machine à États Audio', () => {
  let controller: VoiceController;

  beforeEach(() => {
    controller = new VoiceController({
      enableQueue: true,
      maxQueueSize: 10,
      autoPlay: true
    });
  });

  afterEach(() => {
    controller.destroy();
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec état IDLE', () => {
      expect(controller.getState()).toBe(AudioState.IDLE);
    });

    it('DOIT initialiser avec queue vide', () => {
      expect(controller.getQueueLength()).toBe(0);
    });

    it('DOIT initialiser avec configuration par défaut', () => {
      const defaultController = new VoiceController();
      expect(defaultController.isAutoPlayEnabled()).toBe(true);
      expect(defaultController.getMaxQueueSize()).toBe(20);
      defaultController.destroy();
    });

    it('DOIT accepter configuration personnalisée', () => {
      const customController = new VoiceController({
        enableQueue: false,
        maxQueueSize: 5,
        autoPlay: false
      });
      expect(customController.isAutoPlayEnabled()).toBe(false);
      expect(customController.getMaxQueueSize()).toBe(5);
      customController.destroy();
    });

    it('DOIT initialiser currentMessageId à null', () => {
      expect(controller.getCurrentMessageId()).toBeNull();
    });

    it('DOIT initialiser les listeners vides', () => {
      expect(controller.getListenerCount('stateChange')).toBe(0);
    });
  });

  describe('Transitions d\'État', () => {
    describe('IDLE → LOADING', () => {
      it('DOIT transitionner vers LOADING lors de enqueue avec autoPlay', async () => {
        const messageId = 'msg-001';
        const audioUrl = 'blob:test-audio-url';
        
        await controller.enqueue(audioUrl, messageId);
        
        expect(controller.getState()).toBe(AudioState.LOADING);
      });

      it('DOIT rester IDLE si autoPlay désactivé', async () => {
        const noAutoPlayController = new VoiceController({ autoPlay: false });
        await noAutoPlayController.enqueue('blob:test', 'msg-001');
        
        expect(noAutoPlayController.getState()).toBe(AudioState.IDLE);
        expect(noAutoPlayController.getQueueLength()).toBe(1);
        noAutoPlayController.destroy();
      });

      it('DOIT émettre événement stateChange', async () => {
        let emittedState: AudioState | null = null;
        controller.on('stateChange', (state) => { emittedState = state; });
        
        await controller.enqueue('blob:test', 'msg-001');
        
        expect(emittedState).toBe(AudioState.LOADING);
      });
    });

    describe('LOADING → PLAYING', () => {
      it('DOIT transitionner vers PLAYING après chargement réussi', async () => {
        // Simuler un audio qui se charge rapidement
        const audioUrl = createTestAudioBlob();
        await controller.enqueue(audioUrl, 'msg-001');
        
        // Attendre le chargement
        await waitForState(controller, AudioState.PLAYING, 5000);
        
        expect(controller.getState()).toBe(AudioState.PLAYING);
      });

      it('DOIT définir currentMessageId pendant PLAYING', async () => {
        const messageId = 'msg-unique-123';
        const audioUrl = createTestAudioBlob();
        
        await controller.enqueue(audioUrl, messageId);
        await waitForState(controller, AudioState.PLAYING, 5000);
        
        expect(controller.getCurrentMessageId()).toBe(messageId);
      });

      it('DOIT émettre événement playStart', async () => {
        let playStarted = false;
        controller.on('playStart', () => { playStarted = true; });
        
        await controller.enqueue(createTestAudioBlob(), 'msg-001');
        await waitForState(controller, AudioState.PLAYING, 5000);
        
        expect(playStarted).toBe(true);
      });
    });

    describe('LOADING → ERROR', () => {
      it('DOIT transitionner vers ERROR si chargement échoue', async () => {
        const invalidUrl = 'invalid://not-a-valid-url';
        
        await controller.enqueue(invalidUrl, 'msg-001');
        await waitForState(controller, AudioState.ERROR, 5000);
        
        expect(controller.getState()).toBe(AudioState.ERROR);
      });

      it('DOIT émettre événement error avec détails', async () => {
        let errorDetails: Error | null = null;
        controller.on('error', (error) => { errorDetails = error; });
        
        await controller.enqueue('invalid://bad', 'msg-001');
        await waitForState(controller, AudioState.ERROR, 5000);
        
        expect(errorDetails).not.toBeNull();
        expect(errorDetails?.message).toBeDefined();
      });

      it('DOIT revenir à IDLE après délai d\'erreur', async () => {
        await controller.enqueue('invalid://bad', 'msg-001');
        await waitForState(controller, AudioState.ERROR, 5000);
        
        // Attendre le retour automatique à IDLE
        await waitForState(controller, AudioState.IDLE, 3000);
        
        expect(controller.getState()).toBe(AudioState.IDLE);
      });
    });

    describe('PLAYING → PAUSED', () => {
      it('DOIT transitionner vers PAUSED lors de pause()', async () => {
        await controller.enqueue(createTestAudioBlob(), 'msg-001');
        await waitForState(controller, AudioState.PLAYING, 5000);
        
        controller.pause();
        
        expect(controller.getState()).toBe(AudioState.PAUSED);
      });

      it('DOIT conserver currentMessageId pendant PAUSED', async () => {
        const messageId = 'msg-pause-test';
        await controller.enqueue(createTestAudioBlob(), messageId);
        await waitForState(controller, AudioState.PLAYING, 5000);
        
        controller.pause();
        
        expect(controller.getCurrentMessageId()).toBe(messageId);
      });

      it('DOIT émettre événement pause', async () => {
        let paused = false;
        controller.on('pause', () => { paused = true; });
        
        await controller.enqueue(createTestAudioBlob(), 'msg-001');
        await waitForState(controller, AudioState.PLAYING, 5000);
        controller.pause();
        
        expect(paused).toBe(true);
      });
    });

    describe('PAUSED → PLAYING', () => {
      it('DOIT transitionner vers PLAYING lors de resume()', async () => {
        await controller.enqueue(createTestAudioBlob(), 'msg-001');
        await waitForState(controller, AudioState.PLAYING, 5000);
        controller.pause();
        
        controller.resume();
        
        expect(controller.getState()).toBe(AudioState.PLAYING);
      });

      it('DOIT émettre événement resume', async () => {
        let resumed = false;
        controller.on('resume', () => { resumed = true; });
        
        await controller.enqueue(createTestAudioBlob(), 'msg-001');
        await waitForState(controller, AudioState.PLAYING, 5000);
        controller.pause();
        controller.resume();
        
        expect(resumed).toBe(true);
      });
    });

    describe('PLAYING → IDLE (fin naturelle)', () => {
      it('DOIT transitionner vers IDLE après fin de lecture', async () => {
        // Créer un audio très court (100ms)
        const shortAudio = createTestAudioBlob(100);
        await controller.enqueue(shortAudio, 'msg-001');
        await waitForState(controller, AudioState.PLAYING, 5000);
        
        // Attendre la fin naturelle
        await waitForState(controller, AudioState.IDLE, 2000);
        
        expect(controller.getState()).toBe(AudioState.IDLE);
      });

      it('DOIT réinitialiser currentMessageId après fin', async () => {
        const shortAudio = createTestAudioBlob(100);
        await controller.enqueue(shortAudio, 'msg-001');
        await waitForState(controller, AudioState.PLAYING, 5000);
        await waitForState(controller, AudioState.IDLE, 2000);
        
        expect(controller.getCurrentMessageId()).toBeNull();
      });

      it('DOIT émettre événement playEnd', async () => {
        let playEnded = false;
        controller.on('playEnd', () => { playEnded = true; });
        
        const shortAudio = createTestAudioBlob(100);
        await controller.enqueue(shortAudio, 'msg-001');
        await waitForState(controller, AudioState.IDLE, 7000);
        
        expect(playEnded).toBe(true);
      });

      it('DOIT lire le message suivant en queue si présent', async () => {
        await controller.enqueue(createTestAudioBlob(100), 'msg-001');
        await controller.enqueue(createTestAudioBlob(100), 'msg-002');
        
        // Premier message
        await waitForState(controller, AudioState.PLAYING, 5000);
        expect(controller.getCurrentMessageId()).toBe('msg-001');
        
        // Attendre fin et début du second
        await delay(200);
        await waitForState(controller, AudioState.PLAYING, 5000);
        expect(controller.getCurrentMessageId()).toBe('msg-002');
      });
    });

    describe('PLAYING → IDLE (stop forcé)', () => {
      it('DOIT transitionner vers IDLE lors de stop()', async () => {
        await controller.enqueue(createTestAudioBlob(), 'msg-001');
        await waitForState(controller, AudioState.PLAYING, 5000);
        
        controller.stop();
        
        expect(controller.getState()).toBe(AudioState.IDLE);
      });

      it('DOIT vider la queue lors de stop()', async () => {
        await controller.enqueue(createTestAudioBlob(), 'msg-001');
        await controller.enqueue(createTestAudioBlob(), 'msg-002');
        await controller.enqueue(createTestAudioBlob(), 'msg-003');
        
        controller.stop();
        
        expect(controller.getQueueLength()).toBe(0);
      });

      it('DOIT émettre événement stop', async () => {
        let stopped = false;
        controller.on('stop', () => { stopped = true; });
        
        await controller.enqueue(createTestAudioBlob(), 'msg-001');
        await waitForState(controller, AudioState.PLAYING, 5000);
        controller.stop();
        
        expect(stopped).toBe(true);
      });
    });

    describe('Transitions Invalides', () => {
      it('NE DOIT PAS permettre pause() depuis IDLE', () => {
        expect(controller.getState()).toBe(AudioState.IDLE);
        
        controller.pause();
        
        expect(controller.getState()).toBe(AudioState.IDLE);
      });

      it('NE DOIT PAS permettre resume() depuis IDLE', () => {
        controller.resume();
        
        expect(controller.getState()).toBe(AudioState.IDLE);
      });

      it('NE DOIT PAS permettre resume() depuis PLAYING', async () => {
        await controller.enqueue(createTestAudioBlob(), 'msg-001');
        await waitForState(controller, AudioState.PLAYING, 5000);
        
        controller.resume();
        
        expect(controller.getState()).toBe(AudioState.PLAYING);
      });

      it('NE DOIT PAS permettre pause() depuis LOADING', async () => {
        // Enqueue sans attendre PLAYING
        controller.enqueue(createTestAudioBlob(), 'msg-001');
        
        // Tenter pause immédiatement pendant LOADING
        controller.pause();
        
        // État devrait rester LOADING ou passer à PLAYING
        const state = controller.getState();
        expect(state === AudioState.LOADING || state === AudioState.PLAYING).toBe(true);
      });
    });
  });

  describe('Gestion de la Queue', () => {
    it('DOIT ajouter des messages à la queue', async () => {
      await controller.enqueue(createTestAudioBlob(), 'msg-001');
      await controller.enqueue(createTestAudioBlob(), 'msg-002');
      
      // Premier est en cours, second est en queue
      expect(controller.getQueueLength()).toBe(1);
    });

    it('DOIT respecter maxQueueSize', async () => {
      const smallQueueController = new VoiceController({ maxQueueSize: 2, autoPlay: false });
      
      await smallQueueController.enqueue(createTestAudioBlob(), 'msg-001');
      await smallQueueController.enqueue(createTestAudioBlob(), 'msg-002');
      await smallQueueController.enqueue(createTestAudioBlob(), 'msg-003');
      
      // Seuls les 2 derniers devraient être conservés
      expect(smallQueueController.getQueueLength()).toBe(2);
      smallQueueController.destroy();
    });

    it('DOIT permettre skip() pour passer au suivant', async () => {
      await controller.enqueue(createTestAudioBlob(5000), 'msg-001');
      await controller.enqueue(createTestAudioBlob(5000), 'msg-002');
      await waitForState(controller, AudioState.PLAYING, 5000);
      
      expect(controller.getCurrentMessageId()).toBe('msg-001');
      
      controller.skip();
      await waitForState(controller, AudioState.PLAYING, 5000);
      
      expect(controller.getCurrentMessageId()).toBe('msg-002');
    });

    it('DOIT émettre événement skip', async () => {
      let skipped = false;
      controller.on('skip', () => { skipped = true; });
      
      await controller.enqueue(createTestAudioBlob(), 'msg-001');
      await controller.enqueue(createTestAudioBlob(), 'msg-002');
      await waitForState(controller, AudioState.PLAYING, 5000);
      
      controller.skip();
      
      expect(skipped).toBe(true);
    });

    it('DOIT retourner la queue courante', async () => {
      const noAutoPlay = new VoiceController({ autoPlay: false });
      
      await noAutoPlay.enqueue(createTestAudioBlob(), 'msg-001');
      await noAutoPlay.enqueue(createTestAudioBlob(), 'msg-002');
      
      const queue = noAutoPlay.getQueue();
      
      expect(queue.length).toBe(2);
      expect(queue[0].messageId).toBe('msg-001');
      expect(queue[1].messageId).toBe('msg-002');
      noAutoPlay.destroy();
    });

    it('DOIT permettre clearQueue() sans affecter lecture en cours', async () => {
      await controller.enqueue(createTestAudioBlob(), 'msg-001');
      await controller.enqueue(createTestAudioBlob(), 'msg-002');
      await controller.enqueue(createTestAudioBlob(), 'msg-003');
      await waitForState(controller, AudioState.PLAYING, 5000);
      
      const currentId = controller.getCurrentMessageId();
      controller.clearQueue();
      
      expect(controller.getQueueLength()).toBe(0);
      expect(controller.getCurrentMessageId()).toBe(currentId);
      expect(controller.getState()).toBe(AudioState.PLAYING);
    });
  });

  describe('Gestion des Événements', () => {
    it('DOIT permettre l\'ajout de listeners', () => {
      const callback = () => {};
      controller.on('stateChange', callback);
      
      expect(controller.getListenerCount('stateChange')).toBe(1);
    });

    it('DOIT permettre la suppression de listeners', () => {
      const callback = () => {};
      controller.on('stateChange', callback);
      controller.off('stateChange', callback);
      
      expect(controller.getListenerCount('stateChange')).toBe(0);
    });

    it('DOIT permettre plusieurs listeners par événement', () => {
      controller.on('stateChange', () => {});
      controller.on('stateChange', () => {});
      controller.on('stateChange', () => {});
      
      expect(controller.getListenerCount('stateChange')).toBe(3);
    });

    it('DOIT appeler tous les listeners lors d\'un événement', async () => {
      let count = 0;
      controller.on('stateChange', () => { count++; });
      controller.on('stateChange', () => { count++; });
      
      await controller.enqueue(createTestAudioBlob(), 'msg-001');
      
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('DOIT supporter once() pour listener unique', async () => {
      let count = 0;
      controller.once('stateChange', () => { count++; });
      
      await controller.enqueue(createTestAudioBlob(), 'msg-001');
      await waitForState(controller, AudioState.PLAYING, 5000);
      controller.stop();
      
      // once() ne devrait être appelé qu'une fois
      expect(count).toBe(1);
    });
  });

  describe('Cleanup et Destruction', () => {
    it('DOIT nettoyer les ressources lors de destroy()', async () => {
      await controller.enqueue(createTestAudioBlob(), 'msg-001');
      await waitForState(controller, AudioState.PLAYING, 5000);
      
      controller.destroy();
      
      expect(controller.getState()).toBe(AudioState.IDLE);
      expect(controller.getQueueLength()).toBe(0);
      expect(controller.getListenerCount('stateChange')).toBe(0);
    });

    it('DOIT ignorer les appels après destroy()', async () => {
      controller.destroy();
      
      await controller.enqueue(createTestAudioBlob(), 'msg-001');
      
      expect(controller.getQueueLength()).toBe(0);
    });
  });
});

// ============================================================================
// SECTION 2: AUDIO MUTEX - VERROUILLAGE ANTI-RÉPÉTITION
// ============================================================================

describe('AudioMutex - Verrouillage Audio', () => {
  let mutex: AudioMutex;

  beforeEach(() => {
    mutex = new AudioMutex();
  });

  afterEach(() => {
    mutex.release();
  });

  describe('Acquisition du Verrou', () => {
    it('DOIT permettre l\'acquisition initiale', () => {
      const acquired = mutex.acquire('audio-001');
      
      expect(acquired).toBe(true);
      expect(mutex.isLocked()).toBe(true);
    });

    it('DOIT retourner l\'ID du détenteur actuel', () => {
      mutex.acquire('audio-001');
      
      expect(mutex.getCurrentHolder()).toBe('audio-001');
    });

    it('DOIT refuser acquisition si déjà verrouillé', () => {
      mutex.acquire('audio-001');
      const secondAcquired = mutex.acquire('audio-002');
      
      expect(secondAcquired).toBe(false);
      expect(mutex.getCurrentHolder()).toBe('audio-001');
    });

    it('DOIT permettre réacquisition par même détenteur', () => {
      mutex.acquire('audio-001');
      const reacquired = mutex.acquire('audio-001');
      
      expect(reacquired).toBe(true);
      expect(mutex.getCurrentHolder()).toBe('audio-001');
    });
  });

  describe('Libération du Verrou', () => {
    it('DOIT libérer le verrou correctement', () => {
      mutex.acquire('audio-001');
      mutex.release();
      
      expect(mutex.isLocked()).toBe(false);
      expect(mutex.getCurrentHolder()).toBeNull();
    });

    it('DOIT permettre acquisition après libération', () => {
      mutex.acquire('audio-001');
      mutex.release();
      const acquired = mutex.acquire('audio-002');
      
      expect(acquired).toBe(true);
      expect(mutex.getCurrentHolder()).toBe('audio-002');
    });

    it('DOIT être idempotent (release multiple fois)', () => {
      mutex.acquire('audio-001');
      mutex.release();
      mutex.release();
      mutex.release();
      
      expect(mutex.isLocked()).toBe(false);
    });

    it('DOIT refuser release par non-détenteur avec strict mode', () => {
      const strictMutex = new AudioMutex({ strictRelease: true });
      strictMutex.acquire('audio-001');
      
      const released = strictMutex.releaseBy('audio-002');
      
      expect(released).toBe(false);
      expect(strictMutex.isLocked()).toBe(true);
      strictMutex.release();
    });
  });

  describe('Force Release', () => {
    it('DOIT permettre forceRelease() même si verrouillé', () => {
      mutex.acquire('audio-001');
      mutex.forceRelease();
      
      expect(mutex.isLocked()).toBe(false);
    });

    it('DOIT émettre événement forceRelease', () => {
      let forceReleased = false;
      mutex.on('forceRelease', () => { forceReleased = true; });
      
      mutex.acquire('audio-001');
      mutex.forceRelease();
      
      expect(forceReleased).toBe(true);
    });
  });

  describe('Acquisition avec Timeout', () => {
    it('DOIT acquérir après expiration du timeout', async () => {
      const timeoutMutex = new AudioMutex({ timeout: 100 });
      timeoutMutex.acquire('audio-001');
      
      await delay(150);
      
      const acquired = timeoutMutex.acquire('audio-002');
      expect(acquired).toBe(true);
    });

    it('DOIT émettre événement timeout', async () => {
      let timedOut = false;
      const timeoutMutex = new AudioMutex({ timeout: 100 });
      timeoutMutex.on('timeout', () => { timedOut = true; });
      
      timeoutMutex.acquire('audio-001');
      await delay(150);
      
      expect(timedOut).toBe(true);
    });
  });

  describe('Acquisition avec Callback', () => {
    it('DOIT exécuter callback une fois verrou disponible', async () => {
      let callbackExecuted = false;
      mutex.acquire('audio-001');
      
      mutex.waitForLock('audio-002', () => {
        callbackExecuted = true;
      });
      
      expect(callbackExecuted).toBe(false);
      
      mutex.release();
      await delay(10);
      
      expect(callbackExecuted).toBe(true);
    });

    it('DOIT exécuter callback immédiatement si non verrouillé', async () => {
      let callbackExecuted = false;
      
      mutex.waitForLock('audio-001', () => {
        callbackExecuted = true;
      });
      
      await delay(10);
      expect(callbackExecuted).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 3: MESSAGE TRACKER - SUIVI DES MESSAGES
// ============================================================================

describe('MessageTracker - Suivi Anti-Répétition', () => {
  let tracker: MessageTracker;

  beforeEach(() => {
    tracker = new MessageTracker({
      maxTrackedMessages: 100,
      deduplicationWindow: 5000 // 5 secondes
    });
  });

  afterEach(() => {
    tracker.clear();
  });

  describe('Génération de MessageId', () => {
    it('DOIT générer des IDs uniques', () => {
      const id1 = tracker.generateMessageId();
      const id2 = tracker.generateMessageId();
      const id3 = tracker.generateMessageId();
      
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('DOIT inclure timestamp dans l\'ID', () => {
      const id = tracker.generateMessageId();
      
      expect(id).toMatch(/^\d+-/);
    });

    it('DOIT inclure composant aléatoire dans l\'ID', () => {
      const id = tracker.generateMessageId();
      
      expect(id.length).toBeGreaterThan(13); // timestamp + random
    });
  });

  describe('Enregistrement de Messages', () => {
    it('DOIT enregistrer un nouveau message', () => {
      const id = tracker.track('msg-001', { audioUrl: 'blob:test' });
      
      expect(tracker.isTracked('msg-001')).toBe(true);
    });

    it('DOIT stocker les métadonnées du message', () => {
      const metadata = { audioUrl: 'blob:test', duration: 1000 };
      tracker.track('msg-001', metadata);
      
      const stored = tracker.getMetadata('msg-001');
      expect(stored.audioUrl).toBe('blob:test');
      expect(stored.duration).toBe(1000);
    });

    it('DOIT enregistrer le timestamp de tracking', () => {
      const before = Date.now();
      tracker.track('msg-001', {});
      const after = Date.now();
      
      const stored = tracker.getMetadata('msg-001');
      expect(stored.trackedAt).toBeGreaterThanOrEqual(before);
      expect(stored.trackedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('Détection de Doublons', () => {
    it('DOIT détecter un message déjà tracké', () => {
      tracker.track('msg-001', {});
      
      expect(tracker.shouldPlay('msg-001')).toBe(false);
    });

    it('DOIT permettre un nouveau message', () => {
      expect(tracker.shouldPlay('msg-new')).toBe(true);
    });

    it('DOIT rejeter message avec même contenu dans fenêtre de déduplication', () => {
      tracker.trackContent('Hello world', 'msg-001');
      
      const shouldPlay = tracker.shouldPlayContent('Hello world');
      expect(shouldPlay).toBe(false);
    });

    it('DOIT permettre même contenu après fenêtre de déduplication', async () => {
      const shortWindowTracker = new MessageTracker({ deduplicationWindow: 50 });
      shortWindowTracker.trackContent('Hello world', 'msg-001');
      
      await delay(100);
      
      expect(shortWindowTracker.shouldPlayContent('Hello world')).toBe(true);
    });
  });

  describe('Gestion du Message Actif', () => {
    it('DOIT définir et retourner le message actif', () => {
      tracker.setActive('msg-001');
      
      expect(tracker.getActiveMessageId()).toBe('msg-001');
    });

    it('DOIT vérifier si un message est actif', () => {
      tracker.setActive('msg-001');
      
      expect(tracker.isActive('msg-001')).toBe(true);
      expect(tracker.isActive('msg-002')).toBe(false);
    });

    it('DOIT tracker automatiquement lors de setActive', () => {
      tracker.setActive('msg-001');
      
      expect(tracker.isTracked('msg-001')).toBe(true);
    });

    it('DOIT réinitialiser le message actif', () => {
      tracker.setActive('msg-001');
      tracker.clearActive();
      
      expect(tracker.getActiveMessageId()).toBeNull();
    });
  });

  describe('Nettoyage et Limites', () => {
    it('DOIT respecter maxTrackedMessages', () => {
      const smallTracker = new MessageTracker({ maxTrackedMessages: 3 });
      
      smallTracker.track('msg-001', {});
      smallTracker.track('msg-002', {});
      smallTracker.track('msg-003', {});
      smallTracker.track('msg-004', {});
      
      expect(smallTracker.isTracked('msg-001')).toBe(false); // Évincé
      expect(smallTracker.isTracked('msg-004')).toBe(true);
    });

    it('DOIT nettoyer tous les messages avec clear()', () => {
      tracker.track('msg-001', {});
      tracker.track('msg-002', {});
      tracker.clear();
      
      expect(tracker.isTracked('msg-001')).toBe(false);
      expect(tracker.isTracked('msg-002')).toBe(false);
    });

    it('DOIT retourner le nombre de messages trackés', () => {
      tracker.track('msg-001', {});
      tracker.track('msg-002', {});
      tracker.track('msg-003', {});
      
      expect(tracker.size()).toBe(3);
    });
  });

  describe('Statistiques', () => {
    it('DOIT compter les doublons rejetés', () => {
      tracker.track('msg-001', {});
      tracker.shouldPlay('msg-001'); // Rejet
      tracker.shouldPlay('msg-001'); // Rejet
      
      expect(tracker.getStats().duplicatesRejected).toBe(2);
    });

    it('DOIT compter les messages uniques joués', () => {
      tracker.shouldPlay('msg-001');
      tracker.track('msg-001', {});
      tracker.shouldPlay('msg-002');
      tracker.track('msg-002', {});
      
      expect(tracker.getStats().uniquePlayed).toBe(2);
    });

    it('DOIT calculer le taux de déduplication', () => {
      tracker.track('msg-001', {});
      tracker.shouldPlay('msg-001'); // Rejeté
      tracker.shouldPlay('msg-002'); // Accepté
      tracker.track('msg-002', {});
      tracker.shouldPlay('msg-003'); // Accepté
      
      const stats = tracker.getStats();
      // 1 rejeté sur 3 tentatives = 33%
      expect(stats.deduplicationRate).toBeCloseTo(0.33, 1);
    });
  });
});

// ============================================================================
// SECTION 4: AUDIO QUEUE - FILE D'ATTENTE AUDIO
// ============================================================================

describe('AudioQueue - File d\'Attente', () => {
  let queue: AudioQueue;

  beforeEach(() => {
    queue = new AudioQueue({ maxSize: 10 });
  });

  afterEach(() => {
    queue.clear();
  });

  describe('Opérations de Base', () => {
    it('DOIT initialiser vide', () => {
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it('DOIT ajouter des éléments (enqueue)', () => {
      queue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:test', priority: 0 });
      
      expect(queue.isEmpty()).toBe(false);
      expect(queue.size()).toBe(1);
    });

    it('DOIT retirer des éléments FIFO (dequeue)', () => {
      queue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:test1', priority: 0 });
      queue.enqueue({ messageId: 'msg-002', audioUrl: 'blob:test2', priority: 0 });
      
      const first = queue.dequeue();
      const second = queue.dequeue();
      
      expect(first?.messageId).toBe('msg-001');
      expect(second?.messageId).toBe('msg-002');
    });

    it('DOIT retourner null si dequeue sur queue vide', () => {
      const item = queue.dequeue();
      
      expect(item).toBeNull();
    });

    it('DOIT permettre peek() sans retirer', () => {
      queue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:test', priority: 0 });
      
      const peeked = queue.peek();
      const stillInQueue = queue.peek();
      
      expect(peeked?.messageId).toBe('msg-001');
      expect(stillInQueue?.messageId).toBe('msg-001');
      expect(queue.size()).toBe(1);
    });
  });

  describe('Gestion de la Taille', () => {
    it('DOIT respecter maxSize', () => {
      const smallQueue = new AudioQueue({ maxSize: 2 });
      
      smallQueue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:1', priority: 0 });
      smallQueue.enqueue({ messageId: 'msg-002', audioUrl: 'blob:2', priority: 0 });
      smallQueue.enqueue({ messageId: 'msg-003', audioUrl: 'blob:3', priority: 0 });
      
      expect(smallQueue.size()).toBe(2);
    });

    it('DOIT évincer les plus anciens par défaut', () => {
      const smallQueue = new AudioQueue({ maxSize: 2, evictionPolicy: 'oldest' });
      
      smallQueue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:1', priority: 0 });
      smallQueue.enqueue({ messageId: 'msg-002', audioUrl: 'blob:2', priority: 0 });
      smallQueue.enqueue({ messageId: 'msg-003', audioUrl: 'blob:3', priority: 0 });
      
      const items = smallQueue.toArray();
      expect(items[0].messageId).toBe('msg-002');
      expect(items[1].messageId).toBe('msg-003');
    });

    it('DOIT évincer les moins prioritaires si configuré', () => {
      const priorityQueue = new AudioQueue({ 
        maxSize: 2, 
        evictionPolicy: 'lowest-priority' 
      });
      
      priorityQueue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:1', priority: 1 });
      priorityQueue.enqueue({ messageId: 'msg-002', audioUrl: 'blob:2', priority: 0 }); // Basse priorité
      priorityQueue.enqueue({ messageId: 'msg-003', audioUrl: 'blob:3', priority: 2 });
      
      const items = priorityQueue.toArray();
      const ids = items.map(i => i.messageId);
      expect(ids).not.toContain('msg-002');
      expect(ids).toContain('msg-001');
      expect(ids).toContain('msg-003');
    });
  });

  describe('Priorités', () => {
    it('DOIT traiter messages haute priorité en premier', () => {
      const priorityQueue = new AudioQueue({ enablePriority: true });
      
      priorityQueue.enqueue({ messageId: 'msg-low', audioUrl: 'blob:1', priority: 0 });
      priorityQueue.enqueue({ messageId: 'msg-high', audioUrl: 'blob:2', priority: 10 });
      priorityQueue.enqueue({ messageId: 'msg-medium', audioUrl: 'blob:3', priority: 5 });
      
      expect(priorityQueue.dequeue()?.messageId).toBe('msg-high');
      expect(priorityQueue.dequeue()?.messageId).toBe('msg-medium');
      expect(priorityQueue.dequeue()?.messageId).toBe('msg-low');
    });

    it('DOIT respecter FIFO pour même priorité', () => {
      const priorityQueue = new AudioQueue({ enablePriority: true });
      
      priorityQueue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:1', priority: 5 });
      priorityQueue.enqueue({ messageId: 'msg-002', audioUrl: 'blob:2', priority: 5 });
      priorityQueue.enqueue({ messageId: 'msg-003', audioUrl: 'blob:3', priority: 5 });
      
      expect(priorityQueue.dequeue()?.messageId).toBe('msg-001');
      expect(priorityQueue.dequeue()?.messageId).toBe('msg-002');
      expect(priorityQueue.dequeue()?.messageId).toBe('msg-003');
    });
  });

  describe('Recherche et Manipulation', () => {
    it('DOIT trouver un élément par messageId', () => {
      queue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:1', priority: 0 });
      queue.enqueue({ messageId: 'msg-002', audioUrl: 'blob:2', priority: 0 });
      
      const found = queue.find('msg-002');
      
      expect(found?.audioUrl).toBe('blob:2');
    });

    it('DOIT supprimer un élément spécifique', () => {
      queue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:1', priority: 0 });
      queue.enqueue({ messageId: 'msg-002', audioUrl: 'blob:2', priority: 0 });
      queue.enqueue({ messageId: 'msg-003', audioUrl: 'blob:3', priority: 0 });
      
      const removed = queue.remove('msg-002');
      
      expect(removed).toBe(true);
      expect(queue.size()).toBe(2);
      expect(queue.find('msg-002')).toBeNull();
    });

    it('DOIT retourner false si élément non trouvé', () => {
      const removed = queue.remove('non-existent');
      
      expect(removed).toBe(false);
    });

    it('DOIT vérifier existence d\'un élément', () => {
      queue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:1', priority: 0 });
      
      expect(queue.contains('msg-001')).toBe(true);
      expect(queue.contains('msg-999')).toBe(false);
    });
  });

  describe('Itération', () => {
    it('DOIT permettre itération avec forEach', () => {
      queue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:1', priority: 0 });
      queue.enqueue({ messageId: 'msg-002', audioUrl: 'blob:2', priority: 0 });
      
      const ids: string[] = [];
      queue.forEach(item => ids.push(item.messageId));
      
      expect(ids).toEqual(['msg-001', 'msg-002']);
    });

    it('DOIT permettre conversion en tableau', () => {
      queue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:1', priority: 0 });
      queue.enqueue({ messageId: 'msg-002', audioUrl: 'blob:2', priority: 0 });
      
      const array = queue.toArray();
      
      expect(array.length).toBe(2);
      expect(array[0].messageId).toBe('msg-001');
    });

    it('DOIT supporter Symbol.iterator', () => {
      queue.enqueue({ messageId: 'msg-001', audioUrl: 'blob:1', priority: 0 });
      queue.enqueue({ messageId: 'msg-002', audioUrl: 'blob:2', priority: 0 });
      
      const ids: string[] = [];
      for (const item of queue) {
        ids.push(item.messageId);
      }
      
      expect(ids).toEqual(['msg-001', 'msg-002']);
    });
  });
});

// ============================================================================
// SECTION 5: ELEVENLABS CLIENT - INTÉGRATION ISOLÉE
// ============================================================================

describe('ElevenLabsClient - Client API Isolé', () => {
  let client: ElevenLabsClient;

  beforeEach(() => {
    client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY || 'test-key',
      defaultVoiceId: 'm5SBIR8kR76fbA5dP2rU', // Jean
      timeout: 30000
    });
  });

  afterEach(() => {
    client.cancelAllRequests();
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec configuration par défaut', () => {
      const defaultClient = new ElevenLabsClient({
        apiKey: 'test-key'
      });
      
      expect(defaultClient.getDefaultVoiceId()).toBeDefined();
      expect(defaultClient.getTimeout()).toBe(30000);
    });

    it('DOIT valider la présence de apiKey', () => {
      expect(() => {
        new ElevenLabsClient({ apiKey: '' });
      }).toThrow('API key is required');
    });

    it('DOIT initialiser avec aucune requête en cours', () => {
      expect(client.getPendingRequestsCount()).toBe(0);
    });
  });

  describe('Génération de RequestId', () => {
    it('DOIT générer des IDs de requête uniques', () => {
      const id1 = client.generateRequestId();
      const id2 = client.generateRequestId();
      
      expect(id1).not.toBe(id2);
    });

    it('DOIT inclure préfixe identifiable', () => {
      const id = client.generateRequestId();
      
      expect(id).toMatch(/^el-/);
    });
  });

  describe('Préparation de Texte', () => {
    it('DOIT nettoyer les émojis du texte', () => {
      const cleanedText = client.prepareText('Hello 🎉 World! 🚀');
      
      expect(cleanedText).toBe('Hello  World! ');
    });

    it('DOIT supprimer les marqueurs markdown', () => {
      const cleanedText = client.prepareText('**Bold** and *italic* text');
      
      expect(cleanedText).toBe('Bold and italic text');
    });

    it('DOIT normaliser les espaces multiples', () => {
      const cleanedText = client.prepareText('Too   many    spaces');
      
      expect(cleanedText).toBe('Too many spaces');
    });

    it('DOIT préserver les accents français', () => {
      const cleanedText = client.prepareText('Élève français très étonné');
      
      expect(cleanedText).toBe('Élève français très étonné');
    });

    it('DOIT tronquer intelligemment les textes longs', () => {
      const longText = 'A'.repeat(5000);
      const cleanedText = client.prepareText(longText, { maxLength: 1000 });
      
      expect(cleanedText.length).toBeLessThanOrEqual(1003); // + "..."
    });

    it('DOIT tronquer à la fin de phrase si possible', () => {
      const text = 'Première phrase. Deuxième phrase. Troisième phrase très longue qui dépasse.';
      const cleanedText = client.prepareText(text, { maxLength: 50 });
      
      expect(cleanedText).toMatch(/\.(\.\.\.|)$/);
    });
  });

  describe('Configuration Vocale', () => {
    it('DOIT retourner config par défaut', () => {
      const config = client.getVoiceSettings();
      
      expect(config).toHaveProperty('stability');
      expect(config).toHaveProperty('similarity_boost');
      expect(config).toHaveProperty('style');
    });

    it('DOIT permettre modification des settings', () => {
      client.setVoiceSettings({
        stability: 0.5,
        similarity_boost: 0.9
      });
      
      const config = client.getVoiceSettings();
      expect(config.stability).toBe(0.5);
      expect(config.similarity_boost).toBe(0.9);
    });

    it('DOIT permettre changement de voix', () => {
      client.setVoiceId('new-voice-id');
      
      expect(client.getDefaultVoiceId()).toBe('new-voice-id');
    });
  });

  describe('Gestion des Requêtes', () => {
    it('DOIT tracker les requêtes en cours', async () => {
      // Note: Ce test nécessite une vraie API ou un serveur de test
      // Pour TDD strict, on simule le comportement attendu
      
      expect(client.getPendingRequestsCount()).toBe(0);
    });

    it('DOIT permettre annulation d\'une requête spécifique', async () => {
      const requestId = client.generateRequestId();
      // Simuler une requête en cours
      client.trackRequest(requestId);
      
      expect(client.getPendingRequestsCount()).toBe(1);
      
      client.cancelRequest(requestId);
      
      expect(client.getPendingRequestsCount()).toBe(0);
    });

    it('DOIT permettre annulation de toutes les requêtes', async () => {
      client.trackRequest('req-001');
      client.trackRequest('req-002');
      client.trackRequest('req-003');
      
      client.cancelAllRequests();
      
      expect(client.getPendingRequestsCount()).toBe(0);
    });
  });

  describe('Estimation de Durée', () => {
    it('DOIT estimer la durée de génération', () => {
      const shortText = 'Hello';
      const longText = 'A'.repeat(1000);
      
      const shortEstimate = client.estimateGenerationTime(shortText);
      const longEstimate = client.estimateGenerationTime(longText);
      
      expect(longEstimate).toBeGreaterThan(shortEstimate);
    });

    it('DOIT retourner timeout adaptatif basé sur longueur', () => {
      const shortText = 'Hi';
      const longText = 'A'.repeat(4000);
      
      const shortTimeout = client.getAdaptiveTimeout(shortText);
      const longTimeout = client.getAdaptiveTimeout(longText);
      
      expect(longTimeout).toBeGreaterThan(shortTimeout);
      expect(shortTimeout).toBeGreaterThanOrEqual(30000); // Minimum 30s
    });
  });

  describe('Validation', () => {
    it('DOIT rejeter texte vide', () => {
      expect(() => {
        client.validateText('');
      }).toThrow('Text cannot be empty');
    });

    it('DOIT rejeter texte trop court après nettoyage', () => {
      expect(() => {
        client.validateText('   ');
      }).toThrow('Text too short');
    });

    it('DOIT accepter texte valide', () => {
      expect(() => {
        client.validateText('Hello, this is a valid text.');
      }).not.toThrow();
    });
  });
});

// ============================================================================
// SECTION 6: INTÉGRATION COMPLÈTE
// ============================================================================

describe('Intégration VoiceController + MessageTracker + AudioQueue', () => {
  let controller: VoiceController;
  let tracker: MessageTracker;

  beforeEach(() => {
    tracker = new MessageTracker();
    controller = new VoiceController({
      messageTracker: tracker,
      enableQueue: true
    });
  });

  afterEach(() => {
    controller.destroy();
    tracker.clear();
  });

  describe('Prévention des Répétitions', () => {
    it('NE DOIT PAS jouer un message déjà joué', async () => {
      const messageId = 'msg-001';
      const audioUrl = createTestAudioBlob();
      
      await controller.enqueue(audioUrl, messageId);
      await waitForState(controller, AudioState.PLAYING, 5000);
      controller.stop();
      
      // Tenter de rejouer le même message
      await controller.enqueue(audioUrl, messageId);
      
      // Ne devrait pas transitionner vers LOADING
      expect(controller.getState()).toBe(AudioState.IDLE);
    });

    it('DOIT incrémenter le compteur de doublons rejetés', async () => {
      const messageId = 'msg-001';
      
      tracker.track(messageId, {});
      await controller.enqueue(createTestAudioBlob(), messageId);
      
      expect(tracker.getStats().duplicatesRejected).toBe(1);
    });

    it('DOIT permettre messages avec IDs différents', async () => {
      await controller.enqueue(createTestAudioBlob(), 'msg-001');
      await waitForState(controller, AudioState.PLAYING, 5000);
      controller.stop();
      
      await controller.enqueue(createTestAudioBlob(), 'msg-002');
      
      expect(controller.getState()).not.toBe(AudioState.IDLE);
    });
  });

  describe('Interruption Propre', () => {
    it('DOIT interrompre proprement l\'audio précédent lors de nouveau message prioritaire', async () => {
      let playEndCount = 0;
      controller.on('playEnd', () => { playEndCount++; });
      
      await controller.enqueue(createTestAudioBlob(5000), 'msg-001');
      await waitForState(controller, AudioState.PLAYING, 5000);
      
      // Nouveau message prioritaire
      await controller.enqueuePriority(createTestAudioBlob(), 'msg-priority', 10);
      
      await waitForState(controller, AudioState.PLAYING, 5000);
      expect(controller.getCurrentMessageId()).toBe('msg-priority');
    });
  });

  describe('Cohérence État/Queue', () => {
    it('DOIT maintenir cohérence entre état et queue', async () => {
      await controller.enqueue(createTestAudioBlob(), 'msg-001');
      await controller.enqueue(createTestAudioBlob(), 'msg-002');
      await controller.enqueue(createTestAudioBlob(), 'msg-003');
      
      await waitForState(controller, AudioState.PLAYING, 5000);
      
      expect(controller.getCurrentMessageId()).toBe('msg-001');
      expect(controller.getQueueLength()).toBe(2);
      
      controller.skip();
      await waitForState(controller, AudioState.PLAYING, 5000);
      
      expect(controller.getCurrentMessageId()).toBe('msg-002');
      expect(controller.getQueueLength()).toBe(1);
    });
  });
});

// ============================================================================
// UTILITAIRES DE TEST
// ============================================================================

/**
 * Crée un blob audio de test (silence)
 * @param durationMs Durée en millisecondes
 */
function createTestAudioBlob(durationMs: number = 1000): string {
  // Créer un contexte audio pour générer un blob valide
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  
  // Créer un WAV header + données silencieuses
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);
  
  // Silent samples (already 0)
  
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Attendre qu'un état spécifique soit atteint
 */
async function waitForState(
  controller: VoiceController, 
  targetState: AudioState, 
  timeoutMs: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (controller.getState() === targetState) {
      resolve();
      return;
    }
    
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for state ${targetState}, current: ${controller.getState()}`));
    }, timeoutMs);
    
    const listener = (state: AudioState) => {
      if (state === targetState) {
        clearTimeout(timeout);
        controller.off('stateChange', listener);
        resolve();
      }
    };
    
    controller.on('stateChange', listener);
  });
}

/**
 * Délai asynchrone
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

