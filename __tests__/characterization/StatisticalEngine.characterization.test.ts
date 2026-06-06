/**
 * Characterization tests for StatisticalEngine.
 *
 * Captures ACTUAL current behavior of the S3776 targets (correlationMatrix,
 * analyzeDataset, _generateKeyInsights) before refactoring, as golden-master
 * snapshots. Pure data functions (plain arrays/objects), deterministic.
 *
 * Wired into the gate via vitest.config.core-only.js (npm test).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { StatisticalEngine } from '../../src/excel/StatisticalEngine.js';

describe('StatisticalEngine — characterization', () => {
  let engine: any;

  beforeEach(() => {
    // Fixed precision for stable snapshots.
    engine = new StatisticalEngine({ precision: 6 });
  });

  it('correlationMatrix is stable (golden master)', () => {
    const columns = {
      a: [1, 2, 3, 4, 5],
      b: [2, 4, 6, 8, 10], // perfectly correlated with a
      c: [5, 4, 3, 2, 1], // perfectly anti-correlated
      d: [1, 3, 2, 5, 4], // noisy
    };
    expect(engine.correlationMatrix(columns)).toMatchSnapshot();
  });

  it('correlationMatrix on single column is stable (golden master)', () => {
    expect(engine.correlationMatrix({ only: [1, 2, 3] })).toMatchSnapshot();
  });

  it('analyzeDataset is stable (golden master)', () => {
    const dataset = {
      columns: ['age', 'salary', 'dept'],
      rows: [
        { age: 25, salary: 30000, dept: 'eng' },
        { age: 35, salary: 50000, dept: 'eng' },
        { age: 45, salary: 70000, dept: 'sales' },
        { age: 55, salary: 90000, dept: 'sales' },
        { age: 30, salary: 40000, dept: 'eng' },
      ],
    };
    expect(engine.analyzeDataset(dataset)).toMatchSnapshot();
  });

  it('analyzeDataset with nulls and outliers is stable (golden master)', () => {
    const dataset = {
      columns: ['x', 'label'],
      rows: [
        { x: 1, label: 'a' },
        { x: 2, label: 'b' },
        { x: 3, label: null },
        { x: 1000, label: 'a' }, // outlier
        { x: null, label: 'a' },
      ],
    };
    expect(engine.analyzeDataset(dataset)).toMatchSnapshot();
  });

  it('_generateKeyInsights is stable (golden master)', () => {
    const statistics = {
      skewedCol: { skewness: 2.5 },
      negSkew: { skewness: -1.8 },
      normalCol: { skewness: 0.2 },
    };
    const correlations = {
      a: { a: 1, b: 0.9, c: 0.1 },
      b: { a: 0.9, b: 1, c: -0.85 },
      c: { a: 0.1, b: -0.85, c: 1 },
    };
    expect(engine._generateKeyInsights(statistics, {}, correlations)).toMatchSnapshot();
    expect(engine._generateKeyInsights(statistics, {}, null)).toMatchSnapshot();
  });
});
