/**
 * PRISM Event Bus System
 * Handles event communication between PRISM modules
 */

class PrismBus {
  constructor() {
    this.events = new Map();
    this.subscribers = new Map();
    this.history = [];
    this.maxHistoryLength = 100;
  }

  emit(event, data) {
    const timestamp = Date.now();
    const eventData = { event, data, timestamp };

    // Store in history
    this.history.push(eventData);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }

    // Notify subscribers
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }

    return eventData;
  }

  on(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).delete(callback);
    }
  }

  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  getHistory() {
    return [...this.history];
  }

  clear() {
    this.subscribers.clear();
    this.history = [];
  }
}

const prismBus = new PrismBus();
export { prismBus };
export default prismBus; 