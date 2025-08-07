import { ProviderAdapter } from './ProviderAdapter.js';
import OpenAI from 'openai';

export default class OpenAIAdapter extends ProviderAdapter {
  constructor(opts = {}) {
    super(opts);
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async _evaluate({ type, payload }) {
    const content = this.#buildPrompt(type, payload);
    const resp = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
    return `You are voting on a decision. Context: ${JSON.stringify({ type, payload })}. ` +
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

