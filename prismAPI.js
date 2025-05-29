// PRISM API Abstraction Layer
const PRISM_API = {
  config: {
    baseUrl: process.env.PRISM_API_URL || null,
    authToken: null,
    timeout: 10000,
    retryAttempts: 3
  },

  async sendRequest(endpoint, payload) {
    if (!this.config.baseUrl) {
      return this.fallbackToGhost(endpoint, payload);
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
    };

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('API request failed:', error);
      return this.fallbackToGhost(endpoint, payload);
    }
  },

  async fallbackToGhost(endpoint, payload) {
    if (typeof prismGhost?.generateGhostReply === 'function') {
      const state = {
        endpoint,
        payload,
        timestamp: Date.now()
      };
      const context = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      };
      return prismGhost.generateGhostReply(state, context);
    }
    throw new Error('No backend available and ghost fallback not implemented');
  },

  setAuthToken(token) {
    this.config.authToken = token;
  },

  setBaseUrl(url) {
    this.config.baseUrl = url;
  }
};

export default PRISM_API; 