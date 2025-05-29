/**
 * PRISM Legacy System - Records significant user interactions and milestones
 * @module prismLegacy
 */

const LEGACY_STORAGE_KEY = 'prism_legacy_v1';
const MAX_LEGACY_ENTRIES = 100;

class PrismLegacy {
  constructor() {
    this.legacy = this.loadLegacy();
  }

  /**
   * Records a significant event in the legacy system
   * @param {string} type - Event type (success, failure, milestone)
   * @param {Object} details - Event details
   * @returns {boolean} Success status
   */
  recordEvent(type, details) {
    try {
      const event = {
        type,
        details,
        timestamp: Date.now(),
        id: crypto.randomUUID()
      };

      this.legacy.unshift(event);
      
      // Maintain maximum entries
      if (this.legacy.length > MAX_LEGACY_ENTRIES) {
        this.legacy = this.legacy.slice(0, MAX_LEGACY_ENTRIES);
      }

      this.saveLegacy();
      return true;
    } catch (error) {
      console.error('Failed to record legacy event:', error);
      return false;
    }
  }

  /**
   * Retrieves the complete legacy history
   * @returns {Array} Legacy entries
   */
  getLegacy() {
    return [...this.legacy];
  }

  /**
   * Clears all legacy entries
   * @returns {boolean} Success status
   */
  clearLegacy() {
    try {
      this.legacy = [];
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear legacy:', error);
      return false;
    }
  }

  /**
   * Loads legacy data from storage
   * @private
   * @returns {Array} Legacy entries
   */
  loadLegacy() {
    try {
      const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!stored) return [];
      
      const decoded = atob(stored);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to load legacy:', error);
      return [];
    }
  }

  /**
   * Saves legacy data to storage
   * @private
   * @returns {boolean} Success status
   */
  saveLegacy() {
    try {
      const encoded = btoa(JSON.stringify(this.legacy));
      localStorage.setItem(LEGACY_STORAGE_KEY, encoded);
      return true;
    } catch (error) {
      console.error('Failed to save legacy:', error);
      return false;
    }
  }
}

// Inline tests
const runTests = () => {
  const legacy = new PrismLegacy();
  const testResults = {
    record: false,
    retrieve: false,
    clear: false
  };

  // Test recording
  testResults.record = legacy.recordEvent('test', { message: 'Test event' });
  
  // Test retrieval
  const entries = legacy.getLegacy();
  testResults.retrieve = entries.length > 0 && entries[0].type === 'test';
  
  // Test clearing
  testResults.clear = legacy.clearLegacy();
  
  // Verify all tests passed
  const allTestsPassed = Object.values(testResults).every(result => result === true);
  console.log('Legacy system tests:', allTestsPassed ? 'PASSED' : 'FAILED', testResults);
};

// Run tests in development
if (process.env.NODE_ENV === 'development') {
  runTests();
}

export default PrismLegacy; 