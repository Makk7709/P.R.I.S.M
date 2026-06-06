/**
 * PRISM Consensus Benchmark Analysis Module
 * Statistical analysis and reporting for benchmark results
 */


/**
 * Statistical analysis utilities
 */
export class StatisticalAnalyzer {
  /**
   * Calculate percentile
   * @param {number[]} values - Array of values
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} Percentile value
   */
  static calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * Calculate mean
   * @param {number[]} values - Array of values
   * @returns {number} Mean value
   */
  static calculateMean(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   * @param {number[]} values - Array of values
   * @returns {number} Standard deviation
   */
  static calculateStdDev(values) {
    if (values.length === 0) return 0;
    
    const mean = this.calculateMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate confidence interval
   * @param {number[]} values - Array of values
   * @param {number} confidence - Confidence level (0.95 for 95%)
   * @returns {Object} Confidence interval
   */
  static calculateConfidenceInterval(values, confidence = 0.95) {
    if (values.length === 0) return { lower: 0, upper: 0, margin: 0 };
    
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values);
    const n = values.length;
    
    // Z-score for 95% confidence
    const zScore = 1.96;
    const margin = zScore * (stdDev / Math.sqrt(n));
    
    return {
      lower: mean - margin,
      upper: mean + margin,
      margin
    };
  }

  /**
   * Perform Kolmogorov-Smirnov test
   * @param {number[]} sample1 - First sample
   * @param {number[]} sample2 - Second sample
   * @returns {Object} KS test results
   */
  static kolmogorovSmirnovTest(sample1, sample2) {
    if (sample1.length === 0 || sample2.length === 0) {
      return { statistic: 0, pValue: 1, significant: false };
    }

    const sorted1 = [...sample1].sort((a, b) => a - b);
    const sorted2 = [...sample2].sort((a, b) => a - b);
    
    let maxDiff = 0;
    let i = 0, j = 0;
    
    while (i < sorted1.length && j < sorted2.length) {
      const val1 = sorted1[i];
      const val2 = sorted2[j];
      
      const cdf1 = (i + 1) / sorted1.length;
      const cdf2 = (j + 1) / sorted2.length;
      
      maxDiff = Math.max(maxDiff, Math.abs(cdf1 - cdf2));
      
      if (val1 <= val2) i++;
      if (val2 <= val1) j++;
    }
    
    // Approximate p-value (simplified)
    const n1 = sorted1.length;
    const n2 = sorted2.length;
    const effectiveN = Math.sqrt((n1 * n2) / (n1 + n2));
    const pValue = Math.exp(-2 * Math.pow(maxDiff * effectiveN, 2));
    
    return {
      statistic: maxDiff,
      pValue,
      significant: pValue < 0.05
    };
  }
}

/**
 * Benchmark results analyzer
 */
export class BenchmarkAnalyzer {
  constructor(results) {
    this.results = results;
    this.successfulResults = results.filter(r => r.status === 'success');
  }

  /**
   * Analyze overall performance
   */
  analyzeOverallPerformance() {
    const e2eTimes = this.successfulResults.map(r => r.metrics?.consensus?.totalTime || 0);
    const voteTimes = this.successfulResults.map(r => r.metrics?.consensus?.voteTime || 0);
    const auditTimes = this.successfulResults.map(r => r.metrics?.consensus?.auditTime || 0);
    const orchestrationOverheads = this.successfulResults.map(r => r.metrics?.consensus?.orchestrationOverhead || 0);

    return {
      e2e: {
        p50: StatisticalAnalyzer.calculatePercentile(e2eTimes, 50),
        p95: StatisticalAnalyzer.calculatePercentile(e2eTimes, 95),
        p99: StatisticalAnalyzer.calculatePercentile(e2eTimes, 99),
        mean: StatisticalAnalyzer.calculateMean(e2eTimes),
        stdDev: StatisticalAnalyzer.calculateStdDev(e2eTimes)
      },
      vote: {
        p50: StatisticalAnalyzer.calculatePercentile(voteTimes, 50),
        p95: StatisticalAnalyzer.calculatePercentile(voteTimes, 95),
        p99: StatisticalAnalyzer.calculatePercentile(voteTimes, 99),
        mean: StatisticalAnalyzer.calculateMean(voteTimes),
        stdDev: StatisticalAnalyzer.calculateStdDev(voteTimes)
      },
      audit: {
        p50: StatisticalAnalyzer.calculatePercentile(auditTimes, 50),
        p95: StatisticalAnalyzer.calculatePercentile(auditTimes, 95),
        p99: StatisticalAnalyzer.calculatePercentile(auditTimes, 99),
        mean: StatisticalAnalyzer.calculateMean(auditTimes),
        stdDev: StatisticalAnalyzer.calculateStdDev(auditTimes)
      },
      orchestration: {
        p50: StatisticalAnalyzer.calculatePercentile(orchestrationOverheads, 50),
        p95: StatisticalAnalyzer.calculatePercentile(orchestrationOverheads, 95),
        p99: StatisticalAnalyzer.calculatePercentile(orchestrationOverheads, 99),
        mean: StatisticalAnalyzer.calculateMean(orchestrationOverheads),
        stdDev: StatisticalAnalyzer.calculateStdDev(orchestrationOverheads)
      }
    };
  }

