class PrismEvents {
  constructor() {
    this.events = new Map();
    this.PREFIX = 'prism:';
  }

  validateEventName(event) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }
    return event.startsWith(this.PREFIX) ? event : `${this.PREFIX}${event}`;
  }

  validateEventData(data) {
    return {
      timestamp: Date.now(),
      source: 'prism',
      ...(typeof data === 'object' ? data : { payload: data })
    };
  }

  on(event, callback) {
    const normalizedEvent = this.validateEventName(event);
    if (!this.events.has(normalizedEvent)) {
      this.events.set(normalizedEvent, new Set());
    }
    this.events.get(normalizedEvent).add(callback);
    return () => this.off(normalizedEvent, callback);
  }

  emit(event, data) {
    const normalizedEvent = this.validateEventName(event);
    const normalizedData = this.validateEventData(data);
    const callbacks = this.events.get(normalizedEvent);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(normalizedData);
        } catch (error) {
          console.error(`[PRISM Event Error] Event: "${normalizedEvent}"`, error);
        }
      });
    }
  }

  off(event, callback) {
    const normalizedEvent = this.validateEventName(event);
    const callbacks = this.events.get(normalizedEvent);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(normalizedEvent);
      }
    }
  }

  clear() {
    this.events.clear();
  }
}

module.exports = {
  PrismEvents,
  default: new PrismEvents()
}; 