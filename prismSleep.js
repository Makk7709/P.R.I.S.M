// PRISM Sleep Cycle Management System
class PrismSleep {
  constructor() {
    this.isSleeping = false;
    this.energyThreshold = 20; // Energy level below which sleep is triggered
    this.moodThreshold = -0.5; // Mood level below which sleep is triggered
    this.energyRecoveryRate = 5; // Energy points recovered per sleep cycle
    this.sleepDuration = 30000; // Default sleep duration in ms
    this.sleepTimer = null;
    this.eventListeners = new Set();
  }

  // Public Methods
  startSleepCycle() {
    if (this.isSleeping) return;
    
    this.isSleeping = true;
    this.emitSleepEvent('sleep');
    
    this.sleepTimer = setTimeout(() => {
      this.wakeUp();
    }, this.sleepDuration);
  }

  wakeUp() {
    if (!this.isSleeping) return;
    
    clearTimeout(this.sleepTimer);
    this.isSleeping = false;
    this.emitSleepEvent('wake');
  }

  forceSleep() {
    this.startSleepCycle();
  }

  // Event Management
  addEventListener(callback) {
    this.eventListeners.add(callback);
  }

  removeEventListener(callback) {
    this.eventListeners.delete(callback);
  }

  emitSleepEvent(state) {
    const event = new CustomEvent('prismSleepEvent', {
      detail: { state, timestamp: Date.now() }
    });
    
    this.eventListeners.forEach(callback => callback(event));
  }

  // State Management
  shouldSleep(energy, mood) {
    return energy <= this.energyThreshold || mood <= this.moodThreshold;
  }

  recoverEnergy(currentEnergy) {
    return Math.min(100, currentEnergy + this.energyRecoveryRate);
  }

  resetEmotionalState(currentMood) {
    return Math.max(0, currentMood + 0.2); // Partial emotional reset
  }
}

// Inline Tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const testSleep = new PrismSleep();
  
  // Test sleep cycle
  console.assert(!testSleep.isSleeping, 'Initial state should be awake');
  testSleep.startSleepCycle();
  console.assert(testSleep.isSleeping, 'Should be sleeping after startSleepCycle');
  
  // Test energy recovery
  const initialEnergy = 10;
  const recoveredEnergy = testSleep.recoverEnergy(initialEnergy);
  console.assert(recoveredEnergy > initialEnergy, 'Energy should increase after recovery');
  
  // Test mood reset
  const initialMood = -0.8;
  const resetMood = testSleep.resetEmotionalState(initialMood);
  console.assert(resetMood > initialMood, 'Mood should improve after reset');
  
  // Test event emission
  let eventReceived = false;
  testSleep.addEventListener(() => { eventReceived = true; });
  testSleep.emitSleepEvent('test');
  console.assert(eventReceived, 'Event listener should receive events');
}

export default PrismSleep; 