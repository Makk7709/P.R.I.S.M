/**
 * Contrats stricts pour ConsensusManager
 * Fail-closed: rejette toute donnée non conforme au schéma
 */

import { z } from 'zod';

/**
 * Schéma pour VoteType (enum strict)
 */
export const VoteTypeSchema = z.enum(['approve', 'reject', 'abstain', 'unavailable'], {
  errorMap: () => ({ message: 'VoteType must be one of: approve, reject, abstain, unavailable' })
});

/**
 * Schéma pour DecisionType (enum strict)
 */
export const DecisionTypeSchema = z.enum([
  'security',
  'critical',
  'self_improvement',
  'system_modification',
  'data_access'
], {
  errorMap: () => ({ message: 'DecisionType must be a valid decision type' })
});

/**
 * Schéma pour ConsensusStatus (enum strict)
 */
export const ConsensusStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'TIMEOUT'], {
  errorMap: () => ({ message: 'ConsensusStatus must be one of: PENDING, APPROVED, REJECTED, TIMEOUT' })
});

/**
 * Schéma pour un vote individuel
 * Fail-closed: rejette si clés inconnues ou types invalides
 */
export const VoteSchema = z.object({
  vote: VoteTypeSchema,
  reasoning: z.string().min(0).max(5000), // Limite raisonnable
  timestamp: z.number().int().positive(), // Timestamp Unix en ms
  provider: z.string().min(1).max(100) // Nom du provider
}).strict(); // strict() = rejette clés inconnues

/**
 * Schéma pour une proposition de décision (input)
 * Fail-closed: rejette toute proposition non conforme
 */
export const DecisionProposalSchema = z.object({
  id: z.string().uuid().optional(), // Généré si absent
  decisionHash: z.string().min(1).max(128), // Hash de la décision
  payload: z.record(z.string(), z.any()), // Payload flexible mais typé (Zod v4 syntax)
  type: DecisionTypeSchema,
  timestamp: z.number().int().positive().optional(), // Généré si absent
  timeoutMs: z.number().int().positive().max(60000).optional() // Max 60s
}).strict();

/**
 * Schéma pour résultat de consensus (output)
 * Fail-closed: garantit structure cohérente
 */
export const ConsensusResultSchema = z.object({
  status: ConsensusStatusSchema,
  proposalId: z.string().uuid(),
  votes: z.array(VoteSchema).min(0),
  requiredVotes: z.number().int().positive(),
  approvalCount: z.number().int().nonnegative(),
  rejectionCount: z.number().int().nonnegative(),
  abstentionCount: z.number().int().nonnegative(),
  unavailableCount: z.number().int().nonnegative(),
  timestamp: z.number().int().positive(),
  elapsedMs: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1).optional() // Score de confiance 0..1
}).strict();

/**
 * Schéma pour input requestConsensus
 * Fail-closed: validation stricte avant traitement
 */
export const RequestConsensusInputSchema = z.object({
  proposal: DecisionProposalSchema,
  timeoutMs: z.number().int().positive().max(60000).optional(),
  providers: z.array(z.string()).min(1).max(10).optional() // Providers spécifiques
}).strict();

/**
 * Validateur fail-closed
 * @param {unknown} data - Données à valider
 * @param {z.ZodSchema} schema - Schéma Zod
 * @returns {Object} Données validées
 * @throws {Error} Si validation échoue (fail-closed)
 */
export function validateStrict(data, schema) {
  if (!schema) {
    throw new Error(`FAIL-CLOSED: Schema is undefined - cannot validate data`);
  }
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`Schema validation failed (fail-closed): ${details}`);
    }
    throw error;
  }
}

/**
 * Validateur safe (retourne résultat au lieu de throw)
 * @param {unknown} data - Données à valider
 * @param {z.ZodSchema} schema - Schéma Zod
 * @returns {{success: boolean, data?: Object, error?: string}}
 */
export function validateSafe(data, schema) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const details = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return { success: false, error: `Schema validation failed: ${details}` };
  }
}
