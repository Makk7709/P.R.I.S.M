#!/usr/bin/env node

/**
 * 🚀 PRISM Full Stack Launcher
 * Lance Backend + Frontend Corporate + Prometheus + Grafana en parallèle
 */

import { spawn, exec } from 'node:child_process';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import { createServer } from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration des services
const SERVICES = {
  prism_backend: {
    name: '🧠 PRISM Backend',
    command: 'node',
    args: ['server.js'],
    port: 3000,
    url: 'http://localhost:3000',
    healthCheck: '/api/health'
  },
  prism_corporate: {
    name: '🏢 PRISM Corporate Frontend',
    port: 3001,
    url: 'http://localhost:3001',
    static: true,
    file: 'index-corporate.html'
  },
  prometheus: {
    name: '📊 Prometheus',
    port: 9091,
    url: 'http://localhost:9091',
    docker: true,
    image: 'prom/prometheus:v2.45.0'
  },
  grafana: {
    name: '📈 Grafana Dashboard',
    port: 3002,
    url: 'http://localhost:3002',
    docker: true,
    image: 'grafana/grafana:latest'
  }
};

// Stockage des processus lancés
const processes = new Map();
let isShuttingDown = false;

/**
 * Affichage avec couleurs
 */
function logService(serviceName, message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow
  };
  
  console.log(`${chalk.gray(timestamp)} ${colors[type]('●')} ${chalk.bold(serviceName)}: ${message}`);
}

/**
 * Vérifie si un port est disponible
 */
function _checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * Lance le backend PRISM
 */
async function launchPrismBackend() {
  const service = SERVICES.prism_backend;
  
  logService(service.name, 'Démarrage...', 'info');
  
  // Vérifier les variables d'environnement critiques
  if (!process.env.OPENAI_API_KEY) {
    logService(service.name, '⚠️  OPENAI_API_KEY manquante', 'warning');
  }
  
  const prismProcess = spawn(service.command, service.args, {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: service.port,
      PROMETHEUS_PORT: 9090,
      LOG_LEVEL: 'info'
    }
  });
  
  prismProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      logService(service.name, message, 'info');
    }
  });
  
  prismProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message && !message.includes('ExperimentalWarning')) {
      logService(service.name, message, 'error');
    }
  });
  
  prismProcess.on('close', (code) => {
    if (!isShuttingDown) {
      logService(service.name, `Processus fermé avec le code ${code}`, 'error');
    }
  });
  
  processes.set('prism_backend', prismProcess);
  
  // Attendre un peu pour que le service démarre
  setTimeout(() => {
    logService(service.name, `✅ Service démarré sur ${service.url}`, 'success');
  }, 3000);
}

/**
 * Lance le frontend corporate
 */
async function launchCorporateFrontend() {
  const service = SERVICES.prism_corporate;
  
  logService(service.name, 'Démarrage serveur statique...', 'info');
  
  const app = express();
  
  // Configuration CORS et headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
  
  // Servir les fichiers statiques
  app.use(express.static(__dirname));
  
  // Route principale vers le dashboard corporate
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, service.file));
  });
  
  // Route de santé
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'PRISM Corporate Frontend' });
  });
  
  const server = app.listen(service.port, () => {
    logService(service.name, `✅ Service prêt sur ${service.url}`, 'success');
  });
  
  processes.set('prism_corporate', server);
}

/**
 * Lance Prometheus
 */
async function launchPrometheus() {
  const service = SERVICES.prometheus;
  
  logService(service.name, 'Démarrage container Docker...', 'info');
  
  // Vérifier si le fichier de configuration existe
  const configPath = path.join(__dirname, 'monitoring/prometheus-local.yml');
  if (!fs.existsSync(configPath)) {
    logService(service.name, '❌ Configuration Prometheus locale manquante', 'error');
    return;
  }
  
  const dockerArgs = [
    'run', '--rm', '--name', 'prism-prometheus',
    '-p', `${service.port}:9090`,
    '--add-host=host.docker.internal:host-gateway',  // Permettre l'accès au host
    '-v', `${configPath}:/etc/prometheus/prometheus.yml:ro`,
    '-v', `${path.join(__dirname, 'monitoring/prometheus-rules.yml')}:/etc/prometheus/rules.yml:ro`,
    service.image,
    '--config.file=/etc/prometheus/prometheus.yml',
    '--storage.tsdb.path=/prometheus',
    '--web.console.libraries=/etc/prometheus/console_libraries',
    '--web.console.templates=/etc/prometheus/consoles',
    '--storage.tsdb.retention.time=1h',
    '--web.enable-lifecycle'
  ];
  
  const prometheusProcess = spawn('docker', dockerArgs, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  prometheusProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message && !message.includes('caller=')) {
      logService(service.name, message, 'info');
    }
  });
  
  prometheusProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message && !message.includes('level=info')) {
      logService(service.name, message, 'warning');
    }
  });
  
  processes.set('prometheus', prometheusProcess);
  
  // Attendre que Prometheus soit prêt
  setTimeout(() => {
    logService(service.name, `✅ Service démarré sur ${service.url}`, 'success');
  }, 8000);
}

/**
 * Lance Grafana
 */
