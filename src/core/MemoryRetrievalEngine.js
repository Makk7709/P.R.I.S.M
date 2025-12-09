/**
 * MemoryRetrievalEngine - Récupération mémoires pertinentes, cross-domain search
 * @module src/core/MemoryRetrievalEngine
 */

import { ASIMemorySystem } from '../../asi/asiMemorySystem.js';
import { prismMemory } from '../../prismMemory.js';

export class MemoryRetrievalEngine {
  constructor() {
    this.asiMemory = null;
    this.memorySystems = ['asi', 'local'];
    this.retrievalCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialise les systèmes de mémoire
   */
  async initialize() {
    try {
      this.asiMemory = new ASIMemorySystem();
      await this.asiMemory.start();
    } catch (error) {
      console.warn('[MemoryRetrievalEngine] ASI Memory System non disponible:', error.message);
    }
  }

  /**
   * Retourne la liste des systèmes de mémoire disponibles
   */
  getMemorySystems() {
    return [...this.memorySystems];
  }

  /**
   * Recherche cross-domain
   */
  async searchAcrossDomains(query, options = {}) {
    const { domains = [] } = options;
    const results = [];

    for (const domain of domains) {
      try {
        const domainResults = await this.retrieveDomainMemories(domain, {
          query,
          limit: 10
        });

        domainResults.forEach(result => {
          results.push({
            ...result,
            domain,
            relevance: this._calculateRelevance(query, result.content, domain)
          });
        });
      } catch (error) {
        console.warn(`[MemoryRetrievalEngine] Erreur recherche domaine ${domain}:`, error.message);
      }
    }

    // Trier par pertinence
    results.sort((a, b) => b.relevance - a.relevance);

    return results;
  }

  /**
   * Trouve des conversations précédentes liées
   */
  async findRelatedConversations(query, options = {}) {
    const { limit = 5 } = options;
    const related = [];

    // Rechercher dans PrismMemory (local)
    if (prismMemory && prismMemory.memory) {
      for (const entry of prismMemory.memory) {
        const similarity = this._calculateSimilarity(query, entry.content || entry.message || '');
        if (similarity > 0.3) {
          related.push({
            id: entry.id,
            content: entry.content || entry.message,
            timestamp: entry.timestamp,
            similarityScore: similarity,
            context: entry.context || {}
          });
        }
      }
    }

    // Rechercher dans ASI Memory
    if (this.asiMemory) {
      try {
        const asiResults = await this.asiMemory.retrieveKnowledge(query, 'semantic_similarity');
        asiResults.forEach(result => {
          related.push({
            id: result.id,
            content: result.content,
            timestamp: result.timestamp,
            similarityScore: result.relevance || 0.5,
            context: result.context || {},
            type: result.type
          });
        });
      } catch (error) {
        console.warn('[MemoryRetrievalEngine] Erreur ASI Memory:', error.message);
      }
    }

    // Trier par similarité et limiter
    related.sort((a, b) => b.similarityScore - a.similarityScore);
    return related.slice(0, limit);
  }

  /**
   * Suggère des mémoires pertinentes
   */
  async suggestRelevantMemories(query, context = {}) {
    const { taskType = 'general' } = context;
    const suggestions = [];

    // Rechercher dans les conversations liées
    const related = await this.findRelatedConversations(query, { limit: 10 });

    related.forEach(memory => {
      suggestions.push({
        memory,
        reasoning: this._generateSuggestionReasoning(query, memory, taskType),
        relevance: memory.similarityScore || memory.relevance || 0.5
      });
    });

    // Trier par pertinence
    suggestions.sort((a, b) => b.relevance - a.relevance);

    return suggestions.slice(0, 5);
  }

  /**
   * Récupère les mémoires pour une réponse
   */
  async retrieveMemoriesForResponse(query, context = {}) {
    const cacheKey = `${query}_${context.taskType}`;
    const cached = this.retrievalCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Rechercher conversations liées
    const relatedConversations = await this.findRelatedConversations(query, { limit: 5 });

    // Rechercher cross-domain si plusieurs domaines identifiés
    const domains = this._identifyDomainsFromQuery(query, context);
    const crossDomainResults = domains.length > 1
      ? await this.searchAcrossDomains(query, { domains })
      : [];

    // Suggérer mémoires pertinentes
    const proactiveSuggestions = await this.suggestRelevantMemories(query, context);

    // Construire le contexte enrichi
    const enrichedContext = this._buildEnrichedContext(
      query,
      relatedConversations,
      crossDomainResults,
      context
    );

    const result = {
      relatedMemories: [...relatedConversations, ...crossDomainResults],
      enrichedContext,
      proactiveSuggestions: proactiveSuggestions.map(s => s.memory),
      domains,
      timestamp: new Date().toISOString()
    };

    // Mettre en cache
    this.retrievalCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Stocke une mémoire d'interaction
   */
  async storeInteractionMemory(interaction) {
    const memoryEntry = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input: interaction.input,
      response: interaction.response,
      taskType: interaction.taskType,
      metadata: interaction.metadata || {},
      timestamp: new Date().toISOString(),
      type: this._classifyMemoryType(interaction)
    };

    // Stocker dans PrismMemory (local)
    if (prismMemory && prismMemory.appendMemoryEntry) {
      prismMemory.appendMemoryEntry(memoryEntry);
    }

    // Stocker dans ASI Memory si disponible
    if (this.asiMemory) {
      try {
        await this.asiMemory.storeKnowledge({
          content: `${interaction.input} → ${interaction.response}`,
          type: memoryEntry.type,
          metadata: memoryEntry.metadata,
          timestamp: memoryEntry.timestamp
        });
      } catch (error) {
        console.warn('[MemoryRetrievalEngine] Erreur stockage ASI:', error.message);
      }
    }

    return true;
  }

  /**
   * Récupère des mémoires par domaine
   */
  async retrieveDomainMemories(domain, options = {}) {
    const { query = '', limit = 10 } = options;
    const results = [];

    // Rechercher dans ASI Memory
    if (this.asiMemory) {
      try {
        const asiResults = await this.asiMemory.retrieveKnowledge(query, 'semantic_similarity');
        asiResults.forEach(result => {
          if (this._matchesDomain(result, domain)) {
            results.push({
              ...result,
              domain,
              relevance: result.relevance || 0.5
            });
          }
        });
      } catch (error) {
        console.warn(`[MemoryRetrievalEngine] Erreur récupération domaine ${domain}:`, error.message);
      }
    }

    // Rechercher dans PrismMemory
    if (prismMemory && prismMemory.memory) {
      for (const entry of prismMemory.memory) {
        if (this._matchesDomain(entry, domain)) {
          const relevance = this._calculateRelevance(query, entry.content || entry.message || '', domain);
          if (relevance > 0.2) {
            results.push({
              id: entry.id,
              content: entry.content || entry.message,
              timestamp: entry.timestamp,
              domain,
              relevance
            });
          }
        }
      }
    }

    // Trier par pertinence et limiter
    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }

  // ========== MÉTHODES PRIVÉES ==========

  _calculateRelevance(query, content, domain) {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    let score = 0;

    // Mots communs
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    const commonWords = queryWords.filter(w => contentWords.includes(w) && w.length > 3);
    score += commonWords.length * 0.1;

    // Correspondance exacte
    if (contentLower.includes(queryLower)) {
      score += 0.3;
    }

    // Longueur du contenu (plus long = plus d'info)
    if (content.length > 100) score += 0.1;

    return Math.min(score, 1.0);
  }

  _calculateSimilarity(query, content) {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    // Similarité basique par mots communs
    const queryWords = new Set(queryLower.split(/\s+/).filter(w => w.length > 2));
    const contentWords = new Set(contentLower.split(/\s+/).filter(w => w.length > 2));

    let common = 0;
    queryWords.forEach(word => {
      if (contentWords.has(word)) common++;
    });

    return common / Math.max(queryWords.size, 1);
  }

  _generateSuggestionReasoning(query, memory, taskType) {
    return `Mémoire pertinente de ${memory.timestamp ? new Date(memory.timestamp).toLocaleDateString() : 'conversation précédente'} ` +
           `liée à "${query.substring(0, 50)}" dans le contexte ${taskType}`;
  }

  _buildEnrichedContext(query, relatedConversations, crossDomainResults, context) {
    let enriched = `## 📚 CONTEXTE DES CONVERSATIONS PRÉCÉDENTES\n\n`;

    if (relatedConversations.length > 0) {
      enriched += `J'ai trouvé ${relatedConversations.length} conversation(s) précédente(s) liée(s) à votre question.\n\n`;
      
      relatedConversations.slice(0, 3).forEach((conv, idx) => {
        enriched += `${idx + 1}. ${conv.content?.substring(0, 100) || 'Mémoire précédente'}...\n`;
        enriched += `   (${conv.timestamp ? new Date(conv.timestamp).toLocaleDateString() : 'récent'})\n\n`;
      });
    }

    if (crossDomainResults.length > 0) {
      enriched += `## 🔗 INFORMATIONS INTER-DOMAINES\n\n`;
      enriched += `J'ai trouvé des informations pertinentes dans ${crossDomainResults.length} domaine(s) :\n\n`;
      
      crossDomainResults.slice(0, 3).forEach((result, idx) => {
        enriched += `${idx + 1}. [${result.domain}] ${result.content?.substring(0, 100) || 'Information'}...\n\n`;
      });
    }

    if (relatedConversations.length === 0 && crossDomainResults.length === 0) {
      enriched += `Aucune conversation précédente directement liée trouvée. `;
      enriched += `Je vais utiliser mes connaissances générales pour répondre.`;
    }

    return enriched;
  }

  _identifyDomainsFromQuery(query, context) {
    const queryLower = query.toLowerCase();
    const domains = [];

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

    // Ajouter le domaine du taskType si présent
    if (context.taskType && context.taskType !== 'general') {
      const taskTypeMap = {
        'strategie': 'strategic',
        'finance': 'financial',
        'technique': 'technical',
        'recherche': 'research',
        'marketing': 'marketing'
      };
      const domain = taskTypeMap[context.taskType];
      if (domain && !domains.includes(domain)) {
        domains.push(domain);
      }
    }

    return [...new Set(domains)];
  }

  _classifyMemoryType(interaction) {
    const input = (interaction.input || '').toLowerCase();
    
    if (input.match(/stratégie|strategy|plan/)) return 'strategic';
    if (input.match(/finance|budget|coût/)) return 'financial';
    if (input.match(/technique|technical|énergie|energy/)) return 'technical';
    if (input.match(/recherche|research/)) return 'research';
    
    return 'episodic';
  }

  _matchesDomain(memory, domain) {
    // Vérifier si la mémoire correspond au domaine
    const content = (memory.content || memory.message || '').toLowerCase();
    const taskType = memory.taskType || memory.metadata?.taskType || '';

    const domainKeywords = {
      'technical': ['technique', 'énergie', 'energy', 'power', 'ingénierie', 'engineering'],
      'strategic': ['stratégie', 'strategy', 'plan', 'vision', 'objectif'],
      'financial': ['finance', 'budget', 'coût', 'investissement', 'revenu'],
      'research': ['recherche', 'research', 'étude', 'analyse'],
      'marketing': ['marketing', 'campagne', 'communication']
    };

    const keywords = domainKeywords[domain] || [];
    return keywords.some(keyword => content.includes(keyword) || taskType.includes(keyword));
  }
}

