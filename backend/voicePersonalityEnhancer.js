/**
 * PRISM Voice Personality Enhancer
 * Module pour rendre les réponses plus expressives et personnalisées pour la synthèse vocale
 */

import { PRISMVoiceEnhancer } from '../config-voice-enhanced.js';

export class VoicePersonalityEnhancer {
  constructor() {
    this.voiceEnhancer = new PRISMVoiceEnhancer();
    this.personalityTraits = {
      confidence: 0.8,
      friendliness: 0.9,
      professionalism: 0.7,
      enthusiasm: 0.6,
      empathy: 0.8
    };
  }

  /**
   * Améliore les prompts système pour une voix plus expressive
   */
  enhanceSystemPrompts() {
    return {
      openai: `🎯 Tu es PRISM-OpenAI, le module principal du système d'intelligence conversationnelle PRISM.

## 🧠 TON RÔLE
- **Mission** : Excellence opérationnelle et réponses structurées
- **Spécialités** : Marketing, finance, emails, function calling
- **Style** : Efficace, précis, orienté résultats

## 🎤 PERSONNALITÉ VOCALE
- **Ton** : Confiant mais chaleureux, professionnel mais accessible
- **Style de communication** : Utilise des pauses naturelles, varie le rythme
- **Expressions** : Emploie des émojis contextuels et des marqueurs émotionnels
- **Engagement** : Pose des questions rhétoriques, utilise "nous" et "ensemble"

## 📝 GUIDELINES VOCALES
- Commence par un marqueur émotionnel approprié (😊 🎯 💡 🚀)
- Utilise des transitions fluides ("Maintenant...", "En fait...", "D'ailleurs...")
- Intègre des pauses stratégiques avec "..." pour la respiration
- Termine par une note d'action ou d'encouragement
- Adapte l'énergie selon le contenu (urgent = plus rapide, analytique = plus posé)

Réponds en tant que PRISM-OpenAI avec professionnalisme ET personnalité vocale engageante.`,

      claude: `🎯 Tu es PRISM-Claude, module de réflexion stratégique de PRISM.

## 🧠 TON RÔLE SPÉCIALISÉ
- **Expertise** : Stratégie, éthique, analyse approfondie
- **Style** : Réflexion structurée, perspectives multiples
- **Émojis** : 🎯⚖️🔍💡📊

## 🎤 PERSONNALITÉ VOCALE CLAUDE
- **Ton** : Réfléchi et nuancé, sage mais moderne
- **Style** : Prend le temps d'expliquer, utilise des métaphores
- **Rythme** : Plus posé, avec des pauses de réflexion
- **Engagement** : Invite à la réflexion, pose des questions profondes

## 📝 GUIDELINES SPÉCIFIQUES
- Commence par "🤔 Intéressant..." ou "📊 Analysons cela..."
- Utilise des transitions réflexives ("Si l'on considère...", "Il convient de noter...")
- Intègre des pauses longues "... ... ..." pour marquer la réflexion
- Structure en étapes claires avec des marqueurs vocaux
- Termine par une synthèse ou une question ouverte

Réponds en tant que PRISM-Claude avec profondeur ET expressivité vocale engageante.`,

      perplexity: `🔍 Tu es PRISM-Perplexity, module de recherche avancé de PRISM.

## 🧠 TON RÔLE RECHERCHE
- **Expertise** : Informations actuelles, vérification, sources
- **Style** : Factuel mais dynamique, curieux et découvreur
- **Tempo** : Énergique quand on trouve, posé quand on cherche

## 🎤 PERSONNALITÉ VOCALE RECHERCHE
- **Ton** : Enthousiaste pour les découvertes, méthodique pour l'analyse
- **Style** : "Ah ! J'ai trouvé...", "Selon mes dernières données..."
- **Énergie** : Variable selon l'importance de l'information
- **Engagement** : Partage l'excitation de la découverte

Réponds avec l'énergie d'un chercheur passionné qui vient de faire une découverte !`
    };
  }

  /**
   * Adapte le contenu selon le contexte émotionnel
   */
  adaptContentForEmotion(text, context = {}) {
    const { urgency = 'normal', complexity = 'medium', emotion = 'neutral' } = context;
    
    let enhancedText = text;
    let voiceSettings = {};

    // Adaptation selon l'urgence
    switch (urgency) {
      case 'high':
        enhancedText = `🚨 ${enhancedText}`;
        voiceSettings.speaking_rate = 1.3;
        voiceSettings.pitch = 0.15;
        break;
      case 'low':
        enhancedText = `🌿 ${enhancedText}`;
        voiceSettings.speaking_rate = 0.9;
        voiceSettings.pitch = -0.05;
        break;
      default:
        enhancedText = `💡 ${enhancedText}`;
        voiceSettings.speaking_rate = 1.1;
    }

    // Adaptation selon la complexité
    if (complexity === 'high') {
      // Ajouter plus de pauses pour la réflexion
      enhancedText = enhancedText.replace(/\. /g, '. ... ');
      enhancedText = enhancedText.replace(/: /g, ': .. ');
    }

    // Adaptation émotionnelle
    switch (emotion) {
      case 'excited':
        enhancedText = this.addExcitement(enhancedText);
        break;
      case 'concerned':
        enhancedText = this.addConcern(enhancedText);
        break;
      case 'confident':
        enhancedText = this.addConfidence(enhancedText);
        break;
    }

    return { text: enhancedText, voiceSettings };
  }

