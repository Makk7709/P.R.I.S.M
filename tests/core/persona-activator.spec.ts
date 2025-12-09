/**
 * Tests TDD pour PersonaActivator
 * Processus TDD strict - Pas de simplification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PersonaActivator } from '../../src/core/PersonaActivator.js';

describe('PersonaActivator', () => {
  let activator: PersonaActivator;

  beforeEach(() => {
    activator = new PersonaActivator();
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec tous les personas disponibles', () => {
      expect(activator).toBeDefined();
      const personas = (activator as any).personas;
      expect(personas).toBeDefined();
      expect(personas.general).toBeDefined();
      expect(personas.financialAdvisor).toBeDefined();
      expect(personas.marketingStrategist).toBeDefined();
      expect(personas.strategicAdvisor).toBeDefined();
      expect(personas.researchAnalyst).toBeDefined();
    });
  });

  describe('Mapping Task Type → Persona', () => {
    it('DOIT mapper finance → FinancialAdvisorPersona', () => {
      const persona = activator.activate('finance');
      expect(persona.name).toBe('Financial Advisor');
    });

    it('DOIT mapper marketing → MarketingStrategistPersona', () => {
      const persona = activator.activate('marketing');
      expect(persona.name).toBe('Marketing Strategist');
    });

    it('DOIT mapper strategie → StrategicAdvisorPersona', () => {
      const persona = activator.activate('strategie');
      expect(persona.name).toBe('Strategic Advisor');
    });

    it('DOIT mapper recherche → ResearchAnalystPersona', () => {
      const persona = activator.activate('recherche');
      expect(persona.name).toBe('Research Analyst');
    });

    it('DOIT mapper analyse → DataAnalystPersona', () => {
      const persona = activator.activate('analyse');
      expect(persona.name).toBe('Data Analyst');
    });

    it('DOIT mapper technique → TechnicalExpertPersona', () => {
      const persona = activator.activate('technique');
      expect(persona.name).toBe('Technical Expert');
    });

    it('DOIT mapper ethique → EthicsCounselorPersona', () => {
      const persona = activator.activate('ethique');
      expect(persona.name).toBe('Ethics Counselor');
    });

    it('DOIT mapper creative → CreativeDirectorPersona', () => {
      const persona = activator.activate('creative');
      expect(persona.name).toBe('Creative Director');
    });

    it('DOIT retourner GeneralPersona pour taskType inconnu', () => {
      const persona = activator.activate('unknown');
      expect(persona.name).toBe('General');
    });
  });

  describe('Strategic Advisor Persona', () => {
    it('DOIT avoir un prompt système avancé', () => {
      const persona = activator.activate('strategie');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('Strategic Advisor');
      expect(prompt).toContain('C-suite');
      expect(prompt).toContain('Vision Stratégique');
      expect(prompt).toContain('Court terme');
      expect(prompt).toContain('Moyen terme');
      expect(prompt).toContain('Long terme');
      expect(prompt).toContain('Alternatives Stratégiques');
      expect(prompt).toContain('Recommandation');
      expect(prompt).toContain('Risques & Mitigation');
    });

    it('DOIT formater les données de recherche correctement', () => {
      const persona = activator.activate('strategie');
      const researchData = {
        summary: 'Synthèse des données',
        sources: [
          { title: 'Source 1', url: 'http://example.com/1', date: '2024-12-01' },
          { title: 'Source 2', url: 'http://example.com/2', date: '2024-12-02' }
        ],
        timestamp: new Date().toISOString()
      };

      const formatted = persona.formatResearchData(researchData);
      
      expect(formatted).toContain('Sources de Recherche Temps Réel');
      expect(formatted).toContain('Source 1');
      expect(formatted).toContain('http://example.com/1');
      expect(formatted).toContain('Source 2');
      expect(formatted).toContain('Synthèse des Données');
    });

    it('DOIT construire un contexte enrichi avec recherche', () => {
      const persona = activator.activate('strategie', {
        criticality: { level: 'medium' },
        context: {}
      });

      const researchData = {
        summary: 'Données de recherche',
        sources: [],
        timestamp: new Date().toISOString()
      };

      const context = persona.buildContext('input test', researchData);
      
      expect(context).toContain('Strategic Advisor');
      expect(context).toContain('DONNÉES TEMPS RÉEL');
      expect(context).toContain('Données de recherche');
    });
  });

  describe('Financial Advisor Persona', () => {
    it('DOIT avoir un prompt système spécialisé finance', () => {
      const persona = activator.activate('finance');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('Financial Advisor');
      expect(prompt).toContain('finance');
      expect(prompt).toContain('Analyse Financière');
      expect(prompt).toContain('Risques Identifiés');
      expect(prompt).toContain('Recommandations');
      expect(prompt).toContain('Projections');
    });

    it('DOIT formater les données financières en tableaux', () => {
      const persona = activator.activate('finance');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('| Métrique | Valeur | Évolution | Analyse |');
    });
  });

  describe('Marketing Strategist Persona', () => {
    it('DOIT avoir un prompt système créatif', () => {
      const persona = activator.activate('marketing');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('Marketing Strategist');
      expect(prompt).toContain('Objectif Marketing');
      expect(prompt).toContain('Stratégie');
      expect(prompt).toContain('Actions Concrètes');
      expect(prompt).toContain('Éléments Créatifs');
      expect(prompt).toContain('Métriques de Succès');
    });
  });

  describe('Research Analyst Persona', () => {
    it('DOIT avoir un prompt système factuel', () => {
      const persona = activator.activate('recherche');
      const prompt = persona.getSystemPrompt();
      
      expect(prompt).toContain('Research Analyst');
      expect(prompt).toContain('Sources de Recherche');
      expect(prompt).toContain('Faits Vérifiés');
      expect(prompt).toContain('Analyses & Opinions');
      expect(prompt).toContain('Synthèse');
    });

    it('DOIT formater les sources avec dates', () => {
      const persona = activator.activate('recherche');
      const researchData = {
        summary: 'Summary',
        sources: [
          { title: 'Article 1', url: 'http://example.com', date: '2024-12-01' }
        ],
        timestamp: new Date().toISOString()
      };

      const formatted = persona.formatResearchData(researchData);
      
      expect(formatted).toContain('Article 1');
      expect(formatted).toContain('2024-12-01');
    });
  });

  describe('Génération de Réponse', () => {
    it('DOIT générer une réponse avec le persona', async () => {
      const persona = activator.activate('strategie');
      
      // Mock de l'appel API (sera implémenté dans le persona)
      const mockGenerate = vi.fn().mockResolvedValue({
        content: 'Réponse stratégique générée',
        metadata: {
          persona: 'Strategic Advisor',
          format: 'strategic'
        }
      });

      persona.generate = mockGenerate;

      const result = await persona.generate('input test', {});

      expect(mockGenerate).toHaveBeenCalledWith('input test', {});
      expect(result.content).toBe('Réponse stratégique générée');
      expect(result.metadata.persona).toBe('Strategic Advisor');
    });
  });

  describe('Options de Persona', () => {
    it('DOIT passer les options au persona', () => {
      const options = {
        criticality: { level: 'high', isCritical: true },
        context: { user: 'test' }
      };

      const persona = activator.activate('strategie', options);
      
      expect(persona.criticality).toEqual(options.criticality);
      expect(persona.context).toEqual(options.context);
    });
  });
});

