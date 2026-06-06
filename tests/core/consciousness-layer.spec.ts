/**
 * Tests TDD pour ConsciousnessLayer
 * Processus TDD strict - Pas de simplification
 * Couverture minimum 95%
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConsciousnessLayer } from '../../src/core/ConsciousnessLayer.js';

describe('ConsciousnessLayer', () => {
  let consciousness: ConsciousnessLayer;

  beforeEach(() => {
    consciousness = new ConsciousnessLayer();
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec état de conscience de base', () => {
      expect(consciousness).toBeDefined();
      expect(consciousness.getSelfAwareness()).toBeDefined();
      expect(consciousness.getSelfAwareness().identity.name).toBe('PRISM');
      expect(consciousness.getSelfAwareness().capabilities).toBeDefined();
    });

    it('DOIT avoir une liste de capacités initiales', () => {
      const awareness = consciousness.getSelfAwareness();
      expect(Array.isArray(awareness.capabilities)).toBe(true);
      expect(awareness.capabilities.length).toBeGreaterThan(0);
    });

    it('DOIT avoir un historique de réflexions vide au départ', () => {
      const reflections = consciousness.getReflectionHistory();
      expect(Array.isArray(reflections)).toBe(true);
      expect(reflections.length).toBe(0);
    });
  });

  describe('Self-Awareness (Prise de conscience de soi)', () => {
    it('DOIT retourner l\'identité de PRISM', () => {
      const awareness = consciousness.getSelfAwareness();
      expect(awareness.identity.name).toBe('PRISM');
      expect(awareness.identity.version).toBeDefined();
    });

    it('DOIT lister toutes les capacités disponibles', () => {
      const awareness = consciousness.getSelfAwareness();
      expect(awareness.capabilities).toContain('strategic_planning');
      expect(awareness.capabilities).toContain('financial_analysis');
      expect(awareness.capabilities).toContain('technical_expertise');
      expect(awareness.capabilities).toContain('research_analysis');
      expect(awareness.capabilities).toContain('multi_domain_collaboration');
    });

    it('DOIT retourner le niveau de compétence par domaine', () => {
      const awareness = consciousness.getSelfAwareness();
      expect(awareness.domainExpertise).toBeDefined();
      expect(awareness.domainExpertise.strategic).toBeDefined();
      expect(awareness.domainExpertise.financial).toBeDefined();
      expect(awareness.domainExpertise.technical).toBeDefined();
    });

    it('DOIT mettre à jour les capacités après apprentissage', () => {
      consciousness.recordLearning('new_capability', 'advanced');
      const awareness = consciousness.getSelfAwareness();
      expect(awareness.learnedSkills).toContain('new_capability');
    });
  });

  describe('Meta-Reflection (Méta-réflexion)', () => {
    it('DOIT analyser une réponse générée', async () => {
      const response = {
        content: 'Test response',
        metadata: { persona: 'Strategic Advisor', model: 'gpt-4' }
      };

      const reflection = await consciousness.reflectOnResponse(response, {
        input: 'Test input',
        taskType: 'strategie',
        responseTime: 1500
      });

      expect(reflection).toBeDefined();
      expect(reflection.quality).toBeDefined();
      expect(reflection.relevance).toBeDefined();
      expect(reflection.improvements).toBeDefined();
    });

    it('DOIT évaluer la qualité de la réponse', async () => {
      const response = {
        content: 'Réponse détaillée et structurée',
        metadata: { persona: 'Strategic Advisor' }
      };

      const reflection = await consciousness.reflectOnResponse(response, {
        input: 'Question stratégique complexe',
        taskType: 'strategie'
      });

      expect(reflection.quality).toBeGreaterThanOrEqual(0);
      expect(reflection.quality).toBeLessThanOrEqual(1);
    });

    it('DOIT identifier des points d\'amélioration', async () => {
      const response = {
        content: 'Réponse basique',
        metadata: { persona: 'General' }
      };

      const reflection = await consciousness.reflectOnResponse(response, {
        input: 'Question complexe',
        taskType: 'strategie'
      });

      expect(reflection.improvements).toBeDefined();
      expect(Array.isArray(reflection.improvements)).toBe(true);
    });

    it('DOIT enregistrer la réflexion dans l\'historique', async () => {
      const response = {
        content: 'Test',
        metadata: {}
      };

      await consciousness.reflectOnResponse(response, {
        input: 'Test',
        taskType: 'general'
      });

      const history = consciousness.getReflectionHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('quality');
      expect(history[0]).toHaveProperty('input');
    });
  });

  describe('Self-Evaluation (Auto-évaluation)', () => {
    it('DOIT évaluer son utilité dans une interaction', async () => {
      const evaluation = await consciousness.evaluateUsefulness({
        input: 'Question simple',
        response: { content: 'Réponse utile', metadata: {} },
        userSatisfaction: 0.8
      });

      expect(evaluation).toBeDefined();
      expect(evaluation.score).toBeGreaterThanOrEqual(0);
      expect(evaluation.score).toBeLessThanOrEqual(1);
      expect(evaluation.reasoning).toBeDefined();
    });

    it('DOIT identifier si une meilleure réponse était possible', async () => {
      const evaluation = await consciousness.evaluateUsefulness({
        input: 'Question complexe',
        response: { content: 'Réponse basique', metadata: {} },
        userSatisfaction: 0.3
      });

      expect(evaluation.couldImprove).toBeDefined();
      expect(typeof evaluation.couldImprove).toBe('boolean');
      if (evaluation.couldImprove) {
        expect(evaluation.suggestions).toBeDefined();
      }
    });

    it('DOIT calculer un score de performance global', () => {
      const performance = consciousness.getPerformanceScore();
      expect(performance).toBeDefined();
      expect(performance.overall).toBeGreaterThanOrEqual(0);
      expect(performance.overall).toBeLessThanOrEqual(1);
      expect(performance.byDomain).toBeDefined();
    });

    it('DOIT suivre l\'évolution de la performance', () => {
      consciousness.recordInteraction({
        taskType: 'strategie',
        success: true,
        responseTime: 1000
      });

      const performance = consciousness.getPerformanceScore();
      expect(performance.interactionCount).toBeGreaterThan(0);
    });
  });

  describe('Consciousness Integration (Intégration dans réponses)', () => {
    it('DOIT enrichir un prompt avec conscience de soi', () => {
      const basePrompt = 'Tu es PRISM.';
      const enriched = consciousness.enrichPromptWithAwareness(basePrompt, {
        taskType: 'strategie',
        context: {}
      });

      expect(enriched).toContain('PRISM');
      expect(enriched).toContain('conscient');
      expect(enriched.length).toBeGreaterThan(basePrompt.length);
    });

    it('DOIT inclure les capacités disponibles dans le prompt', () => {
      const enriched = consciousness.enrichPromptWithAwareness('Base prompt', {
        taskType: 'strategie'
      });

      expect(enriched).toContain('capacités');
      expect(enriched).toContain('strategic_planning');
    });

    it('DOIT inclure l\'historique de réflexions pertinentes', async () => {
      // Enregistrer quelques réflexions
      await consciousness.reflectOnResponse(
        { content: 'Test stratégie', metadata: {} },
        { input: 'Test', taskType: 'strategie' }
      );
      await consciousness.reflectOnResponse(
        { content: 'Test finance', metadata: {} },
        { input: 'Test', taskType: 'finance' }
      );

      const enriched = consciousness.enrichPromptWithAwareness('Base', {
        taskType: 'strategie'
      });

      expect(enriched).toContain('apprentissage');
      expect(enriched).toContain('interactions');
    });

    it('DOIT adapter le niveau de conscience selon la complexité', () => {
      const simple = consciousness.enrichPromptWithAwareness('Base', {
        taskType: 'general',
        complexity: 'low'
      });

      const complex = consciousness.enrichPromptWithAwareness('Base', {
        taskType: 'strategie',
        complexity: 'high'
      });

      expect(complex.length).toBeGreaterThan(simple.length);
      expect(complex).toContain('réflexion');
    });
  });

  describe('Learning Integration (Intégration apprentissage)', () => {
    it('DOIT enregistrer un apprentissage', () => {
      consciousness.recordLearning('new_skill', 'intermediate');
      const awareness = consciousness.getSelfAwareness();
      expect(awareness.learnedSkills).toBeDefined();
      expect(awareness.learnedSkills).toContain('new_skill');
    });

    it('DOIT mettre à jour le niveau de compétence', () => {
      consciousness.recordLearning('strategic_planning', 'advanced');
      const awareness = consciousness.getSelfAwareness();
      expect(awareness.domainExpertise.strategic).toBe('advanced');
    });

    it('DOIT suivre l\'évolution des compétences', () => {
      consciousness.recordLearning('skill1', 'beginner');
      consciousness.recordLearning('skill1', 'intermediate');
      consciousness.recordLearning('skill1', 'advanced');

      const evolution = consciousness.getSkillEvolution('skill1');
      expect(evolution).toBeDefined();
      expect(Array.isArray(evolution)).toBe(true);
      expect(evolution.length).toBeGreaterThan(0);
      expect(evolution[0]).toHaveProperty('skill');
      expect(evolution[0]).toHaveProperty('level');
    });
  });

  describe('Cross-Domain Awareness (Conscience inter-domaines)', () => {
    it('DOIT identifier les domaines pertinents pour une question', () => {
      const domains = consciousness.identifyRelevantDomains('Créons une nouvelle source d\'énergie');
      expect(Array.isArray(domains)).toBe(true);
      expect(domains.length).toBeGreaterThan(0);
      expect(domains).toContain('technical');
      expect(domains).toContain('strategic');
    });

    it('DOIT suggérer des collaborations inter-domaines', () => {
      const suggestions = consciousness.suggestDomainCollaborations({
        primaryDomain: 'technical',
        task: 'Créer une armure Iron Man'
      });

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('domain');
      expect(suggestions[0]).toHaveProperty('reason');
    });

    it('DOIT évaluer la complexité inter-domaines', () => {
      const complexity = consciousness.assessInterDomainComplexity({
        domains: ['technical', 'strategic', 'financial'],
        task: 'Projet complexe multi-domaines'
      });

      expect(complexity).toBeDefined();
      expect(complexity.level).toMatch(/low|medium|high|critical/);
      expect(complexity.requiredCollaboration).toBeDefined();
    });
  });
});

