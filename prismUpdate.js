// Version checking and update management for PRISM
const VERSION = '1.0.0';
const VERSION_CHECK_INTERVAL = 1000 * 60 * 30; // 30 minutes
const VERSION_URL = 'https://api.korev.ai/prism/version.json';

class PrismUpdater {
  constructor() {
    this.isChecking = false;
    this.lastCheck = 0;
    this.updateAvailable = false;
  }

  async checkForUpdates() {
    if (this.isChecking || Date.now() - this.lastCheck < VERSION_CHECK_INTERVAL) {
      return;
    }

    this.isChecking = true;
    this.lastCheck = Date.now();

    try {
      const response = await fetch(VERSION_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache'
      });

      if (!response.ok) throw new Error('Version check failed');

      const { version, changelog } = await response.json();
      
      if (this.compareVersions(version, VERSION) > 0) {
        this.updateAvailable = true;
        this.notifyUpdate(version, changelog);
      }
    } catch (error) {
      console.warn('Version check failed:', error);
    } finally {
      this.isChecking = false;
    }
  }

  compareVersions(version1, version2) {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (v1[i] > v2[i]) return 1;
      if (v1[i] < v2[i]) return -1;
    }
    return 0;
  }

  notifyUpdate(newVersion, changelog) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-primary text-white p-4 rounded-lg shadow-lg max-w-md z-50 animate-fade-in';
    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-1">
          <h3 class="font-orbitron font-bold mb-2">Mise à jour disponible (${newVersion})</h3>
          <p class="text-sm mb-3">${changelog || 'Nouvelle version disponible'}</p>
          <button class="bg-accent hover:bg-opacity-90 px-4 py-2 rounded text-sm font-medium transition-colors">
            Rafraîchir pour mettre à jour
          </button>
        </div>
        <button class="text-white/70 hover:text-white transition-colors" aria-label="Fermer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    const updateBtn = notification.querySelector('button:not([aria-label])');
    const closeBtn = notification.querySelector('[aria-label="Fermer"]');

    updateBtn.addEventListener('click', () => {
      this.performUpdate();
    });

    closeBtn.addEventListener('click', () => {
      notification.remove();
    });

    // Auto-remove after 1 minute
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove();
      }
    }, 60000);
  }

  performUpdate() {
    // Clear caches and reload
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }).then(() => {
        window.location.reload(true);
      });
    } else {
      window.location.reload(true);
    }
  }

  startPeriodicCheck() {
    this.checkForUpdates();
    setInterval(() => this.checkForUpdates(), VERSION_CHECK_INTERVAL);
  }
}

// Export singleton instance
export const prismUpdater = new PrismUpdater();

export function initializeUpdateCheck() {
  prismUpdater.startPeriodicCheck();
  return prismUpdater;
} 