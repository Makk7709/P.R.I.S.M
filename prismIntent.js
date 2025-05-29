// PRISM Intent Generation System
// Lightweight proactive intent engine for contextual suggestions

class PrismIntent {
  constructor() {
    this.lastIntent = null;
    this.intentHistory = [];
    this.maxHistorySize = 5;
  }

  analyzeAndSuggest(context) {
    const { prismTone, prismMemory, prismThink } = context;
    
    // Validate context
    if (!this._validateContext(context)) {
      return null;
    }

    // Analyze emotional state from tone
    const emotionalState = this._analyzeEmotionalState(prismTone);
    
    // Consider memory context
    const memoryContext = this._analyzeMemoryContext(prismMemory);
    
    // Process thought patterns
    const thoughtPattern = this._analyzeThoughtPattern(prismThink);

    // Generate appropriate intent
    const intent = this._generateIntent(emotionalState, memoryContext, thoughtPattern);
    
    if (intent) {
      this.lastIntent = intent;
      this._updateHistory(intent);
    }

    return intent;
  }

  getLastIntent() {
    return this.lastIntent;
  }

  clearIntent() {
    this.lastIntent = null;
    return true;
  }

  _validateContext(context) {
    return context && 
           typeof context === 'object' && 
           'prismTone' in context && 
           'prismMemory' in context && 
           'prismThink' in context;
  }

  _analyzeEmotionalState(tone) {
    if (!tone) return 'neutral';
    
    const emotionalIndicators = {
      positive: ['happy', 'excited', 'calm'],
      negative: ['sad', 'angry', 'anxious'],
      neutral: ['neutral', 'contemplative']
    };

    for (const [state, indicators] of Object.entries(emotionalIndicators)) {
      if (indicators.some(indicator => tone.toLowerCase().includes(indicator))) {
        return state;
      }
    }
    
    return 'neutral';
  }

  _analyzeMemoryContext(memory) {
    if (!memory) return 'neutral';
    
    // Simple memory context analysis
    const recentInteractions = memory.recent || [];
    const interactionCount = recentInteractions.length;
    
    if (interactionCount === 0) return 'new';
    if (interactionCount > 3) return 'familiar';
    return 'developing';
  }

  _analyzeThoughtPattern(think) {
    if (!think) return 'neutral';
    
    const patterns = {
      analytical: ['analyze', 'consider', 'think'],
      creative: ['imagine', 'create', 'explore'],
      practical: ['solve', 'implement', 'build']
    };

    for (const [pattern, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => think.toLowerCase().includes(keyword))) {
        return pattern;
      }
    }
    
    return 'neutral';
  }

  _generateIntent(emotionalState, memoryContext, thoughtPattern) {
    const intentTemplates = {
      positive: {
        analytical: {
          type: 'suggest_analysis',
          message: 'Would you like to explore this topic further?'
        },
        creative: {
          type: 'suggest_creation',
          message: 'Shall we build upon this idea?'
        },
        practical: {
          type: 'suggest_action',
          message: 'Ready to implement this solution?'
        }
      },
      negative: {
        analytical: {
          type: 'suggest_reflection',
          message: 'Would you like to discuss this further?'
        },
        creative: {
          type: 'suggest_alternative',
          message: 'Shall we explore a different approach?'
        },
        practical: {
          type: 'suggest_support',
          message: 'How can I help you with this?'
        }
      },
      neutral: {
        analytical: {
          type: 'suggest_exploration',
          message: 'Would you like to learn more about this?'
        },
        creative: {
          type: 'suggest_ideation',
          message: 'Shall we brainstorm some ideas?'
        },
        practical: {
          type: 'suggest_next_steps',
          message: 'What would you like to do next?'
        }
      }
    };

    return intentTemplates[emotionalState]?.[thoughtPattern] || null;
  }

  _updateHistory(intent) {
    this.intentHistory.unshift(intent);
    if (this.intentHistory.length > this.maxHistorySize) {
      this.intentHistory.pop();
    }
  }
}

// Lightweight inline tests
const runTests = () => {
  const intent = new PrismIntent();
  
  // Test 1: Basic context validation
  const validContext = {
    prismTone: 'happy',
    prismMemory: { recent: [] },
    prismThink: 'analyze'
  };
  
  const result1 = intent.analyzeAndSuggest(validContext);
  console.assert(result1 !== null, 'Should return intent for valid context');
  
  // Test 2: Intent history
  intent.analyzeAndSuggest(validContext);
  console.assert(intent.intentHistory.length === 2, 'Should maintain intent history');
  
  // Test 3: Clear intent
  intent.clearIntent();
  console.assert(intent.getLastIntent() === null, 'Should clear last intent');
};

// Run tests in development
if (process.env.NODE_ENV === 'development') {
  runTests();
}

export default PrismIntent; 