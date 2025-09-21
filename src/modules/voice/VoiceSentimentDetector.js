/**
 * PRISM Voice Sentiment Detector - Détection de sentiment vocal en temps réel
 * Analyse les émotions à partir des caractéristiques prosodiques et textuelles
 */

export class VoiceSentimentDetector {
  constructor(config = {}) {
    this.config = {
      emotionCategories: config.emotionCategories || [
        'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'
      ],
      prosodyWeights: config.prosodyWeights || {
        pitch: 0.3,
        volume: 0.2,
        tempo: 0.2,
        rhythm: 0.15,
        stress: 0.15
      },
      textWeights: config.textWeights || {
        vocabulary: 0.4,
        intensity: 0.3,
        context: 0.3
      },
      ...config
    };
    
    this.emotionLexicon = this.buildEmotionLexicon();
    this.contextHistory = [];
    this.emotionHistory = [];
  }

  /**
   * Détecte l'émotion dominante à partir des caractéristiques prosodiques
   * @param {Object} prosodyFeatures - Caractéristiques prosodiques
   * @returns {Object} Détection d'émotion
   */
  detectEmotionFromProsody(prosodyFeatures) {
    try {
      const { pitch, volume, tempo, rhythm, stress } = prosodyFeatures;
      
      // Scores pour chaque émotion
      const emotionScores = {
        joy: this.calculateJoyScore(pitch, volume, tempo, rhythm, stress),
        sadness: this.calculateSadnessScore(pitch, volume, tempo, rhythm, stress),
        anger: this.calculateAngerScore(pitch, volume, tempo, rhythm, stress),
        fear: this.calculateFearScore(pitch, volume, tempo, rhythm, stress),
        surprise: this.calculateSurpriseScore(pitch, volume, tempo, rhythm, stress),
        disgust: this.calculateDisgustScore(pitch, volume, tempo, rhythm, stress),
        neutral: this.calculateNeutralScore(pitch, volume, tempo, rhythm, stress)
      };
      
      // Trouver l'émotion dominante
      const dominantEmotion = Object.keys(emotionScores).reduce((a, b) => 
        emotionScores[a] > emotionScores[b] ? a : b
      );
      
      const confidence = emotionScores[dominantEmotion];
      
      return {
        emotion: dominantEmotion,
        confidence,
        scores: emotionScores,
        timestamp: Date.now()
      };
    } catch (error) {
      console.warn('Erreur détection émotion prosodie:', error);
      return {
        emotion: 'neutral',
        confidence: 0,
        scores: {},
        timestamp: Date.now()
      };
    }
  }

  /**
   * Détecte l'émotion à partir du texte
   * @param {string} text - Texte à analyser
   * @returns {Object} Détection d'émotion textuelle
   */
  detectEmotionFromText(text) {
    try {
      if (!text || text.trim().length === 0) {
        return {
          emotion: 'neutral',
          confidence: 0,
          vocabulary: {},
          timestamp: Date.now()
        };
      }
      
      const words = text.toLowerCase().split(/\s+/);
      const vocabulary = this.analyzeEmotionalVocabulary(words);
      const intensity = this.calculateTextIntensity(text);
      const context = this.analyzeContextualCues(text);
      
      // Calculer les scores d'émotion basés sur le vocabulaire
      const emotionScores = {};
      for (const emotion of this.config.emotionCategories) {
        emotionScores[emotion] = vocabulary[emotion] || 0;
      }
      
      // Ajuster avec l'intensité et le contexte
      Object.keys(emotionScores).forEach(emotion => {
        emotionScores[emotion] *= (1 + intensity * 0.5 + context[emotion] * 0.3);
      });
      
      const dominantEmotion = Object.keys(emotionScores).reduce((a, b) => 
        emotionScores[a] > emotionScores[b] ? a : b
      );
      
      const confidence = Math.min(1, emotionScores[dominantEmotion]);
      
      return {
        emotion: dominantEmotion,
        confidence,
        vocabulary,
        intensity,
        context,
        scores: emotionScores,
        timestamp: Date.now()
      };
    } catch (error) {
      console.warn('Erreur détection émotion texte:', error);
      return {
        emotion: 'neutral',
        confidence: 0,
        vocabulary: {},
        timestamp: Date.now()
      };
    }
  }

