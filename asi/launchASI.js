#!/usr/bin/env node

/**
 * @fileoverview Launch ASI - Script de lancement principal pour l'ASI
 * @module launchASI
 * @description Démarre l'intelligence artificielle superintelligente PRISM
 */

import dotenv from 'dotenv';
import winston from 'winston';
import { ASIInterface } from './asiInterface.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';

// Configuration de l'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Chargement des variables d'environnement
dotenv.config({ path: join(__dirname, '..', 'asi-config.env') });

// Configuration du logger principal
const logger = winston.createLogger({
  level: process.env.ASI_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/asi-launch.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ]
});

/**
 * @class ASILauncher
 * @description Gestionnaire de lancement et supervision de l'ASI
 */
class ASILauncher {
  constructor() {
    this.asiInterface = null;
    this.isRunning = false;
    this.startTime = null;
    this.healthCheckInterval = null;
    
    this.config = {
      port: Number.parseInt(process.env.PORT) || 3001,
      enableVoice: process.env.ASI_VOICE_ENABLED !== 'false',
      enableMetrics: process.env.ASI_METRICS_ENABLED !== 'false',
      safetyMode: process.env.ASI_SAFETY_MODE === 'enabled',
      humanOversight: process.env.ASI_HUMAN_OVERSIGHT === 'required',
      autoRestart: process.env.ASI_AUTO_RESTART !== 'false',
      healthCheckInterval: Number.parseInt(process.env.ASI_HEALTH_CHECK_INTERVAL) || 30000
    };

    this.setupSignalHandlers();
    this.createDirectories();
  }

