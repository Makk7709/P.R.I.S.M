/**
 * Characterization tests for InfographicGenerator.extractDataFromChat (S3776).
 *
 * Pure transform (chat messages -> {title, metrics, insights, taskType}).
 * Golden-master snapshots of ACTUAL pre-refactor extraction (metrics regexes,
 * insight keyword detection, title derivation, dedup/caps). Run by npm test gate.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { InfographicGenerator } from '../../src/infographic/InfographicGenerator.js';

describe('InfographicGenerator — characterization (extractDataFromChat)', () => {
  let gen: any;

  beforeEach(() => {
    gen = new InfographicGenerator();
  });

  it('extracts metrics/insights/title from a rich conversation (golden master)', () => {
    const messages = [
      { role: 'user', content: 'Analyse les ventes du trimestre et les performances' },
      {
        role: 'assistant',
        content:
          'Le chiffre est de 1 250 000€ avec une hausse de +15%. ' +
          'La croissance est notable cette année. ' +
          'Les ventes ont atteint 250K€ et 30% de marge. ' +
          'La performance globale dépasse les objectifs fixés.',
      },
      {
        role: 'assistant',
        content: 'On note une baisse de -5% sur un segment. Le résultat reste positif à 99€.',
      },
    ];
    expect(gen.extractDataFromChat(messages, 'finance')).toMatchSnapshot();
  });

  it('handles empty / user-only / no-metric conversations (golden master)', () => {
    const cases = [
      { messages: [], taskType: 'general' },
      {
        messages: [{ role: 'user', content: 'Bonjour, peux-tu maider avec un tableau de bord' }],
        taskType: 'strategie',
      },
      {
        messages: [{ role: 'assistant', content: 'Voici une explication sans chiffres ni mots clés.' }],
        taskType: 'general',
      },
      {
        messages: [{ role: 'user', content: 'court' }],
        taskType: 'marketing',
      },
    ];
    const results = cases.map((c) => ({
      taskType: c.taskType,
      output: gen.extractDataFromChat(c.messages, c.taskType),
    }));
    expect(results).toMatchSnapshot();
  });

  it('dedupes metrics and caps at 6 metrics / 3 insights (golden master)', () => {
    const messages = [
      {
        role: 'assistant',
        content:
          '10€ 20€ 30€ 40€ 50€ 60€ 70€ 80€ 10€ 20€. ' +
          'Forte hausse ici. Belle croissance là. Bonne performance ainsi. ' +
          'Objectif atteint encore. Résultat positif aussi.',
      },
    ];
    expect(gen.extractDataFromChat(messages, 'finance')).toMatchSnapshot();
  });
});
