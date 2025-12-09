/**
 * Tests TDD pour RealTimeResearchEngine
 * Processus TDD strict - Pas de simplification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealTimeResearchEngine } from '../../src/core/RealTimeResearchEngine.js';

// Mock de callPerplexity
vi.mock('../../backend/orchestrator.js', () => ({
  callPerplexity: vi.fn()
}));

import { callPerplexity } from '../../backend/orchestrator.js';

describe('RealTimeResearchEngine', () => {
  let engine: RealTimeResearchEngine;
  let mockCallPerplexity: any;

  beforeEach(() => {
    engine = new RealTimeResearchEngine();
    mockCallPerplexity = callPerplexity as any;
    vi.clearAllMocks();
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec cache vide', () => {
      expect(engine).toBeDefined();
      const cache = (engine as any).cache;
      expect(cache).toBeDefined();
      expect(cache.size).toBe(0);
    });

    it('DOIT avoir un TTL de cache de 30 minutes', () => {
      const ttl = (engine as any).cacheTTL;
      expect(ttl).toBe(30 * 60 * 1000); // 30 minutes
    });
  });

  describe('Recherche Temps Réel', () => {
    it('DOIT appeler Perplexity avec la requête', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Réponse de recherche avec [1] Source 1 (http://example.com/1)'
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      await engine.search('test query', 'recherche');

      expect(mockCallPerplexity).toHaveBeenCalled();
    });

    it('DOIT optimiser la requête selon le Task Type', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Réponse'
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      await engine.search('expansion UAE', 'strategie');

      const callArgs = mockCallPerplexity.mock.calls[0][0];
      expect(callArgs).toContain('Recherche stratégique récente');
      expect(callArgs).toContain('expansion UAE');
      expect(callArgs).toContain('tendances marché');
    });

    it('DOIT optimiser pour finance taskType', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Réponse'
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      await engine.search('analyse financière', 'finance');

      const callArgs = mockCallPerplexity.mock.calls[0][0];
      expect(callArgs).toContain('Recherche financière récente');
      expect(callArgs).toContain('données de marché');
    });

    it('DOIT optimiser pour marketing taskType', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Réponse'
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      await engine.search('campagne marketing', 'marketing');

      const callArgs = mockCallPerplexity.mock.calls[0][0];
      expect(callArgs).toContain('Recherche marketing récente');
      expect(callArgs).toContain('tendances marketing');
    });
  });

  describe('Parsing de Réponse Perplexity', () => {
    it('DOIT parser les sources depuis la réponse', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: `Résumé de recherche.

[1] Article 1 (https://example.com/1)
[2] Article 2 (https://example.com/2)

Plus de contenu...`
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      const result = await engine.search('test', 'recherche');

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0]).toMatchObject({
        index: 1,
        title: 'Article 1',
        url: 'https://example.com/1'
      });
      expect(result.sources[1]).toMatchObject({
        index: 2,
        title: 'Article 2',
        url: 'https://example.com/2'
      });
    });

    it('DOIT générer un résumé structuré', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: `Paragraphe 1: Informations importantes.

Paragraphe 2: Plus d'informations.

Paragraphe 3: Encore plus d'informations.`
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      const result = await engine.search('test', 'strategie');

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary).toContain('Paragraphe 1');
    });

    it('DOIT limiter le résumé selon le Task Type', async () => {
      const longContent = 'Paragraphe. '.repeat(200); // Contenu très long
      
      const mockResponse = {
        choices: [{
          message: {
            content: longContent
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      const result = await engine.search('test', 'strategie');
      
      // Résumé pour strategie devrait être limité à ~500 caractères
      expect(result.summary.length).toBeLessThanOrEqual(600);
    });

    it('DOIT inclure timestamp dans les résultats', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Réponse'
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      const result = await engine.search('test', 'recherche');

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Cache', () => {
    it('DOIT mettre en cache les résultats', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Réponse de recherche'
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      await engine.search('test query', 'recherche');
      
      // Deuxième appel devrait utiliser le cache
      const result2 = await engine.search('test query', 'recherche');

      // Perplexity ne devrait être appelé qu'une fois
      expect(mockCallPerplexity).toHaveBeenCalledTimes(1);
    });

    it('DOIT expirer le cache après TTL', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Réponse'
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      // Premier appel
      await engine.search('test', 'recherche');

      // Modifier le timestamp du cache pour simuler expiration
      const cache = (engine as any).cache;
      const cacheKey = Array.from(cache.keys())[0];
      const cachedData = cache.get(cacheKey);
      cachedData.timestamp = Date.now() - (31 * 60 * 1000); // 31 minutes (expiré)
      cache.set(cacheKey, cachedData);

      // Deuxième appel devrait refaire la recherche
      await engine.search('test', 'recherche');

      expect(mockCallPerplexity).toHaveBeenCalledTimes(2);
    });

    it('DOIT générer une clé de cache unique par query et taskType', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Réponse'
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      await engine.search('query 1', 'strategie');
      await engine.search('query 2', 'strategie');
      await engine.search('query 1', 'finance');

      // Devrait avoir 3 appels (3 clés différentes)
      expect(mockCallPerplexity).toHaveBeenCalledTimes(3);
    });
  });

  describe('Extraction de Dates', () => {
    it('DOIT extraire les dates des sources', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '[1] Article du 01/12/2024 (http://example.com)'
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      const result = await engine.search('test', 'recherche');

      expect(result.sources[0].date).toContain('01/12/2024');
    });

    it('DOIT gérer les dates au format ISO', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '[1] Article 2024-12-01 (http://example.com)'
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      const result = await engine.search('test', 'recherche');

      expect(result.sources[0].date).toContain('2024-12-01');
    });
  });

  describe('Gestion d\'Erreurs', () => {
    it('DOIT gérer les erreurs Perplexity gracieusement', async () => {
      mockCallPerplexity.mockRejectedValue(new Error('Perplexity API error'));

      await expect(
        engine.search('test', 'recherche')
      ).rejects.toThrow('Perplexity API error');
    });

    it('DOIT gérer les réponses vides', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: ''
          }
        }]
      };

      mockCallPerplexity.mockResolvedValue(mockResponse);

      const result = await engine.search('test', 'recherche');

      expect(result.summary).toBe('');
      expect(result.sources).toEqual([]);
    });
  });
});

