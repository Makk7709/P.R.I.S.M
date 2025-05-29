class PrismBus {
  constructor() {
    this._events = new Map();
    this._typeValidators = new Map();
  }

  on(event, callback, options = {}) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    const listeners = this._events.get(event);
    listeners.add(callback);
    return () => this.off(event, callback);
  }

  async emit(event, payload) {
    if (!this._events.has(event)) {
      return;
    }
    const listeners = this._events.get(event);
    for (const listener of listeners) {
      await Promise.resolve(listener(payload));
    }
  }

  off(event, callback) {
    if (!this._events.has(event)) {
      return;
    }
    const listeners = this._events.get(event);
    listeners.delete(callback);
  }

  clear(event) {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
  }

  // Alias methods used in some tests
  subscribe(event, callback) {
    return this.on(event, callback);
  }

  publish(event, payload) {
    return this.emit(event, payload);
  }
}

// Create and export singleton instance
const prismBus = new PrismBus();

module.exports = {
  PrismBus,
  prismBus
}; 