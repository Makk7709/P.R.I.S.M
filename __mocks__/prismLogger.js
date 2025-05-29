class PrismLogger {
  constructor() {
    this.logs = [];
    this.logLevel = 'info';
  }

  log(level, message, ...args) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      args
    });
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  setLogLevel(level) {
    this.logLevel = level;
  }
}

export default PrismLogger; 