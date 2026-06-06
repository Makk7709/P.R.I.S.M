/**
 * PRISM AudioQueue - File d'Attente Audio
 * 
 * Gère une queue FIFO/priorité pour les messages audio.
 * Supporte les priorités et différentes politiques d'éviction.
 * 
 * @author PRISM Team
 * @version 1.0.0
 */

/**
 * @typedef {Object} QueueItem
 * @property {string} messageId - ID unique du message
 * @property {string} audioUrl - URL du blob audio
 * @property {number} priority - Priorité (plus élevé = plus prioritaire)
 * @property {number} [enqueuedAt] - Timestamp d'ajout
 * @property {Object} [metadata] - Métadonnées additionnelles
 */

/**
 * @typedef {Object} AudioQueueConfig
 * @property {number} [maxSize=20] - Taille maximale de la queue
 * @property {boolean} [enablePriority=false] - Activer tri par priorité
 * @property {'oldest'|'lowest-priority'} [evictionPolicy='oldest'] - Politique d'éviction
 */

export class AudioQueue {
  /**
   * @param {AudioQueueConfig} config
   */
  constructor(config = {}) {
    this.config = {
      maxSize: config.maxSize || 20,
      enablePriority: config.enablePriority || false,
      evictionPolicy: config.evictionPolicy || 'oldest'
    };
    
    /** @type {QueueItem[]} */
    this._items = [];
    
    /** @type {Map<string, Function[]>} */
    this._listeners = new Map();
  }

  /**
   * Ajoute un élément à la queue
   * @param {QueueItem} item - Élément à ajouter
   * @returns {boolean} true si ajouté avec succès
   */
  enqueue(item) {
    if (!item || !item.messageId || !item.audioUrl) {
      throw new Error('Invalid queue item: messageId and audioUrl are required');
    }
    
    // Compléter l'item
    const fullItem = {
      ...item,
      enqueuedAt: item.enqueuedAt || Date.now(),
      priority: item.priority ?? 0
    };
    
    // Vérifier et gérer la taille maximale
    if (this._items.length >= this.config.maxSize) {
      this._evict();
    }
    
    // Ajouter l'item
    this._items.push(fullItem);
    
    // Trier par priorité si activé
    if (this.config.enablePriority) {
      this._sortByPriority();
    }
    
    this._emit('enqueue', fullItem);
    
    return true;
  }

  /**
   * Retire et retourne le premier élément
   * @returns {QueueItem|null}
   */
  dequeue() {
    if (this._items.length === 0) {
      return null;
    }
    
    const item = this._items.shift();
    this._emit('dequeue', item);
    
    return item;
  }

  /**
   * Retourne le premier élément sans le retirer
   * @returns {QueueItem|null}
   */
  peek() {
    if (this._items.length === 0) {
      return null;
    }
    
    return this._items[0];
  }

  /**
   * Vérifie si la queue est vide
   * @returns {boolean}
   */
  isEmpty() {
    return this._items.length === 0;
  }

  /**
   * Retourne la taille de la queue
   * @returns {number}
   */
  size() {
    return this._items.length;
  }

  /**
   * Vide la queue
   */
  clear() {
    this._items = [];
    this._emit('clear');
  }

  /**
   * Trouve un élément par messageId
   * @param {string} messageId - ID à chercher
   * @returns {QueueItem|null}
   */
  find(messageId) {
    return this._items.find(item => item.messageId === messageId) || null;
  }

  /**
   * Vérifie si un élément existe
   * @param {string} messageId - ID à vérifier
   * @returns {boolean}
   */
  contains(messageId) {
    return this._items.some(item => item.messageId === messageId);
  }

  /**
   * Supprime un élément spécifique
   * @param {string} messageId - ID de l'élément à supprimer
   * @returns {boolean} true si supprimé
   */
  remove(messageId) {
    const index = this._items.findIndex(item => item.messageId === messageId);
    
    if (index === -1) {
      return false;
    }
    
    const removed = this._items.splice(index, 1)[0];
    this._emit('remove', removed);
    
    return true;
  }

  /**
   * Convertit la queue en tableau
   * @returns {QueueItem[]}
   */
  toArray() {
    return [...this._items];
  }

  /**
   * Itère sur chaque élément
   * @param {Function} callback - Fonction à appeler pour chaque élément
   */
  forEach(callback) {
    this._items.forEach(callback);
  }

  /**
   * Support de l'itération avec for...of
   * @returns {Iterator<QueueItem>}
   */
  [Symbol.iterator]() {
    return this._items[Symbol.iterator]();
  }

  /**
   * Enregistre un listener d'événement
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction à appeler
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  /**
   * Supprime un listener d'événement
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction à retirer
   */
  off(event, callback) {
    if (!this._listeners.has(event)) return;
    
    const listeners = this._listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // ============ MÉTHODES PRIVÉES ============

  /**
   * Émet un événement
   * @private
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[AudioQueue] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Évince un élément selon la politique configurée
   * @private
   */
  _evict() {
    if (this._items.length === 0) return;
    
    let indexToRemove = 0;
    
    switch (this.config.evictionPolicy) {
      case 'lowest-priority': {
        // Trouver l'élément avec la plus basse priorité
        let lowestPriority = this._items[0].priority;
        indexToRemove = 0;
        
        for (let i = 1; i < this._items.length; i++) {
          if (this._items[i].priority < lowestPriority) {
            lowestPriority = this._items[i].priority;
            indexToRemove = i;
          }
        }
        break;
      }
        
      case 'oldest':
      default:
        // Supprimer le plus ancien (premier)
        indexToRemove = 0;
        break;
    }
    
    const evicted = this._items.splice(indexToRemove, 1)[0];
    this._emit('evict', evicted);
  }

  /**
   * Trie la queue par priorité décroissante
   * @private
   */
  _sortByPriority() {
    this._items.sort((a, b) => {
      // Tri par priorité décroissante
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // À priorité égale, FIFO (par timestamp)
      return a.enqueuedAt - b.enqueuedAt;
    });
  }
}

export default AudioQueue;

