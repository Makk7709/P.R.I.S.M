const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');
const { EventEmitter } = require('events');
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/orchestration.log' }),
    new winston.transports.Console()
  ]
});

class TaskType {
  static RESEARCH = 'research';
  static ANALYSIS = 'analysis';
  static GENERATION = 'generation';
  static ETHICAL = 'ethical';
  static STRATEGIC = 'strategic';
  static CREATIVE = 'creative';
  static TECHNICAL = 'technical';
  static FACTUAL = 'factual';
}

class AIProvider {
  static OPENAI = 'openai';
  static CLAUDE = 'claude';
  static PERPLEXITY = 'perplexity';
}

class TaskContext {
  constructor({
    taskType,
    requiresAccuracy = false,
    requiresCreativity = false,
    requiresEthicalJudgment = false,
    requiresStrategicThinking = false,
    requiresTechnicalKnowledge = false,
    requiresFactualAccuracy = false,
    maxTokens = null,
    temperature = 0.7,
    costSensitivity = 'medium',
    responseTimeRequirement = 'standard',
    truthfulnessRequirement = 'standard',
    complexity = 'medium',
    domain = 'general'
  }) {
    this.taskType = taskType;
    this.requiresAccuracy = requiresAccuracy;
    this.requiresCreativity = requiresCreativity;
    this.requiresEthicalJudgment = requiresEthicalJudgment;
    this.requiresStrategicThinking = requiresStrategicThinking;
    this.requiresTechnicalKnowledge = requiresTechnicalKnowledge;
    this.requiresFactualAccuracy = requiresFactualAccuracy;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
    this.costSensitivity = costSensitivity;
    this.responseTimeRequirement = responseTimeRequirement;
    this.truthfulnessRequirement = truthfulnessRequirement;
    this.complexity = complexity;
    this.domain = domain;
  }
}