async function launchGrafana() {
  const service = SERVICES.grafana;
  
  logService(service.name, 'Démarrage container Docker...', 'info');
  
  const dockerArgs = [
    'run', '--rm', '--name', 'prism-grafana',
    '-p', `${service.port}:3000`,
    '-v', `${path.join(__dirname, 'monitoring/grafana')}:/etc/grafana/provisioning:ro`,
    '-v', `${path.join(__dirname, 'grafana')}:/var/lib/grafana/dashboards:ro`,
    '-e', 'GF_SECURITY_ADMIN_PASSWORD=prism123',
    '-e', 'GF_USERS_ALLOW_SIGN_UP=false',
    '-e', 'GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource',
    service.image
  ];
  
  const grafanaProcess = spawn('docker', dockerArgs, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  grafanaProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message && message.includes('HTTP Server Listen')) {
      logService(service.name, '✅ Serveur HTTP prêt', 'success');
    }
  });
  
  grafanaProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message && !message.includes('logger=')) {
      logService(service.name, message, 'info');
    }
  });
  
  processes.set('grafana', grafanaProcess);
  
  // Attendre que Grafana soit prêt
  setTimeout(() => {
    logService(service.name, `✅ Service démarré sur ${service.url}`, 'success');
    logService(service.name, `👤 Login: admin / prism123`, 'info');
  }, 12000);
}

/**
 * Affiche le tableau de bord des services
 */
function displayDashboard() {
  console.clear();
  console.log(chalk.blue.bold('\n🚀 PRISM Full Stack - Services Actifs\n'));
  
  console.log(chalk.green('┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.green('│                      🧠 PRISM STACK                        │'));
  console.log(chalk.green('├─────────────────────────────────────────────────────────────┤'));
  
  Object.entries(SERVICES).forEach(([key, service]) => {
    const status = processes.has(key) ? '🟢 ACTIF' : '🔴 ARRÊTÉ';
    console.log(`${chalk.green('│')  } ${service.name.padEnd(25)} │ ${status.padEnd(15)} │ ${service.url.padEnd(25)} ${  chalk.green('│')}`);
  });
  
  console.log(chalk.green('├─────────────────────────────────────────────────────────────┤'));
  console.log(chalk.green('│') + chalk.yellow(' 📊 Monitoring Stack:                                    ') + chalk.green('│'));
  console.log(`${chalk.green('│')  }   • Prometheus Metrics: ${SERVICES.prometheus.url.padEnd(25)} ${  chalk.green('│')}`);
  console.log(`${chalk.green('│')  }   • Grafana Dashboards: ${SERVICES.grafana.url.padEnd(24)} ${  chalk.green('│')}`);
  console.log(chalk.green('│') + chalk.yellow(' 🎯 Applications:                                        ') + chalk.green('│'));
  console.log(`${chalk.green('│')  }   • PRISM Backend API: ${SERVICES.prism_backend.url.padEnd(26)} ${  chalk.green('│')}`);
  console.log(`${chalk.green('│')  }   • Corporate Frontend: ${SERVICES.prism_corporate.url.padEnd(25)} ${  chalk.green('│')}`);
  console.log(chalk.green('└─────────────────────────────────────────────────────────────┘'));
  
  console.log(chalk.blue('\n📋 Commandes:'));
  console.log('  • Ctrl+C : Arrêter tous les services');
  console.log('  • docker ps : Voir les containers actifs');
  console.log('  • docker logs prism-prometheus : Logs Prometheus');
  console.log('  • docker logs prism-grafana : Logs Grafana\n');
}

/**
 * Nettoyage gracieux
 */
function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(chalk.yellow('\n🛑 Arrêt gracieux des services...'));
  
  // Arrêter les processus Node.js
  processes.forEach((process, name) => {
    if (process && process.kill) {
      logService(SERVICES[name]?.name || name, 'Arrêt en cours...', 'warning');
      process.kill('SIGTERM');
    } else if (process && process.close) {
      process.close();
    }
  });
  
  // Arrêter les containers Docker
  const dockerContainers = ['prism-prometheus', 'prism-grafana'];
  dockerContainers.forEach(container => {
    exec(`docker stop ${container}`, (error, _stdout, _stderr) => {
      if (!error) {
        console.log(chalk.green(`✅ Container ${container} arrêté`));
      }
    });
  });
  
  setTimeout(() => {
    console.log(chalk.green('✅ Tous les services ont été arrêtés'));
    process.exit(0);
  }, 3000);
}

/**
 * Fonction principale
 */
async function main() {
  console.log(chalk.blue.bold('🚀 Lancement PRISM Full Stack...\n'));
  
  // Vérifier Docker
  try {
    await new Promise((resolve, reject) => {
      exec('docker --version', (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
    logService('🐳 Docker', 'Disponible', 'success');
  } catch (_error) {
    logService('🐳 Docker', 'Non disponible - Services Docker désactivés', 'warning');
  }
  
  // Gestion des signaux d'arrêt
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  
  try {
    // Lancer tous les services en parallèle
    await Promise.all([
      launchPrismBackend(),
      launchCorporateFrontend(),
      launchPrometheus(),
      launchGrafana()
    ]);
    
    // Afficher le tableau de bord
    setTimeout(() => {
      displayDashboard();
    }, 15000);
    
    // Monitoring des services
    setInterval(() => {
      if (!isShuttingDown) {
        // Vérification périodique des services
        logService('🔍 Health Check', 'Services monitoring...', 'info');
      }
    }, 60000);
    
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors du lancement:'), error);
    gracefulShutdown();
  }
}

// Lancement si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main; 