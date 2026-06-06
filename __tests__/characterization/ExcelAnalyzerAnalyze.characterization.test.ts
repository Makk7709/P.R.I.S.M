/**
 * Characterization tests for ExcelAnalyzer.analyze + _analyzeSheet
 * (src/excel/ExcelAnalyzer.js, S3776 + S7059).
 *
 * analyze() is an async orchestrator that depends on the parser (I/O),
 * TrustContext (network) and the dynamically-loaded orchestrators. To lock its
 * observable behavior deterministically before the cognitive-complexity refactor
 * and the async-out-of-constructor (S7059) change, we instantiate via
 * Object.create (bypassing the constructor / dynamic imports) and inject:
 *   - the REAL StatisticalEngine + DataTypeDetector (pure, deterministic),
 *   - a mocked parser whose parseWorkbook returns a fixed parsed workbook,
 *   - a mocked TrustContext,
 *   - hybridOrchestrator = null (consensus path falls back to heuristics),
 *   - _initialized = true (ensureInitialized() is a no-op in the harness).
 *
 * The non-deterministic metadata.analysisTimeMs is stripped before snapshotting.
 */
import { describe, it, expect } from 'vitest';
import { ExcelAnalyzer } from '../../src/excel/ExcelAnalyzer.js';
import { StatisticalEngine } from '../../src/excel/StatisticalEngine.js';
import { DataTypeDetector } from '../../src/excel/DataTypeDetector.js';

function makeAnalyzer(overrides: any = {}) {
  const a: any = Object.create(ExcelAnalyzer.prototype);
  a.options = {
    maxFileSize: 50 * 1024 * 1024,
    enableAI: false,
    detailedStats: false,
    useConsensusForAmbiguous: false,
    consensusThreshold: 0.7,
    ...overrides.options,
  };
  a.statsEngine = new StatisticalEngine();
  a.typeDetector = new DataTypeDetector();
  a.trustContext = overrides.trustContext || {
    requestApproval: async () => ({ approved: true }),
    validateCriticalDecision: async () => ({ approved: true }),
  };
  a.trustContextFileSizeThreshold = 10 * 1024 * 1024;
  a.sensitiveKeywords = [
    'confidential',
    'secret',
    'private',
    'internal',
    'classified',
    'restricted',
    'proprietary',
    'personal',
  ];
  a.hybridOrchestrator = null;
  a.taskProcessor = null;
  a._initialized = true;
  a._initPromise = null;
  a.parser = overrides.parser || { parseWorkbook: async () => parsedFixture() };
  return a;
}

function parsedFixture() {
  return {
    success: true,
    metadata: { totalRows: 4, totalColumns: 3 },
    sheets: [
      {
        name: 'Sales',
        headers: ['Revenue', 'Units', 'Region'],
        isEmpty: false,
        columnTypes: { Revenue: 'number', Units: 'number', Region: 'string' },
        typeStats: {
          numericColumns: ['Revenue', 'Units'],
          textColumns: ['Region'],
          dateColumns: [],
        },
        rows: [
          { Revenue: 100, Units: 2, Region: 'EU' },
          { Revenue: 5000, Units: 50, Region: 'EU' },
          { Revenue: 200, Units: 4, Region: 'US' },
          { Revenue: 150, Units: 3, Region: 'EU' },
        ],
      },
    ],
  };
}

// Strip non-deterministic timing and line-numbered stack traces so snapshots
// are stable (error.details = error.stack, whose line numbers shift on refactor
// without any change to observable behavior — code/message/success are kept).
function stable(result: any) {
  if (result?.metadata && 'analysisTimeMs' in result.metadata) {
    result.metadata = { ...result.metadata, analysisTimeMs: '<ms>' };
  }
  if (result?.error && typeof result.error.details === 'string') {
    result.error = { ...result.error, details: '<stack>' };
  }
  return result;
}

const buf = Buffer.from('fake');

describe('ExcelAnalyzer.analyze / _analyzeSheet — characterization', () => {
  it('nominal — full options (stats, correlations, summary, quality, profiles)', async () => {
    const a = makeAnalyzer();
    const res = await a.analyze(buf, {
      computeCorrelations: true,
      detectOutliers: true,
      generateSummary: true,
      checkDataQuality: true,
      profileColumns: true,
    });
    expect(stable(res)).toMatchSnapshot();
  });

  it('nominal — minimal options (no derived analysis)', async () => {
    const a = makeAnalyzer();
    const res = await a.analyze(buf, {});
    expect(stable(res)).toMatchSnapshot();
  });

  it('string overload — analyze(buffer, userQuery)', async () => {
    const a = makeAnalyzer();
    const res = await a.analyze(buf, 'show me the averages', { generateSummary: true });
    expect(stable(res)).toMatchSnapshot();
  });

  it('error path — parser returns success:false', async () => {
    const a = makeAnalyzer({ parser: { parseWorkbook: async () => ({ success: false }) } });
    const res = await a.analyze(buf, {});
    expect(stable(res)).toMatchSnapshot();
  });

  it('error path — parser throws', async () => {
    const a = makeAnalyzer({
      parser: {
        parseWorkbook: async () => {
          throw new Error('boom');
        },
      },
    });
    const res = await a.analyze(buf, {});
    expect(stable(res)).toMatchSnapshot();
  });

  it('trust gate — sensitive keyword triggers approval (approved)', async () => {
    const calls: any[] = [];
    const a = makeAnalyzer({
      trustContext: {
        requestApproval: async (req: any) => {
          calls.push(req.action);
          return { approved: true };
        },
        validateCriticalDecision: async () => ({ approved: true }),
      },
    });
    const res = await a.analyze(buf, 'this is confidential data', { generateSummary: true });
    expect({ result: stable(res), calls }).toMatchSnapshot();
  });

  it('trust gate — rejection produces security error', async () => {
    const a = makeAnalyzer({
      trustContext: {
        requestApproval: async () => ({ approved: false, reason: 'blocked' }),
        validateCriticalDecision: async () => ({ approved: true }),
      },
    });
    const res = await a.analyze(buf, 'secret payload', {});
    expect(stable(res)).toMatchSnapshot();
  });

  it('_analyzeSheet — empty sheet short-circuits', async () => {
    const a = makeAnalyzer();
    const res = await a._analyzeSheet(
      { name: 'Empty', headers: ['A'], rows: [], isEmpty: true, columnTypes: {}, typeStats: {} },
      {}
    );
    expect(res).toMatchSnapshot();
  });

  it('_analyzeSheet — numeric + categorical + outliers + distributions', async () => {
    const a = makeAnalyzer();
    const res = await a._analyzeSheet(parsedFixture().sheets[0], {
      detectOutliers: true,
      analyzeDistributions: true,
    });
    expect(res).toMatchSnapshot();
  });

  it('_analyzeSheet — date columns set hasTimeData', async () => {
    const a = makeAnalyzer();
    const res = await a._analyzeSheet(
      {
        name: 'Time',
        headers: ['When', 'Val'],
        rows: [
          { When: '2024-01-01', Val: 1 },
          { When: '2024-01-02', Val: 2 },
        ],
        isEmpty: false,
        columnTypes: { When: 'date', Val: 'number' },
        typeStats: { numericColumns: ['Val'], textColumns: [], dateColumns: ['When'] },
      },
      {}
    );
    expect(res).toMatchSnapshot();
  });
});
