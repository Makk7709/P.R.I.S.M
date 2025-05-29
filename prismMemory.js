const PRISM_MEMORY_KEY = 'prism_memory';
const MAX_ENTRIES = 100;

class PrismMemory {
  constructor() {
    this.memory = this.loadMemory();
  }

  encode(data) {
    return btoa(JSON.stringify(data));
  }

  decode(encoded) {
    try {
      return JSON.parse(atob(encoded));
    } catch (error) {
      console.error('Memory decode error:', error);
      return [];
    }
  }

  saveMemory() {
    try {
      localStorage.setItem(PRISM_MEMORY_KEY, this.encode(this.memory));
      return true;
    } catch (error) {
      console.error('Memory save error:', error);
      return false;
    }
  }

  loadMemory() {
    try {
      const stored = localStorage.getItem(PRISM_MEMORY_KEY);
      return stored ? this.decode(stored) : [];
    } catch (error) {
      console.error('Memory load error:', error);
      return [];
    }
  }

  clearMemory() {
    this.memory = [];
    localStorage.removeItem(PRISM_MEMORY_KEY);
  }

  appendMemoryEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;

    const timestamp = new Date().toISOString();
    const memoryEntry = {
      ...entry,
      timestamp,
      id: crypto.randomUUID()
    };

    this.memory.unshift(memoryEntry);

    if (this.memory.length > MAX_ENTRIES) {
      this.memory = this.memory.slice(0, MAX_ENTRIES);
    }

    return this.saveMemory();
  }

  getMemoryStats() {
    return {
      totalEntries: this.memory.length,
      oldestEntry: this.memory[this.memory.length - 1]?.timestamp,
      newestEntry: this.memory[0]?.timestamp
    };
  }
}

export const prismMemory = new PrismMemory(); 