  /**
   * Analyze by agent count
   */
  analyzeByAgentCount() {
    const agentCounts = [...new Set(this.successfulResults.map(r => r.agentCount))];
    const analysis = {};

    for (const count of agentCounts) {
      const results = this.successfulResults.filter(r => r.agentCount === count);
      const e2eTimes = results.map(r => r.metrics?.consensus?.totalTime || 0);
      
      analysis[count] = {
        runs: results.length,
        e2e: {
          p50: StatisticalAnalyzer.calculatePercentile(e2eTimes, 50),
          p95: StatisticalAnalyzer.calculatePercentile(e2eTimes, 95),
          p99: StatisticalAnalyzer.calculatePercentile(e2eTimes, 99),
          mean: StatisticalAnalyzer.calculateMean(e2eTimes)
        },
        successRate: (results.length / this.results.filter(r => r.agentCount === count).length) * 100
      };
    }

    return analysis;
  }

  /**
   * Analyze by context size
   */
  analyzeByContextSize() {
    const contextSizes = [...new Set(this.successfulResults.map(r => r.contextSize))];
    const analysis = {};

    for (const size of contextSizes) {
      const results = this.successfulResults.filter(r => r.contextSize === size);
      const e2eTimes = results.map(r => r.metrics?.consensus?.totalTime || 0);
      
      analysis[size] = {
        runs: results.length,
        e2e: {
          p50: StatisticalAnalyzer.calculatePercentile(e2eTimes, 50),
          p95: StatisticalAnalyzer.calculatePercentile(e2eTimes, 95),
          p99: StatisticalAnalyzer.calculatePercentile(e2eTimes, 99),
          mean: StatisticalAnalyzer.calculateMean(e2eTimes)
        },
        successRate: (results.length / this.results.filter(r => r.contextSize === size).length) * 100
      };
    }

    return analysis;
  }

  /**
   * Analyze by timeout
   */
  analyzeByTimeout() {
    const timeouts = [...new Set(this.successfulResults.map(r => r.timeout))];
    const analysis = {};

    for (const timeout of timeouts) {
      const results = this.successfulResults.filter(r => r.timeout === timeout);
      const e2eTimes = results.map(r => r.metrics?.consensus?.totalTime || 0);
      
      analysis[timeout] = {
        runs: results.length,
        e2e: {
          p50: StatisticalAnalyzer.calculatePercentile(e2eTimes, 50),
          p95: StatisticalAnalyzer.calculatePercentile(e2eTimes, 95),
          p99: StatisticalAnalyzer.calculatePercentile(e2eTimes, 99),
          mean: StatisticalAnalyzer.calculateMean(e2eTimes)
        },
        successRate: (results.length / this.results.filter(r => r.timeout === timeout).length) * 100
      };
    }

    return analysis;
  }

  /**
   * Analyze cold vs warm performance
   */
  analyzeColdVsWarm() {
    const coldResults = this.successfulResults.filter(r => r.mode === 'cold');
    const warmResults = this.successfulResults.filter(r => r.mode === 'warm');
    
    const coldE2E = coldResults.map(r => r.metrics?.consensus?.totalTime || 0);
    const warmE2E = warmResults.map(r => r.metrics?.consensus?.totalTime || 0);
    
    const ksTest = StatisticalAnalyzer.kolmogorovSmirnovTest(coldE2E, warmE2E);
    
    return {
      cold: {
        runs: coldResults.length,
        e2e: {
          p50: StatisticalAnalyzer.calculatePercentile(coldE2E, 50),
          p95: StatisticalAnalyzer.calculatePercentile(coldE2E, 95),
          p99: StatisticalAnalyzer.calculatePercentile(coldE2E, 99),
          mean: StatisticalAnalyzer.calculateMean(coldE2E)
        }
      },
      warm: {
        runs: warmResults.length,
        e2e: {
          p50: StatisticalAnalyzer.calculatePercentile(warmE2E, 50),
          p95: StatisticalAnalyzer.calculatePercentile(warmE2E, 95),
          p99: StatisticalAnalyzer.calculatePercentile(warmE2E, 99),
          mean: StatisticalAnalyzer.calculateMean(warmE2E)
        }
      },
      comparison: {
        ksTest,
        meanDifference: StatisticalAnalyzer.calculateMean(warmE2E) - StatisticalAnalyzer.calculateMean(coldE2E),
        relativeImprovement: ((StatisticalAnalyzer.calculateMean(coldE2E) - StatisticalAnalyzer.calculateMean(warmE2E)) / StatisticalAnalyzer.calculateMean(coldE2E)) * 100
      }
    };
  }

