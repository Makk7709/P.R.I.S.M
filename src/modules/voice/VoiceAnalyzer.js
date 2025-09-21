/**
 * PRISM Voice Analyzer - Module d'analyse vocale avancée
 * Analyse prosodie, sentiment et caractéristiques audio en temps réel
 */

export class VoiceAnalyzer {
  constructor(config = {}) {
    this.config = {
      sampleRate: config.sampleRate || 44100,
      windowSize: config.windowSize || 2048,
      hopLength: config.hopLength || 512,
      pitchRange: config.pitchRange || { min: 80, max: 400 },
      volumeRange: config.volumeRange || { min: -60, max: 0 },
      sentimentThresholds: config.sentimentThresholds || {
        positive: 0.3,
        negative: -0.3
      },
      ...config
    };
    
    this.audioBuffer = [];
    this.pitchHistory = [];
    this.volumeHistory = [];
    this.sentimentHistory = [];
    this.prosodyFeatures = {
      pitch: 0,
      volume: 0,
      tempo: 0,
      rhythm: 0,
      stress: 0
    };
  }

  /**
   * Analyse les caractéristiques prosodiques d'un signal audio
   * @param {Float32Array} audioData - Données audio à analyser
   * @returns {Object} Caractéristiques prosodiques
   */
  analyzeProsody(audioData) {
    if (!audioData || audioData.length === 0) {
      return this.getDefaultProsodyFeatures();
    }

    const pitch = this.calculatePitch(audioData);
    const volume = this.calculateVolume(audioData);
    const tempo = this.calculateTempo(audioData);
    const rhythm = this.calculateRhythm(audioData);
    const stress = this.calculateStress(audioData);

    this.prosodyFeatures = { pitch, volume, tempo, rhythm, stress };
    
    // Mise à jour de l'historique
    this.pitchHistory.push(pitch);
    this.volumeHistory.push(volume);
    
    // Limiter l'historique à 100 échantillons
    if (this.pitchHistory.length > 100) {
      this.pitchHistory.shift();
      this.volumeHistory.shift();
    }

    return this.prosodyFeatures;
  }

  /**
   * Calcule la fréquence fondamentale (pitch) du signal
   * @param {Float32Array} audioData - Données audio
   * @returns {number} Fréquence en Hz
   */
  calculatePitch(audioData) {
    try {
      // Simulation d'analyse de pitch basée sur l'autocorrélation
      const autocorrelation = this.autocorrelate(audioData);
      const pitch = this.findPeakFrequency(autocorrelation);
      
      // Limiter dans la plage vocale humaine
      return Math.max(
        this.config.pitchRange.min,
        Math.min(this.config.pitchRange.max, pitch)
      );
    } catch (error) {
      console.warn('Erreur calcul pitch:', error);
      return 150; // Valeur par défaut
    }
  }

  /**
   * Calcule le volume RMS du signal
   * @param {Float32Array} audioData - Données audio
   * @returns {number} Volume en dB
   */
  calculateVolume(audioData) {
    try {
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i] * audioData[i];
      }
      const rms = Math.sqrt(sum / audioData.length);
      const db = 20 * Math.log10(rms + 1e-10); // Éviter log(0)
      
