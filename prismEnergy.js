class PrismEnergy {
  #energyLevel = 100;
  #maxEnergy = 100;
  #minEnergy = 0;
  #recoveryRate = 5;
  #depletionRate = 2;
  #lastUpdate = Date.now();
  #emotionalLoad = 0;

  constructor() {
    this.#initializeEnergyCycle();
  }

  #initializeEnergyCycle() {
    setInterval(() => {
      const timeSinceLastUpdate = (Date.now() - this.#lastUpdate) / 1000;
      if (timeSinceLastUpdate > 60) { // Natural depletion after 1 minute of inactivity
        this.#energyLevel = Math.max(this.#minEnergy, this.#energyLevel - this.#depletionRate);
      }
    }, 60000);
  }

  updateEnergy(context) {
    const { emotionalIntensity = 0, interactionQuality = 0, isResting = false } = context;
    
    this.#emotionalLoad = Math.min(1, Math.max(0, emotionalIntensity));
    
    if (isResting) {
      this.#energyLevel = Math.min(this.#maxEnergy, this.#energyLevel + this.#recoveryRate);
    } else {
      const emotionalDrain = this.#emotionalLoad * this.#depletionRate;
      const interactionBoost = interactionQuality * this.#recoveryRate;
      this.#energyLevel = Math.min(
        this.#maxEnergy,
        Math.max(this.#minEnergy, this.#energyLevel - emotionalDrain + interactionBoost)
      );
    }
    
    this.#lastUpdate = Date.now();
    return this.#energyLevel;
  }

  getEnergyLevel() {
    return {
      current: this.#energyLevel,
      percentage: (this.#energyLevel / this.#maxEnergy) * 100,
      emotionalLoad: this.#emotionalLoad
    };
  }

  resetEnergy() {
    this.#energyLevel = this.#maxEnergy;
    this.#emotionalLoad = 0;
    this.#lastUpdate = Date.now();
    return this.#energyLevel;
  }
}

// Inline tests
const runTests = () => {
  const energy = new PrismEnergy();
  const testResults = [];

  // Test 1: Energy depletion under emotional stress
  energy.updateEnergy({ emotionalIntensity: 0.8, interactionQuality: 0 });
  const level1 = energy.getEnergyLevel();
  testResults.push({
    test: 'Emotional stress depletion',
    passed: level1.current < 100,
    value: level1.current
  });

  // Test 2: Energy recovery during rest
  energy.updateEnergy({ isResting: true });
  const level2 = energy.getEnergyLevel();
  testResults.push({
    test: 'Rest recovery',
    passed: level2.current > level1.current,
    value: level2.current
  });

  // Test 3: Energy reset
  energy.resetEnergy();
  const level3 = energy.getEnergyLevel();
  testResults.push({
    test: 'Reset functionality',
    passed: level3.current === 100,
    value: level3.current
  });

  console.table(testResults);
};

// Run tests in development environment
if (process.env.NODE_ENV === 'development') {
  runTests();
}

export default PrismEnergy; 