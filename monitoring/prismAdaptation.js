/**
 * PRISM Adaptation Module
 * Monitors and adjusts system behavior based on emotional patterns and user interactions
 * 
 * @class PrismAdaptation
 * @version 1.1.0
 */

import { KernelBus } from '../core/kernelBus.js';

const DEBUG = process.env.NODE_ENV === 'development';

class PrismAdaptation {
  /**
   * Creates a new PrismAdaptation instance
   * @constructor
   */
  constructor() {
    /**
     * Adaptation thresholds that determine system behavior
     * @type {Object}
     * @property {number} stable - Threshold below which system maintains stable behavior (0.3)
     * @property {number} critical - Threshold above which system enters critical adaptation mode (0.7)
     * 
     * Impact on system behavior:
     * - Below stable (0.3): System maintains conservative parameters
     *   - Reduced sensitivity to changes
     *   - Higher response threshold
     *   - Faster recovery from disturbances
     * 
     * - Between stable and critical: System adapts dynamically
     *   - Balanced sensitivity
     *   - Moderate response threshold
     *   - Standard recovery rate
     * 
     * - Above critical (0.7): System enters high-alert mode
     *   - Increased sensitivity to changes
     *   - Lower response threshold
     *   - Slower recovery to prevent oscillation
     */
    this.version = '1.1.1';
    this.kernelBus = new KernelBus();
    this.adaptationThresholds = {
      stable: 0.3,
      critical: 0.7
    };
  }

  /**
   * Analyzes emotional transition history to identify patterns and calculate adaptation score
   * @param {Array} transitionHistory - Array of emotional transition records
   * @returns {Object} Analysis results including score and identified pattern
   */
  analyzeEmotionTrends(transitionHistory) {
    if (!transitionHistory || transitionHistory.length === 0) {
      return { score: 0, pattern: 'stable' };
    }

    const patterns = {
      stabilization: 0,
      escalation: 0,
      drift: 0
    };

    let previousIntensity = null;
    let consecutiveChanges = 0;
    let maxConsecutiveChanges = 0;

    transitionHistory.forEach((transition, _index) => {
      const currentIntensity = transition.intensity;
      
      if (previousIntensity !== null) {
        const change = Math.abs(currentIntensity - previousIntensity);
        
        if (change < 0.1) {  // Reduced threshold for stabilization
          patterns.stabilization++;
          consecutiveChanges = 0;
        } else if (change > 0.2) {  // Lowered threshold for escalation
          patterns.escalation++;
          consecutiveChanges++;
        } else {
          patterns.drift++;
          consecutiveChanges++;
        }

        maxConsecutiveChanges = Math.max(maxConsecutiveChanges, consecutiveChanges);
      }

      previousIntensity = currentIntensity;
    });

    const totalTransitions = transitionHistory.length;
    const score = this.calculateAdaptationScore(patterns, totalTransitions, maxConsecutiveChanges);
    const pattern = this.identifyDominantPattern(patterns);

    if (DEBUG) {
      console.log(`🔍 Pattern analysis:`, {
        patterns,
        totalTransitions,
        maxConsecutiveChanges,
        score,
        pattern
      });
    }

    return { score, pattern };
  }

  /**
   * Calculates adaptation score based on pattern analysis
   * @private
   */
  calculateAdaptationScore(patterns, totalTransitions, maxConsecutiveChanges) {
    const patternWeights = {
      stabilization: 0.1,  // Reduced weight for stabilization
      escalation: 0.7,    // Increased weight for escalation
      drift: 0.2          // Reduced weight for drift
    };

    const patternScore = (
      (patterns.stabilization * patternWeights.stabilization) +
      (patterns.escalation * patternWeights.escalation) +
      (patterns.drift * patternWeights.drift)
    ) / totalTransitions;

    const consecutiveChangeFactor = Math.min(maxConsecutiveChanges / 3, 1);
    
    return Math.min(patternScore + (consecutiveChangeFactor * 0.3), 1);
  }

  /**
   * Identifies the dominant emotional pattern
   * @private
   */
  identifyDominantPattern(patterns) {
    const totalPatterns = patterns.stabilization + patterns.escalation + patterns.drift;
    
    // Calculate pattern ratios
    const ratios = {
      stabilization: patterns.stabilization / totalPatterns,
      escalation: patterns.escalation / totalPatterns,
      drift: patterns.drift / totalPatterns
    };

    if (DEBUG) {
      console.log('Pattern ratios:', ratios);
    }

    // Pattern detection thresholds
    if (ratios.escalation >= 0.3) {  // Lowered threshold for escalation
      return 'escalation';
    } else if (ratios.drift >= 0.5) {  // Increased threshold for drift
      return 'drift';
    } else {
      return 'stabilization';
    }
  }

  /**
   * Adjusts adaptation parameters based on the calculated score
   * @param {number} score - Adaptation score between 0 and 1
   * @returns {Object} Updated adaptation parameters
   */
  adjustAdaptationParameters(score) {
    const strategy = this._determineStrategy(score);
    const parameters = this._calculateParameters(strategy, score);
    
    if (DEBUG) {
      console.log(`🎯 Stratégie adaptative sélectionnée : ${strategy} — Score : ${score.toFixed(2)}`);
    }
    
    this.emitStrategyUpdate(score, strategy);
    return parameters;
  }

  /**
   * Emits strategy update event via KernelBus
   * @private
   */
  emitStrategyUpdate(score, strategy) {
    const payload = {
      score,
      strategy,
      timestamp: new Date().toISOString()
    };

    this.kernelBus.publish('prism:adaptation:strategyUpdated', payload);
  }

  _determineStrategy(score) {
    if (score < this.adaptationThresholds.stable) {
      return 'stable';
    } else if (score > this.adaptationThresholds.critical) {
      return 'critical';
    } else {
      return 'adaptive';
    }
  }

  _calculateParameters(strategy, _score) {
    let parameters = {};

    if (strategy === 'stable') {
      parameters = {
        sensitivityMultiplier: 0.8,
        responseThreshold: 0.6,
        recoveryRate: 1.2
      };
    } else if (strategy === 'critical') {
      parameters = {
        sensitivityMultiplier: 1.5,
        responseThreshold: 0.3,
        recoveryRate: 0.8
      };
    } else {
      parameters = {
        sensitivityMultiplier: 1.0,
        responseThreshold: 0.5,
        recoveryRate: 1.0
      };
    }

    return parameters;
  }
}

// Export singleton instance
const prismAdaptation = new PrismAdaptation();
export default prismAdaptation; 