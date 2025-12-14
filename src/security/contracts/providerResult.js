/**
 * Contrats stricts pour ProviderResult (réponses normalisées des providers)
 * Fail-closed: rejette toute réponse non conforme au schéma canonique
 */

import { z } from 'zod';

/**
 * Enum des providers supportés
 */
export const ProviderNameSchema = z.enum([
  'openai',
  'anthropic',
  'perplexity',
  'gpt-4.1', // Alias legacy
  'claude-3', // Alias legacy
  'pplx' // Alias legacy
], {
  errorMap: () => ({ message: 'Provider name must be a valid provider identifier' })
});

/**
 * Statuts canoniques des réponses provider
 */
export const ProviderStatusSchema = z.enum([
  'OK',
  'TIMEOUT',
  'RATE_LIMIT',
  'PROVIDER_ERROR', // Fusionné avec TRANSIENT_ERROR pour réduire variance
  'SCHEMA_INVALID',
  'PARSE_ERROR',
  'ABORTED',
  'CIRCUIT_OPEN'
], {
  errorMap: () => ({ message: 'Provider status must be a valid status code' })
});

/**
 * Verdict enum (aligné avec VoteType)
 */
export const ProviderVerdictSchema = z.enum(['approve', 'reject', 'abstain'], {
  errorMap: () => ({ message: 'Provider verdict must be one of: approve, reject, abstain' })
});

/**
 * Schéma pour erreur provider (structure canonique)
 */
export const ProviderErrorSchema = z.object({
  code: z.string().max(100).optional(),
  message: z.string().max(1000),
  rawSnippet: z.string().max(500).optional() // Tronqué, jamais PII
}).strict();

/**
 * Schéma pour ProviderResult (réponse canonique normalisée)
 * Fail-closed: structure stricte, aucune tolérance
 */
export const ProviderResultSchema = z.object({
  provider: ProviderNameSchema,
  status: ProviderStatusSchema,
  // verdict/confidence présents uniquement si status === OK
  verdict: ProviderVerdictSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  rationale: z.string().max(5000).optional(),
  latencyMs: z.number().min(0),
  tokensIn: z.number().int().nonnegative().optional(),
  tokensOut: z.number().int().nonnegative().optional(),
  requestId: z.string().max(200).optional(),
  correlationId: z.string().uuid().optional(),
  error: ProviderErrorSchema.optional()
}).strict()
.refine(
  (data) => {
    // Si status === OK, verdict doit être présent
    if (data.status === 'OK') {
      return data.verdict !== undefined;
    }
    // Si status !== OK, verdict ne doit pas être présent (fail-closed)
    return data.verdict === undefined;
  },
  {
    message: 'verdict must be present if status=OK, absent otherwise (fail-closed)'
  }
)
.refine(
  (data) => {
    // Si verdict présent, confidence optionnelle mais si présente, doit être [0..1]
    if (data.verdict && data.confidence !== undefined) {
      return data.confidence >= 0 && data.confidence <= 1;
    }
    return true;
  },
  {
    message: 'confidence must be in [0..1] if present'
  }
);

/**
 * Validateur fail-closed pour ProviderResult
 * @param {unknown} data - Données à valider
 * @returns {Object} ProviderResult validé
 * @throws {Error} Si validation échoue (fail-closed)
 */
export function validateProviderResult(data) {
  if (!data) {
    throw new Error('FAIL-CLOSED: ProviderResult is null/undefined');
  }
  try {
    return ProviderResultSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError && error.errors) {
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`FAIL-CLOSED: ProviderResult validation failed - ${details}`);
    }
    throw error;
  }
}

/**
 * Validateur safe (retourne résultat au lieu de throw)
 * @param {unknown} data - Données à valider
 * @returns {{success: boolean, data?: Object, error?: string}}
 */
export function validateProviderResultSafe(data) {
  if (!data) {
    return { success: false, error: 'ProviderResult is null/undefined' };
  }
  const result = ProviderResultSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const details = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return { success: false, error: `ProviderResult validation failed: ${details}` };
  }
}

/**
 * Helper: Créer un ProviderResult OK (succès)
 */
export function createProviderResultOK(params) {
  const {
    provider,
    verdict,
    confidence,
    rationale,
    latencyMs,
    tokensIn,
    tokensOut,
    requestId,
    correlationId
  } = params;
  
  return validateProviderResult({
    provider,
    status: 'OK',
    verdict,
    confidence,
    rationale,
    latencyMs,
    tokensIn,
    tokensOut,
    requestId,
    correlationId
  });
}

/**
 * Helper: Créer un ProviderResult ERROR (échec)
 */
export function createProviderResultError(params) {
  const {
    provider,
    status, // TIMEOUT, RATE_LIMIT, etc.
    latencyMs,
    error,
    requestId,
    correlationId
  } = params;
  
  return validateProviderResult({
    provider,
    status,
    latencyMs,
    error,
    requestId,
    correlationId
    // Pas de verdict/confidence si status !== OK (fail-closed)
  });
}
