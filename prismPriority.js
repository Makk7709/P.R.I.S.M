// Priority management system for PRISM
import prismBus from './prismBus.js';
import prismCircuitBreaker from './monitoring/prismCircuitBreaker.js';
import prismLoadBalancer from './monitoring/prismLoadBalancer.js';
import prismLogger from './monitoring/prismLogger.js';

class PrismPriority {
  constructor() {
    this.queue = new Map();
    this.priorityLevels = {
      LOW: 0,
      NORMAL: 1,
      HIGH: 2,
      CRITICAL: 3
    };
    this.maxQueueSize = 100;
    this.eventListeners = new Set();
    this.idCounter = 0;
    
    this.initializePriority();
  }

  initializePriority() {
    // Créer un circuit breaker pour la priorisation
    prismCircuitBreaker.createCircuit('priority', {
      failureThreshold: 5,
      resetTimeout: 30000
    });
    
    // Créer une file d'attente pour les événements de priorisation
    prismLoadBalancer.createQueue('priority', {
      maxQueueSize: 1000,
      batchSize: 100
    });
    
    // S'abonner aux événements de prédiction
    prismBus.on('prism:optimization:adaptation', (data) => {
      this.handleOptimizationAdaptation(data);
    });
  }

  generateUniqueId() {
    const timestamp = Date.now().toString(36);
    const counter = (this.idCounter++).toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${counter}-${random}`;
  }

  evaluateSignal(signal) {
    const { intent, pulse, reflex } = signal;
    let priority = this.priorityLevels.NORMAL;

    // Evaluate based on signal components
    if (intent?.urgency === 'critical' || pulse?.intensity > 0.8 || reflex?.immediate) {
      priority = this.priorityLevels.CRITICAL;
    } else if (intent?.urgency === 'high' || pulse?.intensity > 0.5) {
      priority = this.priorityLevels.HIGH;
    } else if (intent?.urgency === 'low' || pulse?.intensity < 0.3) {
      priority = this.priorityLevels.LOW;
    }

    // Emit event for high/critical signals
    if (priority >= this.priorityLevels.HIGH) {
      this.emitPriorityEvent({
        type: 'prismPriorityEvent',
        signal,
        priority,
        timestamp: Date.now()
      });
    }
    
    // Ajouter l'événement à la file d'attente
    prismLoadBalancer.enqueue('priority', {
      type: 'evaluation',
      signal,
      priority,
      timestamp: Date.now()
    });

    return priority;
  }

  getQueue() {
    return Array.from(this.queue.entries())
      .sort(([, a], [, b]) => b.priority - a.priority);
  }

  flushQueue() {
    const processed = Array.from(this.queue.values())
      .sort((a, b) => b.priority - a.priority);
    this.queue.clear();
    
    // Logger le vidage de la file
    prismLogger.info('Queue flushed', { processedCount: processed.length });
    
    return processed;
  }

  addToQueue(signal, priority) {
    if (this.queue.size >= this.maxQueueSize) {
      // Remove lowest priority item if queue is full
      const lowestPriority = Math.min(...Array.from(this.queue.values()).map(item => item.priority));
      for (const [key, value] of this.queue.entries()) {
        if (value.priority === lowestPriority) {
          this.queue.delete(key);
          break;
        }
      }
    }

    const id = this.generateUniqueId();
    this.queue.set(id, {
      signal,
      priority,
      timestamp: Date.now()
    });
    
    // Logger l'ajout à la file
    prismLogger.info('Signal added to queue', { id, priority });

    return id;
  }

  onPriorityEvent(callback) {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  emitPriorityEvent(event) {
    this.eventListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in priority event listener:', error);
        
        // Logger l'erreur
        prismLogger.error('Priority event listener error', { error });
      }
    });
  }

  async handleOptimizationAdaptation(data) {
    try {
      // Exécuter l'adaptation via le circuit breaker
      await prismCircuitBreaker.execute('priority', async () => {
        const { type, prediction, adaptation } = data;
        
        // Appliquer l'adaptation en fonction du type
        switch (type) {
          case 'performance':
            await this.adaptPerformance(adaptation);
            break;
          case 'stability':
            await this.adaptStability(adaptation);
            break;
          case 'load':
            await this.adaptLoad(adaptation);
            break;
        }
        
        // Logger l'adaptation
        prismLogger.logAdjustment(type, { prediction, adaptation });
      });
    } catch (error) {
      prismLogger.error('Optimization adaptation failed', { error });
    }
  }

  async adaptPerformance(adaptation) {
    const { thresholds } = adaptation;
    
    // Ajuster les seuils de performance
    if (thresholds.responseTime < 200) {
      // Réduire la taille maximale de la file
      this.maxQueueSize = Math.max(50, this.maxQueueSize - 10);
    } else if (thresholds.responseTime > 300) {
      // Augmenter la taille maximale de la file
      this.maxQueueSize = Math.min(200, this.maxQueueSize + 10);
    }
  }

  async adaptStability(adaptation) {
    const { parameters } = adaptation;
    
    // Ajuster les paramètres de stabilité
    if (parameters.checkInterval < 1000) {
      // Réduire les seuils de priorité
      this.priorityLevels.HIGH = Math.max(1, this.priorityLevels.HIGH - 1);
      this.priorityLevels.CRITICAL = Math.max(2, this.priorityLevels.CRITICAL - 1);
    } else if (parameters.checkInterval > 2000) {
      // Augmenter les seuils de priorité
      this.priorityLevels.HIGH = Math.min(3, this.priorityLevels.HIGH + 1);
      this.priorityLevels.CRITICAL = Math.min(4, this.priorityLevels.CRITICAL + 1);
    }
  }

  async adaptLoad(adaptation) {
    const { parameters } = adaptation;
    
    // Ajuster les paramètres de charge
    if (parameters.batchSize < 50) {
      // Réduire la taille maximale de la file
      this.maxQueueSize = Math.max(50, this.maxQueueSize - 10);
    } else if (parameters.batchSize > 150) {
      // Augmenter la taille maximale de la file
      this.maxQueueSize = Math.min(200, this.maxQueueSize + 10);
    }
  }
}

// Inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const tests = {
    evaluateSignal: () => {
      const priority = new PrismPriority();
      
      const criticalSignal = {
        intent: { urgency: 'critical' },
        pulse: { intensity: 0.9 },
        reflex: { immediate: true }
      };
      
      const normalSignal = {
        intent: { urgency: 'normal' },
        pulse: { intensity: 0.5 },
        reflex: { immediate: false }
      };

      console.assert(
        priority.evaluateSignal(criticalSignal) === priority.priorityLevels.CRITICAL,
        'Critical signal should be evaluated as CRITICAL'
      );
      
      console.assert(
        priority.evaluateSignal(normalSignal) === priority.priorityLevels.NORMAL,
        'Normal signal should be evaluated as NORMAL'
      );
    },

    queueManagement: () => {
      const priority = new PrismPriority();
      
      const signal = { intent: { urgency: 'high' } };
      const id = priority.addToQueue(signal, priority.priorityLevels.HIGH);
      
      console.assert(
        priority.getQueue().length === 1,
        'Queue should contain one item'
      );
      
      const flushed = priority.flushQueue();
      console.assert(
        flushed.length === 1 && priority.getQueue().length === 0,
        'Queue should be empty after flush'
      );
    }
  };

  // Run tests
  Object.entries(tests).forEach(([name, test]) => {
    try {
      test();
      console.log(`✓ ${name} passed`);
    } catch (error) {
      console.error(`✗ ${name} failed:`, error);
    }
  });
}

export default PrismPriority; 