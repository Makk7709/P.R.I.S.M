// PRISM Performance Optimizer
const PRISMPerf = {
  init() {
    this.setupIdleCallback();
    this.preloadCriticalAssets();
    this.setupAnimationOptimization();
    this.setupDOMOptimization();
  },

  setupIdleCallback() {
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    const tasks = [];

    this.scheduleIdleTask = (task, priority = 'low') => {
      tasks.push({ task, priority });
      this.processIdleTasks();
    };

    this.processIdleTasks = () => {
      if (tasks.length === 0) return;

      idleCallback(() => {
        const now = performance.now();
        const timeRemaining = 50; // 50ms time slice

        while (tasks.length > 0 && performance.now() - now < timeRemaining) {
          const { task, priority } = tasks.shift();
          if (priority === 'high' || document.readyState === 'complete') {
            task();
          } else {
            tasks.push({ task, priority });
            break;
          }
        }

        if (tasks.length > 0) {
          this.processIdleTasks();
        }
      });
    };
  },

  preloadCriticalAssets() {
    const criticalAssets = [
      { url: 'https://threejs.org/examples/textures/sprites/disc.png', type: 'image' },
      { url: './assets/audio/ambient.mp3', type: 'audio' },
      { url: './assets/models/particles.glb', type: 'model' }
    ];

    criticalAssets.forEach(asset => {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = asset.type;
      preloadLink.href = asset.url;
      document.head.appendChild(preloadLink);
    });
  },

  setupAnimationOptimization() {
    let lastFrameTime = 0;
    let frameCount = 0;
    let fps = 60;
    const targetFPS = 60;
    const fpsUpdateInterval = 1000; // Update FPS every second

    this.optimizeAnimation = (callback) => {
      const now = performance.now();
      const elapsed = now - lastFrameTime;

      if (elapsed > (1000 / targetFPS)) {
        frameCount++;
        
        if (now - lastFrameTime >= fpsUpdateInterval) {
          fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
          frameCount = 0;
          lastFrameTime = now;
        }

        // Adjust particle count based on FPS
        const particleCount = Math.max(100, Math.min(1000, Math.floor(1000 * (fps / targetFPS))));
        
        callback(particleCount);
      }

      requestAnimationFrame(() => this.optimizeAnimation(callback));
    };
  },

  setupDOMOptimization() {
    // Batch DOM updates
    const pendingUpdates = new Map();
    let updateTimeout = null;

    this.scheduleDOMUpdate = (element, updates) => {
      if (!pendingUpdates.has(element)) {
        pendingUpdates.set(element, {});
      }
      Object.assign(pendingUpdates.get(element), updates);

      if (!updateTimeout) {
        updateTimeout = requestAnimationFrame(() => {
          pendingUpdates.forEach((updates, element) => {
            const style = element.style;
            Object.entries(updates).forEach(([property, value]) => {
              style[property] = value;
            });
          });
          pendingUpdates.clear();
          updateTimeout = null;
        });
      }
    };

    // Optimize scroll performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) {
        cancelAnimationFrame(scrollTimeout);
      }
      scrollTimeout = requestAnimationFrame(() => {
        // Handle scroll updates
      });
    }, { passive: true });
  },

  // Utility methods
  getDeviceCapabilities() {
    return {
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      hasHighPerformance: navigator.hardwareConcurrency > 4,
      hasLowMemory: navigator.deviceMemory < 4,
      hasReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  },

  adjustForDeviceCapabilities() {
    const capabilities = this.getDeviceCapabilities();
    
    if (capabilities.isMobile || capabilities.hasLowMemory) {
      // Reduce particle count and quality
      this.scheduleIdleTask(() => {
        document.documentElement.classList.add('low-performance-mode');
      }, 'high');
    }

    if (capabilities.hasReducedMotion) {
      // Disable animations
      this.scheduleIdleTask(() => {
        document.documentElement.classList.add('reduced-motion');
      }, 'high');
    }
  }
};

export default PRISMPerf;

export function initializePerformance() {
  PRISMPerf.init();
  return PRISMPerf;
} 