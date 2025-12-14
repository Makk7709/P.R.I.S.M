import { ProviderAdapter } from './ProviderAdapter.js';
import OpenAI from 'openai';

// Perplexity has an OpenAI-compatible API in many setups
export default class PerplexityAdapter extends ProviderAdapter {
  constructor(opts = {}) {
    super({ ...opts, providerName: 'perplexity' });
    this.client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: process.env.PERPLEXITY_BASE_URL });
    this.model = process.env.PERPLEXITY_MODEL || 'pplx-7b-online';
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
    return `Vote on decision based on evidence. Context: ${JSON.stringify({ type, payload })}. ` +
      `Return strict JSON {"decision": true|false, "reasoning": "short"}.`;
  }
}

