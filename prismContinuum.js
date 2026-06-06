class PrismContinuum {
  constructor() {
    this.startTime = null;
    this.isActive = false;
    this.milestones = {
      HOURS_24: 24 * 60 * 60 * 1000,
      DAYS_7: 7 * 24 * 60 * 60 * 1000,
      DAYS_30: 30 * 24 * 60 * 60 * 1000
    };
    this.reachedMilestones = new Set();
    this.adaptationParams = {
      responseTime: 1.0,
      complexity: 1.0,
      engagement: 1.0
    };
    this.continuumInterval = null;
    this.eventListeners = new Map();
  }

  startContinuum() {
    if (this.isActive) return;
    
    this.startTime = Date.now();
    this.isActive = true;
    this.continuumInterval = setInterval(() => this.updateContinuum(), 60000); // Check every minute
    this.emit('continuum:started', { timestamp: this.startTime });
  }

  pauseContinuum() {
    if (!this.isActive) return;
    
    clearInterval(this.continuumInterval);
    this.isActive = false;
    this.emit('continuum:paused', { 
      duration: Date.now() - this.startTime,
      adaptationParams: this.adaptationParams
    });
  }

  resetContinuum() {
    this.pauseContinuum();
    this.startTime = null;
    this.reachedMilestones.clear();
    this.adaptationParams = {
      responseTime: 1.0,
      complexity: 1.0,
      engagement: 1.0
    };
    this.emit('continuum:reset');
  }

  updateContinuum() {
    if (!this.isActive) return;

    const currentDuration = Date.now() - this.startTime;
    this.checkMilestones(currentDuration);
    this.adaptParameters(currentDuration);
  }

  checkMilestones(duration) {
    for (const [milestone, threshold] of Object.entries(this.milestones)) {
      if (duration >= threshold && !this.reachedMilestones.has(milestone)) {
        this.reachedMilestones.add(milestone);
        this.emit('milestone:reached', {
          milestone,
          duration,
          adaptationParams: this.adaptationParams
        });
      }
    }
  }

  adaptParameters(duration) {
    const hoursActive = duration / (60 * 60 * 1000);
    
    // Progressive adaptation based on time
    this.adaptationParams.responseTime = Math.max(0.5, 1.0 - (hoursActive * 0.01));
    this.adaptationParams.complexity = Math.min(2.0, 1.0 + (hoursActive * 0.005));
    this.adaptationParams.engagement = Math.min(1.5, 1.0 + (hoursActive * 0.002));
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }

  getContinuumState() {
    return {
      isActive: this.isActive,
      startTime: this.startTime,
      duration: this.startTime ? Date.now() - this.startTime : 0,
      reachedMilestones: Array.from(this.reachedMilestones),
      adaptationParams: { ...this.adaptationParams }
    };
  }
}

// Inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const testContinuum = () => {
    const continuum = new PrismContinuum();
    let _milestoneReached = false;
    
    continuum.on('milestone:reached', () => {
      _milestoneReached = true;
    });

    // Test start
    continuum.startContinuum();
    console.assert(continuum.isActive === true, 'Continuum should be active after start');
    
    // Test pause
    continuum.pauseContinuum();
    console.assert(continuum.isActive === false, 'Continuum should be inactive after pause');
    
    // Test reset
    continuum.resetContinuum();
    console.assert(continuum.reachedMilestones.size === 0, 'Milestones should be cleared after reset');
    
    // Test adaptation
    continuum.startContinuum();
    const state = continuum.getContinuumState();
    console.assert(state.adaptationParams.responseTime <= 1.0, 'Response time should adapt downward');
    
    return 'All tests passed';
  };

  testContinuum();
}

export default PrismContinuum; 