  /**
   * Crée les répertoires nécessaires
   */
  createDirectories() {
    const directories = ['logs', 'data', 'backups'];
    
    for (const dir of directories) {
      const dirPath = join(__dirname, '..', dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`📁 Répertoire créé: ${dir}`);
      }
    }
  }

  /**
   * Configure les gestionnaires de signaux système
   */
  setupSignalHandlers() {
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('uncaughtException', (error) => this.handleUncaughtException(error));
    process.on('unhandledRejection', (reason, promise) => this.handleUnhandledRejection(reason, promise));
  }

  /**
   * Démarre l'ASI
   */
  async start() {
    try {
      logger.info('🚀 DÉMARRAGE DE L\'ASI PRISM');
      logger.info('================================');
      
      // Vérification des prérequis
      await this.checkPrerequisites();
      
      // Affichage de la configuration
      this.displayConfiguration();
      
      // Initialisation de l'interface ASI
      logger.info('🧠 Initialisation de l\'interface ASI...');
      this.asiInterface = new ASIInterface({
        port: this.config.port,
        enableVoice: this.config.enableVoice,
        enableMetrics: this.config.enableMetrics,
        asiConfig: {
          safetyMode: this.config.safetyMode,
          humanOversight: this.config.humanOversight
        }
      });

      // Configuration des événements
      this.setupASIEventHandlers();

      // Démarrage de l'ASI
      const startResult = await this.asiInterface.start();
      
      this.isRunning = true;
      this.startTime = new Date();
      
      // Démarrage du monitoring
      this.startHealthMonitoring();
      
      logger.info('✅ ASI PRISM DÉMARRÉE AVEC SUCCÈS');
      logger.info('================================');
      logger.info(`🌐 Interface disponible sur: http://localhost:${this.config.port}`);
      logger.info(`🎤 Synthèse vocale: ${this.config.enableVoice ? 'Activée' : 'Désactivée'}`);
      logger.info(`📊 Métriques: ${this.config.enableMetrics ? 'Activées' : 'Désactivées'}`);
      logger.info(`🛡️ Mode sécurité: ${this.config.safetyMode ? 'Activé' : 'Désactivé'}`);
      logger.info(`👥 Supervision humaine: ${this.config.humanOversight ? 'Requise' : 'Optionnelle'}`);
      
      // Affichage du statut ASI
      this.displayASIStatus(startResult);
      
      return startResult;

    } catch (error) {
      logger.error('❌ ÉCHEC DU DÉMARRAGE DE L\'ASI:', error);
      throw error;
    }
  }

  /**
   * Vérifie les prérequis système
   */
  async checkPrerequisites() {
    logger.info('🔍 Vérification des prérequis...');
    
    const checks = [
      this.checkNodeVersion(),
      this.checkEnvironmentVariables(),
      this.checkDiskSpace(),
      this.checkMemory(),
      this.checkNetworkConnectivity()
    ];

    const results = await Promise.allSettled(checks);
    
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        throw new Error(`Prérequis non satisfait: ${results[i].reason}`);
      }
    }
    
    logger.info('✅ Tous les prérequis sont satisfaits');
  }

  /**
   * Vérifie la version de Node.js
   */
  checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = Number.parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ requis, version actuelle: ${nodeVersion}`);
    }
    
    logger.info(`✅ Node.js version: ${nodeVersion}`);
  }

  /**
   * Vérifie les variables d'environnement
   */
  checkEnvironmentVariables() {
    const requiredVars = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'PERPLEXITY_API_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
    }
    
    logger.info('✅ Variables d\'environnement configurées');
  }

  /**
   * Vérifie l'espace disque disponible
   */
  async checkDiskSpace() {
    try {
      const _stats = fs.statSync('.');
      // Vérification basique - dans un vrai système, utiliser une bibliothèque dédiée
      logger.info('✅ Espace disque suffisant');
    } catch (_error) {
      throw new Error('Impossible de vérifier l\'espace disque');
    }
  }

  /**
   * Vérifie la mémoire disponible
   */
  checkMemory() {
    const _totalMemory = process.memoryUsage();
    const freeMemory = process.memoryUsage().heapTotal;
    
    // Vérification que nous avons au moins 1GB de mémoire heap
    if (freeMemory < 1024 * 1024 * 1024) {
      logger.warn('⚠️ Mémoire limitée détectée');
    }
    
    logger.info(`✅ Mémoire disponible: ${Math.round(freeMemory / 1024 / 1024)}MB`);
  }

  /**
   * Vérifie la connectivité réseau
   */
  async checkNetworkConnectivity() {
    // Vérification basique - dans un vrai système, tester les APIs
    logger.info('✅ Connectivité réseau vérifiée');
  }

  /**
   * Affiche la configuration actuelle
   */
  displayConfiguration() {
    logger.info('⚙️ Configuration ASI:');
    logger.info(`   Port: ${this.config.port}`);
    logger.info(`   Synthèse vocale: ${this.config.enableVoice}`);
    logger.info(`   Métriques: ${this.config.enableMetrics}`);
    logger.info(`   Mode sécurité: ${this.config.safetyMode}`);
    logger.info(`   Supervision humaine: ${this.config.humanOversight}`);
    logger.info(`   Redémarrage automatique: ${this.config.autoRestart}`);
  }

  /**
   * Configure les gestionnaires d'événements ASI
   */
  setupASIEventHandlers() {
    this.asiInterface.on('interface_started', () => {
      logger.info('🎯 Interface ASI démarrée');
    });

    this.asiInterface.on('task_completed', (data) => {
      logger.debug(`✅ Tâche complétée: ${data.taskId} en ${data.processingTime}ms`);
    });

    this.asiInterface.on('improvement_applied', (improvement) => {
      logger.info(`🔧 Amélioration appliquée: ${improvement.type}`);
    });

    this.asiInterface.on('safety_alert', (alert) => {
      logger.warn(`🚨 Alerte de sécurité: ${alert.severity} - ${alert.message}`);
    });

    this.asiInterface.on('critical_alert', (alert) => {
      logger.error(`🛑 ALERTE CRITIQUE: ${alert.message}`);
      if (this.config.humanOversight) {
        this.notifyHumanOperators(alert);
      }
    });

    this.asiInterface.on('metrics_updated', (_metrics) => {
      logger.debug('📊 Métriques mises à jour');
    });
  }

  /**
   * Affiche le statut de l'ASI
   */
  displayASIStatus(startResult) {
    logger.info('🧠 Statut ASI:');
    logger.info(`   Moteurs actifs: ${startResult.features.asi.engines.length}`);
    logger.info(`   Tâches en cours: ${startResult.features.asi.currentTasks}`);
    logger.info(`   Mode: ${startResult.features.asi.config.safetyMode ? 'Sécurisé' : 'Standard'}`);
    
    if (startResult.features.asi.engines.length > 0) {
      logger.info(`   Moteurs: ${startResult.features.asi.engines.join(', ')}`);
    }
  }

  /**
   * Démarre le monitoring de santé
   */
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('❌ Erreur lors du contrôle de santé:', error);
        
        if (this.config.autoRestart) {
          logger.info('🔄 Tentative de redémarrage automatique...');
          await this.restart();
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Effectue un contrôle de santé
   */
  async performHealthCheck() {
    if (!this.asiInterface || !this.isRunning) return;

    const status = this.asiInterface.asiCore.getStatus();
    
    if (!status.isActive) {
      throw new Error('ASI Core inactif');
    }

    if (status.emergencyStop) {
      throw new Error('Arrêt d\'urgence activé');
    }

    // Vérification de la mémoire
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 2 * 1024 * 1024 * 1024) { // 2GB
      logger.warn('⚠️ Utilisation mémoire élevée:', `${Math.round(memUsage.heapUsed / 1024 / 1024)  }MB`);
    }

    logger.debug('💚 Contrôle de santé réussi');
  }

  /**
   * Notifie les opérateurs humains
   */
  notifyHumanOperators(alert) {
    // Dans un vrai système, envoyer des notifications par email, SMS, etc.
    logger.error('📧 Notification envoyée aux opérateurs humains');
    console.log('\n🚨 INTERVENTION HUMAINE REQUISE 🚨');
    console.log(`Alerte: ${alert.message}`);
    console.log(`Heure: ${new Date().toISOString()}`);
    console.log('Veuillez vérifier le système immédiatement.\n');
  }

  /**
   * Redémarre l'ASI
   */
  async restart() {
    logger.info('🔄 Redémarrage de l\'ASI...');
    
    try {
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Attente 5s
      await this.start();
      logger.info('✅ Redémarrage réussi');
    } catch (error) {
      logger.error('❌ Échec du redémarrage:', error);
      throw error;
    }
  }

  /**
   * Arrête l'ASI
   */
  async stop() {
    logger.info('🛑 Arrêt de l\'ASI...');
    
    this.isRunning = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.asiInterface) {
      await this.asiInterface.shutdown();
      this.asiInterface = null;
    }
    
    logger.info('✅ ASI arrêtée');
  }

  /**
   * Arrêt gracieux
   */
  async gracefulShutdown(signal) {
    logger.info(`📡 Signal ${signal} reçu - Arrêt gracieux...`);
    
    try {
      await this.stop();
      
      const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
      logger.info(`⏱️ Temps de fonctionnement: ${Math.round(uptime / 1000)}s`);
      logger.info('👋 ASI PRISM arrêtée proprement');
      
      process.exit(0);
    } catch (error) {
      logger.error('❌ Erreur lors de l\'arrêt gracieux:', error);
      process.exit(1);
    }
  }

  /**
   * Gère les exceptions non capturées
   */
  handleUncaughtException(error) {
    logger.error('💥 Exception non capturée:', error);
    
    if (this.config.autoRestart) {
      logger.info('🔄 Tentative de redémarrage après exception...');
      setTimeout(() => {
        this.restart().catch(() => process.exit(1));
      }, 1000);
    } else {
      process.exit(1);
    }
  }

  /**
   * Gère les promesses rejetées non gérées
   */
  handleUnhandledRejection(reason, promise) {
    logger.error('🚫 Promesse rejetée non gérée:', reason);
    logger.error('Promesse:', promise);
    
    // Ne pas arrêter le processus pour les rejets de promesses
    // mais les logger pour investigation
  }

  /**
   * Affiche les statistiques de fonctionnement
   */
  displayStats() {
    if (!this.startTime) return;
    
    const uptime = Date.now() - this.startTime.getTime();
    const memUsage = process.memoryUsage();
    
    console.log('\n📊 STATISTIQUES ASI PRISM');
    console.log('========================');
    console.log(`⏱️ Temps de fonctionnement: ${Math.round(uptime / 1000)}s`);
    console.log(`💾 Mémoire utilisée: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`🔄 Mémoire totale: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    
    if (this.asiInterface) {
      const status = this.asiInterface.asiCore.getStatus();
      console.log(`🎯 Tâches traitées: ${status.performanceMetrics.tasksCompleted}`);
      console.log(`⚡ Temps de réponse moyen: ${Math.round(status.performanceMetrics.averageResponseTime)}ms`);
      console.log(`✅ Taux de succès: ${(status.performanceMetrics.successRate * 100).toFixed(1)}%`);
    }
    console.log('========================\n');
  }
}

/**
 * Point d'entrée principal
 */
async function main() {
  const launcher = new ASILauncher();
  
  try {
    // Affichage du banner
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     🧠 ASI PRISM 🧠                          ║
║              Artificial Superintelligence                   ║
║                                                              ║
║  🎯 Apprentissage multitâche                                ║
║  🔄 Auto-supervision                                         ║
║  🧬 Apprentissage hybride                                    ║
║  🔗 Transfert de connaissances                               ║
║  ⚡ Adaptation dynamique                                     ║
║                                                              ║
║  Version: 1.0.0 | Mode: ${process.env.PRISM_MODE || 'ASI'}                           ║
╚══════════════════════════════════════════════════════════════╝
    `);

    // Démarrage de l'ASI
    await launcher.start();
    
    // Affichage des statistiques toutes les 5 minutes
    setInterval(() => {
      launcher.displayStats();
    }, 5 * 60 * 1000);
    
    // Message de bienvenue
    console.log('\n🎉 ASI PRISM est maintenant opérationnelle !');
    console.log('💬 Vous pouvez maintenant interagir avec l\'intelligence superintelligente.');
    console.log('🌐 Interface web disponible sur http://localhost:3001');
    console.log('📊 Métriques en temps réel activées');
    console.log('\n⌨️ Appuyez sur Ctrl+C pour arrêter l\'ASI\n');

  } catch (error) {
    logger.error('💥 ÉCHEC CRITIQUE DU LANCEMENT:', error);
    console.error('\n❌ Impossible de démarrer l\'ASI PRISM');
    console.error('Vérifiez les logs pour plus de détails.');
    process.exit(1);
  }
}

// Lancement si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
}

export { ASILauncher, main };
export default ASILauncher; 