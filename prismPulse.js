// PulseCraftGPT - PRISM Pulse Engine
// Monitors and triggers proactive behavioral pulses based on system state

class PrismPulse {
  #pulseHistory = [];
  #lastPulse = null;
  #pulseThresholds = {
    bond: 0.7,
    tone: 0.6,
    memory: 0.5
  };

  constructor() {
    this.#validateEnvironment();
  }

  #validateEnvironment() {
    if (typeof window === 'undefined') {
      throw new Error('PrismPulse requires a browser environment');
    }
  }

  #calculatePulsePriority(state) {
    const { tone, thinkPatterns, bondLevel, legacyEvents } = state;
    let priority = 0;

    // Bond level influence
    priority += bondLevel * 0.4;

    // Tone analysis
    const toneScore = this.#analyzeTone(tone);
    priority += toneScore * 0.3;

    // Think pattern complexity
    const patternScore = this.#analyzeThinkPatterns(thinkPatterns);
    priority += patternScore * 0.2;

    // Legacy event impact
    const legacyScore = this.#analyzeLegacyEvents(legacyEvents);
    priority += legacyScore * 0.1;

    return Math.min(Math.max(priority, 0), 1);
  }

  #analyzeTone(tone) {
    if (!tone || typeof tone !== 'object') return 0;
    const { intensity, sentiment, stability } = tone;
    return (intensity + sentiment + stability) / 3;
  }

  #analyzeThinkPatterns(patterns) {
    if (!Array.isArray(patterns)) return 0;
    return patterns.reduce((score, pattern) => {
      return score + (pattern.complexity || 0) * (pattern.frequency || 0);
    }, 0) / Math.max(patterns.length, 1);
  }

  #analyzeLegacyEvents(events) {
    if (!Array.isArray(events)) return 0;
    const recentEvents = events.filter(e => 
      Date.now() - e.timestamp < 3600000
    );
    return recentEvents.length > 0 ? 0.8 : 0.2;
  }

  #shouldTriggerPulse(priority) {
    return priority >= this.#pulseThresholds.bond;
  }

  #createPulse(state, priority) {
    return {
      timestamp: Date.now(),
      priority,
      state: {
        bondLevel: state.bondLevel,
        tone: state.tone,
        thinkPatterns: state.thinkPatterns.length,
        legacyEvents: state.legacyEvents.length
      },
      action: this.#determinePulseAction(priority, state)
    };
  }

  #determinePulseAction(priority, state) {
    if (priority > 0.8) return 'proactive_engagement';
    if (priority > 0.6) return 'contextual_response';
    return 'passive_observation';
  }

  analyzeAndPulse(state) {
    try {
      const priority = this.#calculatePulsePriority(state);
      
      if (this.#shouldTriggerPulse(priority)) {
        const pulse = this.#createPulse(state, priority);
        this.#pulseHistory.push(pulse);
        this.#lastPulse = pulse;
        return pulse;
      }
      
      return null;
    } catch (error) {
      console.error('Pulse analysis failed:', error);
      return null;
    }
  }

  getLastPulse() {
    return this.#lastPulse;
  }

  resetPulse() {
    this.#pulseHistory = [];
    this.#lastPulse = null;
    return true;
  }
}

// Inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const testPulse = new PrismPulse();
  
  // Test state object
  const testState = {
    tone: { intensity: 0.8, sentiment: 0.7, stability: 0.9 },
    thinkPatterns: [
      { complexity: 0.8, frequency: 0.6 },
      { complexity: 0.7, frequency: 0.5 }
    ],
    bondLevel: 0.85,
    legacyEvents: [
      { timestamp: Date.now() - 1800000 }
    ]
  };

  // Run tests
  console.assert(
    testPulse.analyzeAndPulse(testState) !== null,
    'Pulse should trigger with high priority state'
  );
  
  console.assert(
    testPulse.getLastPulse() !== null,
    'Last pulse should be stored'
  );
  
  testPulse.resetPulse();
  console.assert(
    testPulse.getLastPulse() === null,
    'Pulse history should be cleared after reset'
  );
}

export default PrismPulse; 