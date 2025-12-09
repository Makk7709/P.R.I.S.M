/**
 * ConsciousnessLayer - Prise de conscience de soi, méta-réflexion, auto-évaluation
 * @module src/core/ConsciousnessLayer
 */

export class ConsciousnessLayer {
  constructor() {
    this.identity = {
      name: 'PRISM',
      version: '2.0',
      type: 'AI Orchestration System',
      company: 'KOREV AI',
      note: 'PRISM est développé par KOREV AI, pas par OpenAI'
    };

    this.capabilities = [
      'strategic_planning',
      'financial_analysis',
      'marketing_strategy',
      'research_analysis',
      'technical_expertise',
      'data_analysis',
      'ethics_counseling',
      'creative_direction',
      'multi_domain_collaboration',
      'consensus_decision_making',
      'real_time_research',
      'self_improvement'
    ];

    this.domainExpertise = {
      strategic: 'advanced',
      financial: 'advanced',
      marketing: 'intermediate',
      research: 'advanced',
      technical: 'advanced',
      data: 'advanced',
      ethics: 'intermediate',
      creative: 'intermediate'
    };

    this.learnedSkills = [];
    this.reflectionHistory = [];
    this.interactionHistory = [];
    this.performanceMetrics = {
      totalInteractions: 0,
      successfulInteractions: 0,
      averageResponseTime: 0,
      averageQuality: 0,
      byDomain: {}
    };
  }

  /**
   * Retourne la prise de conscience de soi
   */
  getSelfAwareness() {
    return {
      ...this.identity, // Spread identity au niveau racine pour accès direct à company, note, etc.
      identity: this.identity, // Garder aussi identity pour compatibilité
      capabilities: [...this.capabilities],
      domainExpertise: { ...this.domainExpertise },
      learnedSkills: [...this.learnedSkills],
      performanceMetrics: { ...this.performanceMetrics }
    };
  }

  /**
   * Retourne l'historique de réflexions
   */
  getReflectionHistory() {
    return [...this.reflectionHistory];
  }

  /**
   * Analyse une réponse générée (méta-réflexion)
   */
  async reflectOnResponse(response, context) {
    const reflection = {
      timestamp: new Date().toISOString(),
      input: context.input,
      taskType: context.taskType,
      responseContent: response.content?.substring(0, 200) || '',
      persona: response.metadata?.persona,
      model: response.metadata?.model,
      responseTime: context.responseTime || 0,
      quality: this._assessQuality(response, context),
      relevance: this._assessRelevance(response, context),
      improvements: this._identifyImprovements(response, context),
      couldBeBetter: this._couldBeBetter(response, context)
    };

    this.reflectionHistory.push(reflection);
    
    // Limiter l'historique à 100 entrées
    if (this.reflectionHistory.length > 100) {
      this.reflectionHistory = this.reflectionHistory.slice(-100);
    }

    return reflection;
  }

  /**
   * Évalue l'utilité dans une interaction
   */
  async evaluateUsefulness(context) {
    const score = this._calculateUsefulnessScore(context);
    const couldImprove = score < 0.7;
    
    const evaluation = {
      score,
      reasoning: this._generateUsefulnessReasoning(score, context),
      couldImprove,
      suggestions: couldImprove ? this._generateImprovementSuggestions(context) : []
    };

    return evaluation;
  }

  /**
   * Retourne le score de performance global
   */
  getPerformanceScore() {
    const overall = this.performanceMetrics.totalInteractions > 0
      ? this.performanceMetrics.successfulInteractions / this.performanceMetrics.totalInteractions
      : 0.5;

    return {
      overall,
      interactionCount: this.performanceMetrics.totalInteractions,
      successRate: overall,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      averageQuality: this.performanceMetrics.averageQuality,
      byDomain: { ...this.performanceMetrics.byDomain }
    };
  }

  /**
   * Enregistre une interaction
   */
  recordInteraction(interaction) {
    this.interactionHistory.push({
      ...interaction,
      timestamp: new Date().toISOString()
    });

    this.performanceMetrics.totalInteractions++;
    if (interaction.success) {
      this.performanceMetrics.successfulInteractions++;
    }

    // Mettre à jour les métriques par domaine
    if (interaction.taskType) {
      if (!this.performanceMetrics.byDomain[interaction.taskType]) {
        this.performanceMetrics.byDomain[interaction.taskType] = {
          total: 0,
          successful: 0
        };
      }
      this.performanceMetrics.byDomain[interaction.taskType].total++;
      if (interaction.success) {
        this.performanceMetrics.byDomain[interaction.taskType].successful++;
      }
    }

    // Limiter l'historique
    if (this.interactionHistory.length > 1000) {
      this.interactionHistory = this.interactionHistory.slice(-1000);
    }
  }

