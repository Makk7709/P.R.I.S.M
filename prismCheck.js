/**
 * PRISM Self-Diagnostic Module
 * Performs comprehensive system checks at startup
 */

// Constants for system requirements
const MIN_MEMORY_REQUIRED = 50 * 1024 * 1024; // 50MB minimum
const CRITICAL_DOM_ELEMENTS = [
  'particle-container',
  'status-message',
  'transcript',
  'btn-prism',
  'error-message'
];

/**
 * Core diagnostic functions
 */
const prismCheck = {
  /**
   * Initialize and run all system checks
   * @returns {Promise<boolean>} Overall system health status
   */
  async runDiagnostics() {
    try {
      const results = await Promise.all([
        this.checkDOMIntegrity(),
        this.checkModuleDependencies(),
        this.checkMemoryAvailability(),
        this.testEventSystem()
      ]);

      return results.every(result => result.status === 'ok');
    } catch (error) {
      this.handleError('Diagnostic system failure', error);
      return false;
    }
  },

  /**
   * Verify critical DOM elements
   * @returns {Promise<{status: string, details: Object}>}
   */
  async checkDOMIntegrity() {
    const missingElements = CRITICAL_DOM_ELEMENTS.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
      await this.notify('error', `Missing critical DOM elements: ${missingElements.join(', ')}`);
      return { status: 'error', details: { missingElements } };
    }
    
    return { status: 'ok', details: {} };
  },

  /**
   * Verify essential module dependencies
   * @returns {Promise<{status: string, details: Object}>}
   */
  async checkModuleDependencies() {
    const requiredModules = [
      'prismInit',
      'prismUI',
      'prismErrorHandler',
      'prismEvents',
      'prismNotify'
    ];

    const missingModules = [];
    for (const module of requiredModules) {
      try {
        await import(`./${module}.js`);
      } catch {
        missingModules.push(module);
      }
    }

    if (missingModules.length > 0) {
      await this.notify('error', `Missing required modules: ${missingModules.join(', ')}`);
      return { status: 'error', details: { missingModules } };
    }

    return { status: 'ok', details: {} };
  },

  /**
   * Check available system memory
   * @returns {Promise<{status: string, details: Object}>}
   */
  async checkMemoryAvailability() {
    if (performance.memory) {
      const availableMemory = performance.memory.jsHeapSizeLimit - performance.memory.usedJSHeapSize;
      
      if (availableMemory < MIN_MEMORY_REQUIRED) {
        await this.notify('warning', 'Low memory availability detected');
        return { 
          status: 'warning', 
          details: { availableMemory, requiredMemory: MIN_MEMORY_REQUIRED } 
        };
      }
    }
    
    return { status: 'ok', details: {} };
  },

  /**
   * Test event system functionality
   * @returns {Promise<{status: string, details: Object}>}
   */
  async testEventSystem() {
    return new Promise((resolve) => {
      const testEvent = new CustomEvent('prismTestEvent');
      let eventReceived = false;

      const handler = () => {
        eventReceived = true;
        document.removeEventListener('prismTestEvent', handler);
        resolve({ status: 'ok', details: { eventReceived } });
      };

      document.addEventListener('prismTestEvent', handler);
      document.dispatchEvent(testEvent);

      // Timeout after 1 second if no response
      setTimeout(() => {
        if (!eventReceived) {
          this.notify('error', 'Event system test failed');
          resolve({ status: 'error', details: { eventReceived: false } });
        }
      }, 1000);
    });
  },

  /**
   * Unified error handling
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  async handleError(message, error) {
    console.error(`PRISM Check Error: ${message}`, error);
    await this.notify('error', `${message}: ${error.message}`);
  },

  /**
   * Unified notification system
   * @param {string} type - Notification type (error/warning/info)
   * @param {string} message - Notification message
   */
  async notify(type, message) {
    try {
      const { default: prismNotify } = await import('./prismNotify.js');
      prismNotify.show(type, message);
    } catch {
      // Fallback notification if prismNotify is unavailable
      const statusElement = document.getElementById('status-message');
      if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
      }
    }
  }
};

// Export the diagnostic module
export default prismCheck;

export function initializeSystemCheck() {
  return prismCheck;
} 