// Notification types and their corresponding styles
const NOTIFICATION_TYPES = {
  success: {
    icon: '✓',
    bg: 'bg-green-500/90',
    border: 'border-green-600',
    text: 'text-white'
  },
  error: {
    icon: '✕',
    bg: 'bg-red-500/90',
    border: 'border-red-600',
    text: 'text-white'
  },
  warning: {
    icon: '⚠',
    bg: 'bg-yellow-500/90',
    border: 'border-yellow-600',
    text: 'text-white'
  },
  info: {
    icon: 'ℹ',
    bg: 'bg-blue-500/90',
    border: 'border-blue-600',
    text: 'text-white'
  }
};

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

class PrismNotifier {
  constructor() {
    this.container = null;
    this.notifications = new Set();
    this.maxVisible = 3;
    this.lastNotificationTime = 0;
    this.pendingNotifications = new Map();
    this.throttleDelay = 500;
    if (isBrowser) {
      this.initialize();
    }
  }

  initialize() {
    if (!isBrowser) return;
    
    // Create notification container if it doesn't exist
    if (!document.getElementById('prism-notifications')) {
      this.container = document.createElement('div');
      this.container.id = 'prism-notifications';
      this.container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('prism-notifications');
    }
  }

  createNotificationElement(type, message) {
    const styles = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
    const notification = document.createElement('div');
    
    notification.className = `
      ${styles.bg} ${styles.border} ${styles.text}
      rounded-lg shadow-lg p-4 border-l-4
      transform transition-all duration-300 ease-in-out
      opacity-0 translate-y-[-100%]
      pointer-events-auto
      flex items-start gap-3
    `;
    
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    
    const icon = document.createElement('span');
    icon.className = 'flex-shrink-0 text-lg';
    icon.textContent = styles.icon;
    
    const messageEl = document.createElement('p');
    messageEl.className = 'flex-grow text-sm font-medium';
    messageEl.textContent = message;
    
    notification.appendChild(icon);
    notification.appendChild(messageEl);
    
    return notification;
  }

  processPendingNotifications() {
    if (this.pendingNotifications.size === 0) return;

    const now = Date.now();
    if (now - this.lastNotificationTime < this.throttleDelay) {
      setTimeout(() => this.processPendingNotifications(), this.throttleDelay);
      return;
    }

    // Get the most recent notification
    const latestNotification = Array.from(this.pendingNotifications.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];

    if (latestNotification) {
      const [key, { type, message, duration }] = latestNotification;
      this.showNotification(type, message, duration);
      this.pendingNotifications.delete(key);
      this.lastNotificationTime = now;
    }
  }

  show(type, message, duration = 5000) {
    if (!this.container) this.initialize();

    const now = Date.now();
    const key = `${type}-${message}-${now}`;

    // Always show error notifications immediately
    if (type === 'error') {
      this.showNotification(type, message, duration);
      this.lastNotificationTime = now;
      return;
    }

    // For non-error notifications, apply throttling
    if (now - this.lastNotificationTime < this.throttleDelay) {
      this.pendingNotifications.set(key, { type, message, duration, timestamp: now });
      this.processPendingNotifications();
      return;
    }

    this.showNotification(type, message, duration);
    this.lastNotificationTime = now;
  }

  showNotification(type, message, duration) {
    const notification = this.createNotificationElement(type, message);
    this.notifications.add(notification);
    
    if (this.notifications.size > this.maxVisible) {
      const oldestNotification = Array.from(this.notifications)[0];
      this.removeNotification(oldestNotification);
    }
    
    this.container.appendChild(notification);
    notification.offsetHeight;
    notification.classList.remove('opacity-0', 'translate-y-[-100%]');
    notification.classList.add('opacity-100', 'translate-y-0');
    
    const timeout = setTimeout(() => {
      this.removeNotification(notification);
    }, duration);
    
    notification.dataset.timeout = timeout;
  }

  removeNotification(notification) {
    if (!notification) return;
    
    if (notification.dataset.timeout) {
      clearTimeout(Number.parseInt(notification.dataset.timeout));
    }
    
    notification.classList.remove('opacity-100', 'translate-y-0');
    notification.classList.add('opacity-0', 'translate-y-[-100%]');
    
    setTimeout(() => {
      if (notification.parentNode === this.container) {
        this.container.removeChild(notification);
      }
      this.notifications.delete(notification);
    }, 300);
  }

  // Convenience methods
  success(message, duration) {
    this.show('success', message, duration);
  }

  error(message, duration) {
    this.show('error', message, duration);
  }

  warning(message, duration) {
    this.show('warning', message, duration);
  }

  info(message, duration) {
    this.show('info', message, duration);
  }
}

// Create and export a singleton instance
const prismNotifier = new PrismNotifier();
export default prismNotifier;

export function initializeNotifications() {
  return prismNotifier;
} 