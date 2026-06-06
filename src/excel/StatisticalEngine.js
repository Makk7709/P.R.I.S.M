/**
 * StatisticalEngine - Moteur d'analyse statistique complet
 * 
 * Module de calculs statistiques avancés pour l'analyse de données Excel.
 * Inclut: statistiques descriptives, corrélations, régression, analyse temporelle,
 * détection d'outliers, tests statistiques.
 * 
 * @module src/excel/StatisticalEngine
 */

/**
 * StatisticalEngine - Classe principale d'analyse statistique
 */
export class StatisticalEngine {
  /**
   * @param {Object} options - Options de configuration
   * @param {number} options.precision - Nombre de décimales (défaut: 6)
   */
  constructor(options = {}) {
    this.options = {
      precision: options.precision || 6,
      confidenceLevel: options.confidenceLevel || 0.95,
      ...options
    };
  }

  // ============================================================================
  // STATISTIQUES DESCRIPTIVES
  // ============================================================================

  /**
   * Calcule toutes les statistiques descriptives pour un tableau de nombres
   * @param {number[]} data - Tableau de données
   * @param {Object} options - Options (sample: boolean pour variance échantillon)
   * @returns {Object} Statistiques complètes
   */
  descriptiveStats(data, _options = {}) {
    if (!Array.isArray(data)) {
      throw new Error('Input must be an array');
    }

    // Filtrer les valeurs non numériques
    const validData = data.filter(v => v !== null && v !== undefined && !isNaN(v) && isFinite(v));
    const nullCount = data.filter(v => v === null || v === undefined).length;
    const nanCount = data.filter(v => typeof v === 'number' && isNaN(v)).length;

    if (validData.length === 0) {
      return {
        count: 0,
        validCount: 0,
        nullCount,
        nanCount,
        isEmpty: true,
        mean: null,
        median: null,
        mode: [],
        sum: 0,
        min: null,
        max: null,
        range: null,
        variance: null,
        standardDeviation: null
      };
    }

    // Tri pour médiane et percentiles
    const sorted = [...validData].sort((a, b) => a - b);
    const n = validData.length;

    // Calculs de base
    const sum = validData.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;
    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;

    // Médiane
    const median = this._calculateMedian(sorted);

    // Mode
    const modeResult = this._calculateMode(validData);

    // Variance et écart-type
    const squaredDiffs = validData.map(v => Math.pow(v - mean, 2));
    const sumSquaredDiffs = squaredDiffs.reduce((acc, val) => acc + val, 0);
    
    const variance = sumSquaredDiffs / n;
    const sampleVariance = n > 1 ? sumSquaredDiffs / (n - 1) : 0;
    const standardDeviation = Math.sqrt(variance);
    const sampleStandardDeviation = Math.sqrt(sampleVariance);

    // Coefficient de variation
    const coefficientOfVariation = mean !== 0 ? (standardDeviation / Math.abs(mean)) * 100 : null;

    // Quartiles
    const quartiles = {
      Q1: this._percentile(sorted, 25),
      Q2: median,
      Q3: this._percentile(sorted, 75)
    };
    const interquartileRange = quartiles.Q3 - quartiles.Q1;

    // Skewness (asymétrie)
    const skewness = this._calculateSkewness(validData, mean, standardDeviation);

    // Kurtosis
    const kurtosis = this._calculateKurtosis(validData, mean, standardDeviation);
    const excessKurtosis = kurtosis - 3;

    return {
      count: data.length,
      validCount: n,
      nullCount,
      nanCount,
      isEmpty: false,
      sum: this._round(sum),
      mean: this._round(mean),
      median: this._round(median),
      mode: modeResult.mode,
      isMultimodal: modeResult.isMultimodal,
      hasNoMode: modeResult.hasNoMode,
      min: this._round(min),
      max: this._round(max),
      range: this._round(range),
      variance: this._round(variance),
      sampleVariance: this._round(sampleVariance),
      standardDeviation: this._round(standardDeviation),
      sampleStandardDeviation: this._round(sampleStandardDeviation),
      coefficientOfVariation: coefficientOfVariation ? this._round(coefficientOfVariation) : null,
      quartiles: {
        Q1: this._round(quartiles.Q1),
        Q2: this._round(quartiles.Q2),
        Q3: this._round(quartiles.Q3)
      },
      interquartileRange: this._round(interquartileRange),
      skewness: this._round(skewness),
      kurtosis: this._round(kurtosis),
      excessKurtosis: this._round(excessKurtosis)
    };
  }

  /**
   * Calcule la médiane
   * @private
   */
  _calculateMedian(sortedData) {
    const n = sortedData.length;
    if (n === 0) return null;
    
    const mid = Math.floor(n / 2);
    return n % 2 === 0 
      ? (sortedData[mid - 1] + sortedData[mid]) / 2 
      : sortedData[mid];
  }

