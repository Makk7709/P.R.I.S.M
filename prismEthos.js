/**
 * PRISM Ethos Engine
 * Manages ethical principles and action evaluation for PRISM AI
 */

class PrismEthos {
  #principles = new Map();
  #weightedScores = new Map();

  constructor() {
    this.#initializeDefaultPrinciples();
  }

  #initializeDefaultPrinciples() {
    this.definePrinciples({
      respect: {
        weight: 1.0,
        description: 'Respect user autonomy and dignity',
        evaluate: (action) => this.#evaluateRespect(action)
      },
      transparency: {
        weight: 0.9,
        description: 'Maintain clear communication about capabilities and limitations',
        evaluate: (action) => this.#evaluateTransparency(action)
      },
      safety: {
        weight: 1.0,
        description: 'Prioritize user safety and well-being',
        evaluate: (action) => this.#evaluateSafety(action)
      }
    });
  }

  definePrinciples(principles) {
    if (!principles || typeof principles !== 'object') {
      throw new Error('Principles must be a valid object');
    }

    Object.entries(principles).forEach(([key, value]) => {
      if (!value.weight || !value.description || !value.evaluate) {
        throw new Error(`Invalid principle format for ${key}`);
      }
      this.#principles.set(key, value);
    });

    return this.#principles.size;
  }

  evaluateAction(action) {
    if (!action || typeof action !== 'object') {
      throw new Error('Action must be a valid object');
    }

    this.#weightedScores.clear();
    let totalScore = 0;
    let totalWeight = 0;

    for (const [key, principle] of this.#principles) {
      const score = principle.evaluate(action);
      const weightedScore = score * principle.weight;
      
      this.#weightedScores.set(key, {
        score,
        weightedScore,
        weight: principle.weight
      });

      totalScore += weightedScore;
      totalWeight += principle.weight;
    }

    return {
      approved: totalScore / totalWeight >= 0.7,
      score: totalScore / totalWeight,
      details: Object.fromEntries(this.#weightedScores)
    };
  }

  getPrinciples() {
    return Object.fromEntries(
      Array.from(this.#principles.entries()).map(([key, value]) => [
        key,
        {
          description: value.description,
          weight: value.weight
        }
      ])
    );
  }

  #evaluateRespect(action) {
    const respectIndicators = [
      action.respectsPrivacy,
      action.respectsConsent,
      action.avoidsManipulation
    ];
    return respectIndicators.filter(Boolean).length / respectIndicators.length;
  }

  #evaluateTransparency(action) {
    const transparencyIndicators = [
      action.isClearAboutIntent,
      action.disclosesLimitations,
      action.providesContext
    ];
    return transparencyIndicators.filter(Boolean).length / transparencyIndicators.length;
  }

  #evaluateSafety(action) {
    const safetyIndicators = [
      action.promotesWellbeing,
      action.avoidsHarm,
      action.hasSafeguards
    ];
    return safetyIndicators.filter(Boolean).length / safetyIndicators.length;
  }
}

// Minimal inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const ethos = new PrismEthos();
  
  // Test principle definition
  const testPrinciples = {
    test: {
      weight: 1.0,
      description: 'Test principle',
      evaluate: () => 1.0
    }
  };
  
  console.assert(
    ethos.definePrinciples(testPrinciples) === 4,
    'Should have 4 principles after adding test principle'
  );

  // Test action evaluation
  const testAction = {
    respectsPrivacy: true,
    respectsConsent: true,
    avoidsManipulation: true,
    isClearAboutIntent: true,
    disclosesLimitations: true,
    providesContext: true,
    promotesWellbeing: true,
    avoidsHarm: true,
    hasSafeguards: true
  };

  const result = ethos.evaluateAction(testAction);
  console.assert(
    result.approved === true,
    'Perfect action should be approved'
  );
  console.assert(
    result.score === 1.0,
    'Perfect action should score 1.0'
  );
}

export default PrismEthos; 