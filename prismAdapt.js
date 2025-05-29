// PRISM Adaptation Engine
// Monitors and adjusts system behavior based on user interaction patterns

import prismBus from './prismBus.js';
import prismPredictiveOptimization from './monitoring/prismPredictiveOptimization.js';
import prismCircuitBreaker from './monitoring/prismCircuitBreaker.js';
import prismLoadBalancer from './monitoring/prismLoadBalancer.js';
import prismLogger from './monitoring/prismLogger.js';

const DEFAULT_STATE = {
  frequencyModifier: "normal",
  toneModifier: "neutral",
  lastAdjustment: null,
  observationCount: 0,
  successStreak: 0,
  errorStreak: 0,
  inactivityCount: 0
};

class PrismAdaptationEngine {
  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.adaptationHistory = [];
    this.maxHistoryLength = 50;
    this.initializeAdaptation();
  }

  initializeAdaptation() {
    // Créer un circuit breaker pour l'adaptation
    prismCircuitBreaker.createCircuit('adaptation', {
      failureThreshold: 5,
      resetTimeout: 30000
    });
    
    // Créer une file d'attente pour les événements d'adaptation
    prismLoadBalancer.createQueue('adaptation', {
      maxQueueSize: 1000,
      batchSize: 100
    });
    
    // S'abonner aux événements de prédiction
    prismBus.on('prism:optimization:adaptation', (data) => {
      this.handleOptimizationAdaptation(data);
    });
  }

  observeAndAdapt(context) {
    const { error, success, inactivity, timestamp } = context;
    
    // Update observation metrics
    this.state.observationCount++;
    
    if (error) {
      this.state.errorStreak++;
      this.state.successStreak = 0;
      this._adjustForError();
    } else if (success) {
      this.state.successStreak++;
      this.state.errorStreak = 0;
      this._adjustForSuccess();
    } else if (inactivity) {
      this.state.inactivityCount++;
      this._adjustForInactivity();
    }

    // Record adaptation
    this._recordAdaptation(timestamp);
    
    // Ajouter l'événement à la file d'attente
    prismLoadBalancer.enqueue('adaptation', {
      type: 'observation',
      context,
      state: { ...this.state }
    });
    
    return this.getCurrentAdaptation();
  }

  getCurrentAdaptation() {
    return {
      frequencyModifier: this.state.frequencyModifier,
      toneModifier: this.state.toneModifier,
      lastAdjustment: this.state.lastAdjustment,
      metrics: {
        observationCount: this.state.observationCount,
        successStreak: this.state.successStreak,
        errorStreak: this.state.errorStreak,
        inactivityCount: this.state.inactivityCount
      }
    };
  }

  resetAdaptation() {
    this.state = { ...DEFAULT_STATE };
    this.adaptationHistory = [];
    return this.getCurrentAdaptation();
  }

  _adjustForError() {
    if (this.state.errorStreak >= 3) {
      this.state.frequencyModifier = "high";
      this.state.toneModifier = "gentle";
    } else if (this.state.errorStreak >= 1) {
      this.state.frequencyModifier = "normal";
      this.state.toneModifier = "neutral";
    }
    this.state.lastAdjustment = 'error';
  }

  _adjustForSuccess() {
    if (this.state.successStreak >= 5) {
      this.state.frequencyModifier = "low";
      this.state.toneModifier = "uplifting";
    } else if (this.state.successStreak >= 1) {
      this.state.frequencyModifier = "normal";
      this.state.toneModifier = "neutral";
    }
    this.state.lastAdjustment = 'success';
  }

  _adjustForInactivity() {
    if (this.state.inactivityCount >= 3) {
      this.state.frequencyModifier = "normal";
      this.state.toneModifier = "neutral";
    }
    this.state.lastAdjustment = 'inactivity';
  }

  _recordAdaptation(timestamp) {
    this.adaptationHistory.push({
      timestamp,
      state: { ...this.state }
    });
    
    if (this.adaptationHistory.length > this.maxHistoryLength) {
      this.adaptationHistory.shift();
    }
  }

  async handleOptimizationAdaptation(data) {
    try {
      // Exécuter l'adaptation via le circuit breaker
      await prismCircuitBreaker.execute('adaptation', async () => {
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
      this.state.frequencyModifier = "high";
    } else if (thresholds.responseTime > 300) {
      this.state.frequencyModifier = "low";
    } else {
      this.state.frequencyModifier = "normal";
    }
    
    this.state.lastAdjustment = 'performance';
  }

  async adaptStability(adaptation) {
    const { parameters } = adaptation;
    
    // Ajuster les paramètres de stabilité
    if (parameters.checkInterval < 1000) {
      this.state.toneModifier = "gentle";
    } else if (parameters.checkInterval > 2000) {
      this.state.toneModifier = "uplifting";
    } else {
      this.state.toneModifier = "neutral";
    }
    
    this.state.lastAdjustment = 'stability';
  }

  async adaptLoad(adaptation) {
    const { parameters } = adaptation;
    
    // Ajuster les paramètres de charge
    if (parameters.batchSize < 50) {
      this.state.frequencyModifier = "high";
    } else if (parameters.batchSize > 150) {
      this.state.frequencyModifier = "low";
    } else {
      this.state.frequencyModifier = "normal";
    }
    
    this.state.lastAdjustment = 'load';
  }
}

// Export singleton instance
export const prismAdapt = new PrismAdaptationEngine();

// Inline tests
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe('PrismAdaptationEngine', () => {
    it('should initialize with default state', () => {
      const engine = new PrismAdaptationEngine();
      expect(engine.getCurrentAdaptation().frequencyModifier).toBe("normal");
      expect(engine.getCurrentAdaptation().toneModifier).toBe("neutral");
    });

    it('should adjust for errors', () => {
      const engine = new PrismAdaptationEngine();
      engine.observeAndAdapt({ error: true, timestamp: Date.now() });
      expect(engine.getCurrentAdaptation().frequencyModifier).toBe("normal");
      expect(engine.getCurrentAdaptation().toneModifier).toBe("neutral");
    });

    it('should reset to default state', () => {
      const engine = new PrismAdaptationEngine();
      engine.observeAndAdapt({ error: true, timestamp: Date.now() });
      engine.resetAdaptation();
      expect(engine.getCurrentAdaptation().frequencyModifier).toBe("normal");
      expect(engine.getCurrentAdaptation().toneModifier).toBe("neutral");
    });
  });
}