      return Math.max(
        this.config.volumeRange.min,
        Math.min(this.config.volumeRange.max, db)
      );
    } catch (error) {
      console.warn('Erreur calcul volume:', error);
      return -30; // Valeur par défaut
    }
  }

  /**
   * Calcule le tempo (rythme) du signal
   * @param {Float32Array} audioData - Données audio
   * @returns {number} Tempo en BPM
   */
  calculateTempo(audioData) {
    try {
      // Simulation basée sur la détection d'énergie
      const energy = this.calculateEnergy(audioData);
      const peaks = this.findEnergyPeaks(energy);
      const intervals = this.calculatePeakIntervals(peaks);
      
      if (intervals.length === 0) return 120; // BPM par défaut
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = (60 * this.config.sampleRate) / avgInterval;
      
      return Math.max(60, Math.min(200, bpm)); // Limiter entre 60-200 BPM
    } catch (error) {
      console.warn('Erreur calcul tempo:', error);
      return 120;
    }
  }

  /**
   * Calcule la régularité du rythme
   * @param {Float32Array} audioData - Données audio
   * @returns {number} Score de régularité (0-1)
   */
  calculateRhythm(audioData) {
    try {
      const energy = this.calculateEnergy(audioData);
      const peaks = this.findEnergyPeaks(energy);
      const intervals = this.calculatePeakIntervals(peaks);
      
      if (intervals.length < 2) return 0.5;
      
      // Calculer la variance des intervalles
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - mean, 2);
      }, 0) / intervals.length;
      
      // Plus la variance est faible, plus le rythme est régulier
      const regularity = 1 / (1 + variance / (mean * mean));
      return Math.max(0, Math.min(1, regularity));
    } catch (error) {
      console.warn('Erreur calcul rythme:', error);
      return 0.5;
    }
  }

  /**
   * Calcule le niveau de stress vocal
   * @param {Float32Array} audioData - Données audio
   * @returns {number} Score de stress (0-1)
   */
  calculateStress(audioData) {
    try {
      const pitch = this.calculatePitch(audioData);
      const volume = this.calculateVolume(audioData);
      
      // Facteurs de stress : pitch élevé + volume élevé + variations rapides
      let stressScore = 0;
      
      // Pitch élevé = stress
      if (pitch > 200) stressScore += 0.3;
      
      // Volume élevé = stress
      if (volume > -20) stressScore += 0.3;
      
      // Variations rapides de pitch = stress
      if (this.pitchHistory.length > 1) {
        const pitchVariation = Math.abs(pitch - this.pitchHistory[this.pitchHistory.length - 1]);
        if (pitchVariation > 50) stressScore += 0.4;
      }
      
      return Math.max(0, Math.min(1, stressScore));
    } catch (error) {
      console.warn('Erreur calcul stress:', error);
      return 0.2;
    }
  }

  /**
   * Analyse le sentiment à partir des caractéristiques prosodiques
   * @param {Object} prosodyFeatures - Caractéristiques prosodiques
   * @param {string} text - Texte associé (optionnel)
   * @returns {Object} Analyse de sentiment
   */
  analyzeSentiment(prosodyFeatures, text = '') {
    try {
      const { pitch, volume, tempo, rhythm, stress } = prosodyFeatures;
      let sentimentScore = 0;
      let confidence = 0.5;
      
      // Analyse prosodique
      // Pitch élevé + tempo rapide = excitation/joie
      if (pitch > 180 && tempo > 130) {
        sentimentScore += 0.4;
        confidence += 0.2;
      }
      
      // Pitch bas + tempo lent = tristesse
      if (pitch < 120 && tempo < 100) {
        sentimentScore -= 0.4;
        confidence += 0.2;
      }
      
      // Volume élevé + stress = colère
      if (volume > -15 && stress > 0.6) {
        sentimentScore -= 0.3;
        confidence += 0.1;
      }
      
      // Rythme régulier = calme/confiance
      if (rhythm > 0.7) {
        sentimentScore += 0.2;
        confidence += 0.1;
      }
      
      // Analyse textuelle basique (si disponible)
      if (text) {
        const textSentiment = this.analyzeTextSentiment(text);
        sentimentScore += textSentiment * 0.3;
        confidence += 0.1;
      }
      
      // Normaliser le score
      sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
      confidence = Math.max(0, Math.min(1, confidence));
      
      // Déterminer la catégorie
      let category = 'neutral';
      if (sentimentScore > this.config.sentimentThresholds.positive) {
        category = 'positive';
      } else if (sentimentScore < this.config.sentimentThresholds.negative) {
        category = 'negative';
      }
      
      const result = {
        score: sentimentScore,
        category,
        confidence,
        prosody: { pitch, volume, tempo, rhythm, stress },
        timestamp: Date.now()
      };
      
      this.sentimentHistory.push(result);
      if (this.sentimentHistory.length > 50) {
        this.sentimentHistory.shift();
      }
      
      return result;
    } catch (error) {
      console.warn('Erreur analyse sentiment:', error);
      return {
        score: 0,
        category: 'neutral',
        confidence: 0,
        prosody: prosodyFeatures,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Analyse sentiment basique du texte
   * @param {string} text - Texte à analyser
   * @returns {number} Score de sentiment (-1 à 1)
   */
  analyzeTextSentiment(text) {
    const positiveWords = [
      'bon', 'bonne', 'excellent', 'parfait', 'fantastique', 'super', 'génial',
      'merci', 'bravo', 'félicitations', 'réussi', 'succès', 'heureux', 'content'
    ];
    
    const negativeWords = [
      'mauvais', 'mauvaise', 'terrible', 'nul', 'problème', 'erreur', 'échec',
      'difficile', 'compliqué', 'triste', 'déçu', 'énervé', 'fâché', 'inquiet'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.1;
      if (negativeWords.includes(word)) score -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Analyse complète d'un échantillon audio
   * @param {Float32Array} audioData - Données audio
   * @param {string} text - Texte associé
   * @returns {Object} Analyse complète
   */
  analyzeComplete(audioData, text = '') {
    const prosody = this.analyzeProsody(audioData);
    const sentiment = this.analyzeSentiment(prosody, text);
    
    return {
      prosody,
      sentiment,
      timestamp: Date.now(),
      audioLength: audioData ? audioData.length : 0
    };
  }

  /**
   * Obtient l'historique des analyses
   * @returns {Object} Historique complet
   */
  getHistory() {
    return {
      pitchHistory: [...this.pitchHistory],
      volumeHistory: [...this.volumeHistory],
      sentimentHistory: [...this.sentimentHistory],
      lastUpdate: Date.now()
    };
  }

  /**
   * Réinitialise l'historique
   */
  resetHistory() {
    this.pitchHistory = [];
    this.volumeHistory = [];
    this.sentimentHistory = [];
    this.prosodyFeatures = this.getDefaultProsodyFeatures();
  }

  // Méthodes utilitaires privées

  autocorrelate(data) {
    const result = new Float32Array(data.length);
    for (let lag = 0; lag < data.length; lag++) {
      let sum = 0;
      for (let i = 0; i < data.length - lag; i++) {
        sum += data[i] * data[i + lag];
      }
      result[lag] = sum;
    }
    return result;
  }

  findPeakFrequency(autocorrelation) {
    let maxPeak = 0;
    let peakIndex = 0;
    
    for (let i = 20; i < autocorrelation.length / 2; i++) {
      if (autocorrelation[i] > maxPeak) {
        maxPeak = autocorrelation[i];
        peakIndex = i;
      }
    }
    
    return this.config.sampleRate / peakIndex;
  }

  calculateEnergy(audioData) {
    const windowSize = 512;
    const energy = [];
    
    for (let i = 0; i < audioData.length - windowSize; i += windowSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += audioData[i + j] * audioData[i + j];
      }
      energy.push(sum / windowSize);
    }
    
    return energy;
  }

  findEnergyPeaks(energy) {
    const peaks = [];
    const threshold = Math.max(...energy) * 0.3;
    
    for (let i = 1; i < energy.length - 1; i++) {
      if (energy[i] > threshold && 
          energy[i] > energy[i - 1] && 
          energy[i] > energy[i + 1]) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }

  calculatePeakIntervals(peaks) {
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    return intervals;
  }

  getDefaultProsodyFeatures() {
    return {
      pitch: 150,
      volume: -30,
      tempo: 120,
      rhythm: 0.5,
      stress: 0.2
    };
  }
}

export default VoiceAnalyzer;
