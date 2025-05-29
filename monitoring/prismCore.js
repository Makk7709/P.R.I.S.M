import kernelBus from '../core/KernelBus.js';
import { PrismMemento } from './prismMemento.js';
import { PrismSentientPulse } from './prismSentientPulse.js';
import PrismEmotion from './prismAuroraConsciousness.js';
import PrismAdaptation from './prismAdaptation.js';
import PrismRegulation from './prismRegulation.js';
import PrismStrategy from './prismStrategy.js';
import PrismSelfOptimization from './prismSelfOptimization.js';
import logger from './prismLogger.js';
import metrics from './coreMetrics.js';
import performanceMonitor from './prismPerformanceMonitor.js';

class PrismCore {
  constructor() {
    this.modules = {
      memento: new PrismMemento(),
      sentience: new PrismSentientPulse(),
      emotion: new PrismEmotion(),
      adaptation: new PrismAdaptation(),
      regulation: new PrismRegulation(),
      strategy: new PrismStrategy(),
      selfOptimization: new PrismSelfOptimization()
    };

    this.eventQueue = [];
    this.maxQueueSize = 500;
    this.batchSize = 10;
    this.isProcessing = false;
    this.retryCount = 0;
    this.maxRetries = 1;

    this.initializeEventListeners();
    this.startCoreCycle();
    this.startMetricsReporting();
  }

  initializeEventListeners() {
    // Core event flow with error handling and metrics
    kernelBus.on('prism:insights:new', (data) => {
      this.handleEvent('prism:insights:new', data, () => {
        this.modules.sentience.processInsights(data);
      });
    });

    kernelBus.on('prism:sentience:processed', (data) => {
      this.handleEvent('prism:sentience:processed', data, () => {
        this.modules.emotion.processSentience(data);
      });
    });

    kernelBus.on('prism:emotion:processed', (data) => {
      this.handleEvent('prism:emotion:processed', data, () => {
        this.modules.adaptation.processEmotion(data);
      });
    });

    kernelBus.on('prism:adaptation:processed', (data) => {
      this.handleEvent('prism:adaptation:processed', data, () => {
        this.modules.regulation.processAdaptation(data);
      });
    });

    kernelBus.on('prism:regulation:processed', (data) => {
      this.handleEvent('prism:regulation:processed', data, () => {
        this.modules.strategy.processRegulation(data);
      });
    });

    kernelBus.on('prism:strategy:processed', (data) => {
      this.handleEvent('prism:strategy:processed', data, () => {
        this.modules.selfOptimization.processStrategy(data);
      });
    });

    kernelBus.on('prism:self_optimization:processed', (data) => {
      this.handleEvent('prism:self_optimization:processed', data, () => {
        this.modules.memento.storeOptimization(data);
      });
    });
  }

  async handleEvent(eventName, data, handler) {
    metrics.recordEventReceived();
    kernelBus.emit('prism:core:event:start', eventName);
    
    if (this.eventQueue.length >= this.maxQueueSize) {
      logger.warn('Event queue overflow', { eventName, queueSize: this.eventQueue.length });
      kernelBus.emit('prism:core:overload', { eventName, timestamp: Date.now() });
      return;
    }

    this.eventQueue.push({ eventName, data, handler });
    
    if (!this.isProcessing) {
      this.processEventQueue();
    }
  }

  async processEventQueue() {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      const batch = this.eventQueue.splice(0, this.batchSize);
      
      for (const { eventName, data, handler } of batch) {
        try {
          kernelBus.emit('prism:core:module:start', 'eventProcessor');
          await handler();
          kernelBus.emit('prism:core:module:end', 'eventProcessor');
          metrics.recordEventEmitted();
        } catch (error) {
          metrics.recordError();
          logger.error(`Error processing event ${eventName}`, { error, data });
          
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.eventQueue.unshift({ eventName, data, handler });
          } else {
            kernelBus.emit('prism:core:failure', {
              eventName,
              error: error.message,
              timestamp: Date.now()
            });
          }
        }
      }
    } finally {
      this.isProcessing = false;
      this.retryCount = 0;
      
      const duration = Date.now() - startTime;
      metrics.recordCycleDuration(duration);
      kernelBus.emit('prism:core:event:end', 'batchProcessing');
      
      if (this.eventQueue.length > 0) {
        setTimeout(() => this.processEventQueue(), 0);
      }
    }
  }

  async initialize() {
    try {
      // Initialize each module in the correct order
      for (const [name, module] of Object.entries(this.modules)) {
        if (typeof module.initialize === 'function') {
          await module.initialize();
          logger.info(`Module initialized`, { module: name });
        }
      }

      // Emit core initialization complete event
      kernelBus.emit('prism:core:initialized', {
        timestamp: Date.now(),
        modules: Object.keys(this.modules)
      });
      
      logger.info('Core cycle started successfully');
    } catch (error) {
      logger.error('Failed to start core cycle', { error });
      throw error;
    }
  }

  startCoreCycle() {
    try {
      // Initialize each module in the correct order
      Object.entries(this.modules).forEach(([name, module]) => {
        if (typeof module.initialize === 'function') {
          module.initialize();
          logger.info(`Module initialized`, { module: name });
        }
      });

      // Emit core initialization complete event
      kernelBus.emit('prism:core:initialized', {
        timestamp: Date.now(),
        modules: Object.keys(this.modules)
      });
      
      logger.info('Core cycle started successfully');
    } catch (error) {
      logger.error('Failed to start core cycle', { error });
      throw error;
    }
  }

  startMetricsReporting() {
    setInterval(() => {
      const snapshot = metrics.getSnapshot();
      kernelBus.emit('prism:core:metrics', snapshot);
    }, 5000); // Report metrics every 5 seconds
  }

  // Method to gracefully shutdown the core
  async shutdown() {
    try {
      await Promise.all(
        Object.entries(this.modules).map(async ([name, module]) => {
          if (typeof module.shutdown === 'function') {
            await module.shutdown();
            logger.info(`Module shut down`, { module: name });
          }
        })
      );

      kernelBus.emit('prism:core:shutdown', {
        timestamp: Date.now()
      });
      
      logger.info('Core shutdown completed');
    } catch (error) {
      logger.error('Error during core shutdown', { error });
      throw error;
    }
  }
}

export default new PrismCore(); 