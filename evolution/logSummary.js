const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3
};

class LogSummary {
    constructor() {
        this.cycles = [];
        this.logLevel = LOG_LEVELS.INFO;
    }

    setLogLevel(level) {
        if (!Object.prototype.hasOwnProperty.call(LOG_LEVELS, level)) {
            throw new Error(`Invalid log level: ${level}`);
        }
        this.logLevel = LOG_LEVELS[level];
    }

    shouldLog(level) {
        return LOG_LEVELS[level] >= this.logLevel;
    }

    logCycle(cycleData) {
        const cycle = {
            timestamp: new Date().toISOString(),
            ...cycleData,
            duration: cycleData.duration || 0
        };

        if (this.shouldLog('DEBUG')) {
            console.debug('[DEBUG] Cycle details:', JSON.stringify(cycle, null, 2));
        }

        if (this.shouldLog('INFO')) {
            console.info('[INFO] New cycle logged:', {
                prompt: cycle.prompt.text,
                response: cycle.response.text,
                validation: cycle.validation.isValid,
                quality: cycle.quality.passed
            });
        }

        this.cycles.push(cycle);
    }

    logError(error, context = {}) {
        if (this.shouldLog('ERROR')) {
            console.error('[ERROR]', {
                message: error.message,
                stack: error.stack,
                context
            });
        }
    }

    logWarning(message, context = {}) {
        if (this.shouldLog('WARNING')) {
            console.warn('[WARNING]', {
                message,
                context
            });
        }
    }

    getSummary() {
        return {
            totalCycles: this.cycles.length,
            cycles: this.cycles,
            lastCycle: this.cycles[this.cycles.length - 1],
            logLevel: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.logLevel)
        };
    }

    clear() {
        this.cycles = [];
    }

    // Méthodes utilitaires pour les types de logs courants
    logPrompt(prompt) {
        if (this.shouldLog('INFO')) {
            console.info('[INFO] Prompt sent to model:', {
                text: prompt.text,
                context: prompt.context,
                timestamp: prompt.timestamp
            });
        }
    }

    logModelResponse(model, response) {
        if (this.shouldLog('INFO')) {
            console.info('[INFO] Response from model:', {
                model,
                text: response.text,
                confidence: response.confidence,
                timestamp: response.timestamp
            });
        }
    }

    logValidation(type, result) {
        if (this.shouldLog('INFO')) {
            console.info('[INFO] Validation result:', {
                type,
                isValid: result.isValid,
                details: result.details
            });
        }
    }
}

module.exports = { LogSummary, LOG_LEVELS }; 