/**
 * Module central des contrats stricts PRISM
 * Exporte tous les schémas et validateurs pour validation fail-closed
 */

// Consensus contracts
export {
  VoteTypeSchema,
  DecisionTypeSchema,
  ConsensusStatusSchema,
  VoteSchema,
  DecisionProposalSchema,
  ConsensusResultSchema,
  RequestConsensusInputSchema,
  validateStrict,
  validateSafe
} from './consensus.js';

// TrustContext contracts
export {
  CriticalityLevelSchema,
  ApprovalStatusSchema,
  CriticalDecisionRequestSchema,
  ApprovalRequestSchema,
  ApprovalResponseSchema,
  validateCriticalDecisionRequest,
  validateApprovalRequest,
  validateApprovalResponse
} from './trustcontext.js';

// Journal contracts
export {
  JournalEventTypeSchema,
  JournalMetadataSchema,
  JournalEntryInputSchema,
  JournalEntryOutputSchema,
  JournalAppendResultSchema,
  JournalVerificationResultSchema,
  validateJournalEntryInput,
  validateJournalEntryOutput
} from './journal.js';
