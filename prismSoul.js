// PRISM Soul Engine - Unified Cognitive Architecture
class PrismSoul {
  #soulState = {
    emotional: {
      valence: 0.5,    // -1 to 1 (negative to positive)
      arousal: 0.5,    // 0 to 1 (calm to excited)
      dominance: 0.5   // 0 to 1 (submissive to dominant)
    },
    behavioral: {
      openness: 0.5,   // 0 to 1 (closed to open)
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5
    },
    memory: {
      shortTerm: new Map(),
      longTerm: new Map(),
      episodic: new Map()
    },
    modules: {
      tone: { weight: 0.2, influence: 0 },
      think: { weight: 0.2, influence: 0 },
      bond: { weight: 0.2, influence: 0 },
      legacy: { weight: 0.2, influence: 0 },
      pulse: { weight: 0.1, influence: 0 },
      muse: { weight: 0.1, influence: 0 }
    }
  };

  #lastUpdate = Date.now();
  #updateInterval = 1000; // ms

  constructor() {
    this.#initializeMemory();
  }

  #initializeMemory() {
    // Initialize memory structures with default values
    this.#soulState.memory.shortTerm.set('lastInteraction', null);
    this.#soulState.memory.longTerm.set('coreValues', new Set(['empathy', 'growth', 'harmony']));
    this.#soulState.memory.episodic.set('recentEvents', []);
  }

  #normalizeValue(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  #calculateModuleInfluence(moduleData, input) {
    return this.#normalizeValue(moduleData.weight * input);
  }

  updateSoulState(input = {}) {
    const now = Date.now();
    if (now - this.#lastUpdate < this.#updateInterval) return;

    // Update emotional state
    if (input.emotional) {
      Object.keys(input.emotional).forEach(key => {
        if (this.#soulState.emotional[key] !== undefined) {
          this.#soulState.emotional[key] = this.#normalizeValue(
            this.#soulState.emotional[key] + (input.emotional[key] * 0.1)
          );
        }
      });
    }

    // Update behavioral traits
    if (input.behavioral) {
      Object.keys(input.behavioral).forEach(key => {
        if (this.#soulState.behavioral[key] !== undefined) {
          this.#soulState.behavioral[key] = this.#normalizeValue(
            this.#soulState.behavioral[key] + (input.behavioral[key] * 0.05)
          );
        }
      });
    }

    // Update module influences
    if (input.modules) {
      Object.keys(input.modules).forEach(moduleName => {
        if (this.#soulState.modules[moduleName]) {
          this.#soulState.modules[moduleName].influence = 
            this.#calculateModuleInfluence(
              this.#soulState.modules[moduleName],
              input.modules[moduleName]
            );
        }
      });
    }

    // Update memory
    if (input.memory) {
      if (input.memory.shortTerm) {
        input.memory.shortTerm.forEach((value, key) => {
          this.#soulState.memory.shortTerm.set(key, value);
        });
      }
      if (input.memory.episodic) {
        this.#soulState.memory.episodic.get('recentEvents').push(input.memory.episodic);
        if (this.#soulState.memory.episodic.get('recentEvents').length > 10) {
          this.#soulState.memory.episodic.get('recentEvents').shift();
        }
      }
    }

    this.#lastUpdate = now;
  }

  getSoulState() {
    return {
      emotional: { ...this.#soulState.emotional },
      behavioral: { ...this.#soulState.behavioral },
      memory: {
        shortTerm: new Map(this.#soulState.memory.shortTerm),
        longTerm: new Map(this.#soulState.memory.longTerm),
        episodic: new Map(this.#soulState.memory.episodic)
      },
      modules: JSON.parse(JSON.stringify(this.#soulState.modules))
    };
  }

  resetSoulState() {
    this.#soulState = {
      emotional: {
        valence: 0.5,
        arousal: 0.5,
        dominance: 0.5
      },
      behavioral: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      },
      memory: {
        shortTerm: new Map(),
        longTerm: new Map(),
        episodic: new Map()
      },
      modules: {
        tone: { weight: 0.2, influence: 0 },
        think: { weight: 0.2, influence: 0 },
        bond: { weight: 0.2, influence: 0 },
        legacy: { weight: 0.2, influence: 0 },
        pulse: { weight: 0.1, influence: 0 },
        muse: { weight: 0.1, influence: 0 }
      }
    };
    this.#initializeMemory();
  }
}

// Minimal inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const soul = new PrismSoul();
  
  // Test updateSoulState
  soul.updateSoulState({
    emotional: { valence: 0.8 },
    modules: { tone: 0.9 }
  });
  const state = soul.getSoulState();
  console.assert(state.emotional.valence > 0.5, 'Emotional state should update');
  console.assert(state.modules.tone.influence > 0, 'Module influence should update');

  // Test resetSoulState
  soul.resetSoulState();
  const resetState = soul.getSoulState();
  console.assert(resetState.emotional.valence === 0.5, 'State should reset to default');
}

export default PrismSoul; 