// Inline Mini-Tests PrismAdapt.js

(function testPrismAdaptation() {
  const testContextError = { errors: 3, successes: 0, inactivity: false };
  const testContextSuccess = { errors: 0, successes: 5, inactivity: false };
  const testContextInactivity = { errors: 0, successes: 0, inactivity: true };

  // Test Error Pattern
  prismAdapt.observeAndAdapt(testContextError);
  console.assert(prismAdapt.getCurrentAdaptation().frequencyModifier === "high", "Error pattern failed (frequencyModifier)");
  console.assert(prismAdapt.getCurrentAdaptation().toneModifier === "gentle", "Error pattern failed (toneModifier)");

  // Reset before next test
  prismAdapt.resetAdaptation();

  // Test Success Pattern
  prismAdapt.observeAndAdapt(testContextSuccess);
  console.assert(prismAdapt.getCurrentAdaptation().frequencyModifier === "low", "Success pattern failed (frequencyModifier)");
  console.assert(prismAdapt.getCurrentAdaptation().toneModifier === "uplifting", "Success pattern failed (toneModifier)");

  // Reset before next test
  prismAdapt.resetAdaptation();

  // Test Inactivity Pattern
  prismAdapt.observeAndAdapt(testContextInactivity);
  console.assert(prismAdapt.getCurrentAdaptation().frequencyModifier === "normal", "Inactivity pattern failed (frequencyModifier)");
  console.assert(prismAdapt.getCurrentAdaptation().toneModifier === "neutral", "Inactivity pattern failed (toneModifier)");

  console.log("✅ PrismAdapt.js mini-tests passed.");
})(); 