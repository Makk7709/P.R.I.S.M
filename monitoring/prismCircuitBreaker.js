/**
 * @fileoverview Module de circuit breaker pour PRISM
 * @module prismCircuitBreaker
 */

import prismBus from '../prismBus.js';

class PrismCircuitBreaker {
  constructor() {
    this.circuits = new Map();
    this.defaultConfig = {
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenTimeout: 5000,
      successThreshold: 2
    };
  }

  createCircuit(name, config = {}) {
    const circuitConfig = { ...this.defaultConfig, ...config };
    
    this.circuits.set(name, {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastStateChange: Date.now(),
      config: circuitConfig
    });

    return this.getCircuit(name);
  }

  getCircuit(name) {
    return this.circuits.get(name);
  }

  async execute(name, operation) {
    const circuit = this.getCircuit(name);
    if (!circuit) {
      throw new Error(`Circuit ${name} not found`);
    }

    if (circuit.state === 'OPEN') {
      if (this.shouldReset(circuit)) {
        this.halfOpen(circuit);
      } else {
        throw new Error(`Circuit ${name} is OPEN`);
      }
    }

    try {
      const result = await operation();
      
      if (circuit.state === 'HALF_OPEN') {
        circuit.successCount++;
        if (circuit.successCount >= circuit.config.successThreshold) {
          this.close(circuit);
        }
      }
      
      return result;
    } catch (error) {
      this.handleFailure(circuit, error);
      throw error;
    }
  }

  handleFailure(circuit, error) {
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    if (circuit.state === 'HALF_OPEN') {
      this.open(circuit);
    } else if (circuit.failureCount >= circuit.config.failureThreshold) {
      this.open(circuit);
    }

    prismBus.emit('prism:circuit:failure', {
      circuit: circuit.name,
      failureCount: circuit.failureCount,
      error: error.message,
      timestamp: Date.now()
    });
  }

  open(circuit) {
    if (circuit.state !== 'OPEN') {
      circuit.state = 'OPEN';
      circuit.lastStateChange = Date.now();
      
      prismBus.emit('prism:circuit:opened', {
        circuit: circuit.name,
        failureCount: circuit.failureCount,
        timestamp: Date.now()
      });
    }
  }

  halfOpen(circuit) {
    circuit.state = 'HALF_OPEN';
    circuit.lastStateChange = Date.now();
    circuit.successCount = 0;
    
    prismBus.emit('prism:circuit:halfOpen', {
      circuit: circuit.name,
      timestamp: Date.now()
    });
  }

  close(circuit) {
    circuit.state = 'CLOSED';
    circuit.lastStateChange = Date.now();
    circuit.failureCount = 0;
    circuit.successCount = 0;
    
    prismBus.emit('prism:circuit:closed', {
      circuit: circuit.name,
      timestamp: Date.now()
    });
  }

  shouldReset(circuit) {
    if (!circuit.lastFailureTime) return false;
    
    const timeSinceLastFailure = Date.now() - circuit.lastFailureTime;
    return timeSinceLastFailure >= circuit.config.resetTimeout;
  }

  getState(name) {
    const circuit = this.getCircuit(name);
    if (!circuit) return null;
    
    return {
      state: circuit.state,
      failureCount: circuit.failureCount,
      successCount: circuit.successCount,
      lastFailureTime: circuit.lastFailureTime,
      lastStateChange: circuit.lastStateChange
    };
  }

  reset(name) {
    const circuit = this.getCircuit(name);
    if (!circuit) return;
    
    this.close(circuit);
  }

  resetAll() {
    for (const [name, circuit] of this.circuits) {
      this.close(circuit);
    }
  }
}

export default new PrismCircuitBreaker(); 