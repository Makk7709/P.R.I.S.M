// PRISM Fusion Orchestrator
// Manages synchronization and interaction between PRISM cognitive engines

class PrismFusion {
  constructor() {
    this.engines = {
      mood: null,
      vision: null,
      energy: null,
      chronicle: null,
      ethos: null
    };
    
    this.fusionState = {
      isActive: false,
      lastAnalysis: null,
      eventListeners: new Map()
    };
  }

  async startFusion() {
    try {
      // Initialize all engines
      this.engines.mood = new PrismMood();
      this.engines.vision = new PrismVision();
      this.engines.energy = new PrismEnergy();
      this.engines.chronicle = new PrismChronicle();
      this.engines.ethos = new PrismEthos();

      // Set up cross-engine event listeners
      this._setupEventListeners();
      
      // Start individual engines
      await Promise.all([
        this.engines.mood.initialize(),
        this.engines.vision.initialize(),
        this.engines.energy.initialize(),
        this.engines.chronicle.initialize(),
        this.engines.ethos.initialize()
      ]);

      this.fusionState.isActive = true;
      this._emitFusionEvent('fusion:started', { timestamp: Date.now() });
      
      return true;
    } catch (error) {
      console.error('Fusion initialization failed:', error);
      return false;
    }
  }

  async analyzeSystemState() {
    if (!this.fusionState.isActive) {
      throw new Error('Fusion system not active');
    }

    const state = {
      timestamp: Date.now(),
      engines: {},
      interactions: []
    };

    // Collect individual engine states
    for (const [name, engine] of Object.entries(this.engines)) {
      state.engines[name] = await engine.getState();
    }

    // Analyze cross-engine interactions
    state.interactions = this._analyzeInteractions(state.engines);
    
    // Store last analysis
    this.fusionState.lastAnalysis = state;
    
    // Emit fusion event
    this._emitFusionEvent('fusion:analyzed', state);
    
    return state;
  }

  _setupEventListeners() {
    // Energy influences Mood
    this.engines.energy.on('energy:changed', (level) => {
      if (level < 0.3) {
        this.engines.mood.adjustMood(-0.1);
      }
    });

    // Chronicle influences Vision
    this.engines.chronicle.on('chronicle:stress', (stressLevel) => {
      if (stressLevel > 0.7) {
        this.engines.vision.adjustClarity(-0.15);
      }
    });

    // Ethos influences all engines
    this.engines.ethos.on('ethos:shift', (values) => {
      Object.values(this.engines).forEach(engine => {
        if (engine !== this.engines.ethos) {
          engine.adjustToEthos(values);
        }
      });
    });
  }

  _analyzeInteractions(engineStates) {
    const interactions = [];
    
    // Analyze energy-mood correlation
    if (engineStates.energy.level < 0.3 && engineStates.mood.value < 0.4) {
      interactions.push({
        type: 'energy-mood',
        severity: 'high',
        description: 'Low energy significantly impacting mood'
      });
    }

    // Analyze chronicle-vision stress
    if (engineStates.chronicle.stressLevel > 0.7 && engineStates.vision.clarity < 0.5) {
      interactions.push({
        type: 'chronicle-vision',
        severity: 'medium',
        description: 'Chronic stress affecting visual processing'
      });
    }

    return interactions;
  }

  _emitFusionEvent(type, data) {
    const event = new CustomEvent('prismFusionEvent', {
      detail: { type, data, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }
}

// Minimal inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const fusion = new PrismFusion();
  
  // Test initialization
  fusion.startFusion().then(success => {
    console.assert(success === true, 'Fusion should initialize successfully');
  });

  // Test system analysis
  fusion.analyzeSystemState().then(state => {
    console.assert(state.engines !== undefined, 'System state should include engine states');
    console.assert(Array.isArray(state.interactions), 'System state should include interactions');
  });
}

export default PrismFusion; 