import { InsightCenter } from './InsightCenter';
import kernelBus from '../core/KernelBus.js';

// Mock prismBus
jest.mock('../prismBus.js', () => ({
  prismBus: {
    subscribe: jest.fn(),
    emit: jest.fn()
  }
}));

describe('InsightCenter', () => {
  let insightCenter;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    insightCenter = new InsightCenter();
    
    // Mock canvas context
    const mockContext = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: jest.fn(),
      getImageData: jest.fn().mockReturnValue({
        data: new Uint8ClampedArray(800 * 120 * 4).fill(0) // 200x120 canvas with RGBA
      })
    };
    
    // Mock getContext for both canvases
    const mockGetContext = jest.fn().mockReturnValue(mockContext);
    HTMLCanvasElement.prototype.getContext = mockGetContext;
    
    insightCenter.initialize();
  });

  afterEach(() => {
    insightCenter.destroy();
    container.remove();
  });

  test('should create and initialize the InsightCenter', () => {
    expect(insightCenter.container).toBeTruthy();
    expect(insightCenter.container.className).toContain('insight-center');
  });

  test('should toggle visibility with I key', () => {
    const event = new KeyboardEvent('keydown', { key: 'i' });
    document.dispatchEvent(event);
    expect(insightCenter.isVisible).toBe(true);
    expect(insightCenter.container.style.display).toBe('block');

    document.dispatchEvent(event);
    expect(insightCenter.isVisible).toBe(false);
    expect(insightCenter.container.style.display).toBe('none');
  });

  test('should handle directive events', () => {
    const directiveEvent = new CustomEvent('prism:strategy:directiveIssued', {
      detail: { id: 'test-directive' }
    });
    window.dispatchEvent(directiveEvent);
    expect(insightCenter.timelineData.length).toBeGreaterThan(0);
  });

  test('should handle module state events', () => {
    const silentEvent = new CustomEvent('prism:sentinel:moduleSilent', {
      detail: { module: 'test-module' }
    });
    window.dispatchEvent(silentEvent);
    expect(insightCenter.moduleStates.get('test-module')).toBe('silent');

    const criticalEvent = new CustomEvent('prism:sentinel:moduleCritical', {
      detail: { module: 'test-module' }
    });
    window.dispatchEvent(criticalEvent);
    expect(insightCenter.moduleStates.get('test-module')).toBe('critical');
  });

  test('should trim timeline data when exceeding limit', () => {
    for (let i = 0; i < 40; i++) {
      const event = new CustomEvent('prism:strategy:directiveIssued', {
        detail: { id: `directive-${i}` }
      });
      window.dispatchEvent(event);
    }
    expect(insightCenter.timelineData.length).toBe(30);
  });

  test('should trim efficiency data when exceeding limit', () => {
    for (let i = 0; i < 40; i++) {
      const event = new CustomEvent('prism:adaptiveCycler:cycleTuned', {
        detail: { efficiency: 0.8, interval: 300 }
      });
      window.dispatchEvent(event);
    }
    expect(insightCenter.efficiencyData.length).toBe(30);
  });

  test('should render timeline with correct number of bars', () => {
    // Clear existing data
    insightCenter.timelineData = [];
    
    // Add some timeline data
    for (let i = 0; i < 35; i++) {
      const event = new CustomEvent('prism:strategy:directiveIssued', {
        detail: { id: `directive-${i}`, success: i % 2 === 0 }
      });
      window.dispatchEvent(event);
    }
    
    // Get mock context
    const ctx = insightCenter.timelineCanvas.getContext('2d');
    
    // Force a render
    insightCenter.render();
    
    // Verify that fillRect was called 30 times (maxBars)
    expect(ctx.fillRect.mock.calls.length).toBe(30);
  });

  test('should render efficiency graph with correct scaling', () => {
    // Clear existing data
    insightCenter.efficiencyData = [];
    
    // Add efficiency data with varying values
    for (let i = 0; i < 10; i++) {
      const event = new CustomEvent('prism:adaptiveCycler:cycleTuned', {
        detail: { 
          efficiency: 0.5 + (i * 0.1),
          interval: 200 + (i * 50)
        }
      });
      window.dispatchEvent(event);
    }
    
    // Get mock context
    const ctx = insightCenter.efficiencyCanvas.getContext('2d');
    
    // Force a render
    insightCenter.render();
    
    // Verify that stroke was called twice (once for efficiency line, once for interval line)
    expect(ctx.stroke.mock.calls.length).toBe(2);
    
    // Verify that lineTo was called for each data point
    expect(ctx.lineTo.mock.calls.length).toBe(18); // 9 calls per line (10 points - 1)
  });

  test('should render heatmap with correct module states', () => {
    // Clear existing states
    insightCenter.moduleStates.clear();
    
    // Set some module states
    const silentEvent = new CustomEvent('prism:sentinel:moduleSilent', {
      detail: { module: 'module-5' }
    });
    const criticalEvent = new CustomEvent('prism:sentinel:moduleCritical', {
      detail: { module: 'module-10' }
    });
    
    window.dispatchEvent(silentEvent);
    window.dispatchEvent(criticalEvent);
    
    // Force a render
    insightCenter.render();
    
    // Check module states
    const grid = document.getElementById('module-heatmap');
    const cells = grid.querySelectorAll('.module-cell');
    
    // Verify grid structure
    expect(cells.length).toBe(25); // 5x5 grid
    
    // Verify specific module states
    expect(cells[5].classList.contains('silent')).toBe(true);
    expect(cells[10].classList.contains('critical')).toBe(true);
    
    // Verify default state for other cells
    for (let i = 0; i < cells.length; i++) {
      if (i !== 5 && i !== 10) {
        expect(cells[i].classList.contains('ok')).toBe(true);
      }
    }
  });

  test('should maintain performance with animation loop', async () => {
    // Clear any existing animation frame
    if (insightCenter.rafId) {
      cancelAnimationFrame(insightCenter.rafId);
    }
    
    const startTime = performance.now();
    let frameCount = 0;
    
    // Simulate frames with proper timing
    const simulateFrame = () => {
      if (frameCount < 60) {
        insightCenter.render();
        frameCount++;
        setTimeout(simulateFrame, 16); // Reduced from 33ms to 16ms (~60fps)
      }
    };
    
    simulateFrame();
    
    // Wait for all frames to complete
    await new Promise(resolve => {
      setTimeout(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const fps = frameCount / (duration / 1000);
        
        // Should maintain at least 15 FPS in test environment
        expect(fps).toBeGreaterThan(15);
        resolve();
      }, 2000); // Reduced from 3000ms to 2000ms
    });
  }, 15000); // Increased timeout to 15 seconds

  test('should handle null canvas context in renderTimeline', () => {
    // Clear existing data
    insightCenter.timelineData = [];
    insightCenter.timelineCanvas = null;
    
    // Should not throw
    expect(() => insightCenter.renderTimeline()).not.toThrow();
  });

  test('should handle empty timeline data in renderTimeline', () => {
    // Clear existing data
    insightCenter.timelineData = [];
    
    // Should not throw
    expect(() => insightCenter.renderTimeline()).not.toThrow();
  });

  test('should handle null canvas context in renderEfficiency', () => {
    // Clear existing data
    insightCenter.efficiencyData = [];
    insightCenter.efficiencyCanvas = null;
    
    // Should not throw
    expect(() => insightCenter.renderEfficiency()).not.toThrow();
  });

  test('should handle insufficient efficiency data in renderEfficiency', () => {
    // Clear existing data
    insightCenter.efficiencyData = [];
    
    // Should not throw
    expect(() => insightCenter.renderEfficiency()).not.toThrow();
  });

  test('should not attempt to draw if timelineData is empty', () => {
    // Clear existing data
    insightCenter.timelineData = [];
    
    // Mock the getContext method to track calls
    const mockContext = {
      clearRect: jest.fn(),
      fillStyle: '',
      fillRect: jest.fn()
    };
    const mockGetContext = jest.fn().mockReturnValue(mockContext);
    insightCenter.timelineCanvas.getContext = mockGetContext;
    
    // Call renderTimeline
    insightCenter.renderTimeline();
    
    // Verify that clearRect and fillRect were not called
    expect(mockContext.clearRect).not.toHaveBeenCalled();
    expect(mockContext.fillRect).not.toHaveBeenCalled();
  });

  test('should not attempt to draw if efficiencyData has less than 2 elements', () => {
    // Clear existing data
    insightCenter.efficiencyData = [];
    
    // Mock the getContext method to track calls
    const mockContext = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      strokeStyle: '',
      lineWidth: 0
    };
    const mockGetContext = jest.fn().mockReturnValue(mockContext);
    insightCenter.efficiencyCanvas.getContext = mockGetContext;
    
    // Call renderEfficiency
    insightCenter.renderEfficiency();
    
    // Verify that clearRect and other drawing methods were not called
    expect(mockContext.clearRect).not.toHaveBeenCalled();
    expect(mockContext.beginPath).not.toHaveBeenCalled();
    expect(mockContext.moveTo).not.toHaveBeenCalled();
    expect(mockContext.lineTo).not.toHaveBeenCalled();
    expect(mockContext.stroke).not.toHaveBeenCalled();
  });

  test('should not attempt to draw if timelineCanvas is null', () => {
    // Set timelineCanvas to null
    insightCenter.timelineCanvas = null;
    
    // Add some data
    insightCenter.timelineData = [
      { type: 'directive', timestamp: Date.now(), data: { success: true } }
    ];
    
    // Call renderTimeline
    insightCenter.renderTimeline();
    
    // No assertions needed as we're just checking it doesn't throw
  });

  test('should not attempt to draw if efficiencyCanvas is null', () => {
    // Set efficiencyCanvas to null
    insightCenter.efficiencyCanvas = null;
    
    // Add some data
    insightCenter.efficiencyData = [
      { timestamp: Date.now(), efficiency: 0.8, interval: 300 },
      { timestamp: Date.now(), efficiency: 0.9, interval: 250 }
    ];
    
    // Call renderEfficiency
    insightCenter.renderEfficiency();
    
    // No assertions needed as we're just checking it doesn't throw
  });

  test('should update build quality on preProdReport event', () => {
    const preProdEvent = {
      score: 0.95,
      tests: 100,
      perf: 'OK',
      mutantsKilled: 90,
      mutantsTotal: 100
    };

    prismBus.emit('prism:selfHeal:preProdReport', preProdEvent);
    
    const buildScore = insightCenter.buildQualityElement.querySelector('.build-score');
    expect(buildScore.textContent).toBe('(score: 0.95)');
    expect(buildScore.className).toContain('text-green-500');
  });

  test('should update build quality on mutation report event', () => {
    const mutationEvent = {
      moduleStats: [
        { module: 'test1', killRate: 0.8 },
        { module: 'test2', killRate: 0.9 }
      ]
    };

    prismBus.emit('prism:mutation:report', mutationEvent);
    
    const moduleStats = insightCenter.buildQualityElement.querySelector('.module-stats');
    expect(moduleStats.children.length).toBe(2);
    expect(moduleStats.children[0].textContent).toContain('test1');
    expect(moduleStats.children[0].textContent).toContain('80%');
  });

  test('should show correct color based on score', () => {
    const events = [
      { score: 0.95, expectedClass: 'text-green-500' },
      { score: 0.75, expectedClass: 'text-orange-500' },
      { score: 0.65, expectedClass: 'text-red-500' }
    ];

    events.forEach(({ score, expectedClass }) => {
      prismBus.emit('prism:selfHeal:preProdReport', { score });
      const buildScore = insightCenter.buildQualityElement.querySelector('.build-score');
      expect(buildScore.className).toContain(expectedClass);
    });
  });

  test('should log events correctly', () => {
    const event = {
      type: 'test',
      data: { value: 42 }
    };
    
    insightCenter.logEvent('testEvent', event);
    
    expect(insightCenter.eventLog.length).toBe(1);
    expect(insightCenter.eventLog[0].type).toBe('testEvent');
    expect(insightCenter.eventLog[0].data).toEqual(event);
  });

  test('should limit event log size', () => {
    // Remplir le log
    for (let i = 0; i < insightCenter.maxEventLogSize + 10; i++) {
      insightCenter.logEvent('test', { value: i });
    }
    
    expect(insightCenter.eventLog.length).toBe(insightCenter.maxEventLogSize);
    expect(insightCenter.eventLog[0].data.value).toBe(10); // Les 10 premiers événements sont supprimés
  });

  test('should use render cache', () => {
    // Simuler un premier rendu
    insightCenter.render();
    const firstDataHash = insightCenter.getDataHash();
    
    // Simuler un second rendu avec les mêmes données
    insightCenter.render();
    const secondDataHash = insightCenter.getDataHash();
    
    expect(firstDataHash).toBe(secondDataHash);
    expect(insightCenter.renderCache.has(firstDataHash)).toBe(true);
  });

  test('should clean up render cache', () => {
    // Remplir le cache
    for (let i = 0; i < 150; i++) {
      insightCenter.renderCache.set(`key${i}`, true);
    }
    
    // Forcer le nettoyage
    insightCenter.cleanupRenderCache();
    
    expect(insightCenter.renderCache.size).toBe(100);
  });
}); 