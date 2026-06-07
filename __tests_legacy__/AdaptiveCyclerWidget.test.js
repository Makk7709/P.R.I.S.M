/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { AdaptiveCyclerWidget } from '../ui/AdaptiveCyclerWidget.js';
import { config } from '../config.js';
import 'jest-canvas-mock';

// Mock DOM elements
const mockElements = {
  '.interval-display': { textContent: '' },
  '.efficiency-bar-fill': { style: { width: '0%', background: '' } },
  '.directive-display': { textContent: '' }
};

// Mock document.querySelector
document.querySelector = jest.fn(selector => mockElements[selector]);

describe('AdaptiveCyclerWidget', () => {
  let widget;
  let mockPrismBus;
  let subscriber;
  let parentElement;

  beforeEach(() => {
    parentElement = document.createElement('div');
    document.body.appendChild(parentElement);
    // Mock du bus d'événements PRISM
    mockPrismBus = {
      subscribe: jest.fn()
    };
    window.prismBus = mockPrismBus;

    // Création d'une instance du widget
    widget = new AdaptiveCyclerWidget(parentElement, config.CONFIG.UI);

    // Reset mock elements
    mockElements['.interval-display'].textContent = '';
    mockElements['.efficiency-bar-fill'].style = { width: '0%', background: '' };
    mockElements['.directive-display'].textContent = '';
  });

  afterEach(() => {
    widget.destroy();
    delete window.prismBus;
  });

  test('should initialize with correct structure', () => {
    const container = document.querySelector('.adaptive-cycler-widget');
    expect(container).toBeTruthy();
    expect(container.style.width).toBe('220px');
    expect(container.style.position).toBe('fixed');
    expect(container.style.bottom).toBe('20px');
    expect(container.style.right).toBe('20px');
  });

  test('should subscribe to PRISM events', () => {
    expect(mockPrismBus.subscribe).toHaveBeenCalledWith(
      'prism:adaptiveCycler:cycleTuned',
      expect.any(Function)
    );
    expect(mockPrismBus.subscribe).toHaveBeenCalledWith(
      'prism:strategy:directiveOutcome',
      expect.any(Function)
    );
  });

  test('should update interval display', () => {
    subscriber({ interval: 2500 });
    expect(mockElements['.interval-display'].textContent).toContain('2.5s');
  });

  test('should update efficiency display with correct color', () => {
    subscriber({ efficiency: 85 });
    expect(mockElements['.efficiency-bar-fill'].style.width).toBe('85%');
    expect(mockElements['.efficiency-bar-fill'].style.background).toBe('#4CAF50');
  });

  test('should update directive display', () => {
    subscriber({ directive: 'Test Directive' });
    expect(mockElements['.directive-display'].textContent).toContain('Test Directive');
  });

  test('should handle efficiency color thresholds correctly', () => {
    // Test high efficiency (green)
    subscriber({ efficiency: 90, directive: 'test' });
    expect(mockElements['.efficiency-bar-fill'].style.background).toBe('#4CAF50');
    
    // Test medium efficiency (orange)
    subscriber({ efficiency: 65, directive: 'test' });
    expect(mockElements['.efficiency-bar-fill'].style.background).toBe('#FFA500');
    
    // Test low efficiency (red)
    subscriber({ efficiency: 40, directive: 'test' });
    expect(mockElements['.efficiency-bar-fill'].style.background).toBe('#FF0000');
  });

  test('should clean up on destroy', () => {
    const container = document.querySelector('.adaptive-cycler-widget');
    expect(container).toBeTruthy();
    
    widget.destroy();
    
    expect(document.querySelector('.adaptive-cycler-widget')).toBeNull();
  });
}); 