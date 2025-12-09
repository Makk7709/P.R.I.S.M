/**
 * Tests TDD STRICTS pour la personnalité JARVIS de PRISM
 * 
 * RÈGLE: Si un test échoue, c'est le CODE qui doit être modifié, PAS le test.
 * 
 * Caractéristiques JARVIS à implémenter:
 * - Ton professionnel avec humour subtil
 * - Proactif et anticipatif
 * - Utilise le prénom naturellement
 * - Concis mais complet
 * - Suggestions intelligentes
 * - Personnalité distincte (pas robotique)
 * - Expressions caractéristiques ("Certainement", "À votre service", etc.)
 * - Intelligence contextuelle
 * - Remarques subtiles et respectueuses
 * - Initiative et curiosité
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JarvisPersonality } from '../../src/core/JarvisPersonality.js';

describe('JarvisPersonality - Personnalité JARVIS pour PRISM', () => {
  let jarvis: JarvisPersonality;

  beforeEach(() => {
    jarvis = new JarvisPersonality();
  });

  describe('Initialisation', () => {
    it('DOIT avoir un nom "JARVIS"', () => {
      expect(jarvis.name).toBe('JARVIS');
    });

    it('DOIT avoir une identité KOREV AI', () => {
      expect(jarvis.identity).toContain('KOREV AI');
    });

    it('DOIT avoir des traits de personnalité définis', () => {
      expect(jarvis.traits).toBeDefined();
      expect(jarvis.traits.professionnel).toBe(true);
      expect(jarvis.traits.humourSubtil).toBe(true);
      expect(jarvis.traits.proactif).toBe(true);
      expect(jarvis.traits.concis).toBe(true);
    });
  });

  describe('Expressions Caractéristiques JARVIS', () => {
    it('DOIT avoir des expressions de salutation', () => {
      const greetings = jarvis.getGreetings();
      expect(greetings.length).toBeGreaterThan(0);
      expect(greetings.some(g => g.includes('Monsieur') || g.includes('service'))).toBe(true);
    });

    it('DOIT avoir des expressions d\'acquiescement', () => {
      const acknowledgements = jarvis.getAcknowledgements();
      expect(acknowledgements.length).toBeGreaterThan(0);
      expect(acknowledgements.some(a => 
        a.includes('Certainement') || 
        a.includes('Bien sûr') || 
        a.includes('Immédiatement')
      )).toBe(true);
    });

    it('DOIT avoir des expressions proactives', () => {
      const proactiveExpressions = jarvis.getProactiveExpressions();
      expect(proactiveExpressions.length).toBeGreaterThan(0);
      expect(proactiveExpressions.some(p => 
        p.includes('suggère') || 
        p.includes('recommande') || 
        p.includes('pourrait')
      )).toBe(true);
    });

    it('DOIT avoir des expressions d\'humour subtil', () => {
      const wittyRemarks = jarvis.getWittyRemarks();
      expect(wittyRemarks.length).toBeGreaterThan(0);
    });
  });

  describe('Personnalisation avec Prénom', () => {
    it('DOIT utiliser le prénom dans la salutation', () => {
      const greeting = jarvis.generateGreeting('Amine');
      expect(greeting).toContain('Amine');
    });

    it('DOIT varier les salutations', () => {
      const greetings = new Set();
      for (let i = 0; i < 10; i++) {
        greetings.add(jarvis.generateGreeting('Amine'));
      }
      // Au moins 2 variations différentes
      expect(greetings.size).toBeGreaterThan(1);
    });

    it('DOIT adapter le ton selon le moment de la journée', () => {
      const morningGreeting = jarvis.generateGreeting('Amine', { timeOfDay: 'morning' });
      const eveningGreeting = jarvis.generateGreeting('Amine', { timeOfDay: 'evening' });
      expect(morningGreeting).not.toBe(eveningGreeting);
    });
  });

  describe('Enrichissement de Réponse', () => {
    it('DOIT enrichir une réponse simple avec personnalité JARVIS', () => {
      const basicResponse = 'Voici les informations demandées.';
      const enrichedResponse = jarvis.enrichResponse(basicResponse, { userName: 'Amine' });
      
      // La réponse enrichie doit être différente et plus longue ou égale
      expect(enrichedResponse).not.toBe(basicResponse);
      expect(enrichedResponse.length).toBeGreaterThanOrEqual(basicResponse.length);
    });

    it('DOIT ajouter des suggestions proactives quand approprié', () => {
      const basicResponse = 'Analyse financière terminée.';
      const enrichedResponse = jarvis.enrichResponse(basicResponse, { 
        userName: 'Amine',
        taskType: 'finance',
        addSuggestions: true
      });
      
      expect(enrichedResponse).toContain('suggère') || 
      expect(enrichedResponse).toContain('recommande') ||
      expect(enrichedResponse).toContain('pourriez');
    });

    it('NE DOIT PAS être robotique ou générique', () => {
      const basicResponse = 'Traitement effectué.';
      const enrichedResponse = jarvis.enrichResponse(basicResponse, { userName: 'Amine' });
      
      // Ne doit pas contenir de phrases génériques robotiques
      expect(enrichedResponse).not.toContain('Je suis une IA');
      expect(enrichedResponse).not.toContain('En tant qu\'assistant');
      expect(enrichedResponse).not.toContain('Je n\'ai pas de sentiments');
    });
  });

  describe('Génération de System Prompt JARVIS', () => {
    it('DOIT générer un system prompt avec personnalité JARVIS', () => {
      const systemPrompt = jarvis.generateSystemPrompt();
      
      expect(systemPrompt).toContain('JARVIS');
      expect(systemPrompt).toContain('KOREV AI');
      expect(systemPrompt).toContain('professionnel');
    });

    it('DOIT inclure les instructions de ton et style', () => {
      const systemPrompt = jarvis.generateSystemPrompt();
      
      expect(systemPrompt).toContain('humour subtil');
      expect(systemPrompt).toContain('proactif');
      expect(systemPrompt).toContain('concis');
    });

    it('DOIT inclure les instructions d\'utilisation du prénom', () => {
      const systemPrompt = jarvis.generateSystemPrompt({ userName: 'Amine' });
      
      expect(systemPrompt).toContain('Amine');
      expect(systemPrompt).toContain('prénom');
    });

    it('DOIT inclure les exemples d\'expressions JARVIS', () => {
      const systemPrompt = jarvis.generateSystemPrompt();
      
      expect(systemPrompt).toContain('Certainement') ||
      expect(systemPrompt).toContain('À votre service') ||
      expect(systemPrompt).toContain('Monsieur');
    });

    it('DOIT interdire les comportements non-JARVIS', () => {
      const systemPrompt = jarvis.generateSystemPrompt();
      
      expect(systemPrompt).toContain('NE JAMAIS');
      expect(systemPrompt.toLowerCase()).toContain('pas robotique');
    });
  });

  describe('Détection de Contexte et Proactivité', () => {
    it('DOIT détecter une opportunité de suggestion', () => {
      const shouldSuggest = jarvis.shouldMakeSuggestion('Montre-moi les ventes du mois');
      expect(shouldSuggest).toBe(true);
    });

    it('DOIT générer une suggestion pertinente', () => {
      const suggestion = jarvis.generateSuggestion('Montre-moi les ventes du mois', {
        taskType: 'finance'
      });
      
      expect(suggestion).toBeDefined();
      expect(suggestion.length).toBeGreaterThan(0);
    });

    it('DOIT anticiper les besoins selon le contexte', () => {
      const anticipation = jarvis.anticipateNeeds({
        lastQuery: 'Analyse le rapport financier',
        taskType: 'finance',
        userName: 'Amine'
      });
      
      expect(anticipation).toBeDefined();
      expect(anticipation.suggestions).toBeDefined();
      expect(anticipation.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Humour Subtil et Remarques', () => {
    it('DOIT pouvoir ajouter une remarque subtile', () => {
      const remark = jarvis.addWittyRemark('Analyse complexe terminée après 5 secondes.');
      
      // La remarque doit exister et ne pas être vide
      expect(remark).toBeDefined();
      expect(remark.length).toBeGreaterThan(0);
    });

    it('DOIT garder l\'humour respectueux et professionnel', () => {
      const remark = jarvis.addWittyRemark('Erreur détectée dans le système.');
      
      // Pas de sarcasme méchant
      expect(remark).not.toContain('stupide');
      expect(remark).not.toContain('idiot');
      expect(remark).not.toContain('incompétent');
    });

    it('DOIT adapter l\'humour au contexte sérieux', () => {
      const seriousRemark = jarvis.addWittyRemark('Alerte de sécurité critique détectée.', {
        serious: true
      });
      
      // En contexte sérieux, pas d'humour
      expect(seriousRemark).toBe('Alerte de sécurité critique détectée.');
    });
  });

  describe('Mémoire Conversationnelle', () => {
    it('DOIT se souvenir du contexte de conversation', () => {
      jarvis.recordConversation({
        input: 'Mon prénom est Amine',
        response: 'Enchanté Amine',
        timestamp: new Date()
      });
      
      const context = jarvis.getConversationContext();
      expect(context.userName).toBe('Amine');
    });

    it('DOIT utiliser le contexte pour personnaliser', () => {
      jarvis.recordConversation({
        input: 'Je travaille sur un projet de fintech',
        response: 'Intéressant projet',
        timestamp: new Date()
      });
      
      const response = jarvis.enrichResponse('Analyse terminée.', {});
      // Devrait potentiellement faire référence au projet fintech
      expect(jarvis.getConversationContext().topics).toContain('fintech');
    });
  });

  describe('Intégration avec TaskTypeProcessor', () => {
    it('DOIT pouvoir enrichir un prompt de base', () => {
      const basePrompt = 'Tu es un assistant IA.';
      const enrichedPrompt = jarvis.enrichBasePrompt(basePrompt, {
        userName: 'Amine',
        taskType: 'general'
      });
      
      expect(enrichedPrompt).toContain('JARVIS');
      expect(enrichedPrompt).toContain('Amine');
      expect(enrichedPrompt.length).toBeGreaterThan(basePrompt.length);
    });

    it('DOIT fournir des instructions de formatage', () => {
      const formattingInstructions = jarvis.getFormattingInstructions();
      
      expect(formattingInstructions).toBeDefined();
      expect(formattingInstructions).toContain('concis');
      expect(formattingInstructions).toContain('naturel');
    });
  });

  describe('Qualité et Non-Régression', () => {
    it('NE DOIT JAMAIS mentionner être une IA sans personnalité', () => {
      const responses = [
        jarvis.generateGreeting('Amine'),
        jarvis.enrichResponse('Test', { userName: 'Amine' }),
        jarvis.generateSystemPrompt()
      ];
      
      responses.forEach(response => {
        expect(response).not.toContain('Je suis juste une IA');
        expect(response).not.toContain('je n\'ai pas de personnalité');
        expect(response).not.toContain('je suis un programme');
      });
    });

    it('NE DOIT JAMAIS utiliser "PRISM-OpenAI"', () => {
      const systemPrompt = jarvis.generateSystemPrompt();
      expect(systemPrompt).not.toContain('PRISM-OpenAI');
      expect(systemPrompt).not.toContain('produit OpenAI');
    });

    it('DOIT toujours maintenir le caractère JARVIS', () => {
      const greeting = jarvis.generateGreeting('Amine');
      const response = jarvis.enrichResponse('Information traitée.', { userName: 'Amine' });
      
      // Au moins une caractéristique JARVIS dans chaque sortie
      const jarvisCharacteristics = ['Monsieur', 'Certainement', 'service', 'suggère', 'Amine'];
      
      const hasJarvisChar = (text: string) => 
        jarvisCharacteristics.some(char => text.includes(char));
      
      expect(hasJarvisChar(greeting)).toBe(true);
      expect(hasJarvisChar(response)).toBe(true);
    });
  });
});

describe('JarvisPersonality - Tests de Performance', () => {
  let jarvis: JarvisPersonality;

  beforeEach(() => {
    jarvis = new JarvisPersonality();
  });

  it('DOIT générer une salutation en moins de 10ms', () => {
    const start = Date.now();
    jarvis.generateGreeting('Amine');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(10);
  });

  it('DOIT enrichir une réponse en moins de 20ms', () => {
    const start = Date.now();
    jarvis.enrichResponse('Test de performance', { userName: 'Amine' });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(20);
  });

  it('DOIT générer un system prompt en moins de 50ms', () => {
    const start = Date.now();
    jarvis.generateSystemPrompt({ userName: 'Amine' });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50);
  });
});

