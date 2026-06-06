/**
 * RealTimeResearchEngine - Moteur de recherche temps réel avec Perplexity
 * @module src/core/RealTimeResearchEngine
 */

import { callPerplexity } from '../../backend/orchestrator.js';

export class RealTimeResearchEngine {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Recherche temps réel avec Perplexity
   * @param {string} query - Requête de recherche
   * @param {string} taskType - Type de tâche
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<Object>} Données de recherche structurées
   */
  async search(query, taskType, _options = {}) {
    const cacheKey = this._generateCacheKey(query, taskType);

    // Vérifier le cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Construire la requête optimisée selon le Task Type
    const optimizedQuery = this._optimizeQuery(query, taskType);

    // Appeler Perplexity
    const response = await callPerplexity(optimizedQuery, false);

    // Parser et structurer les résultats
    const researchData = this._parsePerplexityResponse(response, taskType);

    // Mettre en cache
    this.cache.set(cacheKey, {
      data: researchData,
      timestamp: Date.now(),
    });

    return researchData;
  }

  /**
   * Optimise la requête selon le Task Type
   * @private
   */
  _optimizeQuery(query, taskType) {
    const enhancements = {
      strategie: `Recherche stratégique récente: ${query}. Inclure tendances marché, analyses récentes, et données actualisées.`,
      finance: `Recherche financière récente: ${query}. Inclure données de marché, analyses financières, et actualités économiques.`,
      marketing: `Recherche marketing récente: ${query}. Inclure tendances marketing, études de cas, et meilleures pratiques.`,
      recherche: query, // Pas d'enhancement pour recherche pure
      analyse: `Recherche analytique: ${query}. Inclure données, statistiques, et analyses récentes.`,
    };

    return enhancements[taskType] || query;
  }

  /**
   * Parse la réponse Perplexity
   * @private
   */
  _parsePerplexityResponse(response, taskType) {
    const content = response.choices?.[0]?.message?.content || '';

    // Extraire les sources si disponibles
    const sources = this._extractSources(content);

    // Générer un résumé structuré
    const summary = this._generateSummary(content, taskType);

    return {
      summary,
      sources,
      rawContent: content,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extrait les sources depuis la réponse
   * @private
   */
  _extractSources(content) {
    // Parser les sources depuis la réponse Perplexity
    // Format attendu: [1] Source Title (URL)
    const sourceRegex = /\[(\d+)\]\s+(.+?)\s+\((.+?)\)/g;
    const sources = [];
    let match;

    while ((match = sourceRegex.exec(content)) !== null) {
      const title = match[2].trim();
      sources.push({
        index: Number.parseInt(match[1]),
        title: title,
        url: match[3].trim(),
        date: this._extractDate(title), // Essayer d'extraire la date
      });
    }

    return sources;
  }

  /**
   * Génère un résumé adapté au Task Type
   * @private
   */
  _generateSummary(content, taskType) {
    // Générer un résumé adapté au Task Type
    const maxLength =
      {
        strategie: 500,
        finance: 400,
        marketing: 450,
        recherche: 600,
        analyse: 500,
      }[taskType] || 400;

    // Prendre les premiers paragraphes
    const paragraphs = content.split('\n\n').filter((p) => p.trim().length > 0);
    let summary = '';

    for (const para of paragraphs) {
      if (summary.length + para.length > maxLength) break;
      summary += `${para}\n\n`;
    }

    return summary.trim();
  }

  /**
   * Extrait une date du texte
   * @private
   */
  _extractDate(text) {
    // Essayer d'extraire une date du texte
    const dateRegex =
      /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/i;
    const match = text.match(dateRegex);
    return match ? match[0] : 'Date non disponible';
  }

  /**
   * Génère une clé de cache
   * @private
   */
  _generateCacheKey(query, taskType) {
    return `${taskType}-${this._hashQuery(query)}`;
  }

  /**
   * Hash simple pour le cache
   * @private
   */
  _hashQuery(query) {
    // Hash simple pour le cache
    return Buffer.from(query.toLowerCase().trim()).toString('base64').substring(0, 20);
  }
}
