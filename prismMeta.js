/**
 * PRISM Meta-Cognitive Monitoring System
 * Monitors and reports on the health and balance of PRISM's core modules
 */

class PrismMeta {
  constructor() {
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.coreModules = ['Memory', 'Soul', 'Tone', 'Mood', 'Bond', 'Pulse'];
    this.metaEvents = new Set(['stable', 'fatigue', 'emotional_imbalance', 'disconnection']);
    this.eventListeners = new Map();
    this.lastStateReport = null;
  }

  /**
   * Starts the meta-monitoring system
   * @returns {boolean} Success status
   */
  startMetaMonitoring() {
    if (this.isMonitoring) return false;
    
    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => this.emitMetaEvent(), 60000);
    this.emitMetaEvent(); // Initial state report
    
    return true;
  }

  /**
   * Stops the meta-monitoring system
   * @returns {boolean} Success status
   */
  stopMetaMonitoring() {
    if (!this.isMonitoring) return false;
    
    clearInterval(this.monitorInterval);
    this.isMonitoring = false;
    this.monitorInterval = null;
    
    return true;
  }

  /**
   * Analyzes the current state of PRISM's core modules
   * @returns {Object} State analysis
   */
  analyzeState() {
    const state = {
      timestamp: Date.now(),
      modules: {},
      metaStatus: 'stable',
      warnings: []
    };

    // Simulate module health checks (replace with actual module checks)
    this.coreModules.forEach(module => {
      const health = Math.random(); // Replace with actual health metrics
      state.modules[module] = {
        health,
        status: health > 0.7 ? 'healthy' : health > 0.4 ? 'degraded' : 'critical'
      };

      if (health < 0.4) {
        state.warnings.push(`${module} is in critical condition`);
      }
    });

    // Determine meta status
    const criticalCount = Object.values(state.modules)
      .filter(m => m.status === 'critical').length;
    
    if (criticalCount >= 2) {
      state.metaStatus = 'disconnection';
    } else if (criticalCount === 1) {
      state.metaStatus = 'fatigue';
    } else if (Object.values(state.modules).some(m => m.status === 'degraded')) {
      state.metaStatus = 'emotional_imbalance';
    }

    return state;
  }

  /**
   * Emits a meta event with the current state report
   */
  emitMetaEvent() {
    const stateReport = this.analyzeState();
    this.lastStateReport = stateReport;

    const event = new CustomEvent('prismMetaEvent', {
      detail: stateReport,
      bubbles: true
    });

    document.dispatchEvent(event);
  }

  /**
   * Adds an event listener for meta events
   * @param {string} eventType - Type of event to listen for
   * @param {Function} callback - Callback function
   */
  addEventListener(eventType, callback) {
    if (!this.metaEvents.has(eventType)) {
      throw new Error(`Invalid meta event type: ${eventType}`);
    }
    
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType).add(callback);
  }

  /**
   * Removes an event listener
   * @param {string} eventType - Type of event
   * @param {Function} callback - Callback function to remove
   */
  removeEventListener(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).delete(callback);
    }
  }
}

// Inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const meta = new PrismMeta();
  
  // Test monitoring start/stop
  console.assert(meta.startMetaMonitoring() === true, 'Should start monitoring');
  console.assert(meta.startMetaMonitoring() === false, 'Should not start monitoring twice');
  console.assert(meta.stopMetaMonitoring() === true, 'Should stop monitoring');
  console.assert(meta.stopMetaMonitoring() === false, 'Should not stop monitoring twice');
  
  // Test event emission
  let eventReceived = false;
  document.addEventListener('prismMetaEvent', (e) => {
    eventReceived = true;
    console.assert(e.detail.timestamp !== undefined, 'Event should have timestamp');
    console.assert(e.detail.modules !== undefined, 'Event should have modules');
    console.assert(e.detail.metaStatus !== undefined, 'Event should have metaStatus');
  });
  
  meta.emitMetaEvent();
  console.assert(eventReceived === true, 'Event should be received');
}

export default PrismMeta; 