class AgentRouter extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.providers = {
      [AIProvider.OPENAI]: new OpenAI({ ...config.openai, dangerouslyAllowBrowser: true }),
      [AIProvider.CLAUDE]: new Anthropic(config.anthropic),
      [AIProvider.PERPLEXITY]: new Perplexity(config.perplexity)
    };
    
    this.providerMetrics = {
      [AIProvider.OPENAI]: { success: 0, failure: 0, avgResponseTime: 0, cost: 0 },
      [AIProvider.CLAUDE]: { success: 0, failure: 0, avgResponseTime: 0, cost: 0 },
      [AIProvider.PERPLEXITY]: { success: 0, failure: 0, avgResponseTime: 0, cost: 0 }
    };

    this.providerWeights = {
      [AIProvider.OPENAI]: {
        [TaskType.RESEARCH]: 0.7,
        [TaskType.ANALYSIS]: 0.8,
        [TaskType.GENERATION]: 0.9,
        [TaskType.ETHICAL]: 0.6,
        [TaskType.STRATEGIC]: 0.7,
        [TaskType.CREATIVE]: 0.9,
        [TaskType.TECHNICAL]: 0.8,
        [TaskType.FACTUAL]: 0.7
      },
      [AIProvider.CLAUDE]: {
        [TaskType.RESEARCH]: 0.8,
        [TaskType.ANALYSIS]: 0.9,
        [TaskType.GENERATION]: 0.8,
        [TaskType.ETHICAL]: 0.9,
        [TaskType.STRATEGIC]: 0.9,
        [TaskType.CREATIVE]: 0.8,
        [TaskType.TECHNICAL]: 0.7,
        [TaskType.FACTUAL]: 0.8
      },
      [AIProvider.PERPLEXITY]: {
        [TaskType.RESEARCH]: 0.9,
        [TaskType.ANALYSIS]: 0.7,
        [TaskType.GENERATION]: 0.6,
        [TaskType.ETHICAL]: 0.7,
        [TaskType.STRATEGIC]: 0.6,
        [TaskType.CREATIVE]: 0.5,
        [TaskType.TECHNICAL]: 0.8,
        [TaskType.FACTUAL]: 0.9
      }
    };

    this.domainExpertise = {
      [AIProvider.OPENAI]: ['general', 'technical', 'creative'],
      [AIProvider.CLAUDE]: ['general', 'ethical', 'strategic'],
      [AIProvider.PERPLEXITY]: ['factual', 'research', 'technical']
    };
  }

  determineTaskType(taskDescription) {
    const description = taskDescription.toLowerCase();
    
    if (description.match(/\b(research|find|search|look up)\b/)) {
      return TaskType.RESEARCH;
    } else if (description.match(/\b(analyze|evaluate|assess)\b/)) {
      return TaskType.ANALYSIS;
    } else if (description.match(/\b(generate|create|write)\b/)) {
      return TaskType.GENERATION;
    } else if (description.match(/\b(ethical|moral|right)\b/)) {
      return TaskType.ETHICAL;
    } else if (description.match(/\b(strategy|plan|tactical)\b/)) {
      return TaskType.STRATEGIC;
    } else if (description.match(/\b(creative|artistic|design)\b/)) {
      return TaskType.CREATIVE;
    } else if (description.match(/\b(technical|code|programming|algorithm)\b/)) {
      return TaskType.TECHNICAL;
    } else if (description.match(/\b(fact|truth|accurate|precise)\b/)) {
      return TaskType.FACTUAL;
    }
    
    return TaskType.ANALYSIS;
  }

  calculateProviderScore(provider, context) {
    let score = this.providerWeights[provider][context.taskType];
    
    // Adjust for cost sensitivity
    if (context.costSensitivity === 'high') {
      const costMultiplier = {
        [AIProvider.OPENAI]: 0.8,
        [AIProvider.CLAUDE]: 0.7,
        [AIProvider.PERPLEXITY]: 0.9
      };
      score *= costMultiplier[provider];
    }
    
    // Adjust for response time requirements
    if (context.responseTimeRequirement === 'fast') {
      const speedMultiplier = {
        [AIProvider.OPENAI]: 1.2,
        [AIProvider.CLAUDE]: 0.9,
        [AIProvider.PERPLEXITY]: 1.1
      };
      score *= speedMultiplier[provider];
    }
    
    // Adjust for truthfulness requirements
    if (context.truthfulnessRequirement === 'high') {
      const truthMultiplier = {
        [AIProvider.OPENAI]: 0.9,
        [AIProvider.CLAUDE]: 1.2,
        [AIProvider.PERPLEXITY]: 1.1
      };
      score *= truthMultiplier[provider];
    }
    
    // Adjust for domain expertise
    if (this.domainExpertise[provider].includes(context.domain)) {
      score *= 1.2;
    }
    
    // Adjust for specific task requirements
    if (context.requiresAccuracy && provider === AIProvider.PERPLEXITY) {
      score *= 1.2;
    }
    if (context.requiresCreativity && provider === AIProvider.OPENAI) {
      score *= 1.2;
    }
    if (context.requiresEthicalJudgment && provider === AIProvider.CLAUDE) {
      score *= 1.2;
    }
    if (context.requiresTechnicalKnowledge && provider === AIProvider.PERPLEXITY) {
      score *= 1.2;
    }
    if (context.requiresFactualAccuracy && provider === AIProvider.PERPLEXITY) {
      score *= 1.2;
    }
    
    // Adjust for complexity
    if (context.complexity === 'high' && provider === AIProvider.CLAUDE) {
      score *= 1.2;
    }
    
    return score;
  }

  async selectProvider(context) {
    const scores = {};
    for (const provider of Object.values(AIProvider)) {
      scores[provider] = this.calculateProviderScore(provider, context);
    }
    
    const selectedProvider = Object.entries(scores)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];
    
    logger.info(`Selected provider ${selectedProvider} for task type ${context.taskType}`);
    return selectedProvider;
  }

  async callProvider(provider, taskDescription, context) {
    const startTime = Date.now();
    try {
      let response;
      switch (provider) {
        case AIProvider.OPENAI:
          response = await this.providers[provider].chat.completions.create({
            messages: [{ role: 'user', content: taskDescription }],
            max_tokens: context.maxTokens,
            temperature: context.temperature
          });
          break;
        case AIProvider.CLAUDE:
          response = await this.providers[provider].messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: context.maxTokens,
            temperature: context.temperature,
            messages: [{ role: 'user', content: taskDescription }]
          });
          break;
        case AIProvider.PERPLEXITY:
          response = await this.providers[provider].chat.completions.create({
            model: 'pplx-7b-online',
            max_tokens: context.maxTokens,
            temperature: context.temperature,
            messages: [{ role: 'user', content: taskDescription }]
          });
          break;
      }
      
      const responseTime = Date.now() - startTime;
      this.updateProviderMetrics(provider, true, responseTime);
      
      this.emit('providerResponse', {
        provider,
        taskType: context.taskType,
        responseTime,
        success: true,
        domain: context.domain,
        complexity: context.complexity
      });
      
      return response;
    } catch (error) {
      logger.error(`Error calling ${provider}: ${error.message}`);
      this.updateProviderMetrics(provider, false);
      return this.handleFallback(taskDescription, context);
    }
  }

  updateProviderMetrics(provider, success, responseTime = 0) {
    const metrics = this.providerMetrics[provider];
    if (success) {
      metrics.success++;
      metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.success - 1) + responseTime) / metrics.success;
    } else {
      metrics.failure++;
    }
  }

  async handleFallback(taskDescription, context) {
    logger.warn('Attempting fallback call');
    const fallbackProviders = Object.values(AIProvider).filter(p => p !== context.lastProvider);
    
    for (const provider of fallbackProviders) {
      try {
        const response = await this.callProvider(provider, taskDescription, context);
        if (response) {
          logger.info(`Fallback to ${provider} successful`);
          return response;
        }
      } catch (error) {
        logger.error(`Fallback to ${provider} failed: ${error.message}`);
      }
    }
    
    throw new Error('All providers failed');
  }

  async routeTask(taskDescription, contextParams) {
    const taskType = this.determineTaskType(taskDescription);
    const context = new TaskContext({
      taskType,
      ...contextParams
    });
    
    const selectedProvider = await this.selectProvider(context);
    return this.callProvider(selectedProvider, taskDescription, context);
  }

  getProviderMetrics() {
    return this.providerMetrics;
  }
}

module.exports = {
  AgentRouter,
  TaskType,
  AIProvider,
  TaskContext
}; 