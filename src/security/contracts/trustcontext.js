/**
 * Contrats stricts pour TrustContext
 * Fail-closed: rejette toute décision non conforme
 */

import { z } from 'zod';

/**
 * Schéma pour CriticalityLevel (enum strict)
 */
export const CriticalityLevelSchema = z.enum(['low', 'medium', 'high', 'critical'], {
  errorMap: () => ({ message: 'CriticalityLevel must be one of: low, medium, high, critical' })
});

/**
 * Schéma pour ApprovalStatus (enum strict)
 */
export const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected'], {
  errorMap: () => ({ message: 'ApprovalStatus must be one of: pending, approved, rejected' })
});

/**
 * Schéma pour validateCriticalDecision input
 * Fail-closed: rejette toute décision mal formée
 */
export const CriticalDecisionRequestSchema = z.object({
  action: z.string().min(1).max(200), // Ex: 'consensus_request', 'excel_analysis'
  input: z.string().min(0).max(100000), // Input utilisateur (limite raisonnable)
  taskType: z.string().min(1).max(100).optional(), // Ex: 'critical', 'general'
  criticality: CriticalityLevelSchema,
  classification: z.object({
    level: CriticalityLevelSchema,
    type: z.string().optional(),
    score: z.number().min(0).max(1)
  }).strict().optional(),
  metadata: z.record(z.string(), z.any()).optional() // Métadonnées additionnelles
}).strict();

/**
 * Schéma pour requestApproval input
 * Fail-closed: validation stricte des requêtes d'approbation
 */
export const ApprovalRequestSchema = z.object({
  action: z.string().min(1).max(200),
  fileSize: z.number().int().nonnegative().max(10 * 1024 * 1024 * 1024).optional(), // Max 10GB
  fileName: z.string().min(1).max(500).optional(),
  userQuery: z.string().min(0).max(10000).optional(),
  criticality: CriticalityLevelSchema.optional(),
  metadata: z.record(z.unknown()).optional()
}).strict();

/**
 * Schéma pour réponse d'approbation (output)
 * Fail-closed: garantit structure cohérente
 */
export const ApprovalResponseSchema = z.object({
  approved: z.boolean(),
  reason: z.string().min(0).max(5000),
  timestamp: z.number().int().positive(),
  approvalId: z.string().uuid().optional(),
  supervisorId: z.string().min(1).max(200).optional(),
  expiresAt: z.number().int().positive().optional() // Expiration en ms
}).strict();

/**
 * Schéma pour approbation signée (format canonique pour signature)
 * Fail-closed: structure stricte pour non-répudiation
 */
export const SignedApprovalSchema = z.object({
  approvalId: z.string().uuid(),
  decisionId: z.string().min(1).max(200), // Token d'approbation
  decisionDigest: z.string().length(64), // SHA-256 hex (64 chars)
  approver: z.object({
    id: z.string().min(1).max(200),
    role: z.string().min(1).max(100), // Ex: 'lead', 'security', 'owner'
    keyId: z.string().min(1).max(200) // Identifiant de la clé publique
  }).strict(),
  verdict: z.enum(['approve', 'reject']),
  reason: z.string().max(5000).optional(),
  issuedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive().optional(),
  nonce: z.string().min(1).max(100).optional(), // Protection replay
  signature: z.string().min(1).max(200) // Signature Ed25519 hex (requis)
}).strict();

/**
 * Schéma pour résultat de vérification d'approbation
 */
export const ApprovalVerificationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
  errorCode: z.enum([
    'SIGNATURE_INVALID',
    'DIGEST_MISMATCH',
    'AUTHORIZATION_FAILED',
    'EXPIRED',
    'KEY_UNKNOWN',
    'SCHEMA_INVALID'
  ]).optional()
}).strict();

/**
 * Validateur fail-closed pour TrustContext
 */
export function validateCriticalDecisionRequest(data) {
  try {
    return CriticalDecisionRequestSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`CriticalDecisionRequest validation failed (fail-closed): ${details}`);
    }
    throw error;
  }
}

export function validateApprovalRequest(data) {
  try {
    return ApprovalRequestSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`ApprovalRequest validation failed (fail-closed): ${details}`);
    }
    throw error;
  }
}

export function validateApprovalResponse(data) {
  try {
    return ApprovalResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`ApprovalResponse validation failed (fail-closed): ${details}`);
    }
    throw error;
  }
}

export function validateSignedApproval(data) {
  try {
    return SignedApprovalSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new Error(`SignedApproval validation failed (fail-closed): ${details}`);
    }
    throw error;
  }
}
