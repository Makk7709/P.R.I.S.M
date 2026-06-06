/**
 * Characterization tests for DataTypeDetector.
 *
 * Goal: capture the ACTUAL current behavior of the string-type dispatch
 * (`_detectStringType`) and the numeric-string parser (`_parseNumericString`)
 * BEFORE the S3776 cognitive-complexity refactor, then prove the refactor is
 * iso-behavior. These are golden-master (snapshot) tests: the committed
 * snapshot encodes the pre-refactor output; any divergence fails the gate.
 *
 * Wired into the gate via vitest.config.core-only.js (npm test).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DataTypeDetector } from '../../src/excel/DataTypeDetector.js';

describe('DataTypeDetector — characterization (string type dispatch)', () => {
  let detector: any;

  beforeEach(() => {
    detector = new DataTypeDetector();
  });

  // Representative inputs exercising every branch of _detectStringType, in
  // order: booleans, uuid, email, url, phones, postal, dates, time, currency,
  // percentage, numeric (FR/DE/US/scientific), alphanumeric id, plain string,
  // plus edge cases (empty, whitespace, ambiguous dates, MM/DD vs DD/MM).
  const STRING_INPUTS: string[] = [
    // boolean
    'true',
    'false',
    'oui',
    'non',
    'yes',
    'no',
    'TRUE',
    'Vrai',
    // uuid
    '550e8400-e29b-41d4-a716-446655440000',
    // email
    'jane.doe@example.com',
    // url
    'https://example.com/path?q=1',
    'http://test.org',
    // phone
    '01 23 45 67 89',
    '0123456789',
    '+33 1 23 45 67 89',
    '+14155552671',
    // postal FR
    '75001',
    // dates
    '2023-01-15T10:30:00',
    '2023-01-15 10:30',
    '2023-01-15',
    '15 janvier 2023',
    '13/05/2023',
    '05/13/2023',
    '05/06/2023',
    '25-12-2024',
    // time
    '10:30',
    '10:30:45',
    // currency
    '1 234,56 €',
    '€ 1234',
    '$1,234.56',
    '£1234',
    '100 EUR',
    'USD 50',
    // percentage
    '50%',
    '12.5 %',
    // numeric
    '1234',
    '1234.56',
    '1 234,56',
    '1.234,56',
    '1,234.56',
    '-42',
    '1.5e10',
    '0',
    '3.14',
    // alphanumeric id
    'ABC123',
    'X1Y2Z3',
    // plain strings / edge
    'hello world',
    '',
    '   ',
    'café',
    '!!!',
  ];

  it('produces a stable type result for each representative string (golden master)', () => {
    const results = STRING_INPUTS.map((input) => ({
      input,
      output: detector._detectStringType(input, detector.options),
    }));
    expect(results).toMatchSnapshot();
  });

  it('produces a stable numeric-string parse for each numeric candidate (golden master)', () => {
    const NUMERIC_INPUTS = [
      '1234',
      '1234.56',
      '1 234,56',
      '1.234,56',
      '1,234.56',
      '-42',
      '1.5e10',
      '-3.2E-5',
      '1.00',
      '0',
      'not-a-number',
      '12.34.56',
    ];
    const results = NUMERIC_INPUTS.map((input) => ({
      input,
      output: detector._parseNumericString(input, detector.options),
    }));
    expect(results).toMatchSnapshot();
  });

  it('detectType end-to-end on mixed columns is stable (golden master)', () => {
    const columns = [
      ['10', '20', '30', '40'],
      ['10.5', '20.25', '30'],
      ['true', 'false', 'oui'],
      ['a@b.com', 'c@d.com'],
      ['2023-01-15', '2024-12-31'],
      ['50%', '25%', '75%'],
      ['1 234,56 €', '999,00 €'],
      ['hello', 'world', 'foo'],
      [],
      [null, undefined],
    ];
    const results = columns.map((values) => {
      const r = detector.detectType(values);
      return { values, type: r.type, confidence: r.confidence };
    });
    expect(results).toMatchSnapshot();
  });
});
