import { PrismUI } from '../../ui/prismUI.js';
import { PrismLogger } from '../../monitoring/prismLogger.js';

describe('PrismUI', () => {
  let prismUI;
  let logger;

  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
      <main>
        <button id="btn-prism">P.R.I.S.M</button>
        <div id="status-message"></div>
        <div id="transcript"></div>
        <div id="particle-container"></div>
      </main>
    `;
    
    // Initialize components
    prismUI = new PrismUI();
    logger = new PrismLogger();
  });

  afterEach(() => {
    // Cleanup
    document.body.innerHTML = '';
  });

  test('should initialize with correct theme', () => {
    const root = document.documentElement;
    expect(root.classList.contains('theme-idle')).toBe(true);
  });

  test('should update UI state correctly', () => {
    prismUI.setUIState('loading');
    expect(document.documentElement.classList.contains('theme-loading')).toBe(true);
    
    prismUI.setUIState('error');
    expect(document.documentElement.classList.contains('theme-error')).toBe(true);
    
    prismUI.setUIState('success');
    expect(document.documentElement.classList.contains('theme-success')).toBe(true);
  });

  test('should handle button state changes', () => {
    const button = document.getElementById('btn-prism');
    
    prismUI.updateButtonState(false);
    expect(button.classList.contains('opacity-50')).toBe(true);
    expect(button.classList.contains('cursor-not-allowed')).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    
    prismUI.updateButtonState(true);
    expect(button.classList.contains('opacity-50')).toBe(false);
    expect(button.classList.contains('cursor-not-allowed')).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('false');
  });

  test('should update status message correctly', () => {
    const statusEl = document.getElementById('status-message');
    
    prismUI.updateStatusMessage('Test message', 'info');
    expect(statusEl.textContent).toBe('Test message');
    expect(statusEl.classList.contains('text-primary')).toBe(true);
    
    prismUI.updateStatusMessage('Error message', 'error');
    expect(statusEl.textContent).toBe('Error message');
    expect(statusEl.classList.contains('text-red-500')).toBe(true);
  });

  test('should handle theme changes', () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Simulate dark mode
    prefersDark.matches = true;
    prismUI.setupTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    // Simulate light mode
    prefersDark.matches = false;
    prismUI.setupTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('should handle accessibility features', () => {
    // Test keyboard navigation
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    document.dispatchEvent(event);
    expect(document.body.classList.contains('keyboard-navigation')).toBe(true);
    
    // Test mouse navigation
    const mouseEvent = new MouseEvent('mousedown');
    document.dispatchEvent(mouseEvent);
    expect(document.body.classList.contains('keyboard-navigation')).toBe(false);
  });

  test('should handle diagnostic console', () => {
    // Test console toggle
    prismUI.toggleDiagnosticConsole();
    expect(prismUI.diagnosticConsole.isVisible).toBe(true);
    expect(prismUI.diagnosticConsole.element.style.transform).toBe('translateY(0)');
    
    prismUI.toggleDiagnosticConsole();
    expect(prismUI.diagnosticConsole.isVisible).toBe(false);
    expect(prismUI.diagnosticConsole.element.style.transform).toBe('translateY(100%)');
  });

  test('should handle animations correctly', () => {
    const heartbeat = document.querySelector('.heartbeat');
    expect(heartbeat).not.toBeNull();
    
    // Test heartbeat animation
    heartbeat.classList.add('active');
    expect(heartbeat.classList.contains('active')).toBe(true);
    
    // Test state transitions
    const main = document.querySelector('main');
    main.classList.add('transition-idle');
    expect(main.classList.contains('transition-idle')).toBe(true);
  });

  test('should handle responsive layout', () => {
    const main = document.querySelector('main');
    expect(main.classList.contains('px-4')).toBe(true);
    expect(main.classList.contains('max-w-7xl')).toBe(true);
    expect(main.classList.contains('mx-auto')).toBe(true);
  });
}); 