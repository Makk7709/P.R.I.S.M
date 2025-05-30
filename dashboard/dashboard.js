import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/dashboard.log' }),
    new winston.transports.Console()
  ]
});

class Dashboard {
  constructor(config = {}) {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server);
    this.config = config;
    this.metrics = {
      prompts: [],
      models: {},
      qualityScores: {},
      executionTimes: [],
      alerts: []
    };
    
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupRoutes() {
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    this.app.get('/api/metrics', (req, res) => {
      res.json(this.metrics);
    });
    
    this.app.get('/api/provider-metrics', (req, res) => {
      res.json({
        providers: this.config.providers || {},
        status: 'operational'
      });
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      logger.info('Client connected to dashboard');
      
      socket.on('disconnect', () => {
        logger.info('Client disconnected from dashboard');
      });
    });
  }

  updateMetrics(data) {
    // Update prompts history
    this.metrics.prompts.push({
      timestamp: new Date(),
      taskType: data.taskType,
      provider: data.provider
    });
    
    // Update model usage
    if (!this.metrics.models[data.provider]) {
      this.metrics.models[data.provider] = 0;
    }
    this.metrics.models[data.provider]++;
    
    // Update execution times
    this.metrics.executionTimes.push({
      timestamp: new Date(),
      provider: data.provider,
      duration: data.responseTime
    });
    
    // Calculate quality score (example implementation)
    const qualityScore = this.calculateQualityScore(data);
    if (!this.metrics.qualityScores[data.provider]) {
      this.metrics.qualityScores[data.provider] = [];
    }
    this.metrics.qualityScores[data.provider].push(qualityScore);
    
    // Check for alerts
    this.checkAlerts(data);
    
    // Keep only last 1000 entries for each metric
    this.trimMetrics();
  }

  calculateQualityScore(data) {
    // Example quality score calculation
    const baseScore = 100;
    const responseTimePenalty = Math.min(data.responseTime / 1000, 10); // Penalty for slow responses
    const successBonus = data.success ? 10 : -20;
    
    return baseScore - responseTimePenalty + successBonus;
  }

  checkAlerts(data) {
    // Example alert conditions
    if (data.responseTime > 5000) {
      this.metrics.alerts.push({
        timestamp: new Date(),
        type: 'performance',
        message: `Slow response from ${data.provider}: ${data.responseTime}ms`,
        severity: 'warning'
      });
    }
    
    if (!data.success) {
      this.metrics.alerts.push({
        timestamp: new Date(),
        type: 'error',
        message: `Failed response from ${data.provider}`,
        severity: 'error'
      });
    }
  }

  trimMetrics() {
    const maxEntries = 1000;
    
    if (this.metrics.prompts.length > maxEntries) {
      this.metrics.prompts = this.metrics.prompts.slice(-maxEntries);
    }
    
    if (this.metrics.executionTimes.length > maxEntries) {
      this.metrics.executionTimes = this.metrics.executionTimes.slice(-maxEntries);
    }
    
    for (const provider in this.metrics.qualityScores) {
      if (this.metrics.qualityScores[provider].length > maxEntries) {
        this.metrics.qualityScores[provider] = this.metrics.qualityScores[provider].slice(-maxEntries);
      }
    }
    
    if (this.metrics.alerts.length > maxEntries) {
      this.metrics.alerts = this.metrics.alerts.slice(-maxEntries);
    }
  }

  start(port = 3000) {
    this.server.listen(port, () => {
      logger.info(`Dashboard server running on port ${port}`);
    });
  }
}

export default Dashboard; 