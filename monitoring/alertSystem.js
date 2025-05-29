const axios = require('axios');
const LogSummary = require('../evolution/logSummary');

class AlertSystem {
  constructor(config = {}) {
    this.config = {
      webhookUrl: config.webhookUrl || process.env.ALERT_WEBHOOK_URL,
      alertThreshold: config.alertThreshold || 0.8,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
    this.logger = new LogSummary();
  }

  async sendAlert(alert) {
    const alertData = {
      timestamp: new Date().toISOString(),
      level: alert.level || 'WARNING',
      message: alert.message,
      context: alert.context || {},
      source: alert.source || 'PRISM'
    };

    try {
      await this._sendWithRetry(alertData);
      this.logger.addLogEntry({
        type: 'ALERT_SENT',
        message: `Alert sent successfully: ${alert.message}`,
        data: alertData
      });
    } catch (error) {
      this.logger.addLogEntry({
        type: 'ALERT_ERROR',
        message: `Failed to send alert: ${error.message}`,
        data: { error, alertData }
      });
    }
  }

  async _sendWithRetry(alertData, attempt = 1) {
    try {
      await axios.post(this.config.webhookUrl, alertData);
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this._sendWithRetry(alertData, attempt + 1);
      }
      throw error;
    }
  }

  // Méthodes utilitaires pour les types d'alertes courants
  async alertCriticalError(error, context = {}) {
    await this.sendAlert({
      level: 'CRITICAL',
      message: `Critical error detected: ${error.message}`,
      context: { error, ...context }
    });
  }

  async alertPerformanceIssue(metric, threshold, value) {
    if (value > threshold) {
      await this.sendAlert({
        level: 'WARNING',
        message: `Performance issue detected: ${metric} exceeded threshold`,
        context: { metric, threshold, value }
      });
    }
  }

  async alertQualityDegradation(qualityScore, threshold) {
    if (qualityScore < threshold) {
      await this.sendAlert({
        level: 'WARNING',
        message: 'Quality degradation detected',
        context: { qualityScore, threshold }
      });
    }
  }
}

module.exports = AlertSystem; 