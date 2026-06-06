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

  it('_formatForAI — numeric + categorical aggregations', () => {
    const analysis = {
      summary: {},
      sheets: [
        {
          headers: ['Product', 'Revenue', 'Units'],
          rows: [
            { Product: 'A', Revenue: 100, Units: 2 },
            { Product: 'B', Revenue: 200, Units: 5 },
            { Product: 'A', Revenue: 50, Units: 1 },
            { Product: 'C', Revenue: 300, Units: 7 },
          ],
        },
      ],
    };
    expect(analyzer._formatForAI(analysis, 'Quel est le meilleur produit ?')).toMatchSnapshot();
  });

  it('_formatForAI — empty data', () => {
    expect(analyzer._formatForAI({ sheets: [{ headers: [], rows: [] }] }, 'rien')).toMatchSnapshot();
  });

  it('_formatForAI — no sheets', () => {
    expect(analyzer._formatForAI({}, 'question')).toMatchSnapshot();
  });
});

// Rich analysis object exercising every branch/section of exportForChat.
const richAnalysis = {
  summary: {
    totalRows: 4,
    totalColumns: 3,
    totalSheets: 1,
    keyInsights: ['Revenue is highly variable', 'EU dominates'],
    recommendations: ['Investigate the 5000 outlier'],
    patterns: ['Right-skewed Revenue distribution'],
    topPerformers: ['EU region'],
  },
  metadata: { totalRows: 4, totalColumns: 3 },
  dataQuality: {
    completeness: 87.5,
    duplicates: { count: 1 },
    missingValues: { email: 1, Revenue: 0 },
  },
  strongCorrelations: [
    { column1: 'Revenue', column2: 'Units', correlation: 0.92 },
    { column1: 'Revenue', column2: 'Region', correlation: 0.65 },
    { column1: 'A', column2: 'B', correlation: -0.55 },
  ],
  sheets: [
    {
      name: 'Sales',
      headers: ['Revenue', 'Region', 'email'],
      columnTypes: { Revenue: 'number', Region: 'string', email: 'email' },
      statistics: {
        Revenue: {
          count: 4,
          mean: 1350,
          median: 150,
          standardDeviation: 2100,
          min: 100,
          max: 5000,
          sum: 5400,
          quartiles: { Q1: 100, Q3: 1400 },
          interquartileRange: 1300,
        },
      },
      categoricalAnalysis: {
        Region: {
          uniqueCount: 2,
          mode: 'EU',
          frequencies: { EU: 3, US: 1 },
        },
      },
      outliers: {
        Revenue: {
          method: 'IQR',
          outliers: [{ value: 5000 }, { value: 4800 }],
          bounds: { lower: 0, upper: 3000 },
        },
      },
    },
  ],
};

describe('ExcelAnalyzer export/query formatters — characterization', () => {
  it('exportForChat — full rich analysis (all sections)', () => {
    expect(analyzer.exportForChat(richAnalysis)).toMatchSnapshot();
  });

  it('exportForChat — minimal/empty analysis', () => {
    expect(analyzer.exportForChat({})).toMatchSnapshot();
  });

  it('exportForChat — partial (quality only, no stats/categorical)', () => {
    expect(
      analyzer.exportForChat({
        summary: { totalRows: 2, totalColumns: 1 },
        dataQuality: { completeness: 100, missingValues: {}, duplicates: { count: 0 } },
        sheets: [{ headers: ['A'], columnTypes: { A: 'integer' } }],
      })
    ).toMatchSnapshot();
  });

  it('exportToMarkdown — with stats', () => {
    expect(analyzer.exportToMarkdown(richAnalysis)).toMatchSnapshot();
  });

  it('exportToMarkdown — empty', () => {
    expect(analyzer.exportToMarkdown({})).toMatchSnapshot();
  });

  it('exportToJSON — round-trips analysis', () => {
    expect(analyzer.exportToJSON({ a: 1, b: [2, 3] })).toMatchSnapshot();
  });

  it('_interpretQuery — average/mean branch', () => {
    expect(analyzer._interpretQuery('What is the average revenue?', richAnalysis)).toMatchSnapshot();
  });

  it('_interpretQuery — grouped "by" branch', () => {
    expect(
      analyzer._interpretQuery('revenue by region', {
        ...richAnalysis,
        groupedAnalysis: { EU: 5300, US: 200 },
      })
    ).toMatchSnapshot();
  });

  it('_interpretQuery — default + no-sheet branches', () => {
    expect({
      def: analyzer._interpretQuery('list everything', richAnalysis),
      noSheet: analyzer._interpretQuery('average', { sheets: [] }),
    }).toMatchSnapshot();
  });
});
