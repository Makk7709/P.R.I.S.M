/**
 * Characterization tests for EnterprisePDFService._addParagraphWithFormatting
 * (backend/services/enterprisePDFService.js, S3776).
 *
 * The method draws inline text (with **bold** support) onto a PDFKit document.
 * We pass a recording fake `doc` that captures the exact sequence of chained
 * drawing calls and returns a deterministic widthOfString, so the snapshot
 * locks in the precise rendering behavior before the S3776 refactor.
 */
import { describe, it, expect } from 'vitest';
import { EnterprisePDFService } from '../../backend/services/enterprisePDFService.js';

function makeFakeDoc() {
  const calls: any[] = [];
  const doc: any = {
    x: 100,
    y: 200,
    font(f: string) { calls.push(['font', f]); return this; },
    fontSize(s: number) { calls.push(['fontSize', s]); return this; },
    fillColor(c: string) { calls.push(['fillColor', c]); return this; },
    text(t: string, ...args: any[]) { calls.push(['text', t, ...args]); return this; },
    widthOfString(str: string) { calls.push(['widthOfString', str]); return str ? str.length : 0; },
    moveDown(n: number) { calls.push(['moveDown', n]); return this; },
    calls,
  };
  return doc;
}

function run(svc: any, text: string) {
  const doc = makeFakeDoc();
  const structure: any = {};
  svc._addParagraphWithFormatting(doc, text, structure);
  return { calls: doc.calls, structure };
}

describe('EnterprisePDFService._addParagraphWithFormatting — characterization', () => {
  const svc: any = new EnterprisePDFService();

  it('mixed bold and normal text', () => {
    expect(run(svc, 'Hello **world** foo')).toMatchSnapshot();
  });

  it('no bold markers', () => {
    expect(run(svc, 'no bold here')).toMatchSnapshot();
  });

  it('entirely bold', () => {
    expect(run(svc, '**all bold**')).toMatchSnapshot();
  });

  it('multiple bold segments', () => {
    expect(run(svc, 'a **b** c **d** e')).toMatchSnapshot();
  });

  it('empty string', () => {
    expect(run(svc, '')).toMatchSnapshot();
  });

  it('leading bold with empty leading segment', () => {
    expect(run(svc, '**start** then normal')).toMatchSnapshot();
  });
});
