// Base provider adapter interface and simple circuit breaker

export class CircuitBreaker {
  constructor({ failureThreshold = 5, halfOpenAfterMs = 30000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.halfOpenAfterMs = halfOpenAfterMs;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.openedAt = 0;
  }

  canPass() {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt >= this.halfOpenAfterMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }
}

export class ProviderAdapter {
  constructor({ timeoutMs = 1500, maxRetries = 2, backoffBaseMs = 200 } = {}) {
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.backoffBaseMs = backoffBaseMs;
    this.breaker = new CircuitBreaker();
  }

  async evaluate(decision) {
    if (!this.breaker.canPass()) {
      return { decision: false, reasoning: 'circuit_open' };
    }

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const result = await this._withTimeout(this._evaluate(decision));
        this.breaker.recordSuccess();
        return result;
      } catch (err) {
        attempt += 1;
        if (attempt > this.maxRetries) {
          this.breaker.recordFailure();
          return { decision: false, reasoning: `provider_error:${err.message}` };
        }
        await new Promise(r => setTimeout(r, this.backoffBaseMs * Math.pow(2, attempt - 1)));
      }
    }
  }

  async _withTimeout(promise) {
    let to;
    const timeoutPromise = new Promise((_, reject) => {
      to = setTimeout(() => reject(new Error('timeout')), this.timeoutMs);
    });
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(to);
    return res;
  }

  // To implement in subclasses
  async _evaluate(_decision) {
    throw new Error('Not implemented');
  }
}

