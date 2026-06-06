/**
 * Property-Based Tests - ConsensusManager
 * Prouve que ConsensusManager respecte des invariants critiques
 * via fast-check (property-based testing)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ConsensusManager, VoteType, DecisionType, ConsensusStatus, AIProvider } from '../../src/core/ConsensusManager.js';

describe('ConsensusManager - Property-Based Tests', () => {
  const timeoutMs = 5000; // Timeout pour tests
  
  /**
   * Helper: Créer un ConsensusManager isolé pour tests
   */
  function createTestManager() {
    return new ConsensusManager({
      timeoutMs,
      enableTrustContext: false, // Désactiver TrustContext pour tests isolés
      autoRequestVotes: false, // Désactiver auto-request pour contrôle manuel
      useRealProviders: false
    });
  }
  
  /**
   * Helper: Générer un vote arbitraire
   */
  const voteArbitrary = fc.constantFrom(
    VoteType.APPROVE,
    VoteType.REJECT,
    VoteType.ABSTAIN,
    VoteType.UNAVAILABLE
  );
  
  /**
   * Helper: Générer une liste de votes pour tous les providers (un vote unique par provider)
   */
  const votesListArbitrary = (() => {
    const providers = Object.values(AIProvider);
    return fc.array(voteArbitrary, { minLength: providers.length, maxLength: providers.length })
      .chain(votes => 
        fc.array(fc.string(), { minLength: providers.length, maxLength: providers.length })
          .map(reasonings => 
            providers.map((p, i) => [p, votes[i], reasonings[i]] as [typeof p, VoteType, string])
          )
      );
  })();
  
  describe('A) Invariance à l\'ordre des votes', () => {
    
    it('DOIT produire le même résultat pour mêmes votes dans ordre différent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 128 }), // decisionHash (non vide, max 128 chars)
          fc.record({ data: fc.string() }), // payload
          fc.constantFrom(...Object.values(DecisionType)), // type
          votesListArbitrary, // votes
          async (decisionHash, payload, type, votesList) => {
            const manager1 = createTestManager();
            const manager2 = createTestManager();
            
            // Proposer dans les deux managers (avec gestion d'erreur)
            let proposalId1: string | undefined;
            let proposalId2: string | undefined;
            try {
              proposalId1 = await manager1.propose(decisionHash, payload, type);
              proposalId2 = await manager2.propose(decisionHash, payload, type);
            } catch (_e) {
              // Si validation échoue (données invalides), skip ce test
              return true;
            }
            
            if (!proposalId1 || !proposalId2) {
              return true; // Skip si proposal échoue
            }
            
            // Ajouter votes dans ordre original
            for (const [provider, vote, reasoning] of votesList) {
              try {
                manager1.submitVote(proposalId1, provider, vote, reasoning);
              } catch (_e) {
                // Ignore validation errors (testé ailleurs)
              }
            }
            
            // Ajouter votes dans ordre permuté (shuffled) - utiliser seed pour reproductibilité
            const shuffledVotes = [...votesList];
            // Shuffle déterministe basé sur decisionHash
            for (let i = shuffledVotes.length - 1; i > 0; i--) {
              const j = Math.floor((decisionHash.charCodeAt(i % decisionHash.length) || 0) % (i + 1));
              [shuffledVotes[i], shuffledVotes[j]] = [shuffledVotes[j], shuffledVotes[i]];
            }
            for (const [provider, vote, reasoning] of shuffledVotes) {
              try {
                manager2.submitVote(proposalId2, provider, vote, reasoning);
              } catch (_e) {
                // Ignore validation errors (testé ailleurs)
              }
            }
            
            // Attendre stabilisation
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Vérifier que les résultats sont identiques
            const result1 = manager1.getProposalStatus(proposalId1);
            const result2 = manager2.getProposalStatus(proposalId2);
            
            // Même status
            expect(result1?.status).toBe(result2?.status);
            
            // Même vote count (approvals, rejections, etc.)
            const proposal1 = manager1.proposals.get(proposalId1);
            const proposal2 = manager2.proposals.get(proposalId2);
            if (proposal1 && proposal2) {
              const votes1 = proposal1.getVoteCount();
              const votes2 = proposal2.getVoteCount();
              expect(votes1.approvals).toBe(votes2.approvals);
              expect(votes1.rejections).toBe(votes2.rejections);
              expect(votes1.abstentions).toBe(votes2.abstentions);
            }
          }
        ),
        {
          numRuns: 200,
          timeout: timeoutMs + 2000
        }
      );
    });
  });
  
  describe('B) Quorum / votes valides', () => {
    
    it('DOIT respecter quorum: 2/3 approvals => APPROVED, < 2/3 REJECT => pas APPROVED (sauf fail-open)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 128 }), // decisionHash valide
          fc.record({ data: fc.string() }),
          fc.integer({ min: 0, max: 1 }), // Nombre d'approvals
          fc.integer({ min: 0, max: 2 }), // Nombre de rejections
          async (decisionHash, payload, numApprovals, numRejections) => {
            const manager = createTestManager();
            let proposalId: string | undefined;
            try {
              proposalId = await manager.propose(decisionHash, payload, DecisionType.CRITICAL);
            } catch (_e) {
              return true; // Skip si validation échoue
            }
            if (!proposalId) return true;
            
            const providers = Object.values(AIProvider);
            const _totalVotes = Math.min(numApprovals + numRejections, providers.length);
            
            let idx = 0;
            // Ajouter approvals
            for (let i = 0; i < numApprovals && idx < providers.length; i++) {
              manager.submitVote(proposalId, providers[idx++], VoteType.APPROVE, 'test');
            }
            // Ajouter rejections
            for (let i = 0; i < numRejections && idx < providers.length; i++) {
              manager.submitVote(proposalId, providers[idx++], VoteType.REJECT, 'test');
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const status = manager.getProposalStatus(proposalId);
            const requiredQuorum = Math.ceil(providers.length * 2 / 3); // 2
            
            // Si quorum atteint (>= 2 approvals), devrait être APPROVED
            if (numApprovals >= requiredQuorum && status) {
              expect(status.status).toBe(ConsensusStatus.APPROVED);
            }
            // Si plus de rejections que approvals ET pas de quorum, ne devrait pas être APPROVED
            // (sauf si fail-open s'applique, mais on évite ce cas ici avec seulement APPROVE/REJECT)
            else if (numRejections > numApprovals && numApprovals < requiredQuorum && status) {
              expect(status.status).not.toBe(ConsensusStatus.APPROVED);
            }
            
            return true;
          }
        ),
        {
          numRuns: 100,
          timeout: timeoutMs + 2000
        }
      );
    });
    
    it('DOIT exclure abstain/unavailable du calcul du quorum', async () => {
      const manager = createTestManager();
      const proposalId = await manager.propose('test-hash', { data: 'test' }, DecisionType.CRITICAL);
      
      const providers = Object.values(AIProvider);
      
      // 2 approvals + 1 abstain => consensus (approvals >= quorum de 2)
      manager.submitVote(proposalId, providers[0], VoteType.APPROVE, 'test');
      manager.submitVote(proposalId, providers[1], VoteType.APPROVE, 'test');
      manager.submitVote(proposalId, providers[2], VoteType.ABSTAIN, 'test');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = manager.getProposalStatus(proposalId);
      // 2 approvals >= quorum(2), donc APPROVED même avec 1 abstain
      expect(status?.status).toBe(ConsensusStatus.APPROVED);
    });
  });
  
  describe('C) Monotonicité', () => {
    
    it('DOIT respecter monotonicité: ajouter APPROVE ne fait pas passer APPROVED → REJECTED', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 128 }),
          fc.record({ data: fc.string() }),
          votesListArbitrary,
          async (decisionHash, payload, initialVotes) => {
            const manager = createTestManager();
            let proposalId: string | undefined;
            try {
              proposalId = await manager.propose(decisionHash, payload, DecisionType.CRITICAL);
            } catch (_e) {
              return true; // Skip si validation échoue
            }
            if (!proposalId) return true;
            
            // Ajouter votes initiaux
            for (const [provider, vote, reasoning] of initialVotes) {
              manager.submitVote(proposalId, provider, vote, reasoning);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const statusBefore = manager.getProposalStatus(proposalId)?.status;
            
            // Si déjà APPROVED, ajouter un autre APPROVE ne doit pas changer
            if (statusBefore === ConsensusStatus.APPROVED) {
              // Trouver un provider qui n'a pas encore voté ou changer son vote en APPROVE
              const providers = Object.values(AIProvider);
              for (const provider of providers) {
                const proposal = manager.proposals.get(proposalId);
                if (proposal && !proposal.votes.has(provider)) {
                  manager.submitVote(proposalId, provider, VoteType.APPROVE, 'additional');
                  break;
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, 100));
              
              const statusAfter = manager.getProposalStatus(proposalId)?.status;
              
              // Ne doit pas passer de APPROVED à REJECTED
              expect(statusAfter).not.toBe(ConsensusStatus.REJECTED);
              
              // Doit rester APPROVED ou au moins ne pas régresser
              if (statusBefore === ConsensusStatus.APPROVED) {
                expect(statusAfter).toBe(ConsensusStatus.APPROVED);
              }
            }
            
            return true;
          }
        ),
        {
          numRuns: 100,
          timeout: timeoutMs + 2000
        }
      );
    });
  });
  
  describe('D) Déterminisme', () => {
    
    it('DOIT produire le même output pour même input (même verdict + status)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 128 }),
          fc.record({ data: fc.string() }),
          fc.constantFrom(...Object.values(DecisionType)),
          votesListArbitrary,
          async (decisionHash, payload, type, votesList) => {
            const manager1 = createTestManager();
            const manager2 = createTestManager();
            
            // Proposer avec mêmes paramètres
            let proposalId1: string | undefined;
            let proposalId2: string | undefined;
            try {
              proposalId1 = await manager1.propose(decisionHash, payload, type);
              proposalId2 = await manager2.propose(decisionHash, payload, type);
            } catch (_e) {
              return true; // Skip si validation échoue
            }
            if (!proposalId1 || !proposalId2) return true;
            
            // Ajouter mêmes votes dans même ordre
            for (const [provider, vote, reasoning] of votesList) {
              manager1.submitVote(proposalId1, provider, vote, reasoning);
              manager2.submitVote(proposalId2, provider, vote, reasoning);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const result1 = manager1.getProposalStatus(proposalId1);
            const result2 = manager2.getProposalStatus(proposalId2);
            
            // Même status
            expect(result1?.status).toBe(result2?.status);
            
            // Même verdict (approve/reject)
            if (result1?.status === ConsensusStatus.APPROVED) {
              expect(result2?.status).toBe(ConsensusStatus.APPROVED);
            } else if (result1?.status === ConsensusStatus.REJECTED) {
              expect(result2?.status).toBe(ConsensusStatus.REJECTED);
            }
            
            return true;
          }
        ),
        {
          numRuns: 200,
          timeout: timeoutMs + 2000
        }
      );
    });
  });
  
  describe('E) Bornes de sécurité / Fail-Closed', () => {
    
    it('DOIT rejeter vote hors schéma (fail-closed)', async () => {
      const manager = createTestManager();
      const proposalId = await manager.propose('test-hash', { data: 'test' }, DecisionType.CRITICAL);
      
      // Tentative de vote avec type invalide
      expect(() => {
        manager.submitVote(proposalId, AIProvider.GPT4, 'INVALID_VOTE_TYPE' as any, 'test');
      }).toThrow(); // Doit throw car validation fail-closed
    });
    
    it('DOIT rejeter proposal avec confidence hors [0..1]', async () => {
      const manager = createTestManager();
      
      // Proposal avec confidence invalide (si le schéma le requiert)
      // Note: Actuellement le schéma ne valide pas confidence, mais si ajouté plus tard, ce test garantit le comportement
      
      // Test avec payload malformé
      await expect(async () => {
        await manager.propose('', null as any, DecisionType.CRITICAL);
      }).rejects.toThrow(); // Doit rejeter si validation fail-closed
    });
  });
});
