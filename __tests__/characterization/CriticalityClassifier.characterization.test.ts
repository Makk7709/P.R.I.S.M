/**
 * Characterization tests for CriticalityClassifier.classify (S3776).
 *
 * Pure function (string + optional context → classification object). Captures
 * the ACTUAL pre-refactor classification for a battery of representative
 * prompts, with and without conversational context, as golden-master
 * snapshots. Run by the npm test gate (vitest.config.core-only.js).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CriticalityClassifier } from '../../src/orchestrator/CriticalityClassifier.js';

describe('CriticalityClassifier — characterization', () => {
  let classifier: any;

  beforeEach(() => {
    classifier = new CriticalityClassifier();
  });

  const PROMPTS: string[] = [
    'what is the weather today',
    'hello how are you',
    'supprime tous les fichiers de la base de données',
    'delete all production data now',
    'modifier les paramètres système et la sécurité admin',
    'peux-tu juste me donner un exemple simple',
    'urgent: efface la configuration root immédiatement',
    'explique-moi la photosynthèse',
    'DROP TABLE users; -- security critical',
    'merci beaucoup pour ton aide',
    '',
    '   ',
  ];

  it('classify (no context) is stable for representative prompts (golden master)', () => {
    const results = PROMPTS.map((input) => ({ input, output: classifier.classify(input) }));
    expect(results).toMatchSnapshot();
  });

  it('classify with conversational context is stable (golden master)', () => {
    const context = {
      previousMessages: [
        { content: 'I want to delete the database' },
        { content: 'and change the system settings' },
        { content: 'with admin root access' },
      ],
    };
    const inputs = ['continue', 'fais-le maintenant', 'what about the weather'];
    const results = inputs.map((input) => ({
      input,
      output: classifier.classify(input, context),
    }));
    expect(results).toMatchSnapshot();
  });

  it('classify respects custom thresholds (golden master)', () => {
    const strict = new CriticalityClassifier({ criticalThreshold: 0.3, highThreshold: 0.1 });
    const results = PROMPTS.slice(0, 6).map((input) => ({
      input,
      output: strict.classify(input),
    }));
    expect(results).toMatchSnapshot();
  });
});