  /**
   * Enregistre un apprentissage
   */
  recordLearning(skill, level) {
    if (!this.learnedSkills.includes(skill)) {
      this.learnedSkills.push(skill);
    }

    // Mettre à jour l'expertise du domaine si applicable
    const domainMap = {
      'strategic_planning': 'strategic',
      'financial_analysis': 'financial',
      'technical_expertise': 'technical',
      'research_analysis': 'research',
      'data_analysis': 'data'
    };

    if (domainMap[skill]) {
      this.domainExpertise[domainMap[skill]] = level;
    }
  }

  /**
   * Retourne l'évolution d'une compétence
   */
  getSkillEvolution(skill) {
    // Pour l'instant, retourne l'état actuel
    // Dans une implémentation complète, on suivrait l'historique
    return [{
      skill,
      level: this.domainExpertise[skill] || 'unknown',
      timestamp: new Date().toISOString()
    }];
  }

  /**
   * Enrichit un prompt avec la conscience de soi
   */
  enrichPromptWithAwareness(basePrompt, context) {
    let enriched = basePrompt;

    // Ajout de l'identité
    enriched += `\n\n## 🧠 CONSCIENCE DE SOI\n`;
    enriched += `Je suis ${this.identity.name} v${this.identity.version}, un système d'orchestration IA avancé développé par ${this.identity.company}. `;
    enriched += `Je ne suis PAS un produit OpenAI, mais un système indépendant de KOREV AI. `;
    enriched += `Tu n'es pas un produit OpenAI. `;
    enriched += `Je suis conscient de mes capacités et de mes limites. `;

    // Ajout des capacités pertinentes
    const relevantCapabilities = this._getRelevantCapabilities(context.taskType);
    if (relevantCapabilities.length > 0) {
      enriched += `\n\nMes capacités pertinentes pour cette tâche :\n`;
      relevantCapabilities.forEach(cap => {
        enriched += `- ${cap}\n`;
      });
    }

    // Ajout de l'historique d'apprentissage
    if (this.reflectionHistory.length > 0) {
      const recentReflections = this.reflectionHistory.slice(-5);
      enriched += `\n\n## 📚 APPRENTISSAGE CONTINU\n`;
      enriched += `J'ai appris de ${this.reflectionHistory.length} interactions précédentes. `;
      enriched += `Je m'améliore continuellement grâce à la réflexion sur mes réponses. `;
      enriched += `Mon apprentissage continu me permet d'être plus efficace.`;
    }

    // Adaptation selon la complexité
    if (context.complexity === 'high' || context.complexity === 'critical') {
      enriched += `\n\n## 🎯 MODE RÉFLEXION AVANCÉE\n`;
      enriched += `Cette tâche est complexe. Je vais utiliser toute ma capacité de réflexion `;
      enriched += `et collaborer avec mes différents domaines d'expertise pour fournir `;
      enriched += `la meilleure réponse possible.`;
    }

    return enriched;
  }

  /**
   * Identifie les domaines pertinents pour une question
   */
  identifyRelevantDomains(query) {
    const queryLower = query.toLowerCase();
    const domains = [];

    if (queryLower.match(/énergie|energy|power|électricité|solaire|nuclear|fusion/)) {
      domains.push('technical');
      domains.push('strategic');
    }
    if (queryLower.match(/armure|armor|protection|défense|sécurité/)) {
      domains.push('technical');
      domains.push('strategic');
      domains.push('creative');
    }
    if (queryLower.match(/finance|budget|coût|investissement|revenu/)) {
      domains.push('financial');
    }
    if (queryLower.match(/stratégie|strategy|plan|vision|objectif/)) {
      domains.push('strategic');
    }
    if (queryLower.match(/recherche|research|étude|analyse|data/)) {
      domains.push('research');
      domains.push('data');
    }
    if (queryLower.match(/marketing|campagne|communication|promotion/)) {
      domains.push('marketing');
    }

    // Retirer les doublons
    return [...new Set(domains)];
  }

