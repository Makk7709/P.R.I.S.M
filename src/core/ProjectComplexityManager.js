/**
 * ProjectComplexityManager - Détection projets complexes, plans structurés
 * @module src/core/ProjectComplexityManager
 */

export class ProjectComplexityManager {
  constructor() {
    this.activeProjects = new Map();
  }

  /**
   * Détecte si une requête est un projet complexe
   */
  detectComplexProject(query, context = {}) {
    const queryLower = query.toLowerCase();
    const complexityIndicators = {
      multiDomain: this._countDomains(query),
      longTerm: this._hasLongTermIndicators(queryLower),
      technical: this._hasTechnicalComplexity(queryLower),
      strategic: this._hasStrategicScope(queryLower),
      innovative: this._hasInnovationIndicators(queryLower)
    };

    const complexityScore = this._calculateComplexityScore(complexityIndicators);
    const isComplex = complexityScore >= 0.6;

    if (isComplex) {
      return {
        isComplex: true,
        complexityScore,
        indicators: complexityIndicators,
        estimatedDuration: this._estimateDuration(complexityScore),
        requiredDomains: this._identifyRequiredDomains(query)
      };
    }

    return {
      isComplex: false,
      complexityScore
    };
  }

  /**
   * Crée un plan structuré pour un projet complexe
   */
  createProjectPlan(project, query) {
    const plan = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: this._extractProjectName(query),
      description: query,
      complexity: project.complexityScore,
      domains: project.requiredDomains,
      phases: this._generatePhases(project),
      milestones: this._generateMilestones(project),
      estimatedDuration: project.estimatedDuration,
      createdAt: new Date().toISOString(),
      status: 'planning'
    };

