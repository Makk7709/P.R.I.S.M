/**
 * @fileoverview Implémentation d'une deque circulaire optimisée pour PrismAdaptiveCycler
 * @module regulation/CircularDeque
 */

export class CircularDeque {
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.front = 0;
    this.size = 0;
    this.successCount = 0;
    this._efficiencyCache = null;
  }

  /**
   * Ajoute un élément à la fin de la deque
   * @param {boolean} value - Valeur à ajouter
   */
  pushBack(value) {
    if (this.size === this.capacity) {
      const oldValue = this.buffer[this.front];
      if (oldValue) this.successCount--;
      this.front = (this.front + 1) % this.capacity;
    } else {
      this.size++;
    }

    const back = (this.front + this.size - 1) % this.capacity;
    this.buffer[back] = value;
    if (value) this.successCount++;
    this._efficiencyCache = null;
  }

  /**
   * Retire un élément du début de la deque
   * @returns {boolean|undefined} Élément retiré ou undefined si vide
   */
  popFront() {
    if (this.size === 0) return undefined;

    const value = this.buffer[this.front];
    if (value) this.successCount--;
    this.front = (this.front + 1) % this.capacity;
    this.size--;
    this._efficiencyCache = null;
    return value;
  }

  /**
   * Calcule l'efficacité (ratio de succès)
   * @returns {number} Score d'efficacité entre 0 et 1
   */
  getEfficiency() {
    if (this._efficiencyCache !== null) return this._efficiencyCache;
    if (this.size === 0) return 0;
    
    this._efficiencyCache = this.successCount / this.size;
    return this._efficiencyCache;
  }

  /**
   * Récupère la taille actuelle
   * @returns {number} Nombre d'éléments
   */
  getSize() {
    return this.size;
  }

  /**
   * Récupère le nombre de succès
   * @returns {number} Nombre de succès
   */
  getSuccessCount() {
    return this.successCount;
  }
} 