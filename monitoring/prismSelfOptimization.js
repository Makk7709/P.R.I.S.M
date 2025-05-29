import kernelBus from '../core/KernelBus.js';
import PrismStorage from '../prismStorage.js';

/**
 * @class PrismSelfOptimization
 * @description Module responsible for long-term performance monitoring and self-optimization of PRISM
 * @version 1.0.0
 */
class PrismSelfOptimization {
  constructor() {
    this.storage = new PrismStorage();
    this.version = '1.0.0';
    this.optimizationHistory = [];
    this.performanceMetrics = {
      emotionalStability: [],
      adaptiveEfficiency: [],
      strategicEfficiency: []
    };
    
    // Initialize event listeners
    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners for performance metrics
   * @private
   */
  initializeEventListeners() {
    kernelBus.on('prism:emotion:stability', this.handleEmotionalStability.bind(this));
    kernelBus.on('prism:adaptation:efficiency', this.handleAdaptiveEfficiency.bind(this));
    kernelBus.on('prism:strategy:efficiency', this.handleStrategicEfficiency.bind(this));
  }

  /**
   * Handle emotional stability metrics
   * @param {Object} data - Emotional stability data
   * @private
   */
  handleEmotionalStability(data) {
    this.performanceMetrics.emotionalStability.push({
      value: data.stability,
      timestamp: Date.now()
    });
    this.observeLongTermPerformance();
  }

  /**
   * Handle adaptive efficiency metrics
   * @param {Object} data - Adaptive efficiency data
   * @private
   */
  handleAdaptiveEfficiency(data) {
    this.performanceMetrics.adaptiveEfficiency.push({
      value: data.efficiency,
      timestamp: Date.now()
    });
    this.observeLongTermPerformance();
  }

  /**
   * Handle strategic efficiency metrics
   * @param {Object} data - Strategic efficiency data
   * @private
   */
  handleStrategicEfficiency(data) {
    this.performanceMetrics.strategicEfficiency.push({
      value: data.efficiency,
      timestamp: Date.now()
    });
    this.observeLongTermPerformance();
  }

  /**
   * Analyze long-term performance trends
   * @param {Object} metricHistory - Optional metric history to analyze
   * @returns {Object} Analysis results
   */
  observeLongTermPerformance(metricHistory = this.performanceMetrics) {
    const analysis = {
      emotionalStability: this.analyzeMetricTrend(metricHistory.emotionalStability),
      adaptiveEfficiency: this.analyzeMetricTrend(metricHistory.adaptiveEfficiency),
      strategicEfficiency: this.analyzeMetricTrend(metricHistory.strategicEfficiency)
    };

    const opportunities = this.detectOptimizationOpportunities(analysis);
    if (opportunities.length > 0) {
      this.applySelfOptimizations(opportunities);
    }

    return analysis;
  }

  /**
   * Analyze trend for a specific metric
   * @param {Array} metricData - Array of metric values with timestamps
   * @returns {Object} Trend analysis
   * @private
   */
  analyzeMetricTrend(metricData) {
    if (metricData.length < 2) return { trend: 'insufficient_data' };

    const recentValues = metricData.slice(-10);
    const trend = this.calculateTrend(recentValues);
    
    return {
      trend,
      currentValue: recentValues[recentValues.length - 1].value,
      averageValue: this.calculateAverage(recentValues),
      volatility: this.calculateVolatility(recentValues)
    };
  }

  /**
   * Calculate trend direction from metric values
   * @param {Array} values - Array of metric values
   * @returns {string} Trend direction
   * @private
   */
  calculateTrend(values) {
    const slopes = [];
    for (let i = 1; i < values.length; i++) {
      const slope = values[i].value - values[i-1].value;
      slopes.push(slope);
    }
    
    const averageSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
    
    if (averageSlope > 0.1) return 'improving';
    if (averageSlope < -0.1) return 'degrading';
    return 'stable';
  }

  /**
   * Calculate average of metric values
   * @param {Array} values - Array of metric values
   * @returns {number} Average value
   * @private
   */
  calculateAverage(values) {
    return values.reduce((sum, item) => sum + item.value, 0) / values.length;
  }

  /**
   * Calculate volatility of metric values
   * @param {Array} values - Array of metric values
   * @returns {number} Volatility value
   * @private
   */
  calculateVolatility(values) {
    const avg = this.calculateAverage(values);
    const squaredDiffs = values.map(item => Math.pow(item.value - avg, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Detect optimization opportunities based on performance analysis
   * @returns {Array} Array of optimization opportunities
   */
  detectOptimizationOpportunities(analysis) {
    const opportunities = [];

    // Check emotional stability
    if (analysis.emotionalStability.trend === 'degrading') {
      opportunities.push({
        type: 'emotional_threshold',
        parameter: 'stability_threshold',
        adjustment: this.calculateThresholdAdjustment(analysis.emotionalStability)
      });
    }

    // Check adaptive efficiency
    if (analysis.adaptiveEfficiency.trend === 'degrading') {
      opportunities.push({
        type: 'adaptive_sensitivity',
        parameter: 'adaptation_sensitivity',
        adjustment: this.calculateSensitivityAdjustment(analysis.adaptiveEfficiency)
      });
    }

    // Check strategic efficiency
    if (analysis.strategicEfficiency.trend === 'degrading') {
      opportunities.push({
        type: 'strategy_reset_cycle',
        parameter: 'reset_cycle_duration',
        adjustment: this.calculateCycleAdjustment(analysis.strategicEfficiency)
      });
    }

    return opportunities;
  }

  /**
   * Calculate threshold adjustment for emotional stability
   * @param {Object} analysis - Emotional stability analysis
   * @returns {number} Adjustment value
   * @private
   */
  calculateThresholdAdjustment(analysis) {
    return Math.max(0.1, Math.min(0.3, analysis.volatility * 0.5));
  }

  /**
   * Calculate sensitivity adjustment for adaptive efficiency
   * @param {Object} analysis - Adaptive efficiency analysis
   * @returns {number} Adjustment value
   * @private
   */
  calculateSensitivityAdjustment(analysis) {
    return Math.max(0.05, Math.min(0.2, (1 - analysis.currentValue) * 0.3));
  }

  /**
   * Calculate cycle adjustment for strategic efficiency
   * @param {Object} analysis - Strategic efficiency analysis
   * @returns {number} Adjustment value
   * @private
   */
  calculateCycleAdjustment(analysis) {
    return Math.max(0.8, Math.min(1.2, 1 + (analysis.volatility * 0.2)));
  }

  /**
   * Apply self-optimizations based on detected opportunities
   * @param {Array} opportunities - Array of optimization opportunities
   */
  applySelfOptimizations(opportunities) {
    const adjustments = opportunities.map(opportunity => {
      const adjustment = {
        type: opportunity.type,
        parameter: opportunity.parameter,
        value: opportunity.adjustment,
        timestamp: Date.now()
      };

      // Log the adjustment
      console.log(`[PrismSelfOptimization] Applying adjustment:`, adjustment);
      
      // Store in history
      this.optimizationHistory.push(adjustment);
      
      return adjustment;
    });

    // Emit optimization event
    kernelBus.emit('prism:selfOptimization:parametersAdjusted', {
      adjustments,
      timestamp: Date.now()
    });

    // Store optimization history
    this.storage.writeSafe('prism_optimization_history', this.optimizationHistory);
  }
}

export default PrismSelfOptimization; 