/**
 * Characterization tests for ExcelAnalyzer pure insight/quality helpers
 * (src/excel/ExcelAnalyzer.js, S3776).
 *
 * These methods are pure transforms over already-analyzed `sheets` objects.
 * We instantiate via Object.create to bypass the async constructor
 * (_loadOrchestrators) and snapshot the outputs to lock behavior before the
 * S3776 refactor of the complex generators.
 */
import { describe, it, expect } from 'vitest';
import { ExcelAnalyzer } from '../../src/excel/ExcelAnalyzer.js';

const analyzer: any = Object.create(ExcelAnalyzer.prototype);

// A rich, deterministic analyzed-sheet fixture exercising the insight branches.
const richSheet = {
  name: 'Sales',
  headers: ['Revenue', 'Region', 'email'],
  rows: [
    { Revenue: 100, Region: 'EU', email: 'a@x.com' },
    { Revenue: 5000, Region: 'EU', email: 'b@x.com' },
    { Revenue: 200, Region: 'US', email: null },
    { Revenue: 100, Region: 'EU', email: 'a@x.com' },
  ],
  columnTypes: { Revenue: 'number', Region: 'string', email: 'string' },
  rowCount: 4,
  columnCount: 3,
  hasTimeData: true,
  typeStats: { numericColumns: ['Revenue'], textColumns: ['Region', 'email'] },
  statistics: {
    Revenue: {
      mean: 1350,
      median: 150,
      max: 5000,
      sum: 5400,
      standardDeviation: 2100,
      skewness: 1.8,
      coefficientOfVariation: 155.5,
    },
  },
  outliers: {
    Revenue: { outliers: [5000, 4800, 4700, 4600, 4500, 4400] },
  },
  categoricalAnalysis: {
    Region: {
      frequencies: { EU: 3, US: 1 },
      topValues: [{ value: 'EU', count: 3 }],
      uniqueCount: 2,
    },
  },
};

const lowVariabilitySheet = {
  name: 'Stable',
  headers: ['Temp'],
  rows: [{ Temp: 20 }, { Temp: 21 }, { Temp: 20 }],
  columnTypes: { Temp: 'number' },
  rowCount: 3,
  columnCount: 1,
  hasTimeData: false,
  typeStats: { numericColumns: ['Temp', 'Other'], textColumns: [] },
  statistics: { Temp: { mean: 20.3, median: 20, standardDeviation: 0.5, sum: 61 } },
  categoricalAnalysis: {},
};

const sheets = [richSheet, lowVariabilitySheet];

describe('ExcelAnalyzer insight/quality helpers — characterization', () => {
  it('_generateKeyInsights', () => {
    expect(analyzer._generateKeyInsights(sheets)).toMatchSnapshot();
  });

  it('_identifyPatterns', () => {
    expect(analyzer._identifyPatterns(sheets)).toMatchSnapshot();
  });

  it('_identifyTopPerformers', () => {
    expect(analyzer._identifyTopPerformers(sheets)).toMatchSnapshot();
  });

  it('_generateRecommendations', () => {
    const insights = analyzer._generateKeyInsights(sheets);
    const patterns = analyzer._identifyPatterns(sheets);
    expect(analyzer._generateRecommendations(sheets, insights, patterns)).toMatchSnapshot();
  });

  it('_generateHighlights', () => {
    expect(analyzer._generateHighlights(sheets)).toMatchSnapshot();
  });

  it('_generateColumnProfiles', () => {
    expect(analyzer._generateColumnProfiles(sheets)).toMatchSnapshot();
  });

  it('_checkDataQuality', () => {
    expect(analyzer._checkDataQuality(sheets)).toMatchSnapshot();
  });

  it('_detectSensitiveColumns', () => {
    expect({
      rich: analyzer._detectSensitiveColumns(richSheet),
      mixed: analyzer._detectSensitiveColumns({
        headers: ['phone_number', 'IBAN', 'random', 'home address'],
      }),
      empty: analyzer._detectSensitiveColumns({ headers: [] }),
      nullSheet: analyzer._detectSensitiveColumns(null),
    }).toMatchSnapshot();
  });

  it('edge: empty sheets array', () => {
    expect({
      insights: analyzer._generateKeyInsights([]),
      patterns: analyzer._identifyPatterns([]),
      profiles: analyzer._generateColumnProfiles([]),
      quality: analyzer._checkDataQuality([]),
    }).toMatchSnapshot();
  });
});
