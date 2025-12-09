/**
 * Tests TDD STRICTS pour InfographicGenerator (Nano Banana / Gemini)
 * 
 * RÈGLE: Si un test échoue, c'est le CODE qui doit être modifié, PAS le test.
 * 
 * Fonctionnalités à implémenter:
 * - Génération d'infographies pour chaque type de scénario
 * - Intégration avec PDF export
 * - Templates visuels par domaine (finance, stratégie, marketing, etc.)
 * - Caching des images générées
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InfographicGenerator } from '../../src/infographic/InfographicGenerator.js';

// Mock de l'API Gemini
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'Mocked Gemini response'
        }
      })
    })
  }))
}));

describe('InfographicGenerator - Génération d\'infographies PRISM', () => {
  let generator: InfographicGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new InfographicGenerator();
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec la clé API', () => {
      expect(generator).toBeDefined();
      expect(generator.isConfigured()).toBe(true);
    });

    it('DOIT avoir les templates par défaut pour chaque domaine', () => {
      const templates = generator.getTemplates();
      expect(templates).toBeDefined();
      expect(templates.finance).toBeDefined();
      expect(templates.strategie).toBeDefined();
      expect(templates.marketing).toBeDefined();
      expect(templates.recherche).toBeDefined();
      expect(templates.general).toBeDefined();
    });

    it('DOIT avoir les palettes de couleurs par domaine', () => {
      const palettes = generator.getColorPalettes();
      expect(palettes.finance).toBeDefined();
      expect(palettes.finance.primary).toBeDefined();
      expect(palettes.strategie).toBeDefined();
      expect(palettes.marketing).toBeDefined();
    });
  });

  describe('Génération de Prompt Infographique', () => {
    it('DOIT générer un prompt pour infographie financière', () => {
      const data = {
        title: 'Analyse Financière Q4',
        metrics: [
          { label: 'Revenus', value: '2.5M€', change: '+15%' },
          { label: 'Marge', value: '32%', change: '+3%' }
        ],
        insights: ['Croissance soutenue', 'Expansion internationale']
      };

      const prompt = generator.buildInfographicPrompt('finance', data);

      expect(prompt).toContain('infographie');
      expect(prompt).toContain('financière');
      expect(prompt).toContain('Analyse Financière Q4');
      expect(prompt).toContain('2.5M€');
    });

    it('DOIT générer un prompt pour infographie stratégique', () => {
      const data = {
        title: 'Vision Stratégique 2025',
        objectives: ['Expansion UAE', 'Partenariats B2B', 'Innovation IA'],
        timeline: '12 mois'
      };

      const prompt = generator.buildInfographicPrompt('strategie', data);

      expect(prompt).toContain('stratégique');
      expect(prompt).toContain('Vision Stratégique 2025');
      expect(prompt).toContain('Expansion UAE');
    });

    it('DOIT générer un prompt pour infographie marketing', () => {
      const data = {
        title: 'Performance Campagne',
        kpis: [
          { name: 'CTR', value: '4.5%' },
          { name: 'Conversion', value: '2.3%' }
        ],
        channels: ['Social Media', 'Email', 'SEO']
      };

      const prompt = generator.buildInfographicPrompt('marketing', data);

      expect(prompt).toContain('marketing');
      expect(prompt).toContain('Performance Campagne');
      expect(prompt).toContain('CTR');
    });

    it('DOIT inclure les instructions de style visuel', () => {
      const data = { title: 'Test' };
      const prompt = generator.buildInfographicPrompt('finance', data);

      expect(prompt).toContain('professionnel');
      expect(prompt).toContain('moderne');
      expect(prompt.toLowerCase()).toContain('couleur');
    });
  });

  describe('Génération d\'Image via Gemini', () => {
    it('DOIT générer une image pour un scénario finance', async () => {
      const data = {
        title: 'Bilan Financier',
        content: 'Analyse des performances Q4'
      };

      const result = await generator.generateInfographic('finance', data);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.type).toBe('finance');
    });

    it('DOIT retourner une URL ou base64 de l\'image', async () => {
      const data = { title: 'Test', content: 'Contenu' };

      const result = await generator.generateInfographic('strategie', data);

      expect(result.imageData).toBeDefined();
      // L'image peut être en base64 ou URL
      expect(
        result.imageData.startsWith('data:image') || 
        result.imageData.startsWith('http')
      ).toBe(true);
    });

    it('DOIT gérer les erreurs API gracieusement', async () => {
      // Simuler une erreur API
      generator._simulateError = true;

      const result = await generator.generateInfographic('finance', { title: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fallback).toBeDefined(); // Image de fallback
    });

    it('DOIT retourner les métadonnées de génération', async () => {
      const result = await generator.generateInfographic('marketing', {
        title: 'Campagne',
        content: 'Résultats'
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.generatedAt).toBeDefined();
      expect(result.metadata.promptUsed).toBeDefined();
      expect(result.metadata.model).toBeDefined();
    });
  });

  describe('Templates par Domaine', () => {
    it('DOIT avoir un template finance avec graphiques financiers', () => {
      const template = generator.getTemplate('finance');

      expect(template.elements).toContain('bar_chart');
      expect(template.elements).toContain('kpi_cards');
      expect(template.elements).toContain('trend_line');
      expect(template.style).toBe('corporate');
    });

    it('DOIT avoir un template stratégie avec timeline', () => {
      const template = generator.getTemplate('strategie');

      expect(template.elements).toContain('timeline');
      expect(template.elements).toContain('roadmap');
      expect(template.elements).toContain('objectives');
    });

    it('DOIT avoir un template marketing avec métriques', () => {
      const template = generator.getTemplate('marketing');

      expect(template.elements).toContain('funnel');
      expect(template.elements).toContain('pie_chart');
      expect(template.elements).toContain('metrics_grid');
    });

    it('DOIT avoir un template recherche avec données', () => {
      const template = generator.getTemplate('recherche');

      expect(template.elements).toContain('data_table');
      expect(template.elements).toContain('source_citations');
      expect(template.elements).toContain('insights_panel');
    });
  });

  describe('Intégration avec PDF Export', () => {
    it('DOIT pouvoir générer une infographie pour insertion PDF', async () => {
      const chatData = {
        messages: [
          { role: 'user', content: 'Analyse financière de notre Q4' },
          { role: 'assistant', content: 'Voici l\'analyse: revenus +15%...' }
        ],
        taskType: 'finance',
        metadata: { model: 'gpt-4' }
      };

      const infographic = await generator.generateForPdf(chatData);

      expect(infographic).toBeDefined();
      expect(infographic.buffer).toBeDefined(); // Buffer pour PDFKit
      expect(infographic.width).toBeDefined();
      expect(infographic.height).toBeDefined();
    });

    it('DOIT adapter la taille pour le format PDF A4', async () => {
      const infographic = await generator.generateForPdf({
        messages: [],
        taskType: 'general'
      });

      // Largeur max pour A4 avec marges (en points)
      expect(infographic.width).toBeLessThanOrEqual(500);
      expect(infographic.height).toBeLessThanOrEqual(700);
    });

    it('DOIT extraire automatiquement les données clés du chat', () => {
      const chatMessages = [
        { role: 'user', content: 'Montre-moi les ventes du mois' },
        { role: 'assistant', content: 'Les ventes totales sont de 150K€, en hausse de 12%. Les produits phares: Produit A (45K€), Produit B (38K€).' }
      ];

      const extractedData = generator.extractDataFromChat(chatMessages, 'finance');

      expect(extractedData.metrics).toBeDefined();
      expect(extractedData.metrics.length).toBeGreaterThan(0);
      expect(extractedData.title).toBeDefined();
    });
  });

  describe('Caching des Infographies', () => {
    it('DOIT cacher les infographies générées', async () => {
      const data = { title: 'Test Cache', content: 'Contenu identique' };

      // Première génération
      const result1 = await generator.generateInfographic('finance', data);
      
      // Deuxième génération (devrait utiliser le cache)
      const result2 = await generator.generateInfographic('finance', data);

      expect(result1.imageData).toBe(result2.imageData);
      expect(result2.fromCache).toBe(true);
    });

    it('DOIT avoir une durée de cache configurable', () => {
      expect(generator.getCacheTTL()).toBeGreaterThan(0);
      
      generator.setCacheTTL(3600000); // 1 heure
      expect(generator.getCacheTTL()).toBe(3600000);
    });

    it('DOIT invalider le cache si les données changent', async () => {
      const data1 = { title: 'Version 1', content: 'A' };
      const data2 = { title: 'Version 2', content: 'B' };

      const result1 = await generator.generateInfographic('finance', data1);
      const result2 = await generator.generateInfographic('finance', data2);

      expect(result2.fromCache).toBe(false);
    });
  });

  describe('Styles Visuels', () => {
    it('DOIT appliquer le style PRISM/KOREV aux infographies', () => {
      const style = generator.getPrismStyle();

      expect(style.branding).toBeDefined();
      expect(style.branding.name).toBe('PRISM');
      expect(style.branding.company).toBe('KOREV AI');
      expect(style.fonts).toBeDefined();
      expect(style.colors).toBeDefined();
    });

    it('DOIT inclure le logo PRISM dans les infographies', async () => {
      const result = await generator.generateInfographic('finance', {
        title: 'Test',
        includeBranding: true
      });

      expect(result.metadata.brandingIncluded).toBe(true);
    });
  });
});

describe('InfographicGenerator - Tests de Performance', () => {
  let generator: InfographicGenerator;

  beforeEach(() => {
    generator = new InfographicGenerator();
  });

  it('DOIT générer un prompt en moins de 10ms', () => {
    const start = Date.now();
    generator.buildInfographicPrompt('finance', { title: 'Test', metrics: [] });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('DOIT extraire les données du chat en moins de 50ms', () => {
    const messages = Array(20).fill({
      role: 'assistant',
      content: 'Contenu avec des métriques: 150K€, +12%, 45 unités vendues'
    });

    const start = Date.now();
    generator.extractDataFromChat(messages, 'finance');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50);
  });
});

