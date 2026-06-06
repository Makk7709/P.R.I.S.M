/**
 * Characterization tests for EnterpriseSanitizer (backend/services/enterpriseSanitizer.js).
 *
 * This is a security-sensitive content sanitizer that was NOT covered by any
 * test. These golden-master (snapshot) tests capture its ACTUAL current
 * behavior across nominal, edge and MALICIOUS inputs so that any later
 * refactor (e.g. S7781 replaceAll) can be proven iso-behavior. They are wired
 * into the npm test gate via vitest.config.core-only.js.
 *
 * IMPORTANT: these tests assert the CURRENT behavior, not an ideal one. The
 * module is a professional-tone normalizer, NOT an HTML/XSS sanitizer; the
 * malicious-input cases document exactly what it does today (mostly pass-through
 * of HTML), which is precisely the contract a refactor must preserve.
 *
 * Non-deterministic fields (timing `duration`) are stripped before snapshotting.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EnterpriseSanitizer } from '../../backend/services/enterpriseSanitizer.js';

function stripVolatile<T>(obj: T): T {
  const o = obj as any;
  if (o && typeof o === 'object') {
    if (o.stats && typeof o.stats === 'object') {
      delete o.stats.duration;
    }
    if ('duration' in o) {
      delete o.duration;
    }
  }
  return obj;
}

// Captures the ACTUAL outcome of a call: either its return value or the message
// of the error it throws. Used because sanitizeContent() currently throws a
// TypeError for any non-empty string (latent bug: the constructor redefines
// `casualExpressions` from a string[] to an object[], but sanitizeContent still
// treats entries as strings). This is dead code in production (the route calls
// removeEmojisAndCasualContent), so the characterization simply locks in reality.
function callOrThrow(fn: () => unknown): { ok: unknown } | { threw: string } {
  try {
    return { ok: fn() };
  } catch (e) {
    return { threw: (e as Error).message };
  }
}

// Representative inputs: nominal business text, casual/emoji, financial formats,
// edge (empty/whitespace/non-string), and malicious (XSS/HTML/control/long).
const NOMINAL =
  'Salut ! Super boulot sur le CA de 12M euros 🚀. Conformité RGPD OK, ' +
  "audit ISO passé avec succès, certification obtenue! j'ai vu que les KPIs sont bons.";
const FINANCIAL = 'Budget: 2 500 000 euros, coût 1,2M EUR, revenus 15.300.000€, EBITDA12';
const STRUCTURE =
  'Les ventes. Elles sont performants. Très performants même. 15% de croissance. Stables.';
const MALICIOUS_XSS = '<script>alert(1)</script> super cool <img src=x onerror=alert(2)>';
const MALICIOUS_CTRL = 'cool\x00\x07 text\u202egnirts du coup';
const MALICIOUS_LONG = `${'super '.repeat(50)}génial`;

describe('EnterpriseSanitizer — characterization', () => {
  let s: any;

  beforeEach(() => {
    s = new EnterpriseSanitizer();
  });

  it('sanitizeContent — nominal / financial / structure (golden master, throws today)', () => {
    const inputs = [NOMINAL, FINANCIAL, STRUCTURE];
    expect(inputs.map((i) => ({ input: i, result: callOrThrow(() => s.sanitizeContent(i)) }))).toMatchSnapshot();
  });

  it('sanitizeContent — edge cases (empty/whitespace/non-string) (golden master)', () => {
    const inputs = ['', '   ', '\n\t', null, undefined, 42, {}, []];
    expect(
      inputs.map((i) => ({ input: i, result: callOrThrow(() => s.sanitizeContent(i as any)) }))
    ).toMatchSnapshot();
  });

  it('sanitizeContent — malicious inputs (XSS/HTML/control/long) (golden master)', () => {
    const inputs = [MALICIOUS_XSS, MALICIOUS_CTRL, MALICIOUS_LONG];
    expect(inputs.map((i) => ({ input: i, result: callOrThrow(() => s.sanitizeContent(i)) }))).toMatchSnapshot();
  });

  it('normalizeFinancialFormats (golden master)', () => {
    const inputs = [FINANCIAL, '2 500 000 euros', '1,2M EUR', '12M euros', 'no numbers here'];
    expect(inputs.map((i) => ({ input: i, output: s.normalizeFinancialFormats(i) }))).toMatchSnapshot();
  });

  it('normalizeFormatting (golden master)', () => {
    const inputs = [
      'a   b    c',
      'Wow!!! Really??',
      'Croissance15% EBITDA200 50%word 100€word',
      'key : value , next',
    ];
    expect(inputs.map((i) => ({ input: i, output: s.normalizeFormatting(i) }))).toMatchSnapshot();
  });

  it('improveContentStructure (golden master)', () => {
    const inputs = [
      STRUCTURE,
      "résultats sont performants, vraiment performants, on peut dire que c'est des résultats performants",
      'no special pattern',
    ];
    expect(inputs.map((i) => ({ input: i, output: s.improveContentStructure(i) }))).toMatchSnapshot();
  });

  it('formatForPDF (golden master)', () => {
    const inputs = [
      'Résultats Q4: 12.5% de croissance +30% et 2,5M€ de revenus. Suivant phase.',
      '1. Premier point 2. Deuxième point',
      '',
      null,
    ];
    expect(inputs.map((i) => ({ input: i, output: s.formatForPDF(i as any) }))).toMatchSnapshot();
  });

  it('validateSanitizedContent (golden master)', () => {
    const inputs = [
      'Analyse de performance stratégique avec recommandations EBITDA et croissance détaillée ici.',
      'super cool ok',
      'short',
      '',
      null,
      'texte avec    espaces et !!! problèmes',
    ];
    expect(inputs.map((i) => ({ input: i, output: s.validateSanitizedContent(i as any) }))).toMatchSnapshot();
  });

  it('finalCleanup (golden master)', () => {
    const inputs = [
      "chiffre d'affairess de 2, 5M€ et 1, 2M€ .Voici",
      "L'équipe a réalisé un boulot! et les résultats!",
      'mot  €  10  %',
    ];
    expect(inputs.map((i) => ({ input: i, output: s.finalCleanup(i) }))).toMatchSnapshot();
  });

  it('improveFormatting (golden master)', () => {
    const inputs = ['Titre:\n- item un\n* item deux\nSECTION MAJUSCULE', 'plain text'];
    expect(inputs.map((i) => ({ input: i, output: s.improveFormatting(i) }))).toMatchSnapshot();
  });

  it('calculateQualityScores (golden master)', () => {
    const cases = [
      { content: '## Titre\n• point analyse stratégie 15% 2,5M€', changes: ['emoji_removal', 'casual_expression_replaced', 'contraction_expanded', 'header_formatting'] },
      { content: 'plain', changes: [] },
    ];
    expect(
      cases.map((c) => ({ ...c, output: s.calculateQualityScores(c.content, c.content, c.changes) }))
    ).toMatchSnapshot();
  });

  it('removeEmojisAndCasualContent — test mode and production mode (golden master)', () => {
    const input = 'Salut ! 🚀 super cool du coup, voici les résultats.';

    s.isTestMode = true;
    const testMode = stripVolatile(s.removeEmojisAndCasualContent(input));

    s.isTestMode = false;
    const prodMode = stripVolatile(s.removeEmojisAndCasualContent(input));

    expect({ testMode, prodMode }).toMatchSnapshot();
  });

  it('fastSanitization / fullSanitization direct (golden master)', () => {
    const input = "Salut ! 🚀 j'ai du coup fait un super boulot. Titre:\n- a\n- b";
    const fast = stripVolatile(s.fastSanitization(input, {}));
    const full = stripVolatile(s.fullSanitization(input, {}));
    const invalidFast = stripVolatile(s.fastSanitization(null, {}));
    const invalidFull = stripVolatile(s.fullSanitization(123, {}));
    expect({ fast, full, invalidFast, invalidFull }).toMatchSnapshot();
  });

  it('standardizeFormatting — test mode and production mode (golden master)', () => {
    const input = 'Titre:\n- item un\n* item deux\n**gras** ici';
    s.isTestMode = true;
    const testMode = stripVolatile(s.standardizeFormatting(input));
    s.isTestMode = false;
    const prodMode = stripVolatile(s.standardizeFormatting(input));
    expect({ testMode, prodMode }).toMatchSnapshot();
  });

  it('validateBusinessContent — test mode and production mode (golden master)', () => {
    const withBiz = 'Analyse de performance et stratégie détaillée sur la croissance du marché européen ici.';
    const withoutBiz = 'juste du texte sans rien de pertinent qui dépasse cent caractères pour le test de longueur minimale ok voila.';
    s.isTestMode = true;
    const testWith = s.validateBusinessContent(withBiz);
    const testWithout = s.validateBusinessContent(withoutBiz);
    s.isTestMode = false;
    const prodWith = s.validateBusinessContent(withBiz);
    const prodWithout = s.validateBusinessContent(withoutBiz);
    expect({ testWith, testWithout, prodWith, prodWithout }).toMatchSnapshot();
  });
});
