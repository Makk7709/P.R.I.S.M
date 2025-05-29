import { EventEmitter } from 'events';

export class EventGenerator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      eventTypes: ['create', 'update', 'delete'],
      payloadSizes: ['small', 'medium', 'large'],
      distribution: 'random', // 'random', 'uniform', or 'burst'
      burstConfig: {
        minEvents: 10,
        maxEvents: 100,
        minDelay: 100, // ms
        maxDelay: 1000 // ms
      },
      ...options
    };
  }

  generatePayload(size) {
    const sizes = {
      small: 100,
      medium: 1000,
      large: 10000
    };
    
    const dataSize = sizes[size] || sizes.small;
    return {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      data: 'x'.repeat(dataSize),
      metadata: {
        size,
        generated: true
      }
    };
  }

  async *generateEvents(count) {
    let generated = 0;

    while (generated < count) {
      const eventType = this.options.eventTypes[Math.floor(Math.random() * this.options.eventTypes.length)];
      const payloadSize = this.options.payloadSizes[Math.floor(Math.random() * this.options.payloadSizes.length)];

      const event = {
        type: eventType,
        payload: this.generatePayload(payloadSize)
      };

      if (this.options.distribution === 'burst') {
        const burstSize = Math.floor(
          Math.random() * 
          (this.options.burstConfig.maxEvents - this.options.burstConfig.minEvents) + 
          this.options.burstConfig.minEvents
        );
        
        for (let i = 0; i < burstSize && generated < count; i++) {
          yield event;
          generated++;
        }

        const delay = Math.floor(
          Math.random() * 
          (this.options.burstConfig.maxDelay - this.options.burstConfig.minDelay) + 
          this.options.burstConfig.minDelay
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        yield event;
        generated++;

        if (this.options.distribution === 'uniform') {
          await new Promise(resolve => setTimeout(resolve, 10)); // Constant delay for uniform distribution
        }
      }
    }
  }

  async startGenerating(count) {
    for await (const event of this.generateEvents(count)) {
      this.emit('event', event);
    }
    this.emit('complete');
  }
} 