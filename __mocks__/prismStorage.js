class PrismStorage {
  constructor() {
    this.storage = new Map();
    this.fallbackStorage = new Map();
  }

  async writeSafe(key, value) {
    try {
      this.storage.set(key, value);
      return true;
    } catch (error) {
      this.fallbackStorage.set(key, value);
      return true;
    }
  }

  async readSafe(key) {
    try {
      return this.storage.get(key) || this.fallbackStorage.get(key);
    } catch (error) {
      return this.fallbackStorage.get(key);
    }
  }

  async delete(key) {
    try {
      this.storage.delete(key);
      this.fallbackStorage.delete(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  async clear() {
    try {
      this.storage.clear();
      this.fallbackStorage.clear();
      return true;
    } catch (error) {
      return false;
    }
  }

  async exists(key) {
    return this.storage.has(key) || this.fallbackStorage.has(key);
  }

  async keys() {
    return [...new Set([...this.storage.keys(), ...this.fallbackStorage.keys()])];
  }

  async size() {
    return this.storage.size + this.fallbackStorage.size;
  }
}

module.exports = PrismStorage; 