// PRISM Awakening System
// Manages progressive module activation with natural boot phases

class PrismAwakening {
  #isAwakening = false;
  #currentPhase = 0;
  #phases = [
    { name: 'core', delay: 800, priority: 1 },
    { name: 'memory', delay: 1200, priority: 2 },
    { name: 'emotions', delay: 1600, priority: 3 },
    { name: 'intelligence', delay: 2000, priority: 4 }
  ];

  constructor() {
    this.#bindEvents();
  }

  #bindEvents() {
    window.addEventListener('prismAwakeningEvent', (event) => {
      console.debug(`Awakening phase: ${event.detail.phase}`);
    });
  }

  #emitEvent(phase, status) {
    const event = new CustomEvent('prismAwakeningEvent', {
      detail: { phase, status, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  #sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async #activatePhase(phase) {
    this.#emitEvent(phase.name, 'starting');
    await this.#sleep(phase.delay);
    this.#emitEvent(phase.name, 'complete');
  }

  async startAwakening() {
    if (this.#isAwakening) {
      console.warn('Awakening already in progress');
      return;
    }

    this.#isAwakening = true;
    this.#currentPhase = 0;

    try {
      for (const phase of this.#phases.sort((a, b) => a.priority - b.priority)) {
        if (!this.#isAwakening) break;
        await this.#activatePhase(phase);
        this.#currentPhase++;
      }
    } catch (error) {
      console.error('Awakening failed:', error);
      this.abortAwakening();
    }
  }

  abortAwakening() {
    if (!this.#isAwakening) return;
    
    this.#isAwakening = false;
    this.#emitEvent('abort', {
      phase: this.#phases[this.#currentPhase]?.name || 'unknown',
      timestamp: Date.now()
    });
  }
}

// Inline tests
if (import.meta.url === import.meta.main) {
  const awakening = new PrismAwakening();
  
  // Test sequencing
  console.log('Testing awakening sequence...');
  awakening.startAwakening().then(() => {
    console.log('Awakening sequence complete');
  });

  // Test abort
  setTimeout(() => {
    console.log('Testing abort...');
    awakening.abortAwakening();
  }, 3000);
}

export default PrismAwakening; 