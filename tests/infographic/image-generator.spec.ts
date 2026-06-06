/**
 * Tests TDD STRICTS pour ImageGenerator (Nano Banana Pro + Gemini 2.0 Flash)
 * 
 * RÈGLE: Si un test échoue, c'est le CODE qui doit être modifié, PAS le test.
 * 
 * Fonctionnalités à implémenter:
 * - Génération d'images via Nano Banana Pro (fal.ai)
 * - Utilisation de Gemini 2.0 Flash uniquement (pas de version inférieure)
 * - Téléchargement d'images dans le chat
 * - Support multi-formats (PNG, JPEG, WebP)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageGenerator } from '../../src/infographic/ImageGenerator.js';

// Mock de l'API fal.ai
vi.mock('@fal-ai/client', () => ({
  fal: {
    config: vi.fn(),
    subscribe: vi.fn().mockResolvedValue({
      data: {
        images: [{ url: 'https://fal.media/files/test-image.png' }]
      },
      requestId: 'test-request-123'
    }),
    queue: {
      submit: vi.fn().mockResolvedValue({ request_id: 'test-request-123' }),
      status: vi.fn().mockResolvedValue({ status: 'COMPLETED' }),
      result: vi.fn().mockResolvedValue({
        data: {
          images: [{ url: 'https://fal.media/files/test-image.png' }]
        }
      })
    }
  }
}));

describe('ImageGenerator - Nano Banana Pro + Gemini 2.0 Flash', () => {
  let generator: ImageGenerator;
  let mockFalClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Créer un mock du client fal.ai
    mockFalClient = {
      config: vi.fn(),
      subscribe: vi.fn().mockResolvedValue({
        data: {
          images: [{ url: 'https://fal.media/files/test-image.png' }]
        },
        requestId: 'test-request-123'
      })
    };
    
    generator = new ImageGenerator();
    generator.setFalClient(mockFalClient);
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec la clé API Nano Banana', () => {
      expect(generator).toBeDefined();
      expect(generator.isConfigured()).toBe(true);
    });

    it('DOIT utiliser le modèle Nano Banana Pro', () => {
      expect(generator.getModelId()).toBe('fal-ai/nano-banana-pro');
    });

    it('DOIT avoir Gemini 2.0 Flash comme modèle de texte', () => {
      const config = generator.getConfig();
      expect(config.textModel).toBe('gemini-2.0-flash');
    });

    it('NE DOIT PAS accepter de version Gemini inférieure', () => {
      expect(() => {
        new ImageGenerator({ textModel: 'gemini-1.5-pro' });
      }).toThrow('Version Gemini non supportée');
    });

    it('DOIT avoir les paramètres par défaut corrects', () => {
      const config = generator.getConfig();
      expect(config.imageSize).toBe('landscape_16_9');
      expect(config.numImages).toBe(1);
      expect(config.quality).toBe('high');
    });
  });

  describe('Génération d\'Images via Nano Banana Pro', () => {
    it('DOIT générer une image à partir d\'un prompt texte', async () => {
      const result = await generator.generateImage('Un graphique financier moderne');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.imageUrl).toBeDefined();
      expect(result.imageUrl).toContain('http');
    });

    it('DOIT retourner les métadonnées de génération', async () => {
      const result = await generator.generateImage('Test prompt');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.model).toBe('fal-ai/nano-banana-pro');
      expect(result.metadata.generatedAt).toBeDefined();
      expect(result.metadata.requestId).toBeDefined();
    });

    it('DOIT supporter différentes tailles d\'image', async () => {
      const sizes = ['square', 'landscape_16_9', 'portrait_9_16', 'landscape_4_3'];

      for (const size of sizes) {
        const result = await generator.generateImage('Test', { imageSize: size });
        expect(result.success).toBe(true);
        expect(result.metadata.imageSize).toBe(size);
      }
    });

    it('DOIT supporter différentes qualités', async () => {
      const qualities = ['low', 'medium', 'high', 'ultra'];

      for (const quality of qualities) {
        const result = await generator.generateImage('Test', { quality });
        expect(result.success).toBe(true);
      }
    });

    it('DOIT gérer les erreurs API gracieusement', async () => {
      // Simuler une erreur
      generator._simulateError = true;

      const result = await generator.generateImage('Test error');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('DOIT avoir un timeout configurable', () => {
      expect(generator.getTimeout()).toBeGreaterThan(0);
      
      generator.setTimeout(60000);
      expect(generator.getTimeout()).toBe(60000);
    });
  });

  describe('Prompts Enrichis avec Gemini 2.0 Flash', () => {
    it('DOIT enrichir automatiquement les prompts simples', async () => {
      const simplePrompt = 'graphique ventes';
      
      const enrichedPrompt = await generator.enrichPrompt(simplePrompt);

      expect(enrichedPrompt).toBeDefined();
      expect(enrichedPrompt.length).toBeGreaterThan(simplePrompt.length);
      expect(enrichedPrompt).toContain('graphique');
    });

    it('DOIT ajouter des instructions de style', async () => {
      const prompt = 'diagramme stratégique';
      
      const enrichedPrompt = await generator.enrichPrompt(prompt, {
        style: 'corporate',
        colors: ['#1E3A5F', '#D4AF37']
      });

      expect(enrichedPrompt).toContain('corporate');
    });

    it('DOIT conserver le contexte PRISM/KOREV dans les prompts', async () => {
      const prompt = 'infographie performance';
      
      const enrichedPrompt = await generator.enrichPrompt(prompt, {
        includeBranding: true
      });

      expect(enrichedPrompt).toContain('PRISM');
    });
  });

  describe('Génération pour le Chat', () => {
    it('DOIT générer une image contextuelle pour une question finance', async () => {
      const chatContext = {
        message: 'Montre-moi les tendances de ventes Q4',
        taskType: 'finance',
        previousMessages: []
      };

      const result = await generator.generateForChat(chatContext);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBeDefined();
      expect(result.contextType).toBe('finance');
    });

    it('DOIT adapter le style selon le taskType', async () => {
      const taskTypes = ['finance', 'strategie', 'marketing', 'recherche'];

      for (const taskType of taskTypes) {
        const result = await generator.generateForChat({
          message: 'Génère une visualisation',
          taskType,
          previousMessages: []
        });

        expect(result.metadata.style).toBeDefined();
      }
    });

    it('DOIT inclure un bouton de téléchargement', async () => {
      const result = await generator.generateForChat({
        message: 'Crée un graphique',
        taskType: 'general',
        previousMessages: []
      });

      expect(result.downloadUrl).toBeDefined();
      expect(result.downloadFilename).toBeDefined();
    });

    it('DOIT supporter plusieurs formats de téléchargement', async () => {
      const formats = ['png', 'jpeg', 'webp'];

      for (const format of formats) {
        const result = await generator.generateForChat({
          message: 'Test',
          taskType: 'general',
          previousMessages: []
        }, { outputFormat: format });

        expect(result.downloadFilename).toContain(format);
      }
    });
  });

  describe('Détection de Demandes d\'Images', () => {
    it('DOIT détecter une demande explicite d\'image', () => {
      const requests = [
        'Génère une image de...',
        'Crée une visualisation de...',
        'Montre-moi un graphique de...',
        'Dessine un diagramme de...',
        'Produis une infographie de...'
      ];

      for (const request of requests) {
        expect(generator.isImageRequest(request)).toBe(true);
      }
    });

    it('DOIT détecter une demande implicite d\'image', () => {
      const requests = [
        'Peux-tu illustrer les ventes ?',
        'J\'aimerais voir une représentation visuelle',
        'Affiche les données en graphique'
      ];

      for (const request of requests) {
        expect(generator.isImageRequest(request)).toBe(true);
      }
    });

    it('NE DOIT PAS détecter une question normale comme demande d\'image', () => {
      const questions = [
        'Quel est le chiffre d\'affaires ?',
        'Explique-moi la stratégie',
        'Comment fonctionne ce processus ?'
      ];

      for (const question of questions) {
        expect(generator.isImageRequest(question)).toBe(false);
      }
    });
  });

  describe('Téléchargement d\'Images', () => {
    it('DOIT convertir l\'URL en buffer téléchargeable', async () => {
      const imageUrl = 'https://fal.media/files/test-image.png';
      
      const download = await generator.prepareDownload(imageUrl, 'test-image.png');

      expect(download).toBeDefined();
      expect(download.filename).toBe('test-image.png');
      expect(download.mimeType).toBe('image/png');
    });

    it('DOIT générer un nom de fichier unique', () => {
      const filename1 = generator.generateFilename('finance');
      const filename2 = generator.generateFilename('finance');

      expect(filename1).not.toBe(filename2);
      expect(filename1).toContain('prism');
      expect(filename1).toContain('finance');
    });

    it('DOIT supporter le téléchargement en base64', async () => {
      const result = await generator.generateImage('Test', { returnBase64: true });

      expect(result.base64).toBeDefined();
      expect(result.base64).toMatch(/^data:image\/(png|jpeg|webp);base64,/);
    });
  });

  describe('Caching des Images', () => {
    it('DOIT cacher les images générées', async () => {
      const prompt = 'Image identique pour cache';

      const result1 = await generator.generateImage(prompt);
      const result2 = await generator.generateImage(prompt);

      expect(result1.imageUrl).toBe(result2.imageUrl);
      expect(result2.fromCache).toBe(true);
    });

    it('DOIT invalider le cache après expiration', async () => {
      generator.setCacheTTL(100); // 100ms

      const result1 = await generator.generateImage('Test cache expire');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result2 = await generator.generateImage('Test cache expire');

      expect(result2.fromCache).toBe(false);
    });

    it('DOIT permettre de vider le cache manuellement', () => {
      generator.clearCache();
      expect(generator.getCacheSize()).toBe(0);
    });
  });

  describe('Intégration Chat API', () => {
    it('DOIT fournir une réponse formatée pour le chat', async () => {
      const chatResponse = await generator.generateChatResponse({
        message: 'Génère un graphique des ventes',
        taskType: 'finance'
      });

      expect(chatResponse.type).toBe('image');
      expect(chatResponse.content).toBeDefined();
      expect(chatResponse.imageUrl).toBeDefined();
      expect(chatResponse.actions).toBeDefined();
      expect(chatResponse.actions).toContain('download');
    });

    it('DOIT inclure le HTML pour l\'affichage dans le chat', async () => {
      const chatResponse = await generator.generateChatResponse({
        message: 'Crée une visualisation',
        taskType: 'strategie'
      });

      expect(chatResponse.html).toBeDefined();
      expect(chatResponse.html).toContain('<img');
      expect(chatResponse.html).toContain('download');
    });
  });
});

describe('ImageGenerator - Tests de Performance', () => {
  let generator: ImageGenerator;

  beforeEach(() => {
    generator = new ImageGenerator();
  });

  it('DOIT détecter une demande d\'image en moins de 5ms', () => {
    const start = Date.now();
    generator.isImageRequest('Génère une image de graphique financier');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5);
  });

  it('DOIT enrichir un prompt en moins de 100ms', async () => {
    const start = Date.now();
    await generator.enrichPrompt('Test prompt');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('DOIT générer un nom de fichier en moins de 2ms', () => {
    const start = Date.now();
    generator.generateFilename('finance');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2);
  });
});

describe('ImageGenerator - Validation API Nano Banana Pro', () => {
  let generator: ImageGenerator;
  let mockFalClient: any;

  beforeEach(() => {
    // Créer un mock du client fal.ai
    mockFalClient = {
      config: vi.fn(),
      subscribe: vi.fn().mockResolvedValue({
        data: {
          images: [{ url: 'https://fal.media/files/test-image.png' }]
        },
        requestId: 'test-request-123'
      })
    };
    
    generator = new ImageGenerator();
    generator.setFalClient(mockFalClient);
  });

  it('DOIT utiliser l\'endpoint fal-ai/nano-banana-pro', async () => {
    await generator.generateImage('Test');

    expect(mockFalClient.subscribe).toHaveBeenCalledWith(
      'fal-ai/nano-banana-pro',
      expect.any(Object)
    );
  });

  it('DOIT envoyer les bons paramètres à l\'API', async () => {
    await generator.generateImage('Test prompt', {
      imageSize: 'landscape_16_9',
      numImages: 1
    });

    expect(mockFalClient.subscribe).toHaveBeenCalledWith(
      'fal-ai/nano-banana-pro',
      expect.objectContaining({
        input: expect.objectContaining({
          prompt: expect.any(String),
          image_size: 'landscape_16_9',
          num_images: 1
        })
      })
    );
  });
});

