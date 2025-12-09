/**
 * ServerMemoryStore - Mémoire persistante côté serveur (SQLite)
 * @module src/core/ServerMemoryStore
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_FILE = path.join(__dirname, '../../data/server-memory.json');
const MEMORY_DIR = path.dirname(MEMORY_FILE);

export class ServerMemoryStore {
  constructor() {
    this.memory = {
      conversations: [],
      userInfo: {},
      interactions: [],
      lastUpdated: null
    };
    this._ensureDirectory();
    this._loadMemory();
  }

  /**
   * S'assure que le répertoire data existe
   */
  _ensureDirectory() {
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
  }

  /**
   * Charge la mémoire depuis le fichier
   */
  _loadMemory() {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const data = fs.readFileSync(MEMORY_FILE, 'utf8');
        this.memory = JSON.parse(data);
        console.log(`[ServerMemoryStore] Mémoire chargée: ${this.memory.conversations.length} conversations`);
      }
    } catch (error) {
      console.warn('[ServerMemoryStore] Erreur chargement mémoire:', error.message);
      this.memory = {
        conversations: [],
        userInfo: {},
        interactions: [],
        lastUpdated: null
      };
    }
  }

  /**
   * Sauvegarde la mémoire dans le fichier
   */
  _saveMemory() {
    try {
      this.memory.lastUpdated = new Date().toISOString();
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.memory, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('[ServerMemoryStore] Erreur sauvegarde mémoire:', error.message);
      return false;
    }
  }

  /**
   * Stocke une interaction
   */
  storeInteraction(input, response, metadata = {}) {
    const interaction = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input,
      response,
      metadata,
      timestamp: new Date().toISOString()
    };

    this.memory.interactions.unshift(interaction);
    
    // Limiter à 1000 interactions
    if (this.memory.interactions.length > 1000) {
      this.memory.interactions = this.memory.interactions.slice(0, 1000);
    }

    // Extraire informations personnelles
    this._extractPersonalInfo(input, response);

    return this._saveMemory();
  }

  /**
   * Extrait les informations personnelles (prénom, etc.)
   */
  _extractPersonalInfo(input, response) {
    const inputLower = input.toLowerCase();
    const responseLower = response.toLowerCase();

    // Détecter prénom
    const prenomPatterns = [
      /mon prénom est ([A-Za-zÀ-ÿ]+)/i,
      /je m'appelle ([A-Za-zÀ-ÿ]+)/i,
      /appelle-moi ([A-Za-zÀ-ÿ]+)/i,
      /mon nom est ([A-Za-zÀ-ÿ]+)/i,
      /je suis ([A-Za-zÀ-ÿ]+)/i
    ];

    for (const pattern of prenomPatterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        const prenom = match[1].trim();
        if (prenom.length > 1 && prenom.length < 30) {
          this.memory.userInfo.prenom = prenom;
          console.log(`[ServerMemoryStore] Prénom détecté: ${prenom}`);
          break;
        }
      }
    }

    // Détecter si l'utilisateur mentionne son prénom dans la réponse
    if (responseLower.includes('prénom') || responseLower.includes('appelle')) {
      const prenomMatch = response.match(/(?:prénom|appelle)[\s:]+([A-Za-zÀ-ÿ]+)/i);
      if (prenomMatch && prenomMatch[1]) {
        const prenom = prenomMatch[1].trim();
        if (prenom.length > 1 && prenom.length < 30) {
          this.memory.userInfo.prenom = prenom;
          console.log(`[ServerMemoryStore] Prénom extrait de réponse: ${prenom}`);
        }
      }
    }
  }

  /**
   * Récupère les informations utilisateur
   */
  getUserInfo() {
    return { ...this.memory.userInfo };
  }

  /**
   * Récupère les conversations récentes
   */
  getRecentConversations(limit = 10) {
    return this.memory.interactions.slice(0, limit);
  }

  /**
   * Recherche dans les conversations précédentes
   */
  searchConversations(query, limit = 5) {
    const queryLower = query.toLowerCase();
    const results = [];

    for (const interaction of this.memory.interactions) {
      const inputLower = (interaction.input || '').toLowerCase();
      const responseLower = (interaction.response || '').toLowerCase();
      
      // Calculer similarité basique
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
      const inputWords = inputLower.split(/\s+/).filter(w => w.length > 2);
      const commonWords = queryWords.filter(w => inputWords.includes(w));
      
      if (commonWords.length > 0 || inputLower.includes(queryLower) || responseLower.includes(queryLower)) {
        results.push({
          ...interaction,
          relevance: commonWords.length / Math.max(queryWords.length, 1)
        });
      }
    }

    // Trier par pertinence
    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }

  /**
   * Construit le contexte mémoire pour une requête
   */
  buildMemoryContext(query) {
    let context = '';

    // Informations utilisateur
    if (this.memory.userInfo.prenom) {
      context += `## 👤 INFORMATIONS UTILISATEUR\n\n`;
      context += `L'utilisateur s'appelle ${this.memory.userInfo.prenom}.\n\n`;
    }

    // Conversations précédentes pertinentes
    const relatedConversations = this.searchConversations(query, 3);
    if (relatedConversations.length > 0) {
      context += `## 💬 CONVERSATIONS PRÉCÉDENTES\n\n`;
      context += `Dans nos conversations précédentes, nous avons discuté de :\n\n`;
      
      relatedConversations.forEach((conv, idx) => {
        context += `${idx + 1}. **Question**: ${conv.input.substring(0, 100)}...\n`;
        context += `   **Réponse**: ${conv.response.substring(0, 150)}...\n\n`;
      });
    }

    return context;
  }
}

// Singleton
export const serverMemoryStore = new ServerMemoryStore();

