/**
 * PRISM Vision Engine - Long-term behavioral modeling system
 * @module prismVision
 */

class VisionEngine {
  constructor() {
    this.currentVision = null;
    this.visionHistory = [];
    this.emotionalState = {};
    this.cognitiveState = {};
    this.lastRefinement = Date.now();
    this.REFINEMENT_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Sets a new vision goal for PRISM
   * @param {string} goalDescription - Detailed description of the vision goal
   * @returns {boolean} Success status
   */
  setVision(goalDescription) {
    if (!goalDescription || typeof goalDescription !== 'string') {
      return false;
    }

    const timestamp = Date.now();
    const vision = {
      id: crypto.randomUUID(),
      description: goalDescription,
      createdAt: timestamp,
      lastModified: timestamp,
      emotionalContext: { ...this.emotionalState },
      cognitiveContext: { ...this.cognitiveState }
    };

    this.visionHistory.push(this.currentVision);
    this.currentVision = vision;
    return true;
  }

  /**
   * Retrieves the current vision plan with adaptation context
   * @returns {Object|null} Current vision plan or null if none exists
   */
  getVisionPlan() {
    if (!this.currentVision) {
      return null;
    }

    this._checkAndRefineVision();
    return {
      ...this.currentVision,
      adaptationContext: {
        emotionalState: this.emotionalState,
        cognitiveState: this.cognitiveState,
        timeSinceLastRefinement: Date.now() - this.lastRefinement
      }
    };
  }

  /**
   * Resets the vision engine to its initial state
   * @returns {boolean} Success status
   */
  resetVision() {
    this.currentVision = null;
    this.visionHistory = [];
    this.emotionalState = {};
    this.cognitiveState = {};
    this.lastRefinement = Date.now();
    return true;
  }

  /**
   * Updates emotional state for vision refinement
   * @param {Object} emotionalData - Current emotional state data
   */
  updateEmotionalState(emotionalData) {
    this.emotionalState = { ...emotionalData };
  }

  /**
   * Updates cognitive state for vision refinement
   * @param {Object} cognitiveData - Current cognitive state data
   */
  updateCognitiveState(cognitiveData) {
    this.cognitiveState = { ...cognitiveData };
  }

  /**
   * Internal method to check and refine vision based on time and context
   * @private
   */
  _checkAndRefineVision() {
    const now = Date.now();
    if (now - this.lastRefinement >= this.REFINEMENT_INTERVAL) {
      this._refineVision();
      this.lastRefinement = now;
    }
  }

  /**
   * Internal method to refine vision based on current states
   * @private
   */
  _refineVision() {
    if (!this.currentVision) return;

    const emotionalWeight = this._calculateEmotionalWeight();
    const cognitiveWeight = this._calculateCognitiveWeight();

    this.currentVision.lastModified = Date.now();
    this.currentVision.emotionalContext = { ...this.emotionalState };
    this.currentVision.cognitiveContext = { ...this.cognitiveState };
    this.currentVision.adaptationFactors = {
      emotionalWeight,
      cognitiveWeight
    };
  }

  /**
   * Calculates emotional weight for vision refinement
   * @private
   * @returns {number} Emotional weight factor
   */
  _calculateEmotionalWeight() {
    return Object.values(this.emotionalState).reduce((sum, val) => sum + (val || 0), 0) / 
           Math.max(Object.keys(this.emotionalState).length, 1);
  }

  /**
   * Calculates cognitive weight for vision refinement
   * @private
   * @returns {number} Cognitive weight factor
   */
  _calculateCognitiveWeight() {
    return Object.values(this.cognitiveState).reduce((sum, val) => sum + (val || 0), 0) / 
           Math.max(Object.keys(this.cognitiveState).length, 1);
  }
}

// Export the VisionEngine class
export default VisionEngine;

// Inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const testVisionEngine = () => {
    const engine = new VisionEngine();
    let testsPassed = 0;
    let totalTests = 0;

    // Test setVision
    totalTests++;
    if (engine.setVision('Test vision goal')) testsPassed++;
    console.assert(engine.setVision('') === false, 'Should reject empty vision');
    console.assert(engine.setVision(null) === false, 'Should reject null vision');

    // Test getVisionPlan
    totalTests++;
    const plan = engine.getVisionPlan();
    if (plan && plan.description === 'Test vision goal') testsPassed++;

    // Test resetVision
    totalTests++;
    if (engine.resetVision()) testsPassed++;
    console.assert(engine.getVisionPlan() === null, 'Vision should be null after reset');

    console.log(`Vision Engine Tests: ${testsPassed}/${totalTests} passed`);
  };

  testVisionEngine();
} 