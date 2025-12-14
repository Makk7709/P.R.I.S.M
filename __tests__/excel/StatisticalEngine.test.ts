/**
 * StatisticalEngine - Tests TDD Stricts
 * 
 * Tests complets pour le moteur d'analyse statistique
 * Couverture cible: 100%
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StatisticalEngine } from '../../src/excel/StatisticalEngine.js';

describe('StatisticalEngine', () => {
  let engine: StatisticalEngine;

  beforeEach(() => {
    engine = new StatisticalEngine();
  });

  // ============================================================================
  // TESTS D'INITIALISATION
  // ============================================================================

  describe('Initialization', () => {
    it('should create an instance with default options', () => {
      expect(engine).toBeInstanceOf(StatisticalEngine);
    });

    it('should accept custom precision option', () => {
      const customEngine = new StatisticalEngine({ precision: 4 });
      expect(customEngine.options.precision).toBe(4);
    });
  });

  // ============================================================================
  // TESTS STATISTIQUES DESCRIPTIVES DE BASE
  // ============================================================================

  describe('Basic Descriptive Statistics', () => {
    describe('Central Tendency', () => {
      it('should calculate mean correctly', () => {
        const data = [10, 20, 30, 40, 50];
        const result = engine.descriptiveStats(data);
        
        expect(result.mean).toBe(30);
      });

      it('should calculate median for odd count', () => {
        const data = [1, 3, 5, 7, 9];
        const result = engine.descriptiveStats(data);
        
        expect(result.median).toBe(5);
      });

      it('should calculate median for even count', () => {
        const data = [1, 3, 5, 7];
        const result = engine.descriptiveStats(data);
        
        expect(result.median).toBe(4); // (3+5)/2
      });

      it('should calculate mode (single mode)', () => {
        const data = [1, 2, 2, 3, 4, 2, 5];
        const result = engine.descriptiveStats(data);
        
        expect(result.mode).toEqual([2]);
      });

      it('should calculate mode (multiple modes)', () => {
        const data = [1, 2, 2, 3, 3, 4];
        const result = engine.descriptiveStats(data);
        
        expect(result.mode).toContain(2);
        expect(result.mode).toContain(3);
        expect(result.isMultimodal).toBe(true);
      });

      it('should handle no mode (all unique)', () => {
        const data = [1, 2, 3, 4, 5];
        const result = engine.descriptiveStats(data);
        
        expect(result.mode).toEqual([]);
        expect(result.hasNoMode).toBe(true);
      });

      it('should calculate weighted mean', () => {
        const data = [10, 20, 30];
        const weights = [1, 2, 3]; // 30 has more weight
        const result = engine.weightedMean(data, weights);
        
        // (10*1 + 20*2 + 30*3) / (1+2+3) = 140/6 = 23.33
        expect(result).toBeCloseTo(23.33, 2);
      });

      it('should calculate geometric mean', () => {
        const data = [2, 8];
        const result = engine.geometricMean(data);
        
        expect(result).toBe(4); // sqrt(2*8) = 4
      });

      it('should calculate harmonic mean', () => {
        const data = [1, 4, 4];
        const result = engine.harmonicMean(data);
        
        // 3 / (1/1 + 1/4 + 1/4) = 3 / 1.5 = 2
        expect(result).toBe(2);
      });

      it('should calculate trimmed mean', () => {
        const data = [1, 2, 3, 4, 5, 100]; // 100 is outlier
        const result = engine.trimmedMean(data, 0.1); // Trim 10% from each end
        
        // Should be closer to 3 than to 19.17 (full mean)
        expect(result).toBeLessThan(10);
      });
    });

    describe('Dispersion', () => {
      it('should calculate sum', () => {
        const data = [10, 20, 30, 40, 50];
        const result = engine.descriptiveStats(data);
        
        expect(result.sum).toBe(150);
      });

      it('should calculate count', () => {
        const data = [10, 20, 30, 40, 50];
        const result = engine.descriptiveStats(data);
        
        expect(result.count).toBe(5);
      });

      it('should calculate min and max', () => {
        const data = [10, 5, 30, 2, 50];
        const result = engine.descriptiveStats(data);
        
        expect(result.min).toBe(2);
        expect(result.max).toBe(50);
      });

      it('should calculate range', () => {
        const data = [10, 5, 30, 2, 50];
        const result = engine.descriptiveStats(data);
        
        expect(result.range).toBe(48); // 50 - 2
      });

      it('should calculate variance (population)', () => {
        const data = [2, 4, 4, 4, 5, 5, 7, 9];
        const result = engine.descriptiveStats(data);
        
        // Population variance
        expect(result.variance).toBeCloseTo(4, 1);
      });

      it('should calculate sample variance', () => {
        const data = [2, 4, 4, 4, 5, 5, 7, 9];
        const result = engine.descriptiveStats(data, { sample: true });
        
        // Sample variance (n-1 denominator)
        expect(result.sampleVariance).toBeCloseTo(4.57, 1);
      });

      it('should calculate standard deviation', () => {
        const data = [2, 4, 4, 4, 5, 5, 7, 9];
        const result = engine.descriptiveStats(data);
        
        expect(result.standardDeviation).toBeCloseTo(2, 1);
      });

      it('should calculate coefficient of variation', () => {
        const data = [10, 20, 30, 40, 50];
        const result = engine.descriptiveStats(data);
        
        // CV = (stdDev / mean) * 100
        expect(result.coefficientOfVariation).toBeDefined();
        expect(result.coefficientOfVariation).toBeGreaterThan(0);
      });

      it('should calculate mean absolute deviation', () => {
        const data = [2, 4, 6, 8, 10];
        const result = engine.meanAbsoluteDeviation(data);
        
        // MAD = mean(|x - mean|)
        expect(result).toBeCloseTo(2.4, 1);
      });
    });

    describe('Quartiles and Percentiles', () => {
      it('should calculate quartiles', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const result = engine.descriptiveStats(data);
        
        expect(result.quartiles.Q1).toBeCloseTo(2.75, 1);
        expect(result.quartiles.Q2).toBe(5.5); // Median
        expect(result.quartiles.Q3).toBeCloseTo(7.75, 1);
      });

      it('should calculate interquartile range', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const result = engine.descriptiveStats(data);
        
        expect(result.interquartileRange).toBeCloseTo(5, 1); // Q3 - Q1
      });

      it('should calculate arbitrary percentiles', () => {
        const data = Array.from({ length: 100 }, (_, i) => i + 1);
        const result = engine.percentile(data, 90);
        
        expect(result).toBeCloseTo(90, 1);
      });

      it('should calculate multiple percentiles', () => {
        const data = Array.from({ length: 100 }, (_, i) => i + 1);
        const result = engine.percentiles(data, [10, 25, 50, 75, 90, 95, 99]);
        
        expect(result.p10).toBeCloseTo(10, 1);
        expect(result.p50).toBeCloseTo(50, 1);
        expect(result.p99).toBeCloseTo(99, 1);
      });
    });

    describe('Shape', () => {
      it('should calculate skewness (symmetric distribution)', () => {
        // Symmetric data around mean
        const data = [1, 2, 3, 4, 5, 6, 7];
        const result = engine.descriptiveStats(data);
        
        expect(result.skewness).toBeCloseTo(0, 1);
      });

      it('should calculate skewness (right-skewed)', () => {
        const data = [1, 1, 1, 2, 2, 3, 10, 20];
        const result = engine.descriptiveStats(data);
        
        expect(result.skewness).toBeGreaterThan(0);
      });

      it('should calculate skewness (left-skewed)', () => {
        const data = [1, 10, 18, 19, 19, 20, 20, 20];
        const result = engine.descriptiveStats(data);
        
        expect(result.skewness).toBeLessThan(0);
      });

      it('should calculate kurtosis', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const result = engine.descriptiveStats(data);
        
        expect(result.kurtosis).toBeDefined();
        // Normal distribution has kurtosis ~3 (excess kurtosis ~0)
      });

      it('should calculate excess kurtosis', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const result = engine.descriptiveStats(data);
        
        expect(result.excessKurtosis).toBeDefined();
      });
    });
  });

  // ============================================================================
  // TESTS DÉTECTION D'OUTLIERS
  // ============================================================================

  describe('Outlier Detection', () => {
    it('should detect outliers using IQR method', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
      const result = engine.detectOutliers(data, { method: 'IQR' });
      
      expect(result.outliers).toContain(100);
      expect(result.outlierIndices).toContain(9);
    });

    it('should detect outliers using Z-score method', () => {
      const data = [10, 12, 11, 13, 12, 11, 100, 12, 11, 10];
      const result = engine.detectOutliers(data, { method: 'zscore', threshold: 2 });
      
      expect(result.outliers).toContain(100);
    });

    it('should detect outliers using modified Z-score (MAD)', () => {
      const data = [1, 2, 2, 3, 3, 3, 4, 4, 5, 50];
      const result = engine.detectOutliers(data, { method: 'modifiedZscore' });
      
      expect(result.outliers).toContain(50);
    });

    it('should return clean data without outliers', () => {
      const data = [1, 2, 3, 4, 5, 100];
      const result = engine.detectOutliers(data);
      
      expect(result.cleanData).not.toContain(100);
      expect(result.cleanData).toHaveLength(5);
    });

    it('should calculate outlier statistics', () => {
      const data = [1, 2, 3, 4, 5, 100, 200];
      const result = engine.detectOutliers(data);
      
      expect(result.outlierCount).toBe(2);
      expect(result.outlierPercentage).toBeCloseTo(28.57, 1);
    });

    it('should handle no outliers', () => {
      const data = [1, 2, 3, 4, 5];
      const result = engine.detectOutliers(data);
      
      expect(result.outliers).toHaveLength(0);
      expect(result.hasOutliers).toBe(false);
    });
  });

  // ============================================================================
  // TESTS DISTRIBUTION
  // ============================================================================

  describe('Distribution Analysis', () => {
    it('should generate histogram', () => {
      const data = Array.from({ length: 100 }, () => Math.random() * 100);
      const result = engine.histogram(data, { bins: 10 });
      
      expect(result.bins).toHaveLength(10);
      expect(result.bins.every(b => b.count >= 0)).toBe(true);
    });

    it('should calculate histogram with automatic bin count', () => {
      const data = Array.from({ length: 1000 }, () => Math.random() * 100);
      const result = engine.histogram(data); // Auto bins using Sturges' rule
      
      expect(result.binWidth).toBeDefined();
      expect(result.bins.length).toBeGreaterThan(5);
    });

    it('should test for normal distribution (Shapiro-Wilk approximation)', () => {
      // Generate approximately normal data
      const normalData = Array.from({ length: 100 }, () => {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 10 + 50;
      });
      
      const result = engine.normalityTest(normalData);
      
      expect(result.statistic).toBeDefined();
      expect(result.pValue).toBeDefined();
      // With synthetic normal data, we expect isNormal to likely be true
    });

    it('should detect non-normal distribution', () => {
      // Highly skewed data
      const skewedData = Array.from({ length: 100 }, (_, i) => i * i);
      
      const result = engine.normalityTest(skewedData);
      
      expect(result.isNormal).toBe(false);
    });

    it('should calculate cumulative distribution', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = engine.cumulativeDistribution(data);
      
      expect(result[0].cumulativeProbability).toBeCloseTo(0.1, 2);
      expect(result[9].cumulativeProbability).toBeCloseTo(1, 2);
    });

    it('should identify distribution type', () => {
      const uniformData = Array.from({ length: 1000 }, () => Math.random() * 100);
      const result = engine.identifyDistribution(uniformData);
      
      expect(result.suggestedDistribution).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS CORRÉLATION
  // ============================================================================

  describe('Correlation Analysis', () => {
    it('should calculate Pearson correlation (perfect positive)', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = engine.correlation(x, y);
      
      expect(result.pearson).toBeCloseTo(1, 5);
    });

    it('should calculate Pearson correlation (perfect negative)', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];
      const result = engine.correlation(x, y);
      
      expect(result.pearson).toBeCloseTo(-1, 5);
    });

    it('should calculate Pearson correlation (no correlation)', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 2, 4, 1, 3]; // Random relationship
      const result = engine.correlation(x, y);
      
      expect(Math.abs(result.pearson)).toBeLessThan(0.5);
    });

    it('should calculate Spearman rank correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [1, 4, 9, 16, 25]; // Monotonic but not linear
      const result = engine.correlation(x, y);
      
      expect(result.spearman).toBeCloseTo(1, 5);
    });

    it('should interpret correlation strength', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = engine.correlation(x, y);
      
      expect(result.strength).toBe('very_strong');
      expect(result.direction).toBe('positive');
    });

    it('should provide correlation significance', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const y = [2, 4, 5, 7, 8, 11, 12, 14, 15, 18];
      const result = engine.correlation(x, y);
      
      expect(result.pValue).toBeDefined();
      expect(result.isSignificant).toBe(true);
    });

    it('should generate correlation matrix', () => {
      const columns = {
        A: [1, 2, 3, 4, 5],
        B: [2, 4, 6, 8, 10],
        C: [5, 4, 3, 2, 1]
      };
      
      const result = engine.correlationMatrix(columns);
      
      expect(result.matrix).toBeDefined();
      expect(result.matrix['A']['B']).toBeCloseTo(1, 5);
      expect(result.matrix['A']['C']).toBeCloseTo(-1, 5);
    });

    it('should find strongest correlations', () => {
      const columns = {
        A: [1, 2, 3, 4, 5],
        B: [2, 4, 6, 8, 10],
        C: [3, 3, 4, 4, 5],
        D: [5, 4, 3, 2, 1]
      };
      
      const result = engine.correlationMatrix(columns);
      
      expect(result.strongestPositive).toBeDefined();
      expect(result.strongestNegative).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS RÉGRESSION
  // ============================================================================

  describe('Regression Analysis', () => {
    it('should calculate linear regression', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2.1, 3.9, 6.1, 8.0, 9.8];
      const result = engine.linearRegression(x, y);
      
      expect(result.slope).toBeCloseTo(2, 1);
      expect(result.intercept).toBeCloseTo(0, 1);
    });

    it('should calculate R-squared', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = engine.linearRegression(x, y);
      
      expect(result.rSquared).toBeCloseTo(1, 5);
    });

    it('should provide prediction function', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = engine.linearRegression(x, y);
      
      expect(result.predict(6)).toBeCloseTo(12, 1);
      expect(result.predict(10)).toBeCloseTo(20, 1);
    });

    it('should calculate prediction confidence interval', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const y = [2.1, 3.9, 6.2, 7.8, 10.1, 12.0, 13.9, 16.1, 17.8, 20.2];
      const result = engine.linearRegression(x, y);
      
      const prediction = result.predictWithInterval(11, 0.95);
      
      expect(prediction.value).toBeDefined();
      expect(prediction.lowerBound).toBeLessThan(prediction.value);
      expect(prediction.upperBound).toBeGreaterThan(prediction.value);
    });

    it('should calculate residuals', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2.1, 3.9, 6.1, 8.0, 9.8];
      const result = engine.linearRegression(x, y);
      
      expect(result.residuals).toHaveLength(5);
      // Residuals should be small for good fit
      expect(Math.abs(result.residuals[0])).toBeLessThan(0.5);
    });

    it('should detect non-linear relationship', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [1, 4, 9, 16, 25]; // Quadratic
      const result = engine.linearRegression(x, y);
      
      expect(result.rSquared).toBeLessThan(1);
      expect(result.suggestNonLinear).toBe(true);
    });
  });

  // ============================================================================
  // TESTS ANALYSE TEMPORELLE
  // ============================================================================

  describe('Time Series Analysis', () => {
    it('should calculate moving average', () => {
      const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = engine.movingAverage(data, 3);
      
      expect(result).toHaveLength(8); // n - window + 1
      expect(result[0]).toBeCloseTo(20, 1); // (10+20+30)/3
      expect(result[7]).toBeCloseTo(90, 1); // (80+90+100)/3
    });

    it('should calculate exponential moving average', () => {
      const data = [10, 20, 30, 40, 50];
      const result = engine.exponentialMovingAverage(data, 0.5);
      
      expect(result).toHaveLength(5);
      // EMA gives more weight to recent values
    });

    it('should detect trend', () => {
      const increasingData = [10, 15, 18, 25, 30, 35, 42, 48];
      const result = engine.detectTrend(increasingData);
      
      expect(result.trend).toBe('increasing');
      expect(result.strength).toBeGreaterThan(0.5);
    });

    it('should detect decreasing trend', () => {
      const decreasingData = [100, 95, 88, 80, 75, 68, 60, 55];
      const result = engine.detectTrend(decreasingData);
      
      expect(result.trend).toBe('decreasing');
    });

    it('should detect stable/no trend', () => {
      const stableData = [50, 52, 48, 51, 49, 50, 51, 49];
      const result = engine.detectTrend(stableData);
      
      expect(result.trend).toBe('stable');
    });

    it('should calculate growth rate', () => {
      const data = [100, 110, 121, 133.1, 146.41];
      const result = engine.growthRate(data);
      
      expect(result.averageGrowthRate).toBeCloseTo(0.10, 2); // 10%
      expect(result.compoundGrowthRate).toBeCloseTo(0.10, 2);
    });

    it('should detect seasonality', () => {
      // Simulated quarterly data with pattern
      const seasonalData = [
        100, 120, 140, 110, // Year 1
        105, 125, 145, 115, // Year 2
        110, 130, 150, 120  // Year 3
      ];
      
      const result = engine.detectSeasonality(seasonalData, { period: 4 });
      
      expect(result.hasSeasonality).toBe(true);
      expect(result.period).toBe(4);
    });

    it('should perform simple forecast', () => {
      const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = engine.forecast(data, 3);
      
      expect(result.predictions).toHaveLength(3);
      expect(result.predictions[0]).toBeGreaterThan(100);
    });
  });

  // ============================================================================
  // TESTS ANALYSE CATÉGORIELLE
  // ============================================================================

  describe('Categorical Analysis', () => {
    it('should calculate frequency table', () => {
      const data = ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'A'];
      const result = engine.frequencyTable(data);
      
      expect(result['A'].count).toBe(4);
      expect(result['B'].count).toBe(2);
      expect(result['A'].percentage).toBeCloseTo(50, 1);
    });

    it('should sort frequency table by count', () => {
      const data = ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'A'];
      const result = engine.frequencyTable(data, { sortBy: 'count' });
      
      const categories = Object.keys(result);
      expect(categories[0]).toBe('A');
    });

    it('should calculate mode for categorical', () => {
      const data = ['Red', 'Blue', 'Red', 'Green', 'Red', 'Blue'];
      const result = engine.categoricalMode(data);
      
      expect(result.mode).toBe('Red');
      expect(result.frequency).toBe(3);
    });

    it('should calculate entropy', () => {
      const data = ['A', 'A', 'B', 'B']; // Uniform = high entropy
      const result = engine.entropy(data);
      
      expect(result).toBeCloseTo(1, 1); // log2(2) = 1 for uniform binary
    });

    it('should calculate entropy for skewed distribution', () => {
      const data = ['A', 'A', 'A', 'A', 'B']; // Skewed = low entropy
      const result = engine.entropy(data);
      
      expect(result).toBeLessThan(1);
    });

    it('should perform chi-square test for independence', () => {
      const data = [
        { category: 'A', outcome: 'Yes' },
        { category: 'A', outcome: 'No' },
        { category: 'B', outcome: 'Yes' },
        { category: 'B', outcome: 'Yes' },
        { category: 'A', outcome: 'Yes' },
        { category: 'B', outcome: 'No' }
      ];
      
      const result = engine.chiSquareTest(data, 'category', 'outcome');
      
      expect(result.statistic).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.degreesOfFreedom).toBe(1);
    });
  });

  // ============================================================================
  // TESTS GROUPBY ET AGRÉGATION
  // ============================================================================

  describe('GroupBy and Aggregation', () => {
    const testData = [
      { category: 'A', region: 'North', value: 100 },
      { category: 'A', region: 'South', value: 150 },
      { category: 'B', region: 'North', value: 200 },
      { category: 'B', region: 'South', value: 250 },
      { category: 'A', region: 'North', value: 120 },
      { category: 'B', region: 'South', value: 280 }
    ];

    it('should group by single column with sum', () => {
      const result = engine.groupBy(testData, 'category', 'value', 'sum');
      
      expect(result['A']).toBe(370); // 100 + 150 + 120
      expect(result['B']).toBe(730); // 200 + 250 + 280
    });

    it('should group by single column with mean', () => {
      const result = engine.groupBy(testData, 'category', 'value', 'mean');
      
      expect(result['A']).toBeCloseTo(123.33, 1);
      expect(result['B']).toBeCloseTo(243.33, 1);
    });

    it('should group by single column with count', () => {
      const result = engine.groupBy(testData, 'category', 'value', 'count');
      
      expect(result['A']).toBe(3);
      expect(result['B']).toBe(3);
    });

    it('should group by multiple columns', () => {
      const result = engine.groupByMultiple(testData, ['category', 'region'], 'value', 'sum');
      
      expect(result['A']['North']).toBe(220); // 100 + 120
      expect(result['A']['South']).toBe(150);
      expect(result['B']['South']).toBe(530); // 250 + 280
    });

    it('should create pivot table', () => {
      const result = engine.pivotTable(testData, 'category', 'region', 'value', 'sum');
      
      expect(result.data['A']['North']).toBe(220);
      expect(result.data['B']['South']).toBe(530);
      expect(result.rowTotals['A']).toBe(370);
      expect(result.columnTotals['North']).toBe(420);
    });

    it('should support multiple aggregation functions', () => {
      const result = engine.groupByWithMultipleAggs(testData, 'category', 'value', ['sum', 'mean', 'min', 'max']);
      
      expect(result['A'].sum).toBe(370);
      expect(result['A'].mean).toBeCloseTo(123.33, 1);
      expect(result['A'].min).toBe(100);
      expect(result['A'].max).toBe(150);
    });
  });

  // ============================================================================
  // TESTS COMPARAISON DE GROUPES
  // ============================================================================

  describe('Group Comparison', () => {
    it('should perform t-test for two independent samples', () => {
      const group1 = [85, 90, 78, 92, 88, 84, 91, 79, 87, 93];
      const group2 = [78, 82, 75, 80, 77, 83, 79, 76, 81, 74];
      
      const result = engine.tTest(group1, group2);
      
      expect(result.tStatistic).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.degreesOfFreedom).toBeDefined();
      expect(result.significantDifference).toBe(true);
    });

    it('should calculate effect size (Cohen\'s d)', () => {
      const group1 = [85, 90, 78, 92, 88];
      const group2 = [65, 70, 68, 72, 66];
      
      const result = engine.effectSize(group1, group2);
      
      expect(result.cohensD).toBeGreaterThan(1); // Large effect
      expect(result.interpretation).toBe('large');
    });

    it('should perform ANOVA for multiple groups', () => {
      const groups = {
        'Group A': [85, 90, 78, 92, 88],
        'Group B': [78, 82, 75, 80, 77],
        'Group C': [70, 65, 72, 68, 74]
      };
      
      const result = engine.anova(groups);
      
      expect(result.fStatistic).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.betweenGroupVariance).toBeDefined();
      expect(result.withinGroupVariance).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS ANALYSE COMPLÈTE DE DATASET
  // ============================================================================

  describe('Complete Dataset Analysis', () => {
    const sampleDataset = {
      columns: ['ID', 'Name', 'Age', 'Salary', 'Department', 'JoinDate'],
      rows: [
        { ID: 1, Name: 'Alice', Age: 30, Salary: 50000, Department: 'IT', JoinDate: '2020-01-15' },
        { ID: 2, Name: 'Bob', Age: 35, Salary: 60000, Department: 'HR', JoinDate: '2019-06-20' },
        { ID: 3, Name: 'Charlie', Age: 28, Salary: 45000, Department: 'IT', JoinDate: '2021-03-10' },
        { ID: 4, Name: 'Diana', Age: 42, Salary: 75000, Department: 'Finance', JoinDate: '2018-09-01' },
        { ID: 5, Name: 'Eve', Age: 31, Salary: 55000, Department: 'IT', JoinDate: '2020-07-15' }
      ]
    };

    it('should generate comprehensive statistics for all numeric columns', () => {
      const result = engine.analyzeDataset(sampleDataset);
      
      expect(result.numericColumns).toContain('Age');
      expect(result.numericColumns).toContain('Salary');
      expect(result.statistics['Age']).toBeDefined();
      expect(result.statistics['Salary']).toBeDefined();
    });

    it('should generate summary for categorical columns', () => {
      const result = engine.analyzeDataset(sampleDataset);
      
      expect(result.categoricalColumns).toContain('Department');
      expect(result.categoricalSummary['Department']).toBeDefined();
      expect(result.categoricalSummary['Department'].uniqueValues).toBe(3);
    });

    it('should detect and report correlations', () => {
      const result = engine.analyzeDataset(sampleDataset);
      
      expect(result.correlations).toBeDefined();
      expect(result.correlations['Age']['Salary']).toBeDefined();
    });

    it('should identify potential data quality issues', () => {
      const dataWithIssues = {
        columns: ['A', 'B'],
        rows: [
          { A: 1, B: null },
          { A: null, B: 2 },
          { A: 3, B: 3 },
          { A: 1000, B: 4 } // Outlier
        ]
      };
      
      const result = engine.analyzeDataset(dataWithIssues);
      
      expect(result.dataQuality.nullCount).toBeGreaterThan(0);
      expect(result.dataQuality.outlierWarnings).toBeDefined();
    });

    it('should generate executive summary', () => {
      const result = engine.analyzeDataset(sampleDataset);
      
      expect(result.executiveSummary).toBeDefined();
      expect(result.executiveSummary.totalRows).toBe(5);
      expect(result.executiveSummary.numericColumnCount).toBe(3);
      expect(result.executiveSummary.keyInsights).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS PERFORMANCE
  // ============================================================================

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 100000 }, () => Math.random() * 1000);
      
      const startTime = Date.now();
      const result = engine.descriptiveStats(largeData);
      const endTime = Date.now();
      
      expect(result.count).toBe(100000);
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should use streaming for very large datasets', () => {
      const veryLargeData = Array.from({ length: 500000 }, () => Math.random());
      
      const result = engine.descriptiveStats(veryLargeData, { streaming: true });
      
      expect(result.mean).toBeDefined();
      expect(result.standardDeviation).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS GESTION D'ERREURS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle empty array', () => {
      const result = engine.descriptiveStats([]);
      
      expect(result.count).toBe(0);
      expect(result.mean).toBeNull();
      expect(result.isEmpty).toBe(true);
    });

    it('should handle single value', () => {
      const result = engine.descriptiveStats([42]);
      
      expect(result.count).toBe(1);
      expect(result.mean).toBe(42);
      expect(result.variance).toBe(0);
    });

    it('should handle arrays with null/undefined', () => {
      const data = [1, null, 3, undefined, 5];
      const result = engine.descriptiveStats(data);
      
      expect(result.count).toBe(3); // Only valid values
      expect(result.nullCount).toBe(2);
    });

    it('should handle arrays with NaN', () => {
      const data = [1, 2, NaN, 4, 5];
      const result = engine.descriptiveStats(data);
      
      expect(result.count).toBe(4);
      expect(result.nanCount).toBe(1);
    });

    it('should throw for invalid input types', () => {
      expect(() => engine.descriptiveStats('not an array' as any))
        .toThrow('Input must be an array');
    });

    it('should handle correlation with mismatched lengths', () => {
      const x = [1, 2, 3];
      const y = [1, 2];
      
      expect(() => engine.correlation(x, y))
        .toThrow('Arrays must have the same length');
    });
  });
});
