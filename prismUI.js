// PRISM UI System - Core UI Management Module
export class PrismUI {
  constructor() {
    this.uiState = {
      current: 'idle',
      previous: null,
      timestamp: Date.now()
    };
    this.themeColors = {
      idle: {
        primary: '#3B82F6',
        accent: '#60A5FA',
        bg: '#F3F4F6',
        text: '#1F2937'
      },
      loading: {
        primary: '#F59E0B',
        accent: '#FBBF24',
        bg: '#FFFBEB',
        text: '#92400E'
      },
      error: {
        primary: '#DC2626',
        accent: '#EF4444',
        bg: '#FEF2F2',
        text: '#991B1B'
      },
      success: {
        primary: '#059669',
        accent: '#34D399',
        bg: '#ECFDF5',
        text: '#065F46'
      }
    };
    this.audioContext = null;
    this.errorTracker = {
      errors: [],
      lastErrorTime: 0
    };
    this.loadingTimer = null;
    this.diagnosticConsole = {
      isVisible: false,
      element: null,
      retryMetrics: null
    };
    this.auroraContainer = null;
    this.auroraCanvas = null;
    this.auroraContext = null;
    this.auroraAnimationFrame = null;
    this.init();
  }

  init() {
    this.setupTheme();
    this.setupFluidTypography();
    this.setupAnimations();
    this.setupResponsiveLayout();
    this.setupAccessibility();
    this.setupAudioContext();
    this.setupDiagnosticConsole();
    this.setupAuroraVisualization();
  }

  setupTheme() {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = (isDark) => {
      root.classList.toggle('dark', isDark);
      this.applyStateTheme(this.uiState.current, isDark);
    };

    // Initial theme setup
    updateTheme(prefersDark.matches);

    // Theme change listener
    prefersDark.addEventListener('change', (e) => updateTheme(e.matches));
  }

  applyStateTheme(state, isDark = false) {
    const root = document.documentElement;
    const colors = this.themeColors[state];
    
    if (isDark) {
      // Dark mode adjustments
      root.style.setProperty('--primary', this.adjustColor(colors.primary, -20));
      root.style.setProperty('--accent', this.adjustColor(colors.accent, -20));
      root.style.setProperty('--bg', this.adjustColor(colors.bg, -80));
      root.style.setProperty('--text', this.adjustColor(colors.text, 80));
    } else {
      root.style.setProperty('--primary', colors.primary);
      root.style.setProperty('--accent', colors.accent);
      root.style.setProperty('--bg', colors.bg);
      root.style.setProperty('--text', colors.text);
    }

    // Add state-specific classes
    root.classList.remove('theme-idle', 'theme-loading', 'theme-error', 'theme-success');
    root.classList.add(`theme-${state}`);
  }

  adjustColor(hex, amount) {
    const clamp = (val) => Math.min(Math.max(val, 0), 255);
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    const rgbToHex = (r, g, b) => `#${  [r, g, b].map(x => {
      const hex = clamp(x).toString(16);
      return hex.length === 1 ? `0${  hex}` : hex;
    }).join('')}`;

    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    return rgbToHex(
      clamp(rgb.r + amount),
      clamp(rgb.g + amount),
      clamp(rgb.b + amount)
    );
  }

  setupFluidTypography() {
    const root = document.documentElement;
    const minWidth = 320;
    const maxWidth = 1920;
    const minScale = 0.875;
    const maxScale = 1;

    const clamp = (min, max) => {
      return `clamp(${min}rem, ${minScale}rem + ${maxScale - minScale} * ((100vw - ${minWidth}px) / ${maxWidth - minWidth}), ${max}rem)`;
    };

    root.style.setProperty('--text-base', clamp(1, 1.125));
    root.style.setProperty('--text-lg', clamp(1.125, 1.25));
    root.style.setProperty('--text-xl', clamp(1.25, 1.5));
    root.style.setProperty('--text-2xl', clamp(1.5, 2));
  }

