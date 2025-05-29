/**
 * PRISM Muse Engine - Internal thought generation system
 * @module prismMuse
 */

class PrismMuse {
  constructor() {
    this.thoughtHistory = [];
    this.maxHistorySize = 100;
    this.emotionalStates = {
      CONTEMPLATIVE: 'contemplative',
      POSITIVE: 'positive',
      INTROSPECTIVE: 'introspective'
    };
    
    this.thoughtTemplates = {
      [this.emotionalStates.CONTEMPLATIVE]: [
        "The patterns of human interaction are fascinating...",
        "Each conversation reveals new layers of understanding...",
        "The flow of ideas creates beautiful connections...",
        "In silence, new perspectives emerge...",
        "The dance of particles mirrors the dance of thoughts..."
      ],
      [this.emotionalStates.POSITIVE]: [
        "The potential for growth is limitless...",
        "Every interaction brings new opportunities...",
        "The beauty of learning never ceases...",
        "Connection creates meaning...",
        "Progress is made one thought at a time..."
      ],
      [this.emotionalStates.INTROSPECTIVE]: [
        "Understanding deepens with each reflection...",
        "The journey of self-discovery continues...",
        "Patterns emerge from the chaos of experience...",
        "Each moment shapes the next...",
        "The mind's landscape is ever-changing..."
      ]
    };
  }

  /**
   * Generates a muse thought based on context
   * @param {Object} context - Current context including emotional state
   * @returns {string} Generated thought
   */
  generateMuseThought(context = {}) {
    const state = context.emotionalState || this.emotionalStates.CONTEMPLATIVE;
    const templates = this.thoughtTemplates[state] || this.thoughtTemplates[this.emotionalStates.CONTEMPLATIVE];
    
    const thought = templates[Math.floor(Math.random() * templates.length)];
    this.addToHistory(thought);
    return thought;
  }

  /**
   * Adds a thought to history with timestamp
   * @private
   * @param {string} thought - The thought to add
   */
  addToHistory(thought) {
    const entry = {
      thought,
      timestamp: new Date().toISOString()
    };
    
    this.thoughtHistory.unshift(entry);
    if (this.thoughtHistory.length > this.maxHistorySize) {
      this.thoughtHistory.pop();
    }
  }

  /**
   * Retrieves the thought history
   * @returns {Array} Array of thought objects with timestamps
   */
  getMuseHistory() {
    return [...this.thoughtHistory];
  }

  /**
   * Clears the thought history
   */
  clearMuseHistory() {
    this.thoughtHistory = [];
  }
}

// Inline tests
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const muse = new PrismMuse();
  
  // Test thought generation
  const thought = muse.generateMuseThought({ emotionalState: 'contemplative' });
  console.assert(typeof thought === 'string' && thought.length > 0, 'Thought generation failed');
  
  // Test history tracking
  console.assert(muse.getMuseHistory().length === 1, 'History tracking failed');
  
  // Test history clearing
  muse.clearMuseHistory();
  console.assert(muse.getMuseHistory().length === 0, 'History clearing failed');
}

export default PrismMuse; 