/**
 * ServerMemoryStore - Mémoire persistante côté serveur (SQLite)
 * @module src/core/ServerMemoryStore
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_FILE = path.join(__dirname, '../../data/server-memory.json');
const MEMORY_SAMPLE = path.join(__dirname, '../../data/server-memory.sample.json');
const MEMORY_DIR = path.dirname(MEMORY_FILE);

// Patterns d'extraction d'informations personnelles (extraits de _extractPersonalInfo,
// iso-comportement : mêmes littéraux, même ordre).
const PRENOM_INPUT_PATTERNS = [
  /mon prénom est ([A-ZÀ-ÿ]+)/i,
  /je m'appelle ([A-ZÀ-ÿ]+)/i,
  /appelle-moi ([A-ZÀ-ÿ]+)/i,
  /mon nom est ([A-ZÀ-ÿ]+)/i,
  /je suis ([A-ZÀ-ÿ]+)/i,
  /prénom[:\s]+([A-ZÀ-ÿ]+)/i,
];

const PRENOM_RESPONSE_PATTERNS = [
  /(?:votre|ton) prénom est ([A-ZÀ-ÿ]+)/i,
  /(?:vous vous appelez|tu t'appelles) ([A-ZÀ-ÿ]+)/i,
  /(?:prénom|appelle)[\s:]+([A-ZÀ-ÿ]+)/i,
];

const ROLE_PATTERNS = [
  /(?:ton|votre) rôle est (?:de |d'|de )?([^.!?]+)/i,
  /(?:ton|votre) rôle est d'([^.!?]+)/i, // Cas spécifique "d'X"
  /(?:tu es|vous êtes) (?:un|une|mon|ma) ([^.!?]+)/i,
  /(?:mission|objectif|stratégie)[:\s]+([^.!?]+)/i, // "mission: X", "objectif: X", "stratégie: X" (peut être rôle OU stratégie)
  /(?:explique|définis|définir) (?:ton|votre) (?:rôle|mission|stratégie)[:\s]+([^.!?]+)/i,
];

const STRATEGY_PATTERNS = [
  /(?:notre|ma|mon) (?:stratégie|projet|vision|objectif|plan) (?:est (?:de |d'|))([^.!?]+)/i, // "notre stratégie est de X", "notre projet est d'X" (sans capturer "est")
  /(?:notre|ma|mon) (?:stratégie|projet|vision|objectif|plan):\s+([^.!?]+)/i, // "notre stratégie: X" (uniquement avec ":")
  /(?:stratégie|projet|vision|plan):\s+([^.!?]+)/i, // "stratégie: X", "projet: X" (uniquement avec ":")
  /(?:on|nous) (?:veut|veulent|souhaite|souhaitons|cherche|cherchons|développe|développons|crée|créons) (?:de |d'|un|une|le|la|les )([^.!?]+)/i, // "on veut de X", "nous souhaitons créer X" (avec article)
  /(?:on|nous) (?:veut|veulent|souhaite|souhaitons|cherche|cherchons|développe|développons|crée|créons) ([^.!?]+)/i, // "on veut X", "nous souhaitons X" (sans article, doit être en dernier)
];

const CONTEXT_PATTERNS = [
  /(?:important|essentiel|crucial|clé)[:\s]+([^.!?]+)/i, // "important: X", "essentiel: X"
  /(?:souviens-toi|retiens|note|mémorise)[:\s]+([^.!?]+)/i, // "souviens-toi: X", "retiens: X"
  /(?:contexte|situation|projet)[:\s]+([^.!?]{10,500})/i, // "contexte: X" (10-500 caractères, réduit de 20 à 10)
];

/**
 * Ajoute `value` à `list` sauf doublon exact OU relation de sous-chaîne (insensible
 * à la casse). Renvoie true si ajouté. Pur (mutation de `list` uniquement).
 * @param {string[]} list
 * @param {string} value
 * @returns {boolean}
 */
