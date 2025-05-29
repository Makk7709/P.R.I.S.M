/**
 * @fileoverview Module de logging structuré pour PRISM
 * @module prismLogger
 */

import prismBus from '../prismBus.js';

const BASE_URL = process.env.PRISM_LOG_SERVER_URL || 'http://localhost:3000';

class PrismLogger {
  constructor() {
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      CRITICAL: 4
    };
    
    this.currentLevel = this.logLevels.INFO;
    this.logBuffer = [];
    this.maxBufferSize = 1000;
    this.flushInterval = 5000; // 5 seconds
    
    // Initialize logging
    this.initialize();
  }

  initialize() {
    // Set up periodic buffer flush
    setInterval(() => this.flushBuffer(), this.flushInterval);
    
    // Set up error handling uniquement si window existe (navigateur)
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleError.bind(this));
      window.addEventListener('unhandledrejection', this.handlePromiseError.bind(this));
    }
  }

  setLogLevel(level) {
    if (this.logLevels[level] !== undefined) {
      this.currentLevel = this.logLevels[level];
      this.info(`Log level set to ${level}`);
    }
  }

  debug(message, data = {}) {
    this.log('DEBUG', message, data);
  }

  info(message, data = {}) {
    this.log('INFO', message, data);
  }

  warn(message, data = {}) {
    this.log('WARN', message, data);
  }

  error(message, data = {}) {
    this.log('ERROR', message, data);
  }

  critical(message, data = {}) {
    this.log('CRITICAL', message, data);
  }

  log(level, message, data) {
    if (this.logLevels[level] < this.currentLevel) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    // Add to buffer
    this.logBuffer.push(logEntry);
    
    // Console output
    this.consoleLog(level, message, data);
    
    // Check buffer size
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flushBuffer();
    }
  }

  consoleLog(level, message, data) {
    const styles = {
      DEBUG: 'color: #6c757d',
      INFO: 'color: #0d6efd',
      WARN: 'color: #ffc107',
      ERROR: 'color: #dc3545',
      CRITICAL: 'color: #dc3545; font-weight: bold'
    };

    if (typeof window !== 'undefined') {
      // Navigateur : styles CSS
      console.log(
        `%c[PRISM ${level}] ${message}`,
        styles[level],
        data
      );
    } else {
      // Node.js : pas de styles
      console.log(`[PRISM ${level}] ${message}`, data);
    }
  }

  flushBuffer() {
    if (this.logBuffer.length === 0) return;
    
    // Send logs to server
    this.sendLogsToServer(this.logBuffer);
    
    // Clear buffer
    this.logBuffer = [];
  }

  async sendLogsToServer(logs) {
    try {
      const response = await fetch(`${BASE_URL}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logs)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send logs: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to server:', error);
    }
  }

  handleError(error) {
    this.error('Unhandled error', {
      message: error.message,
      stack: error.stack,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno
    });
  }

  handlePromiseError(event) {
    this.error('Unhandled promise rejection', {
      reason: event.reason
    });
  }

  logRecovery(action, result) {
    this.info('Recovery action executed', {
      action,
      result,
      timestamp: Date.now()
    });
  }

  logAdjustment(component, adjustment) {
    this.info('System adjustment applied', {
      component,
      adjustment,
      timestamp: Date.now()
    });
  }

  logCircuitBreaker(event) {
    this.info('Circuit breaker state changed', {
      ...event,
      timestamp: Date.now()
    });
  }

  logLoadBalancer(event) {
    this.info('Load balancer event', {
      ...event,
      timestamp: Date.now()
    });
  }

  getLogs(level = null, startTime = null, endTime = null) {
    let filteredLogs = [...this.logBuffer];

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startTime);
    }

    if (endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endTime);
    }

    return filteredLogs;
  }

  clearLogs() {
    this.logBuffer = [];
  }

  getStats() {
    const stats = {
      total: this.logBuffer.length,
      byLevel: {},
      lastLog: this.logBuffer[this.logBuffer.length - 1] || null
    };

    for (const level in this.logLevels) {
      stats.byLevel[level] = this.logBuffer.filter(log => log.level === level).length;
    }

    return stats;
  }
}

export default new PrismLogger(); 