  /**
   * Calcule le mode
   * @private
   */
  _calculateMode(data) {
    const frequency = {};
    let maxFreq = 0;
    
    for (const value of data) {
      frequency[value] = (frequency[value] || 0) + 1;
      maxFreq = Math.max(maxFreq, frequency[value]);
    }

    if (maxFreq === 1) {
      return { mode: [], isMultimodal: false, hasNoMode: true };
    }

    const modes = Object.keys(frequency)
      .filter(key => frequency[key] === maxFreq)
      .map(Number);

    return {
      mode: modes,
      isMultimodal: modes.length > 1,
      hasNoMode: false
    };
  }

  /**
   * Calcule un percentile
   * @private
   */
  _percentile(sortedData, p) {
    if (sortedData.length === 0) return null;
    
    const index = (p / 100) * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedData[lower];
    }
    
    return sortedData[lower] + (sortedData[upper] - sortedData[lower]) * (index - lower);
  }

  /**
   * Calcule plusieurs percentiles
   */
  percentiles(data, percentileList) {
    const sorted = [...data].filter(v => !isNaN(v)).sort((a, b) => a - b);
    const result = {};
    
    for (const p of percentileList) {
      result[`p${p}`] = this._round(this._percentile(sorted, p));
    }
    
    return result;
  }

  /**
   * Calcule un percentile unique
   */
  percentile(data, p) {
    const sorted = [...data].filter(v => !isNaN(v)).sort((a, b) => a - b);
    return this._round(this._percentile(sorted, p));
  }

  /**
   * Calcule le skewness (asymétrie)
   * @private
   */
  _calculateSkewness(data, mean, stdDev) {
    if (stdDev === 0) return 0;
    
    const n = data.length;
    const sum = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
    
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  /**
   * Calcule le kurtosis
   * @private
   */
  _calculateKurtosis(data, mean, stdDev) {
    if (stdDev === 0) return 0;
    
    const n = data.length;
    const sum = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0);
    
    return (sum / n);
  }

  /**
   * Moyenne pondérée
   */
  weightedMean(data, weights) {
    if (data.length !== weights.length) {
      throw new Error('Data and weights must have the same length');
    }
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < data.length; i++) {
      weightedSum += data[i] * weights[i];
      totalWeight += weights[i];
    }
    
    return this._round(weightedSum / totalWeight);
  }

  /**
   * Moyenne géométrique
   */
  geometricMean(data) {
    const validData = data.filter(v => v > 0);
    if (validData.length === 0) return null;
    
    const product = validData.reduce((acc, val) => acc * val, 1);
    return this._round(Math.pow(product, 1 / validData.length));
  }

  /**
   * Moyenne harmonique
   */
  harmonicMean(data) {
    const validData = data.filter(v => v !== 0);
    if (validData.length === 0) return null;
    
    const sumReciprocals = validData.reduce((acc, val) => acc + (1 / val), 0);
    return this._round(validData.length / sumReciprocals);
  }

  /**
   * Moyenne tronquée
   */
  trimmedMean(data, trimProportion = 0.1) {
    const sorted = [...data].filter(v => !isNaN(v)).sort((a, b) => a - b);
    const trimCount = Math.floor(sorted.length * trimProportion);
    
    const trimmedData = sorted.slice(trimCount, sorted.length - trimCount);
    
    if (trimmedData.length === 0) return null;
    
    const sum = trimmedData.reduce((acc, val) => acc + val, 0);
    return this._round(sum / trimmedData.length);
  }

  /**
   * Écart absolu moyen (MAD)
   */
  meanAbsoluteDeviation(data) {
    const validData = data.filter(v => !isNaN(v));
    if (validData.length === 0) return null;
    
    const mean = validData.reduce((a, b) => a + b, 0) / validData.length;
    const mad = validData.reduce((acc, val) => acc + Math.abs(val - mean), 0) / validData.length;
    
    return this._round(mad);
  }

  // ============================================================================
  // DÉTECTION D'OUTLIERS
  // ============================================================================

  /**
   * Détecte les outliers dans un jeu de données
   */
  detectOutliers(data, options = {}) {
    const method = options.method || 'IQR';
    const validData = data.filter(v => !isNaN(v) && v !== null);
    
    let outlierIndices = [];
    let bounds = {};
    
    switch (method) {
      case 'IQR':
        bounds = this._detectOutliersIQR(validData, options.multiplier || 1.5);
        break;
      case 'zscore':
        bounds = this._detectOutliersZScore(validData, options.threshold || 3);
        break;
      case 'modifiedZscore':
        bounds = this._detectOutliersModifiedZScore(validData, options.threshold || 3.5);
        break;
    }
    
    outlierIndices = [];
    const outliers = [];
    const cleanData = [];
    
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      if (val === null || isNaN(val)) {
        cleanData.push(val);
        continue;
      }
      
      if (val < bounds.lower || val > bounds.upper) {
        outlierIndices.push(i);
        outliers.push(val);
      } else {
        cleanData.push(val);
      }
    }
    
    return {
      outliers,
      outlierIndices,
      outlierCount: outliers.length,
      outlierPercentage: this._round((outliers.length / validData.length) * 100),
      hasOutliers: outliers.length > 0,
      cleanData,
      bounds,
      method
    };
  }

  /**
   * Détection IQR
   * @private
   */
  _detectOutliersIQR(data, multiplier) {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = this._percentile(sorted, 25);
    const q3 = this._percentile(sorted, 75);
    const iqr = q3 - q1;
    
    return {
      lower: q1 - multiplier * iqr,
      upper: q3 + multiplier * iqr,
      q1,
      q3,
      iqr
    };
  }

  /**
   * Détection Z-score
   * @private
   */
  _detectOutliersZScore(data, threshold) {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const stdDev = Math.sqrt(data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length);
    
    return {
      lower: mean - threshold * stdDev,
      upper: mean + threshold * stdDev,
      mean,
      stdDev
    };
  }

  /**
   * Détection Z-score modifié (MAD)
   * @private
   */
  _detectOutliersModifiedZScore(data, threshold) {
    const sorted = [...data].sort((a, b) => a - b);
    const median = this._calculateMedian(sorted);
    const absoluteDeviations = data.map(v => Math.abs(v - median));
    const mad = this._calculateMedian([...absoluteDeviations].sort((a, b) => a - b));
    
    const k = 1.4826; // Facteur de consistance
    const modifiedMAD = k * mad;
    
    return {
      lower: median - threshold * modifiedMAD,
      upper: median + threshold * modifiedMAD,
      median,
      mad: modifiedMAD
    };
  }

  // ============================================================================
  // DISTRIBUTION
  // ============================================================================

  /**
   * Génère un histogramme
   */
  histogram(data, options = {}) {
    const validData = data.filter(v => !isNaN(v) && v !== null);
    
    // Calcul automatique du nombre de bins (règle de Sturges)
    const bins = options.bins || Math.ceil(1 + 3.322 * Math.log10(validData.length));
    
    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const binWidth = (max - min) / bins;
    
    const histogram = Array(bins).fill(0).map((_, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      count: 0,
      frequency: 0
    }));
    
    for (const value of validData) {
      let binIndex = Math.floor((value - min) / binWidth);
      if (binIndex === bins) binIndex = bins - 1; // Edge case pour la valeur max
      histogram[binIndex].count++;
    }
    
    // Calculer les fréquences
    for (const bin of histogram) {
      bin.frequency = this._round(bin.count / validData.length);
    }
    
    return {
      bins: histogram,
      binWidth: this._round(binWidth),
      min,
      max,
      totalCount: validData.length
    };
  }

  /**
   * Test de normalité (approximation)
   */
  normalityTest(data) {
    const validData = data.filter(v => !isNaN(v) && v !== null);
    const stats = this.descriptiveStats(validData);
    
    // Test simplifié basé sur skewness et kurtosis
    const skewnessOK = Math.abs(stats.skewness) < 2;
    const kurtosisOK = Math.abs(stats.excessKurtosis) < 7;
    
    // Approximation du p-value basée sur les critères
    const pValue = skewnessOK && kurtosisOK ? 0.1 : 0.001;
    
    return {
      isNormal: skewnessOK && kurtosisOK,
      statistic: Math.abs(stats.skewness) + Math.abs(stats.excessKurtosis) / 2,
      pValue,
      skewness: stats.skewness,
      kurtosis: stats.kurtosis
    };
  }

  /**
   * Distribution cumulative
   */
  cumulativeDistribution(data) {
    const sorted = [...data].filter(v => !isNaN(v)).sort((a, b) => a - b);
    
    return sorted.map((value, index) => ({
      value,
      cumulativeProbability: this._round((index + 1) / sorted.length)
    }));
  }

  /**
   * Identifie le type de distribution
   */
  identifyDistribution(data) {
    const stats = this.descriptiveStats(data);
    const normalityTest = this.normalityTest(data);
    
    let suggestedDistribution = 'unknown';
    let confidence = 0;
    
    if (normalityTest.isNormal) {
      suggestedDistribution = 'normal';
      confidence = 0.8;
    } else if (stats.skewness > 1) {
      suggestedDistribution = 'right_skewed';
      confidence = 0.7;
    } else if (stats.skewness < -1) {
      suggestedDistribution = 'left_skewed';
      confidence = 0.7;
    } else if (Math.abs(stats.skewness) < 0.5 && !normalityTest.isNormal) {
      suggestedDistribution = 'uniform';
      confidence = 0.5;
    }
    
    return {
      suggestedDistribution,
      confidence,
      stats
    };
  }

  // ============================================================================
  // CORRÉLATION
  // ============================================================================

  /**
   * Calcule les corrélations entre deux variables
   */
  correlation(x, y) {
    if (x.length !== y.length) {
      throw new Error('Arrays must have the same length');
    }
    
    const validPairs = [];
    for (let i = 0; i < x.length; i++) {
      if (!isNaN(x[i]) && !isNaN(y[i]) && x[i] !== null && y[i] !== null) {
        validPairs.push({ x: x[i], y: y[i] });
      }
    }
    
    if (validPairs.length < 3) {
      return { pearson: null, spearman: null, error: 'Insufficient data' };
    }
    
    const xVals = validPairs.map(p => p.x);
    const yVals = validPairs.map(p => p.y);
    
    // Pearson
    const pearson = this._pearsonCorrelation(xVals, yVals);
    
    // Spearman
    const spearman = this._spearmanCorrelation(xVals, yVals);
    
    // Interprétation
    const absCorr = Math.abs(pearson);
    let strength;
    if (absCorr >= 0.9) strength = 'very_strong';
    else if (absCorr >= 0.7) strength = 'strong';
    else if (absCorr >= 0.5) strength = 'moderate';
    else if (absCorr >= 0.3) strength = 'weak';
    else strength = 'negligible';
    
    const direction = pearson >= 0 ? 'positive' : 'negative';
    
    // Significativité (approximation)
    const n = validPairs.length;
    const tStatistic = pearson * Math.sqrt((n - 2) / (1 - pearson * pearson));
    const pValue = this._tDistributionPValue(Math.abs(tStatistic), n - 2);
    
    return {
      pearson: this._round(pearson),
      spearman: this._round(spearman),
      strength,
      direction,
      pValue: this._round(pValue),
      isSignificant: pValue < 0.05,
      n
    };
  }

  /**
   * Corrélation de Pearson
   * @private
   */
  _pearsonCorrelation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Corrélation de Spearman
   * @private
   */
  _spearmanCorrelation(x, y) {
    const rankX = this._rank(x);
    const rankY = this._rank(y);
    return this._pearsonCorrelation(rankX, rankY);
  }

  /**
   * Calcule les rangs
   * @private
   */
  _rank(arr) {
    const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
      const avgRank = (i + j - 1) / 2 + 1;
      for (let k = i; k < j; k++) {
        ranks[sorted[k].i] = avgRank;
      }
      i = j;
    }
    
    return ranks;
  }

  /**
   * Matrice de corrélation
   */
  correlationMatrix(columns) {
    const colNames = Object.keys(columns);
    const matrix = {};
    const strongestPositive = { columns: null, value: -1 };
    const strongestNegative = { columns: null, value: 1 };
    
    for (const col1 of colNames) {
      matrix[col1] = {};
      for (const col2 of colNames) {
        if (col1 === col2) {
          matrix[col1][col2] = 1;
        } else if (matrix[col2]?.[col1] !== undefined) {
          matrix[col1][col2] = matrix[col2][col1];
        } else {
          const corr = this.correlation(columns[col1], columns[col2]);
          matrix[col1][col2] = corr.pearson;
          
          if (col1 !== col2) {
            if (corr.pearson > strongestPositive.value) {
              strongestPositive.value = corr.pearson;
              strongestPositive.columns = [col1, col2];
            }
            if (corr.pearson < strongestNegative.value) {
              strongestNegative.value = corr.pearson;
              strongestNegative.columns = [col1, col2];
            }
          }
        }
      }
    }
    
    return { matrix, strongestPositive, strongestNegative };
  }

  // ============================================================================
  // RÉGRESSION
  // ============================================================================

  /**
   * Régression linéaire simple
   */
  linearRegression(x, y) {
    if (x.length !== y.length || x.length < 2) {
      throw new Error('Arrays must have same length and at least 2 points');
    }
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    
    const meanX = sumX / n;
    const meanY = sumY / n;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = meanY - slope * meanX;
    
    // Prédictions et résidus
    const predictions = x.map(xi => slope * xi + intercept);
    const residuals = y.map((yi, i) => yi - predictions[i]);
    
    // R-squared
    const ssRes = residuals.reduce((acc, r) => acc + r * r, 0);
    const ssTot = y.reduce((acc, yi) => acc + Math.pow(yi - meanY, 2), 0);
    const rSquared = 1 - ssRes / ssTot;
    
    // Standard error
    const standardError = Math.sqrt(ssRes / (n - 2));
    
    // Vérifier si relation non-linéaire pourrait être meilleure
    const suggestNonLinear = rSquared < 0.8 && this._checkNonLinearPattern(residuals);
    
    return {
      slope: this._round(slope),
      intercept: this._round(intercept),
      rSquared: this._round(rSquared),
      residuals: residuals.map(r => this._round(r)),
      standardError: this._round(standardError),
      suggestNonLinear,
      predict: (xNew) => this._round(slope * xNew + intercept),
      predictWithInterval: (xNew, _confidence = 0.95) => {
        const yPred = slope * xNew + intercept;
        const margin = 1.96 * standardError; // Approximation
        return {
          value: this._round(yPred),
          lowerBound: this._round(yPred - margin),
          upperBound: this._round(yPred + margin)
        };
      }
    };
  }

  /**
   * Vérifie un pattern non-linéaire dans les résidus
   * @private
   */
  _checkNonLinearPattern(residuals) {
    // Vérifier si les résidus montrent un pattern
    let positiveRuns = 0;
    let negativeRuns = 0;
    let currentSign = null;
    
    for (const r of residuals) {
      const sign = r >= 0 ? 'pos' : 'neg';
      if (sign !== currentSign) {
        if (sign === 'pos') positiveRuns++;
        else negativeRuns++;
        currentSign = sign;
      }
    }
    
    // Si peu de changements de signe, pattern non-linéaire possible
    return (positiveRuns + negativeRuns) < residuals.length / 3;
  }

  // ============================================================================
  // ANALYSE TEMPORELLE
  // ============================================================================

  /**
   * Moyenne mobile
   */
  movingAverage(data, windowSize) {
    const result = [];
    
    for (let i = 0; i <= data.length - windowSize; i++) {
      const window = data.slice(i, i + windowSize);
      const avg = window.reduce((a, b) => a + b, 0) / windowSize;
      result.push(this._round(avg));
    }
    
    return result;
  }

  /**
   * Moyenne mobile exponentielle
   */
  exponentialMovingAverage(data, alpha) {
    const result = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      const ema = alpha * data[i] + (1 - alpha) * result[i - 1];
      result.push(this._round(ema));
    }
    
    return result;
  }

  /**
   * Détecte la tendance
   */
  detectTrend(data) {
    const regression = this.linearRegression(
      data.map((_, i) => i),
      data
    );
    
    const slopeNormalized = regression.slope / (Math.abs(data[0]) || 1);
    
    let trend;
    if (slopeNormalized > 0.01) trend = 'increasing';
    else if (slopeNormalized < -0.01) trend = 'decreasing';
    else trend = 'stable';
    
    return {
      trend,
      strength: Math.abs(slopeNormalized),
      slope: regression.slope,
      rSquared: regression.rSquared
    };
  }

  /**
   * Calcule le taux de croissance
   */
  growthRate(data) {
    if (data.length < 2) return { averageGrowthRate: null };
    
    const rates = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i - 1] !== 0) {
        rates.push((data[i] - data[i - 1]) / data[i - 1]);
      }
    }
    
    const averageGrowthRate = rates.length > 0 
      ? rates.reduce((a, b) => a + b, 0) / rates.length 
      : null;
    
    // Taux de croissance composé
    const start = data[0];
    const end = data[data.length - 1];
    const periods = data.length - 1;
    const compoundGrowthRate = start > 0 && end > 0 
      ? Math.pow(end / start, 1 / periods) - 1 
      : null;
    
    return {
      averageGrowthRate: averageGrowthRate ? this._round(averageGrowthRate) : null,
      compoundGrowthRate: compoundGrowthRate ? this._round(compoundGrowthRate) : null,
      periodRates: rates.map(r => this._round(r))
    };
  }

  /**
   * Détecte la saisonnalité
   */
  detectSeasonality(data, options = {}) {
    const period = options.period || 4;
    
    if (data.length < period * 2) {
      return { hasSeasonality: false, reason: 'Insufficient data' };
    }
    
    // Calculer les moyennes par période
    const periodAverages = [];
    for (let p = 0; p < period; p++) {
      const values = [];
      for (let i = p; i < data.length; i += period) {
        values.push(data[i]);
      }
      periodAverages.push(values.reduce((a, b) => a + b, 0) / values.length);
    }
    
    // Vérifier la variance entre périodes
    const overallMean = periodAverages.reduce((a, b) => a + b, 0) / period;
    const variance = periodAverages.reduce((acc, avg) => acc + Math.pow(avg - overallMean, 2), 0) / period;
    const cv = Math.sqrt(variance) / Math.abs(overallMean);
    
    return {
      hasSeasonality: cv > 0.1,
      period,
      periodAverages: periodAverages.map(a => this._round(a)),
      seasonalStrength: this._round(cv)
    };
  }

  /**
   * Prévision simple
   */
  forecast(data, periods) {
    const trend = this.detectTrend(data);
    const predictions = [];
    
    for (let i = 1; i <= periods; i++) {
      const predicted = trend.slope * (data.length + i - 1) + 
        (data.reduce((a, b) => a + b, 0) / data.length - trend.slope * (data.length - 1) / 2);
      predictions.push(this._round(predicted));
    }
    
    return {
      predictions,
      method: 'linear_extrapolation',
      confidence: trend.rSquared
    };
  }

  // ============================================================================
  // ANALYSE CATÉGORIELLE
  // ============================================================================

  /**
   * Table de fréquence
   */
  frequencyTable(data, options = {}) {
    const frequency = {};
    const total = data.length;
    
    for (const value of data) {
      frequency[value] = frequency[value] || { count: 0, percentage: 0 };
      frequency[value].count++;
    }
    
    for (const key of Object.keys(frequency)) {
      frequency[key].percentage = this._round((frequency[key].count / total) * 100);
    }
    
    if (options.sortBy === 'count') {
      const sorted = {};
      Object.keys(frequency)
        .sort((a, b) => frequency[b].count - frequency[a].count)
        .forEach(key => sorted[key] = frequency[key]);
      return sorted;
    }
    
    return frequency;
  }

  /**
   * Mode catégoriel
   */
  categoricalMode(data) {
    const freq = this.frequencyTable(data);
    let maxCount = 0;
    let mode = null;
    
    for (const [key, value] of Object.entries(freq)) {
      if (value.count > maxCount) {
        maxCount = value.count;
        mode = key;
      }
    }
    
    return { mode, frequency: maxCount };
  }

  /**
   * Entropie
   */
  entropy(data) {
    const freq = this.frequencyTable(data);
    const total = data.length;
    let entropy = 0;
    
    for (const value of Object.values(freq)) {
      const p = value.count / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    
    return this._round(entropy);
  }

  /**
   * Test du chi-carré
   */
  chiSquareTest(data, col1, col2) {
    // Construire la table de contingence
    const contingency = {};
    const col1Values = new Set();
    const col2Values = new Set();
    
    for (const row of data) {
      const v1 = row[col1];
      const v2 = row[col2];
      col1Values.add(v1);
      col2Values.add(v2);
      
      if (!contingency[v1]) contingency[v1] = {};
      contingency[v1][v2] = (contingency[v1][v2] || 0) + 1;
    }
    
    const n = data.length;
    const rows = Array.from(col1Values);
    const cols = Array.from(col2Values);
    
    // Calculer les marges
    const rowTotals = {};
    const colTotals = {};
    
    for (const r of rows) {
      rowTotals[r] = 0;
      for (const c of cols) {
        const observed = contingency[r]?.[c] || 0;
        rowTotals[r] += observed;
        colTotals[c] = (colTotals[c] || 0) + observed;
      }
    }
    
    // Calculer chi-carré
    let chiSquare = 0;
    for (const r of rows) {
      for (const c of cols) {
        const observed = contingency[r]?.[c] || 0;
        const expected = (rowTotals[r] * colTotals[c]) / n;
        if (expected > 0) {
          chiSquare += Math.pow(observed - expected, 2) / expected;
        }
      }
    }
    
    const degreesOfFreedom = (rows.length - 1) * (cols.length - 1);
    const pValue = this._chiSquarePValue(chiSquare, degreesOfFreedom);
    
    return {
      statistic: this._round(chiSquare),
      degreesOfFreedom,
      pValue: this._round(pValue),
      isSignificant: pValue < 0.05
    };
  }

  // ============================================================================
  // GROUPBY ET AGRÉGATION
  // ============================================================================

  /**
   * GroupBy avec une seule agrégation
   */
  groupBy(data, groupColumn, valueColumn, aggregation) {
    const groups = {};
    
    for (const row of data) {
      const key = row[groupColumn];
      if (!groups[key]) groups[key] = [];
      groups[key].push(row[valueColumn]);
    }
    
    const result = {};
    for (const [key, values] of Object.entries(groups)) {
      result[key] = this._aggregate(values, aggregation);
    }
    
    return result;
  }

  /**
   * GroupBy avec plusieurs colonnes
   */
  groupByMultiple(data, groupColumns, valueColumn, aggregation) {
    const result = {};
    
    for (const row of data) {
      let current = result;
      for (let i = 0; i < groupColumns.length - 1; i++) {
        const key = row[groupColumns[i]];
        if (!current[key]) current[key] = {};
        current = current[key];
      }
      
      const lastKey = row[groupColumns[groupColumns.length - 1]];
      if (!current[lastKey]) current[lastKey] = [];
      current[lastKey].push(row[valueColumn]);
    }
    
    // Agréger
    this._aggregateNested(result, aggregation, groupColumns.length);
    
    return result;
  }

  /**
   * Agrège récursivement
   * @private
   */
  _aggregateNested(obj, aggregation, depth) {
    if (depth === 1) {
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          obj[key] = this._aggregate(obj[key], aggregation);
        }
      }
    } else {
      for (const key of Object.keys(obj)) {
        this._aggregateNested(obj[key], aggregation, depth - 1);
      }
    }
  }

  /**
   * GroupBy avec plusieurs agrégations
   */
  groupByWithMultipleAggs(data, groupColumn, valueColumn, aggregations) {
    const groups = {};
    
    for (const row of data) {
      const key = row[groupColumn];
      if (!groups[key]) groups[key] = [];
      groups[key].push(row[valueColumn]);
    }
    
    const result = {};
    for (const [key, values] of Object.entries(groups)) {
      result[key] = {};
      for (const agg of aggregations) {
        result[key][agg] = this._aggregate(values, agg);
      }
    }
    
    return result;
  }

  /**
   * Tableau croisé dynamique
   */
  pivotTable(data, rowField, colField, valueField, aggregation) {
    const rows = new Set();
    const cols = new Set();
    const cells = {};
    
    for (const row of data) {
      const r = row[rowField];
      const c = row[colField];
      rows.add(r);
      cols.add(c);
      
      const key = `${r}__${c}`;
      if (!cells[key]) cells[key] = [];
      cells[key].push(row[valueField]);
    }
    
    const result = {};
    const rowTotals = {};
    const columnTotals = {};
    
    for (const r of rows) {
      result[r] = {};
      rowTotals[r] = 0;
      
      for (const c of cols) {
        const key = `${r}__${c}`;
        const value = cells[key] ? this._aggregate(cells[key], aggregation) : 0;
        result[r][c] = value;
        rowTotals[r] += value;
        columnTotals[c] = (columnTotals[c] || 0) + value;
      }
    }
    
    return {
      data: result,
      rowTotals,
      columnTotals,
      grandTotal: Object.values(rowTotals).reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Fonction d'agrégation
   * @private
   */
  _aggregate(values, aggregation) {
    const validValues = values.filter(v => !isNaN(v) && v !== null);
    
    switch (aggregation) {
      case 'sum':
        return this._round(validValues.reduce((a, b) => a + b, 0));
      case 'mean':
        return validValues.length > 0 
          ? this._round(validValues.reduce((a, b) => a + b, 0) / validValues.length)
          : null;
      case 'count':
        return validValues.length;
      case 'min':
        return validValues.length > 0 ? Math.min(...validValues) : null;
      case 'max':
        return validValues.length > 0 ? Math.max(...validValues) : null;
      case 'median':
        return this._calculateMedian([...validValues].sort((a, b) => a - b));
      default:
        return null;
    }
  }

  // ============================================================================
  // COMPARAISON DE GROUPES
  // ============================================================================

  /**
   * Test t de Student
   */
  tTest(group1, group2) {
    const n1 = group1.length;
    const n2 = group2.length;
    
    const mean1 = group1.reduce((a, b) => a + b, 0) / n1;
    const mean2 = group2.reduce((a, b) => a + b, 0) / n2;
    
    const var1 = group1.reduce((acc, v) => acc + Math.pow(v - mean1, 2), 0) / (n1 - 1);
    const var2 = group2.reduce((acc, v) => acc + Math.pow(v - mean2, 2), 0) / (n2 - 1);
    
    const pooledStdErr = Math.sqrt(var1 / n1 + var2 / n2);
    const tStatistic = (mean1 - mean2) / pooledStdErr;
    
    const df = n1 + n2 - 2;
    const pValue = this._tDistributionPValue(Math.abs(tStatistic), df) * 2; // Two-tailed
    
    return {
      tStatistic: this._round(tStatistic),
      degreesOfFreedom: df,
      pValue: this._round(pValue),
      significantDifference: pValue < 0.05,
      meanDifference: this._round(mean1 - mean2)
    };
  }

  /**
   * Taille d'effet (Cohen's d)
   */
  effectSize(group1, group2) {
    const mean1 = group1.reduce((a, b) => a + b, 0) / group1.length;
    const mean2 = group2.reduce((a, b) => a + b, 0) / group2.length;
    
    const var1 = group1.reduce((acc, v) => acc + Math.pow(v - mean1, 2), 0) / (group1.length - 1);
    const var2 = group2.reduce((acc, v) => acc + Math.pow(v - mean2, 2), 0) / (group2.length - 1);
    
    const pooledStd = Math.sqrt(((group1.length - 1) * var1 + (group2.length - 1) * var2) / 
      (group1.length + group2.length - 2));
    
    const cohensD = (mean1 - mean2) / pooledStd;
    const absD = Math.abs(cohensD);
    
    let interpretation;
    if (absD >= 0.8) interpretation = 'large';
    else if (absD >= 0.5) interpretation = 'medium';
    else if (absD >= 0.2) interpretation = 'small';
    else interpretation = 'negligible';
    
    return {
      cohensD: this._round(cohensD),
      interpretation
    };
  }

  /**
   * ANOVA (Analysis of Variance)
   */
  anova(groups) {
    const groupNames = Object.keys(groups);
    const allValues = [];
    const groupMeans = {};
    const groupSizes = {};
    
    for (const [name, values] of Object.entries(groups)) {
      allValues.push(...values);
      groupMeans[name] = values.reduce((a, b) => a + b, 0) / values.length;
      groupSizes[name] = values.length;
    }
    
    const grandMean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    
    // SSB (Between-group sum of squares)
    let ssb = 0;
    for (const name of groupNames) {
      ssb += groupSizes[name] * Math.pow(groupMeans[name] - grandMean, 2);
    }
    
    // SSW (Within-group sum of squares)
    let ssw = 0;
    for (const [name, values] of Object.entries(groups)) {
      ssw += values.reduce((acc, v) => acc + Math.pow(v - groupMeans[name], 2), 0);
    }
    
    const dfBetween = groupNames.length - 1;
    const dfWithin = allValues.length - groupNames.length;
    
    const msBetween = ssb / dfBetween;
    const msWithin = ssw / dfWithin;
    
    const fStatistic = msBetween / msWithin;
    const pValue = this._fDistributionPValue(fStatistic, dfBetween, dfWithin);
    
    return {
      fStatistic: this._round(fStatistic),
      pValue: this._round(pValue),
      betweenGroupVariance: this._round(msBetween),
      withinGroupVariance: this._round(msWithin),
      isSignificant: pValue < 0.05
    };
  }

  // ============================================================================
  // ANALYSE COMPLÈTE DE DATASET
  // ============================================================================

  /**
   * Analyse complète d'un dataset
   */
  analyzeDataset(dataset) {
    const { columns, rows } = dataset;
    
    const numericColumns = [];
    const categoricalColumns = [];
    const statistics = {};
    const categoricalSummary = {};
    
    // Classifier et analyser chaque colonne
    for (const col of columns) {
      const values = rows.map(r => r[col]);
      const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
      
      if (numericValues.length > values.length * 0.5) {
        numericColumns.push(col);
        statistics[col] = this.descriptiveStats(numericValues);
      } else {
        categoricalColumns.push(col);
        const unique = new Set(values.filter(v => v !== null));
        categoricalSummary[col] = {
          uniqueValues: unique.size,
          mode: this.categoricalMode(values.filter(v => v !== null)),
          frequency: this.frequencyTable(values.filter(v => v !== null), { sortBy: 'count' })
        };
      }
    }
    
    // Corrélations entre colonnes numériques
    let correlations = null;
    if (numericColumns.length >= 2) {
      const numericData = {};
      for (const col of numericColumns) {
        numericData[col] = rows.map(r => r[col]).filter(v => !isNaN(v));
      }
      correlations = this.correlationMatrix(numericData).matrix;
    }
    
    // Qualité des données
    let nullCount = 0;
    const outlierWarnings = [];
    
    for (const row of rows) {
      for (const col of columns) {
        if (row[col] === null || row[col] === undefined) {
          nullCount++;
        }
      }
    }
    
    for (const col of numericColumns) {
      const values = rows.map(r => r[col]).filter(v => !isNaN(v));
      const outliers = this.detectOutliers(values);
      if (outliers.hasOutliers) {
        outlierWarnings.push({
          column: col,
          outlierCount: outliers.outlierCount,
          percentage: outliers.outlierPercentage
        });
      }
    }
    
    // Résumé exécutif
    const executiveSummary = {
      totalRows: rows.length,
      totalColumns: columns.length,
      numericColumnCount: numericColumns.length,
      categoricalColumnCount: categoricalColumns.length,
      keyInsights: this._generateKeyInsights(statistics, categoricalSummary, correlations)
    };
    
    return {
      numericColumns,
      categoricalColumns,
      statistics,
      categoricalSummary,
      correlations,
      dataQuality: {
        nullCount,
        completenessScore: 1 - (nullCount / (rows.length * columns.length)),
        outlierWarnings
      },
      executiveSummary
    };
  }

  /**
   * Génère les insights clés
   * @private
   */
  _generateKeyInsights(statistics, categoricalSummary, correlations) {
    const insights = [];
    
    // Insights sur les stats numériques
    for (const [col, stats] of Object.entries(statistics)) {
      if (Math.abs(stats.skewness) > 1) {
        insights.push(`${col} shows ${stats.skewness > 0 ? 'positive' : 'negative'} skewness`);
      }
    }
    
    // Insights sur les corrélations
    if (correlations) {
      for (const col1 of Object.keys(correlations)) {
        for (const col2 of Object.keys(correlations[col1])) {
          if (col1 < col2 && Math.abs(correlations[col1][col2]) > 0.7) {
            insights.push(`Strong correlation between ${col1} and ${col2}`);
          }
        }
      }
    }
    
    return insights;
  }

  // ============================================================================
  // UTILITAIRES
  // ============================================================================

  /**
   * Arrondit une valeur
   * @private
   */
  _round(value) {
    if (value === null || value === undefined || isNaN(value)) return value;
    return Number(value.toFixed(this.options.precision));
  }

  /**
   * Approximation de la p-value pour t-distribution
   * @private
   */
  _tDistributionPValue(t, df) {
    // Approximation simple
    const x = df / (df + t * t);
    return 0.5 * Math.pow(x, df / 2);
  }

  /**
   * Approximation de la p-value pour chi-carré
   * @private
   */
  _chiSquarePValue(chiSquare, df) {
    // Approximation grossière
    if (chiSquare <= 0) return 1;
    return Math.exp(-chiSquare / 2) * Math.pow(chiSquare, (df / 2) - 1);
  }

  /**
   * Approximation de la p-value pour F-distribution
   * @private
   */
  _fDistributionPValue(f, df1, df2) {
    // Approximation simple
    if (f <= 0) return 1;
    const x = df2 / (df2 + df1 * f);
    return Math.pow(x, df2 / 2);
  }
}

export default StatisticalEngine;
