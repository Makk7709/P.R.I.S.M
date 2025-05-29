// Loading state manager for PRISM
const createLoadingElement = () => {
  const loadingEl = document.createElement('div');
  loadingEl.className = 'fixed inset-0 flex items-center justify-center bg-bg/80 backdrop-blur-sm transition-opacity duration-500 z-50';
  loadingEl.setAttribute('role', 'status');
  loadingEl.setAttribute('aria-live', 'polite');
  
  const content = document.createElement('div');
  content.className = 'text-center';
  
  const text = document.createElement('p');
  text.className = 'text-primary font-orbitron text-2xl animate-pulse';
  text.textContent = 'PRISM is waking up...';
  
  content.appendChild(text);
  loadingEl.appendChild(content);
  
  return loadingEl;
};

class PRISMLoadingManager {
  constructor() {
    this.loadingElement = null;
    this.isVisible = false;
  }

  show() {
    if (this.isVisible) return;
    
    this.loadingElement = createLoadingElement();
    document.body.appendChild(this.loadingElement);
    this.isVisible = true;
    
    // Force reflow to ensure transition works
    this.loadingElement.offsetHeight;
    this.loadingElement.style.opacity = '1';
  }

  hide() {
    if (!this.isVisible || !this.loadingElement) return;
    
    return new Promise((resolve) => {
      this.loadingElement.style.opacity = '0';
      
      this.loadingElement.addEventListener('transitionend', () => {
        if (this.loadingElement && this.loadingElement.parentNode) {
          this.loadingElement.parentNode.removeChild(this.loadingElement);
        }
        this.loadingElement = null;
        this.isVisible = false;
        resolve();
      }, { once: true });
    });
  }

  async withLoading(operation) {
    try {
      this.show();
      await operation();
    } catch (error) {
      console.error('Operation failed:', error);
      throw error;
    } finally {
      await this.hide();
    }
  }
}

export const loadingManager = new PRISMLoadingManager();

export function initializeLoading() {
  return loadingManager;
} 