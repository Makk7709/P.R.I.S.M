/**
 * PRISM Session Management Module
 * Handles user session creation, storage and retrieval
 */

const SESSION_KEY = 'prism_session';
const _ENCRYPTION_KEY = 'prism_enc_key';
const SESSION_SECRET = 'PRISM_SECURE_SESSION_2024';
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const MAX_SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

class PrismSession {
  constructor() {
    this.sessionId = null;
    this.metadata = {};
    if (isBrowser) {
      this.initialize();
    }
  }

  async generateSessionSignature(sessionId) {
    const encoder = new TextEncoder();
    const data = encoder.encode(sessionId + SESSION_SECRET);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifySessionIntegrity(sessionId, signature) {
    const expectedSignature = await this.generateSessionSignature(sessionId);
    return signature === expectedSignature;
  }

  initialize() {
    if (!isBrowser) return;
    
    const storedSession = this.getStoredSession();
    if (storedSession) {
      this.verifyAndLoadSession(storedSession);
    } else {
      this.createNewSession();
    }
  }

  async verifyAndLoadSession(storedSession) {
    const isValid = await this.verifySessionIntegrity(storedSession.id, storedSession.signature);
    if (isValid) {
      const now = Date.now();
      const lastActivity = storedSession.metadata.lastActivity || storedSession.metadata.timestamp;
      const sessionAge = now - new Date(storedSession.metadata.timestamp).getTime();
      
      if (sessionAge > MAX_SESSION_DURATION || (now - new Date(lastActivity).getTime()) > INACTIVITY_TIMEOUT) {
        console.warn('Session expired, creating new session');
        await this.createNewSession();
        return;
      }
      
      this.sessionId = storedSession.id;
      this.metadata = storedSession.metadata;
      await this.updateLastActivity();
    } else {
      console.warn('Session integrity check failed, creating new session');
      this.createNewSession();
    }
  }

  async createNewSession() {
    this.sessionId = this.generateUUID();
    this.metadata = this.gatherMetadata();
    await this.storeSession();
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  gatherMetadata() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timestamp: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
  }

  encrypt(data) {
    const jsonStr = JSON.stringify(data);
    return btoa(jsonStr);
  }

  decrypt(encrypted) {
    try {
      const jsonStr = atob(encrypted);
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Session decryption failed:', e);
      return null;
    }
  }

  async storeSession() {
    const signature = await this.generateSessionSignature(this.sessionId);
    const sessionData = {
      id: this.sessionId,
      metadata: this.metadata,
      signature: signature
    };
    const encrypted = this.encrypt(sessionData);
    localStorage.setItem(SESSION_KEY, encrypted);
  }

  getStoredSession() {
    if (!isBrowser) return null;
    const encrypted = localStorage.getItem(SESSION_KEY);
    if (!encrypted) return null;
    return this.decrypt(encrypted);
  }

  getSessionId() {
    return this.sessionId;
  }

  getSessionInfo() {
    return {
      id: this.sessionId,
      metadata: this.metadata
    };
  }

  async resetSession() {
    localStorage.removeItem(SESSION_KEY);
    await this.createNewSession();
    return this.sessionId;
  }

  async updateMetadata(newMetadata) {
    this.metadata = { ...this.metadata, ...newMetadata };
    await this.storeSession();
  }

  async updateLastActivity() {
    this.metadata.lastActivity = new Date().toISOString();
    await this.storeSession();
  }

  async isSessionValid() {
    const storedSession = this.getStoredSession();
    if (!storedSession) return false;
    
    const isValid = await this.verifySessionIntegrity(storedSession.id, storedSession.signature);
    if (!isValid) return false;
    
    const now = Date.now();
    const lastActivity = storedSession.metadata.lastActivity || storedSession.metadata.timestamp;
    const sessionAge = now - new Date(storedSession.metadata.timestamp).getTime();
    
    return sessionAge <= MAX_SESSION_DURATION && (now - new Date(lastActivity).getTime()) <= INACTIVITY_TIMEOUT;
  }
}

// Export singleton instance
const prismSession = new PrismSession();
export default prismSession;

export function initializeSession() {
  return prismSession;
} 