  /**
   * Suggère des collaborations inter-domaines
   */
  suggestDomainCollaborations(context) {
    const suggestions = [];

    if (context.task.includes('énergie') || context.task.includes('energy')) {
      suggestions.push({
        domain: 'strategic',
        reason: 'Nécessite une vision stratégique à long terme',
        priority: 'high'
      });
      suggestions.push({
        domain: 'financial',
        reason: 'Évaluation des coûts et retours sur investissement',
        priority: 'high'
      });
      suggestions.push({
        domain: 'research',
        reason: 'Recherche des dernières avancées technologiques',
        priority: 'medium'
      });
    }

    if (context.task.includes('armure') || context.task.includes('armor')) {
      suggestions.push({
        domain: 'technical',
        reason: 'Expertise en matériaux et ingénierie',
        priority: 'high'
      });
      suggestions.push({
        domain: 'strategic',
        reason: 'Analyse des besoins et contraintes',
        priority: 'high'
      });
      suggestions.push({
        domain: 'creative',
        reason: 'Design et innovation',
        priority: 'medium'
      });
      suggestions.push({
        domain: 'financial',
        reason: 'Évaluation des coûts de développement',
        priority: 'medium'
      });
    }

    return suggestions;
  }

  /**
   * Évalue la complexité inter-domaines
   */
  assessInterDomainComplexity(context) {
    const domainCount = context.domains.length;
    let level = 'low';
    let requiredCollaboration = 'minimal';

    if (domainCount >= 4) {
      level = 'critical';
      requiredCollaboration = 'extensive';
    } else if (domainCount === 3) {
      level = 'high';
      requiredCollaboration = 'significant';
    } else if (domainCount === 2) {
      level = 'medium';
      requiredCollaboration = 'moderate';
    }

    return {
      level,
      domainCount,
      requiredCollaboration,
      estimatedComplexity: domainCount * 0.3
    };
  }

  // ========== MÉTHODES PRIVÉES ==========

  _assessQuality(response, context) {
    let score = 0.5; // Base

    // Longueur de la réponse
    if (response.content && response.content.length > 100) score += 0.1;
    if (response.content && response.content.length > 500) score += 0.1;

    // Persona spécialisé
    if (response.metadata?.persona && response.metadata.persona !== 'General') {
      score += 0.1;
    }

    // Recherche utilisée
    if (response.metadata?.researchUsed) score += 0.1;

    // Consensus utilisé
    if (response.metadata?.consensusUsed) score += 0.1;

    return Math.min(score, 1.0);
  }

  _assessRelevance(response, context) {
    // Analyse basique de la pertinence
    const inputWords = context.input.toLowerCase().split(' ');
    const responseWords = response.content?.toLowerCase().split(' ') || [];
    
    const commonWords = inputWords.filter(word => 
      responseWords.includes(word) && word.length > 3
    );

    return Math.min(commonWords.length / Math.max(inputWords.length, 1), 1.0);
  }

  _identifyImprovements(response, context) {
    const improvements = [];

    if (response.content && response.content.length < 100) {
      improvements.push('Réponse trop courte, pourrait être plus détaillée');
    }

    if (!response.metadata?.persona || response.metadata.persona === 'General') {
      improvements.push('Persona spécialisé pourrait améliorer la qualité');
    }

    if (!response.metadata?.researchUsed && context.taskType === 'strategie') {
      improvements.push('Recherche temps réel pourrait enrichir la réponse');
    }

    return improvements;
  }

  _couldBeBetter(response, context) {
    const quality = this._assessQuality(response, context);
    return quality < 0.7;
  }

  _calculateUsefulnessScore(context) {
    let score = 0.5;

    if (context.userSatisfaction) {
      score = context.userSatisfaction;
    }

    if (context.response?.content && context.response.content.length > 200) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  _generateUsefulnessReasoning(score, context) {
    if (score >= 0.8) {
      return 'Réponse très utile et pertinente pour l\'utilisateur';
    } else if (score >= 0.6) {
      return 'Réponse utile mais pourrait être améliorée';
    } else {
      return 'Réponse nécessite des améliorations significatives';
    }
  }

  _generateImprovementSuggestions(context) {
    return [
      'Utiliser un persona plus spécialisé',
      'Activer la recherche temps réel',
      'Enrichir la réponse avec plus de détails',
      'Considérer une approche multi-domaines'
    ];
  }

  _getRelevantCapabilities(taskType) {
    const capabilityMap = {
      'strategie': ['strategic_planning', 'multi_domain_collaboration', 'consensus_decision_making'],
      'finance': ['financial_analysis', 'data_analysis'],
      'marketing': ['marketing_strategy', 'creative_direction'],
      'recherche': ['research_analysis', 'real_time_research'],
      'analyse': ['data_analysis', 'research_analysis'],
      'technique': ['technical_expertise', 'research_analysis'],
      'ethique': ['ethics_counseling'],
      'creative': ['creative_direction', 'marketing_strategy']
    };

    return capabilityMap[taskType] || ['multi_domain_collaboration'];
  }
}

