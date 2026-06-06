/**
 * Characterization tests for ExcelParserService._parseSheet and _extractRows
 * (src/excel/ExcelParserService.js, S3776).
 *
 * Both are pure, in-memory transforms over SheetJS worksheet objects. We build
 * worksheets with XLSX.utils.aoa_to_sheet and snapshot the parsed output to lock
 * in the current behavior before the S3776 refactor.
 */
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { ExcelParserService } from '../../src/excel/ExcelParserService.js';

function sheet(aoa: any[][]) {
  return XLSX.utils.aoa_to_sheet(aoa);
}

describe('ExcelParserService._parseSheet — characterization', () => {
  const svc: any = new ExcelParserService();

  it('basic sheet with headers (default options)', () => {
    const ws = sheet([
      ['Name', 'Age', 'Active'],
      ['Alice', 30, true],
      ['Bob', 25, false],
    ]);
    expect(svc._parseSheet(ws, 'Sheet1', {})).toMatchSnapshot();
  });

  it('empty sheet (no !ref)', () => {
    expect(svc._parseSheet({}, 'Empty', {})).toMatchSnapshot();
  });

  it('hasHeaders=false generates column names', () => {
    const ws = sheet([
      ['x', 1],
      ['y', 2],
    ]);
    expect(svc._parseSheet(ws, 'NoHeaders', { hasHeaders: false })).toMatchSnapshot();
  });

  it('column filter via options.columns', () => {
    const ws = sheet([
      ['Name', 'Age', 'City'],
      ['Alice', 30, 'Paris'],
      ['Bob', 25, 'Lyon'],
    ]);
    expect(svc._parseSheet(ws, 'Filtered', { columns: ['Name', 'City'] })).toMatchSnapshot();
  });

  it('includeStats=true adds stats', () => {
    const ws = sheet([
      ['Score'],
      [10],
      [20],
      [30],
    ]);
    expect(svc._parseSheet(ws, 'Stats', { includeStats: true })).toMatchSnapshot();
  });

  it('detectTypes=false skips type detection', () => {
    const ws = sheet([
      ['A', 'B'],
      [1, 'foo'],
    ]);
    expect(svc._parseSheet(ws, 'NoTypes', { detectTypes: false })).toMatchSnapshot();
  });

  it('explicit range notation', () => {
    const ws = sheet([
      ['H1', 'H2', 'H3'],
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
    expect(svc._parseSheet(ws, 'Ranged', { range: 'A1:B3' })).toMatchSnapshot();
  });
});

describe('ExcelParserService._extractRows — characterization', () => {
  const svc: any = new ExcelParserService();

  function range(aoa: any[][]) {
    const ws = sheet(aoa);
    return { ws, range: XLSX.utils.decode_range(ws['!ref']) };
  }

  it('extracts rows skipping fully empty ones', () => {
    const { ws, range: r } = range([
      ['Name', 'Age'],
      ['Alice', 30],
      [null, null],
      ['Bob', 25],
    ]);
    const headers = ['Name', 'Age'];
    expect(svc._extractRows(ws, headers, 1, r.e.r, r, {}, null)).toMatchSnapshot();
  });

  it('respects columnIndices subset', () => {
    const { ws, range: r } = range([
      ['Name', 'Age', 'City'],
      ['Alice', 30, 'Paris'],
    ]);
    expect(svc._extractRows(ws, ['Name', 'City'], 1, r.e.r, r, {}, [0, 2])).toMatchSnapshot();
  });

  it('handles missing cells as null', () => {
    const { ws, range: r } = range([
      ['A', 'B', 'C'],
      ['only-a', null, null],
    ]);
    expect(svc._extractRows(ws, ['A', 'B', 'C'], 1, r.e.r, r, {}, null)).toMatchSnapshot();
  });
});
