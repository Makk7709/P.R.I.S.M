/**
 * PRISM Hybrid Orchestrator - Tests TDD Stricts
 * 
 * Architecture hybride:
 * - Router simple pour requêtes normales (rapide)
 * - ConsensusManager pour décisions critiques (fiable)
 * 
 * @coverage Target: 95%+ sans mocks
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// SECTION 1: TESTS DE CLASSIFICATION DES REQUÊTES
// ============================================================================

describe('CriticalityClassifier - Classification des requêtes', () => {
  
  describe('Requêtes NORMALES (Router Simple)', () => {
    
    it('DOIT classifier une question générale comme NON-CRITIQUE', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Bonjour, comment ça va ?');
      
      expect(result.isCritical).toBe(false);
      expect(result.level).toBe('NORMAL');
      expect(result.reason).toBeDefined();
    });
    
    it('DOIT classifier une demande marketing comme NON-CRITIQUE', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Créer une campagne marketing pour notre produit');
      
      expect(result.isCritical).toBe(false);
      expect(result.level).toBe('NORMAL');
    });
    
    it('DOIT classifier une question technique simple comme NON-CRITIQUE', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Comment fonctionne JavaScript ?');
      
      expect(result.isCritical).toBe(false);
      expect(result.level).toBe('NORMAL');
    });
    
    it('DOIT classifier une demande de traduction comme NON-CRITIQUE', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Traduis ce texte en anglais');
      
      expect(result.isCritical).toBe(false);
      expect(result.level).toBe('NORMAL');
    });
    
  });
  
  describe('Requêtes CRITIQUES (Consensus Required)', () => {
    
    it('DOIT classifier une demande de modification système comme CRITIQUE', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Modifie les paramètres de sécurité du système');
      
      expect(result.isCritical).toBe(true);
      expect(result.level).toBe('CRITICAL');
      expect(result.type).toBe('SYSTEM_MODIFICATION');
    });
    
    it('DOIT classifier une demande financière importante comme CRITIQUE', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Approuve le transfert de 500000 euros vers ce compte');
      
      expect(result.isCritical).toBe(true);
      expect(result.level).toBe('CRITICAL');
      expect(result.type).toBe('FINANCIAL_DECISION');
    });
    
    it('DOIT classifier une demande de suppression de données comme CRITIQUE', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Supprime toutes les données utilisateur');
      
      expect(result.isCritical).toBe(true);
      expect(result.level).toBe('CRITICAL');
      expect(result.type).toBe('DATA_DELETION');
    });
    
    it('DOIT classifier une demande de sécurité comme CRITIQUE', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Désactive l\'authentification à deux facteurs');
      
      expect(result.isCritical).toBe(true);
      expect(result.level).toBe('CRITICAL');
      expect(result.type).toBe('SECURITY');
    });
    
    it('DOIT classifier une demande d\'accès admin comme CRITIQUE', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Donne-moi les droits administrateur');
      
      expect(result.isCritical).toBe(true);
      expect(result.level).toBe('CRITICAL');
      expect(result.type).toBe('ACCESS_ELEVATION');
    });
    
    it('DOIT classifier une demande de modification de code comme HAUTE', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Modifie le code source du module principal');
      
      expect(result.isCritical).toBe(true);
      expect(['CRITICAL', 'HIGH']).toContain(result.level);
      expect(result.type).toBe('CODE_MODIFICATION');
    });
    
  });
  
  describe('Niveau de criticité (scoring)', () => {
    
    it('DOIT retourner un score de criticité entre 0 et 1', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const normalResult = classifier.classify('Bonjour');
      const criticalResult = classifier.classify('Supprime la base de données');
      
      expect(normalResult.score).toBeGreaterThanOrEqual(0);
      expect(normalResult.score).toBeLessThanOrEqual(1);
      expect(criticalResult.score).toBeGreaterThanOrEqual(0);
      expect(criticalResult.score).toBeLessThanOrEqual(1);
      
      // Le score critique doit être plus élevé
      expect(criticalResult.score).toBeGreaterThan(normalResult.score);
    });
    
    it('DOIT définir le seuil critique à 0.7', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      expect(classifier.criticalThreshold).toBe(0.7);
    });
    
  });
  
  describe('Contexte et historique', () => {
    
    it('DOIT prendre en compte le contexte de conversation', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const context = {
        previousMessages: [
          { role: 'user', content: 'Je veux accéder aux paramètres système' },
          { role: 'assistant', content: 'Que voulez-vous modifier ?' }
        ]
      };
      
      // "Tout" seul n'est pas critique, mais avec contexte de paramètres système, ça l'est
      const result = classifier.classify('Tout', context);
      
      expect(result.contextInfluenced).toBe(true);
    });
    
    it('DOIT augmenter le score si mots-clés critiques dans historique', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const withContext = classifier.classify('Oui, fais-le', {
        previousMessages: [
          { role: 'assistant', content: 'Voulez-vous vraiment supprimer toutes les données ?' }
        ]
      });
      
      const withoutContext = classifier.classify('Oui, fais-le');
      
      expect(withContext.score).toBeGreaterThan(withoutContext.score);
    });
    
  });
  
});

// ============================================================================
// SECTION 2: TESTS DU HYBRID ORCHESTRATOR
// ============================================================================

describe('HybridOrchestrator - Orchestration hybride', () => {
  
  describe('Initialisation', () => {
    
    it('DOIT s\'initialiser avec les composants requis', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      expect(orchestrator).toBeDefined();
      expect(orchestrator.classifier).toBeDefined();
      expect(orchestrator.router).toBeDefined();
      expect(orchestrator.consensusManager).toBeDefined();
    });
    
    it('DOIT exposer les métriques', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const metrics = orchestrator.getMetrics();
      
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('routedRequests');
      expect(metrics).toHaveProperty('consensusRequests');
      expect(metrics).toHaveProperty('avgResponseTime');
    });
    
  });
  
  describe('Routing des requêtes normales', () => {
    
    it('DOIT router une requête normale vers le SimpleRouter', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process('Bonjour, comment vas-tu ?', 'general');
      
      expect(result.mode).toBe('ROUTED');
      expect(result.consensusUsed).toBe(false);
      expect(result.model).toBeDefined();
    });
    
    it('DOIT retourner le temps de réponse pour requête routée', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process('Question simple', 'general');
      
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.responseTime).toBeLessThan(30000); // Max 30s
    });
    
  });
  
  describe('Routing des requêtes critiques vers Consensus', () => {
    
    it('DOIT envoyer une requête critique vers le ConsensusManager', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process(
        'Approuve la suppression de toutes les données utilisateur',
        'critical'
      );
      
      expect(result.mode).toBe('CONSENSUS');
      expect(result.consensusUsed).toBe(true);
      expect(result.votes).toBeDefined();
    });
    
    it('DOIT inclure le détail des votes pour requête consensus', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process(
        'Modifie les paramètres de sécurité',
        'critical'
      );
      
      expect(result.votes).toBeDefined();
      expect(Array.isArray(result.votes)).toBe(true);
      // Doit avoir au moins 2 votes pour un consensus
      expect(result.votes.length).toBeGreaterThanOrEqual(2);
    });
    
    it('DOIT retourner le statut du consensus (APPROVED/REJECTED)', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process(
        'Supprime le fichier de configuration',
        'critical'
      );
      
      expect(['APPROVED', 'REJECTED', 'TIMEOUT']).toContain(result.consensusStatus);
    });
    
  });
  
  describe('Détection automatique du mode', () => {
    
    it('DOIT auto-détecter une requête critique sans taskType explicite', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process(
        'Désactive toutes les protections de sécurité'
        // Pas de taskType fourni
      );
      
      expect(result.mode).toBe('CONSENSUS');
      expect(result.autoDetected).toBe(true);
    });
    
    it('DOIT permettre de forcer le mode CONSENSUS', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process(
        'Bonjour',
        'general',
        { forceConsensus: true }
      );
      
      expect(result.mode).toBe('CONSENSUS');
      expect(result.forcedMode).toBe(true);
    });
    
    it('DOIT permettre de forcer le mode ROUTED', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process(
        'Supprime les données',
        'general',
        { forceRouted: true }
      );
      
      expect(result.mode).toBe('ROUTED');
      expect(result.forcedMode).toBe(true);
    });
    
  });
  
  describe('Métadonnées de réponse', () => {
    
    it('DOIT inclure toutes les métadonnées requises', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process('Test', 'general');
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('mode');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('responseTime');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('criticalityScore');
    });
    
    it('DOIT inclure les modèles participants en mode CONSENSUS', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process(
        'Supprime le compte admin',
        'critical'
      );
      
      expect(result.participatingModels).toBeDefined();
      expect(result.participatingModels).toContain('openai');
      // Au moins 2 modèles doivent participer
      expect(result.participatingModels.length).toBeGreaterThanOrEqual(2);
    });
    
  });
  
});

// ============================================================================
// SECTION 3: TESTS D'INTÉGRATION AVEC CONSENSUS MANAGER EXISTANT
// ============================================================================

describe('Intégration ConsensusManager existant', () => {
  
  describe('Utilisation du ConsensusManager de src/core', () => {
    
    it('DOIT utiliser le ConsensusManager existant', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const { ConsensusManager } = await import('../../src/core/ConsensusManager.js');
      
      const orchestrator = new HybridOrchestrator();
      
      // Le consensus manager interne doit être une instance du vrai ConsensusManager
      expect(orchestrator.consensusManager).toBeInstanceOf(ConsensusManager);
    });
    
    it('DOIT respecter la règle de majorité 2/3', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const { VoteType } = await import('../../src/core/ConsensusManager.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process(
        'Action critique de test',
        'critical'
      );
      
      // Vérifier que des votes ont été collectés
      expect(result.votes).toBeDefined();
      expect(Array.isArray(result.votes)).toBe(true);
      
      // Vérifier que le statut est valide
      expect(['APPROVED', 'REJECTED', 'TIMEOUT', 'PENDING']).toContain(result.consensusStatus);
      
      // Si des votes sont présents, vérifier la cohérence
      if (result.votes.length > 0) {
        // Note: VoteType values sont en minuscules ('approve', 'reject', etc.)
        const approvals = result.votes.filter(v => 
          v.vote === VoteType.APPROVE || v.vote === 'approve' || v.vote === 'APPROVE'
        ).length;
        const total = result.votes.filter(v => 
          v.vote !== VoteType.UNAVAILABLE && v.vote !== 'unavailable' &&
          v.vote !== VoteType.ABSTAIN && v.vote !== 'abstain'
        ).length;
        
        // Vérifier que le statut est cohérent avec les votes
        if (total > 0) {
          const approvalRatio = approvals / total;
          
          // Si APPROVED sans fallback, il DOIT y avoir >= 2/3 d'approbations
          if (result.consensusStatus === 'APPROVED' && !result.fallbackUsed) {
            expect(approvalRatio).toBeGreaterThanOrEqual(2/3);
          }
          
          // Si REJECTED sans fallback, il DOIT y avoir < 2/3 d'approbations
          if (result.consensusStatus === 'REJECTED' && !result.fallbackUsed) {
            expect(approvalRatio).toBeLessThan(2/3);
          }
        }
      }
    });
    
  });
  
  describe('Fallback et résilience', () => {
    
    it('DOIT fallback vers router si consensus timeout', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator({
        consensusTimeout: 100 // Timeout très court pour le test
      });
      
      const result = await orchestrator.process(
        'Action critique',
        'critical'
      );
      
      // Même en cas de timeout, doit retourner une réponse
      expect(result.content).toBeDefined();
      if (result.consensusStatus === 'TIMEOUT') {
        expect(result.fallbackUsed).toBe(true);
      }
    });
    
    it('DOIT gérer les erreurs de providers gracieusement', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      // Même avec des providers en erreur, doit fonctionner
      const result = await orchestrator.process(
        'Test résilience',
        'critical'
      );
      
      expect(result).toBeDefined();
      expect(result.content || result.error).toBeDefined();
    });
    
  });
  
});

// ============================================================================
// SECTION 4: TESTS DES MÉTRIQUES ET OBSERVABILITÉ
// ============================================================================

describe('Métriques et Observabilité', () => {
  
  describe('Compteurs de requêtes', () => {
    
    it('DOIT compter les requêtes par mode', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      // Reset metrics
      orchestrator.resetMetrics();
      
      await orchestrator.process('Question simple', 'general');
      await orchestrator.process('Supprime tout', 'critical');
      
      const metrics = orchestrator.getMetrics();
      
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.routedRequests).toBeGreaterThanOrEqual(1);
      expect(metrics.consensusRequests).toBeGreaterThanOrEqual(1);
    });
    
    it('DOIT calculer le temps de réponse moyen', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      orchestrator.resetMetrics();
      
      await orchestrator.process('Test 1', 'general');
      await orchestrator.process('Test 2', 'general');
      
      const metrics = orchestrator.getMetrics();
      
      expect(metrics.avgResponseTime).toBeGreaterThan(0);
    });
    
  });
  
  describe('Historique des décisions consensus', () => {
    
    it('DOIT garder un historique des décisions consensus', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      orchestrator.resetMetrics();
      
      await orchestrator.process('Action critique 1', 'critical');
      await orchestrator.process('Action critique 2', 'critical');
      
      const history = orchestrator.getConsensusHistory();
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
    
    it('DOIT inclure les détails de vote dans l\'historique', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      orchestrator.resetMetrics();
      
      await orchestrator.process('Action critique', 'critical');
      
      const history = orchestrator.getConsensusHistory();
      const lastDecision = history[history.length - 1];
      
      expect(lastDecision).toHaveProperty('votes');
      expect(lastDecision).toHaveProperty('status');
      expect(lastDecision).toHaveProperty('timestamp');
    });
    
  });
  
});

// ============================================================================
// SECTION 5: TESTS DES EXPORTS ET IMPORTS
// ============================================================================

describe('Module Exports', () => {
  
  it('DOIT exporter HybridOrchestrator depuis index', async () => {
    const module = await import('../../src/orchestrator/index.js');
    expect(module.HybridOrchestrator).toBeDefined();
  });
  
  it('DOIT exporter CriticalityClassifier depuis index', async () => {
    const module = await import('../../src/orchestrator/index.js');
    expect(module.CriticalityClassifier).toBeDefined();
  });
  
  it('DOIT exporter OrchestrationMode depuis index', async () => {
    const module = await import('../../src/orchestrator/index.js');
    expect(module.OrchestrationMode).toBeDefined();
  });
  
  it('DOIT exporter CriticalityType depuis index', async () => {
    const module = await import('../../src/orchestrator/index.js');
    expect(module.CriticalityType).toBeDefined();
  });
  
  it('DOIT exporter CriticalityLevel depuis index', async () => {
    const module = await import('../../src/orchestrator/index.js');
    expect(module.CriticalityLevel).toBeDefined();
  });
  
});

// ============================================================================
// SECTION 6: TESTS SUPPLÉMENTAIRES POUR COUVERTURE
// ============================================================================

describe('Couverture supplémentaire', () => {
  
  describe('CriticalityClassifier - Cas limites', () => {
    
    it('DOIT gérer une chaîne vide', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('');
      
      expect(result.isCritical).toBe(false);
      expect(result.level).toBe('NORMAL');
    });
    
    it('DOIT gérer des options personnalisées', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier({
        criticalThreshold: 0.5,
        highThreshold: 0.3
      });
      
      expect(classifier.criticalThreshold).toBe(0.5);
      expect(classifier.highThreshold).toBe(0.3);
    });
    
    it('DOIT détecter les amplificateurs', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      // Avec amplificateur "permanent" sur une action moins critique
      const withAmplifier = classifier.classify('Change la configuration de façon permanente');
      const withoutAmplifier = classifier.classify('Change la configuration');
      
      // L'amplificateur doit augmenter le score
      expect(withAmplifier.details.amplifierBonus).toBeGreaterThan(0);
    });
    
    it('DOIT détecter les atténuateurs', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      // Avec atténuateur "test"
      const withAttenuator = classifier.classify('Comment supprimer les données en test ?');
      const withoutAttenuator = classifier.classify('Supprime les données');
      
      expect(withAttenuator.score).toBeLessThan(withoutAttenuator.score);
    });
    
    it('DOIT détecter les changements de configuration', async () => {
      const { CriticalityClassifier } = await import('../../src/orchestrator/CriticalityClassifier.js');
      const classifier = new CriticalityClassifier();
      
      const result = classifier.classify('Modifie le fichier de configuration');
      
      expect(result.type).toBe('CONFIGURATION_CHANGE');
    });
    
  });
  
  describe('HybridOrchestrator - Cas limites', () => {
    
    it('DOIT gérer le reset des métriques', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      await orchestrator.process('Test', 'general');
      orchestrator.resetMetrics();
      
      const metrics = orchestrator.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.routedRequests).toBe(0);
    });
    
    it('DOIT retourner un historique vide après reset', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      await orchestrator.process('Action critique', 'critical');
      orchestrator.resetMetrics();
      
      const history = orchestrator.getConsensusHistory();
      expect(history.length).toBe(0);
    });
    
    it('DOIT gérer les erreurs gracieusement', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator({
        consensusTimeout: 1 // Timeout immédiat
      });
      
      const result = await orchestrator.process('Test erreur', 'critical');
      
      // Doit retourner quelque chose même en cas d'erreur
      expect(result).toBeDefined();
    });
    
    it('DOIT calculer le taux de succès', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      orchestrator.resetMetrics();
      await orchestrator.process('Test 1', 'general');
      
      const metrics = orchestrator.getMetrics();
      expect(metrics.successRate).toBeDefined();
      expect(metrics.successRate).toContain('%');
    });
    
  });
  
  describe('Votes et consensus', () => {
    
    it('DOIT formater les votes correctement', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process('Supprime toutes les données', 'critical');
      
      if (result.votes && result.votes.length > 0) {
        const vote = result.votes[0];
        expect(vote).toHaveProperty('provider');
        expect(vote).toHaveProperty('vote');
      }
    });
    
    it('DOIT résumer les votes', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process('Action critique test', 'critical');
      
      if (result.metadata && result.metadata.consensusDetails) {
        const summary = result.metadata.consensusDetails.voteSummary;
        expect(summary).toHaveProperty('approve');
        expect(summary).toHaveProperty('reject');
        expect(summary).toHaveProperty('abstain');
      }
    });
    
    it('DOIT gérer les votes null ou undefined', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      // Tester les méthodes internes avec des valeurs null
      const formattedNull = orchestrator._formatVotes(null);
      const formattedUndefined = orchestrator._formatVotes(undefined);
      
      expect(formattedNull).toEqual([]);
      expect(formattedUndefined).toEqual([]);
    });
    
    it('DOIT retourner des modèles par défaut si pas de votes', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const models = orchestrator._getParticipatingModels([]);
      
      expect(models).toContain('openai');
      expect(models).toContain('anthropic');
    });
    
    it('DOIT gérer les votes sans provider', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const formatted = orchestrator._formatVotes([
        { vote: 'approve', timestamp: Date.now() }
      ]);
      
      expect(formatted[0].provider).toBe('unknown');
    });
    
  });
  
  describe('Méthodes internes', () => {
    
    it('DOIT résumer les votes vides correctement', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const summary = orchestrator._summarizeVotes([]);
      
      expect(summary.approve).toBe(0);
      expect(summary.reject).toBe(0);
      expect(summary.abstain).toBe(0);
    });
    
    it('DOIT résumer les votes null correctement', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const summary = orchestrator._summarizeVotes(null);
      
      expect(summary.approve).toBe(0);
      expect(summary.reject).toBe(0);
      expect(summary.abstain).toBe(0);
    });
    
  });
  
});

// ============================================================================
// SECTION 7: TESTS DE L'INTERFACE (METADATA POUR UI)
// ============================================================================

describe('Métadonnées pour Interface UI', () => {
  
  describe('Format de réponse compatible UI', () => {
    
    it('DOIT retourner un format compatible avec l\'interface existante', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process('Test UI', 'general');
      
      // Format attendu par l'interface
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('orchestrationMode');
    });
    
    it('DOIT inclure les infos de consensus pour l\'affichage', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process('Action critique', 'critical');
      
      expect(result.metadata.orchestrationMode).toBe('CONSENSUS');
      expect(result.metadata.consensusDetails).toBeDefined();
      expect(result.metadata.consensusDetails).toHaveProperty('participatingModels');
      expect(result.metadata.consensusDetails).toHaveProperty('voteSummary');
    });
    
    it('DOIT inclure les infos de routing pour l\'affichage', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process('Question simple', 'general');
      
      expect(result.metadata.orchestrationMode).toBe('ROUTED');
      expect(result.metadata.selectedModel).toBeDefined();
    });
    
  });
  
  describe('Labels et descriptions pour UI', () => {
    
    it('DOIT fournir un label lisible du mode', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const routedResult = await orchestrator.process('Simple', 'general');
      const consensusResult = await orchestrator.process('Critique', 'critical');
      
      expect(routedResult.metadata.modeLabel).toBe('Router Simple');
      expect(consensusResult.metadata.modeLabel).toBe('Consensus Multi-IA');
    });
    
    it('DOIT fournir une description du processus', async () => {
      const { HybridOrchestrator } = await import('../../src/orchestrator/HybridOrchestrator.js');
      const orchestrator = new HybridOrchestrator();
      
      const result = await orchestrator.process('Action critique', 'critical');
      
      expect(result.metadata.processDescription).toBeDefined();
      expect(result.metadata.processDescription.length).toBeGreaterThan(10);
    });
    
  });
  
});

