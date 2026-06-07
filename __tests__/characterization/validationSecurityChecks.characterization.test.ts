/**
 * Characterization tests for enterprise export security checks (performSecurityChecks
 * behaviour via validateEnterpriseExportRequest). Written against the pre-refactor
 * detection semantics; must stay green after the ReDoS-safe script-tag scanner.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateEnterpriseExportRequest } from '../../backend/middleware/validation.js';

const VALID_BASE = {
  content:
    '## Analyse Stratégique Q4\n\nPerformance exceptionnelle avec croissance 15% CA, EBITDA 2.8M€.',
  metadata: {
    reportType: 'executive_summary' as const,
    title: 'Analyse Stratégique Q4',
    date: '2024-01-15',
    confidentiality: 'Internal' as const,
  },
  format: 'pdf' as const,
  requestId: 'testrequest123456',
};

function makeReqRes(body: Record<string, unknown>) {
  const req = {
    body,
    ip: '127.0.0.1',
    get: (header: string) => (header === 'User-Agent' ? 'Test' : undefined),
  };
  const res = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    jsonBody: null as unknown,
    json(payload: unknown) {
      this.jsonBody = payload;
      return this;
    },
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('validateEnterpriseExportRequest — security check characterization', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('accepte un payload nominale sans motif malveillant', () => {
    const { req, res, next } = makeReqRes(VALID_BASE);
    validateEnterpriseExportRequest(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejette une balise script embarquée (cas legacy test)', () => {
    const { req, res, next } = makeReqRes({
      ...VALID_BASE,
      content: "## Report <script>alert('xss')</script>\n\nContent with malicious script.",
    });
    validateEnterpriseExportRequest(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toMatchObject({
      error: 'Security validation failed',
      details: { reason: 'Potentially malicious content detected' },
    });
  });

  it('rejette img onerror (pattern linéaire conservé)', () => {
    const { req, res, next } = makeReqRes({
      ...VALID_BASE,
      content: "## Report\n\nContent with <img src=x onerror=alert('xss')> malicious HTML.",
    });
    validateEnterpriseExportRequest(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it('accepte <script> sans fermeture </script> (iso ancienne regex)', () => {
    const { req, res, next } = makeReqRes({
      ...VALID_BASE,
      content: `${VALID_BASE.content}\n\n<script>no close tag here`,
    });
    validateEnterpriseExportRequest(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejette scriptFOO>…</script> (variante tolérée par l\'ancienne regex)', () => {
    const { req, res, next } = makeReqRes({
      ...VALID_BASE,
      content: `${VALID_BASE.content}\n\n<scriptFOO>z</script>`,
    });
    validateEnterpriseExportRequest(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it('scanner ReDoS-safe : payload evil (<script>x repeat) termine en <500 ms', () => {
    const evil = `${VALID_BASE.content}\n${'<script>x'.repeat(5000)}`;
    const { req, res, next } = makeReqRes({ ...VALID_BASE, content: evil });
    const start = Date.now();
    validateEnterpriseExportRequest(req, res, next);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
    expect(next).toHaveBeenCalled();
  });
});