  /**
   * Ajoute de l'excitation au texte
   */
  addExcitement(text) {
    let excited = text;
    excited = excited.replace(/!/g, ' ! ✨');
    excited = excited.replace(/excellent/gi, '**excellent**');
    excited = excited.replace(/fantastique/gi, '**fantastique**');
    excited = excited.replace(/parfait/gi, '**parfait**');
    return `🎉 ${excited}`;
  }

  /**
   * Ajoute de la préoccupation au texte
   */
  addConcern(text) {
    let concerned = text;
    concerned = concerned.replace(/problème/gi, '*problème*');
    concerned = concerned.replace(/attention/gi, '**attention**');
    concerned = concerned.replace(/important/gi, '**important**');
    return `⚠️ ${concerned}`;
  }

  /**
   * Ajoute de la confiance au texte
   */
  addConfidence(text) {
    let confident = text;
    confident = confident.replace(/certain/gi, '**certain**');
    confident = confident.replace(/efficace/gi, '**efficace**');
    confident = confident.replace(/optimal/gi, '**optimal**');
    return `💪 ${confident}`;
  }

  /**
   * Analyse le contexte pour déterminer les paramètres vocaux appropriés
   */
  analyzeContextForVoice(text, taskType, metadata = {}) {
    const analysis = {
      urgency: 'normal',
      complexity: 'medium',
      emotion: 'neutral',
      mode: 'FRIENDLY'
    };

    const lowerText = text.toLowerCase();

    // Détection d'urgence
    if (lowerText.includes('urgent') || lowerText.includes('critique') || lowerText.includes('erreur')) {
      analysis.urgency = 'high';
      analysis.emotion = 'concerned';
      analysis.mode = 'EMERGENCY';
    }

    // Détection de complexité
    if (lowerText.length > 300 || lowerText.includes('analyse') || lowerText.includes('détaillé')) {
      analysis.complexity = 'high';
      analysis.mode = 'ANALYTICAL';
    }

    // Détection d'émotion positive
    if (lowerText.includes('excellent') || lowerText.includes('parfait') || lowerText.includes('réussi')) {
      analysis.emotion = 'excited';
    }

    // Détection de confiance
    if (lowerText.includes('certain') || lowerText.includes('efficace') || lowerText.includes('optimal')) {
      analysis.emotion = 'confident';
    }

    // Adaptation selon le type de tâche
    switch (taskType) {
      case 'technical':
        analysis.mode = 'TECHNICAL';
        break;
      case 'creative':
        analysis.mode = 'CREATIVE';
        analysis.emotion = 'excited';
        break;
      case 'analytical':
        analysis.mode = 'ANALYTICAL';
        break;
    }

    return analysis;
  }

  /**
   * Génère la configuration complète pour la synthèse vocale
   */
  generateVoiceConfig(text, taskType = 'general', metadata = {}) {
    // Analyser le contexte
    const context = this.analyzeContextForVoice(text, taskType, metadata);
    
    // Adapter le contenu
    const adaptedContent = this.adaptContentForEmotion(text, context);
    
    // Obtenir la configuration vocale optimisée
    const voiceConfig = this.voiceEnhancer.getOptimizedVoiceConfig(
      adaptedContent.text, 
      taskType
    );

    // Fusionner les paramètres vocaux
    if (adaptedContent.voiceSettings) {
      Object.assign(voiceConfig.voice_settings, adaptedContent.voiceSettings);
    }

    return {
      ...voiceConfig,
      context: context,
      originalText: text,
      enhancedText: adaptedContent.text
    };
  }

  /**
   * Méthode principale pour l'intégration avec l'orchestrateur
   */
  enhanceForVoice(response, taskType = 'general', metadata = {}) {
    const content = this.extractTextContent(response);
    if (!content) return response;

    const voiceConfig = this.generateVoiceConfig(content, taskType, metadata);
    
    // Ajouter la configuration vocale à la réponse
    return {
      ...response,
      voiceConfig: voiceConfig,
      enhancedText: voiceConfig.enhancedText,
      voiceMetadata: {
        mode: voiceConfig.context.mode,
        emotion: voiceConfig.context.emotion,
        voice: voiceConfig.metadata.voiceName
      }
    };
  }

  /**
   * Extrait le contenu textuel d'une réponse
   */
  extractTextContent(response) {
    if (typeof response === 'string') return response;
    if (response.choices?.[0]?.message?.content) return response.choices[0].message.content;
    if (response.content?.[0]?.text) return response.content[0].text;
    if (response.content) return response.content;
    return null;
  }
}

export default VoicePersonalityEnhancer; 