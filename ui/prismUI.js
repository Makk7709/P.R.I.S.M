import { AdaptiveCyclerWidget } from './AdaptiveCyclerWidget';
import { InsightCenter } from './InsightCenter';

/**
 * Initialise l'interface utilisateur PRISM
 */
export function initializePRISMUI() {
  // Initialisation des widgets
  const adaptiveCyclerWidget = new AdaptiveCyclerWidget();
  const insightCenter = new InsightCenter();

  // Raccourcis clavier
  document.addEventListener('keydown', (e) => {
    // Alt + I pour InsightCenter
    if (e.altKey && e.key.toLowerCase() === 'i') {
      insightCenter.toggleVisibility();
    }
    // Alt + A pour AdaptiveCyclerWidget
    if (e.altKey && e.key.toLowerCase() === 'a') {
      adaptiveCyclerWidget.toggleVisibility();
    }
    // Alt + C pour mode compact
    if (e.altKey && e.key.toLowerCase() === 'c') {
      adaptiveCyclerWidget.toggleCompactMode();
    }
  });

  // Nettoyage lors de la fermeture
  window.addEventListener('beforeunload', () => {
    adaptiveCyclerWidget.destroy();
    insightCenter.destroy();
  });

  // Initialisation des animations et de l'accessibilité
  setupAnimations();
  setupAccessibility();
  setupResponsiveLayout();

  const ui = {
    adaptiveCyclerWidget,
    insightCenter
  };
  
  return ui;
}

/**
 * Configure les animations de l'interface
 */
function setupAnimations() {
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
    /* Performance optimizations */
    .will-change-transform {
      will-change: transform;
    }
    .will-change-opacity {
      will-change: opacity;
    }
    .hardware-accelerated {
      transform: translateZ(0);
      backface-visibility: hidden;
      perspective: 1000px;
    }
  `;
  document.head.appendChild(style);

  // Create heartbeat element
  const heartbeat = document.createElement('div');
  heartbeat.className = 'heartbeat';
  document.body.appendChild(heartbeat);
}

/**
 * Configure l'accessibilité de l'interface
 */
function setupAccessibility() {
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
    /* Accessibility improvements */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .focus-ring {
      position: relative;
    }
    .focus-ring:focus-visible::after {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border: 2px solid var(--primary);
      border-radius: inherit;
      pointer-events: none;
    }
    /* Navigation improvements */
    .nav-item {
      position: relative;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      transition: all 0.2s ease-in-out;
    }
    .nav-item:hover {
      background-color: var(--accent);
      color: var(--text);
    }
    .nav-item.active {
      background-color: var(--primary);
      color: var(--text);
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 70%;
      background-color: var(--accent);
      border-radius: 0 2px 2px 0;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Configure la mise en page responsive
 */
function setupResponsiveLayout() {
  const container = document.querySelector('main');
  if (container) {
    container.classList.add(
      'px-4',
      'sm:px-6',
      'md:px-8',
      'lg:px-12',
      'max-w-7xl',
      'mx-auto',
      'w-full',
      'hardware-accelerated',
      'focus-ring'
    );
  }
}

this.alertThresholds = {
  cpu: 80,
  memory: 85,
  fps: 30,
  efficiency: 50
}; 