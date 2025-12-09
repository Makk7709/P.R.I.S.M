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
   * Extrait TOUTES les informations importantes (prénom, rôle, stratégie, etc.)
   */
  _extractPersonalInfo(input, response) {
    const inputLower = input.toLowerCase();
    const responseLower = response.toLowerCase();
    const fullText = (input + ' ' + response).toLowerCase();

    // ✨ 1. Détecter prénom
    const prenomPatterns = [
      /mon prénom est ([A-Za-zÀ-ÿ]+)/i,
      /je m'appelle ([A-Za-zÀ-ÿ]+)/i,
      /appelle-moi ([A-Za-zÀ-ÿ]+)/i,
      /mon nom est ([A-Za-zÀ-ÿ]+)/i,
      /je suis ([A-Za-zÀ-ÿ]+)/i,
      /prénom[:\s]+([A-Za-zÀ-ÿ]+)/i
    ];

    for (const pattern of prenomPatterns) {
      const match = input.match(pattern) || response.match(pattern);
      if (match && match[1]) {
        const prenom = match[1].trim();
        if (prenom.length > 1 && prenom.length < 30 && !this._isCommonWord(prenom)) {
          this.memory.userInfo.prenom = prenom;
          console.log(`[ServerMemoryStore] Prénom détecté: ${prenom}`);
          break;
        }
      }
    }

    // ✨ 2. Détecter rôle/mission de PRISM
    const rolePatterns = [
      /(?:ton|votre) rôle est (?:de |d'|de )?([^.!?]+)/i,
      /(?:tu es|vous êtes) (?:un|une|mon|ma) ([^.!?]+)/i,
      /(?:mission|objectif|stratégie)[:\s]+([^.!?]+)/i,
      /(?:explique|définis|définir) (?:ton|votre) (?:rôle|mission|stratégie)[:\s]+([^.!?]+)/i
    ];

    for (const pattern of rolePatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        const role = match[1].trim();
        if (role.length > 10 && role.length < 500) {
          if (!this.memory.userInfo.role) {
            this.memory.userInfo.role = [];
          }
          if (!this.memory.userInfo.role.includes(role)) {
            this.memory.userInfo.role.push(role);
            console.log(`[ServerMemoryStore] Rôle détecté: ${role.substring(0, 50)}...`);
          }
        }
      }
    }

    // ✨ 3. Détecter stratégie/projet
    const strategyPatterns = [
      /(?:notre|ma|mon) (?:stratégie|projet|vision|objectif|plan)[:\s]+([^.!?]+)/i,
      /(?:stratégie|projet|vision)[:\s]+([^.!?]+)/i,
      /(?:on|nous) (?:veut|souhaite|cherche|développe|crée) (?:de |d'|un|une) ([^.!?]+)/i
    ];

    for (const pattern of strategyPatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        const strategy = match[1].trim();
        if (strategy.length > 10 && strategy.length < 500) {
          if (!this.memory.userInfo.strategie) {
            this.memory.userInfo.strategie = [];
          }
          if (!this.memory.userInfo.strategie.includes(strategy)) {
            this.memory.userInfo.strategie.push(strategy);
            console.log(`[ServerMemoryStore] Stratégie détectée: ${strategy.substring(0, 50)}...`);
          }
        }
      }
    }

    // ✨ 4. Détecter informations contextuelles importantes
    const contextPatterns = [
      /(?:important|essentiel|crucial|clé)[:\s]+([^.!?]+)/i,
      /(?:souviens-toi|retiens|note|mémorise)[:\s]+([^.!?]+)/i,
      /(?:contexte|situation|projet)[:\s]+([^.!?]{20,200})/i
    ];

    for (const pattern of contextPatterns) {
      const matches = fullText.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        if (match && match[1]) {
          const context = match[1].trim();
          if (context.length > 20 && context.length < 500) {
            if (!this.memory.userInfo.context) {
              this.memory.userInfo.context = [];
            }
            if (!this.memory.userInfo.context.includes(context)) {
              this.memory.userInfo.context.push(context);
              console.log(`[ServerMemoryStore] Contexte important détecté: ${context.substring(0, 50)}...`);
            }
          }
        }
      }
    }
  }

  /**
   * Vérifie si un mot est un mot commun (à ignorer)
   */
  _isCommonWord(word) {
    const commonWords = ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'notre', 'votre', 'leur', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'est', 'sont', 'être', 'avoir', 'faire', 'dire', 'aller', 'voir', 'savoir', 'pouvoir', 'vouloir', 'devoir', 'falloir'];
    return commonWords.includes(word.toLowerCase());
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
   * Construit le contexte mémoire pour une requête (TOUTES les données importantes)
   */
  buildMemoryContext(query) {
    let context = '';

    // ✨ Informations utilisateur complètes
    if (Object.keys(this.memory.userInfo).length > 0) {
      context += `## 👤 INFORMATIONS UTILISATEUR & CONTEXTE\n\n`;
      
      if (this.memory.userInfo.prenom) {
        context += `**Prénom**: ${this.memory.userInfo.prenom}\n\n`;
      }
      
      if (this.memory.userInfo.role && this.memory.userInfo.role.length > 0) {
        context += `**Rôle/Mission de PRISM**:\n`;
        this.memory.userInfo.role.forEach((role, idx) => {
          context += `${idx + 1}. ${role}\n`;
        });
        context += `\n`;
      }
      
      if (this.memory.userInfo.strategie && this.memory.userInfo.strategie.length > 0) {
        context += `**Stratégie/Projet**:\n`;
        this.memory.userInfo.strategie.forEach((strat, idx) => {
          context += `${idx + 1}. ${strat}\n`;
        });
        context += `\n`;
      }
      
      if (this.memory.userInfo.context && this.memory.userInfo.context.length > 0) {
        context += `**Contexte Important**:\n`;
        this.memory.userInfo.context.forEach((ctx, idx) => {
          context += `${idx + 1}. ${ctx}\n`;
        });
        context += `\n`;
      }
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