    this.activeProjects.set(plan.id, plan);
    return plan;
  }

  /**
   * Met à jour l'avancement d'un projet
   */
  updateProjectProgress(projectId, progress) {
    const project = this.activeProjects.get(projectId);
    if (!project) {
      throw new Error(`Projet ${projectId} non trouvé`);
    }

    project.progress = progress;
    project.lastUpdated = new Date().toISOString();

    // Mettre à jour le statut selon le progrès
    if (progress >= 1.0) {
      project.status = 'completed';
    } else if (progress > 0) {
      project.status = 'in_progress';
    }

    return project;
  }

  /**
   * Récupère le contexte d'un projet actif
   */
  getProjectContext(projectId) {
    const project = this.activeProjects.get(projectId);
    if (!project) {
      return null;
    }

    return {
      name: project.name,
      description: project.description,
      currentPhase: this._getCurrentPhase(project),
      progress: project.progress || 0,
      nextMilestone: this._getNextMilestone(project),
      domains: project.domains
    };
  }

  /**
   * Trouve un projet actif par requête
   */
  findActiveProject(query) {
    const queryLower = query.toLowerCase();
    
    for (const [id, project] of this.activeProjects.entries()) {
      const projectLower = (`${project.name  } ${  project.description}`).toLowerCase();
      
      // Vérifier si la requête est liée au projet
      const keywords = projectLower.split(/\s+/).filter(w => w.length > 4);
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 4);
      
      const commonWords = keywords.filter(w => queryWords.includes(w));
      if (commonWords.length >= 2) {
        return project;
      }
    }

    return null;
  }

  // ========== MÉTHODES PRIVÉES ==========

  _countDomains(query) {
    const domains = ['technical', 'strategic', 'financial', 'research', 'marketing', 'creative'];
    const queryLower = query.toLowerCase();
    return domains.filter(domain => {
      const keywords = {
        technical: ['technique', 'énergie', 'energy', 'ingénierie'],
        strategic: ['stratégie', 'strategy', 'plan'],
        financial: ['finance', 'budget', 'coût'],
        research: ['recherche', 'research'],
        marketing: ['marketing', 'campagne'],
        creative: ['creative', 'design', 'armure', 'armor']
      };
      return keywords[domain].some(kw => queryLower.includes(kw));
    }).length;
  }

  _hasLongTermIndicators(query) {
    return /long.*terme|long.*term|5.*ans|10.*ans|année|year|roadmap|vision/.test(query);
  }

  _hasTechnicalComplexity(query) {
    return /complexe|complex|avancé|advanced|innovation|nouveau|new.*source|nouvelle.*source/.test(query);
  }

  _hasStrategicScope(query) {
    return /stratégie|strategy|vision|objectif|goal|mission/.test(query);
  }

  _hasInnovationIndicators(query) {
    return /nouveau|new|innovation|révolutionnaire|revolutionary|breakthrough/.test(query);
  }

  _calculateComplexityScore(indicators) {
    let score = 0;

    // Multi-domain (0-0.3)
    score += Math.min(indicators.multiDomain / 5, 0.3);

    // Long-term (0-0.2)
    if (indicators.longTerm) score += 0.2;

    // Technical (0-0.2)
    if (indicators.technical) score += 0.2;

    // Strategic (0-0.15)
    if (indicators.strategic) score += 0.15;

    // Innovation (0-0.15)
    if (indicators.innovative) score += 0.15;

    return Math.min(score, 1.0);
  }

  _estimateDuration(complexityScore) {
    if (complexityScore >= 0.8) return '6-12 mois';
    if (complexityScore >= 0.6) return '3-6 mois';
    if (complexityScore >= 0.4) return '1-3 mois';
    return '2-4 semaines';
  }

  _identifyRequiredDomains(query) {
    const domains = [];
    const queryLower = query.toLowerCase();

    if (queryLower.match(/énergie|energy|technique|technical/)) domains.push('technical');
    if (queryLower.match(/stratégie|strategy/)) domains.push('strategic');
    if (queryLower.match(/finance|budget/)) domains.push('financial');
    if (queryLower.match(/recherche|research/)) domains.push('research');
    if (queryLower.match(/marketing/)) domains.push('marketing');
    if (queryLower.match(/armure|armor|design|creative/)) domains.push('creative');

    return [...new Set(domains)];
  }

  _extractProjectName(query) {
    // Extraire un nom de projet de la requête
    const match = query.match(/(?:créer|create|développer|develop|construire|build)\s+(?:une|un|a|an)?\s*([^.!?]+)/i);
    if (match) {
      return match[1].trim();
    }
    return `Projet ${Date.now()}`;
  }

  _generatePhases(project) {
    const phases = [
      {
        name: 'Phase 1: Analyse & Conception',
        description: 'Analyse des besoins, conception initiale',
        duration: '2-4 semaines',
        status: 'pending'
      },
      {
        name: 'Phase 2: Développement',
        description: 'Développement et implémentation',
        duration: project.estimatedDuration,
        status: 'pending'
      },
      {
        name: 'Phase 3: Tests & Validation',
        description: 'Tests, validation, ajustements',
        duration: '2-4 semaines',
        status: 'pending'
      },
      {
        name: 'Phase 4: Déploiement',
        description: 'Déploiement et mise en production',
        duration: '1-2 semaines',
        status: 'pending'
      }
    ];

    return phases;
  }

  _generateMilestones(project) {
    return [
      { name: 'Conception validée', phase: 1, status: 'pending' },
      { name: 'Prototype fonctionnel', phase: 2, status: 'pending' },
      { name: 'Tests réussis', phase: 3, status: 'pending' },
      { name: 'Déploiement réussi', phase: 4, status: 'pending' }
    ];
  }

  _getCurrentPhase(project) {
    if (!project.progress) return project.phases[0];
    
    const phaseIndex = Math.floor(project.progress * project.phases.length);
    return project.phases[Math.min(phaseIndex, project.phases.length - 1)];
  }

  _getNextMilestone(project) {
    const pendingMilestones = project.milestones.filter(m => m.status === 'pending');
    return pendingMilestones[0] || null;
  }
}



