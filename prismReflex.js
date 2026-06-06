/**
 * PRISM Reflex System
 * Real-time monitoring and response system for PRISM cognitive architecture
 */

class PrismReflex {
  constructor() {
    this.isMonitoring = false;
    this.eventHandlers = new Map();
    this.signalBuffer = new Map();
    this.lastHeartbeat = 0;
    this.anomalyThreshold = 0.8;
    this.bufferSize = 10;
    this.reactionTimeout = 100; // ms
  }

  startReflexMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.initializeEventListeners();
    this.startSignalAnalysis();
    
    console.log('[PRISM Reflex] Monitoring started');
    return true;
  }

  stopReflexMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    this.cleanupEventListeners();
    this.signalBuffer.clear();
    
    console.log('[PRISM Reflex] Monitoring stopped');
    return true;
  }

  initializeEventListeners() {
    const events = [
      'prismHeartbeatEvent',
      'prismHarmonyEvent',
      'prismSleepEvent',
      'prismErrorEvent'
    ];

    events.forEach(eventName => {
      const handler = this.createEventHandler(eventName);
      this.eventHandlers.set(eventName, handler);
      window.addEventListener(eventName, handler);
    });
  }

  cleanupEventListeners() {
    this.eventHandlers.forEach((handler, eventName) => {
      window.removeEventListener(eventName, handler);
    });
    this.eventHandlers.clear();
  }

  createEventHandler(eventName) {
    return (event) => {
      if (!this.isMonitoring) return;
      
      const timestamp = performance.now();
      this.processSignal(eventName, event.detail, timestamp);
    };
  }

  processSignal(eventName, data, timestamp) {
    if (!this.signalBuffer.has(eventName)) {
      this.signalBuffer.set(eventName, []);
    }

    const buffer = this.signalBuffer.get(eventName);
    buffer.push({ timestamp, data });

    if (buffer.length > this.bufferSize) {
      buffer.shift();
    }

    this.analyzeSignals(eventName);
  }

  analyzeSignals(eventName) {
    const buffer = this.signalBuffer.get(eventName);
    if (!buffer || buffer.length < 2) return;

    const anomalies = this.detectAnomalies(eventName, buffer);
    if (anomalies.length > 0) {
      this.triggerReflex(eventName, anomalies);
    }
  }

  detectAnomalies(eventName, buffer) {
    const anomalies = [];
    
    switch (eventName) {
      case 'prismHeartbeatEvent': {
        const intervals = this.calculateIntervals(buffer);
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const threshold = avgInterval * this.anomalyThreshold;
        
        intervals.forEach((interval, index) => {
          if (interval > threshold) {
            anomalies.push({
              type: 'heartbeat_delay',
              severity: interval / threshold,
              timestamp: buffer[index + 1].timestamp
            });
          }
        });
        break;
      }

      case 'prismHarmonyEvent':
        buffer.forEach(signal => {
          if (signal.data && signal.data.stability < 0.5) {
            anomalies.push({
              type: 'harmony_instability',
              severity: 1 - signal.data.stability,
              timestamp: signal.timestamp
            });
          }
        });
        break;

      case 'prismSleepEvent':
        if (buffer[buffer.length - 1].data && buffer[buffer.length - 1].data.forceAwake) {
          anomalies.push({
            type: 'forced_awake',
            severity: 1,
            timestamp: buffer[buffer.length - 1].timestamp
          });
        }
        break;
    }

    return anomalies;
  }

  calculateIntervals(buffer) {
    const intervals = [];
    for (let i = 1; i < buffer.length; i++) {
      intervals.push(buffer[i].timestamp - buffer[i - 1].timestamp);
    }
    return intervals;
  }

  triggerReflex(eventName, anomalies) {
    const reflex = {
      timestamp: performance.now(),
      event: eventName,
      anomalies
    };

    // Immediate micro-adjustments
    this.executeReflex(reflex);

    // Dispatch reflex event
    window.dispatchEvent(new CustomEvent('prismReflexEvent', {
      detail: reflex
    }));
  }

  executeReflex(reflex) {
    switch (reflex.event) {
      case 'prismHeartbeatEvent':
        this.handleHeartbeatAnomaly(reflex);
        break;
      case 'prismHarmonyEvent':
        this.handleHarmonyAnomaly(reflex);
        break;
      case 'prismSleepEvent':
        this.handleSleepAnomaly(reflex);
        break;
    }
  }

  handleHeartbeatAnomaly(reflex) {
    const anomaly = reflex.anomalies[0];
    if (anomaly.severity > 1.5) {
      this.triggerSafetyProcedure('heartbeat_critical');
    }
  }

  handleHarmonyAnomaly(reflex) {
    const anomaly = reflex.anomalies[0];
    if (anomaly.severity > 0.8) {
      this.triggerSafetyProcedure('harmony_critical');
    }
  }

  handleSleepAnomaly(_reflex) {
    this.triggerSafetyProcedure('sleep_interrupted');
  }

  triggerSafetyProcedure(type) {
    window.dispatchEvent(new CustomEvent('prismSafetyEvent', {
      detail: { type, timestamp: performance.now() }
    }));
  }

  startSignalAnalysis() {
    this.analysisInterval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(this.analysisInterval);
        return;
      }
      
      this.signalBuffer.forEach((buffer, eventName) => {
        this.analyzeSignals(eventName);
      });
    }, 100);
  }
}

// Inline tests
const runTests = () => {
  const reflex = new PrismReflex();
  
  // Test 1: Start/Stop monitoring
  console.assert(reflex.startReflexMonitoring() === true, 'Should start monitoring');
  console.assert(reflex.stopReflexMonitoring() === true, 'Should stop monitoring');
  
  // Test 2: Event handling
  const testEvent = new CustomEvent('prismHeartbeatEvent', {
    detail: { timestamp: performance.now() }
  });
  window.dispatchEvent(testEvent);
  
  // Test 3: Signal processing
  console.assert(reflex.signalBuffer.size === 0, 'Buffer should be empty after stop');
};

// Run tests in development
if (process.env.NODE_ENV === 'development') {
  runTests();
}

export default PrismReflex; 