/**
 * PRISM Data Analysis - Micro-étape 0.1
 * Analyse chirurgicale des formats de données existants
 * Couverture: 100% des patterns identifiés
 */

class PrismDataAnalyzer {
  constructor() {
    this.patterns = {
      enterprise: [],
      casual: [],
      structured: []
    };
    
    this.metadataFields = new Set();
    this.contentTypes = new Set();
  }

  /**
   * Analyse un échantillon de réponse PRISM
   * @param {Object} response - Réponse PRISM format: {success, content, metadata}
   * @returns {Object} Analyse structurée
   */
  analyzeResponse(response) {
    const analysis = {
      timestamp: new Date().toISOString(),
      responseId: this._generateResponseId(response),
      classification: this._classifyResponse(response),
      contentAnalysis: this._analyzeContent(response.content),
      metadataAnalysis: this._analyzeMetadata(response.metadata),
      enterpriseScore: this._calculateEnterpriseScore(response),
      reportType: this._determineReportType(response)
    };

    // Stocker les patterns identifiés
    this._storePattern(analysis);
    
    return analysis;
  }

  /**
   * Classification de la réponse selon les critères enterprise
   * @private
   */
  _classifyResponse(response) {
    const content = response.content || '';
    const metadata = response.metadata || {};
    
    return {
      isStructured: this._isStructuredContent(content),
      isAnalytical: this._isAnalyticalContent(content),
      hasEmojis: this._hasEmojis(content),
      wordCount: content.split(' ').length,
      formality: this._calculateFormalityScore(content),
      taskType: metadata.taskType || 'unknown'
    };
  }

  /**
   * Analyse du contenu textuel
   * @private
   */
  _analyzeContent(content) {
    if (!content) return null;

    return {
      length: content.length,
      wordCount: content.split(' ').length,
      hasHeaders: /###?\s+/.test(content),
      hasLists: /^\s*[-•]\s+/m.test(content),
      hasNumbers: /\d+/.test(content),
      hasPercentages: /%/.test(content),
      hasCurrency: /€|\$|EUR|USD/.test(content),
      emojiCount: this._countEmojis(content),
      formalityScore: this._calculateFormalityScore(content),
      analyticalKeywords: this._countAnalyticalKeywords(content),
      executiveKeywords: this._countExecutiveKeywords(content)
    };
  }

  /**
   * Analyse des métadonnées
   * @private
   */
  _analyzeMetadata(metadata) {
    if (!metadata) return null;

    // Enregistrer tous les champs de métadonnées rencontrés
    Object.keys(metadata).forEach(field => this.metadataFields.add(field));

    return {
      hasModel: Boolean(metadata.model),
      hasFallback: Boolean(metadata.fallback),
      hasTimestamp: Boolean(metadata.timestamp),
      hasTaskType: Boolean(metadata.taskType),
      processingTime: metadata.processingTime || 0,
      taskType: metadata.taskType,
      model: metadata.model,
      fieldsCount: Object.keys(metadata).length
    };
  }

  /**
   * Calcule un score enterprise (0-100)
   * @private
   */
  _calculateEnterpriseScore(response) {
    const content = response.content || '';
    const metadata = response.metadata || {};
    
    let score = 0;
    
    // Critères positifs pour enterprise
    if (content.length > 500) score += 20;
    if (content.length > 200) score += 10; // Bonus pour contenu moyen
    if (this._isAnalyticalContent(content)) score += 30; // Augmenté de 25 à 30
    if (this._hasExecutiveKeywords(content)) score += 25; // Augmenté de 20 à 25
    if (this._isStructuredContent(content)) score += 15;
    if (metadata.taskType && ['finance', 'strategie', 'analyse'].includes(metadata.taskType)) score += 15; // Augmenté de 10 à 15
    
    // Bonus pour certains mots-clés spécifiques
    const analyticalCount = this._countAnalyticalKeywords(content);
    const executiveCount = this._countExecutiveKeywords(content);
    if (analyticalCount >= 3) score += 10;
    if (executiveCount >= 3) score += 10;
    
    // Critères négatifs pour enterprise
    if (this._hasEmojis(content)) score -= 30;
    if (this._isCasualLanguage(content)) score -= 20;
    if (content.length < 50) score -= 30; // Pénalité plus forte pour contenu très court
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Détermine le type de rapport
   * @private
   */
  _determineReportType(response) {
    const content = response.content || '';
    const _metadata = response.metadata || {};
    const score = this._calculateEnterpriseScore(response);
    
    if (score >= 70) {
      return 'executive_report';
    } else if (score >= 50 && this._isAnalyticalContent(content)) {
      return 'analytical_response';
    } else if (this._isStructuredContent(content)) {
      return 'structured_response';
    } else {
      return 'casual_response';
    }
  }

  /**
   * Détecteurs de patterns spécifiques
   * @private
   */
  _isStructuredContent(content) {
    const indicators = [
      /###?\s+/,           // Headers markdown
      /^\s*[-•]\s+/m,      // Listes
      /\d+\.\s+/,          // Listes numérotées
      /\*\*.*?\*\*/,       // Texte en gras
      /^\s*\|\s+/m         // Tableaux
    ];
    
    return indicators.filter(pattern => pattern.test(content)).length >= 2;
  }

  _isAnalyticalContent(content) {
    const analyticalKeywords = [
      'analyse', 'stratégie', 'performance', 'ROI', 'efficacité',
      'optimisation', 'recommandation', 'conclusion', 'insight',
      'métrique', 'indicateur', 'tendance', 'croissance', 'impact'
    ];
    
    const keywordCount = analyticalKeywords
      .filter(keyword => content.toLowerCase().includes(keyword))
      .length;
    
    return keywordCount >= 3;
  }

  _hasEmojis(content) {
    // Regex Unicode pour détecter tous les émojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]/gu;
    return emojiRegex.test(content);
  }

  _countEmojis(content) {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]/gu;
    const matches = content.match(emojiRegex);
    return matches ? matches.length : 0;
  }