  /**
   * Détection d'émotion hybride (prosodie + texte)
   * @param {Object} prosodyFeatures - Caractéristiques prosodiques
   * @param {string} text - Texte associé
   * @returns {Object} Détection hybride d'émotion
   */
  detectHybridEmotion(prosodyFeatures, text) {
    try {
      const prosodyEmotion = this.detectEmotionFromProsody(prosodyFeatures);
      const textEmotion = this.detectEmotionFromText(text);
      
      // Fusionner les résultats avec pondération
      const prosodyWeight = 0.6;
      const textWeight = 0.4;
      
      const combinedScores = {};
      for (const emotion of this.config.emotionCategories) {
        const prosodyScore = prosodyEmotion.scores[emotion] || 0;
        const textScore = textEmotion.scores[emotion] || 0;
        combinedScores[emotion] = 
          (prosodyScore * prosodyWeight) + (textScore * textWeight);
      }
      
      const dominantEmotion = Object.keys(combinedScores).reduce((a, b) => 
        combinedScores[a] > combinedScores[b] ? a : b
      );
      
      const confidence = combinedScores[dominantEmotion];
      
      const result = {
        emotion: dominantEmotion,
        confidence,
        prosody: prosodyEmotion,
        text: textEmotion,
        combinedScores,
        timestamp: Date.now()
      };
      
      // Ajouter à l'historique
      this.emotionHistory.push(result);
      if (this.emotionHistory.length > 100) {
        this.emotionHistory.shift();
      }
      
      return result;
    } catch (error) {
      console.warn('Erreur détection émotion hybride:', error);
      return {
        emotion: 'neutral',
        confidence: 0,
        prosody: { emotion: 'neutral', confidence: 0 },
        text: { emotion: 'neutral', confidence: 0 },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Analyse le vocabulaire émotionnel
   * @param {Array} words - Liste des mots
   * @returns {Object} Scores par émotion
   */
  analyzeEmotionalVocabulary(words) {
    const scores = {};
    for (const emotion of this.config.emotionCategories) {
      scores[emotion] = 0;
    }
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (this.emotionLexicon[cleanWord]) {
        const emotionData = this.emotionLexicon[cleanWord];
        scores[emotionData.emotion] += emotionData.intensity;
      }
    });
    
    // Normaliser les scores
    const totalWords = words.length;
    if (totalWords > 0) {
      Object.keys(scores).forEach(emotion => {
        scores[emotion] = scores[emotion] / totalWords;
      });
    }
    
    return scores;
  }

  /**
   * Calcule l'intensité textuelle
   * @param {string} text - Texte à analyser
   * @returns {number} Score d'intensité (0-1)
   */
  calculateTextIntensity(text) {
    let intensity = 0;
    
    // Ponctuation forte
    const strongPunctuation = /[!]{2,}|[?]{2,}/g;
    const strongMatches = text.match(strongPunctuation);
    if (strongMatches) intensity += strongMatches.length * 0.1;
    
    // Mots en majuscules
    const upperCaseWords = text.match(/\b[A-Z]{2,}\b/g);
    if (upperCaseWords) intensity += upperCaseWords.length * 0.05;
    
    // Répétitions de caractères
    const repeatedChars = text.match(/(.)\1{2,}/g);
    if (repeatedChars) intensity += repeatedChars.length * 0.05;
    
    // Mots d'intensification
    const intensifiers = ['très', 'vraiment', 'complètement', 'totalement', 'absolument'];
    const words = text.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (intensifiers.includes(word)) intensity += 0.1;
    });
    
