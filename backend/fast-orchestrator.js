/**
 * PRISM Fast Orchestrator - Version Optimisée Performance
 * Optimisations spécifiques pour réduire latence chat vocal
 */

import OpenAI from 'openai';
import { VoicePersonalityEnhancer } from './voicePersonalityEnhancer.js';
import { performanceOptimizer } from './performance-optimizer.js';

// Configuration optimisée
const FAST_CONFIG = {
  MAX_TOKENS_SIMPLE: 300,
  MAX_TOKENS_COMPLEX: 600,
  TEMPERATURE_FAST: 0.1,
  SKIP_CONTEXT_THRESHOLD: 10, // mots
  CACHE_TTL: 300000, // 5 minutes
  PARALLEL_PROCESSING: true
};

// Cache optimisé
const fastCache = new Map();
const contextCache = new Map();

// Initialisation rapide
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export class FastOrchestrator {
  constructor() {
    this.voiceEnhancer = new VoicePersonalityEnhancer();
  }

  async handleFastInstruction(userInput, options = {}) {
    const timer = performanceOptimizer.startTimer('apiCalls');
    const startTime = Date.now();

    try {
      // 1. Analyse rapide du message
      const analysis = this.analyzeMessageFast(userInput);
      
      // 2. Décision cache vs API
      const cacheKey = this.generateCacheKey(userInput, analysis.type);
      if (fastCache.has(cacheKey) && !options.bypassCache) {
        const cached = fastCache.get(cacheKey);
        if (Date.now() - cached.timestamp < FAST_CONFIG.CACHE_TTL) {
          timer.end();
          return this.formatResponse(cached.data, true, Date.now() - startTime);
        }
      }

      // 3. Configuration optimisée selon le type
      const config = this.getOptimizedConfig(analysis);
      
      // 4. Appel API optimisé
      let response;
      if (FAST_CONFIG.PARALLEL_PROCESSING && analysis.requiresVoice) {
        // Traitement parallèle réponse + préparation audio
        response = await this.processWithParallelVoice(userInput, config, analysis);
      } else {
        response = await this.processStandard(userInput, config, analysis);
      }

      // 5. Cache et retour
      fastCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });

      timer.end();
      return this.formatResponse(response, false, Date.now() - startTime);

    } catch (error) {
      timer.end();
      throw error;
    }
  }

  analyzeMessageFast(userInput) {
    const words = userInput.trim().split(/\s+/);
    const length = words.length;
    
    return {
      type: length <= FAST_CONFIG.SKIP_CONTEXT_THRESHOLD ? 'simple' : 'complex',
      length,
      skipContext: length <= FAST_CONFIG.SKIP_CONTEXT_THRESHOLD,
      requiresVoice: true, // Toujours pour chat vocal
      priority: this.determinePriority(userInput)
    };
  }

  determinePriority(userInput) {
    const urgentKeywords = ['urgent', 'rapide', 'vite', 'maintenant', 'help', 'problème'];
    const hasUrgent = urgentKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );
    return hasUrgent ? 'high' : 'normal';
  }

  getOptimizedConfig(analysis) {
    if (analysis.type === 'simple') {
      return {
        maxTokens: FAST_CONFIG.MAX_TOKENS_SIMPLE,
        temperature: FAST_CONFIG.TEMPERATURE_FAST,
        skipContext: true,
        model: 'gpt-3.5-turbo', // Plus rapide pour requêtes simples
        streamResponse: false
      };
    } else {
      return {
        maxTokens: FAST_CONFIG.MAX_TOKENS_COMPLEX,
        temperature: 0.3,
        skipContext: false,
        model: process.env.OPENAI_MODEL || 'gpt-4.1',
        streamResponse: false
      };
    }
  }

  async processStandard(userInput, config, analysis) {
    // Contexte optimisé
    let systemPrompt = this.getOptimizedPrompt(analysis.type);
    
    if (!config.skipContext) {
      const contextTimer = performanceOptimizer.startTimer('contextLoading');
      const context = await this.loadFastContext();
      contextTimer.end();
      
      if (context) {
        systemPrompt += `\n\nContexte récent: ${context}`;
      }
    }

    // Appel API optimisé
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature
    });

    const content = completion.choices[0].message.content;
    
    // Enrichissement vocal rapide
    const enhanced = this.voiceEnhancer.quickEnhance(content, analysis.type);
    
    return {
      content: enhanced.text || content,
      voiceConfig: enhanced.voiceConfig,
      model: config.model,
      tokensUsed: completion.usage?.total_tokens || 0
    };
  }

  async processWithParallelVoice(userInput, config, analysis) {
    // Démarrer traitement réponse et préparation audio en parallèle
    const [response, voicePrep] = await Promise.all([
      this.processStandard(userInput, config, analysis),
      this.prepareVoiceSettings(userInput, analysis)
    ]);

    // Fusionner résultats
    return {
      ...response,
      voiceConfig: { ...response.voiceConfig, ...voicePrep },
      parallelProcessed: true
    };
  }

  async prepareVoiceSettings(userInput, analysis) {
    // Préparation rapide des paramètres vocaux
    return {
      speed: analysis.priority === 'high' ? 1.1 : 1.0,
      emotion: this.detectEmotion(userInput),
      style: analysis.type === 'simple' ? 'casual' : 'professional'
    };
  }

  detectEmotion(userInput) {
    const emotions = {
      happy: ['super', 'génial', 'parfait', 'excellent', 'merci'],
      urgent: ['urgent', 'vite', 'rapide', 'aide', 'problème'],
      neutral: ['ok', 'bien', 'oui', 'non']
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
        return emotion;
      }
    }
    return 'neutral';
  }

  async loadFastContext() {
    // Cache contexte en mémoire
    const cacheKey = 'recent_context';
    if (contextCache.has(cacheKey)) {
      const cached = contextCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute TTL
        return cached.data;
      }
    }

    // Contexte minimal et rapide
    const context = "Session active"; // Contexte simplifié
    contextCache.set(cacheKey, {
      data: context,
      timestamp: Date.now()
    });

    return context;
  }

  getOptimizedPrompt(type) {
    if (type === 'simple') {
      return `Tu es PRISM, assistant IA rapide et efficace. Réponds de manière concise et naturelle.`;
    } else {
      return `Tu es PRISM, système d'IA avancé. Réponds de manière structurée et professionnelle avec une personnalité engageante.`;
    }
  }

  generateCacheKey(userInput, type) {
    // Hash simple pour le cache
    return `${type}_${userInput.length}_${userInput.substring(0, 20)}`;
  }

  formatResponse(data, fromCache, responseTime) {
    return {
      data,
      metadata: {
        cached: fromCache,
        responseTime,
        optimized: true,
        success: true
      }
    };
  }

  // Méthodes de nettoyage cache
  clearCache() {
    fastCache.clear();
    contextCache.clear();
  }

  getCacheStats() {
    return {
      fastCache: fastCache.size,
      contextCache: contextCache.size,
      totalMemory: this.estimateMemoryUsage()
    };
  }

  estimateMemoryUsage() {
    let size = 0;
    for (const [key, value] of fastCache) {
      size += JSON.stringify({key, value}).length;
    }
    return `${Math.round(size / 1024)}KB`;
  }
}

// Instance globale
export const fastOrchestrator = new FastOrchestrator(); 