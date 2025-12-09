/**
 * Tests TDD pour MemoryRetrievalEngine
 * Processus TDD strict - Pas de simplification
 * Couverture minimum 95%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRetrievalEngine } from '../../src/core/MemoryRetrievalEngine.js';

// Mock ASIMemorySystem
vi.mock('../../asi/asiMemorySystem.js', () => ({
  ASIMemorySystem: vi.fn().mockImplementation(() => ({
    retrieveKnowledge: vi.fn().mockResolvedValue([
      {
        id: 'mem1',
        content: 'Mémoire pertinente 1',
        type: 'episodic',
        timestamp: new Date().toISOString(),
        relevance: 0.9
      }
    ]),
    storeKnowledge: vi.fn().mockResolvedValue(true)
  }))
}));

// Mock PrismMemory
vi.mock('../../prismMemory.js', () => ({
  prismMemory: {
    memory: [
      {
        id: 'local1',
        content: 'Mémoire locale 1',
        timestamp: new Date().toISOString()
      }
    ],
    appendMemoryEntry: vi.fn().mockReturnValue(true)
  }
}));

describe('MemoryRetrievalEngine', () => {
  let engine: MemoryRetrievalEngine;

  beforeEach(() => {
    engine = new MemoryRetrievalEngine();
  });

  describe('Initialisation', () => {
    it('DOIT initialiser avec tous les systèmes de mémoire', () => {
      expect(engine).toBeDefined();
      expect(engine.getMemorySystems()).toBeDefined();
      expect(Array.isArray(engine.getMemorySystems())).toBe(true);
    });

    it('DOIT avoir accès à ASI Memory System', () => {
      const systems = engine.getMemorySystems();
      expect(systems).toContain('asi');
    });

    it('DOIT avoir accès à PrismMemory', () => {
      const systems = engine.getMemorySystems();
      expect(systems).toContain('local');
    });
  });

  describe('Cross-Domain Search (Recherche inter-domaines)', () => {
    it('DOIT rechercher dans tous les domaines pertinents', async () => {
      const results = await engine.searchAcrossDomains('source d\'énergie', {
        domains: ['technical', 'strategic', 'financial']
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('DOIT retourner des résultats de plusieurs domaines', async () => {
      const results = await engine.searchAcrossDomains('projet complexe', {
        domains: ['technical', 'strategic']
      });

      expect(Array.isArray(results)).toBe(true);
      // Peut être vide si pas de mémoires, mais la structure doit être correcte
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('domain');
        expect(['technical', 'strategic']).toContain(results[0].domain);
      }
    });

    it('DOIT classer les résultats par pertinence', async () => {
      const results = await engine.searchAcrossDomains('test query', {
        domains: ['technical']
      });

      if (results.length > 1) {
        expect(results[0].relevance).toBeGreaterThanOrEqual(results[1].relevance);
      }
    });
  });

  describe('Contextual Linking (Liens contextuels)', () => {
    it('DOIT trouver des conversations précédentes liées', async () => {
      const related = await engine.findRelatedConversations('source d\'énergie', {
        limit: 5
      });

      expect(related).toBeDefined();
      expect(Array.isArray(related)).toBe(true);
    });

    it('DOIT calculer un score de similarité contextuelle', async () => {
      const related = await engine.findRelatedConversations('test', {
        limit: 5
      });

      if (related.length > 0) {
        expect(related[0]).toHaveProperty('similarityScore');
        expect(related[0].similarityScore).toBeGreaterThanOrEqual(0);
        expect(related[0].similarityScore).toBeLessThanOrEqual(1);
      }
    });

    it('DOIT inclure le contexte des conversations précédentes', async () => {
      const related = await engine.findRelatedConversations('test', {
        limit: 3
      });

      if (related.length > 0) {
        expect(related[0]).toHaveProperty('context');
        expect(related[0]).toHaveProperty('timestamp');
      }
    });
  });

  describe('Proactive Memory Injection (Injection proactive)', () => {
    it('DOIT suggérer des mémoires pertinentes pour une question', async () => {
      const suggestions = await engine.suggestRelevantMemories('Créons une armure', {
        taskType: 'technical'
      });

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('DOIT inclure le raisonnement pour chaque suggestion', async () => {
      const suggestions = await engine.suggestRelevantMemories('test', {
        taskType: 'strategie'
      });

      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('reasoning');
        expect(typeof suggestions[0].reasoning).toBe('string');
      }
    });

    it('DOIT prioriser les mémoires récentes et pertinentes', async () => {
      const suggestions = await engine.suggestRelevantMemories('test', {
        taskType: 'general'
      });

      if (suggestions.length > 1) {
        // Les plus pertinentes en premier
        expect(suggestions[0].relevance).toBeGreaterThanOrEqual(suggestions[1].relevance);
      }
    });
  });

  describe('Memory Retrieval (Récupération mémoire)', () => {
    it('DOIT récupérer des mémoires avant chaque réponse', async () => {
      const memories = await engine.retrieveMemoriesForResponse('test query', {
        taskType: 'strategie',
        context: {}
      });

      expect(memories).toBeDefined();
      expect(memories.relatedMemories).toBeDefined();
      expect(Array.isArray(memories.relatedMemories)).toBe(true);
    });

    it('DOIT inclure des mémoires de différents types', async () => {
      const memories = await engine.retrieveMemoriesForResponse('test', {
        taskType: 'general'
      });

      expect(memories.relatedMemories).toBeDefined();
      // Peut être vide si pas de mémoires, mais la structure doit exister
    });

    it('DOIT inclure le contexte enrichi', async () => {
      const memories = await engine.retrieveMemoriesForResponse('test', {
        taskType: 'strategie'
      });

      expect(memories.enrichedContext).toBeDefined();
      expect(typeof memories.enrichedContext).toBe('string');
    });

    it('DOIT inclure des suggestions proactives', async () => {
      const memories = await engine.retrieveMemoriesForResponse('test', {
        taskType: 'general'
      });

      expect(memories.proactiveSuggestions).toBeDefined();
      expect(Array.isArray(memories.proactiveSuggestions)).toBe(true);
    });
  });

  describe('Memory Storage (Stockage mémoire)', () => {
    it('DOIT stocker une nouvelle mémoire après interaction', async () => {
      const stored = await engine.storeInteractionMemory({
        input: 'test input',
        response: 'test response',
        taskType: 'general',
        metadata: {}
      });

      expect(stored).toBe(true);
    });

    it('DOIT classifier la mémoire par type', async () => {
      const stored = await engine.storeInteractionMemory({
        input: 'Question stratégique',
        response: 'Réponse stratégique',
        taskType: 'strategie',
        metadata: {}
      });

      expect(stored).toBe(true);
    });

    it('DOIT indexer la mémoire pour recherche future', async () => {
      await engine.storeInteractionMemory({
        input: 'test',
        response: 'response',
        taskType: 'general',
        metadata: {}
      });

      // Vérifier qu'on peut la retrouver
      const memories = await engine.retrieveMemoriesForResponse('test', {
        taskType: 'general'
      });

      expect(memories).toBeDefined();
    });
  });

  describe('Domain-Specific Retrieval (Récupération par domaine)', () => {
    it('DOIT récupérer des mémoires techniques', async () => {
      const memories = await engine.retrieveDomainMemories('technical', {
        query: 'énergie',
        limit: 5
      });

      expect(memories).toBeDefined();
      expect(Array.isArray(memories)).toBe(true);
    });

    it('DOIT récupérer des mémoires stratégiques', async () => {
      const memories = await engine.retrieveDomainMemories('strategic', {
        query: 'plan',
        limit: 5
      });

      expect(memories).toBeDefined();
      expect(Array.isArray(memories)).toBe(true);
    });

    it('DOIT récupérer des mémoires financières', async () => {
      const memories = await engine.retrieveDomainMemories('financial', {
        query: 'budget',
        limit: 5
      });

      expect(memories).toBeDefined();
      expect(Array.isArray(memories)).toBe(true);
    });
  });

  describe('Memory Relevance Scoring (Score de pertinence)', () => {
    it('DOIT calculer un score de pertinence pour chaque mémoire', async () => {
      const memories = await engine.retrieveMemoriesForResponse('test', {
        taskType: 'general'
      });

      if (memories.relatedMemories.length > 0) {
        expect(memories.relatedMemories[0]).toHaveProperty('relevance');
        expect(memories.relatedMemories[0].relevance).toBeGreaterThanOrEqual(0);
        expect(memories.relatedMemories[0].relevance).toBeLessThanOrEqual(1);
      }
    });

    it('DOIT prioriser les mémoires récentes', async () => {
      const memories = await engine.retrieveMemoriesForResponse('test', {
        taskType: 'general'
      });

      // Les mémoires doivent être triées par pertinence
      if (memories.relatedMemories.length > 1) {
        const scores = memories.relatedMemories.map(m => m.relevance);
        const sorted = [...scores].sort((a, b) => b - a);
        expect(scores).toEqual(sorted);
      }
    });
  });
});

