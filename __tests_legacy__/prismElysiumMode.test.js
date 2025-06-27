import { PrismElysiumMode } from '../modes/prismElysiumMode.js';
import { jest } from '@jest/globals';
import kernelBus from '../core/KernelBus.js';

// Mock PrismBus
jest.mock('../prismBus.js', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn().mockImplementation(async () => Promise.resolve()),
    off: jest.fn(),
    clear: jest.fn()
  }));
});

describe('PrismElysiumMode', () => {
  let elysiumMode;
  let mockBus;

  beforeEach(() => {
    // Mock du DOM pour les tests
    document.body.innerHTML = `
      <div id="elysium-mode-container">
        <div class="elysium-mode-display">
          <span class="elysium-mode-icon"></span>
          <span class="elysium-mode-name"></span>
        </div>
      </div>
    `;

    // Réinitialiser les mocks
    jest.clearAllMocks();
    
    // Créer une nouvelle instance
    elysiumMode = new PrismElysiumMode();
    mockBus = elysiumMode.bus;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      expect(elysiumMode.currentMode).toBeNull();
      expect(elysiumMode.lastModeChange).toBe(0);
    });

    test('should create UI elements', () => {
      const container = document.getElementById('elysium-mode-container');
      expect(container).not.toBeNull();
      expect(container.querySelector('.elysium-mode-icon')).not.toBeNull();
      expect(container.querySelector('.elysium-mode-name')).not.toBeNull();
    });
  });

  describe('Mode Changes', () => {
    test('should change to Calm mode when awakening level is low', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.2 });
      expect(elysiumMode.currentMode.name).toBe('Elysium Calm');
    });

    test('should change to Flux mode when awakening level is medium', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.5 });
      expect(elysiumMode.currentMode.name).toBe('Elysium Flux');
    });

    test('should change to Surge mode when awakening level is high', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.7 });
      expect(elysiumMode.currentMode.name).toBe('Elysium Surge');
    });

    test('should change to Nova mode when awakening level is very high', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.9 });
      expect(elysiumMode.currentMode.name).toBe('Elysium Nova');
    });
  });

  describe('Mode Change Cooldown', () => {
    test('should not change mode during cooldown period', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.5 });
      const initialMode = elysiumMode.currentMode;
      
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.9 });
      expect(elysiumMode.currentMode).toBe(initialMode);
    });

    test('should allow mode change after cooldown period', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.5 });
      elysiumMode.lastModeChange = Date.now() - (elysiumMode.MODE_CHANGE_COOLDOWN + 1000);
      
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.9 });
      expect(elysiumMode.currentMode.name).toBe('Elysium Nova');
    });
  });

  describe('Critical Alerts', () => {
    test('should force Calm mode on critical alert', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.9 });
      await elysiumMode.handleSentientPulseAlert({ severity: 'critical' });
      expect(elysiumMode.currentMode.name).toBe('Elysium Calm');
    });
  });

  describe('UI Updates', () => {
    test('should update UI elements when mode changes', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.5 });
      
      const iconElement = document.querySelector('.elysium-mode-icon');
      const nameElement = document.querySelector('.elysium-mode-name');
      
      expect(iconElement.textContent).toBe('🌊');
      expect(nameElement.textContent).toBe('Elysium Flux');
    });

    test('should apply transition animation on mode change', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.5 });
      
      const container = document.getElementById('elysium-mode-container');
      expect(container.classList.contains('mode-transition')).toBe(true);
      
      // Attendre la fin de l'animation
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(container.classList.contains('mode-transition')).toBe(false);
    });
  });

  describe('Event Emission', () => {
    test('should emit mode change event', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.5 });
      
      expect(mockBus.emit).toHaveBeenCalledWith(
        'prism:elysium:modeChanged',
        expect.objectContaining({
          mode: expect.objectContaining({
            name: 'Elysium Flux'
          }),
          awakeningLevel: 0.5
        })
      );
    });

    test('should emit cycle adjustment event', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.5 });
      
      expect(mockBus.emit).toHaveBeenCalledWith(
        'prism:sovereignCycle:adjust',
        expect.objectContaining({
          multiplier: 1.0
        })
      );
    });

    test('should emit reflection adjustment event', async () => {
      await elysiumMode.handleAuroraStateUpdate({ awakeningLevel: 0.5 });
      
      expect(mockBus.emit).toHaveBeenCalledWith(
        'prism:reflection:adjust',
        expect.objectContaining({
          enabled: true
        })
      );
    });
  });
}); 