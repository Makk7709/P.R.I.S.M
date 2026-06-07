// PRISM Mood Engine
import prismBus from './prismBus.js';
import prismCircuitBreaker from './monitoring/prismCircuitBreaker.js';
import prismLoadBalancer from './monitoring/prismLoadBalancer.js';
import prismLogger from './monitoring/prismLogger.js';

class PrismMood {
  constructor() {
    this.moods = {
      uplifting: 0.5,
      gentle: 0.5,
      neutral: 0.5,
      sad: 0.5,
      anxious: 0.5
    };
    
    this.decayRate = 0.01;
    this.maxMoodValue = 1;
    this.minMoodValue = 0;
    this.lastUpdate = Date.now();
    
    this.initializeMood();
  }

  initializeMood() {
    // Créer un circuit breaker pour l'humeur
    prismCircuitBreaker.createCircuit('mood', {
      failureThreshold: 5,
      resetTimeout: 30000
    });
    
    // Créer une file d'attente pour les événements d'humeur
    prismLoadBalancer.createQueue('mood', {
      maxQueueSize: 1000,
      batchSize: 100
    });
    
    // S'abonner aux événements de prédiction
    prismBus.on('prism:optimization:adaptation', (data) => {
      this.handleOptimizationAdaptation(data);
    });
  }

  updateMood(emotionalInput) {
    const now = Date.now();
    const timeDelta = (now - this.lastUpdate) / 1000; // Convert to seconds
    this.lastUpdate = now;

    // Apply mood decay
    Object.keys(this.moods).forEach(mood => {
      const drift = (0.5 - this.moods[mood]) * this.decayRate * timeDelta;
      this.moods[mood] = Math.max(this.minMoodValue, 
                        Math.min(this.maxMoodValue, 
                        this.moods[mood] + drift));
    });

    // Apply new emotional input
    if (emotionalInput && typeof emotionalInput === 'object') {
      Object.entries(emotionalInput).forEach(([mood, intensity]) => {
        if (Object.prototype.hasOwnProperty.call(this.moods, mood)) {
          const normalizedIntensity = Math.max(this.minMoodValue, 
                                   Math.min(this.maxMoodValue, 
                                   Number(intensity)));
          this.moods[mood] = normalizedIntensity;
        }
      });
    }

    // Ajouter l'événement à la file d'attente
    prismLoadBalancer.enqueue('mood', {
      type: 'update',
      emotionalInput,
      moods: { ...this.moods },
      timestamp: now
    });

    return this.getCurrentMood();
  }

  getCurrentMood() {
    const dominantMood = Object.entries(this.moods)
      .reduce((max, [mood, value]) => 
        value > max.value ? { mood, value } : max,
        { mood: 'neutral', value: -1 }
      );
    
    return {
      dominant: dominantMood.mood,
      intensity: dominantMood.value,
      allMoods: { ...this.moods }
    };
  }

  resetMood() {
    Object.keys(this.moods).forEach(mood => {
      this.moods[mood] = 0.5;
    });
    this.lastUpdate = Date.now();
    
    // Logger la réinitialisation de l'humeur
    prismLogger.info('Mood reset', { moods: { ...this.moods } });
    
    return this.getCurrentMood();
  }

  async handleOptimizationAdaptation(data) {
    try {
      // Exécuter l'adaptation via le circuit breaker
      await prismCircuitBreaker.execute('mood', async () => {
        const { type, prediction, adaptation } = data;
        
        // Appliquer l'adaptation en fonction du type
        switch (type) {
          case 'performance':
            await this.adaptPerformance(adaptation);
            break;
          case 'stability':
            await this.adaptStability(adaptation);
            break;
          case 'load':
            await this.adaptLoad(adaptation);
            break;
        }
        
        // Logger l'adaptation
        prismLogger.logAdjustment(type, { prediction, adaptation });
      });
    } catch (error) {
      prismLogger.error('Optimization adaptation failed', { error });
    }
  }

  async adaptPerformance(adaptation) {
    const { thresholds } = adaptation;
    
    // Ajuster les paramètres de performance
    if (thresholds.responseTime < 200) {
      this.moods.anxious = Math.min(this.maxMoodValue, this.moods.anxious + 0.1);
    } else if (thresholds.responseTime > 300) {
      this.moods.uplifting = Math.min(this.maxMoodValue, this.moods.uplifting + 0.1);
    } else {
      this.moods.neutral = Math.min(this.maxMoodValue, this.moods.neutral + 0.1);
    }
  }

  async adaptStability(adaptation) {
    const { parameters } = adaptation;
    
    // Ajuster les paramètres de stabilité
    if (parameters.checkInterval < 1000) {
      this.moods.gentle = Math.min(this.maxMoodValue, this.moods.gentle + 0.1);
    } else if (parameters.checkInterval > 2000) {
      this.moods.uplifting = Math.min(this.maxMoodValue, this.moods.uplifting + 0.1);
    } else {
      this.moods.neutral = Math.min(this.maxMoodValue, this.moods.neutral + 0.1);
    }
  }

  async adaptLoad(adaptation) {
    const { parameters } = adaptation;
    
    // Ajuster les paramètres de charge
    if (parameters.batchSize < 50) {
      this.moods.anxious = Math.min(this.maxMoodValue, this.moods.anxious + 0.1);
    } else if (parameters.batchSize > 150) {
      this.moods.uplifting = Math.min(this.maxMoodValue, this.moods.uplifting + 0.1);
    } else {
      this.moods.neutral = Math.min(this.maxMoodValue, this.moods.neutral + 0.1);
    }
  }
}

// Inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const moodEngine = new PrismMood();
  
  // Test 1: Initial state
  console.assert(moodEngine.getCurrentMood().dominant === 'neutral', 
    'Initial dominant mood should be neutral');
  
  // Test 2: Mood update
  moodEngine.updateMood({ uplifting: 0.8 });
  console.assert(moodEngine.getCurrentMood().dominant === 'uplifting', 
    'Mood should update to uplifting');
  
  // Test 3: Mood reset
  moodEngine.resetMood();
  console.assert(moodEngine.getCurrentMood().dominant === 'neutral', 
    'Mood should reset to neutral');
  
  // Test 4: Mood drift
  const _initialMood = moodEngine.getCurrentMood().allMoods.uplifting;
  moodEngine.updateMood({ uplifting: 0.9 });
  setTimeout(() => {
    const driftedMood = moodEngine.getCurrentMood().allMoods.uplifting;
    console.assert(driftedMood < 0.9, 
      'Mood should drift over time');
  }, 1000);
}

export default PrismMood; 