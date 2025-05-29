import kernelBus from './core/KernelBus.js';

class PrismStorage {
  constructor() {
    this.fallbackStorage = new Map();
  }

  readSafe(key) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return this.fallbackStorage.get(key) || null;
      }
      return JSON.parse(value);
    } catch (error) {
      kernelBus.emit('prism:storage:read_error', {
        timestamp: Date.now(),
        key,
        error: error.message
      });
      return this.fallbackStorage.get(key) || null;
    }
  }

  writeSafe(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      this.fallbackStorage.set(key, value);
      kernelBus.emit('prism:storage:write_success', {
        timestamp: Date.now(),
        key
      });
      return true;
    } catch (error) {
      kernelBus.emit('prism:storage:write_error', {
        timestamp: Date.now(),
        key,
        error: error.message
      });
      this.fallbackStorage.set(key, value);
      return false;
    }
  }

  removeSafe(key) {
    try {
      localStorage.removeItem(key);
      this.fallbackStorage.delete(key);
      kernelBus.emit('prism:storage:remove_success', {
        timestamp: Date.now(),
        key
      });
      return true;
    } catch (error) {
      kernelBus.emit('prism:storage:remove_error', {
        timestamp: Date.now(),
        key,
        error: error.message
      });
      return false;
    }
  }

  clearSafe() {
    try {
      localStorage.clear();
      this.fallbackStorage.clear();
      kernelBus.emit('prism:storage:clear_success', {
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      kernelBus.emit('prism:storage:clear_error', {
        timestamp: Date.now(),
        error: error.message
      });
      return false;
    }
  }

  getAllKeys() {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      kernelBus.emit('prism:storage:get_keys_error', {
        timestamp: Date.now(),
        error: error.message
      });
      return Array.from(this.fallbackStorage.keys());
    }
  }
}

export default PrismStorage; 