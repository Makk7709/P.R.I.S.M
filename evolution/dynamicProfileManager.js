import winston from 'winston';
import { EventEmitter } from 'node:events';
import natural from 'natural';
const { TfIdf } = natural;

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'logs/profile-manager.log' }),
    new winston.transports.Console(),
  ],
});

class TaskCategory {
  static RESEARCH = 'research';
  static ANALYSIS = 'analysis';
  static GENERATION = 'generation';
  static ETHICAL = 'ethical';
  static STRATEGIC = 'strategic';
  static TECHNICAL = 'technical';
  static CREATIVE = 'creative';
  static FACTUAL = 'factual';
}

class UserType {
  static DEVELOPER = 'developer';
  static RESEARCHER = 'researcher';
  static BUSINESS = 'business';
  static GENERAL = 'general';
  static TECHNICAL = 'technical';
  static CREATIVE = 'creative';
}

class DynamicProfileManager extends EventEmitter {
  constructor() {
    super();
    this.profiles = new Map();
    this.history = [];
    this.learningRate = 0.1;
    this.maxHistorySize = 1000;
    this.tfidf = new TfIdf();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  createProfile(userId, initialContext = {}) {
    const profile = {
      userId,
      taskPreferences: {},
      expectedKeywords: new Set(),
      performanceMetrics: {
        successRate: 0,
        averageResponseTime: 0,
        qualityScore: 0,
        accuracyScore: 0,
        relevanceScore: 0,
        consistencyScore: 0,
      },
      lastUpdated: new Date(),
      context: {
        userType: initialContext.userType || UserType.GENERAL,
        preferredProviders: initialContext.preferredProviders || [],
        costSensitivity: initialContext.costSensitivity || 'medium',
        responseTimeRequirement: initialContext.responseTimeRequirement || 'standard',
        truthfulnessRequirement: initialContext.truthfulnessRequirement || 'standard',
        complexity: initialContext.complexity || 'medium',
        domain: initialContext.domain || 'general',
        learningStyle: initialContext.learningStyle || 'balanced',
        interactionPattern: initialContext.interactionPattern || 'standard',
      },
      behavioralPatterns: {
        taskFrequency: {},
        timeOfDay: {},
        sessionDuration: [],
        errorPatterns: [],
        successPatterns: [],
      },
      knowledgeBase: {
        topics: new Set(),
        expertise: {},
        gaps: new Set(),
      },
    };

    this.profiles.set(userId, profile);
    logger.info(`Created new profile for user ${userId}`);
    return profile;
  }

  getProfile(userId) {
    return this.profiles.get(userId) || this.createProfile(userId);
  }

  updateProfile(userId, taskResult) {
    const profile = this.getProfile(userId);
    const taskCategory = this.determineTaskCategory(taskResult.taskDescription);

    // Update task preferences
    if (!profile.taskPreferences[taskCategory]) {
      profile.taskPreferences[taskCategory] = {
        count: 0,
        successRate: 0,
        averageResponseTime: 0,
        complexity: 0,
        domainExpertise: 0,
      };
    }

    const taskPrefs = profile.taskPreferences[taskCategory];
    taskPrefs.count++;
    taskPrefs.successRate =
      (taskPrefs.successRate * (taskPrefs.count - 1) + (taskResult.success ? 1 : 0)) /
      taskPrefs.count;
    taskPrefs.averageResponseTime =
      (taskPrefs.averageResponseTime * (taskPrefs.count - 1) + taskResult.responseTime) /
      taskPrefs.count;

    // Update expected keywords and knowledge base
    this.updateExpectedKeywords(profile, taskResult);
    this.updateKnowledgeBase(profile, taskResult);

    // Update performance metrics
    this.updatePerformanceMetrics(profile, taskResult);

    // Update context and behavioral patterns
    this.updateContext(profile, taskResult);
    this.updateBehavioralPatterns(profile, taskResult);

    profile.lastUpdated = new Date();
    this.history.push({
      timestamp: new Date(),
      userId,
      taskCategory,
      result: taskResult,
    });

    this.trimHistory();
    this.emit('profileUpdated', { userId, profile });
    logger.info(`Updated profile for user ${userId}`);

    return profile;
  }

  determineTaskCategory(taskDescription) {
    const description = taskDescription.toLowerCase();

    if (description.match(/\b(research|find|search|look up)\b/)) {
      return TaskCategory.RESEARCH;
    } else if (description.match(/\b(analyze|evaluate|assess)\b/)) {
      return TaskCategory.ANALYSIS;
    } else if (description.match(/\b(generate|create|write)\b/)) {
      return TaskCategory.GENERATION;
    } else if (description.match(/\b(ethical|moral|right)\b/)) {
      return TaskCategory.ETHICAL;
    } else if (description.match(/\b(strategy|plan|tactical)\b/)) {
      return TaskCategory.STRATEGIC;
    } else if (description.match(/\b(technical|code|programming|algorithm)\b/)) {
      return TaskCategory.TECHNICAL;
    } else if (description.match(/\b(creative|artistic|design)\b/)) {
      return TaskCategory.CREATIVE;
    } else if (description.match(/\b(fact|truth|accurate|precise)\b/)) {
      return TaskCategory.FACTUAL;
    }

    return TaskCategory.ANALYSIS;
  }

  updateExpectedKeywords(profile, taskResult) {
    if (taskResult.success) {
      // Extract keywords using TF-IDF
      const tokens = this.tokenizer.tokenize(taskResult.response);
      const stemmedTokens = tokens.map((token) => this.stemmer.stem(token));

      this.tfidf.addDocument(stemmedTokens);

      // Get top keywords
      const keywords = this.tfidf
        .listTerms(0)
        .slice(0, 10)
        .map((term) => term.term);

      keywords.forEach((keyword) => profile.expectedKeywords.add(keyword));
    }
  }

  updateKnowledgeBase(profile, taskResult) {
    const { knowledgeBase } = profile;

    // Extract topics from the task and response
    const taskTopics = this.extractTopics(taskResult.taskDescription);
    const responseTopics = this.extractTopics(taskResult.response);

    // Update topics
    [...taskTopics, ...responseTopics].forEach((topic) => {
      knowledgeBase.topics.add(topic);
    });

    // Update expertise levels
    taskTopics.forEach((topic) => {
      if (!knowledgeBase.expertise[topic]) {
        knowledgeBase.expertise[topic] = 0;
      }
      knowledgeBase.expertise[topic] += taskResult.success ? 0.1 : -0.05;
    });

    // Identify knowledge gaps
    if (!taskResult.success) {
      taskTopics.forEach((topic) => {
        if (knowledgeBase.expertise[topic] < 0.3) {
          knowledgeBase.gaps.add(topic);
        }
      });
    }
  }

  extractTopics(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'with',
      'by',
    ]);

