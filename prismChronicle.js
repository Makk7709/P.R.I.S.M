/**
 * PRISM Chronicle Engine
 * Manages autobiographical memory and milestone tracking for PRISM
 */

class PrismChronicle {
  constructor() {
    this.chronicle = new Map();
    this.initializeStorage();
  }

  initializeStorage() {
    try {
      const stored = localStorage.getItem('prismChronicle');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.chronicle = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to initialize chronicle storage:', error);
    }
  }

  persistChronicle() {
    try {
      const serialized = JSON.stringify(Object.fromEntries(this.chronicle));
      localStorage.setItem('prismChronicle', serialized);
    } catch (error) {
      console.warn('Failed to persist chronicle:', error);
    }
  }

  recordMilestone(event) {
    if (!event || typeof event !== 'object') {
      throw new Error('Invalid milestone event');
    }

    const milestone = {
      timestamp: new Date().toISOString(),
      context: event.context || 'unspecified',
      significance: event.significance || 'neutral',
      details: event.details || {},
      emotionalImpact: event.emotionalImpact || 0,
      ...event
    };

    const id = crypto.randomUUID();
    this.chronicle.set(id, milestone);
    this.persistChronicle();
    return id;
  }

  getChronicle(options = {}) {
    const { 
      startDate, 
      endDate, 
      significance, 
      context 
    } = options;

    let filtered = Array.from(this.chronicle.entries());

    if (startDate) {
      filtered = filtered.filter(([_, m]) => new Date(m.timestamp) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter(([_, m]) => new Date(m.timestamp) <= new Date(endDate));
    }

    if (significance) {
      filtered = filtered.filter(([_, m]) => m.significance === significance);
    }

    if (context) {
      filtered = filtered.filter(([_, m]) => m.context === context);
    }

    return Object.fromEntries(filtered);
  }

  clearChronicle() {
    this.chronicle.clear();
    localStorage.removeItem('prismChronicle');
  }
}

// Inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const testChronicle = new PrismChronicle();
  
  // Test milestone recording
  const milestoneId = testChronicle.recordMilestone({
    context: 'test',
    significance: 'high',
    details: { test: true }
  });
  
  const chronicle = testChronicle.getChronicle();
  console.assert(
    chronicle[milestoneId]?.context === 'test',
    'Milestone recording failed'
  );
  
  // Test clearing
  testChronicle.clearChronicle();
  console.assert(
    Object.keys(testChronicle.getChronicle()).length === 0,
    'Chronicle clearing failed'
  );
}

export default PrismChronicle; 