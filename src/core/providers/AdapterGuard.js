/**
 * AdapterGuard - Normalisation centralisée des réponses providers
 * Garantit fail-closed et déterminisme sur toutes les frontières externes
 */

import {
  createProviderResultOK,
  createProviderResultError,
} from '../../security/contracts/providerResult.js';

const CORRELATION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Renvoie le correlationId s'il est un UUID valide, sinon undefined (fonction pure).
 * @param {string} [correlationId]
 * @returns {string|undefined}
 */
function sanitizeCorrelationId(correlationId) {
  return correlationId && CORRELATION_ID_RE.test(correlationId) ? correlationId : undefined;
}

/** @returns {boolean} true si objet non nul */
function isNonNullObject(value) {
  return typeof value === 'object' && value !== null;
}

/** @returns {boolean} true si wrapper d'erreur (objet avec .error sans .text) */
function isErrorWrapperResponse(value) {
  return isNonNullObject(value) && Boolean(value.error) && !value.text;
}

/** @returns {boolean} true si objet d'erreur (status/retryable/TimeoutError sans .text) */
function isErrorLikeResponse(value) {
  return (
    isNonNullObject(value) &&
    !value.text &&
    (value.status !== undefined || value.retryable !== undefined || value.name === 'TimeoutError')
  );
}

/** @returns {boolean} true si wrapper texte (objet avec .text) */
function isTextWrapperResponse(value) {
  return isNonNullObject(value) && Boolean(value.text);
}

/**
 * Normalise une réponse brute de provider en ProviderResult strict
 * @param {Object} params
 * @param {string} params.provider - Nom du provider
 * @param {*} params.rawResponse - Réponse brute du provider (peut être JSON, string, Error, etc.)
 * @param {number} params.latencyMs - Latence mesurée
 * @param {string} [params.correlationId] - ID de corrélation
 * @param {string} [params.requestId] - ID de requête provider
 * @param {Object} [params.meta] - Métadonnées additionnelles (tokens, etc.)
 * @returns {Object} ProviderResult validé strict
 */
export function normalizeProviderResponse({
  provider,
  rawResponse,
  latencyMs,
  correlationId,
  requestId,
  meta = {},
}) {
  const startTime = Date.now();

  // Cas 1: Réponse est déjà une Error
  if (rawResponse instanceof Error) {
    return normalizeError({
      provider,
      error: rawResponse,
      latencyMs,
      correlationId,
      requestId,
    });
  }

  // Cas 1b: Réponse est un objet avec propriété error (wrapper d'erreur)
  if (isErrorWrapperResponse(rawResponse)) {
    return normalizeError({
      provider,
      error: rawResponse.error instanceof Error ? rawResponse.error : rawResponse,
      latencyMs,
      correlationId,
      requestId: rawResponse.requestId || requestId,
    });
  }

  // Cas 1c: Réponse est un objet d'erreur (avec status/retryable/etc, mais pas text)
  if (isErrorLikeResponse(rawResponse)) {
    return normalizeError({
      provider,
      error: rawResponse,
      latencyMs,
      correlationId,
      requestId,
    });
  }

  // Cas 2: Réponse est un objet avec propriété text (wrapper avec métadonnées)
  if (isTextWrapperResponse(rawResponse)) {
    return normalizeStringResponse({
      provider,
      rawText: rawResponse.text,
      latencyMs,
      correlationId,
      requestId: rawResponse.requestId || requestId,
      meta: {
        ...meta,
        tokensIn: rawResponse.usage?.prompt_tokens || rawResponse.usage?.input_tokens,
        tokensOut: rawResponse.usage?.completion_tokens || rawResponse.usage?.output_tokens,
      },
    });
  }

  // Cas 3: Réponse est une string (JSON attendu)
  if (typeof rawResponse === 'string') {
    return normalizeStringResponse({
      provider,
      rawText: rawResponse,
      latencyMs,
      correlationId,
      requestId,
      meta,
    });
  }

  // Cas 4: Réponse est un objet (déjà parsé)
  if (isNonNullObject(rawResponse)) {
    return normalizeObjectResponse({
      provider,
      rawObject: rawResponse,
      latencyMs,
      correlationId,
      requestId,
      meta,
    });
  }

  // Cas 5: Réponse inconnue => SCHEMA_INVALID
  const validCorrelationId = sanitizeCorrelationId(correlationId);

  return createProviderResultError({
    provider,
    status: 'SCHEMA_INVALID',
    latencyMs: Date.now() - startTime,
    correlationId: validCorrelationId,
    requestId,
    error: {
      message: `FAIL-CLOSED: Unknown response type: ${typeof rawResponse}`,
      rawSnippet: String(rawResponse).slice(0, 200),
    },
  });
}

/**
 * Normalise une réponse string (JSON attendu)
 */
function normalizeStringResponse({ provider, rawText, latencyMs, correlationId, requestId, meta }) {
  // Tentative de parse JSON
  let parsed;
  try {
    // Extraction JSON depuis texte (peut contenir markdown, etc.)
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error('No JSON object found in response');
    }

    const jsonStr = rawText.slice(jsonStart, jsonEnd + 1);
    parsed = JSON.parse(jsonStr);
  } catch (parseError) {
    // Ne pas passer correlationId s'il n'est pas un UUID valide
    const validCorrelationId = sanitizeCorrelationId(correlationId);

    return createProviderResultError({
      provider,
      status: 'PARSE_ERROR',
      latencyMs,
      correlationId: validCorrelationId,
      requestId,
      error: {
        message: `JSON parse failed: ${parseError.message}`,
        rawSnippet: rawText.slice(0, 200),
      },
    });
  }

  // Maintenant normaliser l'objet parsé
  return normalizeObjectResponse({
    provider,
    rawObject: parsed,
    latencyMs,
    correlationId,
    requestId,
    meta,
  });
}

