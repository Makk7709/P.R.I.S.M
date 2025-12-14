/**
 * Base provider adapter interface with fail-closed ProviderResult normalization
 */

import { 
  normalizeProviderResponse,
  withProviderTimeout,
  createProviderResultError
} from './AdapterGuard.js';
import crypto from 'crypto';

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
  constructor({ 
    timeoutMs = 1500, 
    maxRetries = 2, 
    backoffBaseMs = 200,
    providerName = 'unknown' // Doit être défini dans sous-classes
  } = {}) {
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.backoffBaseMs = backoffBaseMs;
    this.providerName = providerName;
    this.breaker = new CircuitBreaker();
  }

  /**
   * Évalue une décision et retourne un ProviderResult strict (fail-closed)
   * @param {Object} decision - Décision à évaluer
   * @param {string} [correlationId] - ID de corrélation
   * @returns {Promise<Object>} ProviderResult validé strict
   */
  async evaluate(decision, correlationId = null) {
    const requestId = crypto.randomUUID();
    const correlationIdFinal = correlationId || crypto.randomUUID();
    const startTime = Date.now();

    // Circuit breaker: si ouvert, retourner CIRCUIT_OPEN immédiatement
    if (!this.breaker.canPass()) {
      return createProviderResultError({
        provider: this.providerName,
        status: 'CIRCUIT_OPEN',
        latencyMs: Date.now() - startTime,
        correlationId: correlationIdFinal,
        requestId,
        error: {
          message: 'Circuit breaker is OPEN - too many failures'
        }
      });
    }

    // Tentatives avec retry
    let attempt = 0;
    let lastError = null;

    while (attempt <= this.maxRetries) {
      try {
        // Wrapper avec timeout
        const rawResponse = await withProviderTimeout(
          this._evaluate(decision),
          this.timeoutMs,
          this.providerName
        );

        // Mesurer latence réelle
        const latencyMs = Date.now() - startTime;

        // Normaliser la réponse en ProviderResult strict
        const result = normalizeProviderResponse({
          provider: this.providerName,
          rawResponse,
          latencyMs,
          correlationId: correlationIdFinal,
          requestId
        });

        // Si succès, enregistrer et retourner
        if (result.status === 'OK') {
          this.breaker.recordSuccess();
        } else {
          // Si erreur non-transient, enregistrer échec
          if (result.status !== 'TRANSIENT_ERROR' && result.status !== 'RATE_LIMIT') {
            this.breaker.recordFailure();
          }
        }

        return result;

      } catch (err) {
        lastError = err;
        attempt += 1;

        // Si dernière tentative, retourner erreur normalisée
        if (attempt > this.maxRetries) {
          this.breaker.recordFailure();
          const latencyMs = Date.now() - startTime;
          
          return normalizeProviderResponse({
            provider: this.providerName,
            rawResponse: err,
            latencyMs,
            correlationId: correlationIdFinal,
            requestId
          });
        }

        // Attendre avant retry (exponential backoff)
        await new Promise(r => setTimeout(r, this.backoffBaseMs * Math.pow(2, attempt - 1)));
      }
    }

    // Fallback (ne devrait jamais arriver)
    return createProviderResultError({
      provider: this.providerName,
      status: 'PROVIDER_ERROR',
      latencyMs: Date.now() - startTime,
      correlationId: correlationIdFinal,
      requestId,
      error: {
        message: lastError?.message || 'Unknown error after retries'
      }
    });
  }

  // To implement in subclasses - doit retourner la réponse brute du provider
  async _evaluate(_decision) {
    throw new Error('_evaluate must be implemented in subclass');
  }
}