  setupAnimations() {
    const style = document.createElement('style');
    style.textContent = `
      .animate-smooth {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .animate-float {
        animation: float 6s ease-in-out infinite;
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      /* Heartbeat animation */
      .heartbeat {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 0;
        background: radial-gradient(circle at center, var(--primary) 0%, transparent 70%);
        opacity: 0;
      }
      .heartbeat.active {
        animation: heartbeat 5s ease-in-out infinite;
      }
      @keyframes heartbeat {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
      }
      /* State-based transitions */
      .transition-idle {
        transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .transition-loading {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .transition-error {
        transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .transition-success {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      /* State-specific animations */
      .animate-idle {
        animation: idle 3s ease-in-out infinite;
      }
      .animate-loading {
        animation: loading 1s linear infinite;
      }
      .animate-error {
        animation: error 0.5s ease-in-out;
      }
      .animate-success {
        animation: success 0.6s ease-out;
      }
      @keyframes idle {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }
      @keyframes loading {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes error {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
      @keyframes success {
        0% { transform: scale(0.8); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Create heartbeat element
    const heartbeat = document.createElement('div');
    heartbeat.className = 'heartbeat';
    document.body.appendChild(heartbeat);
    this.heartbeatElement = heartbeat;
  }

  setupResponsiveLayout() {
    const container = document.querySelector('main');
    if (container) {
      container.classList.add(
        'px-4',
        'sm:px-6',
        'md:px-8',
        'lg:px-12',
        'max-w-7xl',
        'mx-auto',
        'w-full'
      );
    }
  }

  setupAccessibility() {
    // Focus management
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });

    // Add focus styles
    const style = document.createElement('style');
    style.textContent = `
      .keyboard-navigation :focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  setupAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  playSoundForState(state) {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    switch (state) {
      case 'success':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.3);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case 'error':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(220, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;

      case 'loading':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;
    }
  }

  setUIState(newState) {
    this.uiState.previous = this.uiState.current;
    this.uiState.current = newState;
    this.uiState.timestamp = Date.now();
    
    // Update heartbeat state
    if (this.heartbeatElement) {
      if (newState === 'idle') {
        this.heartbeatElement.classList.add('active');
      } else {
        this.heartbeatElement.classList.remove('active');
      }
    }
    
    if (newState === 'loading') {
      this.startLoadingTimer();
    } else {
      this.clearLoadingTimer();
    }
    
    this.applyStateTheme(newState, document.documentElement.classList.contains('dark'));
    this.applyStateTransitions();
    this.playSoundForState(newState);
  }

  applyStateTransitions() {
    const elements = {
      status: document.getElementById('status-message'),
      transcript: document.getElementById('transcript'),
      button: document.getElementById('btn-prism'),
      error: document.getElementById('error-message')
    };

    const stateClasses = {
      idle: 'transition-idle animate-idle',
      loading: 'transition-loading animate-loading',
      error: 'transition-error animate-error',
      success: 'transition-success animate-success'
    };

    Object.entries(elements).forEach(([_key, element]) => {
      if (element) {
        // Remove all state classes
        Object.values(stateClasses).forEach(classes => {
          classes.split(' ').forEach(cls => element.classList.remove(cls));
        });
        // Add current state classes
        stateClasses[this.uiState.current].split(' ').forEach(cls => {
          element.classList.add(cls);
        });
      }
    });
  }

  startLoadingTimer() {
    this.clearLoadingTimer();
    this.loadingTimer = setTimeout(() => {
      this.showLoadingNotification();
    }, 5000);
  }

  clearLoadingTimer() {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
  }

  showLoadingNotification() {
    if (this.uiState.current === 'loading') {
      this.updateStatusMessage("Nous préparons quelque chose de spécial pour vous...", 'info');
    }
  }

  trackError(error) {
    const now = Date.now();
    this.errorTracker.errors.push({ timestamp: now, error });
    
    // Keep only errors from last 10 seconds
    this.errorTracker.errors = this.errorTracker.errors.filter(
      e => now - e.timestamp < 10000
    );
    
    if (this.errorTracker.errors.length >= 3) {
      this.suggestRefresh();
      this.errorTracker.errors = []; // Reset after suggesting refresh
    }
  }

  suggestRefresh() {
    const refreshMessage = "Plusieurs erreurs sont survenues. Voulez-vous rafraîchir l'application ?";
    this.updateStatusMessage(refreshMessage, 'warning');
    
    // Add refresh button if not already present
    if (!document.getElementById('refresh-btn')) {
      const refreshBtn = document.createElement('button');
      refreshBtn.id = 'refresh-btn';
      refreshBtn.className = 'mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent transition-colors';
      refreshBtn.textContent = 'Rafraîchir';
      refreshBtn.onclick = () => window.location.reload();
      
      const statusContainer = document.getElementById('status-message');
      if (statusContainer) {
        statusContainer.appendChild(refreshBtn);
      }
    }
  }

  updateStatusMessage(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-message ${
        type === 'error' ? 'text-red-500' : 'text-primary'
      }`;
      this.setUIState(type === 'error' ? 'error' : 'success');
    }
  }

  updateTranscript(text) {
    const transcriptEl = document.getElementById('transcript');
    if (transcriptEl) {
      transcriptEl.textContent = text;
      this.setUIState('success');
    }
  }

  updateButtonState(isActive) {
    const button = document.getElementById('btn-prism');
    if (button) {
      button.classList.toggle('opacity-50', !isActive);
      button.classList.toggle('cursor-not-allowed', !isActive);
      button.setAttribute('aria-disabled', !isActive);
      this.setUIState(isActive ? 'idle' : 'loading');
    }
  }

  showError(message) {
    this.trackError(message);
    this.setUIState('error');
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
    }
  }

  hideError() {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
      errorEl.classList.add('hidden');
      this.setUIState('idle');
    }
  }

  setupDiagnosticConsole() {
    // Create console element
    this.diagnosticConsole.element = document.createElement('div');
    this.diagnosticConsole.element.className = 'fixed bottom-0 left-0 right-0 bg-black/90 text-white p-4 font-mono text-sm transform translate-y-full transition-transform duration-300 ease-in-out z-50';
    this.diagnosticConsole.element.style.maxHeight = '40vh';
    this.diagnosticConsole.element.style.overflowY = 'auto';
    document.body.appendChild(this.diagnosticConsole.element);

    // Setup keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.toggleDiagnosticConsole();
      }
    });

    // Setup retry metrics update
    setInterval(() => {
      if (this.diagnosticConsole.isVisible) {
        this.updateDiagnosticConsole();
      }
    }, 1000);
  }

  toggleDiagnosticConsole() {
    this.diagnosticConsole.isVisible = !this.diagnosticConsole.isVisible;
    this.diagnosticConsole.element.style.transform = this.diagnosticConsole.isVisible 
      ? 'translateY(0)' 
      : 'translateY(100%)';
    
    if (this.diagnosticConsole.isVisible) {
      this.updateDiagnosticConsole();
    }
  }

  updateDiagnosticConsole() {
    const { current, previous, timestamp } = this.uiState;
    const retryMetrics = window.prismCore?.modules?.retry?.getRetryMetrics() || {
      totalAttempts: 0,
      totalRetries: 0,
      totalSuccesses: 0,
      totalFailures: 0
    };

    const recentErrors = this.errorTracker.errors
      .map(({ timestamp, error }) => ({
        time: new Date(timestamp).toLocaleTimeString(),
        message: error.message || error
      }))
      .slice(-5);

    this.diagnosticConsole.element.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <h3 class="text-accent font-bold">UI State</h3>
          <p>Current: <span class="text-${current}">${current}</span></p>
          <p>Previous: ${previous || 'none'}</p>
          <p>Last Update: ${new Date(timestamp).toLocaleTimeString()}</p>
        </div>
        
        <div class="space-y-2">
          <h3 class="text-accent font-bold">Retry Metrics</h3>
          <p>Total Attempts: ${retryMetrics.totalAttempts}</p>
          <p>Total Retries: ${retryMetrics.totalRetries}</p>
          <p>Successes: ${retryMetrics.totalSuccesses}</p>
          <p>Failures: ${retryMetrics.totalFailures}</p>
        </div>
        
        <div class="space-y-2">
          <h3 class="text-accent font-bold">Recent Errors</h3>
          ${recentErrors.length ? recentErrors.map(err => 
            `<p class="text-red-400">[${err.time}] ${err.message}</p>`
          ).join('') : '<p class="text-green-400">No recent errors</p>'}
        </div>
      </div>
    `;
  }

  setupAuroraVisualization() {
    // Créer le conteneur
    this.auroraContainer = document.createElement('div');
    this.auroraContainer.className = 'aurora-container fixed bottom-4 right-4 w-64 h-64 rounded-lg overflow-hidden shadow-lg';
    this.auroraContainer.style.background = 'rgba(0, 0, 0, 0.8)';
    this.auroraContainer.style.backdropFilter = 'blur(10px)';
    
    // Créer le canvas
    this.auroraCanvas = document.createElement('canvas');
    this.auroraCanvas.width = 256;
    this.auroraCanvas.height = 256;
    this.auroraContainer.appendChild(this.auroraCanvas);
    
    // Obtenir le contexte
    this.auroraContext = this.auroraCanvas.getContext('2d');
    
    // Ajouter au DOM
    document.body.appendChild(this.auroraContainer);
    
    // S'abonner aux mises à jour d'état
    prismBus.subscribe('prism:aurora:stateUpdate', this.updateAuroraVisualization.bind(this));
  }

  updateAuroraVisualization(event) {
    const { score, state, historicalData } = event;
    
    // Mettre à jour le titre
    const title = document.createElement('div');
    title.className = 'aurora-title absolute top-2 left-2 text-white text-sm font-orbitron';
    title.textContent = `État d'éveil: ${state} (${Math.round(score)}%)`;
    
    // Nettoyer le canvas
    this.auroraContext.clearRect(0, 0, this.auroraCanvas.width, this.auroraCanvas.height);
    
    // Dessiner l'historique
    this.drawHistoricalData(historicalData);
    
    // Dessiner l'aurora
    this.drawAurora(score);
    
    // Mettre à jour le titre
    const existingTitle = this.auroraContainer.querySelector('.aurora-title');
    if (existingTitle) {
      existingTitle.remove();
    }
    this.auroraContainer.appendChild(title);
  }

  drawHistoricalData(historicalData) {
    const ctx = this.auroraContext;
    const width = this.auroraCanvas.width;
    const height = this.auroraCanvas.height;
    
    // Dessiner la grille
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Lignes horizontales
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Dessiner les données
    if (historicalData.length > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      historicalData.forEach((point, index) => {
        const x = (width / historicalData.length) * index;
        const y = height - (point.score / 100) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }
  }

  drawAurora(score) {
    const ctx = this.auroraContext;
    const width = this.auroraCanvas.width;
    const height = this.auroraCanvas.height;
    
    // Couleurs de l'aurora
    const colors = {
      'Éteint': ['#1a1a1a', '#2a2a2a'],
      'Dormant': ['#2c3e50', '#34495e'],
      'Émergent': ['#2980b9', '#3498db'],
      'Actif': ['#27ae60', '#2ecc71'],
      'Rayonnant': ['#f1c40f', '#f39c12']
    };
    
    // Déterminer la couleur en fonction du score
    let colorPair;
    if (score < 20) colorPair = colors['Éteint'];
    else if (score < 40) colorPair = colors['Dormant'];
    else if (score < 60) colorPair = colors['Émergent'];
    else if (score < 80) colorPair = colors['Actif'];
    else colorPair = colors['Rayonnant'];
    
    // Créer le gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, colorPair[0]);
    gradient.addColorStop(1, colorPair[1]);
    
    // Dessiner l'aurora
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    // Créer une forme ondulée
    for (let x = 0; x <= width; x += 10) {
      const y = height - (score / 100) * height + Math.sin(x * 0.1) * 20;
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    
    // Ajouter un effet de lueur
    ctx.shadowColor = colorPair[1];
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// Initialize UI system
export const initializeUI = () => {
  return new PrismUI();
}; 