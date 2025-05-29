// PRISM Cognitive Engine - Micro-autonomous reasoning system
class PrismThink {
  constructor() {
    this.stateHistory = [];
    this.patterns = {
      errorStreak: 0,
      successStreak: 0,
      inactivityTime: 0,
      lastStateChange: Date.now()
    };
    this.intents = [];
    this.maxHistorySize = 10;
    this.inactivityThreshold = 30000; // 30 seconds
    this.errorThreshold = 3;
    this.successThreshold = 2;
  }

  // State analysis and pattern detection
  analyzeState(state) {
    const timestamp = Date.now();
    this.stateHistory.push({ state, timestamp });
    
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    this.updatePatterns(state);
    return this.generateIntent();
  }

  updatePatterns(state) {
    const now = Date.now();
    const timeSinceLastChange = now - this.patterns.lastStateChange;

    switch (state) {
      case 'error':
        this.patterns.errorStreak++;
        this.patterns.successStreak = 0;
        break;
      case 'success':
        this.patterns.successStreak++;
        this.patterns.errorStreak = 0;
        break;
      case 'inactive':
        this.patterns.inactivityTime += timeSinceLastChange;
        break;
      default:
        this.patterns.inactivityTime = 0;
    }

    this.patterns.lastStateChange = now;
  }

  generateIntent() {
    const intent = {
      type: null,
      priority: 'normal',
      message: '',
      timestamp: Date.now()
    };

    // Pattern-based intent generation
    if (this.patterns.errorStreak >= this.errorThreshold) {
      intent.type = 'alert';
      intent.priority = 'high';
      intent.message = 'Multiple errors detected. Consider checking system status.';
    } else if (this.patterns.successStreak >= this.successThreshold) {
      intent.type = 'encourage';
      intent.message = 'System performing well. Maintaining optimal state.';
    } else if (this.patterns.inactivityTime >= this.inactivityThreshold) {
      intent.type = 'propose';
      intent.message = 'System inactive. Ready for new interaction.';
    }

    if (intent.type) {
      this.intents.push(intent);
      if (this.intents.length > 5) {
        this.intents.shift();
      }
    }

    return intent;
  }

  // Event handlers
  onStateChange(event) {
    const state = event.detail?.state || 'unknown';
    const intent = this.analyzeState(state);
    
    if (intent.type) {
      this.dispatchIntentEvent(intent);
    }
  }

  dispatchIntentEvent(intent) {
    const event = new CustomEvent('prismIntent', {
      detail: intent,
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  // System monitoring
  startMonitoring() {
    document.addEventListener('prismStateChange', this.onStateChange.bind(this));
    
    // Periodic inactivity check
    setInterval(() => {
      const now = Date.now();
      if (now - this.patterns.lastStateChange >= this.inactivityThreshold) {
        this.analyzeState('inactive');
      }
    }, 5000);
  }

  stopMonitoring() {
    document.removeEventListener('prismStateChange', this.onStateChange.bind(this));
  }
}

// Export for module usage
export const prismThink = new PrismThink(); 