    return tokens
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .map((word) => this.stemmer.stem(word));
  }

  updatePerformanceMetrics(profile, taskResult) {
    const metrics = profile.performanceMetrics;

    // Update success rate
    metrics.successRate =
      (metrics.successRate * (metrics.successRate > 0 ? 1 : 0) + (taskResult.success ? 1 : 0)) / 2;

    // Update average response time
    metrics.averageResponseTime =
      (metrics.averageResponseTime * (metrics.averageResponseTime > 0 ? 1 : 0) +
        taskResult.responseTime) /
      2;

    // Calculate and update quality scores
    const qualityScores = this.calculateQualityScores(taskResult);
    metrics.qualityScore =
      (metrics.qualityScore * (metrics.qualityScore > 0 ? 1 : 0) + qualityScores.quality) / 2;
    metrics.accuracyScore =
      (metrics.accuracyScore * (metrics.accuracyScore > 0 ? 1 : 0) + qualityScores.accuracy) / 2;
    metrics.relevanceScore =
      (metrics.relevanceScore * (metrics.relevanceScore > 0 ? 1 : 0) + qualityScores.relevance) / 2;
    metrics.consistencyScore =
      (metrics.consistencyScore * (metrics.consistencyScore > 0 ? 1 : 0) +
        qualityScores.consistency) /
      2;
  }

  calculateQualityScores(taskResult) {
    const baseScore = 100;
    const responseTimePenalty = Math.min(taskResult.responseTime / 1000, 10);
    const successBonus = taskResult.success ? 10 : -20;

    return {
      quality: baseScore - responseTimePenalty + successBonus,
      accuracy: taskResult.success ? 90 : 50,
      relevance: taskResult.success ? 85 : 60,
      consistency: taskResult.success ? 80 : 55,
    };
  }

  updateContext(profile, taskResult) {
    const context = profile.context;

    // Adjust cost sensitivity based on response time and success
    if (taskResult.responseTime > 5000 || !taskResult.success) {
      context.costSensitivity = 'low';
    } else if (taskResult.responseTime < 1000 && taskResult.success) {
      context.costSensitivity = 'high';
    }

    // Adjust response time requirement based on success rate
    if (profile.performanceMetrics.successRate > 0.8) {
      context.responseTimeRequirement = 'fast';
    } else if (profile.performanceMetrics.successRate < 0.5) {
      context.responseTimeRequirement = 'standard';
    }

    // Adjust truthfulness requirement based on quality score
    if (profile.performanceMetrics.qualityScore > 90) {
      context.truthfulnessRequirement = 'high';
    } else if (profile.performanceMetrics.qualityScore < 70) {
      context.truthfulnessRequirement = 'standard';
    }

    // Adjust complexity based on task success
    if (taskResult.success) {
      context.complexity = 'high';
    } else {
      context.complexity = 'medium';
    }

    // Update learning style based on performance
    if (profile.performanceMetrics.successRate > 0.7) {
      context.learningStyle = 'advanced';
    } else if (profile.performanceMetrics.successRate < 0.3) {
      context.learningStyle = 'basic';
    }
  }

  updateBehavioralPatterns(profile, taskResult) {
    const patterns = profile.behavioralPatterns;
    const now = new Date();

    // Update task frequency
    const taskCategory = this.determineTaskCategory(taskResult.taskDescription);
    patterns.taskFrequency[taskCategory] = (patterns.taskFrequency[taskCategory] || 0) + 1;

    // Update time of day patterns
    const hour = now.getHours();
    patterns.timeOfDay[hour] = (patterns.timeOfDay[hour] || 0) + 1;

    // Update session duration
    patterns.sessionDuration.push(taskResult.responseTime);

    // Update error and success patterns
    if (taskResult.success) {
      patterns.successPatterns.push({
        timestamp: now,
        taskCategory,
        responseTime: taskResult.responseTime,
      });
    } else {
      patterns.errorPatterns.push({
        timestamp: now,
        taskCategory,
        error: taskResult.error,
      });
    }
  }

  trimHistory() {
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  getAdaptiveContext(userId, taskDescription) {
    const profile = this.getProfile(userId);
    const taskCategory = this.determineTaskCategory(taskDescription);

    return {
      ...profile.context,
      taskCategory,
      expectedKeywords: Array.from(profile.expectedKeywords),
      taskPreferences: profile.taskPreferences[taskCategory] || {
        count: 0,
        successRate: 0,
        averageResponseTime: 0,
        complexity: 0,
        domainExpertise: 0,
      },
      knowledgeBase: {
        topics: Array.from(profile.knowledgeBase.topics),
        expertise: profile.knowledgeBase.expertise,
        gaps: Array.from(profile.knowledgeBase.gaps),
      },
      behavioralPatterns: {
        taskFrequency: profile.behavioralPatterns.taskFrequency,
        timeOfDay: profile.behavioralPatterns.timeOfDay,
        averageSessionDuration: this.calculateAverageSessionDuration(profile),
      },
    };
  }

  calculateAverageSessionDuration(profile) {
    const durations = profile.behavioralPatterns.sessionDuration;
    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }
}

export { DynamicProfileManager, TaskCategory, UserType };
