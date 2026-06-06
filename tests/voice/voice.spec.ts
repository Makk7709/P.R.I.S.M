/**
 * Tests unitaires pour l'analyse vocale PRISM
 * Couverture complète : prosodie, sentiment, intégration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VoiceAnalyzer } from '../../src/modules/voice/VoiceAnalyzer.js';
import { VoiceSentimentDetector } from '../../src/modules/voice/VoiceSentimentDetector.js';

describe('VoiceAnalyzer - Analyse Prosodique', () => {
  let analyzer;
  
  beforeEach(() => {
    analyzer = new VoiceAnalyzer({
      sampleRate: 44100,
      windowSize: 2048,
      pitchRange: { min: 80, max: 400 },
      volumeRange: { min: -60, max: 0 }
    });
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec configuration par défaut', () => {
      expect(analyzer.config.sampleRate).toBe(44100);
      expect(analyzer.config.pitchRange.min).toBe(80);
      expect(analyzer.config.pitchRange.max).toBe(400);
      expect(analyzer.config.volumeRange.min).toBe(-60);
      expect(analyzer.config.volumeRange.max).toBe(0);
    });

    it('DOIT initialiser avec configuration personnalisée', () => {
      const customConfig = {
        sampleRate: 48000,
        pitchRange: { min: 100, max: 500 }
      };
      const customAnalyzer = new VoiceAnalyzer(customConfig);
      
      expect(customAnalyzer.config.sampleRate).toBe(48000);
      expect(customAnalyzer.config.pitchRange.min).toBe(100);
      expect(customAnalyzer.config.pitchRange.max).toBe(500);
    });

    it('DOIT initialiser les buffers et historiques vides', () => {
      expect(analyzer.audioBuffer).toEqual([]);
      expect(analyzer.pitchHistory).toEqual([]);
      expect(analyzer.volumeHistory).toEqual([]);
      expect(analyzer.sentimentHistory).toEqual([]);
    });
  });

  describe('Analyse Prosodique - Pitch', () => {
    it('DOIT calculer pitch pour signal sinusoïdal', () => {
      // Signal 440Hz (La3)
      const sampleRate = 44100;
      const frequency = 440;
      const duration = 0.1; // 100ms
      const samples = Math.floor(sampleRate * duration);
      const audioData = new Float32Array(samples);
      
      for (let i = 0; i < samples; i++) {
        audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
      }
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.pitch).toBeGreaterThan(400);
      expect(prosody.pitch).toBeLessThan(500);
    });

    it('DOIT gérer signal vide gracieusement', () => {
      const emptyData = new Float32Array(0);
      const prosody = analyzer.analyzeProsody(emptyData);
      
      expect(prosody.pitch).toBe(150); // Valeur par défaut
      expect(prosody.volume).toBe(-30);
      expect(prosody.tempo).toBe(120);
    });

    it('DOIT limiter pitch dans la plage vocale', () => {
      // Signal très grave (50Hz)
      const audioData = new Float32Array(1024);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(2 * Math.PI * 50 * i / 44100);
      }
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.pitch).toBeGreaterThanOrEqual(80);
      expect(prosody.pitch).toBeLessThanOrEqual(400);
    });

    it('DOIT mettre à jour l\'historique pitch', () => {
      const audioData = new Float32Array(1024);
      audioData.fill(0.1);
      
      analyzer.analyzeProsody(audioData);
      
      expect(analyzer.pitchHistory.length).toBe(1);
      expect(typeof analyzer.pitchHistory[0]).toBe('number');
    });
  });

  describe('Analyse Prosodique - Volume', () => {
    it('DOIT calculer volume RMS correctement', () => {
      const audioData = new Float32Array(1024);
      audioData.fill(0.5); // Signal constant à 0.5
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.volume).toBeGreaterThan(-20);
      expect(prosody.volume).toBeLessThan(0);
    });

    it('DOIT gérer signal silencieux', () => {
      const audioData = new Float32Array(1024);
      audioData.fill(0); // Signal silencieux
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.volume).toBeLessThan(-50);
    });

    it('DOIT limiter volume dans la plage configurée', () => {
      const audioData = new Float32Array(1024);
      audioData.fill(10); // Signal très fort
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.volume).toBeGreaterThanOrEqual(-60);
      expect(prosody.volume).toBeLessThanOrEqual(0);
    });
  });

  describe('Analyse Prosodique - Tempo', () => {
    it('DOIT calculer tempo pour signal rythmé', () => {
      // Signal avec pulsations à 120 BPM
      const audioData = new Float32Array(4410); // 0.1s à 44.1kHz
      const beatInterval = Math.floor(44100 * 60 / 120 / 4); // Quart de note
      
      for (let i = 0; i < audioData.length; i++) {
        if (i % beatInterval < 100) {
          audioData[i] = 0.8; // Pulsation
        } else {
          audioData[i] = 0.1; // Silence relatif
        }
      }
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.tempo).toBeGreaterThan(100);
      expect(prosody.tempo).toBeLessThan(150);
    });

    it('DOIT retourner tempo par défaut pour signal non rythmé', () => {
      const audioData = new Float32Array(1024);
      audioData.fill(0.1); // Signal constant
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.tempo).toBe(120); // Valeur par défaut
    });
  });

  describe('Analyse Prosodique - Rythme', () => {
    it('DOIT calculer régularité pour signal régulier', () => {
      // Signal avec pulsations régulières
      const audioData = new Float32Array(4410);
      const beatInterval = 1000; // Pulsations très régulières
      
      for (let i = 0; i < audioData.length; i++) {
        if (i % beatInterval < 100) {
          audioData[i] = 0.8;
        } else {
          audioData[i] = 0.1;
        }
      }
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.rhythm).toBeGreaterThan(0.5);
      expect(prosody.rhythm).toBeLessThanOrEqual(1);
    });

    it('DOIT détecter rythme irrégulier', () => {
      // Signal avec pulsations irrégulières
      const audioData = new Float32Array(4410);
      const intervals = [800, 1200, 900, 1500]; // Intervalles variables
      let position = 0;
      
      intervals.forEach(interval => {
        for (let i = 0; i < 100 && position < audioData.length; i++) {
          audioData[position + i] = 0.8;
        }
        position += interval;
      });
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.rhythm).toBeLessThan(0.7);
      expect(prosody.rhythm).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Analyse Prosodique - Stress', () => {
    it('DOIT détecter stress vocal élevé', () => {
      // Signal avec pitch élevé et volume fort
      const audioData = new Float32Array(1024);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = 0.8 * Math.sin(2 * Math.PI * 300 * i / 44100); // Pitch élevé
      }
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.stress).toBeGreaterThan(0.3);
    });

    it('DOIT détecter stress faible pour voix calme', () => {
      // Signal avec pitch bas et volume faible
      const audioData = new Float32Array(1024);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = 0.2 * Math.sin(2 * Math.PI * 120 * i / 44100); // Pitch bas
      }
      
      const prosody = analyzer.analyzeProsody(audioData);
      
      expect(prosody.stress).toBeLessThan(0.4);
    });
  });

  describe('Analyse Sentiment', () => {
    it('DOIT analyser sentiment positif', () => {
      const prosodyFeatures = {
        pitch: 180,
        volume: -25,
        tempo: 130,
        rhythm: 0.7,
        stress: 0.3
      };
      
      const sentiment = analyzer.analyzeSentiment(prosodyFeatures, 'Excellent travail !');
      
      expect(sentiment.category).toBe('positive');
      expect(sentiment.score).toBeGreaterThan(0);
      expect(sentiment.confidence).toBeGreaterThan(0.3);
    });

    it('DOIT analyser sentiment négatif', () => {
      const prosodyFeatures = {
        pitch: 120,
        volume: -35,
        tempo: 90,
        rhythm: 0.4,
        stress: 0.6
      };
      
      const sentiment = analyzer.analyzeSentiment(prosodyFeatures, 'C\'est terrible');
      
      expect(sentiment.category).toBe('negative');
      expect(sentiment.score).toBeLessThan(0);
      expect(sentiment.confidence).toBeGreaterThan(0.3);
    });

    it('DOIT analyser sentiment neutre', () => {
      const prosodyFeatures = {
        pitch: 150,
        volume: -30,
        tempo: 120,
        rhythm: 0.6,
        stress: 0.4
      };
      
      const sentiment = analyzer.analyzeSentiment(prosodyFeatures, 'Bonjour comment allez-vous');
      
      expect(sentiment.category).toBe('neutral');
      expect(Math.abs(sentiment.score)).toBeLessThan(0.3);
    });

    it('DOIT gérer analyse sentiment sans texte', () => {
      const prosodyFeatures = {
        pitch: 160,
        volume: -28,
        tempo: 115,
        rhythm: 0.5,
        stress: 0.3
      };
      
      const sentiment = analyzer.analyzeSentiment(prosodyFeatures);
      
      expect(sentiment).toHaveProperty('score');
      expect(sentiment).toHaveProperty('category');
      expect(sentiment).toHaveProperty('confidence');
      expect(sentiment).toHaveProperty('timestamp');
    });
  });

  describe('Analyse Complète', () => {
    it('DOIT effectuer analyse complète audio + texte', () => {
      const audioData = new Float32Array(1024);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = 0.3 * Math.sin(2 * Math.PI * 200 * i / 44100);
      }
      
      const analysis = analyzer.analyzeComplete(audioData, 'Parfait !');
      
      expect(analysis).toHaveProperty('prosody');
      expect(analysis).toHaveProperty('sentiment');
      expect(analysis).toHaveProperty('timestamp');
      expect(analysis).toHaveProperty('audioLength');
      
      expect(analysis.prosody).toHaveProperty('pitch');
      expect(analysis.prosody).toHaveProperty('volume');
      expect(analysis.prosody).toHaveProperty('tempo');
      expect(analysis.prosody).toHaveProperty('rhythm');
      expect(analysis.prosody).toHaveProperty('stress');
      
      expect(analysis.sentiment).toHaveProperty('score');
      expect(analysis.sentiment).toHaveProperty('category');
      expect(analysis.sentiment).toHaveProperty('confidence');
    });
  });

  describe('Gestion Historique', () => {
    it('DOIT limiter historique à 100 échantillons', () => {
      const audioData = new Float32Array(1024);
      audioData.fill(0.1);
      
      // Ajouter 150 échantillons
      for (let i = 0; i < 150; i++) {
        analyzer.analyzeProsody(audioData);
      }
      
      expect(analyzer.pitchHistory.length).toBe(100);
      expect(analyzer.volumeHistory.length).toBe(100);
    });

    it('DOIT retourner historique complet', () => {
      const audioData = new Float32Array(1024);
      audioData.fill(0.1);
      
      analyzer.analyzeProsody(audioData);
      const history = analyzer.getHistory();
      
      expect(history).toHaveProperty('pitchHistory');
      expect(history).toHaveProperty('volumeHistory');
      expect(history).toHaveProperty('sentimentHistory');
      expect(history).toHaveProperty('lastUpdate');
    });

    it('DOIT réinitialiser historique', () => {
      const audioData = new Float32Array(1024);
      audioData.fill(0.1);
      
      analyzer.analyzeProsody(audioData);
      analyzer.resetHistory();
      
      expect(analyzer.pitchHistory.length).toBe(0);
      expect(analyzer.volumeHistory.length).toBe(0);
      expect(analyzer.sentimentHistory.length).toBe(0);
    });
  });
});

describe('VoiceSentimentDetector - Détection Émotionnelle', () => {
  let detector;
  
  beforeEach(() => {
    detector = new VoiceSentimentDetector({
      emotionCategories: ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'],
      prosodyWeights: {
        pitch: 0.3,
        volume: 0.2,
        tempo: 0.2,
        rhythm: 0.15,
        stress: 0.15
      }
    });
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec configuration par défaut', () => {
      expect(detector.config.emotionCategories).toContain('joy');
      expect(detector.config.emotionCategories).toContain('sadness');
      expect(detector.config.emotionCategories).toContain('anger');
      expect(detector.config.prosodyWeights.pitch).toBe(0.3);
    });

    it('DOIT construire lexique émotionnel', () => {
      expect(detector.emotionLexicon).toHaveProperty('joyeux');
      expect(detector.emotionLexicon).toHaveProperty('triste');
      expect(detector.emotionLexicon).toHaveProperty('énervé');
      expect(detector.emotionLexicon['joyeux'].emotion).toBe('joy');
      expect(detector.emotionLexicon['joyeux'].intensity).toBeGreaterThan(0);
    });
  });

  describe('Détection Émotion Prosodie', () => {
    it('DOIT détecter joie à partir prosodie', () => {
      const prosodyFeatures = {
        pitch: 200,
        volume: -20,
        tempo: 140,
        rhythm: 0.8,
        stress: 0.3
      };
      
      const emotion = detector.detectEmotionFromProsody(prosodyFeatures);
      
      expect(emotion.emotion).toBe('joy');
      expect(emotion.confidence).toBeGreaterThan(0.3);
      expect(emotion.scores).toHaveProperty('joy');
      expect(emotion.scores.joy).toBeGreaterThan(emotion.scores.neutral);
    });

    it('DOIT détecter tristesse à partir prosodie', () => {
      const prosodyFeatures = {
        pitch: 110,
        volume: -40,
        tempo: 80,
        rhythm: 0.3,
        stress: 0.2
      };
      
      const emotion = detector.detectEmotionFromProsody(prosodyFeatures);
      
      expect(emotion.emotion).toBe('sadness');
      expect(emotion.confidence).toBeGreaterThan(0.3);
    });

    it('DOIT détecter colère à partir prosodie', () => {
      const prosodyFeatures = {
        pitch: 220,
        volume: -15,
        tempo: 120,
        rhythm: 0.3,
        stress: 0.8
      };
      
      const emotion = detector.detectEmotionFromProsody(prosodyFeatures);
      
      expect(emotion.emotion).toBe('anger');
      expect(emotion.confidence).toBeGreaterThan(0.3);
    });

    it('DOIT détecter neutralité pour caractéristiques moyennes', () => {
      const prosodyFeatures = {
        pitch: 150,
        volume: -25,
        tempo: 110,
        rhythm: 0.6,
        stress: 0.4
      };
      
      const emotion = detector.detectEmotionFromProsody(prosodyFeatures);
      
      expect(emotion.emotion).toBe('neutral');
    });
  });

  describe('Détection Émotion Texte', () => {
    it('DOIT détecter joie à partir vocabulaire', () => {
      const text = 'Je suis très content et heureux de ce résultat excellent !';
      
      const emotion = detector.detectEmotionFromText(text);
      
      expect(emotion.emotion).toBe('joy');
      expect(emotion.confidence).toBeGreaterThan(0.3);
      expect(emotion.vocabulary.joy).toBeGreaterThan(0);
    });

    it('DOIT détecter tristesse à partir vocabulaire', () => {
      const text = 'Je suis triste et déçu de cette perte terrible';
      
      const emotion = detector.detectEmotionFromText(text);
      
      expect(emotion.emotion).toBe('sadness');
      expect(emotion.confidence).toBeGreaterThan(0.3);
    });

    it('DOIT détecter colère à partir vocabulaire', () => {
      const text = 'Je suis vraiment énervé et furieux de cette situation !';
      
      const emotion = detector.detectEmotionFromText(text);
      
      expect(emotion.emotion).toBe('anger');
      expect(emotion.confidence).toBeGreaterThan(0.3);
    });

    it('DOIT analyser intensité textuelle', () => {
      const text = 'C\'est VRAIMENT TRÉS TRÈS génial !!!';
      
      const emotion = detector.detectEmotionFromText(text);
      
      expect(emotion.intensity).toBeGreaterThan(0.2);
    });

    it('DOIT gérer texte vide', () => {
      const emotion = detector.detectEmotionFromText('');
      
      expect(emotion.emotion).toBe('neutral');
      expect(emotion.confidence).toBe(0);
    });

    it('DOIT analyser indices contextuels', () => {
      const text = 'Je suis vraiment surpris par cette nouvelle inattendue';
      
      const emotion = detector.detectEmotionFromText(text);
      
      expect(emotion.context.surprise).toBeGreaterThan(0);
    });
  });

  describe('Détection Hybride', () => {
    it('DOIT fusionner prosodie et texte pour détection hybride', () => {
      const prosodyFeatures = {
        pitch: 180,
        volume: -25,
        tempo: 130,
        rhythm: 0.7,
        stress: 0.4
      };
      const text = 'C\'est parfait et excellent !';
      
      const emotion = detector.detectHybridEmotion(prosodyFeatures, text);
      
      expect(emotion).toHaveProperty('emotion');
      expect(emotion).toHaveProperty('confidence');
      expect(emotion).toHaveProperty('prosody');
      expect(emotion).toHaveProperty('text');
      expect(emotion).toHaveProperty('combinedScores');
      
      expect(emotion.prosody).toHaveProperty('emotion');
      expect(emotion.text).toHaveProperty('emotion');
    });

    it('DOIT pondérer prosodie et texte correctement', () => {
      const prosodyFeatures = {
        pitch: 120, // Prosodie triste
        volume: -40,
        tempo: 80,
        rhythm: 0.3,
        stress: 0.2
      };
      const text = 'Je suis très heureux !'; // Texte joyeux
      
      const emotion = detector.detectHybridEmotion(prosodyFeatures, text);
      
      // Prosodie devrait dominer (60% vs 40%)
      expect(emotion.combinedScores.sadness).toBeGreaterThan(emotion.combinedScores.joy);
    });

    it('DOIT mettre à jour historique émotionnel', () => {
      const prosodyFeatures = {
        pitch: 150,
        volume: -30,
        tempo: 120,
        rhythm: 0.5,
        stress: 0.3
      };
      const text = 'Test';
      
      detector.detectHybridEmotion(prosodyFeatures, text);
      
      expect(detector.emotionHistory.length).toBe(1);
      expect(detector.emotionHistory[0]).toHaveProperty('emotion');
    });
  });

  describe('Gestion Historique', () => {
    it('DOIT limiter historique émotionnel à 100 entrées', () => {
      const prosodyFeatures = {
        pitch: 150,
        volume: -30,
        tempo: 120,
        rhythm: 0.5,
        stress: 0.3
      };
      
      // Ajouter 150 détections
      for (let i = 0; i < 150; i++) {
        detector.detectHybridEmotion(prosodyFeatures, `Test ${i}`);
      }
      
      expect(detector.emotionHistory.length).toBe(100);
    });

    it('DOIT retourner historique émotionnel', () => {
      const prosodyFeatures = {
        pitch: 150,
        volume: -30,
        tempo: 120,
        rhythm: 0.5,
        stress: 0.3
      };
      
      detector.detectHybridEmotion(prosodyFeatures, 'Test');
      const history = detector.getEmotionHistory();
      
      expect(history.length).toBe(1);
      expect(history[0]).toHaveProperty('emotion');
    });

    it('DOIT réinitialiser historique', () => {
      const prosodyFeatures = {
        pitch: 150,
        volume: -30,
        tempo: 120,
        rhythm: 0.5,
        stress: 0.3
      };
      
      detector.detectHybridEmotion(prosodyFeatures, 'Test');
      detector.resetHistory();
      
      expect(detector.emotionHistory.length).toBe(0);
      expect(detector.contextHistory.length).toBe(0);
    });
  });

  describe('Robustesse et Gestion d\'Erreurs', () => {
    it('DOIT gérer erreurs prosodie gracieusement', () => {
      const invalidProsody = null;
      
      const emotion = detector.detectEmotionFromProsody(invalidProsody);
      
      expect(emotion.emotion).toBe('neutral');
      expect(emotion.confidence).toBe(0);
    });

    it('DOIT gérer erreurs texte gracieusement', () => {
      const emotion = detector.detectEmotionFromText(null);
      
      expect(emotion.emotion).toBe('neutral');
      expect(emotion.confidence).toBe(0);
    });

    it('DOIT gérer erreurs hybride gracieusement', () => {
      const emotion = detector.detectHybridEmotion(null, null);
      
      expect(emotion.emotion).toBe('neutral');
      expect(emotion.confidence).toBe(0);
    });
  });
});

describe('Intégration VoiceAnalyzer + VoiceSentimentDetector', () => {
  let analyzer;
  let detector;
  
  beforeEach(() => {
    analyzer = new VoiceAnalyzer();
    detector = new VoiceSentimentDetector();
  });

  it('DOIT analyser complètement un échantillon audio avec émotion', () => {
    // Signal simulé : voix joyeuse (pitch élevé, tempo rapide)
    const audioData = new Float32Array(2048);
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = 0.4 * Math.sin(2 * Math.PI * 200 * i / 44100);
    }
    const text = 'C\'est fantastique ! Je suis très content !';
    
    // Analyse prosodique
    const prosody = analyzer.analyzeProsody(audioData);
    
    // Détection émotionnelle hybride
    const emotion = detector.detectHybridEmotion(prosody, text);
    
    // Vérifications
    expect(prosody.pitch).toBeGreaterThan(150);
    expect(emotion.emotion).toBe('joy');
    expect(emotion.confidence).toBeGreaterThan(0.4);
    expect(emotion.prosody.emotion).toBe('joy');
    expect(emotion.text.emotion).toBe('joy');
  });

  it('DOIT gérer cas contradictoires prosodie/texte', () => {
    // Prosodie triste mais texte joyeux
    const audioData = new Float32Array(1024);
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = 0.2 * Math.sin(2 * Math.PI * 120 * i / 44100);
    }
    const text = 'Je suis super heureux !';
    
    const prosody = analyzer.analyzeProsody(audioData);
    const emotion = detector.detectHybridEmotion(prosody, text);
    
    // Prosodie devrait dominer légèrement
    expect(emotion.combinedScores.sadness).toBeGreaterThan(emotion.combinedScores.joy);
  });

  it('DOIT maintenir cohérence temporelle', () => {
    const audioData = new Float32Array(1024);
    audioData.fill(0.3);
    
    // Analyse séquentielle
    for (let i = 0; i < 5; i++) {
      const prosody = analyzer.analyzeProsody(audioData);
      const emotion = detector.detectHybridEmotion(prosody, 'Test cohérent');
      
      expect(emotion).toHaveProperty('emotion');
      expect(emotion).toHaveProperty('timestamp');
    }
    
    expect(analyzer.getHistory().pitchHistory.length).toBe(5);
    expect(detector.getEmotionHistory().length).toBe(5);
  });
});

describe('Performance et Optimisation', () => {
  let analyzer;
  
  beforeEach(() => {
    analyzer = new VoiceAnalyzer();
  });

  it('DOIT traiter signal audio en temps réel (< 50ms)', () => {
    const audioData = new Float32Array(2048);
    audioData.fill(0.3);
    
    const startTime = performance.now();
    analyzer.analyzeProsody(audioData);
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    expect(processingTime).toBeLessThan(50); // < 50ms
  });

  it('DOIT gérer signaux audio volumineux', () => {
    const largeAudioData = new Float32Array(44100); // 1 seconde
    largeAudioData.fill(0.2);
    
    expect(() => {
      analyzer.analyzeProsody(largeAudioData);
    }).not.toThrow();
  });

  it('DOIT optimiser mémoire avec historique limité', () => {
    const audioData = new Float32Array(1024);
    audioData.fill(0.3);
    
    // Ajouter beaucoup d'échantillons
    for (let i = 0; i < 200; i++) {
      analyzer.analyzeProsody(audioData);
    }
    
    // Vérifier que l'historique est limité
    expect(analyzer.pitchHistory.length).toBeLessThanOrEqual(100);
    expect(analyzer.volumeHistory.length).toBeLessThanOrEqual(100);
  });
});
