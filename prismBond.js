/**
 * PRISM Emotional Bond Engine
 * Tracks and manages the emotional connection between user and PRISM
 */

const BOND_THRESHOLDS = {
  DISTANT: -50,
  NEUTRAL: 0,
  CLOSE: 50,
  COMPANION: 100
};

const INTERACTION_WEIGHTS = {
  success: 10,
  error: -5,
  idle: -2,
  intentAccepted: 15,
  intentIgnored: -10
};

class PrismBond {
  constructor() {
    this.bondScore = 0;
    this.lastInteraction = Date.now();
    this.interactionHistory = [];
  }

  recordInteraction(type) {
    if (!Object.prototype.hasOwnProperty.call(INTERACTION_WEIGHTS, type)) {
      throw new Error(`Invalid interaction type: ${type}`);
    }

    const weight = INTERACTION_WEIGHTS[type];
    this.bondScore = Math.max(-100, Math.min(100, this.bondScore + weight));
    this.lastInteraction = Date.now();
    this.interactionHistory.push({ type, timestamp: this.lastInteraction, score: this.bondScore });
  }

  getBondLevel() {
    if (this.bondScore >= BOND_THRESHOLDS.COMPANION) return 'companion';
    if (this.bondScore >= BOND_THRESHOLDS.CLOSE) return 'close';
    if (this.bondScore >= BOND_THRESHOLDS.NEUTRAL) return 'neutral';
    return 'distant';
  }

  resetBond() {
    this.bondScore = 0;
    this.lastInteraction = Date.now();
    this.interactionHistory = [];
  }
}

// Lightweight inline tests
const runTests = () => {
  const bond = new PrismBond();
  
  // Test initial state
  console.assert(bond.getBondLevel() === 'neutral', 'Initial bond level should be neutral');
  
  // Test positive progression
  bond.recordInteraction('success');
  bond.recordInteraction('intentAccepted');
  console.assert(bond.getBondLevel() === 'close', 'Bond should progress to close');
  
  // Test negative progression
  bond.resetBond();
  bond.recordInteraction('error');
  bond.recordInteraction('intentIgnored');
  console.assert(bond.getBondLevel() === 'distant', 'Bond should regress to distant');
  
  // Test bounds
  bond.resetBond();
  for (let i = 0; i < 20; i++) bond.recordInteraction('success');
  console.assert(bond.getBondLevel() === 'companion', 'Bond should cap at companion');
  
  // Test reset
  bond.resetBond();
  console.assert(bond.getBondLevel() === 'neutral', 'Reset should return to neutral');
};

// Run tests in development
if (process.env.NODE_ENV === 'development') {
  runTests();
}

export default PrismBond; 