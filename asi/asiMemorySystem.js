/**
 * @fileoverview ASI Memory System - Système de mémoire pour ASI
 * @module asiMemorySystem
 * @description Gère le stockage, la récupération et l'organisation des connaissances
 */

import { EventEmitter } from 'events';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/asi-memory.log' }),
    new winston.transports.Console()
  ]
});

/**
 * @class ASIMemorySystem
 * @extends EventEmitter
 * @description Système de mémoire avancé pour l'ASI
 */
export class ASIMemorySystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      memoryLimit: config.memoryLimit || 8192, // MB
      compressionEnabled: config.compressionEnabled !== false,
      autoCleanup: config.autoCleanup !== false,
      retentionPeriod: config.retentionPeriod || 30 * 24 * 60 * 60 * 1000, // 30 jours
      compressionThreshold: config.compressionThreshold || 0.7,
      accessPatternTracking: config.accessPatternTracking !== false,
      ...config
    };

    this.state = {
      isActive: false,
      memoryUsage: 0,
      totalEntries: 0,
      compressionRatio: 0,
      accessPatterns: new Map(),
      memoryStats: {
        reads: 0,
        writes: 0,
        compressions: 0,
        cleanups: 0
      }
    };

    this.memoryTypes = {
      'episodic': { priority: 0.8, retention: 'medium', compression: 'high' },
      'semantic': { priority: 0.9, retention: 'high', compression: 'medium' },
      'procedural': { priority: 0.7, retention: 'high', compression: 'low' },
      'working': { priority: 0.6, retention: 'low', compression: 'none' },
      'meta': { priority: 1.0, retention: 'permanent', compression: 'medium' }
    };

    this.storage = {
      episodic: new Map(),    // Mémoires d'expériences spécifiques
      semantic: new Map(),    // Connaissances générales
      procedural: new Map(),  // Procédures et compétences
      working: new Map(),     // Mémoire de travail temporaire
      meta: new Map()         // Métaconnaissances sur l'apprentissage
    };

    this.initializeMemorySystem();
  }

  /**
   * Initialise le système de mémoire
   */
  initializeMemorySystem() {
    // Configuration des mécanismes de compression
    this.compressionMechanisms = {
      'lossless': this.losslessCompression.bind(this),
      'lossy': this.lossyCompression.bind(this),
      'semantic': this.semanticCompression.bind(this),
      'temporal': this.temporalCompression.bind(this)
    };

    // Configuration des stratégies de récupération
    this.retrievalStrategies = {
      'exact_match': this.exactMatchRetrieval.bind(this),
      'semantic_similarity': this.semanticSimilarityRetrieval.bind(this),
      'associative': this.associativeRetrieval.bind(this),
      'temporal': this.temporalRetrieval.bind(this),
      'contextual': this.contextualRetrieval.bind(this)
    };

    // Initialisation des index
    this.indexes = {
      temporal: new Map(),
      semantic: new Map(),
      associative: new Map(),
      frequency: new Map()
    };
  }

  /**
   * Démarre le système de mémoire
   */
  async start() {
    this.state.isActive = true;
    logger.info('🚀 Système de mémoire ASI démarré');
    
    // Démarrage des processus de maintenance
    this.startMemoryMaintenance();
    this.startCompressionProcess();
    this.startAccessPatternAnalysis();
    
    this.emit('memory_system_started');
  }

  /**
   * Stocke une connaissance dans la mémoire
   */
  async storeKnowledge(knowledge) {
    if (!this.state.isActive) {
      throw new Error('Système de mémoire non actif');
    }

    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Classification du type de mémoire
      const memoryType = this.classifyMemoryType(knowledge);
      
      // Préparation de l'entrée mémoire
      const memoryEntry = await this.prepareMemoryEntry(knowledge, memoryType);
      
      // Vérification de l'espace disponible
      await this.ensureMemorySpace(memoryEntry.size);
      
      // Stockage dans le type de mémoire approprié
      this.storage[memoryType].set(memoryId, memoryEntry);
      
      // Mise à jour des index
      await this.updateIndexes(memoryId, memoryEntry);
      
      // Mise à jour des statistiques
      this.updateMemoryStats('write', memoryEntry.size);
      
      logger.debug(`💾 Connaissance stockée: ${memoryId} (${memoryType})`);
      this.emit('knowledge_stored', { memoryId, memoryType, size: memoryEntry.size });

      return memoryId;

    } catch (error) {
      logger.error(`❌ Erreur lors du stockage de la connaissance:`, error);
      throw error;
    }
  }

  /**
   * Récupère une connaissance de la mémoire
   */
  async retrieveKnowledge(query, strategy = 'semantic_similarity') {
    if (!this.state.isActive) {
      throw new Error('Système de mémoire non actif');
    }

    try {
      // Sélection de la stratégie de récupération
      const retrievalFunction = this.retrievalStrategies[strategy];
      if (!retrievalFunction) {
        throw new Error(`Stratégie de récupération inconnue: ${strategy}`);
      }

      // Récupération des connaissances
      const results = await retrievalFunction(query);
      
      // Tri par pertinence
      results.sort((a, b) => b.relevance - a.relevance);
      
      // Mise à jour des patterns d'accès
      this.updateAccessPatterns(query, results);
      
      // Mise à jour des statistiques
      this.updateMemoryStats('read', results.length);
      
      logger.debug(`🔍 Récupération: ${results.length} résultats pour "${query}"`);
      this.emit('knowledge_retrieved', { query, strategy, results: results.length });

      return results;

    } catch (error) {
      logger.error(`❌ Erreur lors de la récupération:`, error);
      throw error;
    }
  }

  /**
   * Stocke l'expérience d'une tâche
   */
  async storeTaskExperience(task, result) {
    const experience = {
      type: 'task_experience',
      task: {
        description: task.description,
        type: task.type || 'general',
        context: task.context || {}
      },
      result: {
        success: result.success !== false,
        confidence: result.confidence || 0.8,
        processingTime: result.processingTime || 0,
        learningGained: result.learningGained || []
      },
      timestamp: new Date(),
      metadata: {
        domains: result.domains || [],
        strategies: result.strategies || [],
        adaptations: result.adaptations || []
      }
    };

    return await this.storeKnowledge(experience);
  }

  /**
   * Classifie le type de mémoire pour une connaissance
   */
  classifyMemoryType(knowledge) {
    // Classification basée sur le type et le contenu
    if (knowledge.type === 'task_experience') {
      return 'episodic';
    }
    
    if (knowledge.type === 'general_knowledge' || knowledge.type === 'concept') {
      return 'semantic';
    }
    
    if (knowledge.type === 'procedure' || knowledge.type === 'skill') {
      return 'procedural';
    }
    
    if (knowledge.type === 'temporary' || knowledge.type === 'working') {
      return 'working';
    }
    
    if (knowledge.type === 'meta_learning' || knowledge.type === 'strategy') {
      return 'meta';
    }
    
    // Classification par défaut basée sur le contenu
    const content = JSON.stringify(knowledge).toLowerCase();
    
    if (content.includes('experience') || content.includes('event')) {
      return 'episodic';
    }
    
    if (content.includes('procedure') || content.includes('method')) {
      return 'procedural';
    }
    
    return 'semantic'; // Par défaut
  }

  /**
   * Prépare une entrée mémoire
   */
  async prepareMemoryEntry(knowledge, memoryType) {
    const entry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: memoryType,
      content: knowledge,
      metadata: {
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        importance: this.calculateImportance(knowledge),
        size: this.calculateSize(knowledge),
        compressed: false,
        tags: this.extractTags(knowledge)
      },
      associations: this.findAssociations(knowledge),
      context: this.extractContext(knowledge)
    };

    // Compression si nécessaire
    if (this.shouldCompress(entry)) {
      entry.content = await this.compressContent(entry.content, memoryType);
      entry.metadata.compressed = true;
    }

    return entry;
  }

  /**
   * S'assure qu'il y a suffisamment d'espace mémoire
   */
  async ensureMemorySpace(requiredSize) {
    const currentUsage = this.calculateCurrentMemoryUsage();
    const availableSpace = this.config.memoryLimit - currentUsage;

    if (requiredSize > availableSpace) {
      logger.info(`🧹 Nettoyage mémoire requis: ${requiredSize}MB nécessaires, ${availableSpace}MB disponibles`);
      
      // Calcul de l'espace à libérer
      const spaceToFree = requiredSize - availableSpace + (this.config.memoryLimit * 0.1); // 10% de marge
      
      // Libération d'espace
      await this.freeMemorySpace(spaceToFree);
    }
  }

  /**
   * Libère de l'espace mémoire
   */
  async freeMemorySpace(spaceToFree) {
    let freedSpace = 0;
    const candidates = [];

    // Collecte des candidats pour suppression
    for (const [memoryType, storage] of Object.entries(this.storage)) {
      for (const [id, entry] of storage) {
        const priority = this.calculateEvictionPriority(entry, memoryType);
        candidates.push({ id, entry, memoryType, priority });
      }
    }

    // Tri par priorité d'éviction (plus faible = éviction en premier)
    candidates.sort((a, b) => a.priority - b.priority);

    // Suppression des entrées jusqu'à libérer suffisamment d'espace
    for (const candidate of candidates) {
      if (freedSpace >= spaceToFree) break;

      const entrySize = candidate.entry.metadata.size;
      
      // Suppression de l'entrée
      this.storage[candidate.memoryType].delete(candidate.id);
      
      // Mise à jour des index
      await this.removeFromIndexes(candidate.id, candidate.entry);
      
      freedSpace += entrySize;
      
      logger.debug(`🗑️ Entrée supprimée: ${candidate.id} (${entrySize}MB libérés)`);
    }

    this.state.memoryStats.cleanups++;
    logger.info(`✅ Espace libéré: ${freedSpace.toFixed(2)}MB`);
  }

  /**
   * Calcule la priorité d'éviction d'une entrée
   */
  calculateEvictionPriority(entry, memoryType) {
    const typeConfig = this.memoryTypes[memoryType];
    const age = Date.now() - entry.metadata.createdAt.getTime();
    const lastAccess = Date.now() - entry.metadata.lastAccessed.getTime();
    
    // Facteurs de priorité
    const typePriority = typeConfig.priority;
    const importanceFactor = entry.metadata.importance;
    const accessFrequency = entry.metadata.accessCount / Math.max(age / (24 * 60 * 60 * 1000), 1); // accès par jour
    const recencyFactor = 1 / (lastAccess / (24 * 60 * 60 * 1000) + 1); // facteur de récence
    
    // Calcul de la priorité (plus élevé = moins susceptible d'être évincé)
    const priority = typePriority * importanceFactor * (accessFrequency + 0.1) * recencyFactor;
    
    return 1 / priority; // Inversion pour l'éviction (plus faible = éviction en premier)
  }

  /**
   * Récupération par similarité sémantique
   */
  async semanticSimilarityRetrieval(query) {
    const results = [];
    const queryVector = this.createQueryVector(query);

    // Recherche dans tous les types de mémoire
    for (const [memoryType, storage] of Object.entries(this.storage)) {
      for (const [id, entry] of storage) {
        const similarity = this.calculateSemanticSimilarity(queryVector, entry);
        
        if (similarity > 0.3) { // Seuil de pertinence
          results.push({
            id,
            entry: await this.decompressIfNeeded(entry),
            memoryType,
            relevance: similarity,
            lastAccessed: entry.metadata.lastAccessed
          });
          
          // Mise à jour de l'accès
          entry.metadata.lastAccessed = new Date();
          entry.metadata.accessCount++;
        }
      }
    }

    return results;
  }

  /**
   * Récupération associative
   */
  async associativeRetrieval(query) {
    const results = [];
    const queryAssociations = this.extractAssociations(query);

    for (const [memoryType, storage] of Object.entries(this.storage)) {
      for (const [id, entry] of storage) {
        const associationStrength = this.calculateAssociationStrength(queryAssociations, entry.associations);
        
        if (associationStrength > 0.4) {
          results.push({
            id,
            entry: await this.decompressIfNeeded(entry),
            memoryType,
            relevance: associationStrength,
            associationType: 'associative'
          });
        }
      }
    }

    return results;
  }

  /**
   * Démarre la maintenance mémoire
   */
  startMemoryMaintenance() {
    if (!this.config.autoCleanup) return;

    setInterval(async () => {
      await this.performMemoryMaintenance();
    }, 300000); // Toutes les 5 minutes
  }

  /**
   * Effectue la maintenance mémoire
   */
  async performMemoryMaintenance() {
    logger.debug('🔧 Début de la maintenance mémoire');

    // Nettoyage des entrées expirées
    await this.cleanupExpiredEntries();
    
    // Optimisation des index
    await this.optimizeIndexes();
    
    // Mise à jour des statistiques
    this.updateMemoryStatistics();
    
    logger.debug('✅ Maintenance mémoire terminée');
  }

  /**
   * Nettoie les entrées expirées
   */
  async cleanupExpiredEntries() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [memoryType, storage] of Object.entries(this.storage)) {
      const typeConfig = this.memoryTypes[memoryType];
      
      if (typeConfig.retention === 'permanent') continue;

      const retentionPeriod = typeConfig.retention === 'high' ? 
        this.config.retentionPeriod * 2 : this.config.retentionPeriod;

      for (const [id, entry] of storage) {
        const age = now - entry.metadata.createdAt.getTime();
        const lastAccess = now - entry.metadata.lastAccessed.getTime();
        
        // Critères d'expiration
        const isExpired = age > retentionPeriod && lastAccess > retentionPeriod / 2;
        const isLowImportance = entry.metadata.importance < 0.3 && lastAccess > retentionPeriod / 4;
        
        if (isExpired || isLowImportance) {
          storage.delete(id);
          await this.removeFromIndexes(id, entry);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info(`🧹 ${cleanedCount} entrées expirées nettoyées`);
    }
  }

  /**
   * Démarre le processus de compression
   */
  startCompressionProcess() {
    if (!this.config.compressionEnabled) return;

    setInterval(async () => {
      await this.performCompression();
    }, 600000); // Toutes les 10 minutes
  }

  /**
   * Effectue la compression des données
   */
  async performCompression() {
    let compressedCount = 0;

    for (const [memoryType, storage] of Object.entries(this.storage)) {
      const typeConfig = this.memoryTypes[memoryType];
      
      if (typeConfig.compression === 'none') continue;

      for (const [id, entry] of storage) {
        if (!entry.metadata.compressed && this.shouldCompress(entry)) {
          try {
            const originalSize = entry.metadata.size;
            entry.content = await this.compressContent(entry.content, memoryType);
            entry.metadata.compressed = true;
            entry.metadata.size = this.calculateSize(entry.content);
            
            const compressionRatio = entry.metadata.size / originalSize;
            this.state.compressionRatio = (this.state.compressionRatio + compressionRatio) / 2;
            
            compressedCount++;
          } catch (error) {
            logger.warn(`Échec de compression pour ${id}:`, error);
          }
        }
      }
    }

    if (compressedCount > 0) {
      this.state.memoryStats.compressions += compressedCount;
      logger.info(`🗜️ ${compressedCount} entrées compressées`);
    }
  }

  /**
   * Démarre l'analyse des patterns d'accès
   */
  startAccessPatternAnalysis() {
    if (!this.config.accessPatternTracking) return;

    setInterval(async () => {
      await this.analyzeAccessPatterns();
    }, 900000); // Toutes les 15 minutes
  }

  /**
   * Analyse les patterns d'accès
   */
  async analyzeAccessPatterns() {
    // Analyse des patterns temporels
    const temporalPatterns = this.analyzeTemporalPatterns();
    
    // Analyse des patterns sémantiques
    const semanticPatterns = this.analyzeSemanticPatterns();
    
    // Optimisation basée sur les patterns
    await this.optimizeBasedOnPatterns(temporalPatterns, semanticPatterns);
  }

  /**
   * Méthodes utilitaires
   */
  calculateImportance(knowledge) {
    // Calcul simplifié de l'importance
    let importance = 0.5;
    
    if (knowledge.confidence) importance += knowledge.confidence * 0.3;
    if (knowledge.novelty) importance += knowledge.novelty * 0.2;
    if (knowledge.type === 'meta_learning') importance += 0.3;
    
    return Math.min(importance, 1.0);
  }

  calculateSize(content) {
    // Estimation de la taille en MB
    return JSON.stringify(content).length / (1024 * 1024);
  }

  extractTags(knowledge) {
    const tags = [];
    const content = JSON.stringify(knowledge).toLowerCase();
    
    // Extraction de tags basiques
    if (content.includes('learning')) tags.push('learning');
    if (content.includes('problem')) tags.push('problem_solving');
    if (content.includes('creative')) tags.push('creativity');
    
    return tags;
  }

  shouldCompress(entry) {
    return entry.metadata.size > 1 && // Plus de 1MB
           entry.metadata.accessCount < 5 && // Peu accédé
           !entry.metadata.compressed; // Pas déjà compressé
  }

  updateMemoryStats(operation, value) {
    this.state.memoryStats[operation === 'read' ? 'reads' : 'writes']++;
    this.state.memoryUsage = this.calculateCurrentMemoryUsage();
    this.state.totalEntries = this.calculateTotalEntries();
  }

  calculateCurrentMemoryUsage() {
    let totalSize = 0;
    for (const storage of Object.values(this.storage)) {
      for (const entry of storage.values()) {
        totalSize += entry.metadata.size;
      }
    }
    return totalSize;
  }

  calculateTotalEntries() {
    let total = 0;
    for (const storage of Object.values(this.storage)) {
      total += storage.size;
    }
    return total;
  }

  /**
   * Obtient le statut de santé du système
   */
  async getHealthStatus() {
    return {
      status: this.state.isActive ? 'healthy' : 'inactive',
      memoryUsage: this.state.memoryUsage,
      memoryLimit: this.config.memoryLimit,
      utilizationRate: (this.state.memoryUsage / this.config.memoryLimit) * 100,
      totalEntries: this.state.totalEntries,
      compressionRatio: this.state.compressionRatio,
      stats: this.state.memoryStats,
      storageBreakdown: Object.fromEntries(
        Object.entries(this.storage).map(([type, storage]) => [type, storage.size])
      )
    };
  }

  /**
   * Arrête le système
   */
  async stop() {
    this.state.isActive = false;
    logger.info('🛑 Système de mémoire ASI arrêté');
    this.emit('memory_system_stopped');
  }

  // Méthodes simplifiées pour les fonctionnalités avancées
  findAssociations(knowledge) { return []; }
  extractContext(knowledge) { return {}; }
  compressContent(content, type) { return Promise.resolve(content); }
  decompressIfNeeded(entry) { return Promise.resolve(entry); }
  updateIndexes(id, entry) { return Promise.resolve(); }
  removeFromIndexes(id, entry) { return Promise.resolve(); }
  optimizeIndexes() { return Promise.resolve(); }
  updateMemoryStatistics() { }
  createQueryVector(query) { return []; }
  calculateSemanticSimilarity(vector, entry) { return Math.random() * 0.8 + 0.2; }
  extractAssociations(query) { return []; }
  calculateAssociationStrength(queryAssoc, entryAssoc) { return Math.random() * 0.6 + 0.4; }
  updateAccessPatterns(query, results) { }
  analyzeTemporalPatterns() { return []; }
  analyzeSemanticPatterns() { return []; }
  optimizeBasedOnPatterns(temporal, semantic) { return Promise.resolve(); }
  exactMatchRetrieval(query) { return Promise.resolve([]); }
  temporalRetrieval(query) { return Promise.resolve([]); }
  contextualRetrieval(query) { return Promise.resolve([]); }
  losslessCompression(content) { return Promise.resolve(content); }
  lossyCompression(content) { return Promise.resolve(content); }
  semanticCompression(content) { return Promise.resolve(content); }
  temporalCompression(content) { return Promise.resolve(content); }
}

export default ASIMemorySystem; 