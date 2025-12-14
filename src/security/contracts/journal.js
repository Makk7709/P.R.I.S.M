/**
 * Contrats stricts pour SecureJournalManager
 * Fail-closed: rejette toute entrée de journal non conforme
 */

import { z } from 'zod';

/**
 * Schéma pour JournalEventType (enum strict)
 */
export const JournalEventTypeSchema = z.enum([
  'consensus_decision',
  'model_selection',
  'performance_adaptation',
  'security_alert',
  'system_state_change',
  'user_interaction',
  'error_recovery'
], {
  errorMap: () => ({ message: 'JournalEventType must be a valid event type' })
});

/**
 * Schéma pour métadonnées de journal
 * Fail-closed: structure stricte
 */
export const JournalMetadataSchema = z.object({
  version: z.string().regex(/^\d+\.\d+$/), // Ex: '1.0'
  source: z.string().min(1).max(100), // Ex: 'prism-core'
  correlationId: z.string().uuid().optional(),
  userId: z.string().min(0).max(200).optional(),
  sessionId: z.string().min(0).max(200).optional(),
  extra: z.record(z.string(), z.any()).optional() // Métadonnées additionnelles
}).strict();

/**
 * Schéma pour une entrée de journal (input append)
 * Fail-closed: rejette si structure invalide
 */
export const JournalEntryInputSchema = z.object({
  eventType: JournalEventTypeSchema,
  payload: z.record(z.string(), z.any()), // Payload flexible mais typé
  metadata: JournalMetadataSchema.optional(),
  id: z.string().uuid().optional(), // Généré si absent
  timestamp: z.number().int().positive().optional() // Généré si absent
}).strict();

/**
 * Schéma pour une entrée de journal complète (output)
 * Inclut hash et signature calculés
 */
export const JournalEntryOutputSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().int().positive(),
  eventType: JournalEventTypeSchema,
  payload: z.record(z.unknown()),
  metadata: JournalMetadataSchema,
  sequence: z.number().int().nonnegative(),
  hash: z.string().length(64), // SHA-256 = 64 hex chars
  signature: z.string().min(0).max(200).nullable() // HMAC signature
}).strict();

/**
 * Schéma pour résultat d'append
 * Fail-closed: garantit cohérence
 */
export const JournalAppendResultSchema = z.object({
  success: z.boolean(),
  entryId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  hash: z.string().length(64),
  signature: z.string().min(0).max(200),
  timestamp: z.number().int().positive()
}).strict();

/**
 * Schéma pour résultat de vérification
 * Fail-closed: indique intégrité ou corruption
 */
export const JournalVerificationResultSchema = z.object({
  valid: z.boolean(),
  firstCorruptedIndex: z.number().int().nonnegative().nullable(),
  totalEntries: z.number().int().nonnegative(),
  verifiedEntries: z.number().int().nonnegative(),
  errors: z.array(z.object({
    index: z.number().int().nonnegative(),
    reason: z.string().min(1)
  })).min(0)
}).strict();

/**
 * Validateurs fail-closed
 */
export function validateJournalEntryInput(data) {
  try {
    return JournalEntryInputSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`JournalEntryInput validation failed (fail-closed): ${details}`);
    }
    throw error;
  }
}

export function validateJournalEntryOutput(data) {
  try {
    return JournalEntryOutputSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`JournalEntryOutput validation failed (fail-closed): ${details}`);
    }
    throw error;
  }
}