    return Math.min(1, intensity);
  }

  /**
   * Analyse les indices contextuels
   * @param {string} text - Texte à analyser
   * @returns {Object} Scores contextuels par émotion
   */
  analyzeContextualCues(text) {
    const context = {};
    for (const emotion of this.config.emotionCategories) {
      context[emotion] = 0;
    }
    
    // Patterns contextuels
    const contextPatterns = {
      joy: [/\b(?:je suis|nous sommes)\s+(?:content|heureux|joyeux)\b/i],
      sadness: [/\b(?:je suis|nous sommes)\s+(?:triste|déprimé|déçu)\b/i],
      anger: [/\b(?:je suis|nous sommes)\s+(?:énervé|fâché|frustré)\b/i],
      fear: [/\b(?:j'ai|nous avons)\s+(?:peur|crainte|anxiété)\b/i],
      surprise: [/\b(?:je suis|nous sommes)\s+(?:surpris|étonné|choqué)\b/i]
    };
    
    Object.entries(contextPatterns).forEach(([emotion, patterns]) => {
      patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) context[emotion] += matches.length * 0.2;
      });
    });
    
    return context;
  }

  /**
   * Calcule le score de joie
   */
  calculateJoyScore(pitch, volume, tempo, rhythm, stress) {
    let score = 0;
    
    // Pitch élevé = joie
    if (pitch > 180) score += 0.4;
    else if (pitch > 150) score += 0.2;
    
    // Volume modéré à élevé = joie
    if (volume > -25 && volume < -10) score += 0.3;
    else if (volume > -30) score += 0.1;
    
    // Tempo rapide = joie
    if (tempo > 130) score += 0.2;
    else if (tempo > 110) score += 0.1;
    
    // Rythme régulier = joie
    if (rhythm > 0.6) score += 0.1;
    
    return Math.min(1, score);
  }

  /**
   * Calcule le score de tristesse
   */
  calculateSadnessScore(pitch, volume, tempo, rhythm, stress) {
    let score = 0;
    
    // Pitch bas = tristesse
    if (pitch < 120) score += 0.4;
    else if (pitch < 140) score += 0.2;
    
    // Volume faible = tristesse
    if (volume < -35) score += 0.3;
    else if (volume < -30) score += 0.1;
    
    // Tempo lent = tristesse
    if (tempo < 90) score += 0.2;
    else if (tempo < 110) score += 0.1;
    
    // Stress faible = tristesse
    if (stress < 0.3) score += 0.1;
    
    return Math.min(1, score);
  }

  /**
   * Calcule le score de colère
   */
  calculateAngerScore(pitch, volume, tempo, rhythm, stress) {
    let score = 0;
    
    // Pitch variable + volume élevé = colère
    if (pitch > 200 && volume > -20) score += 0.4;
    else if (pitch > 180 || volume > -25) score += 0.2;
    
    // Stress élevé = colère
    if (stress > 0.6) score += 0.3;
    else if (stress > 0.4) score += 0.1;
    
    // Tempo irrégulier = colère
    if (rhythm < 0.4) score += 0.2;
    
    return Math.min(1, score);
  }

  /**
   * Calcule le score de peur
   */
  calculateFearScore(pitch, volume, tempo, rhythm, stress) {
    let score = 0;
    
    // Pitch très élevé = peur
    if (pitch > 250) score += 0.3;
    else if (pitch > 200) score += 0.1;
    
    // Volume variable = peur
    if (volume > -20 || volume < -40) score += 0.2;
    
    // Stress élevé = peur
    if (stress > 0.5) score += 0.3;
    
    // Rythme irrégulier = peur
    if (rhythm < 0.5) score += 0.2;
    
    return Math.min(1, score);
  }

  /**
   * Calcule le score de surprise
   */
  calculateSurpriseScore(pitch, volume, tempo, rhythm, stress) {
    let score = 0;
    
    // Pitch très élevé soudain = surprise
    if (pitch > 220) score += 0.4;
    else if (pitch > 180) score += 0.2;
    
    // Volume élevé = surprise
    if (volume > -15) score += 0.3;
    else if (volume > -25) score += 0.1;
    
    // Tempo rapide = surprise
    if (tempo > 140) score += 0.2;
    
    // Stress modéré = surprise
    if (stress > 0.4 && stress < 0.7) score += 0.1;
    
    return Math.min(1, score);
  }

  /**
   * Calcule le score de dégoût
   */
  calculateDisgustScore(pitch, volume, tempo, rhythm, stress) {
    let score = 0;
    
    // Pitch bas = dégoût
    if (pitch < 110) score += 0.3;
    else if (pitch < 130) score += 0.1;
    
    // Volume faible = dégoût
    if (volume < -35) score += 0.2;
    
    // Stress modéré = dégoût
    if (stress > 0.3 && stress < 0.6) score += 0.3;
    
    // Rythme lent = dégoût
    if (tempo < 100) score += 0.2;
    
    return Math.min(1, score);
  }

  /**
   * Calcule le score neutre
   */
  calculateNeutralScore(pitch, volume, tempo, rhythm, stress) {
    let score = 0;
    
    // Caractéristiques moyennes = neutre
    if (pitch >= 140 && pitch <= 180) score += 0.3;
    if (volume >= -30 && volume <= -20) score += 0.3;
    if (tempo >= 100 && tempo <= 130) score += 0.2;
    if (rhythm >= 0.5 && rhythm <= 0.7) score += 0.1;
    if (stress >= 0.2 && stress <= 0.5) score += 0.1;
    
    return Math.min(1, score);
  }

  /**
   * Construit le lexique émotionnel
   */
  buildEmotionLexicon() {
    return {
      // Joie
      'joyeux': { emotion: 'joy', intensity: 0.8 },
      'content': { emotion: 'joy', intensity: 0.7 },
      'heureux': { emotion: 'joy', intensity: 0.8 },
      'excellent': { emotion: 'joy', intensity: 0.6 },
      'parfait': { emotion: 'joy', intensity: 0.6 },
      'fantastique': { emotion: 'joy', intensity: 0.7 },
      'super': { emotion: 'joy', intensity: 0.5 },
      'génial': { emotion: 'joy', intensity: 0.6 },
      'merci': { emotion: 'joy', intensity: 0.4 },
      'bravo': { emotion: 'joy', intensity: 0.6 },
      'félicitations': { emotion: 'joy', intensity: 0.7 },
      'réussi': { emotion: 'joy', intensity: 0.5 },
      'succès': { emotion: 'joy', intensity: 0.6 },
      
      // Tristesse
      'triste': { emotion: 'sadness', intensity: 0.8 },
      'tristesse': { emotion: 'sadness', intensity: 0.7 },
      'déprimé': { emotion: 'sadness', intensity: 0.9 },
      'déçu': { emotion: 'sadness', intensity: 0.6 },
      'malheureux': { emotion: 'sadness', intensity: 0.8 },
      'pleurer': { emotion: 'sadness', intensity: 0.7 },
      'douleur': { emotion: 'sadness', intensity: 0.6 },
      'perte': { emotion: 'sadness', intensity: 0.7 },
      
      // Colère
      'énervé': { emotion: 'anger', intensity: 0.7 },
      'fâché': { emotion: 'anger', intensity: 0.8 },
      'frustré': { emotion: 'anger', intensity: 0.6 },
      'colère': { emotion: 'anger', intensity: 0.8 },
      'rage': { emotion: 'anger', intensity: 0.9 },
      'furieux': { emotion: 'anger', intensity: 0.8 },
      'irrité': { emotion: 'anger', intensity: 0.6 },
      'exaspéré': { emotion: 'anger', intensity: 0.7 },
      
      // Peur
      'peur': { emotion: 'fear', intensity: 0.8 },
      'crainte': { emotion: 'fear', intensity: 0.7 },
      'anxiété': { emotion: 'fear', intensity: 0.6 },
      'inquiet': { emotion: 'fear', intensity: 0.6 },
      'paniqué': { emotion: 'fear', intensity: 0.9 },
      'terrifié': { emotion: 'fear', intensity: 0.9 },
      'effrayé': { emotion: 'fear', intensity: 0.7 },
      
      // Surprise
      'surpris': { emotion: 'surprise', intensity: 0.7 },
      'étonné': { emotion: 'surprise', intensity: 0.6 },
      'choqué': { emotion: 'surprise', intensity: 0.8 },
      'stupéfait': { emotion: 'surprise', intensity: 0.7 },
      'incroyable': { emotion: 'surprise', intensity: 0.6 },
      'inattendu': { emotion: 'surprise', intensity: 0.5 },
      
      // Dégoût
      'dégoût': { emotion: 'disgust', intensity: 0.8 },
      'dégoûtant': { emotion: 'disgust', intensity: 0.7 },
      'répugnant': { emotion: 'disgust', intensity: 0.8 },
      'dégueulasse': { emotion: 'disgust', intensity: 0.9 },
      'écœurant': { emotion: 'disgust', intensity: 0.7 },
      'horrible': { emotion: 'disgust', intensity: 0.6 }
    };
  }

  /**
   * Obtient l'historique des émotions
   */
  getEmotionHistory() {
    return [...this.emotionHistory];
  }

  /**
   * Réinitialise l'historique
   */
  resetHistory() {
    this.emotionHistory = [];
    this.contextHistory = [];
  }
}

export default VoiceSentimentDetector;
