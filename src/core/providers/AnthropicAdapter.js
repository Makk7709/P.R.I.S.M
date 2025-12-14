import { ProviderAdapter } from './ProviderAdapter.js';
import Anthropic from '@anthropic-ai/sdk';

export default class AnthropicAdapter extends ProviderAdapter {
  constructor(opts = {}) {
    super({ ...opts, providerName: 'anthropic' });
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
  }

  /**
   * Évalue une décision - retourne la réponse brute du provider
   * La normalisation sera faite par AdapterGuard dans evaluate()
   */
  async _evaluate({ type, payload }) {
    const prompt = this.#buildPrompt(type, payload);
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 64,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });
    
    // Retourner la réponse brute - AdapterGuard va normaliser
    const text = msg.content?.[0]?.text || '';
    
    // Retourner un objet avec texte et métadonnées
    return {
      text,
      usage: {
        prompt_tokens: msg.usage?.input_tokens,
        completion_tokens: msg.usage?.output_tokens
      },
      requestId: msg.id
    };
  }

  #buildPrompt(type, payload) {
    return `Vote on decision. Context: ${JSON.stringify({ type, payload })}. ` +
      `Return strict JSON {"decision": true|false, "reasoning": "short"}.`;
  }
}

