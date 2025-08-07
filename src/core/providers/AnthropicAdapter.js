import { ProviderAdapter } from './ProviderAdapter.js';
import Anthropic from '@anthropic-ai/sdk';

export default class AnthropicAdapter extends ProviderAdapter {
  constructor(opts = {}) {
    super(opts);
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
  }

  async _evaluate({ type, payload }) {
    const prompt = this.#buildPrompt(type, payload);
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 64,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = msg.content?.[0]?.text || '';
    return this.#parseDecision(text);
  }

  #buildPrompt(type, payload) {
    return `Vote on decision. Context: ${JSON.stringify({ type, payload })}. ` +
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

