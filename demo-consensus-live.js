#!/usr/bin/env node

/**
 * PRISM Consensus IA - Démo Live pour Gartner
 * Démonstration du système de consensus IA avec vote 2/3 majorité
 * Intégration avec le vrai ConsensusManager de PRISM
 */

import { ConsensusManager, DecisionType, AIProvider } from './src/core/ConsensusManager.js';
import { EventEmitter } from 'events';
import readline from 'readline';
import chalk from 'chalk';

class ConsensusDemoLive extends EventEmitter {
  constructor() {
    super();
    
    this.consensusManager = new ConsensusManager({
      timeoutMs: 2000, // 2 secondes pour la démo
      enableTrustContext: true
    });
    
    this.metrics = {
      totalProposals: 0,
      approvedProposals: 0,
      rejectedProposals: 0,
      timeoutProposals: 0,
      averageDecisionTime: 0
    };
    
    this.activeProposals = new Map();
    this.setupEventListeners();
    this.setupReadline();
  }

  setupEventListeners() {
    // Écouter les événements du ConsensusManager
    this.consensusManager.on('proposalCreated', (data) => {
      this.handleProposalCreated(data);
    });

    this.consensusManager.on('voteSubmitted', (data) => {
      this.handleVoteSubmitted(data);
    });

    this.consensusManager.on('consensusReached', (data) => {
      this.handleConsensusReached(data);
    });

    this.consensusManager.on('consensusTimeout', (data) => {
      this.handleConsensusTimeout(data);
    });
  }

  setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.clear();
    this.displayHeader();
    this.displayInstructions();
    await this.mainLoop();
  }

  displayHeader() {
    console.log(chalk.cyan.bold('🎯 PRISM CONSENSUS IA - DÉMO LIVE POUR GARTNER'));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════'));
    console.log(chalk.white('Démonstration du système de vote IA 2/3 majorité'));
    console.log(chalk.gray('Premier système IA au monde avec consensus intégré\n'));
  }

  displayInstructions() {
    console.log(chalk.yellow.bold('📋 INSTRUCTIONS:'));
    console.log(chalk.white('• Tapez votre question pour déclencher un consensus'));
    console.log(chalk.white('• Les 3 IA (GPT-4, Claude-3, Perplexity) vont voter'));
    console.log(chalk.white('• Vote 2/3 majorité requis pour validation'));
    console.log(chalk.white('• Timeout après 2 secondes → escalade TrustContext'));
    console.log(chalk.white('• Tapez "stats" pour voir les métriques'));
    console.log(chalk.white('• Tapez "quit" pour quitter\n'));
  }

  async mainLoop() {
    while (true) {
      const input = await this.askQuestion(chalk.green('❓ Votre question (ou commande): '));
      
      if (input.toLowerCase() === 'quit') {
        break;
      } else if (input.toLowerCase() === 'stats') {
        this.displayMetrics();
        continue;
      } else if (input.toLowerCase() === 'help') {
        this.displayInstructions();
        continue;
      } else if (input.trim() === '') {
        console.log(chalk.red('⚠️ Veuillez saisir une question\n'));
        continue;
      }

      await this.processConsensusDemo(input.trim());
    }

    this.cleanup();
  }

  async processConsensusDemo(question) {
    console.log(chalk.blue.bold('\n🚀 DÉMARRAGE DU CONSENSUS'));
    console.log(chalk.blue('─'.repeat(50)));
    console.log(chalk.white(`📝 Question: ${question}`));
    console.log(chalk.gray(`⏰ Timeout: 2000ms | Providers: ${Object.keys(AIProvider).length}`));
    
    try {
      // Créer une proposition réaliste
      const payload = this.generateRealisticPayload(question);
      const decisionType = this.determineDecisionType(question);
      
      console.log(chalk.cyan(`🔍 Type de décision: ${decisionType.toUpperCase()}`));
      console.log(chalk.cyan(`📊 Niveau de risque: ${Math.round(payload.riskLevel * 100)}%`));
      
      // Démarrer le processus de consensus
      const proposalId = await this.consensusManager.propose(
        await this.generateQuestionHash(question),
        payload,
        decisionType
      );
      
      this.activeProposals.set(proposalId, {
        question,
        startTime: Date.now(),
        payload
      });
      
      this.metrics.totalProposals++;
      
    } catch (error) {
      console.log(chalk.red(`❌ Erreur: ${error.message}\n`));
    }
  }

  handleProposalCreated(data) {
    console.log(chalk.green(`✅ Proposition créée: ${data.proposalId}`));
    console.log(chalk.white('⏳ Vote des IA en cours...\n'));
    
    // Afficher la progression en temps réel
    this.displayVotingProgress(data.proposalId);
  }

  handleVoteSubmitted(data) {
    const voteIcon = data.vote ? '✅' : '❌';
    const voteText = data.vote ? 'APPROUVE' : 'REJETTE';
    const providerName = this.getProviderDisplayName(data.provider);
    
    console.log(chalk.yellow(`🗳️  ${providerName} ${voteIcon} ${voteText}`));
    console.log(chalk.gray(`   Raisonnement: ${data.reasoning}`));
    
    // Mettre à jour la progression
    this.updateVotingProgress(data.proposalId);
  }

  handleConsensusReached(data) {
    const proposal = this.activeProposals.get(data.proposalId);
    if (!proposal) return;

    const decisionTime = Date.now() - proposal.startTime;
    const status = data.status;
    
    console.log(chalk.blue('\n📊 RÉSULTAT DU CONSENSUS'));
    console.log(chalk.blue('─'.repeat(30)));
    
    if (status === 'APPROVED') {
      console.log(chalk.green.bold('✅ CONSENSUS ATTEINT - APPROUVÉ'));
      this.metrics.approvedProposals++;
    } else if (status === 'REJECTED') {
      console.log(chalk.red.bold('❌ CONSENSUS ATTEINT - REJETÉ'));
      this.metrics.rejectedProposals++;
    }
    
    console.log(chalk.white(`⏱️  Temps de décision: ${decisionTime}ms`));
    console.log(chalk.white(`🗳️  Détail des votes:`));
    
    // Afficher les votes détaillés
    Object.entries(data.votes).forEach(([provider, voteData]) => {
      const voteIcon = voteData.vote ? '✅' : '❌';
      const providerName = this.getProviderDisplayName(provider);
      console.log(chalk.gray(`   • ${providerName}: ${voteIcon} ${voteData.reasoning}`));
    });
    
    this.updateMetrics(decisionTime);
    this.activeProposals.delete(data.proposalId);
    
    console.log(chalk.cyan(`\n${  '═'.repeat(50)  }\n`));
  }

  handleConsensusTimeout(data) {
    console.log(chalk.red.bold('\n⏱️ TIMEOUT ATTEINT'));
    console.log(chalk.red('─'.repeat(20)));
    console.log(chalk.yellow('🔒 Escalade vers TrustContext pour approbation humaine'));
    console.log(chalk.gray(`📋 Proposition: ${data.proposal.decisionHash}`));
    
    this.metrics.timeoutProposals++;
    this.activeProposals.delete(data.proposalId);
    
    console.log(chalk.cyan(`\n${  '═'.repeat(50)  }\n`));
  }

  displayVotingProgress(proposalId) {
    const proposal = this.consensusManager.getProposalStatus(proposalId);
    if (!proposal) return;
    
    const { voteCount } = proposal;
    const progress = `[${voteCount.approvals}✅ ${voteCount.rejections}❌ ${voteCount.abstentions}⏸️]`;
    
    console.log(chalk.cyan(`📊 Progression: ${progress} | Restant: ${proposal.timeRemaining}ms`));
  }

  updateVotingProgress(proposalId) {
    const proposal = this.consensusManager.getProposalStatus(proposalId);
    if (!proposal) return;
    
    const { voteCount } = proposal;
    const total = Object.keys(AIProvider).length;
    const voted = voteCount.approvals + voteCount.rejections + voteCount.abstentions;
    
    console.log(chalk.cyan(`📊 Votes: ${voted}/${total} | Approvals: ${voteCount.approvals} | Rejets: ${voteCount.rejections}`));
  }

  displayMetrics() {
    console.log(chalk.magenta.bold('\n📈 MÉTRIQUES CONSENSUS IA'));
    console.log(chalk.magenta('─'.repeat(30)));
    console.log(chalk.white(`📊 Propositions totales: ${this.metrics.totalProposals}`));
    console.log(chalk.green(`✅ Approuvées: ${this.metrics.approvedProposals}`));
    console.log(chalk.red(`❌ Rejetées: ${this.metrics.rejectedProposals}`));
    console.log(chalk.yellow(`⏱️ Timeouts: ${this.metrics.timeoutProposals}`));
    console.log(chalk.cyan(`⏱️ Temps moyen: ${this.metrics.averageDecisionTime}ms`));
    
    const successRate = this.metrics.totalProposals > 0 
      ? Math.round(((this.metrics.approvedProposals + this.metrics.rejectedProposals) / this.metrics.totalProposals) * 100)
      : 100;
    console.log(chalk.blue(`📈 Taux de succès: ${successRate}%`));
    console.log(chalk.gray(`🔄 Propositions actives: ${this.activeProposals.size}\n`));
  }

  generateRealisticPayload(question) {
    // Analyser la question pour générer un payload réaliste
    const lowerQuestion = question.toLowerCase();
    
    let riskLevel = 0.3; // Niveau de risque par défaut
    let evidenceQuality = 0.7; // Qualité des preuves par défaut
    let ethicalConcerns = false;
    
    // Ajuster selon le contenu de la question
    if (lowerQuestion.includes('sécurité') || lowerQuestion.includes('security')) {
      riskLevel = 0.8;
      ethicalConcerns = true;
    }
    
    if (lowerQuestion.includes('auto-apprentissage') || lowerQuestion.includes('ai') || lowerQuestion.includes('ia')) {
      riskLevel = 0.6;
      evidenceQuality = 0.8;
    }
    
    if (lowerQuestion.includes('urgent') || lowerQuestion.includes('critique')) {
      riskLevel = 0.7;
    }
    
    if (lowerQuestion.includes('test') || lowerQuestion.includes('demo')) {
      riskLevel = 0.2;
      evidenceQuality = 0.9;
    }
    
    return {
      riskLevel,
      evidenceQuality,
      ethicalConcerns,
      questionAnalysis: {
        sentiment: this.analyzeSentiment(question),
        complexity: this.analyzeComplexity(question),
        domain: this.identifyDomain(question)
      }
    };
  }

  determineDecisionType(question) {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('sécurité') || lowerQuestion.includes('security')) {
      return DecisionType.SECURITY;
    }
    
    if (lowerQuestion.includes('auto-apprentissage') || lowerQuestion.includes('amélioration')) {
      return DecisionType.SELF_IMPROVEMENT;
    }
    
    if (lowerQuestion.includes('système') || lowerQuestion.includes('architecture')) {
      return DecisionType.SYSTEM_MODIFICATION;
    }
    
    if (lowerQuestion.includes('données') || lowerQuestion.includes('data')) {
      return DecisionType.DATA_ACCESS;
    }
    
    return DecisionType.CRITICAL;
  }

  async generateQuestionHash(question) {
    // Générer un hash simple basé sur la question et timestamp
    const crypto = await import('crypto');
    return crypto.createHash('sha256')
      .update(question + Date.now())
      .digest('hex')
      .substring(0, 16);
  }

  getProviderDisplayName(provider) {
    const names = {
      'gpt-4.1': '🤖 GPT-4',
      'claude-3': '🧠 Claude-3',
      'perplexity': '🔍 Perplexity'
    };
    return names[provider] || provider;
  }

  analyzeSentiment(question) {
    const positiveWords = ['bon', 'bien', 'excellent', 'améliorer', 'optimiser'];
    const negativeWords = ['problème', 'erreur', 'danger', 'risque', 'critique'];
    
    let score = 0;
    const words = question.toLowerCase().split(' ');
    
    words.forEach(word => {
      if (positiveWords.some(pos => word.includes(pos))) score++;
      if (negativeWords.some(neg => word.includes(neg))) score--;
    });
    
    return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
  }

  analyzeComplexity(question) {
    const wordCount = question.split(' ').length;
    return wordCount > 20 ? 'high' : wordCount > 10 ? 'medium' : 'low';
  }

  identifyDomain(question) {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('sécurité')) return 'security';
    if (lowerQuestion.includes('finance')) return 'finance';
    if (lowerQuestion.includes('marketing')) return 'marketing';
    if (lowerQuestion.includes('technique')) return 'technical';
    
    return 'general';
  }

  updateMetrics(decisionTime) {
    const totalDecisions = this.metrics.approvedProposals + this.metrics.rejectedProposals + this.metrics.timeoutProposals;
    
    if (totalDecisions > 0) {
      this.metrics.averageDecisionTime = Math.round(
        (this.metrics.averageDecisionTime * (totalDecisions - 1) + decisionTime) / totalDecisions
      );
    }
  }

  askQuestion(prompt) {
    return new Promise(resolve => {
      this.rl.question(prompt, resolve);
    });
  }

  cleanup() {
    console.log(chalk.cyan.bold('\n👋 Merci d\'avoir testé PRISM Consensus IA!'));
    console.log(chalk.white('Démo terminée. Métriques finales:'));
    this.displayMetrics();
    
    this.consensusManager.cleanup();
    this.rl.close();
  }
}

