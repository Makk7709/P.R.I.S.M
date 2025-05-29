// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// PRISM Observer - Internal Monitoring Dashboard
class PrismObserver {
  constructor() {
    this.container = null;
    this.metrics = {
      failsafeEvents: 0,
      retryCount: 0,
      uiStateUpdates: 0
    };
    if (isBrowser) {
      this.init();
    }
  }

  init() {
    if (!isBrowser) return;
    
    this.container = document.createElement('div');
    this.container.id = 'prism-observer';
    this.container.className = 'fixed bottom-4 left-4 z-50';
    document.body.appendChild(this.container);

    // Create dashboard container
    this.container = document.createElement('div');
    this.container.className = 'fixed top-4 right-4 z-50 bg-black/90 text-green-400 p-4 rounded-lg shadow-lg font-orbitron text-sm transform transition-transform duration-300 translate-x-full';
    this.container.style.width = '300px';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-label', 'PRISM Monitoring Dashboard');
    
    // Create content structure
    this.container.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-lg font-bold">PRISM Observer</h2>
        <button class="text-green-400 hover:text-green-300" id="closeObserver">×</button>
      </div>
      <div class="space-y-2">
        <div class="flex justify-between">
          <span>UI State:</span>
          <span id="uiState">${this.metrics.uiState}</span>
        </div>
        <div class="flex justify-between">
          <span>Retry Count:</span>
          <span id="retryCount">${this.metrics.retryCount}</span>
        </div>
        <div class="flex justify-between">
          <span>Last Failsafe:</span>
          <span id="lastFailsafe">${this.metrics.lastFailsafeEvent || 'None'}</span>
        </div>
        <div class="flex justify-between">
          <span>Uptime:</span>
          <span id="uptime">0m</span>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.startMetricsUpdate();
  }

  setupEventListeners() {
    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.toggleVisibility();
      }
    });

    // Close button
    document.getElementById('closeObserver').addEventListener('click', () => {
      this.toggleVisibility();
    });
  }

  toggleVisibility() {
    this.metrics.isVisible = !this.metrics.isVisible;
    this.container.style.transform = this.metrics.isVisible 
      ? 'translateX(0)' 
      : 'translateX(100%)';
  }

  updateMetrics(newMetrics) {
    Object.assign(this.metrics, newMetrics);
    this.updateDisplay();
  }

  updateDisplay() {
    if (!this.metrics.isVisible) return;

    document.getElementById('uiState').textContent = this.metrics.uiState;
    document.getElementById('retryCount').textContent = this.metrics.retryCount;
    document.getElementById('lastFailsafe').textContent = 
      this.metrics.lastFailsafeEvent || 'None';
  }

  startMetricsUpdate() {
    setInterval(() => {
      const uptimeMinutes = Math.floor((Date.now() - this.metrics.lastHardReload) / 60000);
      document.getElementById('uptime').textContent = `${uptimeMinutes}m`;
    }, 1000);
  }
}

// Export singleton instance
export const prismObserver = new PrismObserver();

// Export utility functions for external use
export const updatePrismMetrics = (metrics) => {
  prismObserver.updateMetrics(metrics);
};

export const logFailsafeEvent = (event) => {
  prismObserver.updateMetrics({
    lastFailsafeEvent: `${event} (${new Date().toLocaleTimeString()})`
  });
};

export const incrementRetryCount = () => {
  prismObserver.updateMetrics({
    retryCount: prismObserver.metrics.retryCount + 1
  });
};

export const updateUIState = (state) => {
  prismObserver.updateMetrics({
    uiState: state
  });
}; 