function pushIfNoSubstringDuplicate(list, value) {
  const valueLower = value.toLowerCase();
  const exists = list.some((item) => {
    const itemLower = item.toLowerCase();
    return (
      itemLower === valueLower || itemLower.includes(valueLower) || valueLower.includes(itemLower)
    );
  });
  if (!exists) {
    list.push(value);
    return true;
  }
  return false;
}

export class ServerMemoryStore {
  constructor() {
    this.memory = {
      conversations: [],
      userInfo: {},
      interactions: [],
      lastUpdated: null,
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
   * Crée automatiquement le fichier depuis le sample si absent
   */
  _loadMemory() {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const data = fs.readFileSync(MEMORY_FILE, 'utf8');
        this.memory = JSON.parse(data);
        console.log(
          `[ServerMemoryStore] Mémoire chargée: ${this.memory.conversations.length} conversations`
        );
      } else {
        // Fichier absent : initialiser depuis sample ou defaults
        if (fs.existsSync(MEMORY_SAMPLE)) {
          const sampleData = fs.readFileSync(MEMORY_SAMPLE, 'utf8');
          this.memory = JSON.parse(sampleData);
          fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.memory, null, 2), 'utf8');
          console.log('[ServerMemoryStore] Fichier mémoire initialisé depuis sample');
        } else {
          // Pas de sample : utiliser defaults
          this.memory = {
            conversations: [],
            userInfo: {},
            interactions: [],
            lastUpdated: null,
          };
          fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.memory, null, 2), 'utf8');
          console.log('[ServerMemoryStore] Fichier mémoire initialisé avec defaults');
        }
      }
    } catch (error) {
      console.warn('[ServerMemoryStore] Erreur chargement mémoire:', error.message);
      this.memory = {
        conversations: [],
        userInfo: {},
        interactions: [],
        lastUpdated: null,
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
      timestamp: new Date().toISOString(),
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
    // Utiliser input+response originaux (pas en minuscules) pour préserver la casse
    const originalText = `${input} ${response}`;
    this._extractPrenomFromInput(input, response);
    this._extractPrenomFromResponse(response);
    this._extractRole(originalText);
    this._extractStrategie(originalText);
    this._extractContext(originalText);
  }

  /** ✨ 1. Détecte le prénom dans l'input (fallback response). @private */
  _extractPrenomFromInput(input, response) {
    for (const pattern of PRENOM_INPUT_PATTERNS) {
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
  }

  /** ✨ 1.5. Détecte le prénom depuis la réponse si présente. @private */
  _extractPrenomFromResponse(response) {
    if (!(response && response.length > 0)) {
      return;
    }
    for (const pattern of PRENOM_RESPONSE_PATTERNS) {
      const match = response.match(pattern);
      if (match && match[1]) {
        const prenom = match[1].trim();
        if (prenom.length > 1 && prenom.length < 30 && !this._isCommonWord(prenom)) {
          this.memory.userInfo.prenom = prenom;
          console.log(`[ServerMemoryStore] Prénom extrait de réponse: ${prenom}`);
          break;
        }
      }
    }
  }

  /** ✨ 2. Détecte le(s) rôle(s)/mission(s) (sans break, dedup sous-chaîne). @private */
  _extractRole(originalText) {
    for (const pattern of ROLE_PATTERNS) {
      const match = originalText.match(pattern);
      if (!(match && match[1])) {
        continue;
      }
      const role = match[1].trim();
      // Minimum réduit à 7 pour capturer des rôles courts mais valides comme "m'aider"
      if (role.length >= 7 && role.length < 500) {
        if (!this.memory.userInfo.role) {
          this.memory.userInfo.role = [];
        }
        if (pushIfNoSubstringDuplicate(this.memory.userInfo.role, role)) {
          console.log(`[ServerMemoryStore] Rôle détecté: ${role.substring(0, 50)}...`);
        }
      }
    }
  }

  /** ✨ 3. Détecte la/les stratégie(s)/projet(s) (sans break, dedup sous-chaîne). @private */
  _extractStrategie(originalText) {
    for (const pattern of STRATEGY_PATTERNS) {
      const match = originalText.match(pattern);
      if (!(match && match[1])) {
        continue;
      }
      const strategy = match[1].trim();
      // Minimum réduit à 7 pour capturer des stratégies courtes mais valides
      if (strategy.length >= 7 && strategy.length < 500) {
        if (!this.memory.userInfo.strategie) {
          this.memory.userInfo.strategie = [];
        }
        if (pushIfNoSubstringDuplicate(this.memory.userInfo.strategie, strategy)) {
          console.log(`[ServerMemoryStore] Stratégie détectée: ${strategy.substring(0, 50)}...`);
        }
      }
    }
  }

  /** ✨ 4. Détecte les informations contextuelles importantes (dedup exact). @private */
  _extractContext(originalText) {
    for (const pattern of CONTEXT_PATTERNS) {
      const matches = originalText.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        const context = match && match[1] ? match[1].trim() : '';
        // Réduire le minimum de 20 à 10 caractères pour capturer plus de contextes
        if (context.length >= 10 && context.length < 500) {
          this._recordContext(context);
        }
      }
    }
  }

  /** Enregistre un contexte important s'il n'existe pas déjà (dedup insensible à
   * la casse). Iso-comportement : logique extraite de `_extractContext`. @private */
  _recordContext(context) {
    if (!this.memory.userInfo.context) {
      this.memory.userInfo.context = [];
    }
    const contextLower = context.toLowerCase();
    const exists = this.memory.userInfo.context.some((c) => c.toLowerCase() === contextLower);
    if (!exists) {
      this.memory.userInfo.context.push(context);
      console.log(
        `[ServerMemoryStore] Contexte important détecté: ${context.substring(0, 50)}...`
      );
    }
  }

  /**
   * Vérifie si un mot est un mot commun (à ignorer)
   */
  _isCommonWord(word) {
    const commonWords = [
      // Articles et déterminants
      'le',
      'la',
      'les',
      'un',
      'une',
      'des',
      'de',
      'du',
      'au',
      'aux',
      // Possessifs
      'mon',
      'ma',
      'mes',
      'ton',
      'ta',
      'tes',
      'son',
      'sa',
      'ses',
      'notre',
      'votre',
      'leur',
      // Pronoms
      'je',
      'tu',
      'il',
      'elle',
      'on',
      'nous',
      'vous',
      'ils',
      'elles',
      'ce',
      'cela',
      'ça',
      // Verbes courants
      'est',
      'sont',
      'être',
      'avoir',
      'faire',
      'dire',
      'aller',
      'voir',
      'savoir',
      'pouvoir',
      'vouloir',
      'devoir',
      'falloir',
      // Adjectifs/états courants qui peuvent suivre "je suis"
      'prêt',
      'prête',
      'content',
      'contente',
      'heureux',
      'heureuse',
      'désolé',
      'désolée',
      'fatigué',
      'fatiguée',
      'occupé',
      'occupée',
      'disponible',
      'libre',
      'bien',
      'mal',
      'là',
      'ici',
      'parti',
      'partie',
      'arrivé',
      'arrivée',
      'rentré',
      'rentrée',
      'certain',
      'certaine',
      'sûr',
      'sûre',
      'curieux',
      'curieuse',
      'intéressé',
      'intéressée',
      // Autres mots courants
      'oui',
      'non',
      'peut',
      'très',
      'aussi',
      'plus',
      'moins',
      'tout',
      'rien',
      'quelque',
    ];
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
      const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);
      const inputWords = inputLower.split(/\s+/).filter((w) => w.length > 2);
      const commonWords = queryWords.filter((w) => inputWords.includes(w));

      if (
        commonWords.length > 0 ||
        inputLower.includes(queryLower) ||
        responseLower.includes(queryLower)
      ) {
        results.push({
          ...interaction,
          relevance: commonWords.length / Math.max(queryWords.length, 1),
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
