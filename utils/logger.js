// Simple logger utility with different log levels
class Logger {
    constructor() {
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        // Default to INFO level
        this.currentLevel = this.levels.INFO;
    }

    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.currentLevel = this.levels[level];
        }
    }

    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : arg
        ).join(' ');
        return `[${timestamp}] ${level}: ${message} ${formattedArgs}`.trim();
    }

    error(message, ...args) {
        if (this.currentLevel >= this.levels.ERROR) {
            console.error(this.formatMessage('ERROR', message, ...args));
        }
    }

    warn(message, ...args) {
        if (this.currentLevel >= this.levels.WARN) {
            console.warn(this.formatMessage('WARN', message, ...args));
        }
    }

    info(message, ...args) {
        if (this.currentLevel >= this.levels.INFO) {
            console.info(this.formatMessage('INFO', message, ...args));
        }
    }

    debug(message, ...args) {
        if (this.currentLevel >= this.levels.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message, ...args));
        }
    }
}

// Create and export a singleton instance
const logger = new Logger();

// Export both the class and the singleton instance
export { Logger, logger as default }; 