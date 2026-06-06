/**
 * @fileoverview Multitask Learning Engine - Moteur d'apprentissage multitâche pour ASI
 * @module multitaskLearningEngine
 * @description Gère l'apprentissage simultané sur plusieurs domaines et tâches
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import natural from 'natural';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/multitask-learning.log' }),
    new winston.transports.Console()
  ]
});

/**
 * @class MultitaskLearningEngine
 * @extends EventEmitter
 * @description Moteur d'apprentissage multitâche pour traitement simultané de domaines variés
 */
export class MultitaskLearningEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      capacity: config.capacity || 10,
      learningRate: config.learningRate || 0.1,
      domainSeparation: config.domainSeparation || true,
      sharedRepresentation: config.sharedRepresentation || true,
      adaptiveWeighting: config.adaptiveWeighting || true,
      ...config
    };

    this.state = {
      isActive: false,
      currentTasks: new Map(),
      domainExperts: new Map(),
      sharedKnowledge: new Map(),
      taskQueue: [],
      performanceMetrics: new Map(),
      learningHistory: [],
      domainWeights: new Map()
    };

    this.domains = {
      'language': { weight: 1.0, expertise: 0.5, tasks: [] },
      'mathematics': { weight: 1.0, expertise: 0.3, tasks: [] },
      'science': { weight: 1.0, expertise: 0.4, tasks: [] },
      'logic': { weight: 1.0, expertise: 0.6, tasks: [] },
      'creativity': { weight: 1.0, expertise: 0.2, tasks: [] },
      'analysis': { weight: 1.0, expertise: 0.7, tasks: [] },
      'synthesis': { weight: 1.0, expertise: 0.4, tasks: [] },
      'problem_solving': { weight: 1.0, expertise: 0.5, tasks: [] },
      'pattern_recognition': { weight: 1.0, expertise: 0.8, tasks: [] },
      'decision_making': { weight: 1.0, expertise: 0.6, tasks: [] }
    };

    this.initializeDomainExperts();
  }

  /**
   * Initialise les experts de domaine
   */
  initializeDomainExperts() {
    for (const [domain, config] of Object.entries(this.domains)) {
      this.state.domainExperts.set(domain, {
        neuralNetwork: this.createDomainNetwork(domain),
        knowledgeBase: new Map(),
        recentPerformance: [],
        adaptationRate: this.config.learningRate,
        specialization: config.expertise
      });
    }
  }

  /**
   * Crée un réseau neuronal spécialisé pour un domaine
   */
  createDomainNetwork(domain) {
    return {
      domain,
      layers: [
        { size: 512, activation: 'relu' },
        { size: 256, activation: 'relu' },
        { size: 128, activation: 'relu' },
        { size: 64, activation: 'softmax' }
      ],
      weights: this.initializeWeights(),
      biases: this.initializeBiases(),
      learningRate: this.config.learningRate
    };
  }

  /**
   * Initialise les poids du réseau
   */
  initializeWeights() {
    const weights = [];
    const layerSizes = [512, 256, 128, 64];
    
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const layerWeights = [];
      for (let j = 0; j < layerSizes[i]; j++) {
        const neuronWeights = [];
        for (let k = 0; k < layerSizes[i + 1]; k++) {
          neuronWeights.push((Math.random() - 0.5) * 2);
        }
        layerWeights.push(neuronWeights);
      }
      weights.push(layerWeights);
    }
    
    return weights;
  }

  /**
   * Initialise les biais du réseau
   */
  initializeBiases() {
    return [256, 128, 64].map(size => 
      Array(size).fill(0).map(() => (Math.random() - 0.5) * 0.1)
    );
  }

  /**
   * Démarre le moteur d'apprentissage multitâche
   */
  async start() {
    this.state.isActive = true;
    logger.info('🚀 Moteur d\'apprentissage multitâche démarré');
    
    // Démarrage du processeur de tâches
    this.startTaskProcessor();
    
    // Démarrage de l'optimisation continue
    this.startContinuousOptimization();
    
    this.emit('engine_started');
  }

  /**
   * Traite une tâche avec apprentissage multitâche
   */
  async processTask(task) {
    if (!this.state.isActive) {
      throw new Error('Moteur d\'apprentissage multitâche non actif');
    }

    const taskId = `mt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      logger.info(`🎯 Traitement multitâche de la tâche ${taskId}`);

      // Classification du domaine de la tâche
      const domains = await this.classifyTaskDomains(task);
      
      // Sélection des experts appropriés
      const selectedExperts = this.selectExperts(domains);
      
      // Traitement parallèle par les experts
      const expertResults = await this.processWithExperts(task, selectedExperts);
      
      // Fusion des résultats
      const fusedResult = await this.fuseExpertResults(expertResults, domains);
      
      // Apprentissage à partir des résultats
      await this.learnFromResults(task, fusedResult, domains);
      
      // Mise à jour des métriques
      const processingTime = Date.now() - startTime;
      this.updateMetrics(taskId, domains, processingTime, true);

      logger.info(`✅ Tâche multitâche ${taskId} complétée en ${processingTime}ms`);
      this.emit('task_completed', { taskId, result: fusedResult, domains, processingTime });

      return {
        result: fusedResult,
        domains,
        experts: selectedExperts.map(e => e.domain),
        processingTime,
        confidence: fusedResult.confidence || 0.8
      };

    } catch (error) {
      logger.error(`❌ Erreur lors du traitement multitâche de la tâche ${taskId}:`, error);
      
      const processingTime = Date.now() - startTime;
      this.updateMetrics(taskId, [], processingTime, false);
      
      throw error;
    }
  }

  /**
   * Classifie les domaines d'une tâche
   */
  async classifyTaskDomains(task) {
    const text = task.description || task.content || '';
    const tokens = natural.WordTokenizer.tokenize(text.toLowerCase());
    
    const domainScores = new Map();
    
    // Analyse lexicale pour chaque domaine
    for (const [domain, _config] of Object.entries(this.domains)) {
      let score = 0;
      
      // Mots-clés spécifiques au domaine
      const keywords = this.getDomainKeywords(domain);
      for (const token of tokens) {
        if (keywords.includes(token)) {
          score += 1;
        }
      }
      
      // Analyse sémantique
      const semanticScore = await this.calculateSemanticSimilarity(text, domain);
      score += semanticScore;
      
      // Normalisation par la longueur du texte
      score = score / Math.max(tokens.length, 1);
      
      domainScores.set(domain, score);
    }
    
    // Sélection des domaines les plus pertinents
    const sortedDomains = Array.from(domainScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // Top 3 domaines
      .filter(([_domain, score]) => score > 0.1);
    
    return sortedDomains.map(([domain, score]) => ({ domain, relevance: score }));
  }

  /**
   * Obtient les mots-clés spécifiques à un domaine
   */
  getDomainKeywords(domain) {
    const keywords = {
      'language': ['text', 'word', 'sentence', 'grammar', 'syntax', 'semantic', 'translate', 'write'],
      'mathematics': ['number', 'calculate', 'equation', 'formula', 'solve', 'math', 'algebra', 'geometry'],
      'science': ['experiment', 'hypothesis', 'theory', 'research', 'data', 'analysis', 'scientific'],
      'logic': ['reason', 'logical', 'inference', 'deduction', 'proof', 'argument', 'conclusion'],
      'creativity': ['create', 'design', 'imagine', 'innovative', 'artistic', 'original', 'brainstorm'],
      'analysis': ['analyze', 'examine', 'study', 'investigate', 'breakdown', 'evaluate', 'assess'],
      'synthesis': ['combine', 'merge', 'integrate', 'synthesize', 'unify', 'consolidate'],
      'problem_solving': ['problem', 'solution', 'solve', 'fix', 'resolve', 'troubleshoot', 'debug'],
      'pattern_recognition': ['pattern', 'recognize', 'identify', 'classify', 'categorize', 'detect'],
      'decision_making': ['decide', 'choose', 'select', 'option', 'alternative', 'judgment', 'decision']
    };
    
    return keywords[domain] || [];
  }

  /**
   * Calcule la similarité sémantique avec un domaine
   */
  async calculateSemanticSimilarity(text, domain) {
    // Implémentation simplifiée - dans un vrai système, utiliser des embeddings
    const domainDescriptions = {
      'language': 'text processing writing communication linguistics grammar',
      'mathematics': 'numbers calculations equations formulas mathematical operations',
      'science': 'scientific research experiments data analysis hypothesis testing',
      'logic': 'logical reasoning deduction inference proof arguments',
      'creativity': 'creative design imagination innovation artistic expression',
      'analysis': 'analytical examination investigation evaluation assessment',
      'synthesis': 'combination integration merging unification consolidation',
      'problem_solving': 'problem solving troubleshooting debugging resolution',
      'pattern_recognition': 'pattern detection recognition classification identification',
      'decision_making': 'decision making choices selection judgment evaluation'
    };
    
    const domainText = domainDescriptions[domain] || '';
    const textTokens = natural.WordTokenizer.tokenize(text.toLowerCase());
    const domainTokens = natural.WordTokenizer.tokenize(domainText.toLowerCase());
    
    const intersection = textTokens.filter(token => domainTokens.includes(token));
    const union = [...new Set([...textTokens, ...domainTokens])];
    
    return intersection.length / union.length;
  }

  /**
   * Sélectionne les experts appropriés pour les domaines
   */
  selectExperts(domains) {
    const selectedExperts = [];
    
    for (const { domain, relevance } of domains) {
      const expert = this.state.domainExperts.get(domain);
      if (expert && relevance > 0.1) {
        selectedExperts.push({
          domain,
          expert,
          relevance,
          weight: this.calculateExpertWeight(domain, relevance)
        });
      }
    }
    
    // Tri par poids décroissant
    selectedExperts.sort((a, b) => b.weight - a.weight);
    
    // Limitation du nombre d'experts
    return selectedExperts.slice(0, this.config.capacity);
  }

  /**
   * Calcule le poids d'un expert
   */
  calculateExpertWeight(domain, relevance) {
    const domainConfig = this.domains[domain];
    const expert = this.state.domainExperts.get(domain);
    
    if (!domainConfig || !expert) return 0;
    
    const expertiseWeight = domainConfig.expertise;
    const performanceWeight = this.calculateRecentPerformance(domain);
    const relevanceWeight = relevance;
    
    return (expertiseWeight * 0.4 + performanceWeight * 0.4 + relevanceWeight * 0.2);
  }

  /**
   * Calcule la performance récente d'un expert
   */
  calculateRecentPerformance(domain) {
    const expert = this.state.domainExperts.get(domain);
    if (!expert || expert.recentPerformance.length === 0) return 0.5;
    
    const recentScores = expert.recentPerformance.slice(-10);
    return recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  }

  /**
   * Traite une tâche avec les experts sélectionnés
   */
  async processWithExperts(task, selectedExperts) {
    const expertPromises = selectedExperts.map(async ({ domain, expert, relevance, weight }) => {
      try {
        const result = await this.processWithSingleExpert(task, domain, expert);
        return {
          domain,
          result,
          weight,
          relevance,
          success: true
        };
      } catch (error) {
        logger.warn(`Expert ${domain} a échoué:`, error);
        return {
          domain,
          result: null,
          weight,
          relevance,
          success: false,
          error: error.message
        };
      }
    });
    
    const results = await Promise.all(expertPromises);
    return results.filter(r => r.success);
  }

  /**
   * Traite une tâche avec un expert spécifique
   */
  async processWithSingleExpert(task, domain, expert) {
    // Simulation du traitement par l'expert de domaine
    const input = this.preprocessTaskForDomain(task, domain);
    const output = await this.forwardPass(expert.neuralNetwork, input);
    
    return {
      domain,
      output,
      confidence: this.calculateConfidence(output),
      reasoning: this.generateReasoning(domain, input, output),
      knowledgeUsed: this.getRelevantKnowledge(domain, task)
    };
  }

  /**
   * Préprocesse une tâche pour un domaine spécifique
   */
  preprocessTaskForDomain(task, _domain) {
    const text = task.description || task.content || '';
    
    // Tokenisation et vectorisation simplifiée
    const tokens = natural.WordTokenizer.tokenize(text.toLowerCase());
    const vector = new Array(512).fill(0);
    
    // Conversion des tokens en vecteur (implémentation simplifiée)
    for (let i = 0; i < Math.min(tokens.length, 512); i++) {
      vector[i] = this.tokenToNumber(tokens[i]);
    }
    
    return vector;
  }

  /**
   * Convertit un token en nombre
   */
  tokenToNumber(token) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Conversion en 32bit
    }
    return (hash % 1000) / 1000; // Normalisation entre 0 et 1
  }

  /**
   * Effectue une passe avant dans le réseau neuronal
   */
  async forwardPass(network, input) {
    let activation = input;
    
    for (let layerIndex = 0; layerIndex < network.weights.length; layerIndex++) {
      const weights = network.weights[layerIndex];
      const biases = network.biases[layerIndex];
      const newActivation = [];
      
      for (let neuronIndex = 0; neuronIndex < weights[0].length; neuronIndex++) {
        let sum = biases[neuronIndex];
        
        for (let inputIndex = 0; inputIndex < activation.length; inputIndex++) {
          sum += activation[inputIndex] * weights[inputIndex][neuronIndex];
        }
        
        // Fonction d'activation ReLU ou Softmax
        if (layerIndex === network.weights.length - 1) {
          newActivation.push(this.softmax(sum));
        } else {
          newActivation.push(Math.max(0, sum)); // ReLU
        }
      }
      
      activation = newActivation;
    }
    
    return activation;
  }

  /**
   * Fonction softmax
   */
  softmax(x) {
    return Math.exp(x) / (1 + Math.exp(x));
  }

  /**
   * Calcule la confiance d'un résultat
   */
  calculateConfidence(output) {
    const max = Math.max(...output);
    const sum = output.reduce((a, b) => a + b, 0);
    return max / sum;
  }

  /**
   * Génère un raisonnement pour un domaine
   */
  generateReasoning(domain, input, output) {
    return {
      domain,
      approach: `Analyse spécialisée en ${domain}`,
      confidence: this.calculateConfidence(output),
      keyFactors: this.identifyKeyFactors(domain, input),
      conclusion: this.generateConclusion(domain, output)
    };
  }

  /**
   * Identifie les facteurs clés pour un domaine
   */
  identifyKeyFactors(domain, input) {
    // Identification des éléments les plus influents dans l'input
    const topIndices = input
      .map((value, index) => ({ value, index }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 5)
      .map(item => item.index);
    
    return {
      domain,
      influentialFactors: topIndices,
      reasoning: `Facteurs clés identifiés pour le domaine ${domain}`
    };
  }

  /**
   * Génère une conclusion pour un domaine
   */
  generateConclusion(domain, output) {
    const maxIndex = output.indexOf(Math.max(...output));
    const confidence = this.calculateConfidence(output);
    
    return {
      domain,
      prediction: maxIndex,
      confidence,
      explanation: `Conclusion basée sur l'expertise en ${domain} avec ${(confidence * 100).toFixed(1)}% de confiance`
    };
  }

  /**
   * Obtient les connaissances pertinentes pour un domaine
   */
  getRelevantKnowledge(domain, task) {
    const expert = this.state.domainExperts.get(domain);
    if (!expert) return [];
    
    // Recherche dans la base de connaissances du domaine
    const relevantKnowledge = [];
    for (const [_key, knowledge] of expert.knowledgeBase) {
      if (this.isKnowledgeRelevant(knowledge, task)) {
        relevantKnowledge.push(knowledge);
      }
    }
    
    return relevantKnowledge.slice(0, 10); // Limitation à 10 éléments
  }

  /**
   * Vérifie si une connaissance est pertinente
   */
  isKnowledgeRelevant(knowledge, task) {
    // Implémentation simplifiée de la pertinence
    const taskText = (task.description || task.content || '').toLowerCase();
    const knowledgeText = (knowledge.description || '').toLowerCase();
    
    const taskTokens = natural.WordTokenizer.tokenize(taskText);
    const knowledgeTokens = natural.WordTokenizer.tokenize(knowledgeText);
    
    const intersection = taskTokens.filter(token => knowledgeTokens.includes(token));
    return intersection.length > 0;
  }

  /**
   * Fusionne les résultats des experts
   */
  async fuseExpertResults(expertResults, domains) {
    if (expertResults.length === 0) {
      throw new Error('Aucun résultat d\'expert disponible');
    }
    
    if (expertResults.length === 1) {
      return expertResults[0].result;
    }
    
    // Fusion pondérée des résultats
    const fusedResult = {
      domains: domains.map(d => d.domain),
      expertContributions: expertResults.map(r => ({
        domain: r.domain,
        weight: r.weight,
        confidence: r.result.confidence
      })),
      fusedOutput: this.weightedFusion(expertResults),
      reasoning: this.fuseReasoning(expertResults),
      confidence: this.calculateFusedConfidence(expertResults)
    };
    
    return fusedResult;
  }

  /**
   * Effectue une fusion pondérée des sorties
   */
  weightedFusion(expertResults) {
    const totalWeight = expertResults.reduce((sum, r) => sum + r.weight, 0);
    const outputSize = expertResults[0].result.output.length;
    const fusedOutput = new Array(outputSize).fill(0);
    
    for (const expertResult of expertResults) {
      const normalizedWeight = expertResult.weight / totalWeight;
      for (let i = 0; i < outputSize; i++) {
        fusedOutput[i] += expertResult.result.output[i] * normalizedWeight;
      }
    }
    
    return fusedOutput;
  }

  /**
   * Fusionne les raisonnements des experts
   */
  fuseReasoning(expertResults) {
    return {
      approach: 'Fusion multitâche d\'experts spécialisés',
      expertReasonings: expertResults.map(r => r.result.reasoning),
      consensus: this.findConsensus(expertResults),
      conflicts: this.identifyConflicts(expertResults)
    };
  }

  /**
   * Trouve le consensus entre les experts
   */
  findConsensus(expertResults) {
    const conclusions = expertResults.map(r => r.result.reasoning.conclusion.prediction);
    const consensusMap = new Map();
    
    for (const conclusion of conclusions) {
      consensusMap.set(conclusion, (consensusMap.get(conclusion) || 0) + 1);
    }
    
    const sortedConsensus = Array.from(consensusMap.entries())
      .sort((a, b) => b[1] - a[1]);
    
    return {
      majorityPrediction: sortedConsensus[0]?.[0],
      agreement: sortedConsensus[0]?.[1] / expertResults.length,
      distribution: Object.fromEntries(consensusMap)
    };
  }

  /**
   * Identifie les conflits entre experts
   */
  identifyConflicts(expertResults) {
    const conflicts = [];
    
    for (let i = 0; i < expertResults.length; i++) {
      for (let j = i + 1; j < expertResults.length; j++) {
        const expert1 = expertResults[i];
        const expert2 = expertResults[j];
        
        const prediction1 = expert1.result.reasoning.conclusion.prediction;
        const prediction2 = expert2.result.reasoning.conclusion.prediction;
        
        if (prediction1 !== prediction2) {
          conflicts.push({
            experts: [expert1.domain, expert2.domain],
            predictions: [prediction1, prediction2],
            confidences: [
              expert1.result.confidence,
              expert2.result.confidence
            ]
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Calcule la confiance fusionnée
   */
  calculateFusedConfidence(expertResults) {
    const weightedConfidences = expertResults.map(r => r.result.confidence * r.weight);
    const totalWeight = expertResults.reduce((sum, r) => sum + r.weight, 0);
    
    return weightedConfidences.reduce((sum, conf) => sum + conf, 0) / totalWeight;
  }

  /**
   * Apprend à partir des résultats
   */
  async learnFromResults(task, result, domains) {
    // Mise à jour des performances des experts
    for (const { domain } of domains) {
      const expert = this.state.domainExperts.get(domain);
      if (expert) {
        const performance = this.evaluateExpertPerformance(domain, result);
        expert.recentPerformance.push(performance);
        
        // Limitation de l'historique
        if (expert.recentPerformance.length > 100) {
          expert.recentPerformance.shift();
        }
        
        // Mise à jour des poids du réseau (apprentissage simplifié)
        await this.updateExpertWeights(domain, task, result, performance);
      }
    }
    
    // Mise à jour des connaissances partagées
    await this.updateSharedKnowledge(task, result, domains);
    
    // Enregistrement dans l'historique
    this.state.learningHistory.push({
      timestamp: new Date(),
      task: task.description || task.content,
      domains: domains.map(d => d.domain),
      result: result.fusedOutput || result.output,
      confidence: result.confidence
    });
    
    // Limitation de l'historique
    if (this.state.learningHistory.length > 1000) {
      this.state.learningHistory.shift();
    }
  }

  /**
   * Évalue la performance d'un expert
   */
  evaluateExpertPerformance(domain, result) {
    // Évaluation simplifiée basée sur la confiance et la cohérence
    const confidence = result.confidence || 0.5;
    const consistency = this.calculateConsistency(domain);
    
    return (confidence * 0.7 + consistency * 0.3);
  }

  /**
   * Calcule la cohérence d'un expert
   */
  calculateConsistency(domain) {
    const expert = this.state.domainExperts.get(domain);
    if (!expert || expert.recentPerformance.length < 2) return 0.5;
    
    const recent = expert.recentPerformance.slice(-10);
    const variance = this.calculateVariance(recent);
    
    return Math.max(0, 1 - variance); // Plus la variance est faible, plus la cohérence est élevée
  }

  /**
   * Calcule la variance d'un tableau
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Met à jour les poids d'un expert
   */
  async updateExpertWeights(domain, task, result, performance) {
    const expert = this.state.domainExperts.get(domain);
    if (!expert) return;
    
    // Mise à jour simplifiée des poids basée sur la performance
    const learningRate = expert.adaptationRate * performance;
    
    // Ajustement des poids (implémentation simplifiée)
    for (let layerIndex = 0; layerIndex < expert.neuralNetwork.weights.length; layerIndex++) {
      for (let i = 0; i < expert.neuralNetwork.weights[layerIndex].length; i++) {
        for (let j = 0; j < expert.neuralNetwork.weights[layerIndex][i].length; j++) {
          const adjustment = (Math.random() - 0.5) * learningRate * 0.01;
          expert.neuralNetwork.weights[layerIndex][i][j] += adjustment;
        }
      }
    }
    
    // Mise à jour du taux d'adaptation
    expert.adaptationRate = Math.max(0.001, expert.adaptationRate * 0.999);
  }

  /**
   * Met à jour les connaissances partagées
   */
  async updateSharedKnowledge(task, result, domains) {
    const knowledgeKey = this.generateKnowledgeKey(task);
    
    const sharedKnowledge = {
      task: task.description || task.content,
      domains: domains.map(d => d.domain),
      result: result.fusedOutput || result.output,
      confidence: result.confidence,
      timestamp: new Date(),
      usageCount: 1
    };
    
    if (this.state.sharedKnowledge.has(knowledgeKey)) {
      const existing = this.state.sharedKnowledge.get(knowledgeKey);
      existing.usageCount++;
      existing.lastUsed = new Date();
    } else {
      this.state.sharedKnowledge.set(knowledgeKey, sharedKnowledge);
    }
    
    // Nettoyage des anciennes connaissances
    this.cleanupSharedKnowledge();
  }

  /**
   * Génère une clé pour les connaissances
   */
  generateKnowledgeKey(task) {
    const text = task.description || task.content || '';
    const tokens = natural.WordTokenizer.tokenize(text.toLowerCase());
    const keyTokens = tokens.slice(0, 5).sort();
    return keyTokens.join('_');
  }

  /**
   * Nettoie les anciennes connaissances partagées
   */
  cleanupSharedKnowledge() {
    const maxSize = 10000;
    if (this.state.sharedKnowledge.size <= maxSize) return;
    
    // Tri par usage et ancienneté
    const entries = Array.from(this.state.sharedKnowledge.entries())
      .sort((a, b) => {
        const scoreA = a[1].usageCount * (1 / (Date.now() - a[1].timestamp));
        const scoreB = b[1].usageCount * (1 / (Date.now() - b[1].timestamp));
        return scoreB - scoreA;
      });
    
    // Conservation des meilleures connaissances
    this.state.sharedKnowledge.clear();
    for (let i = 0; i < maxSize * 0.8; i++) {
      if (entries[i]) {
        this.state.sharedKnowledge.set(entries[i][0], entries[i][1]);
      }
    }
  }

  /**
   * Démarre le processeur de tâches
   */
  startTaskProcessor() {
    setInterval(() => {
      this.processTaskQueue();
    }, 1000);
  }

  /**
   * Traite la file d'attente des tâches
   */
  async processTaskQueue() {
    if (this.state.taskQueue.length === 0) return;
    
    const availableCapacity = this.config.capacity - this.state.currentTasks.size;
    if (availableCapacity <= 0) return;
    
    const tasksToProcess = this.state.taskQueue.splice(0, availableCapacity);
    
    for (const task of tasksToProcess) {
      try {
        await this.processTask(task);
      } catch (error) {
        logger.error('Erreur lors du traitement de tâche en file:', error);
      }
    }
  }

  /**
   * Démarre l'optimisation continue
   */
  startContinuousOptimization() {
    setInterval(() => {
      this.optimizeExperts();
    }, 60000); // Toutes les minutes
  }

  /**
   * Optimise les experts
   */
  async optimizeExperts() {
    for (const [domain, expert] of this.state.domainExperts) {
      // Ajustement du taux d'apprentissage basé sur la performance
      const avgPerformance = this.calculateRecentPerformance(domain);
      
      if (avgPerformance < 0.5) {
        expert.adaptationRate = Math.min(0.1, expert.adaptationRate * 1.1);
      } else if (avgPerformance > 0.8) {
        expert.adaptationRate = Math.max(0.001, expert.adaptationRate * 0.9);
      }
      
      // Mise à jour de la spécialisation
      this.domains[domain].expertise = Math.min(1.0, this.domains[domain].expertise + avgPerformance * 0.01);
    }
  }

  /**
   * Met à jour les métriques
   */
  updateMetrics(taskId, domains, processingTime, success) {
    for (const { domain } of domains) {
      if (!this.state.performanceMetrics.has(domain)) {
        this.state.performanceMetrics.set(domain, {
          tasksProcessed: 0,
          successRate: 0,
          averageTime: 0,
          totalTime: 0
        });
      }
      
      const metrics = this.state.performanceMetrics.get(domain);
      metrics.tasksProcessed++;
      metrics.totalTime += processingTime;
      metrics.averageTime = metrics.totalTime / metrics.tasksProcessed;
      
      if (success) {
        metrics.successRate = (metrics.successRate * (metrics.tasksProcessed - 1) + 1) / metrics.tasksProcessed;
      } else {
        metrics.successRate = (metrics.successRate * (metrics.tasksProcessed - 1)) / metrics.tasksProcessed;
      }
    }
  }

  /**
   * Obtient le statut de santé du moteur
   */
  async getHealthStatus() {
    const expertHealth = {};
    for (const [domain, expert] of this.state.domainExperts) {
      expertHealth[domain] = {
        performance: this.calculateRecentPerformance(domain),
        adaptationRate: expert.adaptationRate,
        knowledgeSize: expert.knowledgeBase.size
      };
    }
    
    return {
      status: this.state.isActive ? 'healthy' : 'inactive',
      currentTasks: this.state.currentTasks.size,
      queueSize: this.state.taskQueue.length,
      sharedKnowledgeSize: this.state.sharedKnowledge.size,
      experts: expertHealth,
      metrics: Object.fromEntries(this.state.performanceMetrics)
    };
  }

  /**
   * Arrête le moteur
   */
  async stop() {
    this.state.isActive = false;
    logger.info('🛑 Moteur d\'apprentissage multitâche arrêté');
    this.emit('engine_stopped');
  }
}

export default MultitaskLearningEngine; 