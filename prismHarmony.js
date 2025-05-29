// Harmony monitoring system for PRISM
class PrismHarmony {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.harmonyThresholds = {
      mood: { min: 0.3, max: 0.8 },
      energy: { min: 0.2, max: 0.9 },
      bond: { min: 0.1, max: 0.95 },
      soul: { min: 0.4, max: 0.85 }
    };
    this.adjustmentHistory = [];
    this.eventListeners = new Set();
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => this.checkHarmony(), 1000);
    this.emitEvent('monitoringStarted');
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    clearInterval(this.monitoringInterval);
    this.isMonitoring = false;
    this.emitEvent('monitoringStopped');
  }

  checkHarmony() {
    const currentState = this.getCurrentState();
    const adjustments = this.calculateAdjustments(currentState);
    
    if (Object.keys(adjustments).length > 0) {
      this.applyAdjustments(adjustments);
      this.emitEvent('harmonyAdjusted', adjustments);
    }
  }

  getCurrentState() {
    return {
      mood: this.getModuleValue('mood'),
      energy: this.getModuleValue('energy'),
      bond: this.getModuleValue('bond'),
      soul: this.getModuleValue('soul')
    };
  }

  getModuleValue(module) {
    // Integration with existing modules
    const moduleElement = document.querySelector(`#${module}-value`);
    return moduleElement ? parseFloat(moduleElement.dataset.value) || 0.5 : 0.5;
  }

  calculateAdjustments(state) {
    const adjustments = {};
    
    Object.entries(state).forEach(([module, value]) => {
      const threshold = this.harmonyThresholds[module];
      if (value < threshold.min || value > threshold.max) {
        adjustments[module] = this.calculateOptimalValue(value, threshold);
      }
    });
    
    return adjustments;
  }

  calculateOptimalValue(current, threshold) {
    if (current < threshold.min) {
      return threshold.min + (threshold.max - threshold.min) * 0.2;
    }
    return threshold.max - (threshold.max - threshold.min) * 0.2;
  }

  applyAdjustments(adjustments) {
    Object.entries(adjustments).forEach(([module, value]) => {
      const moduleElement = document.querySelector(`#${module}-value`);
      if (moduleElement) {
        moduleElement.dataset.value = value.toString();
        this.adjustmentHistory.push({ module, value, timestamp: Date.now() });
      }
    });
  }

  addEventListener(callback) {
    this.eventListeners.add(callback);
  }

  removeEventListener(callback) {
    this.eventListeners.delete(callback);
  }

  emitEvent(type, data = {}) {
    const event = new CustomEvent('prismHarmonyEvent', {
      detail: { type, data, timestamp: Date.now() }
    });
    this.eventListeners.forEach(callback => callback(event));
  }

  // Inline tests
  static runTests() {
    const harmony = new PrismHarmony();
    let testsPassed = 0;
    let testsFailed = 0;

    // Test 1: Monitoring start/stop
    harmony.startMonitoring();
    if (harmony.isMonitoring) testsPassed++;
    else testsFailed++;
    
    harmony.stopMonitoring();
    if (!harmony.isMonitoring) testsPassed++;
    else testsFailed++;

    // Test 2: Threshold calculations
    const testValue = 0.1;
    const testThreshold = { min: 0.3, max: 0.8 };
    const optimal = harmony.calculateOptimalValue(testValue, testThreshold);
    if (optimal >= testThreshold.min && optimal <= testThreshold.max) testsPassed++;
    else testsFailed++;

    // Test 3: Event emission
    let eventReceived = false;
    harmony.addEventListener(() => { eventReceived = true; });
    harmony.emitEvent('test');
    if (eventReceived) testsPassed++;
    else testsFailed++;

    return {
      passed: testsPassed,
      failed: testsFailed,
      total: testsPassed + testsFailed
    };
  }
}

// Run tests if in development
if (process.env.NODE_ENV === 'development') {
  const testResults = PrismHarmony.runTests();
  console.log('Harmony Tests:', testResults);
}

export default PrismHarmony; 