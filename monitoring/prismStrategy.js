import kernelBus from '../core/KernelBus.js';

/**
 * @class PrismStrategy
 * @description Orchestrates global adaptation strategies based on emotional, adaptive, and regulatory signals
 * @version 1.1.0
 */
class PrismStrategy {
  constructor() {
    this.version = '1.1.0';
    this.events = kernelBus;
    this.currentStrategy = null;
    this.lastPlanTimestamp = null;
    this.MAX_HISTORY_LENGTH = 500;
  }

  /**
   * Synthesizes signals from emotion, adaptation, and regulation modules
   * @param {Array} emotionStateHistory - Historical emotional states
   * @param {Array} adaptationHistory - Historical adaptation scores
   * @param {Array} regulationHistory - Historical regulation states
   * @returns {Object} Synthesized context for strategy definition
   */
  synthesizeSignals(emotionStateHistory, adaptationHistory, regulationHistory) {
    // Validate inputs
    if (!this._validateHistory(emotionStateHistory) || 
        !this._validateHistory(adaptationHistory) || 
        !this._validateHistory(regulationHistory)) {
      throw new Error('Invalid history input: must be a non-empty array');
    }

    // Trim histories if they exceed maximum length
    const trimmedEmotionHistory = this._trimHistory(emotionStateHistory);
    const trimmedAdaptationHistory = this._trimHistory(adaptationHistory);
    const trimmedRegulationHistory = this._trimHistory(regulationHistory);

    const context = {
      emotionalTrend: this._analyzeEmotionalTrend(trimmedEmotionHistory),
      adaptationScore: this._analyzeAdaptationScore(trimmedAdaptationHistory),
      regulationAnomalies: this._detectRegulationAnomalies(trimmedRegulationHistory),
      timestamp: Date.now()
    };

    this.events.emit('prism:strategy:contextSynthesized', context);
    return context;
  }

  /**
   * Defines the global strategy based on synthesized context
   * @param {Object} context - Synthesized context from signals
   * @returns {string} Strategy type: 'exploration' | 'reinforcement' | 'reset'
   */
  defineStrategy(context) {
    const { emotionalTrend, adaptationScore, regulationAnomalies } = context;

    if (regulationAnomalies.length > 0 || emotionalTrend.volatility > 0.8) {
      return 'reset';
    }

    if (adaptationScore > 0.7 && emotionalTrend.stability > 0.6) {
      return 'reinforcement';
    }

    return 'exploration';
  }

  /**
   * Plans actions based on the defined strategy
   * @param {string} strategy - Current strategy type
   * @returns {Array} Array of planned actions
   */
  planActions(strategy) {
    const plan = [];
    const timestamp = Date.now();

    switch (strategy) {
      case 'exploration':
        plan.push(
          { module: 'emotion', action: 'expandEmotionalRange', priority: 'medium' },
          { module: 'memory', action: 'increaseLearningRate', priority: 'high' },
          { module: 'sentience', action: 'enableNoveltyDetection', priority: 'medium' }
        );
        break;
      case 'reinforcement':
        plan.push(
          { module: 'emotion', action: 'stabilizeEmotionalState', priority: 'high' },
          { module: 'memory', action: 'consolidateLearning', priority: 'medium' },
          { module: 'sentience', action: 'reinforcePatterns', priority: 'high' }
        );
        break;
      case 'reset':
        plan.push(
          { module: 'emotion', action: 'resetEmotionalState', priority: 'critical' },
          { module: 'memory', action: 'clearTemporaryData', priority: 'high' },
          { module: 'sentience', action: 'recalibrateSensors', priority: 'critical' }
        );
        break;
    }

    this.lastPlanTimestamp = timestamp;
    this.events.emit('prism:strategy:planGenerated', {
      strategy,
      plan,
      timestamp
    });

    return plan;
  }

  /**
   * Analyzes emotional trend from history
   * @private
   * @param {Array} history - Emotional state history
   * @returns {Object} Emotional trend analysis
   */
  _analyzeEmotionalTrend(history) {
    // Implementation of emotional trend analysis
    return {
      stability: this._calculateStability(history),
      volatility: this._calculateVolatility(history),
      dominantEmotion: this._findDominantEmotion(history)
    };
  }

  /**
   * Analyzes adaptation score from history
   * @private
   * @param {Array} history - Adaptation history
   * @returns {number} Normalized adaptation score
   */
  _analyzeAdaptationScore(history) {
    // Implementation of adaptation score analysis
    return history.reduce((acc, curr) => acc + curr.score, 0) / history.length;
  }

  /**
   * Detects anomalies in regulation history
   * @private
   * @param {Array} history - Regulation history
   * @returns {Array} Detected anomalies
   */
  _detectRegulationAnomalies(history) {
    // Implementation of regulation anomaly detection
    return history.filter(state => state.anomalyScore > 0.7);
  }

  /**
   * Calculates stability score from history
   * @private
   * @param {Array} history - State history
   * @returns {number} Stability score between 0 and 1
   */
  _calculateStability(history) {
    if (!history.length) return 0;
    
    const calmPhases = history.filter(state => 
      state.emotion === 'calm' || state.emotion === 'neutral'
    ).length;
    
    return calmPhases / history.length;
  }

  /**
   * Calculates volatility score from history
   * @private
   * @param {Array} history - State history
   * @returns {number} Volatility score between 0 and 1
   */
  _calculateVolatility(history) {
    if (history.length < 2) return 0;
    
    let changes = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].emotion !== history[i-1].emotion) {
        changes++;
      }
    }
    
    return changes / (history.length - 1);
  }

  /**
   * Finds dominant emotion in history
   * @private
   * @param {Array} history - Emotional state history
   * @returns {string} Dominant emotion
   */
  _findDominantEmotion(history) {
    if (!history.length) return 'neutral';
    
    const emotionCounts = history.reduce((acc, state) => {
      acc[state.emotion] = (acc[state.emotion] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(emotionCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  /**
   * Validates history input
   * @private
   * @param {Array} history - History to validate
   * @returns {boolean} Whether the history is valid
   */
  _validateHistory(history) {
    return Array.isArray(history) && history.length > 0;
  }

  /**
   * Trims history to maximum length
   * @private
   * @param {Array} history - History to trim
   * @returns {Array} Trimmed history
   */
  _trimHistory(history) {
    if (history.length <= this.MAX_HISTORY_LENGTH) {
      return history;
    }
    
    this.events.emit('prism:strategy:historyTrimmed', {
      originalLength: history.length,
      newLength: this.MAX_HISTORY_LENGTH,
      timestamp: Date.now()
    });
    
    return history.slice(-this.MAX_HISTORY_LENGTH);
  }
}

export default PrismStrategy; 