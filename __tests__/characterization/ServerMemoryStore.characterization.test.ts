/**
 * Characterization tests for ServerMemoryStore._extractPersonalInfo (S3776, cc75).
 *
 * The method only mutates `this.memory.userInfo` (prénom/role/stratégie/context
 * extraction) and calls `_isCommonWord`; it performs no disk I/O. To avoid the
 * constructor's filesystem access we build the instance via Object.create and a
 * clean in-memory store, then snapshot `userInfo` after each call.
 *
 * Golden-master of ACTUAL pre-refactor behavior. Run by npm test gate.
 */
import { describe, it, expect } from 'vitest';
import { ServerMemoryStore } from '../../src/core/ServerMemoryStore.js';

function freshStore(): any {
  const store: any = Object.create(ServerMemoryStore.prototype);
  store.memory = { conversations: [], userInfo: {}, interactions: [], lastUpdated: null };
  return store;
}

function extract(input: string, response: string) {
  const store = freshStore();
  store._extractPersonalInfo(input, response);
  return store.memory.userInfo;
}

describe('ServerMemoryStore — characterization (_extractPersonalInfo)', () => {
  it('prénom extraction (input, response, common-word rejection) is stable', () => {
    const cases = [
      ['Mon prénom est Amine', ''],
      ["Je m'appelle Sophie aujourd'hui", ''],
      ['', 'Votre prénom est Marc donc'],
      ['Je suis le', ''], // common word -> rejected
      ['appelle-moi X', ''], // too short -> rejected
      ['Mon nom est Jean-Pierre', ''],
    ];
    const results = cases.map(([i, r]) => ({ input: i, response: r, userInfo: extract(i, r) }));
    expect(results).toMatchSnapshot();
  });

  it('role extraction (single, multiple, substring dedup) is stable', () => {
    const cases = [
      ['Ton rôle est de manalyser les données financières', ''],
      ['Tu es un assistant intelligent et stratégique', ''],
      [
        'Ton rôle est de manalyser les données',
        'Ton rôle est de manalyser les données financières',
      ],
      ['mission: développer une stratégie de croissance', ''],
    ];
    const results = cases.map(([i, r]) => ({ input: i, response: r, userInfo: extract(i, r) }));
    expect(results).toMatchSnapshot();
  });

  it('stratégie extraction (with/without article) is stable', () => {
    const cases = [
      ['Notre stratégie est de conquérir le marché européen', ''],
      ['On veut développer une application révolutionnaire', ''],
      ['nous souhaitons créer un produit innovant et durable', ''],
      ['projet: refonte complète du système legacy', ''],
    ];
    const results = cases.map(([i, r]) => ({ input: i, response: r, userInfo: extract(i, r) }));
    expect(results).toMatchSnapshot();
  });

  it('context extraction (important/souviens/contexte) is stable', () => {
    const cases = [
      ['Important: la deadline est fixée au 30 juin', ''],
      ['souviens-toi: le client préfère le format PDF', ''],
      ['contexte: entreprise de 50 personnes en forte croissance', ''],
    ];
    const results = cases.map(([i, r]) => ({ input: i, response: r, userInfo: extract(i, r) }));
    expect(results).toMatchSnapshot();
  });

  it('combined multi-info conversation is stable', () => {
    const input =
      "Je m'appelle Amine. Ton rôle est de manalyser les ventes. " +
      'Notre stratégie est de doubler le chiffre. Important: budget limité cette année.';
    const response = 'Votre prénom est Amine. On veut développer une croissance rapide.';
    expect(extract(input, response)).toMatchSnapshot();
  });
});