/**
 * Normalise une réponse objet (déjà parsé)
 */
function normalizeObjectResponse({
  provider,
  rawObject,
  latencyMs,
  correlationId,
  requestId,
  meta,
}) {
  // Extraire les champs attendus (decision, reasoning, confidence, etc.)
  const decision = rawObject.decision;
  const reasoning = rawObject.reasoning || rawObject.rationale || '';
  const confidence = rawObject.confidence;

  // Validation: decision doit être boolean
  if (typeof decision !== 'boolean') {
    // Ne pas passer correlationId s'il n'est pas un UUID valide
    const validCorrelationId = sanitizeCorrelationId(correlationId);

    return createProviderResultError({
      provider,
      status: 'SCHEMA_INVALID',
      latencyMs,
      correlationId: validCorrelationId,
      requestId,
      error: {
        message: `FAIL-CLOSED: decision must be boolean, got ${typeof decision}`,
        rawSnippet: JSON.stringify(rawObject).slice(0, 200),
      },
    });
  }

  // Mapper decision (boolean) vers verdict (approve/reject)
  const verdict = decision ? 'approve' : 'reject';

  // Valider confidence si présente
  if (confidence !== undefined) {
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      const validCorrelationId = sanitizeCorrelationId(correlationId);

      return createProviderResultError({
        provider,
        status: 'SCHEMA_INVALID',
        latencyMs,
        correlationId: validCorrelationId,
        requestId,
        error: {
          message: `FAIL-CLOSED: confidence must be [0..1], got ${confidence}`,
          rawSnippet: JSON.stringify(rawObject).slice(0, 200),
        },
      });
    }
  }

  // Construire ProviderResult OK
  try {
    return createProviderResultOK({
      provider,
      verdict,
      confidence: confidence !== undefined ? confidence : undefined,
      rationale: String(reasoning).slice(0, 5000), // Limite
      latencyMs,
      tokensIn: meta.tokensIn,
      tokensOut: meta.tokensOut,
      requestId,
      correlationId,
    });
  } catch (validationError) {
    // Si la validation échoue, retourner SCHEMA_INVALID
    const validCorrelationId = sanitizeCorrelationId(correlationId);

    return createProviderResultError({
      provider,
      status: 'SCHEMA_INVALID',
      latencyMs,
      correlationId: validCorrelationId,
      requestId,
      error: {
        message: `FAIL-CLOSED: ProviderResult validation failed: ${validationError.message}`,
        rawSnippet: JSON.stringify(rawObject).slice(0, 200),
      },
    });
  }
}

/**
 * Normalise une erreur en ProviderResult ERROR
 */
function normalizeError({ provider, error, latencyMs, correlationId, requestId }) {
  let status = 'PROVIDER_ERROR';
  let errorMessage = 'Unknown error';
  let errorCode = undefined;

  // Gérer Error instances
  if (error instanceof Error) {
    errorMessage = error.message || 'Unknown error';
    errorCode = error.code;

    // Mapper types d'erreur connus vers statuts canoniques
    if (errorMessage.toLowerCase().includes('timeout') || error.name === 'TimeoutError') {
      status = 'TIMEOUT';
    } else if (errorMessage.toLowerCase().includes('rate limit')) {
      status = 'RATE_LIMIT';
    } else if (errorMessage.toLowerCase().includes('abort') || error.name === 'AbortError') {
      status = 'ABORTED';
    }
  }
  // Gérer objets d'erreur (pas Error instance)
  else if (typeof error === 'object' && error !== null) {
    errorMessage = error.message || error.error?.message || 'Unknown error';
    errorCode = error.code || error.status?.toString();

    // Détecter name pour TimeoutError
    if (error.name === 'TimeoutError' || errorMessage.toLowerCase().includes('timeout')) {
      status = 'TIMEOUT';
    } else if (error.status === 429 || errorMessage.toLowerCase().includes('rate limit')) {
      status = 'RATE_LIMIT';
    } else if (error.status >= 500 || error.retryable) {
      status = 'PROVIDER_ERROR'; // Fusionné avec TRANSIENT_ERROR
    }
  } else {
    errorMessage = String(error);
  }

  // Ne pas passer correlationId s'il n'est pas un UUID valide
  const validCorrelationId = sanitizeCorrelationId(correlationId);

  return createProviderResultError({
    provider,
    status,
    latencyMs,
    correlationId: validCorrelationId,
    requestId,
    error: {
      code: errorCode,
      message: errorMessage.slice(0, 1000),
      rawSnippet: (error instanceof Error ? error.stack : JSON.stringify(error))?.slice(0, 200),
    },
  });
}

/**
 * Wrapper avec timeout pour appels provider
 * @param {Promise} promise - Promesse à wraper
 * @param {number} timeoutMs - Timeout en ms
 * @param {string} provider - Nom du provider (pour erreur)
 * @returns {Promise} Promise qui rejette avec TimeoutError si timeout
 */
export async function withProviderTimeout(promise, timeoutMs, provider) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      promise,
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Provider ${provider} timeout after ${timeoutMs}ms`));
        });
      }),
    ]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      error.name = 'TimeoutError';
    }
    throw error;
  }
}

export { createProviderResultOK, createProviderResultError };