  /**
   * Analyze provider performance
   */
  analyzeProviderPerformance() {
    const providerAnalysis = {};
    
    for (const result of this.successfulResults) {
      const agents = result.metrics?.agents || {};
      
      for (const [agentId, agentData] of Object.entries(agents)) {
        const provider = agentData.provider;
        if (!providerAnalysis[provider]) {
          providerAnalysis[provider] = {
            latencies: [],
            ttfts: [],
            successCount: 0,
            totalCount: 0
          };
        }
        
        if (agentData.latency !== null) {
          providerAnalysis[provider].latencies.push(agentData.latency);
          providerAnalysis[provider].successCount++;
        }
        
        if (agentData.ttft !== null) {
          providerAnalysis[provider].ttfts.push(agentData.ttft);
        }
        
        providerAnalysis[provider].totalCount++;
      }
    }
    
    // Calculate statistics for each provider
    for (const [provider, data] of Object.entries(providerAnalysis)) {
      data.latency = {
        p50: StatisticalAnalyzer.calculatePercentile(data.latencies, 50),
        p95: StatisticalAnalyzer.calculatePercentile(data.latencies, 95),
        p99: StatisticalAnalyzer.calculatePercentile(data.latencies, 99),
        mean: StatisticalAnalyzer.calculateMean(data.latencies)
      };
      
      data.ttft = {
        p50: StatisticalAnalyzer.calculatePercentile(data.ttfts, 50),
        p95: StatisticalAnalyzer.calculatePercentile(data.ttfts, 95),
        p99: StatisticalAnalyzer.calculatePercentile(data.ttfts, 99),
        mean: StatisticalAnalyzer.calculateMean(data.ttfts)
      };
      
      data.successRate = (data.successCount / data.totalCount) * 100;
    }
    
    return providerAnalysis;
  }

  /**
   * Generate comprehensive analysis
   */
  generateAnalysis() {
    return {
      summary: {
        totalRuns: this.results.length,
        successfulRuns: this.successfulResults.length,
        successRate: (this.successfulResults.length / this.results.length) * 100,
        errorRate: ((this.results.length - this.successfulResults.length) / this.results.length) * 100
      },
      overall: this.analyzeOverallPerformance(),
      byAgentCount: this.analyzeByAgentCount(),
      byContextSize: this.analyzeByContextSize(),
      byTimeout: this.analyzeByTimeout(),
      coldVsWarm: this.analyzeColdVsWarm(),
      providers: this.analyzeProviderPerformance()
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const analysis = this.generateAnalysis();
    const recommendations = [];

    // Timeout recommendations
    const timeoutAnalysis = analysis.byTimeout;
    const bestTimeout = Object.entries(timeoutAnalysis).reduce((best, [timeout, data]) => {
      return data.successRate > best.successRate ? { timeout, ...data } : best;
    }, { timeout: 1000, successRate: 0 });

    recommendations.push({
      category: 'timeout',
      recommendation: `Use ${bestTimeout.timeout}ms timeout for optimal success rate (${bestTimeout.successRate.toFixed(1)}%)`,
      impact: 'high'
    });

    // Agent count recommendations
    const agentAnalysis = analysis.byAgentCount;
    const bestAgentCount = Object.entries(agentAnalysis).reduce((best, [count, data]) => {
      const score = data.successRate * 0.7 + (1000 / data.e2e.mean) * 0.3; // Balance success rate and performance
      return score > best.score ? { count, score, ...data } : best;
    }, { count: 3, score: 0 });

    recommendations.push({
      category: 'agents',
      recommendation: `Use ${bestAgentCount.count} agents for optimal balance of success rate and performance`,
      impact: 'medium'
    });

    // Context size recommendations
    const contextAnalysis = analysis.byContextSize;
    const bestContextSize = Object.entries(contextAnalysis).reduce((best, [size, data]) => {
      const score = data.successRate * 0.6 + (1000 / data.e2e.mean) * 0.4;
      return score > best.score ? { size, score, ...data } : best;
    }, { size: 1000, score: 0 });

    recommendations.push({
      category: 'context',
      recommendation: `Use ${bestContextSize.size} tokens context size for best performance`,
      impact: 'medium'
    });

    // Warm pool recommendations
    const coldWarmAnalysis = analysis.coldVsWarm;
    if (coldWarmAnalysis.comparison.relativeImprovement > 5) {
      recommendations.push({
        category: 'warm_pools',
        recommendation: `Enable warm connection pools for ${coldWarmAnalysis.comparison.relativeImprovement.toFixed(1)}% performance improvement`,
        impact: 'high'
      });
    }

    return recommendations;
  }
}

export default BenchmarkAnalyzer;
