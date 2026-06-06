/**
 * @fileoverview ASI Interface - Interface conversationnelle avancée pour ASI
 * @module asiInterface
 * @description Interface utilisateur intuitive pour interaction avec l'ASI
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import ASICore from './asiCore.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/asi-interface.log' }),
    new winston.transports.Console()
  ]
});

/**
 * @class ASIInterface
 * @extends EventEmitter
 * @description Interface conversationnelle avancée pour l'ASI
 */
export class ASIInterface extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      port: config.port || 3001,
      enableVoice: config.enableVoice !== false,
      enableMetrics: config.enableMetrics !== false,
      conversationHistory: config.conversationHistory || 100,
      ...config
    };

    this.asiCore = new ASICore(config.asiConfig || {});
    this.state = {
      isActive: false,
      conversations: new Map(),
      activeUsers: new Set(),
      metrics: {
        totalInteractions: 0,
        averageResponseTime: 0,
        userSatisfaction: 0.8,
        learningProgress: 0.0
      }
    };

    this.conversationContexts = new Map();
    this.setupEventHandlers();
  }

  /**
   * Configure les gestionnaires d'événements
   */
  setupEventHandlers() {
    this.asiCore.on('task_completed', (data) => {
      this.handleTaskCompletion(data);
    });

    this.asiCore.on('improvement_applied', (improvement) => {
      this.notifyUsersOfImprovement(improvement);
    });

    this.asiCore.on('safety_alert', (alert) => {
      this.handleSafetyAlert(alert);
    });
  }

  /**
   * Démarre l'interface ASI
   */
  async start() {
    try {
      logger.info('🚀 Démarrage de l\'interface ASI...');

      // Initialisation de l'ASI Core
      await this.asiCore.activate();

      // Démarrage du serveur web
      await this.startWebServer();

      // Démarrage des services
      this.startMetricsCollection();
      this.startConversationManager();

      this.state.isActive = true;
      logger.info('✅ Interface ASI démarrée et opérationnelle');
      this.emit('interface_started');

      return {
        status: 'active',
        port: this.config.port,
        features: {
          voice: this.config.enableVoice,
          metrics: this.config.enableMetrics,
          asi: this.asiCore.getStatus()
        }
      };

    } catch (error) {
      logger.error('❌ Erreur lors du démarrage de l\'interface ASI:', error);
      throw error;
    }
  }

  /**
   * Démarre le serveur web
   */
  async startWebServer() {
    // Simulation du démarrage du serveur web
    // Dans une vraie implémentation, utiliser Express.js ou similaire
    logger.info(`🌐 Serveur web démarré sur le port ${this.config.port}`);
    
    // Configuration des routes
    this.setupRoutes();
  }

  /**
   * Configure les routes de l'API
   */
  setupRoutes() {
    const routes = {
      '/api/asi/chat': this.handleChatRequest.bind(this),
      '/api/asi/status': this.handleStatusRequest.bind(this),
      '/api/asi/metrics': this.handleMetricsRequest.bind(this),
      '/api/asi/voice': this.handleVoiceRequest.bind(this),
      '/api/asi/learn': this.handleLearningRequest.bind(this),
      '/api/asi/feedback': this.handleFeedbackRequest.bind(this)
    };

    logger.info('🛣️ Routes API configurées:', Object.keys(routes));
  }

  /**
   * Gère les requêtes de chat
   */
  async handleChatRequest(request) {
    const { userId, message, context } = request;
    const startTime = Date.now();

    try {
      logger.info(`💬 Nouvelle requête de chat de ${userId}: ${message}`);

      // Gestion du contexte de conversation
      const conversationContext = this.getOrCreateConversationContext(userId);
      
      // Préparation de la tâche pour l'ASI
      const task = this.prepareTaskFromMessage(message, context, conversationContext);
      
      // Traitement par l'ASI
      const asiResponse = await this.asiCore.processTask(task);
      
      // Génération de la réponse conversationnelle
      const response = await this.generateConversationalResponse(asiResponse, conversationContext);
      
      // Mise à jour du contexte
      this.updateConversationContext(userId, message, response, asiResponse);
      
      // Mise à jour des métriques
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, true);

      logger.info(`✅ Réponse générée en ${responseTime}ms`);

      return {
        success: true,
        response: response.text,
        voice: this.config.enableVoice ? response.voice : null,
        metadata: {
          responseTime,
          confidence: asiResponse.results.confidence,
          learningGained: asiResponse.knowledgeGained?.length || 0,
          domains: asiResponse.results.domains || []
        },
        context: {
          conversationId: conversationContext.id,
          turnCount: conversationContext.turns.length
        }
      };

    } catch (error) {
      logger.error(`❌ Erreur lors du traitement du chat pour ${userId}:`, error);
      
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, false);

      return {
        success: false,
        error: 'Erreur lors du traitement de votre message',
        fallbackResponse: this.generateFallbackResponse(message),
        metadata: {
          responseTime,
          errorType: error.name
        }
      };
    }
  }

  /**
   * Obtient ou crée un contexte de conversation
   */
  getOrCreateConversationContext(userId) {
    if (!this.conversationContexts.has(userId)) {
      const context = {
        id: `conv_${userId}_${Date.now()}`,
        userId,
        startTime: new Date(),
        turns: [],
        topics: [],
        userProfile: {
          preferences: {},
          expertise: {},
          learningStyle: 'adaptive'
        },
        asiState: {
          lastDomains: [],
          learningProgress: 0,
          adaptationLevel: 0.5
        }
      };
      this.conversationContexts.set(userId, context);
    }
    
    return this.conversationContexts.get(userId);
  }

  /**
   * Prépare une tâche à partir d'un message
   */
  prepareTaskFromMessage(message, context, conversationContext) {
    return {
      description: message,
      content: message,
      type: this.classifyMessageType(message),
      context: {
        conversation: conversationContext,
        user: context?.user || {},
        session: context?.session || {},
        history: conversationContext.turns.slice(-5) // 5 derniers tours
      },
      metadata: {
        timestamp: new Date(),
        source: 'chat_interface',
        priority: this.calculateMessagePriority(message, conversationContext)
      }
    };
  }

  /**
   * Classifie le type de message
   */
  classifyMessageType(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('?')) return 'question';
    if (lowerMessage.includes('help') || lowerMessage.includes('aide')) return 'help_request';
    if (lowerMessage.includes('learn') || lowerMessage.includes('apprendre')) return 'learning_request';
    if (lowerMessage.includes('create') || lowerMessage.includes('créer')) return 'creation_request';
    if (lowerMessage.includes('analyze') || lowerMessage.includes('analyser')) return 'analysis_request';
    
    return 'general_conversation';
  }

  /**
   * Calcule la priorité d'un message
   */
  calculateMessagePriority(message, context) {
    let priority = 0.5; // Priorité normale
    
    // Augmentation de priorité pour certains mots-clés
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'important'];
    const lowerMessage = message.toLowerCase();
    
    for (const keyword of urgentKeywords) {
      if (lowerMessage.includes(keyword)) {
        priority += 0.2;
      }
    }
    
    // Ajustement basé sur l'historique de conversation
    if (context.turns.length > 10) {
      priority += 0.1; // Utilisateur engagé
    }
    
    return Math.min(priority, 1.0);
  }

  /**
   * Génère une réponse conversationnelle
   */
  async generateConversationalResponse(asiResponse, conversationContext) {
    const baseResponse = asiResponse.results;
    
    // Adaptation du style de réponse selon le profil utilisateur
    const style = this.determineResponseStyle(conversationContext);
    
    // Génération du texte de réponse
    const responseText = await this.formatResponseText(baseResponse, style, conversationContext);
    
    // Génération de la réponse vocale si activée
    const voiceResponse = this.config.enableVoice ? 
      await this.generateVoiceResponse(responseText, style) : null;

    return {
      text: responseText,
      voice: voiceResponse,
      style,
      adaptations: this.identifyResponseAdaptations(baseResponse, conversationContext)
    };
  }

  /**
   * Détermine le style de réponse
   */
  determineResponseStyle(context) {
    const _userProfile = context.userProfile;
    const recentTurns = context.turns.slice(-3);
    
    // Analyse du style préféré de l'utilisateur
    const style = {
      formality: 0.5,
      technicality: 0.5,
      verbosity: 0.5,
      empathy: 0.7,
      creativity: 0.5
    };

    // Ajustement basé sur l'historique
    if (recentTurns.some(turn => turn.userMessage.includes('technical'))) {
      style.technicality += 0.2;
    }
    
    if (recentTurns.some(turn => turn.userMessage.includes('simple'))) {
      style.technicality -= 0.2;
      style.verbosity -= 0.1;
    }

    return style;
  }

  /**
   * Formate le texte de réponse
   */
  async formatResponseText(baseResponse, style, context) {
    let response = '';

    // Introduction personnalisée
    if (context.turns.length === 0) {
      response += "Bonjour ! Je suis votre assistant ASI. ";
    }

    // Corps de la réponse basé sur le résultat de l'ASI
    if (baseResponse.fusedOutput) {
      response += this.interpretFusedOutput(baseResponse.fusedOutput, style);
    } else if (baseResponse.output) {
      response += this.interpretOutput(baseResponse.output, style);
    } else {
      response += "J'ai traité votre demande avec mes capacités d'intelligence superintelligente. ";
    }

    // Ajout d'informations sur l'apprentissage si pertinent
    if (baseResponse.knowledgeGained && baseResponse.knowledgeGained.length > 0) {
      response += `\n\n💡 J'ai appris ${baseResponse.knowledgeGained.length} nouveaux éléments grâce à notre interaction.`;
    }

    // Ajout d'informations sur les domaines utilisés
    if (baseResponse.domains && baseResponse.domains.length > 0) {
      response += `\n\n🧠 J'ai mobilisé mes expertises en: ${baseResponse.domains.join(', ')}.`;
    }

    // Ajustement du style
    response = this.adjustResponseStyle(response, style);

    return response;
  }

  /**
   * Interprète la sortie fusionnée de l'ASI
   */
  interpretFusedOutput(fusedOutput, _style) {
    // Simulation de l'interprétation - à adapter selon la vraie structure
    const confidence = fusedOutput.confidence || 0.8;
    
    let interpretation = "Basé sur mon analyse superintelligente, ";
    
    if (confidence > 0.9) {
      interpretation += "je suis très confiant que ";
    } else if (confidence > 0.7) {
      interpretation += "je pense que ";
    } else {
      interpretation += "il semble que ";
    }

    // Ajout du contenu principal (à adapter)
    interpretation += "votre demande nécessite une approche multidisciplinaire. ";

    return interpretation;
  }

  /**
   * Ajuste le style de la réponse
   */
  adjustResponseStyle(response, style) {
    // Ajustement de la formalité
    if (style.formality < 0.3) {
      response = response.replace(/vous/g, 'tu').replace(/Vous/g, 'Tu');
    }

    // Ajustement de la verbosité
    if (style.verbosity < 0.3) {
      // Simplification (implémentation basique)
      response = response.replace(/superintelligente/g, 'avancée');
    }

    return response;
  }

  /**
   * Génère une réponse vocale
   */
  async generateVoiceResponse(text, style) {
    // Simulation de la génération vocale
    // Dans une vraie implémentation, intégrer avec ElevenLabs ou similaire
    return {
      url: `/api/asi/voice/generate?text=${encodeURIComponent(text)}`,
      duration: Math.ceil(text.length / 10), // Estimation
      style: {
        speed: style.verbosity > 0.7 ? 0.9 : 1.1,
        pitch: 0.0,
        emotion: style.empathy > 0.7 ? 'warm' : 'neutral'
      }
    };
  }

  /**
   * Met à jour le contexte de conversation
   */
  updateConversationContext(userId, userMessage, response, asiResponse) {
    const context = this.conversationContexts.get(userId);
    if (!context) return;

    // Ajout du nouveau tour de conversation
    context.turns.push({
      timestamp: new Date(),
      userMessage,
      asiResponse: response.text,
      metadata: {
        domains: asiResponse.results.domains || [],
        confidence: asiResponse.results.confidence || 0.8,
        processingTime: asiResponse.processingTime || 0,
        knowledgeGained: asiResponse.knowledgeGained?.length || 0
      }
    });

    // Limitation de l'historique
    if (context.turns.length > this.config.conversationHistory) {
      context.turns.shift();
    }

    // Mise à jour des topics
    this.updateConversationTopics(context, userMessage, asiResponse);

    // Mise à jour du profil utilisateur
    this.updateUserProfile(context, userMessage, asiResponse);
  }

  /**
   * Met à jour les topics de conversation
   */
  updateConversationTopics(context, message, asiResponse) {
    const domains = asiResponse.results.domains || [];
    
    for (const domain of domains) {
      const existingTopic = context.topics.find(t => t.domain === domain);
      if (existingTopic) {
        existingTopic.count++;
        existingTopic.lastMentioned = new Date();
      } else {
        context.topics.push({
          domain,
          count: 1,
          firstMentioned: new Date(),
          lastMentioned: new Date()
        });
      }
    }
  }

  /**
   * Met à jour le profil utilisateur
   */
  updateUserProfile(context, message, asiResponse) {
    const profile = context.userProfile;
    const domains = asiResponse.results.domains || [];

    // Mise à jour des expertises perçues
    for (const domain of domains) {
      if (!profile.expertise[domain]) {
        profile.expertise[domain] = 0.1;
      } else {
        profile.expertise[domain] = Math.min(1.0, profile.expertise[domain] + 0.05);
      }
    }

    // Mise à jour du style d'apprentissage
    if (message.includes('explain') || message.includes('how')) {
      profile.learningStyle = 'explanatory';
    } else if (message.includes('example') || message.includes('show')) {
      profile.learningStyle = 'practical';
    }
  }

  /**
   * Gère les autres types de requêtes
   */
  async handleStatusRequest(_request) {
    return {
      success: true,
      status: this.asiCore.getStatus(),
      interface: {
        isActive: this.state.isActive,
        activeUsers: this.state.activeUsers.size,
        totalConversations: this.conversationContexts.size,
        metrics: this.state.metrics
      }
    };
  }

  async handleMetricsRequest(_request) {
    return {
      success: true,
      metrics: {
        ...this.state.metrics,
        asi: await this.asiCore.engines.metrics?.getMetrics?.() || {},
        conversations: this.getConversationMetrics()
      }
    };
  }

  async handleVoiceRequest(_request) {
    // Gestion des requêtes vocales
    return {
      success: true,
      message: 'Voice processing not implemented yet'
    };
  }

  async handleLearningRequest(_request) {
    // Gestion des requêtes d'apprentissage
    return {
      success: true,
      learningStatus: {
        totalKnowledge: this.asiCore.state.knowledgeBase.size,
        recentLearning: this.asiCore.state.learningHistory.slice(-10)
      }
    };
  }

  async handleFeedbackRequest(request) {
    const { userId, feedback, rating } = request;
    
    // Traitement du feedback utilisateur
    this.processFeedback(userId, feedback, rating);
    
    return {
      success: true,
      message: 'Feedback reçu et traité'
    };
  }

  /**
   * Traite le feedback utilisateur
   */
  processFeedback(userId, feedback, rating) {
    // Mise à jour des métriques de satisfaction
    this.state.metrics.userSatisfaction = 
      (this.state.metrics.userSatisfaction * 0.9) + (rating * 0.1);

    // Apprentissage à partir du feedback
    if (this.asiCore.engines.autoSupervision) {
      this.asiCore.engines.autoSupervision.processFeedback({
        userId,
        feedback,
        rating,
        timestamp: new Date()
      });
    }

    logger.info(`📝 Feedback reçu de ${userId}: ${rating}/5 - ${feedback}`);
  }

  /**
   * Démarre la collecte de métriques
   */
  startMetricsCollection() {
    if (!this.config.enableMetrics) return;

    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Toutes les minutes
  }

  /**
   * Collecte les métriques
   */
  collectMetrics() {
    // Mise à jour des métriques d'interface
    this.state.metrics.totalInteractions = this.getTotalInteractions();
    this.state.metrics.learningProgress = this.calculateLearningProgress();

    // Émission des métriques
    this.emit('metrics_updated', this.state.metrics);
  }

  /**
   * Démarre le gestionnaire de conversations
   */
  startConversationManager() {
    setInterval(() => {
      this.cleanupInactiveConversations();
    }, 300000); // Toutes les 5 minutes
  }

  /**
   * Nettoie les conversations inactives
   */
  cleanupInactiveConversations() {
    const now = Date.now();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [userId, context] of this.conversationContexts) {
      const lastActivity = context.turns.length > 0 ? 
        new Date(context.turns[context.turns.length - 1].timestamp).getTime() :
        context.startTime.getTime();

      if (now - lastActivity > inactivityThreshold) {
        this.conversationContexts.delete(userId);
        this.state.activeUsers.delete(userId);
        logger.info(`🧹 Conversation inactive nettoyée pour l'utilisateur ${userId}`);
      }
    }
  }

  /**
   * Gère la completion de tâche
   */
  handleTaskCompletion(data) {
    this.emit('task_completed', data);
  }

  /**
   * Notifie les utilisateurs des améliorations
   */
  notifyUsersOfImprovement(improvement) {
    // Notification en temps réel aux utilisateurs actifs
    for (const userId of this.state.activeUsers) {
      this.emit('improvement_notification', {
        userId,
        improvement,
        timestamp: new Date()
      });
    }
  }

  /**
   * Gère les alertes de sécurité
   */
  handleSafetyAlert(alert) {
    logger.warn('🚨 Alerte de sécurité reçue:', alert);
    
    // Notification immédiate aux administrateurs
    this.emit('safety_alert', alert);
    
    // Actions automatiques si nécessaire
    if (alert.severity === 'critical') {
      this.handleCriticalSafetyAlert(alert);
    }
  }

  /**
   * Gère les alertes critiques
   */
  handleCriticalSafetyAlert(alert) {
    // Mesures d'urgence
    logger.error('🛑 Alerte de sécurité critique - Mesures d\'urgence activées');
    
    // Notification à tous les utilisateurs
    for (const userId of this.state.activeUsers) {
      this.emit('critical_alert', {
        userId,
        message: 'Mesures de sécurité activées temporairement',
        alert
      });
    }
  }

  /**
   * Méthodes utilitaires
   */
  generateFallbackResponse(_message) {
    return "Je rencontre actuellement des difficultés pour traiter votre demande. Pouvez-vous reformuler ou réessayer dans quelques instants ?";
  }

  updateMetrics(responseTime, _success) {
    this.state.metrics.totalInteractions++;
    
    // Mise à jour du temps de réponse moyen
    this.state.metrics.averageResponseTime = 
      (this.state.metrics.averageResponseTime * 0.9) + (responseTime * 0.1);
  }

  getTotalInteractions() {
    return Array.from(this.conversationContexts.values())
      .reduce((total, context) => total + context.turns.length, 0);
  }

  calculateLearningProgress() {
    return this.asiCore.state.performanceMetrics.learningEfficiency || 0;
  }

  getConversationMetrics() {
    const contexts = Array.from(this.conversationContexts.values());
    
    return {
      totalConversations: contexts.length,
      averageTurnsPerConversation: contexts.length > 0 ? 
        contexts.reduce((sum, c) => sum + c.turns.length, 0) / contexts.length : 0,
      activeUsers: this.state.activeUsers.size,
      topTopics: this.getTopTopics(contexts)
    };
  }

  getTopTopics(contexts) {
    const topicCounts = new Map();
    
    for (const context of contexts) {
      for (const topic of context.topics) {
        topicCounts.set(topic.domain, (topicCounts.get(topic.domain) || 0) + topic.count);
      }
    }
    
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));
  }

  identifyResponseAdaptations(_baseResponse, _context) {
    return []; // À implémenter selon les besoins
  }

  interpretOutput(_output, _style) {
    return "J'ai analysé votre demande et voici ma réponse basée sur mes capacités d'IA avancée.";
  }

  /**
   * Arrête l'interface
   */
  async shutdown() {
    logger.info('🔄 Arrêt de l\'interface ASI...');
    
    this.state.isActive = false;
    await this.asiCore.shutdown();
    
    logger.info('✅ Interface ASI arrêtée');
    this.emit('interface_shutdown');
  }
}

export default ASIInterface; 