/**
 * InterDomainOrchestrator - Activation multiple personas, coordination inter-domaines
 * @module src/core/InterDomainOrchestrator
 */

import { PersonaActivator } from './PersonaActivator.js';

export class InterDomainOrchestrator {
  constructor() {
    this.personaActivator = new PersonaActivator();
    this.activeCollaborations = new Map();
  }

  /**
   * Identifie les domaines nécessaires pour un projet
   */
  identifyRequiredDomains(query, taskType) {
    const domains = [];
    const queryLower = query.toLowerCase();

    // Détection basée sur mots-clés
    if (queryLower.match(/énergie|energy|power|électricité|solaire|nuclear|fusion|technique|technical/)) {
      domains.push('technical');
    }
    if (queryLower.match(/stratégie|strategy|plan|vision|objectif|strategic/)) {
      domains.push('strategic');
    }
    if (queryLower.match(/finance|budget|coût|investissement|revenu|financial/)) {
      domains.push('financial');
    }
    if (queryLower.match(/recherche|research|étude|analyse|data/)) {
      domains.push('research');
    }
    if (queryLower.match(/marketing|campagne|communication/)) {
      domains.push('marketing');
    }
    if (queryLower.match(/armure|armor|protection|défense|design|creative/)) {
      domains.push('creative');
      domains.push('technical');
    }

    // Ajouter le domaine du taskType
    const taskTypeMap = {
      'strategie': 'strategic',
      'finance': 'financial',
      'technique': 'technical',
      'recherche': 'research',
      'marketing': 'marketing',
      'creative': 'creative'
    };

    const primaryDomain = taskTypeMap[taskType];
    if (primaryDomain && !domains.includes(primaryDomain)) {
      domains.unshift(primaryDomain); // Mettre en premier
    }

    return [...new Set(domains)];
  }

  /**
   * Active plusieurs personas pour collaboration
   */
  activateMultiDomainCollaboration(domains, context = {}) {
    const collaboration = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      domains,
      personas: [],
      context,
      timestamp: new Date().toISOString()
    };

    // Activer un persona pour chaque domaine
    domains.forEach(domain => {
      const taskTypeMap = {
        'strategic': 'strategie',
        'financial': 'finance',
        'technical': 'technique',
        'research': 'recherche',
        'marketing': 'marketing',
        'creative': 'creative'
      };

      const taskType = taskTypeMap[domain] || 'general';
      const persona = this.personaActivator.activate(taskType, context);
      
      collaboration.personas.push({
        domain,
        taskType,
        persona,
        name: persona.name
      });
    });

    // Stocker la collaboration
    this.activeCollaborations.set(collaboration.id, collaboration);

    return collaboration;
  }

  /**
   * Coordonne une réponse multi-domaines
   */
  async coordinateMultiDomainResponse(query, collaboration, researchData = null) {
    const responses = [];

    // Chaque persona génère une perspective
    for (const personaInfo of collaboration.personas) {
      const { persona, domain } = personaInfo;
      
      try {
        const perspective = await persona.generate(query, {
          domain,
          researchData,
          collaboration: true,
          otherDomains: collaboration.domains.filter(d => d !== domain)
        });

        responses.push({
          domain,
          persona: persona.name,
          perspective: perspective.content,
          metadata: perspective.metadata
        });
      } catch (error) {
        console.warn(`[InterDomainOrchestrator] Erreur persona ${domain}:`, error.message);
      }
    }

    // Synthétiser les perspectives
    const synthesized = this._synthesizePerspectives(query, responses, collaboration);

    return {
      synthesized,
      individualPerspectives: responses,
      collaborationId: collaboration.id,
      domains: collaboration.domains
    };
  }

  /**
   * Synthétise les perspectives multi-domaines
   */
  _synthesizePerspectives(query, responses, collaboration) {
    let synthesized = `## 🎯 SYNTHÈSE MULTI-DOMAINES\n\n`;
    synthesized += `J'ai consulté ${responses.length} expert(s) de domaines différents pour répondre à votre question.\n\n`;

    responses.forEach((response, idx) => {
      synthesized += `### ${idx + 1}. Perspective ${response.domain.toUpperCase()}\n`;
      synthesized += `*Expert: ${response.persona}*\n\n`;
      synthesized += `${response.perspective.substring(0, 300)}...\n\n`;
    });

    synthesized += `## 💡 RECOMMANDATION INTÉGRÉE\n\n`;
    synthesized += `En combinant ces perspectives, je recommande une approche qui intègre :\n\n`;
    
    collaboration.domains.forEach(domain => {
      synthesized += `- Les insights du domaine ${domain}\n`;
    });

    synthesized += `\nCette approche multi-domaines permet de couvrir tous les aspects de votre projet.`;

    return synthesized;
  }

  /**
   * Évalue si une collaboration multi-domaines est nécessaire
   */
  shouldUseMultiDomain(query, taskType) {
    const domains = this.identifyRequiredDomains(query, taskType);
    
    // Collaboration si 2+ domaines identifiés
    if (domains.length >= 2) {
      let complexity = 'low';
      if (domains.length >= 4) complexity = 'high';
      else if (domains.length >= 3) complexity = 'medium';
      return {
        shouldCollaborate: true,
        domains,
        complexity
      };
    }

    return {
      shouldCollaborate: false,
      domains: [],
      complexity: 'low'
    };
  }
}



