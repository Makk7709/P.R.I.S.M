import { AdaptiveCyclerWidget } from '../ui/AdaptiveCyclerWidget';

describe('AdaptiveCyclerWidget', () => {
  let widget;
  let mockPurgeScheduler;
  let mockCompression;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create fresh instances
    mockPurgeScheduler = new PrismPurgeScheduler();
    mockCompression = new PrismCompression();
    widget = new AdaptiveCyclerWidget();
  });

  describe('initialization', () => {
    it('should create container and setup event listeners', () => {
      widget.initialize();
      expect(document.createElement).toHaveBeenCalled();
      expect(window.addEventListener).toHaveBeenCalled();
    });

    it('should setup performance monitoring', () => {
      jest.useFakeTimers();
      widget.initialize();
      expect(setInterval).toHaveBeenCalled();
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should setup purge strategies', () => {
      widget.initialize();
      const strategy = mockPurgeScheduler.getStrategy('timeBased');
      expect(strategy).toBeDefined();
      expect(strategy.maxAge).toBe(24 * 60 * 60 * 1000); // 24 hours
    });
  });

  describe('alert handling', () => {
    beforeEach(() => {
      widget.initialize();
    });

    it('should handle CPU alerts', () => {
      const alert = widget.checkAlertThresholds();
      expect(alert).toBeDefined();
      expect(alert.type).toBe('cpu');
    });

    it('should handle memory alerts', () => {
      window.performance.memory.usedJSHeapSize = 180000000; // 90% usage
      const alert = widget.checkAlertThresholds();
      expect(alert).toBeDefined();
      expect(alert.type).toBe('memory');
    });

    it('should compress alert history when needed', () => {
      // Fill alert history
      for (let i = 0; i < 1100; i++) {
        widget.handleAlert({ type: 'test', message: `Alert ${i}` });
      }
      expect(widget.alertHistory.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('visibility and mode toggles', () => {
    beforeEach(() => {
      widget.initialize();
    });

    it('should toggle visibility', () => {
      const initialVisibility = widget.container.style.display;
      widget.toggleVisibility();
      expect(widget.container.style.display).not.toBe(initialVisibility);
    });

    it('should toggle compact mode', () => {
      const initialMode = widget.compactMode;
      widget.toggleCompactMode();
      expect(widget.compactMode).toBe(!initialMode);
    });
  });

  describe('performance monitoring', () => {
    beforeEach(() => {
      widget.initialize();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should update metrics periodically', () => {
      const spy = jest.spyOn(widget, 'checkAlertThresholds');
      jest.advanceTimersByTime(1000);
      expect(spy).toHaveBeenCalled();
    });

    it('should calculate FPS correctly', () => {
      // Simulate multiple animation frames
      for (let i = 0; i < 10; i++) {
        window.requestAnimationFrame(widget.updateFPS.bind(widget));
      }
      jest.runAllTimers();
      expect(widget.currentFPS).toBeGreaterThan(0);
    });
  });
}); 