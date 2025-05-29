const LogSummary = require('./logSummary');

class ProfileManager {
  constructor() {
    this.profiles = new Map();
    this.activeProfile = null;
    this.logger = new LogSummary();
  }

  // Définition des profils prédéfinis
  static getDefaultProfiles() {
    return {
      standard: {
        name: 'Standard',
        keywords: ['clear', 'concise', 'accurate'],
        forbiddenWords: ['error', 'undefined', 'null'],
        minLength: 50,
        maxLength: 1000
      },
      technical: {
        name: 'Technical',
        keywords: ['implementation', 'architecture', 'optimization'],
        forbiddenWords: ['bug', 'crash', 'failure'],
        minLength: 100,
        maxLength: 2000
      },
      creative: {
        name: 'Creative',
        keywords: ['innovative', 'unique', 'original'],
        forbiddenWords: ['plagiarism', 'copy', 'duplicate'],
        minLength: 200,
        maxLength: 3000
      }
    };
  }

  initialize() {
    // Charger les profils par défaut
    const defaultProfiles = ProfileManager.getDefaultProfiles();
    Object.entries(defaultProfiles).forEach(([key, profile]) => {
      this.addProfile(key, profile);
    });

    // Définir le profil standard comme actif par défaut
    this.setActiveProfile('standard');
  }

  addProfile(key, profile) {
    if (this.profiles.has(key)) {
      throw new Error(`Profile ${key} already exists`);
    }
    this.profiles.set(key, {
      ...profile,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    this.logger.addLogEntry({
      type: 'PROFILE_ADDED',
      message: `Added new profile: ${profile.name}`,
      data: { key, profile }
    });
  }

  updateProfile(key, updates) {
    if (!this.profiles.has(key)) {
      throw new Error(`Profile ${key} does not exist`);
    }
    const profile = this.profiles.get(key);
    this.profiles.set(key, {
      ...profile,
      ...updates,
      updatedAt: new Date()
    });
    this.logger.addLogEntry({
      type: 'PROFILE_UPDATED',
      message: `Updated profile: ${profile.name}`,
      data: { key, updates }
    });
  }

  setActiveProfile(key) {
    if (!this.profiles.has(key)) {
      throw new Error(`Profile ${key} does not exist`);
    }
    this.activeProfile = key;
    this.logger.addLogEntry({
      type: 'PROFILE_ACTIVATED',
      message: `Activated profile: ${this.profiles.get(key).name}`,
      data: { key }
    });
  }

  getActiveProfile() {
    if (!this.activeProfile) {
      throw new Error('No active profile set');
    }
    return this.profiles.get(this.activeProfile);
  }

  getProfile(key) {
    if (!this.profiles.has(key)) {
      throw new Error(`Profile ${key} does not exist`);
    }
    return this.profiles.get(key);
  }

  listProfiles() {
    return Array.from(this.profiles.entries()).map(([key, profile]) => ({
      key,
      name: profile.name,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    }));
  }

  // Méthode pour injecter les mots-clés dans qualityCheckPerplexityResponse
  injectKeywordsIntoQualityCheck(qualityCheckFunction) {
    return (response) => {
      const profile = this.getActiveProfile();
      return qualityCheckFunction({
        ...response,
        keywords: profile.keywords,
        forbiddenWords: profile.forbiddenWords,
        minLength: profile.minLength,
        maxLength: profile.maxLength
      });
    };
  }
}

module.exports = ProfileManager; 