// Exemples de questions prédéfinies pour la démo
const EXAMPLE_QUESTIONS = [
  "Devons-nous implémenter une nouvelle fonctionnalité d'auto-apprentissage?",
  "Faut-il accorder l'accès aux données sensibles à ce module?",
  "Cette modification du système de sécurité est-elle acceptable?",
  "Devons-nous déployer cette mise à jour critique en production?",
  "L'algorithme proposé respecte-t-il nos standards éthiques?",
  "Faut-il approuver cette optimisation des performances?",
  "Cette intégration tiers présente-t-elle des risques?",
  "Devons-nous activer ce mode de surveillance avancée?"
];

// Fonction pour afficher les exemples
function displayExamples() {
  console.log(chalk.yellow.bold('\n💡 EXEMPLES DE QUESTIONS:'));
  EXAMPLE_QUESTIONS.forEach((question, index) => {
    console.log(chalk.gray(`${index + 1}. ${question}`));
  });
  console.log('');
}

// Démarrage de la démo
async function main() {
  try {
    const demo = new ConsensusDemoLive();
    
    // Afficher les exemples au démarrage
    displayExamples();
    
    await demo.start();
  } catch (error) {
    console.error(chalk.red(`❌ Erreur de démarrage: ${error.message}`));
    process.exit(1);
  }
}

// Gestion des signaux pour cleanup propre
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n🛑 Arrêt demandé...'));
  process.exit(0);
});

// Démarrer si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ConsensusDemoLive }; 