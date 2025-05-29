/**
 * @fileoverview Module de gestion de la charge pour PRISM
 * @module prismLoadBalancer
 */

import prismBus from '../prismBus.js';

class PrismLoadBalancer {
  constructor() {
    this.queues = new Map();
    this.processing = new Map();
    this.defaultConfig = {
      maxQueueSize: 1000,
      batchSize: 100,
      processingTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    };
  }

  createQueue(name, config = {}) {
    const queueConfig = { ...this.defaultConfig, ...config };
    
    this.queues.set(name, {
      items: [],
      config: queueConfig,
      stats: {
        totalProcessed: 0,
        totalFailed: 0,
        averageProcessingTime: 0,
        lastProcessedAt: null
      }
    });

    return this.getQueue(name);
  }

  getQueue(name) {
    return this.queues.get(name);
  }

  async enqueue(name, item) {
    const queue = this.getQueue(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }

    if (queue.items.length >= queue.config.maxQueueSize) {
      throw new Error(`Queue ${name} is full`);
    }

    queue.items.push({
      item,
      timestamp: Date.now(),
      attempts: 0
    });

    prismBus.emit('prism:loadBalancer:enqueued', {
      queue: name,
      queueSize: queue.items.length,
      timestamp: Date.now()
    });

    return queue.items.length;
  }

  async processQueue(name) {
    const queue = this.getQueue(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }

    if (this.processing.get(name)) {
      return;
    }

    this.processing.set(name, true);

    try {
      while (queue.items.length > 0) {
        const batch = this.getNextBatch(queue);
        await this.processBatch(name, batch);
      }
    } finally {
      this.processing.set(name, false);
    }
  }

  getNextBatch(queue) {
    const batchSize = Math.min(queue.config.batchSize, queue.items.length);
    return queue.items.splice(0, batchSize);
  }

  async processBatch(queueName, batch) {
    const queue = this.getQueue(queueName);
    const startTime = Date.now();

    for (const item of batch) {
      try {
        await this.processItem(queueName, item);
        queue.stats.totalProcessed++;
      } catch (error) {
        queue.stats.totalFailed++;
        
        if (item.attempts < queue.config.retryAttempts) {
          item.attempts++;
          await this.delay(queue.config.retryDelay);
          queue.items.push(item);
        } else {
          prismBus.emit('prism:loadBalancer:itemFailed', {
            queue: queueName,
            item: item.item,
            error: error.message,
            attempts: item.attempts,
            timestamp: Date.now()
          });
        }
      }
    }

    const processingTime = Date.now() - startTime;
    queue.stats.averageProcessingTime = (
      (queue.stats.averageProcessingTime * (queue.stats.totalProcessed - batch.length) +
       processingTime * batch.length) / queue.stats.totalProcessed
    );
    queue.stats.lastProcessedAt = Date.now();

    prismBus.emit('prism:loadBalancer:batchProcessed', {
      queue: queueName,
      batchSize: batch.length,
      processingTime,
      queueSize: queue.items.length,
      timestamp: Date.now()
    });
  }

  async processItem(queueName, item) {
    // Cette méthode doit être surchargée par les modules qui utilisent le load balancer
    throw new Error('processItem must be implemented by the consumer');
  }

  getQueueStats(name) {
    const queue = this.getQueue(name);
    if (!queue) return null;
    
    return {
      ...queue.stats,
      currentSize: queue.items.length,
      isProcessing: this.processing.get(name) || false
    };
  }

  clearQueue(name) {
    const queue = this.getQueue(name);
    if (!queue) return;
    
    queue.items = [];
    queue.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      lastProcessedAt: null
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new PrismLoadBalancer(); 