  _calculateFormalityScore(content) {
    let score = 50; // Score neutre
    
    // Indicateurs de formalité (+)
    const formalIndicators = [
      /\b(néanmoins|cependant|toutefois|par conséquent)\b/gi,
      /\b(veuillez|nous recommandons|il convient)\b/gi,
      /\b(analyse|évaluation|considération|examen)\b/gi
    ];
    
    // Indicateurs de familiarité (-)
    const casualIndicators = [
      /\b(super|cool|génial|ok|sympa)\b/gi,
      /[!]{2,}/g,
      /\b(salut|hey|coucou)\b/gi
    ];
    
    formalIndicators.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) score += matches.length * 5;
    });
    
    casualIndicators.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) score -= matches.length * 10;
    });
    
    return Math.max(0, Math.min(100, score));
  }

  _countAnalyticalKeywords(content) {
    const keywords = [
      'analyse', 'données', 'métrique', 'performance', 'tendance',
      'croissance', 'déclin', 'optimisation', 'efficacité', 'ROI',
      'stratégie'
    ];
    
    return keywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
  }

  _countExecutiveKeywords(content) {
    const keywords = [
      'stratégie', 'vision', 'objectifs', 'transformation', 'leadership',
      'décision', 'priorité', 'investissement', 'budget', 'marché'
    ];
    
    return keywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
  }

  _hasExecutiveKeywords(content) {
    return this._countExecutiveKeywords(content) >= 2;
  }

  _isCasualLanguage(content) {
    const casualPatterns = [
      /\b(super|cool|génial|sympa)\b/gi,
      /[!]{2,}/g,
      /😀|😊|👍|🎉|🚀/g,
      /\b(salut|hey|coucou)\b/gi
    ];
    
    return casualPatterns.some(pattern => pattern.test(content));
  }

  _generateResponseId(response) {
    // Générer un ID unique basé sur le contenu et timestamp
    const content = response.content || '';
    const timestamp = response.metadata?.timestamp || Date.now();
    return `resp_${content.substring(0, 10).replaceAll(/\W/g, '')}_${timestamp}`.substring(0, 32);
  }

  _storePattern(analysis) {
    const { classification, enterpriseScore, reportType } = analysis;
    
    if (enterpriseScore >= 70) {
      this.patterns.enterprise.push({
        score: enterpriseScore,
        type: reportType,
        indicators: classification
      });
    } else if (classification.isStructured) {
      this.patterns.structured.push({
        score: enterpriseScore,
        type: reportType,
        indicators: classification
      });
    } else {
      this.patterns.casual.push({
        score: enterpriseScore,
        type: reportType,
        indicators: classification
      });
    }
  }

  /**
   * Génère un rapport d'analyse des patterns découverts
   */
  generatePatternsReport() {
    return {
      timestamp: new Date().toISOString(),
      metadataFields: Array.from(this.metadataFields),
      contentTypes: Array.from(this.contentTypes),
      patterns: {
        enterprise: {
          count: this.patterns.enterprise.length,
          averageScore: this._calculateAverageScore(this.patterns.enterprise),
          commonIndicators: this._getCommonIndicators(this.patterns.enterprise)
        },
        structured: {
          count: this.patterns.structured.length,
          averageScore: this._calculateAverageScore(this.patterns.structured),
          commonIndicators: this._getCommonIndicators(this.patterns.structured)
        },
        casual: {
          count: this.patterns.casual.length,
          averageScore: this._calculateAverageScore(this.patterns.casual),
          commonIndicators: this._getCommonIndicators(this.patterns.casual)
        }
      },
      recommendations: this._generateRecommendations()
    };
  }

  _calculateAverageScore(patterns) {
    if (patterns.length === 0) return 0;
    return patterns.reduce((sum, p) => sum + p.score, 0) / patterns.length;
  }

  _getCommonIndicators(patterns) {
    // Analyser les indicateurs les plus fréquents
    const indicators = {};
    patterns.forEach(p => {
      Object.entries(p.indicators).forEach(([key, value]) => {
        if (value === true || (typeof value === 'number' && value > 0)) {
          indicators[key] = (indicators[key] || 0) + 1;
        }
      });
    });
    
    return Object.entries(indicators)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([indicator, count]) => ({ indicator, frequency: count }));
  }

  _generateRecommendations() {
    const recommendations = [];
    
    if (this.patterns.enterprise.length > 0) {
      recommendations.push({
        type: 'detection',
        priority: 'high',
        message: `${this.patterns.enterprise.length} réponses enterprise détectées. Implémenter la détection automatique.`
      });
    }
    
    if (this.patterns.casual.length > this.patterns.enterprise.length) {
      recommendations.push({
        type: 'filtering',
        priority: 'medium',
        message: 'Majorité de réponses casual. Affiner les critères de détection enterprise.'
      });
    }
    
    return recommendations;
  }
}

// Export pour les tests
module.exports = { PrismDataAnalyzer }; 