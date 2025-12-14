import { ProviderAdapter } from './ProviderAdapter.js';
import OpenAI from 'openai';

export default class OpenAIAdapter extends ProviderAdapter {
  constructor(opts = {}) {
    super({ ...opts, providerName: 'openai' });
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Évalue une décision - retourne la réponse brute du provider
   * La normalisation sera faite par AdapterGuard dans evaluate()
   */
  async _evaluate({ type, payload }) {
    const content = this.#buildPrompt(type, payload);
    const resp = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'Answer with a JSON: {"decision": true|false, "reasoning": "..."}' },
        { role: 'user', content }
      ],
      temperature: 0
    });
    
    // Retourner la réponse brute - AdapterGuard va normaliser
    const text = resp.choices?.[0]?.message?.content || '';
    
    // Retourner un objet avec texte et métadonnées
    return {
      text,
      usage: resp.usage,
      requestId: resp.id
    };
  }

  #buildPrompt(type, payload) {
    return `You are voting on a decision. Context: ${JSON.stringify({ type, payload })}. ` +
      `Return strict JSON {"decision": true|false, "reasoning": "short"}.`;
  }
}

