import { ProviderAdapter } from './ProviderAdapter.js';
import OpenAI from 'openai';

// Perplexity has an OpenAI-compatible API in many setups
export default class PerplexityAdapter extends ProviderAdapter {
  constructor(opts = {}) {
    super(opts);
    this.client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: process.env.PERPLEXITY_BASE_URL });
    this.model = process.env.PERPLEXITY_MODEL || 'pplx-7b-online';
  }

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
    const text = resp.choices?.[0]?.message?.content || '';
    return this.#parseDecision(text);
  }

  #buildPrompt(type, payload) {
    return `Vote on decision based on evidence. Context: ${JSON.stringify({ type, payload })}. ` +
      `Return strict JSON {"decision": true|false, "reasoning": "short"}.`;
  }

  #parseDecision(text) {
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      const json = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      return { decision: !!json.decision, reasoning: String(json.reasoning || '') };
    } catch {
      return { decision: false, reasoning: 'parse_error' };
    }
  }
}

